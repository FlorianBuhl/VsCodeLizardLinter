// Imports
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

//---------------------------------------------------------------------------------------------------------------------

export type FunctionAnalysis = {
	name: string,
	cyclomaticComplexity: number,
	numOfParameters: number,
	tokenCount: number
	start: number,
	end: number,
	violatesCyclomaticComplexityThreshold?: boolean,
	violatesNumOfParameters?: boolean,
	violatesTokenCount?: boolean,
	path: vscode.Uri,
};

type FileAnalysis = {
	filePath: string,
	functionAnalysis: FunctionAnalysis[],
};

//---------------------------------------------------------------------------------------------------------------------

let diagnosticCollection: vscode.DiagnosticCollection;

const supportedExtensions: string[] = [".c", ".h", ".cpp", ".cs", ".gd", ".go", ".java", ".js", ".lua", ".m", ".php",
".py", ".rb", ".rs", ".scala", ".swift"];

let fileLogs: Map<string, FunctionAnalysis[]>;

//---------------------------------------------------------------------------------------------------------------------

export function createDiagnosticCollection(): vscode.DiagnosticCollection {
	diagnosticCollection = vscode.languages.createDiagnosticCollection();
	return diagnosticCollection;
}

//---------------------------------------------------------------------------------------------------------------------

export function activate() {
	fileLogs = new Map();
}

//---------------------------------------------------------------------------------------------------------------------

/**
 * Is called by vscode when a text document is saved.
 * It will execute a lizard lint on the document in case the settings allow that automatically
 * lizard lints are done when a file is saved.
 * @param textDocument text document which is stored
 */
export function onDidSaveTextDocument(textDocument: vscode.TextDocument){
	// Load setting.
	const lintOnFileSave = vscode.workspace.getConfiguration('execution').get('ExecuteLizardLintOnFileSave');
	if(true === lintOnFileSave){
		// Execute lint on text document.
		lintUri(textDocument.uri);
	}
}

//---------------------------------------------------------------------------------------------------------------------

/** onDidEndTask
 * Is called by vscode when a task execution is finished.
 * Analyzes lizard linter log files in case the tas which finished was executing a lizard lint.
 * @param event Task end event information.
 */
export function onDidEndTask(event: vscode.TaskEndEvent){
	if (event.execution.task.definition.type === "lizard-linter") {
		analyzeLizardLogFiles([vscode.Uri.file(event.execution.task.definition.logFilePath)]);
		event.execution.terminate();
	}
}

//---------------------------------------------------------------------------------------------------------------------

/**
 * Checks if a lizard lint can be executed on the given uri.
 * @param uri uri which is checked
 * @returns true if lizard lint can be done, false otherwise.
 */
export function isUriSupported(uri: vscode.Uri){
	if(fs.statSync(uri.fsPath).isDirectory()) {
		// in case uri is a directory then execute lizard lint.
		// todo: it can be improved by checking if in this directory are any files on which lizard lint can be done.
		return true;
	}
	else {
		// in case uri is a file then check if file extension is supported.
		return supportedExtensions.includes(path.extname(uri.fsPath));
	}
}

//---------------------------------------------------------------------------------------------------------------------

/**
 * Executes lizard lint on the given uri. A log file is generated which can be read by the user.
 * @param uri uri on which lizard is executed.
 */
export async function lintUri(uri: vscode.Uri): Promise<void>{
	const promise = new Promise<void>(async(resolve, reject) => {
		setTimeout(async() => {
		// get workspace folder belonging to given uri.
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
		if((undefined !== workspaceFolder) && (isUriSupported(uri))) {
			const logFilePath = getLogFilePath(uri);

			// create lizard log folder if it does not exist
			const logFolderPath = path.basename(logFilePath);
			if(!fs.existsSync(logFolderPath)) {
				fs.mkdirSync(logFolderPath);
			}

			// remove previously generated log file
			if(fs.existsSync(logFilePath)){
				fs.rmSync(logFilePath);
			}

			// create task
			let cmd = calculateLizardShellCmd(uri, logFilePath);
			let task = new vscode.Task({type: "lizard-linter", logFilePath: logFilePath},
																	workspaceFolder, "Execute lizard tool", "lizard-linter",
																	new vscode.ShellExecution(cmd));
			task.presentationOptions.focus = false;
			task.presentationOptions.reveal = vscode.TaskRevealKind.Never;
			console.log(cmd);

			// execute task
			await vscode.tasks.executeTask(task);
			let disposable = vscode.tasks.onDidEndTask(async(event) => {
				if (event.execution.task.definition.type === "lizard-linter") {
					disposable.dispose();
					await analyzeLizardLogFiles([vscode.Uri.file(event.execution.task.definition.logFilePath)]);
					event.execution.terminate();
					resolve();
				}
			});
		}
		else {
			if(false === isUriSupported(uri)) {
				reject( new Error("Requested Uri not supported"));
			} else {
				reject(new Error("No workspace"));
			}
		}
		}, 5000);
		});

	return promise;
}

//---------------------------------------------------------------------------------------------------------------------

/**
 * Reports the log file path uri based on the extension settings.
 * In case no valid path is configured then the log file is created next to the given uri parameter.
 * @param uri uri on which the lizard tool is executed.
 * @returns log file path.
 */
function getLogFilePath(uri: vscode.Uri): string {
	let logFilePath: string | undefined = vscode.workspace.getConfiguration("execution").get("logFilePath");
	if(logFilePath !== undefined) {
		let workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath;
		if(undefined === workspaceFolder) {
			logFilePath = undefined;
		}
		else {
			logFilePath = path.join(workspaceFolder, logFilePath);
		}
	}
	// generates log file in the uri of the linted file.
	if(logFilePath === undefined) {
		logFilePath = uri.fsPath;
	}

	let logFileNamePath =  path.parse(uri.fsPath);
	const logFileName = logFileNamePath.name + "_" + logFileNamePath.ext.substring(1) + ".log";
	logFilePath = path.join(logFilePath, logFileName);

	return logFilePath;
}

//---------------------------------------------------------------------------------------------------------------------

/**
 * calculates the shell command for the lizard tool based on the extension settings.
 * @param uri Uri on which lizard shall be executed
 * @param logFilePath Path to the log file
 * @returns shell command
 */
function calculateLizardShellCmd(uri: vscode.Uri, logFilePath: string): string {
	let lizardArgs = "";
	let threshold: number | undefined = undefined;

	// cyclomatic complexity
	threshold = vscode.workspace.getConfiguration("thresholds").get("cyclomaticComplexity");
	if((undefined !== threshold) && (threshold > 0)) {
		lizardArgs += `-T cyclomatic_complexity=${threshold} `;
	}

	// number of parameters
	threshold = vscode.workspace.getConfiguration("thresholds").get("numOfParameters");
	if((undefined !== threshold) && (threshold > 0)) {
		lizardArgs += `-T parameter_count=${threshold} `;
	}

	// number of tokenCount
	threshold = vscode.workspace.getConfiguration("thresholds").get("tokenCount");
	if((undefined !== threshold) && (threshold > 0)) {
		lizardArgs += `-T token_count=${threshold} `;
	}

	// modified cyclomatic complexity
	if(vscode.workspace.getConfiguration("execution").get("ModifiedCyclomaticComplexity")){
		lizardArgs += '-m ';
	}

	// shell cmd
	let cmd = `lizard ${uri.fsPath} ${lizardArgs} >> ${logFilePath}`;
	console.log(cmd);

	return cmd;
}

//---------------------------------------------------------------------------------------------------------------------

export function analyzeLizardLogFiles(lizardLogFilesUri: vscode.Uri[]){
	let lizardDiagCol: Map<vscode.Uri, vscode.Diagnostic[] | undefined>;

	// cycle through log files
	for (let lizardLogFileUri of lizardLogFilesUri) {
		if(fs.existsSync(lizardLogFileUri.fsPath)){
			vscode.workspace.openTextDocument(lizardLogFileUri).then((document) => {
			let text = document.getText(); // load text of document
			lizardDiagCol = analyzeLizardLogFile(text); // analyze file

			// set the new diagnosis entries
			for (let lintDiagColKey of lizardDiagCol.keys()) {
				diagnosticCollection.set(lintDiagColKey, lizardDiagCol.get(lintDiagColKey));
			}
		});
		}
	}
}

//---------------------------------------------------------------------------------------------------------------------

export function analyzeLizardLogFile(text: string): Map<vscode.Uri, vscode.Diagnostic[] | undefined>{
	let diagnosticCollection = new Map<vscode.Uri, vscode.Diagnostic[] | undefined>();
	let diagnostics: vscode.Diagnostic[] | undefined;
	let previousUri: vscode.Uri | undefined = undefined;

	// Get the relevant part of stdout containing the function analysis.
	let regex = /-+(.*)1 file analyzed/gms;
	let m = regex.exec(text);

	if(null !== m){
		let analyzedFunctionsText = m[1].trim().split('\n');

		for(let functionLine of analyzedFunctionsText){
			regex = /\s?(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+) (.*)@(\d+)-(\d+)@(\S+)/gm;
			m = regex.exec(functionLine);
			if(null !== m) {
				const linesOfCodeWithoutComments = parseInt(m[1], 10);
				let fileUri = vscode.Uri.file(m[9]);

				let functionAnalysis: FunctionAnalysis = {
					name: m[6],
					cyclomaticComplexity: parseInt(m[2], 10),
					tokenCount: parseInt(m[3], 10),
					numOfParameters: parseInt(m[4], 10),
					start: parseInt(m[7], 10) - 1,
					end: parseInt(m[8], 10) - 1,
					violatesCyclomaticComplexityThreshold: false,
					violatesNumOfParameters: false,
					violatesTokenCount: false,
					path: vscode.Uri.file(m[9]),
				};

				let currentFunctionsAnalysis = fileLogs.get(fileUri.fsPath);
				if(currentFunctionsAnalysis === undefined) {
					fileLogs.set(fileUri.fsPath, [functionAnalysis]);
				}
				else{
					let foundFunction = false;
					for(let i=0; i<currentFunctionsAnalysis.length; i++) {
						if(currentFunctionsAnalysis[i].name === functionAnalysis.name) {
							currentFunctionsAnalysis[i].cyclomaticComplexity = functionAnalysis.cyclomaticComplexity;
							currentFunctionsAnalysis[i].tokenCount = functionAnalysis.tokenCount;
							currentFunctionsAnalysis[i].numOfParameters = functionAnalysis.numOfParameters;
							currentFunctionsAnalysis[i].start = functionAnalysis.start;
							currentFunctionsAnalysis[i].end = functionAnalysis.end;
							foundFunction = true;
							break;
						}
					}
					if(!foundFunction){
					// nothing found add it.
					currentFunctionsAnalysis.push(functionAnalysis);
					fileLogs.set(fileUri.fsPath, currentFunctionsAnalysis);
					}
				}

				if((undefined !== previousUri) && (previousUri.fsPath === fileUri.fsPath)) {
					fileUri = previousUri;
				}

				// get or create new diag array
				diagnostics = diagnosticCollection.get(fileUri);
				if (undefined === diagnostics) {
					diagnostics = [];
				}

				const diagnosticsOfFunction = createDiagnosticEntry(functionAnalysis);
				diagnostics.push(...diagnosticsOfFunction);

				previousUri = fileUri;
				diagnosticCollection.set(fileUri, diagnostics);
			}
		}
	}
	return diagnosticCollection;
}

//---------------------------------------------------------------------------------------------------------------------

function createDiagnosticEntry(functionAnalysis: FunctionAnalysis) : vscode.Diagnostic[] {
	let threshold: number | undefined;
	let message: string;
	const diagnostics: vscode.Diagnostic[] = [];
	const lizardLinterConfiguration = vscode.workspace.getConfiguration('thresholds');
	const range: vscode.Range = new vscode.Range(functionAnalysis.start, 0, functionAnalysis.start, 1);

	// cyclomatic complexity
	threshold = lizardLinterConfiguration.get("cyclomaticComplexity");
	if((undefined !== threshold)
	&& (functionAnalysis.cyclomaticComplexity > threshold)) {
		functionAnalysis.violatesCyclomaticComplexityThreshold = true;
		message = `Cyclomatic complexity of ${functionAnalysis.cyclomaticComplexity} higher then threshold (${threshold}) for function ${functionAnalysis.name}`;
		diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
	}

	// token count
	threshold = lizardLinterConfiguration.get("tokenCount");
	if((undefined !== threshold)
	&& (functionAnalysis.tokenCount > threshold)) {
		functionAnalysis.violatesTokenCount = true;
		message = `Token count of ${functionAnalysis.tokenCount} higher then threshold (${threshold}) for function ${functionAnalysis.name}`;
		diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
	}

	// number of parameters
	threshold = lizardLinterConfiguration.get("numOfParameters");
	if((undefined !== threshold)
	&& (functionAnalysis.numOfParameters > threshold)) {
		functionAnalysis.violatesNumOfParameters = true;
		message = `Number of parameters ${functionAnalysis.numOfParameters} higher then threshold (${threshold}) for function ${functionAnalysis.name}`;
		diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
	}

	return diagnostics;
}

//---------------------------------------------------------------------------------------------------------------------

export function getFileAnalysis(fsPath: string): FunctionAnalysis[] | undefined {
	return fileLogs.get(fsPath);
}
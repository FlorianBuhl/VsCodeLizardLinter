// Imports
import * as vscode from 'vscode';
import * as path from 'path';
import { performance } from 'perf_hooks';

//---------------------------------------------------------------------------------------------------------------------

export type FunctionAnalysis = {
	name: string,
	cyclomaticComplexity: number,
	numOfParameters: number,
	linesOfCodeWithoutComments: number,
	tokenCount: number
	start: number,
	end: number,
	violatesCyclomaticComplexityThreshold?: boolean,
	violatesNumOfParameters?: boolean,
	violatesLinesOfCodeWithoutComments?: boolean,
	violatesTokenCount?: boolean,
	path: vscode.Uri,
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

export async function activate(context: vscode.ExtensionContext) {
	fileLogs = new Map();

	let disposable: vscode.Disposable;

	// lint command
	disposable = vscode.commands.registerCommand('lizard-linter.lint', async() => {
		if((undefined !== vscode.window.activeTextEditor)) {
			let start = performance.now();
			await lintUri(vscode.window.activeTextEditor.document.uri);
			let end = performance.now();
			const duration = end - start;
			console.log(`command duration: ${duration}`);
		}
	});
	context.subscriptions.push(disposable);

	// onDidSaveTextDocument
	disposable = vscode.workspace.onDidSaveTextDocument(async (textDocument) => {
		// check if setting to lint on file save is enabled
		// check if uri can be linted
		if((true === vscode.workspace.getConfiguration('execution').get('ExecuteLizardLintOnFileSave'))
		&& (await isUriSupported(textDocument.uri))){
			lintUri(textDocument.uri);	// Execute lint on text document.
		}
	});
	context.subscriptions.push(disposable);

	// onDidOpenTextDocument
	disposable = vscode.workspace.onDidOpenTextDocument(async (textDocument) => {
		if((true === vscode.workspace.getConfiguration('execution').get('ExecuteLizardLintOnFileOpen'))
		&& (await isUriSupported(textDocument.uri))){
			lintUri(textDocument.uri);	// Execute lint on text document.
		}
	});
	context.subscriptions.push(disposable);
}

//---------------------------------------------------------------------------------------------------------------------

/**
 * Checks if a lizard lint can be executed on the given uri.
 * @param uri uri which is checked
 * @returns true if lizard lint can be done, false otherwise.
 */
export async function isUriSupported(uri: vscode.Uri){
	try{
		const fsStat = await vscode.workspace.fs.stat(uri);
		if(fsStat.type === vscode.FileType.Directory){
			// in case uri is a directory then execute lizard lint.
			// todo: it can be improved by checking if in this directory are any files on which lizard lint can be done.
			return true;
		}
		else {
			// in case uri is a file then check if file extension is supported.
			return supportedExtensions.includes(path.extname(uri.fsPath));
		}
	}
	catch(err){
		console.error(`isUriSupported. Not possible to do vscode.workspace.fs.stat(uri) with ${uri}\n${err}`);
	}

}

//---------------------------------------------------------------------------------------------------------------------

async function fsExists(uri: vscode.Uri): Promise<boolean> {
	let isFsExisting = false;
	try {
		await vscode.workspace.fs.stat(uri);
		isFsExisting = true;
	} catch {
		isFsExisting = false;
	}
	return isFsExisting;
}

//---------------------------------------------------------------------------------------------------------------------

/**
 * Executes lizard lint on the given uri. A log file is generated which can be read by the user.
 * @param uri uri on which lizard is executed.
 */
export async function lintUri(uri: vscode.Uri): Promise<void> {
	const promise = new Promise<void>(async(resolve, reject) => {
		// get workspace folder belonging to given uri.
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
		if((undefined !== workspaceFolder) && (await isUriSupported(uri))) {
			const logFilePath = getLogFilePath(uri);

			// create lizard log directory if it does not exist
			const logFolderPath = path.dirname(logFilePath);
			try{
				if(false === await fsExists(vscode.Uri.file(logFolderPath))) {
					await vscode.workspace.fs.createDirectory(vscode.Uri.file(logFolderPath));
				}
			} catch(err) {
				console.error(`Create lizard log directory if it does not exist ${logFolderPath}\n${err}`);
			}

			// remove previously generated log file
			try{
				if(true === await fsExists(vscode.Uri.file(logFilePath))) {
					await vscode.workspace.fs.delete(vscode.Uri.file(logFilePath));
				}
			} catch(err) {
				console.error(`Remove previously generated log file ${logFilePath}\n${err}`);
			}
			console.log(`logFilePath: ${logFilePath}`);

			// create task
			let cmd = calculateLizardShellCmd(uri, logFilePath);
			let task = new vscode.Task({type: "lizard-linter", logFilePath: logFilePath},
																	workspaceFolder, "Execute lizard tool", "lizard-linter",
																	new vscode.ShellExecution(cmd));

			task.presentationOptions.focus = false;
			task.presentationOptions.reveal = vscode.TaskRevealKind.Never;
			task.presentationOptions.panel = vscode.TaskPanelKind.New;
			task.presentationOptions.echo = true;
			task.isBackground = true;

			console.log(cmd);

			// execute task
			vscode.tasks.executeTask(task);
			let disposable = vscode.tasks.onDidEndTask(async(event) => {
				if (event.execution.task.definition.type === "lizard-linter") {
					console.log("lizard task finished");
					disposable.dispose();
					resolve();
					// event.execution.terminate();
					analyzeLizardLogFiles([vscode.Uri.file(event.execution.task.definition.logFilePath)]);
				}
			});
		}
		else {
			if(false === await isUriSupported(uri)) {
				reject(new Error("Requested Uri not supported"));
			} else {
				reject(new Error("No workspace"));
			}
		}
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
	// get relative logFilepath from settings.
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

	// compute file name based on the uri (file name and file extension) which shall be linted.
	let uriPath =  path.parse(uri.fsPath);
	let logFileName: string;
	if(uriPath.ext) {
		// logFileName = fileName_fileExt.log
		logFileName = uriPath.name + "_" + uriPath.ext.substring(1) + ".log";
	} else {
		// logFileName = folderName.log
		logFileName = uriPath.name + ".log";
	}

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
	return cmd;
}

//---------------------------------------------------------------------------------------------------------------------

export async function analyzeLizardLogFiles(lizardLogFilesUri: vscode.Uri[]){
	let lizardDiagCol: Map<vscode.Uri, vscode.Diagnostic[] | undefined>;

	// cycle through log files
	for (let lizardLogFileUri of lizardLogFilesUri) {
		if(true === await fsExists(lizardLogFileUri)) {
			console.log("analyze log file: " + lizardLogFileUri.fsPath);
			let document = await vscode.workspace.openTextDocument(lizardLogFileUri);
			let text = document.getText(); // load text of document
			lizardDiagCol = analyzeLizardLogFile(text); // analyze file

			// set the new diagnosis entries
			for (let lintDiagColKey of lizardDiagCol.keys()) {
				diagnosticCollection.set(lintDiagColKey, lizardDiagCol.get(lintDiagColKey));
			}
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
				let fileUri = vscode.Uri.file(m[9]);

				let functionAnalysis: FunctionAnalysis = {
					name: m[6],
					cyclomaticComplexity: parseInt(m[2], 10),
					numOfParameters: parseInt(m[4], 10),
					linesOfCodeWithoutComments: parseInt(m[1], 10),
					tokenCount: parseInt(m[3], 10),
					start: parseInt(m[7], 10) - 1,
					end: parseInt(m[8], 10) - 1,
					violatesCyclomaticComplexityThreshold: false,
					violatesNumOfParameters: false,
					violatesLinesOfCodeWithoutComments: false,
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
				console.log(diagnostics);

				previousUri = fileUri;
				diagnosticCollection.set(fileUri, diagnostics);
			}
		}
	}
	return diagnosticCollection;
}

//---------------------------------------------------------------------------------------------------------------------

/**
 * Creates diagnostic entries for the given function analysis.
 * It checks the cyclomatic complexity, number of parameters, the lines of code without comments and the token count.
 * Checking is done by loading the configured threshold of the settings and comparing it against the function value.
 * @param functionAnalysis function analysis data object.
 * @returns an array holding the diagnostic entries.
 */
function createDiagnosticEntry(functionAnalysis: FunctionAnalysis) : vscode.Diagnostic[] {
	let threshold: number | undefined;
	let message: string;

	const diagnostics: vscode.Diagnostic[] = [];
	let diagnostic;

	const lizardThresholdConfig = vscode.workspace.getConfiguration('thresholds');
	const range: vscode.Range = new vscode.Range(functionAnalysis.start, 0, functionAnalysis.start, 1);

	// number of parameters
	threshold = lizardThresholdConfig.get("numOfParameters");
	if((undefined !== threshold)
	&& (threshold > 0)
	&& (functionAnalysis.numOfParameters > threshold)) {
		functionAnalysis.violatesNumOfParameters = true;
		message = `${functionAnalysis.name}: Number of parameters ${functionAnalysis.numOfParameters} higher then threshold (${threshold})`;
		diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
		diagnostic.source = "lizard-linter";
		diagnostics.push(diagnostic);
	}

	// lines of code without comments
	threshold = lizardThresholdConfig.get("linesOfCodeWithoutComments");
	if((undefined !== threshold)
	&& (threshold > 0)
	&& (functionAnalysis.linesOfCodeWithoutComments > threshold)) {
		functionAnalysis.violatesLinesOfCodeWithoutComments = true;
		message = `${functionAnalysis.name}: Number of lines without comments ${functionAnalysis.linesOfCodeWithoutComments} higher then threshold (${threshold})`;
		diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
		diagnostic.source = "lizard-linter";
		diagnostics.push(diagnostic);
	}

	// token count
	threshold = lizardThresholdConfig.get("tokenCount");
	if((undefined !== threshold)
	&& (threshold > 0)
	&& (functionAnalysis.tokenCount > threshold)) {
		functionAnalysis.violatesTokenCount = true;
		message = `${functionAnalysis.name}: Token count of ${functionAnalysis.tokenCount} higher then threshold (${threshold})`;
		diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
		diagnostic.source = "lizard-linter";
		diagnostics.push(diagnostic);
	}

	// cyclomatic complexity
	threshold = lizardThresholdConfig.get("cyclomaticComplexity");
	if((undefined !== threshold)
	&& (threshold > 0)
	&& (functionAnalysis.cyclomaticComplexity > threshold)) {
		functionAnalysis.violatesCyclomaticComplexityThreshold = true;
		message = `${functionAnalysis.name}: Cyclomatic complexity of ${functionAnalysis.cyclomaticComplexity} higher then threshold (${threshold})`;
		diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
		diagnostic.source = "lizard-linter";
		diagnostics.push(diagnostic);
	}

	return diagnostics;
}

//---------------------------------------------------------------------------------------------------------------------

export function getFileAnalysis(fsPath: string): FunctionAnalysis[] | undefined {
	return fileLogs.get(fsPath);
}
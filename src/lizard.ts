// Imports
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

//---------------------------------------------------------------------------------------------------------------------

enum State {
  idle = 1,
  inExecution,
}

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

let state: State = State.idle;
let curLogFileUri: vscode.Uri;
let lintByFileSave: boolean = false;

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

	if(vscode.workspace.getConfiguration('thresholds').get('ExecuteLizardLintOnFileSave')) {
		lintByFileSave = true;
	}
	else {
		lintByFileSave = false;
	}
}

//---------------------------------------------------------------------------------------------------------------------

export function onDidSaveTextDocument(event: vscode.TextDocument){
	if(true === lintByFileSave) {
		lintUri(event.uri);
	}
}

//---------------------------------------------------------------------------------------------------------------------

export function onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent){
	let affected = event.affectsConfiguration("thresholds.ExecuteLizardLintOnFileSave");
	if(affected) {
		if(vscode.workspace.getConfiguration('thresholds').get('ExecuteLizardLintOnFileSave')) {
			lintByFileSave = true;
		}
		else {
			lintByFileSave = false;
		}
	}
}

//---------------------------------------------------------------------------------------------------------------------

export function onDidEndTask(event: vscode.TaskEndEvent){
	if (event.execution.task.definition.type === "LizardExecution") {
		analyzeLizardLogFiles([curLogFileUri]);
		event.execution.terminate();
	}
}

//---------------------------------------------------------------------------------------------------------------------

export function isFileExtensionIsSupported(uri: vscode.Uri){
	return supportedExtensions.includes(path.extname(uri.fsPath));
}

//---------------------------------------------------------------------------------------------------------------------

export function lintUri(uri: vscode.Uri){
	if(undefined !== vscode.workspace.workspaceFolders && isFileExtensionIsSupported(uri)){
		const logFolderUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, "log");
		const openedFileName = path.parse(uri.fsPath).name;
		const logFileUri = vscode.Uri.joinPath(logFolderUri, openedFileName + ".log");

		// create lizard log folder if it does not exist
		if(!fs.existsSync(logFolderUri.fsPath)) {
			fs.mkdirSync(logFolderUri.fsPath);
		}
		// remove previously generated log file
		if(fs.existsSync(logFileUri.fsPath)){
			fs.rmSync(logFileUri.fsPath);
		}

		// change state
		state = State.inExecution;
		curLogFileUri = logFileUri;

		// create task
		let cmd = `lizard ${uri.fsPath} >> ${logFileUri.fsPath}`;
		let shellExecution = new vscode.ShellExecution(cmd);

		let task = new vscode.Task({type: "LizardExecution"},
		vscode.workspace.workspaceFolders[0], "Execute lizard tool",
		"lizard-linter", shellExecution);
		task.presentationOptions.focus = false;
		task.presentationOptions.reveal = vscode.TaskRevealKind.Never;

		// execute task
		vscode.tasks.executeTask(task);
	}
}

//---------------------------------------------------------------------------------------------------------------------

export function analyzeLizardLogFiles(lizardLogFilesUri: vscode.Uri[]){
	console.log(`${lizardLogFilesUri}`);
	let lizardDiagCol: Map<vscode.Uri, vscode.Diagnostic[] | undefined>;
	for (let lizardLogFileUri of lizardLogFilesUri) {
		if(fs.existsSync(lizardLogFileUri.fsPath)){
			vscode.workspace.openTextDocument(lizardLogFileUri).then((document) => {
			let text = document.getText();
			lizardDiagCol = analyzeLizardLogFile(text);

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

function createDiagnosticEntries(range: vscode.Range, cyclomaticComplexity: number, tokenCount: number, numOfParameters: number, functionName: string) : vscode.Diagnostic[] {
	let threshold: number | undefined;
	let message: string;
	const diagnostics: vscode.Diagnostic[] = [];
	const lizardLinterConfiguration = vscode.workspace.getConfiguration('thresholds');

	// cyclomatic complexity
	threshold = lizardLinterConfiguration.get("cyclomaticComplexity");
	if(undefined === threshold) {
		threshold = 0;
	}
	if(cyclomaticComplexity > threshold) {

		message = `Cyclomatic complexity of ${cyclomaticComplexity} higher then threshold (${threshold}) for function ${functionName}`;
		diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
	}

	// token count
	threshold = lizardLinterConfiguration.get("tokenCount");
	if(undefined === threshold) {
		threshold = 0;
	}
	if(tokenCount > threshold) {
		message = `Token count of ${tokenCount} higher then threshold (${threshold}) for function ${functionName}`;
		diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
	}

	// number of parameters
	threshold = lizardLinterConfiguration.get("numOfParameters");
	if(undefined === threshold) {
		threshold = 0;
	}
	if(numOfParameters > threshold) {
		message = `Number of parameters ${numOfParameters} higher then threshold (${threshold}) for function ${functionName}`;
		diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
	}

	return diagnostics;
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
	if(undefined === threshold) {
		threshold = 0;
	}
	if(functionAnalysis.cyclomaticComplexity > threshold) {
		functionAnalysis.violatesCyclomaticComplexityThreshold = true;
		message = `Cyclomatic complexity of ${functionAnalysis.cyclomaticComplexity} higher then threshold (${threshold}) for function ${functionAnalysis.name}`;
		diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
	}

	// token count
	threshold = lizardLinterConfiguration.get("tokenCount");
	if(undefined === threshold) {
		threshold = 0;
	}
	if(functionAnalysis.tokenCount > threshold) {
		functionAnalysis.violatesTokenCount = true;
		message = `Token count of ${functionAnalysis.tokenCount} higher then threshold (${threshold}) for function ${functionAnalysis.name}`;
		diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
	}

	// number of parameters
	threshold = lizardLinterConfiguration.get("numOfParameters");
	if(undefined === threshold) {
		threshold = 0;
	}
	if(functionAnalysis.numOfParameters > threshold) {
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
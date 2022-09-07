import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

//---------------------------------------------------------------------------------------------------------------------

enum State {
  idle = 1,
  inExecution,
}

let diagnosticCollection: vscode.DiagnosticCollection;

let state: State = State.idle;
let curLogFileUri: vscode.Uri;

//---------------------------------------------------------------------------------------------------------------------

export function createDiagnosticCollection(): vscode.DiagnosticCollection {
	diagnosticCollection = vscode.languages.createDiagnosticCollection();
	return diagnosticCollection;
}

//---------------------------------------------------------------------------------------------------------------------

export function onDidEndTask(event: vscode.TaskEndEvent){
	if (event.execution.task.definition.type === "LizardExecution") {
		analyzeLizardLogFiles([curLogFileUri]);
	}
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
			console.log("debug3");
			vscode.workspace.openTextDocument(lizardLogFileUri).then((document) => {
			console.log("debug4");
			console.log(`${document.uri.fsPath}`);
			let text = document.getText();
			console.log(`text: ${text}`);
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
	let previousFilePath: string | undefined = undefined;
	let message: string;
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
				const cyclomaticComplexity = parseInt(m[2], 10);
				const tokenCount = parseInt(m[3], 10);
				const numOfParameters = parseInt(m[4], 10);
				const functionName = m[6];
				const lineStartNumberInEditor = parseInt(m[7], 10) - 1;
				const lineEndNumberInEditor = parseInt(m[8], 10) - 1;
				const filePath = m[9];
				let fileUri = vscode.Uri.file(filePath);

				if((undefined !== previousUri) && (previousUri.fsPath === fileUri.fsPath)) {
					fileUri = previousUri;
				}

				// get or create new diag array
				diagnostics = diagnosticCollection.get(fileUri);
				if (undefined === diagnostics) {
					diagnostics = [];
				}

				console.log(`linesOfCodeWithoutComments: ${linesOfCodeWithoutComments}\ncyclomaticComplexity: ${cyclomaticComplexity}\ntokenCount: ${tokenCount}\nnumOfParameters: ${numOfParameters}\nfunctionName: ${functionName}\nlineNumberInEditor: ${lineStartNumberInEditor}\nfileName: ${fileUri.fsPath}\n`);

				const range: vscode.Range = new vscode.Range(lineStartNumberInEditor, 0, lineStartNumberInEditor, 1);
				let threshold: number | undefined;

				// cyclomatic complexity
				const lizardLinterConfiguration = vscode.workspace.getConfiguration('thresholds');

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

				previousUri = fileUri;
				diagnosticCollection.set(fileUri, diagnostics);
			}
		}
	}
	return diagnosticCollection;
}
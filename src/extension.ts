// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "lizard-linter" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('lizard-linter.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from lizard-linter!');
	});

	context.subscriptions.push(disposable);

	// execute lint command
	disposable = vscode.commands.registerCommand('lizard-linter.lint', lint);
	context.subscriptions.push(disposable);

	// add filesystemWatchers to be informed about new cyclomatic complexity logs
	if(undefined !== vscode.workspace.workspaceFolders){
		let filesystemWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], `log/*.log`));
		filesystemWatcher.onDidChange((uri) => {
			analyzeLizardLogFiles([uri]);
		});
		filesystemWatcher.onDidCreate((uri) => {
			analyzeLizardLogFiles([uri]);
		});
	}
}

export function lint()
{
	let message;

	if((undefined !== vscode.window.activeTextEditor)
	&& (undefined !== vscode.workspace.workspaceFolders)) {
		const openedFilePath = vscode.window.activeTextEditor.document.uri.fsPath;
		const openedFileName = path.parse(openedFilePath).name;
		const logFolderUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, "log");
		const logFileUri = vscode.Uri.joinPath(logFolderUri, openedFileName + ".log");

		console.log(`openedFilePath ${openedFilePath}\nopenedFileName ${openedFileName}\nlogFolderUri ${logFolderUri.fsPath}\nlogFileUri ${logFileUri.fsPath}`);

		// create lizard log folder if it does not exist
		if(!fs.existsSync(logFolderUri.fsPath)) {
			fs.mkdirSync(logFolderUri.fsPath);
		}
		// remove prevously generated log file
		if(fs.existsSync(logFileUri.fsPath)){
			fs.rmSync(logFileUri.fsPath);
		}

		const terminal = vscode.window.createTerminal("lizard_linter_terminal");
		terminal.sendText(`lizard ${openedFilePath} >> ${logFileUri.fsPath}`);
	}

	vscode.window.showInformationMessage('Execute lint ' + message);
}

export function analyzeLizardLogFiles(lizardLogFilesUri: vscode.Uri[]){
	let lizardDiagCol: Map<vscode.Uri, vscode.Diagnostic[] | undefined>;

	for (let lizardLogFileUri of lizardLogFilesUri) {
		vscode.workspace.openTextDocument(lizardLogFileUri).then((document) => {
			let text = document.getText();
			console.log(text);
			lizardDiagCol = analyzeLizardLogFile(text);

			// for (let lintDiagColKey of lizardDiagCol.keys()) {
			// 	diagnosticCollection.set(lintDiagColKey, lizardDiagCol.get(lintDiagColKey));
			// }
		});
	}
}

export function analyzeLizardLogFile(text: string): Map<vscode.Uri, vscode.Diagnostic[] | undefined>{

	let diagnosticCollection = new Map<vscode.Uri, vscode.Diagnostic[] | undefined>();
	let diagnostics: vscode.Diagnostic[] | undefined = undefined;
	let uri: vscode.Uri | undefined = undefined;

	// Get the relevant part of stdout containing the function analysis.
	let regex = /-+(.*)1 file analyzed/gms;
	let m = regex.exec(text);

	if(null !== m){
		let analyzedFunctionsText = m[1].trim().split('\n');

		for(let functionLine of analyzedFunctionsText){
			regex = /\s?(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+) (.*)@(\d+)-(\d+)@/gm;
			m = regex.exec(functionLine);
			if(null !== m) {
				const linesOfCodeWithoutComments = parseInt(m[1], 10);
				const cyclomaticComplexity = parseInt(m[2], 10);
				const tokenCount = parseInt(m[3], 10);
				const numOfParameters = parseInt(m[4], 10);
				const functionName = m[6];
				const lineNumberInEditor = parseInt(m[7], 10) - 1;

				console.log(`linesOfCodeWithoutComments: ${linesOfCodeWithoutComments}\ncyclomaticComplexity: ${cyclomaticComplexity}\ntokenCount: ${tokenCount}\nnumOfParameters: ${numOfParameters}\nfunctionName: ${functionName}\nlineNumberInEditor: ${lineNumberInEditor}\n`);
			}
		}
	}


	return diagnosticCollection;
}

// this method is called when your extension is deactivated
export function deactivate() {}

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as lizard from './lizard';
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
	disposable = vscode.commands.registerCommand('lizard-linter.lint', lizard.lint);
	context.subscriptions.push(disposable);

	context.subscriptions.push(lizard.createDiagnosticCollection());

	// add filesystemWatchers to be informed about new cyclomatic complexity logs
	// if(undefined !== vscode.workspace.workspaceFolders){
	// 	let filesystemWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], `log/*.log`), true, false, true);
	// 	filesystemWatcher.onDidChange((uri) => {
	// 		lizard.analyzeLizardLogFiles([uri]);
	// 	});
	// 	filesystemWatcher.onDidCreate((uri) => {
	// 		onDidCreate([uri]);
	// 	});
	// }

	disposable = vscode.tasks.onDidEndTask(lizard.onDidEndTask);
	context.subscriptions.push(disposable);
}

function onDidCreate(uri: vscode.Uri[]){
	console.log("created");
}

// this method is called when your extension is deactivated
export function deactivate() {}

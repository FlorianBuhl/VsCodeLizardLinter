// Imports
import * as vscode from 'vscode';
import * as lizard from './lizard';
import * as lizardTableView from './lizardTableView';

//---------------------------------------------------------------------------------------------------------------------

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// execute lint command
	let disposable = vscode.commands.registerCommand('lizard-linter.lint', executeLintCmd);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('lizard-linter.lintFolder', executeLintFolder);
	context.subscriptions.push(disposable);

	// diagnostics
	context.subscriptions.push(lizard.createDiagnosticCollection());

	// onDidSaveTextDocument
	disposable = vscode.workspace.onDidSaveTextDocument(lizard.onDidSaveTextDocument);
	context.subscriptions.push(disposable);

	// onDidOpenTextDocument
	disposable = vscode.workspace.onDidOpenTextDocument(lizard.onDidSaveTextDocument);
	context.subscriptions.push(disposable);

	// onDidEndTask
	disposable = vscode.tasks.onDidEndTask(lizard.onDidEndTask);
	context.subscriptions.push(disposable);

	// onDidChangeConfiguration
	disposable = vscode.workspace.onDidChangeConfiguration(lizard.onDidChangeConfiguration);
	context.subscriptions.push(disposable);

	lizard.activate();
	lizardTableView.activate(context);

	console.log("Lizard tool activated");
}

//---------------------------------------------------------------------------------------------------------------------

function executeLintFolder(folder: vscode.Uri | undefined){
	if(undefined !== folder){
		console.log (folder.fsPath);
		lizard.lintUri(folder);
	}
	else{
		console.log("undefined");
	}
}

function executeLintCmd()
{
	if((undefined !== vscode.window.activeTextEditor)
	&& (undefined !== vscode.workspace.workspaceFolders)) {
		lizard.lintUri(vscode.window.activeTextEditor.document.uri);
	}
}

//---------------------------------------------------------------------------------------------------------------------

// this method is called when your extension is deactivated
export function deactivate() {}

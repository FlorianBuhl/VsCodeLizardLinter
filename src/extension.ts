// Imports
import { performance } from 'perf_hooks';
import * as vscode from 'vscode';
import * as lizard from './lizard';
import * as lizardTableView from './lizardTableView';

//---------------------------------------------------------------------------------------------------------------------

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {


	let disposable = vscode.commands.registerCommand('lizard-linter.lintFolder', executeLintFolder);
	context.subscriptions.push(disposable);

	// diagnostics
	context.subscriptions.push(lizard.createDiagnosticCollection());

	lizard.activate(context);
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


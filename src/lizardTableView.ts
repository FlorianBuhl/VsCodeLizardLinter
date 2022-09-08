import * as vscode from 'vscode';
import * as lizard from './lizard';

//---------------------------------------------------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext){
	let disposable = vscode.commands.registerCommand('lizard-linter.showTable', createTable);
	context.subscriptions.push(disposable);
}

//---------------------------------------------------------------------------------------------------------------------

function createTable() {
  if(undefined !== vscode.window.activeTextEditor) {
		const analyzedFunctions = lizard.getFileAnalysis(vscode.window.activeTextEditor.document.uri.fsPath);
    if(analyzedFunctions !== undefined) {
      const panel = vscode.window.createWebviewPanel("lizardTable", "lizard table", vscode.ViewColumn.Beside, { enableScripts: true });
      panel.webview.html = getLizardContent(analyzedFunctions);
      panel.webview.onDidReceiveMessage(onDidReceiveMessage);
     }
	}
}

//---------------------------------------------------------------------------------------------------------------------

async function onDidReceiveMessage(event: any){
  if(event.command === "open"){
    const uri = vscode.Uri.parse(event.link);
    const line = (+uri.fragment.substring(1)) - 1;
    const range = new vscode.Range(line, 0, line, 1);

    let linkRevealed = false;
    for (let visibleEditor of vscode.window.visibleTextEditors){
      if(visibleEditor.document.uri.fsPath === uri.fsPath){
        visibleEditor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        linkRevealed = true;
      }
    }
    if(linkRevealed === false) {
      const editor = await vscode.window.showTextDocument(uri);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }
  }
}

//---------------------------------------------------------------------------------------------------------------------

function getLizardContent(analyzedFunctions: lizard.FunctionAnalysis[]) {
  let tableHtmlString: string = "<table>";
  tableHtmlString += "<tr>";
  tableHtmlString += "<th>name</th><th>complexity</th><th>parameters</th><th>token count</th>";
  tableHtmlString += "</tr>";

  for(let functionAnalysis of analyzedFunctions){
    tableHtmlString += "<tr>";
    tableHtmlString += `<td><a href="${functionAnalysis.path}#L${functionAnalysis.start}">${functionAnalysis.name}</a></td>`;
    tableHtmlString += `<td class="${functionAnalysis.violatesCyclomaticComplexityThreshold}">${functionAnalysis.cyclomaticComplexity}</td>`;
    tableHtmlString += `<td class="${functionAnalysis.violatesNumOfParameters}">${functionAnalysis.numOfParameters}</td>`;
    tableHtmlString += `<td class="${functionAnalysis.violatesTokenCount}">${functionAnalysis.tokenCount}</td>`;
    tableHtmlString += "</tr>";
  }
  tableHtmlString += "</table>";

  let body = "<body>";
  body += tableHtmlString;
  body += "</body>";

  let htmlFile = `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cat Coding</title>
      <style>
        table {
          border-collapse: collapse;
          width: 100%;
        }

        td.true {
          background-color: red;
        }

        td, th {
          border: 1px solid;
          text-align: left;
          padding: 8px;
        }
      </style>

  </head>
  ${body}
  <script>
  const vscode = acquireVsCodeApi();

  for (const link of document.querySelectorAll('a[href^="file:"]')) {
      link.addEventListener('click', () => {
          vscode.postMessage({
              command: "open",
              link: link.getAttribute('href'),
          });
      });
  }
  </script>
  </html>`;
  return htmlFile;
}

//---------------------------------------------------------------------------------------------------------------------
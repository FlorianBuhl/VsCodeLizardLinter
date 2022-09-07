import * as vscode from 'vscode';

export function createTable() {
  const panel = vscode.window.createWebviewPanel("lizardTable", "lizard table", vscode.ViewColumn.Beside);
}

export function getLizardContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cat Coding</title>
</head>
<body>
    fill the body man.
</body>
</html>`;
}
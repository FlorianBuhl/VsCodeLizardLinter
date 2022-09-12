import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import * as lizard from './../../lizard';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

  const basePath = path.join(__dirname, 'test_files');
  checkFileExtension(basePath, 'c', 'c', 'bad_function');
  checkFileExtension(basePath, 'c', 'h', 'bad_function');
  checkFileExtension(basePath, 'cpp', 'cpp', 'bad_function');
  checkFileExtension(basePath, 'java', 'java', 'TestClass::bad_function');
  checkFileExtension(basePath, 'CSharp', 'cs', 'bad_function');
  checkFileExtension(basePath, 'JavaScript', 'js', 'bad_function');
  checkFileExtension(basePath, 'ObjectiveC', 'm', 'bad_function');
  checkFileExtension(basePath, 'swift', 'swift', 'bad_function');
  checkFileExtension(basePath, 'python', 'py', 'bad_function');
  checkFileExtension(basePath, 'ruby', 'rb', 'bad_function');
  checkFileExtension(basePath, 'php', 'php', 'bad_function');
  checkFileExtension(basePath, 'scala', 'scala', 'bad_function');
  checkFileExtension(basePath, 'GDScript', 'gd', 'bad_function');
  checkFileExtension(basePath, 'GoLang', 'go', 'bad_function');
  checkFileExtension(basePath, 'lua', 'lua', 'bad_function');
  checkFileExtension(basePath, 'rust', 'rs', 'bad_function');

});

async function checkFileExtension(pathToTestFolder: string, language: string, fileEnding: string, badFunctionName: string) {
  suite(`Test suite. The lizard tool can handle ${language} files`, () => {

    const goodPath = path.join(pathToTestFolder, language, 'good.') + fileEnding;
    const badPath = path.join(pathToTestFolder, language, 'bad.') + fileEnding;
    const emptyPath = path.join(pathToTestFolder, language, 'empty.') + fileEnding;

    setup(async () => {

      // set the value for cyclomatic complexity threshold very low in order
      // to have smaller test files (e.g. bad.py)
			vscode.workspace.getConfiguration("thresholds").update("cyclomaticComplexity", 2);
      vscode.workspace.getConfiguration("thresholds").update("tokenCount",  100);
      vscode.workspace.getConfiguration("thresholds").update("numOfParameters",  5);
    });

    test(`checks bad.${fileEnding} and reports the correct results`, async () => {
			await lizard.lintUri(vscode.Uri.file(badPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(badPath));

      assert.strictEqual(diagnostics.length, 1);
      assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
      assert.strictEqual(diagnostics[0].message, `${badFunctionName}: Cyclomatic complexity of 3 higher then threshold (2)`);
    });

    test(`finds nothing wrong with an empty.${fileEnding} file`, async () => {
      await lizard.lintUri(vscode.Uri.file(emptyPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(emptyPath));
      console.log("test debug");
      console.log(diagnostics.length);

      assert.strictEqual(diagnostics.length, 0);
    });

    test(`finds nothing wrong with good.${fileEnding} file`, async () => {
      await lizard.lintUri(vscode.Uri.file(goodPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(goodPath));

      assert.strictEqual(0, diagnostics.length);
    });
  });
}


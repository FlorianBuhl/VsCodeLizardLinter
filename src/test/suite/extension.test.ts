import * as assert from 'assert';
import * as path from 'path';
import * as lizard from './../../lizard';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));

	});

  test('Test c file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'c', 'c', 'bad_function');
  });

  test('Test h file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'c', 'h', 'bad_function');
  });

  test('Test cpp file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'cpp', 'cpp', 'bad_function');
  });

  test('Test java file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'java', 'java', 'TestClass::bad_function');
  });

  test('Test CSharp file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'CSharp', 'cs', 'bad_function');
  });

  test('Test JavaScript file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'JavaScript', 'js', 'bad_function');
  });

  test('Test ObjectiveC file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'ObjectiveC', 'm', 'bad_function');
  });

  test('Test swift file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'swift', 'swift', 'bad_function');
  });

  test('Test python file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'python', 'py', 'bad_function');
  });

  test('Test ruby file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'ruby', 'rb', 'bad_function');
  });

  test('Test php file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'php', 'php', 'bad_function');
  });

  test('Test scala file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'scala', 'scala', 'bad_function');
  });

  test('Test GDScript file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'GDScript', 'gd', 'bad_function');
  });

  test('Test GoLang file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'GoLang', 'go', 'bad_function');
  });

  test('Test lua file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'lua', 'lua', 'bad_function');
  });

  test('Test rust file', () => {
    const basePath = path.join(__dirname, 'test_files');
    checkFileExtension(basePath, 'rust', 'rs', 'bad_function');
  });

});

async function checkFileExtension(pathToTestFolder: string, language: string, fileEnding: string, badFunctionName: string) {
  describe(`The lizard tool can handle ${language} files`, () => {
    const goodPath = path.join(pathToTestFolder, language, 'good.') + fileEnding;
    const badPath = path.join(pathToTestFolder, language, 'bad.') + fileEnding;
    const emptyPath = path.join(pathToTestFolder, language, 'empty.') + fileEnding;

    beforeEach(async () => {

      // set the value for cyclomatic complexity threshold very low in order
      // to have smaller test files (e.g. bad.py)
			vscode.workspace.getConfiguration("thresholds").update("cyclomaticComplexity", 2);
    });

    it(`checks bad.${fileEnding} and reports the correct results`, async () => {
			await lizard.lintUri(vscode.Uri.parse(badPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(badPath));

      assert.strictEqual(1, diagnostics.length);
      assert.strictEqual(vscode.DiagnosticSeverity.Warning, diagnostics[0].severity);

      // expect(messages[0].excerpt).toBe(`cyclomatic complexity of 3 is too high for function ${badFunctionName}`);
      // expect(messages[0].location.file).toBe(badPath);
      // expect(messages[0].url).toBe(''); 
    });

    it(`finds nothing wrong with an empty.${fileEnding} file`, async () => {
      await lizard.lintUri(vscode.Uri.parse(emptyPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(emptyPath));

      assert.strictEqual(0, diagnostics.length);
    });

    it(`finds nothing wrong with good.${fileEnding} file`, async () => {
      await lizard.lintUri(vscode.Uri.parse(goodPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(goodPath));

      assert.strictEqual(0, diagnostics.length);
    });
  });
}


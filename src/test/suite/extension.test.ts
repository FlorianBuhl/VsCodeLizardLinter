import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import * as lizard from './../../lizard';

//---------------------------------------------------------------------------------------------------------------------

async function testFileExtension(pathToTestFolder: string, language: string, fileEnding: string, badFunctionName: string) {
  suite(`File extension suite. The lizard tool can handle ${language} files`, () => {

    const goodPath = path.join(pathToTestFolder, language, 'good.') + fileEnding;
    const badPath = path.join(pathToTestFolder, language, 'bad.') + fileEnding;
    const emptyPath = path.join(pathToTestFolder, language, 'empty.') + fileEnding;

    setup(async () => {

      // set the value for cyclomatic complexity threshold very low in order
      // to have smaller test files
			vscode.workspace.getConfiguration("thresholds").update("cyclomaticComplexity", 2);
      vscode.workspace.getConfiguration("thresholds").update("tokenCount",  100);
      vscode.workspace.getConfiguration("thresholds").update("numOfParameters",  5);
      vscode.workspace.getConfiguration("thresholds").update("linesOfCodeWithoutComments",  1000);
    });

    test(`checks bad.${fileEnding} and reports the correct results`, async () => {
			await lizard.lintUri(vscode.Uri.file(badPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(badPath));

      assert.strictEqual(diagnostics.length, 1);
      assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
      assert.strictEqual(diagnostics[0].message, `${badFunctionName}: Cyclomatic complexity of 3 higher then threshold (2)`);
      assert.strictEqual(diagnostics[0].source, `lizard-linter`);
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

//---------------------------------------------------------------------------------------------------------------------

function testBasicLintFunctionality(basePath: string){
  suite('The lizard tool analyzes functions', () => {
    setup(async () => {
      // set the value for cyclomatic complexity threshold very low in order
      // to have smaller test files
      vscode.workspace.getConfiguration("thresholds").update("cyclomaticComplexity", 2);
      vscode.workspace.getConfiguration("thresholds").update("numOfParameters",  5);
      vscode.workspace.getConfiguration("thresholds").update("tokenCount",  69);
      vscode.workspace.getConfiguration("thresholds").update("linesOfCodeWithoutComments",  10);
    });

    test('it analyzes the number of parameters', async () => {
      const badPath = path.join(basePath, 'very_bad.py');
			await lizard.lintUri(vscode.Uri.file(badPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(badPath));

      assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
      assert.strictEqual(diagnostics[0].message, `too_many_parameters: Number of parameters 6 higher then threshold (5)`);
      assert.strictEqual(diagnostics[0].source, `lizard-linter`);
    });

    test('it analyzes the number of code lines without comments', async () => {
      const badPath = path.join(basePath, 'very_bad.py');
			await lizard.lintUri(vscode.Uri.file(badPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(badPath));

      assert.strictEqual(diagnostics[1].severity, vscode.DiagnosticSeverity.Warning);
      assert.strictEqual(diagnostics[1].message, `too_long_function: Number of lines without comments 11 higher then threshold (10)`);
      assert.strictEqual(diagnostics[1].source, `lizard-linter`);
    });

    test('it analyzes the number of tokens', async () => {
      const badPath = path.join(basePath, 'very_bad.py');
			await lizard.lintUri(vscode.Uri.file(badPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(badPath));

      assert.strictEqual(diagnostics[2].severity, vscode.DiagnosticSeverity.Warning);
      assert.strictEqual(diagnostics[2].message, `too_many_tokens: Token count of 70 higher then threshold (69)`);
      assert.strictEqual(diagnostics[2].source, `lizard-linter`);
    });
  });
}

//---------------------------------------------------------------------------------------------------------------------

function testDisablingThreshold(basePath: string){
  suite('The lizard settings allow a disabling of each analysis by setting a 0', () => {
    test('it does not throw any warning if threshold.numOfParameters is set to 0', async () => {
      vscode.workspace.getConfiguration("thresholds").update("cyclomaticComplexity", 2);
      vscode.workspace.getConfiguration("thresholds").update("numOfParameters",  0);
      vscode.workspace.getConfiguration("thresholds").update("linesOfCodeWithoutComments",  10);
      vscode.workspace.getConfiguration("thresholds").update("tokenCount",  69);

      const badPath = path.join(basePath, 'very_bad.py');
			await lizard.lintUri(vscode.Uri.file(badPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(badPath));

      assert.strictEqual(diagnostics.length, 3);
      assert.strictEqual(diagnostics[0].message, `too_long_function: Number of lines without comments 11 higher then threshold (10)`);
      assert.strictEqual(diagnostics[1].message, `too_many_tokens: Token count of 70 higher then threshold (69)`);
      assert.strictEqual(diagnostics[2].message, `bad_function: Cyclomatic complexity of 3 higher then threshold (2)`);
    });

    test('it does not throw any warning if thresholdLinesOfCodeWithoutComments is set to 0', async () => {
      vscode.workspace.getConfiguration("thresholds").update("cyclomaticComplexity", 2);
      vscode.workspace.getConfiguration("thresholds").update("numOfParameters",  5);
      vscode.workspace.getConfiguration("thresholds").update("linesOfCodeWithoutComments",  0);
      vscode.workspace.getConfiguration("thresholds").update("tokenCount",  69);

      const badPath = path.join(basePath, 'very_bad.py');
			await lizard.lintUri(vscode.Uri.file(badPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(badPath));

      assert.strictEqual(diagnostics.length, 3);
      assert.strictEqual(diagnostics[0].message, `too_many_parameters: Number of parameters 6 higher then threshold (5)`);
      assert.strictEqual(diagnostics[1].message, `too_many_tokens: Token count of 70 higher then threshold (69)`);
      assert.strictEqual(diagnostics[2].message, `bad_function: Cyclomatic complexity of 3 higher then threshold (2)`);
    });

    test('it does not throw any warning if thresholdNumberOfTokens is set to 0', async () => {
      vscode.workspace.getConfiguration("thresholds").update("cyclomaticComplexity", 2);
      vscode.workspace.getConfiguration("thresholds").update("numOfParameters",  5);
      vscode.workspace.getConfiguration("thresholds").update("linesOfCodeWithoutComments",  10);
      vscode.workspace.getConfiguration("thresholds").update("tokenCount",  0);

      const badPath = path.join(basePath, 'very_bad.py');
			await lizard.lintUri(vscode.Uri.file(badPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(badPath));

      assert.strictEqual(diagnostics.length, 3);
      assert.strictEqual(diagnostics[0].message, `too_many_parameters: Number of parameters 6 higher then threshold (5)`);
      assert.strictEqual(diagnostics[1].message, `too_long_function: Number of lines without comments 11 higher then threshold (10)`);
      assert.strictEqual(diagnostics[2].message, `bad_function: Cyclomatic complexity of 3 higher then threshold (2)`);
    });

    test('does not throw any warning if thresholdCyclomaticComplexity is set to 0', async () => {
      vscode.workspace.getConfiguration("thresholds").update("cyclomaticComplexity", 0);
      vscode.workspace.getConfiguration("thresholds").update("numOfParameters",  5);
      vscode.workspace.getConfiguration("thresholds").update("linesOfCodeWithoutComments",  10);
      vscode.workspace.getConfiguration("thresholds").update("tokenCount",  69);

      const badPath = path.join(basePath, 'very_bad.py');
			await lizard.lintUri(vscode.Uri.file(badPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(badPath));

      assert.strictEqual(diagnostics.length, 3);
      assert.strictEqual(diagnostics[0].message, `too_many_parameters: Number of parameters 6 higher then threshold (5)`);
      assert.strictEqual(diagnostics[1].message, `too_long_function: Number of lines without comments 11 higher then threshold (10)`);
      assert.strictEqual(diagnostics[2].message, `too_many_tokens: Token count of 70 higher then threshold (69)`);
    });
  });
}

function testModifiedCyclomaticComplexity(basePath: string) {
  suite('The lizard settings allows to enable or disable a modified cyclomatic complexity calculation selectable in the settings', () => {
    test('it does calculate a switch case as CCN of one in case enabled', async () => {
      vscode.workspace.getConfiguration("thresholds").update("cyclomaticComplexity", 1);
      vscode.workspace.getConfiguration("execution").update("ModifiedCyclomaticComplexity", true);

      const badPath = path.join(basePath, 'switch_case.java');
      await lizard.lintUri(vscode.Uri.file(badPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(badPath));

      assert.strictEqual(diagnostics[2].message, `TestClass::switchCase: Cyclomatic complexity of 2 higher then threshold (1)`);
    });
  });

  suite('The lizard settings allows to enable or disable a modified cyclomatic complexity calculation selectable in the settings', () => {
    test('it does calculate a switch case as CCN of thirteen in case disabled', async () => {
      vscode.workspace.getConfiguration("thresholds").update("cyclomaticComplexity", 1);
      vscode.workspace.getConfiguration("execution").update("ModifiedCyclomaticComplexity", false);

      const badPath = path.join(basePath, 'switch_case.java');
      await lizard.lintUri(vscode.Uri.file(badPath));
      const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(badPath));

      assert.strictEqual(diagnostics[2].message, `TestClass::switchCase: Cyclomatic complexity of 13 higher then threshold (1)`);
    });
  });
}

//---------------------------------------------------------------------------------------------------------------------

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

  //---------------------------------------------------------------------------------------------------------------------

  const basePath = path.join(__dirname, 'test_files');
  testFileExtension(basePath, 'c', 'c', 'bad_function');
  // testFileExtension(basePath, 'c', 'h', 'bad_function');
  // testFileExtension(basePath, 'cpp', 'cpp', 'bad_function');
  // testFileExtension(basePath, 'java', 'java', 'TestClass::bad_function');
  // testFileExtension(basePath, 'CSharp', 'cs', 'bad_function');
  // testFileExtension(basePath, 'JavaScript', 'js', 'bad_function');
  // testFileExtension(basePath, 'ObjectiveC', 'm', 'bad_function');
  // testFileExtension(basePath, 'swift', 'swift', 'bad_function');
  // testFileExtension(basePath, 'python', 'py', 'bad_function');
  // testFileExtension(basePath, 'ruby', 'rb', 'bad_function');
  // testFileExtension(basePath, 'php', 'php', 'bad_function');
  // testFileExtension(basePath, 'scala', 'scala', 'bad_function');
  // testFileExtension(basePath, 'GDScript', 'gd', 'bad_function');
  // testFileExtension(basePath, 'GoLang', 'go', 'bad_function');
  // testFileExtension(basePath, 'lua', 'lua', 'bad_function');
  // testFileExtension(basePath, 'rust', 'rs', 'bad_function');

  //---------------------------------------------------------------------------------------------------------------------

  // testBasicLintFunctionality(basePath);
  // testDisablingThreshold(basePath);
  // testModifiedCyclomaticComplexity(basePath);

  //---------------------------------------------------------------------------------------------------------------------

});

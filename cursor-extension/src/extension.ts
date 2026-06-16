import * as vscode from 'vscode';
import { VisualizerPanel } from './VisualizerPanel';

// ── Cursor detection ──────────────────────────────────────────────────────

/**
 * Returns true when running inside Cursor (a VS Code fork). When false the
 * extension is loaded in vanilla VS Code or another fork.
 */
export function isCursor(): boolean {
  return vscode.env.appName.toLowerCase().includes('cursor');
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getCodeFromEditor(editor: vscode.TextEditor): string {
  const sel = editor.selection;
  return sel.isEmpty
    ? editor.document.getText()          // whole file if nothing selected
    : editor.document.getText(sel);      // selected text only
}

function getConfig(): { apiKey: string; model: string } {
  const cfg = vscode.workspace.getConfiguration('algoViz');
  return {
    apiKey: cfg.get<string>('apiKey', '').trim(),
    model:  cfg.get<string>('model',  'claude-sonnet-4-6')
  };
}

function promptForApiKey(): void {
  vscode.window
    .showErrorMessage(
      'Algorithm Visualizer: Anthropic API key not set.',
      'Open Settings',
      'Get API Key'
    )
    .then(choice => {
      if (choice === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'algoViz.apiKey');
      } else if (choice === 'Get API Key') {
        vscode.env.openExternal(vscode.Uri.parse('https://console.anthropic.com'));
      }
    });
}

// ── Command: Visualize (no hint) ──────────────────────────────────────────

async function commandVisualize(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Algorithm Visualizer: No active editor.');
    return;
  }

  const code = getCodeFromEditor(editor);
  if (!code.trim()) {
    vscode.window.showWarningMessage('Algorithm Visualizer: No code found.');
    return;
  }

  const { apiKey, model } = getConfig();
  if (!apiKey) { promptForApiKey(); return; }

  VisualizerPanel.createOrShow(code, '', apiKey, model, editor);
}

// ── Command: Visualize with Hint ──────────────────────────────────────────

async function commandVisualizeWithHint(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Algorithm Visualizer: No active editor.');
    return;
  }

  const code = getCodeFromEditor(editor);
  if (!code.trim()) {
    vscode.window.showWarningMessage('Algorithm Visualizer: No code found.');
    return;
  }

  const { apiKey, model } = getConfig();
  if (!apiKey) { promptForApiKey(); return; }

  const hint = await vscode.window.showInputBox({
    title: 'Algorithm Visualizer — Hint',
    prompt: 'Describe what to highlight (leave blank for auto-detection)',
    placeHolder: 'e.g. show the left/right pointers and the hash map',
    ignoreFocusOut: true
  });

  // undefined = user pressed Escape
  if (hint === undefined) { return; }

  VisualizerPanel.createOrShow(code, hint, apiKey, model, editor);
}

// ── Activation ────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('algoViz.visualize',         commandVisualize),
    vscode.commands.registerCommand('algoViz.visualizeWithHint', commandVisualizeWithHint)
  );

  // Show a one-time welcome message on first install
  const welcomeShown = context.globalState.get<boolean>('welcomeShown', false);
  if (!welcomeShown) {
    context.globalState.update('welcomeShown', true);

    const message = isCursor()
      ? 'Algorithm Visualizer for Cursor installed! Set your Anthropic API key to get started.'
      : `Algorithm Visualizer (Cursor edition) installed in ${vscode.env.appName}. ` +
        'This build is tuned for Cursor; the vscode-extension/ build is recommended outside Cursor. ' +
        'Set your Anthropic API key to get started.';

    vscode.window
      .showInformationMessage(message, 'Open Settings')
      .then(choice => {
        if (choice === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'algoViz.apiKey');
        }
      });
  }
}

export function deactivate(): void {
  // VisualizerPanel cleans up via its own onDidDispose handler
}

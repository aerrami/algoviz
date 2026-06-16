import * as vscode from 'vscode';
import * as https from 'https';
import { buildPrompt } from './promptBuilder';

interface PanelState {
  code: string;
  hint: string;
  apiKey: string;
  model: string;
}

/**
 * Manages a singleton WebviewPanel that renders the algorithm visualization
 * alongside the editor. Bidirectional sync:
 *   - Extension → Webview: sends generated HTML
 *   - Webview → Extension: sends current frame line number → editor decoration
 */
export class VisualizerPanel {
  public static currentPanel: VisualizerPanel | undefined;
  private static readonly viewType = 'algoVisualizer';

  private readonly _panel: vscode.WebviewPanel;
  private _state: PanelState | undefined;
  private _sourceEditor: vscode.TextEditor | undefined;
  private _lineDecoration: vscode.TextEditorDecorationType;
  private _disposables: vscode.Disposable[] = [];

  // ── Factory ──────────────────────────────────────────────────────────────

  public static createOrShow(
    code: string,
    hint: string,
    apiKey: string,
    model: string,
    sourceEditor: vscode.TextEditor
  ): void {
    // Reuse existing panel if open
    if (VisualizerPanel.currentPanel) {
      VisualizerPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside, true);
      VisualizerPanel.currentPanel._run(code, hint, apiKey, model, sourceEditor);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      VisualizerPanel.viewType,
      'Algorithm Visualizer',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: []
      }
    );

    VisualizerPanel.currentPanel = new VisualizerPanel(panel);
    VisualizerPanel.currentPanel._run(code, hint, apiKey, model, sourceEditor);
  }

  // ── Constructor ───────────────────────────────────────────────────────────

  private constructor(panel: vscode.WebviewPanel) {
    this._panel = panel;

    // Decoration: left-border highlight on the synced source line
    this._lineDecoration = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
      borderLeft: '3px solid',
      borderLeftColor: new vscode.ThemeColor('focusBorder'),
      after: {
        contentText: '  ◀ current step',
        color: new vscode.ThemeColor('editorCodeLens.foreground'),
        fontStyle: 'italic',
        margin: '0 0 0 12px'
      }
    });

    // Webview → Extension messages
    this._panel.webview.onDidReceiveMessage(
      (msg: { type: string; line?: number }) => {
        if (msg.type === 'algoVizFrame' && msg.line !== undefined) {
          this._syncEditorLine(msg.line);
        }
      },
      null,
      this._disposables
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  // ── Core flow ─────────────────────────────────────────────────────────────

  private async _run(
    code: string,
    hint: string,
    apiKey: string,
    model: string,
    sourceEditor: vscode.TextEditor
  ): Promise<void> {
    this._state = { code, hint, apiKey, model };
    this._sourceEditor = sourceEditor;
    this._clearDecoration();

    this._panel.webview.html = this._loadingHtml();
    this._panel.title = `Visualizing: ${this._inferName(code)}`;

    try {
      const rawHtml = await this._callClaude(code, hint, apiKey, model);
      const html = this._injectBridge(rawHtml);
      this._panel.webview.html = html;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this._panel.webview.html = this._errorHtml(msg);
      vscode.window.showErrorMessage(`Algorithm Visualizer: ${msg}`);
    }
  }

  public async rerunWithHint(hint: string): Promise<void> {
    if (!this._state || !this._sourceEditor) { return; }
    await this._run(
      this._state.code, hint,
      this._state.apiKey, this._state.model,
      this._sourceEditor
    );
  }

  // ── Claude API ────────────────────────────────────────────────────────────

  private _callClaude(
    code: string, hint: string, apiKey: string, model: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const prompt = buildPrompt(code, hint);
      const body = JSON.stringify({
        model,
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }]
      });

      const req = https.request(
        {
          hostname: 'api.anthropic.com',
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Length': Buffer.byteLength(body)
          }
        },
        res => {
          let data = '';
          res.on('data', (chunk: Buffer) => (data += chunk.toString()));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                reject(new Error(parsed.error.message));
                return;
              }
              const text: string = parsed.content?.[0]?.text ?? '';
              // Strip optional markdown fences
              const fenced = text.match(/^```(?:html)?\n([\s\S]*?)```\s*$/);
              resolve(fenced ? fenced[1].trim() : text.trim());
            } catch (e) {
              reject(e);
            }
          });
        }
      );

      req.on('error', reject);
      req.setTimeout(120_000, () => {
        req.destroy(new Error('Request timed out after 120 s'));
      });
      req.write(body);
      req.end();
    });
  }

  // ── HTML helpers ──────────────────────────────────────────────────────────

  /**
   * Injects the VS Code bridge before </body> so the generated visualization
   * can call window.__algoVizNotify(lineNumber) to sync the editor cursor.
   */
  private _injectBridge(html: string): string {
    const bridge = `
<script>
/* Algorithm Visualizer — VS Code bridge (injected) */
(function () {
  let _vscode;
  try { _vscode = acquireVsCodeApi(); } catch (_) { /* not in VS Code */ }

  /** Called by the visualization after every render() with the 1-based line number. */
  window.__algoVizNotify = function (line) {
    if (_vscode && typeof line === 'number') {
      _vscode.postMessage({ type: 'algoVizFrame', line: line });
    }
  };
})();
</script>`;

    return html.includes('</body>')
      ? html.replace('</body>', bridge + '\n</body>')
      : html + bridge;
  }

  private _loadingHtml(): string {
    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body {
    margin: 0; height: 100vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--vscode-editor-background);
    color: var(--vscode-foreground);
  }
  .spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--vscode-widget-border, rgba(255,255,255,0.12));
    border-top-color: var(--vscode-focusBorder, #6366f1);
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .title { font-size: 14px; font-weight: 600; }
  .sub   { font-size: 12px; opacity: 0.55; }
  .dots  { display: flex; gap: 5px; margin-top: 4px; }
  .dot   {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--vscode-focusBorder, #6366f1);
    animation: blink 1.4s ease-in-out infinite;
    opacity: 0.3;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes blink { 50% { opacity: 1; } }
</style>
</head>
<body>
  <div class="spinner"></div>
  <div class="title">Generating visualization…</div>
  <div class="sub">Claude is analyzing your algorithm</div>
  <div class="dots">
    <div class="dot"></div><div class="dot"></div><div class="dot"></div>
  </div>
</body>
</html>`;
  }

  private _errorHtml(message: string): string {
    const safe = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body {
    margin: 0; height: 100vh; padding: 32px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 10px;
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--vscode-editor-background);
    color: var(--vscode-foreground);
  }
  .icon  { font-size: 38px; }
  .title { font-size: 15px; font-weight: 600;
           color: var(--vscode-errorForeground, #f87171); }
  .msg   { font-size: 12.5px; opacity: 0.65; max-width: 380px; line-height: 1.55; }
</style>
</head>
<body>
  <div class="icon">⚠️</div>
  <div class="title">Generation failed</div>
  <div class="msg">${safe}</div>
  <div class="msg">Check your API key: <strong>Settings → Extensions → Algorithm Visualizer → API Key</strong></div>
</body>
</html>`;
  }

  // ── Editor sync ───────────────────────────────────────────────────────────

  private _syncEditorLine(line: number): void {
    const config = vscode.workspace.getConfiguration('algoViz');
    if (!config.get<boolean>('syncEditorCursor', true)) { return; }

    const editor = this._findSourceEditor();
    if (!editor || line < 1) { return; }

    const lineIndex = line - 1;
    if (lineIndex >= editor.document.lineCount) { return; }

    const range = new vscode.Range(lineIndex, 0, lineIndex, Number.MAX_SAFE_INTEGER);
    editor.setDecorations(this._lineDecoration, [range]);

    // Scroll the editor to keep the active line visible without stealing focus
    editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }

  private _clearDecoration(): void {
    const editor = this._findSourceEditor();
    if (editor) { editor.setDecorations(this._lineDecoration, []); }
  }

  private _findSourceEditor(): vscode.TextEditor | undefined {
    if (this._sourceEditor && vscode.window.visibleTextEditors.includes(this._sourceEditor)) {
      return this._sourceEditor;
    }
    // Fall back to any visible Python editor
    return vscode.window.visibleTextEditors.find(
      e => e.document.languageId === 'python'
    );
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private _inferName(code: string): string {
    const m = code.match(/^def\s+(\w+)/m);
    return m ? m[1] + '()' : 'algorithm';
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  public dispose(): void {
    VisualizerPanel.currentPanel = undefined;
    this._clearDecoration();
    this._lineDecoration.dispose();
    this._panel.dispose();
    for (const d of this._disposables) { d.dispose(); }
    this._disposables = [];
  }
}

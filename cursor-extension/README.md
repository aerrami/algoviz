# Algorithm Visualizer — Cursor Extension

AI-powered step-by-step algorithm debugger for [Cursor](https://cursor.com).
Select Python code → instant interactive visualization in a side panel, with **live editor cursor sync**.

> **Cursor-first build.** This package targets Cursor specifically — it detects the host at runtime and tailors the welcome flow accordingly. For vanilla VS Code, use the sibling [`vscode-extension/`](../vscode-extension/) build.

---

## How it works

```
┌─────────────────────────┬──────────────────────────────────────────────┐
│  Your Python code       │  Generated visualization                     │
│  (editor)               │  (side panel)                                │
│                         │                                              │
│  def binary_search(...  │  ┌──────────────┐  ┌─────────────────────┐  │
│    left, right = 0, n-1 │  │ Code viewer  │  │  Array as boxes     │  │
│  ▶ while left <= right: │◀─│ cursor here  │  │  [1][3][5][7][9]    │  │
│      mid = (l+r)//2     │  │              │  │      ↑ ↑ ↑          │  │
│      ...                │  │              │  │      L M R          │  │
└─────────────────────────┴──────────────────────────────────────────────┘
```

As you step through frames in the panel, the **editor highlights the corresponding source line** in real time — no context switching.

---

## Install in Cursor

### Option 1 — Open VSX marketplace (when published)

In Cursor: **Extensions** → search for **Algorithm Visualizer for Cursor** → Install.

Cursor uses [Open VSX Registry](https://open-vsx.org/) (not the proprietary VS Code Marketplace), so this extension is published there.

### Option 2 — Side-load a `.vsix` (today)

```bash
cd cursor-extension
npm install
npm run package           # → algo-visualizer-cursor-0.1.0.vsix
```

Then in Cursor: **Extensions** → `⋯` (top-right) → **Install from VSIX…** → select the file.

### Option 3 — Develop locally

Open `cursor-extension/` in Cursor and press **F5** to launch a sandboxed Extension Development Host.

---

## Set your Claude API key

1. Sign up at [console.anthropic.com](https://console.anthropic.com), create an API key.
2. In Cursor: **Settings** (`Ctrl+,` / `Cmd+,`) → search `algoViz.apiKey` → paste your key.

---

## Usage

| How | Action |
|-----|--------|
| **Keyboard** | Select code (optional) → `Ctrl+Shift+Alt+V` (Win/Linux) or `Cmd+Shift+Alt+V` (Mac) |
| **Right-click** | Right-click in editor → Algorithm Visualizer → Visualize Algorithm |
| **Command palette** | `Ctrl/Cmd+Shift+P` → `Algorithm Visualizer: Visualize Algorithm` |
| **With a hint** | Use "Visualize Algorithm with Hint…" — describe what to highlight |

If nothing is selected, the entire file is used. If a single function is selected, only that function is visualized.

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `algoViz.apiKey` | _empty_ | Your Anthropic API key |
| `algoViz.model` | `claude-sonnet-4-6` | Opus = highest quality, Haiku = fastest |
| `algoViz.syncEditorCursor` | `true` | Highlight the current source line as you step |
| `algoViz.autoVisualize` | `true` | Start generating immediately when panel opens |

---

## Cursor vs vscode-extension/ — what's different?

The two builds share the same Claude prompt, webview bridge, and editor-sync logic. Cursor differences:

| | `cursor-extension/` | `vscode-extension/` |
|---|---|---|
| Package name | `algo-visualizer-cursor` | `algo-visualizer` |
| Publish target | Open VSX (`ovsx publish`) | VS Code Marketplace (`vsce publish`) |
| Welcome message | "for Cursor" branding | Generic VS Code |
| Runtime check | Warns when not running in Cursor | None |

Everything else (commands, settings, prompt, webview, sync) is identical — Cursor is a VS Code fork, so the extension API surface is the same.

---

## Publish to Open VSX

```bash
npm install -g ovsx
ovsx create-namespace aerrami -p <OPENVSX_TOKEN>
npm run publish:openvsx
```

Get a token at [open-vsx.org/user-settings/tokens](https://open-vsx.org/user-settings/tokens).

---

## Project structure

```
cursor-extension/
├── package.json          # Extension manifest (Cursor-specific name + publisher)
├── tsconfig.json         # TypeScript config
├── README.md             # This file
├── CLAUDE.md             # Architecture notes for Claude Code
├── .claude/commands/     # Project slash commands
└── src/
    ├── extension.ts      # Entry + Cursor detection (isCursor())
    ├── VisualizerPanel.ts # WebviewPanel + Claude API call + editor sync
    └── promptBuilder.ts  # The prompt that tells Claude how to build the HTML
```

### Key architectural decisions

**Bidirectional sync** — The prompt instructs Claude to call `window.__algoVizNotify(lineNumber)` after every `render()`. The extension injects this function before `</body>`. It calls `acquireVsCodeApi().postMessage(...)`, which the extension maps to an editor decoration.

**Singleton panel** — Only one visualization panel can be open at a time. Re-triggering the command re-uses it.

**`retainContextWhenHidden: true`** — The webview keeps its state when you switch tabs.

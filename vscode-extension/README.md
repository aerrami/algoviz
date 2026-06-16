# Algorithm Visualizer — VS Code / Cursor Extension

AI-powered step-by-step algorithm debugger. Select Python code → instant interactive visualization in a side panel, with **live editor cursor sync**.

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
│                         │  └──────────────┘  └─────────────────────┘  │
│                         │  ◀ Prev  Step 4/18  Next ▶  ▶ Autoplay      │
└─────────────────────────┴──────────────────────────────────────────────┘
```

As you step through frames in the visualization, the **editor highlights the corresponding source line** in real time — no context switching.

---

## Quick start

### 1. Install dependencies
```bash
cd algo-visualizer-vscode
npm install
```

### 2. Get a Claude API key
Sign up at [console.anthropic.com](https://console.anthropic.com), create an API key, and copy it.

### 3. Add your API key to VS Code settings
Open **Settings** (Cmd+, / Ctrl+,), search for `algoViz.apiKey`, and paste your key.

### 4. Launch in development
Press **F5** in VS Code to open the Extension Development Host.

### 5. Build a distributable `.vsix`
```bash
npm run package
```
Then install: **Extensions → ⋯ → Install from VSIX…**

---

## Usage

| How | Action |
|-----|--------|
| **Keyboard** | Select code (optional) → `Cmd+Shift+Alt+V` (Mac) / `Ctrl+Shift+Alt+V` (Win/Linux) |
| **Right-click** | Right-click in editor → Algorithm Visualizer → Visualize Algorithm |
| **Command palette** | `Cmd+Shift+P` → `Algorithm Visualizer: Visualize Algorithm` |
| **With a hint** | Any of the above using "Visualize Algorithm with Hint…" — you'll be prompted to describe what to highlight |

**Tip:** if nothing is selected, the entire file is used. If you select just a function, only that function is visualized.

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `algoViz.apiKey` | _(empty)_ | Your Anthropic API key |
| `algoViz.model` | `claude-sonnet-4-6` | Model to use. Opus = best quality, Haiku = fastest |
| `algoViz.syncEditorCursor` | `true` | Highlight the current source line as you step |
| `algoViz.autoVisualize` | `true` | Start generating immediately when panel opens |

---

## Project structure

```
algo-visualizer-vscode/
├── package.json          # Extension manifest, commands, keybindings, settings
├── tsconfig.json         # TypeScript config
└── src/
    ├── extension.ts      # Entry point — registers commands, handles activation
    ├── VisualizerPanel.ts # WebviewPanel + Claude API call + editor sync
    └── promptBuilder.ts  # The prompt that tells Claude how to build the HTML
```

### Key architectural decisions

**Bidirectional sync** — The prompt instructs Claude to call `window.__algoVizNotify(lineNumber)` after every `render()`. The extension injects this function before `</body>` in the generated HTML. It calls `acquireVsCodeApi().postMessage(...)` which the extension receives and maps to a VS Code editor decoration.

**Singleton panel** — Only one visualization panel can be open at a time. Re-triggering the command re-uses the existing panel and regenerates the content.

**`retainContextWhenHidden: true`** — The webview keeps its state (current frame, autoplay) when you switch tabs.

---

## Coming next: IntelliJ / PyCharm plugin

The IntelliJ version will be a Kotlin plugin using:
- **Tool Window** (`ToolWindowFactory`) docked on the right — same side-panel UX
- **Editor Action** registered via `AnAction` — right-click and keyboard shortcut
- **JCEF Browser** (`JBCefBrowser`) to render the generated HTML natively
- **`EditorFactory.getInstance().getEventMulticaster()`** for line decoration sync
- **`PropertiesComponent`** for persisting the API key

Build with Gradle + IntelliJ Platform Plugin (`org.jetbrains.intellij`). Compatible with IntelliJ IDEA, PyCharm, and any JetBrains IDE.

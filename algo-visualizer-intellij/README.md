# Algorithm Visualizer — IntelliJ Platform Plugin

> **Status: paused.** This plugin is not currently being developed or maintained.
> Active work is happening in [`cursor-extension/`](../cursor-extension/) and
> [`vscode-extension/`](../vscode-extension/). The scaffolded code below is kept
> in the repo as a starting point for whoever picks the IntelliJ port back up.

Kotlin port of the [VS Code extension](../vscode-extension/) for IntelliJ-based IDEs (IntelliJ IDEA, PyCharm).

Select Python code in the editor, run **Visualize Algorithm**, and get an AI-generated interactive step-by-step debugger in a docked tool window on the right. As you step through frames, the corresponding source line is highlighted in the editor.

## Components

```
src/main/
├── kotlin/com/algoviz/
│   ├── AlgoVizToolWindowFactory.kt   Tool window registration + per-project panel holder
│   ├── AlgoVizPanel.kt               JCEF browser + bridge + editor highlighter
│   ├── VisualizeAction.kt            Editor action (Ctrl+Shift+Alt+V)
│   ├── ClaudeClient.kt               java.net.http call to api.anthropic.com/v1/messages
│   ├── PromptBuilder.kt              Kotlin port of vscode-extension/src/promptBuilder.ts
│   ├── AlgoVizConfigurable.kt        Settings UI (Settings → Tools → Algorithm Visualizer)
│   └── AlgoVizSettings.kt            PropertiesComponent-backed settings
└── resources/META-INF/plugin.xml     Extension/action/dependencies registration
```

## Build

### Prerequisites

- **JDK 17+** (IntelliJ Platform 2024.1 requirement; JDK 16 won't work)
- **Gradle 8.x** _only for the first bootstrap_, to generate the wrapper

Install on Windows (no admin):
```powershell
winget install Microsoft.OpenJDK.17
winget install Gradle.Gradle
```

### First-time bootstrap

```bash
gradle wrapper --gradle-version 8.5    # creates gradlew, gradlew.bat, gradle/wrapper/
```

After that, only `./gradlew` is needed — no global Gradle install required.

### Day-to-day

```bash
./gradlew buildPlugin    # → build/distributions/algo-visualizer-intellij-0.1.0.zip
./gradlew runIde         # launch a sandbox IDE with the plugin loaded
```

## Settings

| Key                       | Default               | Purpose                                  |
|---------------------------|-----------------------|------------------------------------------|
| `algoviz.apiKey`          | _empty_               | Anthropic API key — required             |
| `algoviz.model`           | `claude-sonnet-4-6`   | Claude model                             |
| `algoviz.syncEditorCursor`| `true`                | Editor line-highlight follows the panel  |

## Sync model

The generated HTML calls `window.__algoVizNotify(lineNumber)` after every `render()`. `AlgoVizPanel.injectBridge()` inserts a `<script>` that routes those calls through `JBCefJSQuery` into Kotlin, where `syncEditorLine()` moves a `RangeHighlighter` on the current editor.

Keep `PromptBuilder.kt` in sync with `vscode-extension/src/promptBuilder.ts` — the contract (frame model, theming, bridge call) is shared.

# Scaffold the IntelliJ / PyCharm plugin

Create the IntelliJ Platform plugin alongside the VS Code extension. The plugin should live at `../algo-visualizer-intellij/` relative to the VS Code project root.

## Architecture to implement

**Language**: Kotlin
**Build**: Gradle with `org.jetbrains.intellij` plugin

**Key components to create:**

### 1. `build.gradle.kts`
- `intellij { version = "2024.1"; plugins = listOf("python") }`
- `patchPluginXml` with id `com.algoviz`, vendor, description

### 2. `src/main/resources/META-INF/plugin.xml`
- Register `AlgoVizToolWindowFactory` as a tool window (anchor = RIGHT, id = "Algorithm Visualizer")
- Register `VisualizeAction` as an editor action
- Register `AlgoVizConfigurable` for settings (API key, model)

### 3. `src/main/kotlin/.../AlgoVizToolWindowFactory.kt`
- Implements `ToolWindowFactory`
- Creates a `JBCefBrowser` panel
- Exposes `showLoading()`, `showVisualization(html: String)`, `showError(msg: String)` methods

### 4. `src/main/kotlin/.../VisualizeAction.kt`
- Extends `AnAction`
- Gets selected text or full file from `e.getData(CommonDataKeys.EDITOR)`
- Reads API key from `PropertiesComponent`
- Launches a coroutine (via `ApplicationManager.getApplication().executeOnPooledThread`) to call the Claude API
- Injects the VS Code bridge equivalent: appends a `<script>` that uses `CefMessageRouter` to call back into Kotlin when the frame changes

### 5. `src/main/kotlin/.../ClaudeClient.kt`
- Uses `java.net.http.HttpClient` (Java 11+) to POST to `api.anthropic.com/v1/messages`
- Same prompt from `promptBuilder.ts` — port it to a Kotlin string template

### 6. `src/main/kotlin/.../AlgoVizConfigurable.kt`
- Implements `Configurable`
- Text field for API key, dropdown for model
- Stores via `PropertiesComponent.getInstance().setValue(...)`

### 7. Editor line sync
- In the JCEF browser, the injected bridge calls `window.__algoVizNotify(line)` → `CefMessageRouter` → Kotlin handler
- Kotlin handler: `ApplicationManager.getApplication().invokeLater { editor.markupModel.addLineHighlighter(line-1, ...) }`

After scaffolding, confirm the file tree and remind the user to run `./gradlew runIde` to test.

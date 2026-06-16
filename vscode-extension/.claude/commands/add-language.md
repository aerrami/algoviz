# Add support for a new programming language

The argument $ARGUMENTS is the language to add (e.g. "JavaScript", "Java", "C++").

Steps:

1. **package.json** — add the language ID to:
   - `activationEvents`: add `"onLanguage:<id>"`
   - Both keybinding `when` clauses: change `editorLangId == python` to `editorLangId == python || editorLangId == <id>`
   - Both context menu `when` clauses: same change

2. **src/promptBuilder.ts** — update `buildPrompt(code, hint, language?)`:
   - Add an optional `language` parameter (default `'python'`)
   - Replace the hardcoded `python` label on the code fence with the language param
   - Add a language-specific note in the prompt if the syntax highlighting approach differs

3. **src/extension.ts** — pass the document language to `buildPrompt` via `VisualizerPanel.createOrShow`. The language is available as `editor.document.languageId`.

4. **src/VisualizerPanel.ts** — thread the `language` parameter through `_run()` and `_callClaude()` into `buildPrompt()`.

After all edits, run `/build` to confirm no TypeScript errors.

# Package the extension into a .vsix

Build a distributable VS Code extension package.

Steps:
1. Run `npm run compile` first and fix any TypeScript errors.
2. Then run `npm run package` (which calls `vsce package`).
3. Confirm the `.vsix` file was created and show its path and size.
4. Remind the user how to install it: Extensions panel → ⋯ menu → "Install from VSIX…"

# Build the extension

Compile the TypeScript source and report any errors.

Run this command and show the output:

```bash
npm run compile 2>&1
```

If compilation succeeds (exit 0), confirm it and show the files written to `out/`.
If there are errors, analyze them, fix the root cause in the relevant `src/` file, then recompile and confirm success.

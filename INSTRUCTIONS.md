# Sliding window debugger — project instructions

## What this project is
An interactive, self-contained visualizer for the "longest substring without
repeating characters" sliding-window algorithm (LeetCode 3). `index.html` runs
in any browser with no build step and no internet connection. It shows a debug
cursor on the executing Python line, the window pointers, the count hash map,
and `best` at every step.

## How to work in this project
- Treat `index.html` as the source of truth. All logic lives in the inline
  `<script>`; styling is in the inline `<style>` and uses CSS variables that
  adapt to light/dark mode.
- When adding a new algorithm view, keep the same frame model: a `build()`
  function returns an array of step snapshots, each with `left`, `right`,
  `count`, `best`, `primary` (cursor line), `active` (highlighted lines), and a
  `desc` string. `render()` reads one frame; nothing mutates outside `build()`.
- Preserve the design tokens already defined (mono/sans fonts, info = window,
  danger = duplicate). Don't add external dependencies — it must stay offline.

## Ideas to extend (good recurring tasks)
- Add a toggle for the buggy `left = right` reset variant to show where it
  diverges on inputs like `abba`.
- Add sibling pages for related patterns: at-most-K distinct (LC 340), minimum
  window substring (LC 76), find all anagrams (LC 438).
- Add a speed slider for autoplay and keyboard arrow-key stepping.

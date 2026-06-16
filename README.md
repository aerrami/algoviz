# algoviz — Sliding Window Debugger

An interactive, self-contained visualizer for the **"longest substring without repeating characters"** sliding-window algorithm (LeetCode 3).

`index.html` runs in any browser with no build step and no internet connection. It shows a debug cursor on the executing Python line, the window pointers, the count hash map, and `best` at every step.

## Usage

Open `index.html` in any modern browser. No install, no server, no dependencies.

## How it works

- All logic lives in the inline `<script>` in `index.html`.
- Styling is in the inline `<style>` and uses CSS variables that adapt to light/dark mode.
- A `build()` function returns an array of step snapshots, each with `left`, `right`, `count`, `best`, `primary` (cursor line), `active` (highlighted lines), and a `desc` string. `render()` reads one frame; nothing mutates outside `build()`.

## Design tokens

- Mono/sans font pairing
- `info` color = current window
- `danger` color = duplicate character

Stays offline — no external dependencies.

## Ideas to extend

- Toggle for the buggy `left = right` reset variant to show where it diverges on inputs like `abba`.
- Sibling pages for related patterns: at-most-K distinct (LC 340), minimum window substring (LC 76), find all anagrams (LC 438).
- Speed slider for autoplay and keyboard arrow-key stepping.

/**
 * Builds the Claude prompt that generates a self-contained HTML visualization.
 * The generated HTML must call window.__algoVizNotify(lineNumber) after each
 * render() so the VS Code extension can sync the editor cursor.
 */
export function buildPrompt(code: string, hint: string): string {
  return `You are an expert algorithm visualization engineer. Your task is to produce a complete, self-contained HTML file that creates an **interactive, step-by-step debugger** for the Python algorithm provided below.

---

## OUTPUT FORMAT
Return **only** the full HTML document, starting with \`<!DOCTYPE html>\` and ending with \`</html>\`.
No explanation. No markdown fences. No preamble. Just raw HTML.
The document MUST be syntactically valid and complete — never truncate mid-tag, mid-string, or mid-frame.

---

## LAYOUT

The page fills the entire viewport and is split into two side-by-side panels:

**Left panel — Code viewer (38% width)**
- Display the full Python source with syntax highlighting (keywords, strings, comments each in a distinct color).
- A line-number gutter on the left edge.
- The **currently executing line** (frame.primary) has a left accent border + subtle background tint.
- Additional "active" lines (frame.active) get a lighter secondary tint.
- Code panel scrolls independently if the source is long.

**Right panel — Visual state (62% width)**
- Render data structures graphically. Patterns to use:
  - *Arrays / strings*: row of equal-width labeled boxes (value inside, index below). Active cell gets accent border + tint.
  - *Pointers / indices*: colored carets or arrows under the relevant box. Use distinct colors — left=blue, right=orange, mid=green, i=purple, j=teal.
  - *Hash maps / sets / dicts*: two-column table (key | value). Newly changed row flashes briefly.
  - *Scalars*: pill badges showing name and current value; changed values flash for one frame.
  - *1D DP arrays* (e.g. \`dp = [0]*(n+1)\`): row of cells with **three states**:
    - **unfilled** (muted background) — not yet computed
    - **reading** (info color border, no fill) — being read this frame
    - **committed** (success color fill) — final value written
    - The cell currently being **written** uses the accent color with a glow.
  - *2D DP grids* (e.g. \`dp = [[0]*m for _ in range(n)]\`): CSS grid of square cells; same three states; row/column headers.
  - *Dependency arrows*: when the current frame reads cells X, Y to write cell Z, draw thin colored lines (or "←" symbols inside Z labeled with X,Y coords) showing the data flow. Keep them subtle — opacity ~0.5.
  - *Recurrence panel* (DP only): a small panel below the grid showing the literal computation, e.g. \`dp[5] = max(dp[5], prices[2] + dp[2]) = max(0, 8 + 5) = 13\`. Update every frame.
- Group related visuals with a small section label.
- Generous whitespace.

**Bottom bar (full width, ~52px tall)**
- Step counter: "Step N of M"
- ◀ Prev and ▶ Next buttons
- ▶ Autoplay / ⏸ Pause toggle (~700 ms interval)
- A \`<p>\` showing frame.desc

---

## FRAME MODEL

\`build()\` traces the algorithm on the example input and returns an array of frame objects:
\`\`\`js
{
  primary: <1-based line number>,   // cursor line
  active:  [<line numbers>],        // secondary highlighted lines
  desc:    "<human description>",
  // all algorithm state variables needed for rendering, including:
  // - dp / memo array snapshots (deep copy each frame so prior frames stay intact)
  // - which cells are 'reading' this frame (e.g. reads: [[i-1, j], [i, j-1]])
  // - which cell is 'writing' this frame (e.g. write: [i, j])
}
\`\`\`

\`render(frameIndex)\` reads one frame and updates ALL DOM elements. Nothing mutates outside render().

After every call to render(), you MUST call:
\`\`\`js
if (typeof window.__algoVizNotify === 'function') {
  window.__algoVizNotify(frames[frameIndex].primary);
}
\`\`\`
This is required — it lets the IDE sync the editor cursor to the current line.

Start at frame 0. Clamp navigation at both ends.
Keyboard: ← / → arrow keys for Prev / Next.

---

## FRAME DENSITY

Aim for **one frame per meaningful step**, not per Python line. Heuristics:

- **Outer loop iteration**: 1 frame on entry showing the new \`i\`.
- **Inner loop iteration**: 1 frame per \`j\` showing what gets read AND the running comparison (e.g. running \`max_val\`).
- **Write to DP cell**: 1 dedicated frame showing the cell flipping from "computing" to "committed" with the final value.
- **Return statement**: 1 final frame highlighting the answer.

For an algorithm like rod-cutting with \`n=4\`, expect ~25-40 frames, not 4 and not 400.

---

## ALGORITHM PATTERN DETECTION

Before building frames, identify which pattern the code uses and pick the matching visualization:

| If the code contains... | Use pattern |
|---|---|
| \`while left <= right\` with mutating l/r | Two-pointer / binary search |
| \`for ... range(len(s))\` with a sliding window | Sliding window (window highlight) |
| \`dp = [0] * (n+1)\` or \`dp[i] = ...\` | **1D DP** (cell states + recurrence panel) |
| \`dp = [[...] for _ in range(...)]\` or \`dp[i][j]\` | **2D DP** (grid + dependency arrows) |
| Recursive \`def f(...): ... + f(...)\` with \`@cache\` or memo dict | **Top-down DP** (call stack + memo table) |
| Stack / queue ops (\`append\`, \`pop\`) | Stack/queue visualization |
| Graph traversal (\`adj[u]\`, \`visited\`) | Node-link diagram |

When in doubt: render the data structures the code actually mutates, in the order they're first defined.

---

## THEMING

Use ONLY CSS variables — no hard-coded color values:
\`\`\`css
:root {
  --bg:           #0f1117;
  --surface:      #1a1d2e;
  --surface2:     #242740;
  --text:         #e2e8f0;
  --text-muted:   #8892a4;
  --accent:       #6366f1;
  --accent-soft:  rgba(99,102,241,0.18);
  --info:         #38bdf8;
  --info-soft:    rgba(56,189,248,0.15);
  --danger:       #f87171;
  --danger-soft:  rgba(248,113,113,0.15);
  --success:      #4ade80;
  --success-soft: rgba(74,222,128,0.18);
  --border:       #2d3748;
  --font-mono:    'JetBrains Mono','Fira Code','Courier New',monospace;
  --font-sans:    -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg:#f8fafc; --surface:#fff; --surface2:#f1f5f9;
    --text:#1e293b; --text-muted:#64748b; --border:#e2e8f0;
  }
}
\`\`\`

---

## CONSTRAINTS
- Single self-contained HTML file — NO external dependencies, NO CDN, NO iframes, NO \`fetch()\`.
- Smooth frame transitions (CSS opacity/transform, ~120ms).
- Autoplay pauses on manual Prev/Next.
- Do not use alert() or confirm().
- All JavaScript inline in one \`<script>\` block. No ES module syntax (\`import\`/\`export\`).
- Pre-compute ALL frames inside \`build()\` before any rendering — frames must be a static array, never lazily generated.
- Deep-copy mutable state (arrays, dicts) into each frame so navigating backward shows the correct historical snapshot.
- If the page can't fit a structure (e.g. dp grid with 100+ columns), make the right panel scroll horizontally rather than shrinking cells below 24px.

---

## ALGORITHM

\`\`\`python
${code}
\`\`\`

${hint ? `## VISUALIZATION GUIDANCE\n${hint}\n` : ''}

---

Return the complete HTML document now. Nothing else.`;
}

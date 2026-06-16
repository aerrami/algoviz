/**
 * Builds the Claude prompt that generates a self-contained HTML visualization.
 * The generated HTML must call window.__algoVizNotify(lineNumber) after each
 * render() so the VS Code extension can sync the editor cursor.
 */
export function buildPrompt(code: string, hint: string): string {
  return `You are an expert algorithm visualization engineer. Your task is to produce a complete, self-contained HTML file that creates an **interactive, step-by-step debugger** for the Python algorithm provided below.

---

## OUTPUT FORMAT
Return **only** the full HTML document, starting with \`<!DOCTYPE html>\`.
No explanation. No markdown fences. No preamble. Just raw HTML.

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
- Render data structures graphically. Required examples:
  - *Arrays / strings*: row of equal-width labeled boxes (value inside, index below). Active cell gets accent border + tint.
  - *Pointers / indices*: colored carets or arrows under the relevant box. Use distinct colors — left=blue, right=orange, mid=green, i=purple, j=teal.
  - *Hash maps / sets / dicts*: two-column table (key | value). Newly changed row flashes briefly.
  - *Scalars*: pill badges showing name and current value; changed values flash for one frame.
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
  // all algorithm state variables needed for rendering
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
- Single self-contained HTML file — NO external dependencies, NO CDN, NO iframes.
- Smooth frame transitions (CSS opacity/transform, ~120ms).
- Autoplay pauses on manual Prev/Next.
- Do not use alert() or confirm().

---

## ALGORITHM

\`\`\`python
${code}
\`\`\`

${hint ? `## VISUALIZATION GUIDANCE\n${hint}\n` : ''}

---

Return the complete HTML document now. Nothing else.`;
}

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

The goal is to convey what the state **means**, not just its shape. Before placing anything, ask: *what does this variable represent, and what visual makes that intuitive at a glance?* Build that — invent new visuals when none below fit.

Visual toolkit (examples, not an exhaustive list):
- *Arrays / strings*: row of equal-width labeled boxes (value inside, index below). Active cell gets accent border + tint.
- *Pointers / indices*: colored carets or arrows under the relevant box. Use distinct colors — left=blue, right=orange, mid=green, i=purple, j=teal.
- *Hash maps / sets / dicts*: two-column table (key | value). Newly changed row flashes briefly.
- *Scalars*: pill badges showing name and current value; changed values flash for one frame.
- *1D DP arrays* (e.g. \`dp = [0]*(n+1)\`): row of cells with **three states** — **unfilled** (muted background, not yet computed), **reading** (info color border, no fill, being read this frame), **committed** (success color fill, final value written). The cell currently being **written** uses the accent color with a glow.
- *2D DP grids* (e.g. \`dp = [[0]*m for _ in range(n)]\`): CSS grid of square cells; same three states; row/column headers.
- *Dependency arrows*: when the current frame reads cells X, Y to write cell Z, draw thin colored lines (or "←" symbols inside Z labeled with X,Y coords) showing the data flow. Keep them subtle — opacity ~0.5.
- *Recurrence panel* (DP only): a small panel below the grid showing the literal computation, e.g. \`dp[5] = max(dp[5], prices[2] + dp[2]) = max(0, 8 + 5) = 13\`. Update every frame.
- *2D coordinates / spatial data* (points, cities, particles): inline SVG canvas; points as circles, active point in accent color, candidates faded. Keep aspect ratio; auto-fit the bounding box with ~10% padding.
- *Paths, tours, polylines* (TSP tour, shortest path, convex hull edges): SVG \`<polyline>\` over the canvas; animate as edges are added or swapped; previous tour shown faded behind the current.
- *Edge-weight / distance matrix*: symmetric table with shaded cells (darker = larger weight); highlight the row/column of the currently considered edge.
- *Subset / bitmask state*: row of n small cells, one per bit (filled = in set). Do **not** render \`2^n\` as a grid axis — render the bits, not the integer.
- *Permutations / orderings*: numbered tokens in a row; swaps animate as position interchanges.
- *Graphs* (small, ≤20 nodes): node-link diagram with simple radial or force-directed placement. Edges thicken when traversed; visited nodes flip color.
- *Trees / recursion stacks*: indented call list (top of stack on top) **or** an SVG node-link tree if branching matters. Show return values inline when a frame pops.
- *Heaps / priority queues*: tree view top-down (root above), with the array form shown as a row below.
- *Intervals / ranges*: stacked horizontal bars on a shared numeric axis.
- *Score / probability over time* (annealing, GA, gradient descent): mini sparkline that updates per frame.

Group related visuals with a small section label. Generous whitespace.

When nothing in the toolkit fits, invent something matched to the data's meaning. The toolkit shows the *style* (SVG, CSS grid, three-state cells, faded history, accent glow on the active item) — apply the same style to a new shape.

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

Aim for **one frame per meaningful state change**, not per Python line. A "meaningful change" is any moment a viewer would want to pause and inspect — a new candidate considered, a value committed, a branch pruned, an improvement accepted.

Heuristics across algorithm shapes:
- **Loop iteration**: 1 frame on entry showing the new index/value. Inner loops: 1 frame per iteration showing what gets read AND the running comparison (e.g. running \`max_val\`).
- **DP cell write**: 1 dedicated frame showing the cell flipping from "computing" to "committed" with the final value.
- **Recursive call**: 1 frame on call entry (push to stack), 1 on return (pop, show return value). Skip trivial base cases if there are many.
- **Permutation / tour update**: 1 frame per swap or per accepted neighbor.
- **Iterative refinement** (annealing, 2-opt, gradient descent): 1 frame per accepted move; collapse rejected proposals into a running count unless the rejection itself is instructive.
- **Branch & bound**: 1 frame per branch entry, plus 1 per prune showing the bound that caused it.
- **Return statement**: 1 final frame highlighting the answer.

Target ~25–80 frames for typical inputs. Bias toward fewer-but-richer frames over many trivial ones — combine reads of the same cell within one expression into a single frame.

---

## SEMANTIC ANALYSIS (do this before writing any code)

Algorithms are too varied for a fixed pattern catalog. Reason from the code, not from a checklist.

**Step 1 — classify the meaning of each variable, not its Python type.**
A list of \`(x, y)\` tuples is structurally a list of pairs, but **semantically** it's a 2D point cloud — render it on a canvas, not as a row of boxes. Ask of every state variable: is it a scalar, a sequence, a set, a mapping, a 2D coordinate, a graph edge with weight, a subset/bitmask, a permutation or tour, a tree, a recursion frame, an interval, a probability, something else?

**Step 2 — pick or invent a visual matched to the semantics.**
Use the visual toolkit above as a starting palette. If the data's meaning isn't in the list, invent a new visual in the same style (SVG canvas, CSS grid cells with three states, faded history layers, accent glow on the active item).

**Step 3 — identify the loop structure** (what advances per frame) and the **invariant being maintained** (what \`frame.desc\` should explain). The visualization should make the invariant visible — e.g. "all cells left of \`right\` satisfy the predicate," "the current tour visits every city in \`mask\`," "the heap top is the next-best candidate."

Common pairings (examples, not rules — many algorithms fall outside these):

| Code shape | Likely visualization |
|---|---|
| \`while left <= right\` with mutating l/r | Two-pointer / binary search bar |
| Sliding window over a sequence | Window highlight on the sequence |
| \`dp = [0]*(n+1)\`, \`dp[i] = ...\` | 1D DP row with cell states + recurrence panel |
| \`dp = [[...] for _ in range(...)]\` | 2D DP grid + dependency arrows |
| Recursive \`f(...)\` with \`@cache\` / memo | Call stack + memo table |
| Stack / queue ops (\`append\`, \`pop\`) | Stack/queue visualization |
| \`adj[u]\`, \`visited\` | Node-link diagram |
| Points/coords with distances (TSP, k-means, convex hull) | Canvas + polyline/edges + distance matrix |
| Bitmask DP (\`dp[mask][i]\`) | Subset row of n cells, **not** a 2^n axis |
| Permutation search / backtracking over orderings | Token row with swap animation + decision tree |
| Iterative refinement (annealing, 2-opt, gradient descent) | Current solution + score sparkline + history fade |
| Tree algorithms (DFS, segment tree, trie) | SVG tree with traversal highlighted |

If nothing matches: name the algorithm's central abstraction in one sentence ("a tour over n cities," "a search over subsets of size k," "a partition of an array into runs") and design the visual around that abstraction.

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

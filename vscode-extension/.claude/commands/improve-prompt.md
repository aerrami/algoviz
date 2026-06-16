# Improve the visualization prompt

The file `src/promptBuilder.ts` controls the quality of every generated visualization.
The argument $ARGUMENTS describes what to improve.

Read `src/promptBuilder.ts` in full, then make targeted edits based on: $ARGUMENTS

Common improvement areas:
- **Better pointer rendering** — add explicit color assignments (left=blue, right=orange, mid=green, i=purple) if not already specified
- **Finer frame granularity** — instruct Claude to emit a frame for each sub-step inside loop bodies
- **New data structure support** — add rendering guidance for graphs (adjacency lists as node circles + edges), trees (box-and-pointer), stacks/queues (vertical list)
- **Smoother animations** — specify CSS transition durations and easing
- **Cleaner descriptions** — ask for concise imperative-voice `desc` strings ("Move left pointer right" not "The left pointer is being moved to the right")

After editing, confirm the change and suggest testing it with the `/build` command followed by a manual test run.

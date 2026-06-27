# Data platform map — design

A new standalone "What They Mean" demo: **What is a data platform?** It draws a
labeled **map** of the journey one piece of data takes from the outside world to
a person's screen, and lets the viewer watch a single real fact travel the whole
path, changing form at every stop.

Concept framing chosen by the user: **data platform map** — an architecture tour
of every box and how they connect, not a refinement tutorial. It complements the
existing focused `etl` demo (which animates only bronze → silver → store) by
zooming out to the full path.

## The path

```
connectors → bronze → normalize → silver → db → gold → ┬→ backend ┐
                                                        └→ agent   ┴→ app
```

Nine boxes. The bronze/silver/gold boxes are literally colored bronze/silver/
gold. The only fork in the map is at the end: **gold** feeds **both** a backend
and an agent, and both feed the **app**.

## The thread: one fact, nine costumes ("shown, not told")

A single concrete fact — *a coffee sale* — appears at every box in the form it
takes there. This is the demo's payload and is the heart of "shown rather than
told": the viewer sees the same fact get refined step by step.

| Box | Plain-language role | The coffee sale, here |
|-----|---------------------|------------------------|
| Connectors | Programs that go out and fetch data from outside apps, files, and APIs | pulls a raw receipt from the till's API |
| Bronze 🥉 | A copy of everything, dumped exactly as it arrived — kept just in case | `{"itm":"iced coffee ","amt":"3.75","ts":1719...}` |
| Normalize | Force mismatched feeds into one shared shape | maps `itm→item`, `amt→price` |
| Silver 🥈 | Tidy, trustworthy rows — one per thing | `Iced Coffee · 2026-06-26 · 3.75` |
| Database | The shared store the clean rows live in | one row among thousands |
| Gold 🥇 | Business-ready answers: totals, top sellers | `Iced Coffee — 14 sold today` |
| Backend | A program that serves those answers to apps | `{ "top":"Iced Coffee","count":14 }` |
| Agent | An AI that reads the same gold data to answer in words | "Your best seller today is Iced Coffee." |
| App | What the person actually sees | ☕ a "Top seller" card |

These nine entries (id, name, emoji/icon, layer color, one-line role, and a
`snapshot` value to render) live in `data.js` so the trace and detail panel are
data-driven, mirroring how `etl/data.js` feeds the etl demo.

## Layout & interaction — a node-graph component diagram

Deliberately NOT the etl demo's card-row. This is a flow-editor (n8n / Node-RED)
style **component diagram**, light/technical theme:

- A dot-grid **canvas** (a flow-editor viewport) holds the blocks. Everything is
  laid out in one fixed coordinate space (an SVG `viewBox`); the canvas keeps
  that aspect ratio, so the wire layer and the HTML node layer never drift.
- **Nodes** are icon **badges** (a rounded square holding a Lucide line icon in
  the node's accent colour) with the name floating underneath and a layer chip
  for the metals — deliberately NOT cards. Input/output **ports** sit exactly on
  the badge edges where the wires meet. The coffee sale's snapshot is not shown
  on the badge; it lives only in the explanation card at the bottom (and rides
  the wire as a packet during a run).
- **Wires** are SVG cubic beziers from each block's output port to the next
  block's input port, tinted by the block they leave, with arrowheads. The fork
  is real branching geometry: two wires leave gold (to backend, to agent) and
  two converge on the app.
- **▶ Run the data** — lights the blocks in order (timed `setTimeout` cadence);
  the wire currently carrying data gets a flowing dashed stroke, and a glowing
  **packet pill labelled with the data's current form** ("raw JSON", "a clean
  row", …) glides along that wire, its position measured straight off the SVG
  path so it follows the exact curve. A live caption names the current block.
- **Reset** — returns to the idle state.
- **Click any block** — pins its fuller plain-language explanation and snapshot
  in a detail panel below the canvas. Selection is independent of the run.
- On narrow screens the canvas pans horizontally (a real flow editor), keeping
  node text legible rather than shrinking it.

## Conventions (same as every other demo)

- Standalone folder `web/platform/` owning `index.html`, `app.js`, `styles.css`,
  `data.js`. Import map points to `../vendor/...`. Loads only its own
  `styles.css`. Back link to `../`.
- Sets `window.__APP = { ready: true, phase, selected }` once rendered, so e2e
  tests can wait on it. `phase` tracks the trace (`idle` → per-box → `done`);
  `selected` is the clicked box id (or null).
- A new `<a class="card" href="platform/">` card added to `web/index.html`.
- `tests/test_e2e_platform.py` modelled on `tests/test_e2e_etl.py`: the nine
  boxes render with the right names and bronze/silver/gold colors; the fork
  (backend + agent → app) is present; Trace lights boxes through to the app
  card; clicking a box shows its explanation; Reset returns to idle. Each test
  saves a screenshot into `test-results/`.

## Out of scope (YAGNI)

- No real backend/agent/LLM calls — the agent line is canned text, exactly the
  kind of static fixture the api demo already uses.
- No editing of the data by the user; the coffee-sale fact is fixed.
- No changes to the existing `etl` demo or its tests.

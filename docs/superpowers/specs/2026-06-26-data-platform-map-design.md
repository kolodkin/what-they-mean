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

## Layout & interaction

- A horizontal map of box cards connected by arrows; it wraps on narrow widths.
  The end fork is drawn so backend and agent sit as two parallel boxes that both
  point into the final app box.
- **▶ Trace a piece of data** — sends a glowing token along the path, lighting
  each box in order (timed, like the etl demo's staged `setTimeout` cadence) and
  surfacing each box's one-line caption as it arrives. It ends on the app box
  showing the finished card.
- **Reset** — returns to the idle state.
- **Click any box** — pins that box's fuller plain-language explanation and its
  data snapshot in a detail panel below the map. Clicking during/after a trace
  is fine; selection is independent of the trace.

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

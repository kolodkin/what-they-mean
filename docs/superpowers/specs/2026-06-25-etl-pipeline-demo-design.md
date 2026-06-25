# ETL / Data Pipeline demo — design

**Concept #3 for "What They Mean".** Explains a *data pipeline* (ETL —
Extract, Transform, Load) to a non-developer, shown rather than told.

## Goal

One screen. A horizontal pipeline of three labeled stages — **Extract →
Transform → Load** — with a **Run** button that pushes a small batch of messy
data through, pausing at each stage so the viewer sees what each stage does.
The cleaned rows land in a **database icon** (🗄️, the same one the database
demo uses), reinforcing that a pipeline *fills a database*.

This chains the three demos: the **pipeline fills** the database, the
**database stores**, the **API serves**.

## The data

A small, deliberately *messy* source — a raw export of new recipes — so the
Transform step has visible work to do. Five source rows with assorted problems:

- extra whitespace (`"  Mac & Cheese "`)
- inconsistent casing (`"mac & CHEESE"`)
- mixed date formats (`"3/2/26"` vs `"2026-02-04"`)
- a blank / junk row (dropped during transform)
- price stored as a string with a currency symbol (`"$3.50"`)

After transform: 4 clean rows (junk row removed), normalized.

## The three stages

Each stage is a box that shows its data state and a one-line description.

1. **Extract** — pulls raw rows out of the messy source, as-is, problems and
   all. Shows "5 rows in".
2. **Transform** — the interesting stage. Each cleaning rule lights up as it
   applies: *trim spaces · fix capitalization · normalize dates · drop empty
   rows · parse price to a number*. Rows visibly change; the junk row drops
   (→ 4 rows).
3. **Load** — cleaned rows fly one by one into a 🗄️ database icon; a counter
   ticks up to 4 and a tidy destination table renders beneath the icon.

## Interaction

- **Run** animates the batch left→right with small staged delays so each stage
  is legible.
- **Reset** re-arms the pipeline to its initial (pre-run) state.
- A caption gives the one-liner: *a data pipeline moves data from where it's
  made to where it's used, fixing it on the way.*

## Plumbing (matches house style)

New standalone folder `web/etl/`, sharing only the vendored deps:

```
web/etl/
  index.html   import map -> ../vendor/...  + back link to ../
  app.js       Preact app for the pipeline
  styles.css   this demo's styles only
  data.js      raw source rows + the transform rules + a runPipeline() helper
```

- `data.js` exports the raw rows, an ordered list of named transform rules, and
  a `runPipeline()` that returns `{ extracted, transformed, loaded }` so the app
  (and tests) render from one source of truth.
- Add a **Concept #3** card to `web/index.html`.
- Set `window.__APP = { ready: true }` once rendered, per project convention.
- Add `tests/test_e2e_etl.py` modeled on `tests/test_e2e_db.py`: wait on
  `window.__APP.ready`, click **Run**, assert the destination table renders the
  cleaned rows (e.g. `Mac & Cheese`, price `3.50`, normalized date) and that the
  junk row is absent.

## Out of scope (YAGNI)

- No real file upload, no backend, no actual CSV parsing library — the "source"
  is inline data in `data.js`.
- No configurable rules / no editing the pipeline — it runs one fixed batch.

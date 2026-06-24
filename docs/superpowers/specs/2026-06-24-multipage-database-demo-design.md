# Design: multi-page structure + database demo

**Date:** 2026-06-24
**Status:** Approved

## Goal

The site currently has one concept demo ("What is an API?") rendered by a single
Preact app. Add a second concept ("What is a database?") and a landing menu, while
keeping the project's no-build philosophy. Each demo must be a **standalone module**
with minimum code and maximum decoupling.

## Decision: multi-page (folder = page), not a JS router

The site deploys to GitHub Pages under a project path (`/what-they-mean/`). A JS
router would need the SPA-on-Pages 404 redirect trick, `replaceState`, base-path
math, a `serve.py` SPA fallback, and shadow DOM to recover per-demo CSS isolation —
all to fight the fact that Pages is file-based.

A multi-page structure makes the filesystem the router and gives, for free:
native clean URLs, working deep-links / refresh / back-forward, total decoupling
(demos never share a runtime or a document), and per-page CSS scoping (each page
loads only its own stylesheet, so nothing can leak — no shadow DOM needed).

The only thing lost is instant in-place transitions (there's a full page reload
between demos). A concept-explainer with 2–3 demos doesn't need that. The only cost
is an ~8-line import map duplicated per page — the price of standalone-ness.

## File structure

```
web/
  index.html          the menu — plain static HTML, cards linking to api/ and db/
  styles.css          menu styles only
  vendor/             shared vendored deps (preact, preact-hooks, htm) — unchanged
  api/
    index.html        import map -> ../vendor/...
    app.js            the existing API demo (moved here, ~unchanged)
    styles.css        the existing API demo styles (moved here)
    recipe.json       the "endpoint" (already at web/api/recipe.json); fetched as ./recipe.json
  db/
    index.html        import map -> ../vendor/...
    app.js            the database demo
    styles.css        its own styles
    data.js           the 3 tables as inline data
CLAUDE.md             project guide (repo root)
```

- Menu links use `href="api/"` / `href="db/"`; demo back-links use `href="../"`.
  All relative. GitHub Pages serves `/what-they-mean/api/` -> `api/index.html`
  natively; `SimpleHTTPRequestHandler` does the same locally for directory URLs.
- The API endpoint stays at `web/api/recipe.json`. With the demo page now at
  `web/api/index.html`, the fetch URL becomes `./recipe.json` (co-located).
- Each page loads only its own `styles.css` -> CSS cannot leak between demos.
- `serve.py`, `conftest.py`, and `.github/workflows/pages.yml` need **no changes**
  (the workflow uploads the whole `web/` directory wholesale).

## Menu (`web/index.html`)

Plain static HTML (no Preact, no JS) — minimum code. Centered project title +
subtitle and two cards:

- "What is an API?" -> `api/` with a one-line teaser
- "What is a database?" -> `db/` with a one-line teaser

Built so adding demo #3 is: drop a folder + add a card.

## Database demo (`web/db/`)

Cooking theme, mirrors the API demo's stacked split. A Preact app like the API
demo. Data is defined inline in `data.js`; the query result is **computed in JS
from that data** (a real join), so the result is genuinely derived, not hand-faked.

Three tables (`data.js`):

- `recipes(id, name, minutes, serves)`
- `ingredients(id, name, unit)`
- `recipe_ingredients(recipe_id, ingredient_id, amount)` — junction table

Seed rows: "Fluffy Buttermilk Pancakes" and "Overnight Oats" with a handful of
ingredients each, enough for a multi-row JOIN result.

**Top pane — "The spreadsheet"** (what a person knows): an Excel-like workbook
with three sheet tabs (`recipes`, `ingredients`, `recipe_ingredients`); the active
sheet is drawn as a real cell grid (column headers + rows).

**Bottom pane — "The database"** (what's underneath):

- A mini **ERD** of the three tables — each a box of columns with PK/FK markers,
  with lines showing `recipes 1—∞ recipe_ingredients ∞—1 ingredients`.
- One static **SQL JOIN** query and its **result table**, e.g.:
  ```sql
  SELECT r.name, i.name AS ingredient, ri.amount
  FROM recipes r
  JOIN recipe_ingredients ri ON ri.recipe_id = r.id
  JOIN ingredients i ON i.id = ri.ingredient_id
  WHERE r.name = 'Fluffy Buttermilk Pancakes';
  ```
  The result rows are computed in JS by joining the inline data.
- A caption delivering the message: *a database is a spreadsheet that many
  computers can read and write at the same time, and can be asked precise questions
  (queries) instead of scrolled.*
- A small row of device glyphs (laptop / phone / server -> DB) conveying concurrent
  multi-machine access.

**Hover-linking** (like the API demo): three table colors. Hovering a sheet tab
glows its matching ERD table and dims the others, and vice-versa.

## CLAUDE.md (repo root)

Encodes the conventions so future demos follow the same shape:

- No-build philosophy: plain ES modules + import map, deps vendored by `vendor.sh`.
- The **standalone-demo rule**: each demo is one folder (`index.html` + `app.js` +
  `styles.css` + optional data) that shares nothing but the vendored deps.
- "How to add a demo": copy a demo folder, adjust its content, add a card to the
  menu. Nothing else to wire up.
- Run / test / deploy commands.

## Testing

Per-demo test files for decoupling:

- `tests/test_e2e_menu.py` — menu renders both cards; clicking each navigates to
  `/api/` and `/db/`.
- `tests/test_e2e_api.py` — the existing API-demo assertions, now loading `/api/`.
- `tests/test_e2e_db.py` — DB demo shows 3 sheet tabs, an ERD with 3 tables, the
  JOIN result rows, and hover-linking glows the matching table.
- `tests/test_server.py` — menu page served and contains links to both demos;
  `/api/recipe.json` shape test unchanged.

Each demo exposes a small readiness signal (e.g. `window.__APP`) for tests to wait
on, as the current API demo already does.

## Out of scope (YAGNI)

No router, no bundler, no real SQL engine, no runnable query button, no backend,
no new runtime dependencies.

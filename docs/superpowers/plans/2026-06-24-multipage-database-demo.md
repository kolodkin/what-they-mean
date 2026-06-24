# Multi-page Structure + Database Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single-page API demo into a multi-page site with a menu landing page and add a standalone "What is a database?" demo.

**Architecture:** The filesystem is the router — each demo is a self-contained folder (`index.html` + `app.js` + `styles.css` + optional data) under `web/`, sharing only vendored deps. A plain static HTML menu links to each demo. No bundler, no JS router.

**Tech Stack:** Plain ES modules + import map, Preact + htm (vendored), Python static server, pytest + Playwright.

## Global Constraints

- No build step / no bundler. Bare specifiers resolved by an inline import map per page.
- Demo pages live one level deep, so import maps point to `../vendor/...`.
- Each page loads only its own `styles.css`; no cross-demo CSS.
- Vendored deps unchanged (`vendor.sh` populates `web/vendor/`).
- All links relative (`href="api/"`, `href="../"`) so GitHub Pages project-path hosting works.
- `serve.py`, `conftest.py`, `vendor.sh`, `.github/workflows/pages.yml` need NO changes.
- Each demo exposes `window.__APP = { ready: true, ... }` for test synchronization.

---

### Task 1: Restructure the API demo into `web/api/`

**Files:**
- Move: `web/app.js` → `web/api/app.js`
- Move: `web/styles.css` → `web/api/styles.css`
- Create: `web/api/index.html`
- Keep: `web/api/recipe.json` (already there)
- Modify: `web/api/app.js` (API_URL + back-link readiness)
- Rename test: `tests/test_e2e.py` → `tests/test_e2e_api.py` (load `/api/`)

**Interfaces:**
- Produces: `/api/` route serving the API demo; fetch URL `./recipe.json`; `window.__APP.ready`.

- [ ] **Step 1: Move files with git**

```bash
git mv web/app.js web/api/app.js
git mv web/styles.css web/api/styles.css
git mv tests/test_e2e.py tests/test_e2e_api.py
```

- [ ] **Step 2: Create `web/api/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>What They Mean — APIs</title>
  <link rel="stylesheet" href="./styles.css" />
  <script type="importmap">
  {
    "imports": {
      "preact": "../vendor/preact.module.js",
      "preact/hooks": "../vendor/preact-hooks.module.js",
      "htm": "../vendor/htm.module.js"
    }
  }
  </script>
</head>
<body>
  <a class="back" href="../">← All concepts</a>
  <div id="app"></div>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Update `web/api/app.js`** — change the endpoint (now co-located):

```js
const API_URL = "./recipe.json";
```

(everything else unchanged)

- [ ] **Step 4: Add `.back` styles to `web/api/styles.css`** (append):

```css
/* --- back link ----------------------------------------------------------- */
.back {
  position: absolute;
  top: 12px;
  left: 16px;
  z-index: 10;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
  background: rgba(255, 255, 255, 0.8);
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
}
.back:hover { background: #fff; }
```

- [ ] **Step 5: Update `tests/test_e2e_api.py`** — load `/api/` and fix the URL assertion. Change the fixture goto and the http-line assertion:

```python
@pytest.fixture()
def app(page: Page, server_url: str):
    page.set_viewport_size({"width": 1100, "height": 800})
    page.goto(server_url + "/api/")
    _wait_ready(page)
    return page
```

And in `test_api_pane_shows_request_and_response`, change the path assertion:

```python
    expect(app.locator(".http-line")).to_contain_text("recipe.json")
```

- [ ] **Step 6: Run the API e2e tests**

Run: `python -m pytest tests/test_e2e_api.py -v`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add web/api tests/test_e2e_api.py
git commit -m "refactor: move API demo into web/api/ folder"
```

---

### Task 2: Menu landing page

**Files:**
- Create: `web/index.html` (overwrite — was the API demo, now the menu)
- Create: `web/styles.css` (menu styles)
- Create: `tests/test_e2e_menu.py`
- Modify: `tests/test_server.py` (index test now checks the menu)

**Interfaces:**
- Produces: `/` menu with `a.card[href="api/"]` and `a.card[href="db/"]`.

- [ ] **Step 1: Write failing menu e2e test** `tests/test_e2e_menu.py`:

```python
"""End-to-end tests for the landing menu."""
import os

from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


def test_menu_lists_both_demos(page: Page, server_url: str):
    page.set_viewport_size({"width": 1100, "height": 800})
    page.goto(server_url + "/")
    expect(page.locator(".card")).to_have_count(2)
    expect(page.locator('.card[href="api/"]')).to_contain_text("API")
    expect(page.locator('.card[href="db/"]')).to_contain_text("database")
    page.screenshot(path=os.path.join(SHOTS, "00-menu.png"))


def test_menu_card_opens_api_demo(page: Page, server_url: str):
    page.goto(server_url + "/")
    page.locator('.card[href="api/"]').click()
    expect(page).to_have_url(server_url + "/api/")


def test_menu_card_opens_db_demo(page: Page, server_url: str):
    page.goto(server_url + "/")
    page.locator('.card[href="db/"]').click()
    expect(page).to_have_url(server_url + "/db/")
```

- [ ] **Step 2: Run to verify it fails**

Run: `python -m pytest tests/test_e2e_menu.py -v`
Expected: FAIL (cards not found / db/ 404)

- [ ] **Step 3: Create `web/index.html`** (the menu):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>What They Mean</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <main class="menu">
    <header class="menu-head">
      <h1>What They Mean</h1>
      <p>Tech concepts for non-developers — one idea per screen, shown rather than told.</p>
    </header>
    <nav class="cards">
      <a class="card" href="api/">
        <span class="card-tag">Concept #1</span>
        <h2>What is an API?</h2>
        <p>The pretty app is just data, drawn nicely — see the request and the raw JSON underneath.</p>
        <span class="card-go">Open demo →</span>
      </a>
      <a class="card" href="db/">
        <span class="card-tag">Concept #2</span>
        <h2>What is a database?</h2>
        <p>A spreadsheet many machines share at once — several sheets, and the power to ask precise questions.</p>
        <span class="card-go">Open demo →</span>
      </a>
    </nav>
  </main>
</body>
</html>
```

- [ ] **Step 4: Create `web/styles.css`** (menu styles):

```css
:root {
  --bg: #f1f5f9;
  --ink: #0f172a;
  --muted: #64748b;
  --line: #e2e8f0;
  --accent: #2563eb;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body { color: var(--ink); background: var(--bg); }

.menu {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 36px;
  padding: 40px 20px;
}
.menu-head { text-align: center; max-width: 620px; }
.menu-head h1 { margin: 0 0 8px; font-size: 40px; letter-spacing: -0.02em; }
.menu-head p { margin: 0; color: var(--muted); font-size: 17px; }

.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 320px));
  gap: 22px;
}
@media (max-width: 720px) { .cards { grid-template-columns: 1fr; } }

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s, box-shadow 0.15s;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
}
.card-tag {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}
.card h2 { margin: 0; font-size: 22px; }
.card p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; flex: 1; }
.card-go { font-size: 14px; font-weight: 700; color: var(--accent); }
```

- [ ] **Step 5: Update `tests/test_server.py`** — the index test now checks the menu. Replace `test_index_served`:

```python
def test_index_served(server_url):
    status, ctype, body = _get(server_url + "/index.html")
    assert status == 200
    assert "text/html" in ctype
    assert b'href="api/"' in body
    assert b'href="db/"' in body
```

(`test_recipe_endpoint_shape` stays — `/api/recipe.json` is unchanged.)

- [ ] **Step 6: Run menu + server tests**

Run: `python -m pytest tests/test_e2e_menu.py tests/test_server.py -v`
Expected: PASS (test_e2e_db nav assertion for db/ will pass once Task 4 lands; if running now, `test_menu_card_opens_db_demo` may 404 — that's fine until Task 4. Run the others.)

Run now: `python -m pytest tests/test_e2e_menu.py::test_menu_lists_both_demos tests/test_e2e_menu.py::test_menu_card_opens_api_demo tests/test_server.py -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add web/index.html web/styles.css tests/test_e2e_menu.py tests/test_server.py
git commit -m "feat: add landing menu page"
```

---

### Task 3: Database demo data + query logic

**Files:**
- Create: `web/db/data.js`

**Interfaces:**
- Produces: `SCHEMA` (ordered table metadata + rows), `runQuery()` returning the JOIN result rows `[{ name, ingredient, amount }]`, and `QUERY_SQL` string. Consumed by `web/db/app.js` (Task 4).

- [ ] **Step 1: Create `web/db/data.js`**

```js
// The three tables of a tiny cooking database. Kept as plain JS so the demo has
// no build step and the SQL result below is genuinely computed from this data —
// not hand-faked.

export const recipes = [
  { id: 1, name: "Fluffy Buttermilk Pancakes", minutes: 20, serves: 4 },
  { id: 2, name: "Overnight Oats", minutes: 5, serves: 2 },
];

export const ingredients = [
  { id: 1, name: "Flour", unit: "g" },
  { id: 2, name: "Buttermilk", unit: "ml" },
  { id: 3, name: "Egg", unit: "pcs" },
  { id: 4, name: "Butter", unit: "g" },
  { id: 5, name: "Rolled oats", unit: "g" },
  { id: 6, name: "Milk", unit: "ml" },
  { id: 7, name: "Honey", unit: "tbsp" },
];

export const recipe_ingredients = [
  { recipe_id: 1, ingredient_id: 1, amount: "250 g" },
  { recipe_id: 1, ingredient_id: 2, amount: "300 ml" },
  { recipe_id: 1, ingredient_id: 3, amount: "2 pcs" },
  { recipe_id: 1, ingredient_id: 4, amount: "30 g" },
  { recipe_id: 2, ingredient_id: 5, amount: "80 g" },
  { recipe_id: 2, ingredient_id: 6, amount: "120 ml" },
  { recipe_id: 2, ingredient_id: 7, amount: "1 tbsp" },
];

// Ordered metadata used to draw the spreadsheet grids and the ERD boxes.
export const SCHEMA = [
  {
    name: "recipes",
    columns: [
      { name: "id", pk: true },
      { name: "name" },
      { name: "minutes" },
      { name: "serves" },
    ],
    rows: recipes,
  },
  {
    name: "ingredients",
    columns: [
      { name: "id", pk: true },
      { name: "name" },
      { name: "unit" },
    ],
    rows: ingredients,
  },
  {
    name: "recipe_ingredients",
    columns: [
      { name: "recipe_id", fk: "recipes" },
      { name: "ingredient_id", fk: "ingredients" },
      { name: "amount" },
    ],
    rows: recipe_ingredients,
  },
];

export const QUERY_SQL = `SELECT r.name, i.name AS ingredient, ri.amount
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN ingredients i ON i.id = ri.ingredient_id
WHERE r.name = 'Fluffy Buttermilk Pancakes';`;

// Run the JOIN above against the in-memory tables.
export function runQuery() {
  const recipe = recipes.find((r) => r.name === "Fluffy Buttermilk Pancakes");
  return recipe_ingredients
    .filter((ri) => ri.recipe_id === recipe.id)
    .map((ri) => {
      const ing = ingredients.find((i) => i.id === ri.ingredient_id);
      return { name: recipe.name, ingredient: ing.name, amount: ri.amount };
    });
}
```

- [ ] **Step 2: Commit**

```bash
git add web/db/data.js
git commit -m "feat: add database demo data + query logic"
```

---

### Task 4: Database demo UI

**Files:**
- Create: `web/db/index.html`
- Create: `web/db/app.js`
- Create: `web/db/styles.css`
- Create: `tests/test_e2e_db.py`

**Interfaces:**
- Consumes: `SCHEMA`, `runQuery`, `QUERY_SQL` from `./data.js`.
- Produces: `/db/` route; `window.__APP.ready`.

- [ ] **Step 1: Write failing db e2e test** `tests/test_e2e_db.py`:

```python
"""End-to-end tests for the database demo."""
import os
import re

import pytest
from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


@pytest.fixture()
def db(page: Page, server_url: str):
    page.set_viewport_size({"width": 1100, "height": 800})
    page.goto(server_url + "/db/")
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)
    return page


def test_workbook_has_three_sheets(db: Page):
    tabs = db.locator(".sheet-tab")
    expect(tabs).to_have_count(3)
    assert tabs.nth(0).inner_text() == "recipes"
    assert tabs.nth(2).inner_text() == "recipe_ingredients"
    db.screenshot(path=os.path.join(SHOTS, "05-db-spreadsheet.png"))


def test_erd_has_three_tables(db: Page):
    expect(db.locator(".erd-table")).to_have_count(3)
    db.screenshot(path=os.path.join(SHOTS, "06-db-erd.png"))


def test_query_result_rows(db: Page):
    # The pancakes recipe has 4 ingredient rows in the seed data.
    expect(db.locator(".result-table tbody tr")).to_have_count(4)
    expect(db.locator(".result-table")).to_contain_text("Buttermilk")


def test_switch_sheet(db: Page):
    db.locator('.sheet-tab', has_text="ingredients").nth(0).click()
    # ingredients sheet has 7 rows
    expect(db.locator(".grid tbody tr")).to_have_count(7)


def test_hover_links_sheet_to_erd(db: Page):
    db.locator('.sheet-tab', has_text="recipe_ingredients").hover()
    expect(db.locator('.erd-table[data-table="recipe_ingredients"]')).to_have_class(re.compile(r"\bglow\b"))
    expect(db.locator('.erd-table[data-table="recipes"]')).to_have_class(re.compile(r"\bdim\b"))
    db.screenshot(path=os.path.join(SHOTS, "07-db-hover.png"))
```

- [ ] **Step 2: Run to verify it fails**

Run: `python -m pytest tests/test_e2e_db.py -v`
Expected: FAIL (page 404 / elements missing)

- [ ] **Step 3: Create `web/db/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>What They Mean — Databases</title>
  <link rel="stylesheet" href="./styles.css" />
  <script type="importmap">
  {
    "imports": {
      "preact": "../vendor/preact.module.js",
      "preact/hooks": "../vendor/preact-hooks.module.js",
      "htm": "../vendor/htm.module.js"
    }
  }
  </script>
</head>
<body>
  <a class="back" href="../">← All concepts</a>
  <div id="app"></div>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create `web/db/app.js`**

```js
import { h, render } from "preact";
import { useEffect, useState } from "preact/hooks";
import htm from "htm";
import { SCHEMA, QUERY_SQL, runQuery } from "./data.js";

const html = htm.bind(h);

// Each table gets a colour, reused in the spreadsheet tabs and the ERD so the
// link between "a sheet" and "a table" is visible.
const COLORS = {
  recipes: "#2563eb",
  ingredients: "#16a34a",
  recipe_ingredients: "#ea580c",
};

const byName = (name) => SCHEMA.find((t) => t.name === name);

function App() {
  const [sheet, setSheet] = useState("recipes"); // which sheet is open
  const [active, setActive] = useState(null); // which table is hover-linked
  const result = runQuery();

  useEffect(() => {
    window.__APP = { ready: true };
  }, []);

  return html`
    <main class="split">
      <${SpreadsheetPane}
        sheet=${sheet}
        setSheet=${setSheet}
        active=${active}
        setActive=${setActive}
      />
      <${DatabasePane}
        result=${result}
        active=${active}
        setActive=${setActive}
      />
    </main>
  `;
}

// ---------------------------------------------------------------------------
// TOP — the friendly spreadsheet: a workbook with sheet tabs and a cell grid.
// ---------------------------------------------------------------------------
function SpreadsheetPane({ sheet, setSheet, active, setActive }) {
  const table = byName(sheet);
  return html`
    <section class="pane pane-sheet">
      <div class="pane-label">
        <span class="badge badge-sheet">The spreadsheet</span>
        <span class="pane-sub">what a person knows</span>
      </div>

      <div class="workbook">
        <table class="grid">
          <thead>
            <tr>
              <th class="rownum"></th>
              ${table.columns.map((c) => html`<th key=${c.name}>${c.name}</th>`)}
            </tr>
          </thead>
          <tbody>
            ${table.rows.map(
              (row, i) => html`
                <tr key=${i}>
                  <td class="rownum">${i + 1}</td>
                  ${table.columns.map(
                    (c) => html`<td key=${c.name}>${row[c.name]}</td>`
                  )}
                </tr>
              `
            )}
          </tbody>
        </table>

        <div class="sheet-tabs">
          ${SCHEMA.map(
            (t) => html`
              <button
                key=${t.name}
                class=${`sheet-tab ${sheet === t.name ? "current" : ""}`}
                style=${`--c:${COLORS[t.name]}`}
                onClick=${() => setSheet(t.name)}
                onMouseEnter=${() => setActive(t.name)}
                onMouseLeave=${() => setActive(null)}
              >
                ${t.name}
              </button>
            `
          )}
        </div>
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// BOTTOM — the database: an ERD, a SQL query and its (computed) result.
// ---------------------------------------------------------------------------
function DatabasePane({ result, active, setActive }) {
  return html`
    <section class="pane pane-db">
      <div class="pane-label">
        <span class="badge badge-db">The database</span>
        <span class="pane-sub">the same tables, underneath</span>
      </div>

      <p class="db-caption">
        A database is a <strong>spreadsheet many computers can read and write at
        the same time</strong> — and can be asked <strong>precise questions
        (queries)</strong> instead of scrolled.
      </p>

      <div class="machines">
        <span class="machine">💻</span><span class="machine">📱</span><span class="machine">🖥️</span>
        <span class="arrow">→</span>
        <span class="db-can">🗄️ one shared database</span>
      </div>

      <div class="db-grid">
        <div class="erd">
          ${SCHEMA.map(
            (t) => html`
              <div
                key=${t.name}
                class=${`erd-table ${active && active !== t.name ? "dim" : ""} ${
                  active === t.name ? "glow" : ""
                }`}
                data-table=${t.name}
                style=${`--c:${COLORS[t.name]}`}
                onMouseEnter=${() => setActive(t.name)}
                onMouseLeave=${() => setActive(null)}
              >
                <div class="erd-head">${t.name}</div>
                <ul class="erd-cols">
                  ${t.columns.map(
                    (c) => html`
                      <li key=${c.name}>
                        <span class="col-name">${c.name}</span>
                        ${c.pk && html`<span class="key pk">PK</span>`}
                        ${c.fk && html`<span class="key fk">FK → ${c.fk}</span>`}
                      </li>
                    `
                  )}
                </ul>
              </div>
            `
          )}
        </div>

        <div class="query">
          <div class="block-title">A query asks a precise question</div>
          <pre class="sql">${QUERY_SQL}</pre>
          <div class="block-title">Result</div>
          <table class="result-table">
            <thead>
              <tr><th>name</th><th>ingredient</th><th>amount</th></tr>
            </thead>
            <tbody>
              ${result.map(
                (r, i) => html`
                  <tr key=${i}>
                    <td>${r.name}</td><td>${r.ingredient}</td><td>${r.amount}</td>
                  </tr>
                `
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

render(html`<${App} />`, document.getElementById("app"));
```

- [ ] **Step 5: Create `web/db/styles.css`**

```css
:root {
  --bg: #f1f5f9;
  --ink: #0f172a;
  --muted: #64748b;
  --line: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { color: var(--ink); background: var(--bg); }

.split { height: 100vh; display: grid; grid-template-rows: 50vh 50vh; }
.pane { position: relative; padding: 18px 22px; overflow: auto; }

.pane-sheet { background: #ecfdf5; border-bottom: 3px solid var(--ink); }
.pane-db { background: #0f172a; color: #e2e8f0; }

.pane-label { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
.badge {
  font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
  text-transform: uppercase; padding: 3px 10px; border-radius: 999px;
}
.badge-sheet { background: #047857; color: #fff; }
.badge-db { background: #38bdf8; color: #04263a; }
.pane-sub { color: var(--muted); font-size: 13px; }
.pane-db .pane-sub { color: #94a3b8; }

/* back link */
.back {
  position: absolute; top: 12px; left: 16px; z-index: 10;
  font-size: 13px; font-weight: 600; color: var(--ink); text-decoration: none;
  background: rgba(255, 255, 255, 0.8); padding: 5px 10px; border-radius: 999px;
  border: 1px solid var(--line);
}
.back:hover { background: #fff; }

/* --- spreadsheet --------------------------------------------------------- */
.workbook {
  background: #fff; border: 1px solid var(--line); border-radius: 10px;
  max-width: 820px; margin: 0 auto; overflow: hidden;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}
.grid { width: 100%; border-collapse: collapse; font-size: 14px; }
.grid th, .grid td {
  border: 1px solid #e5e7eb; padding: 6px 12px; text-align: left; white-space: nowrap;
}
.grid thead th { background: #f1f5f9; font-weight: 600; }
.grid .rownum {
  background: #f8fafc; color: var(--muted); text-align: center;
  width: 34px; font-variant-numeric: tabular-nums;
}
.sheet-tabs { display: flex; gap: 2px; padding: 6px 8px; background: #f1f5f9; border-top: 1px solid var(--line); }
.sheet-tab {
  border: 1px solid transparent; border-bottom: none; background: #e2e8f0;
  color: #334155; font-size: 13px; font-weight: 600; padding: 6px 12px;
  border-radius: 7px 7px 0 0; cursor: pointer;
  border-top: 3px solid var(--c);
}
.sheet-tab.current { background: #fff; color: var(--ink); }
.sheet-tab:hover { background: #fff; }

/* --- database (bottom) --------------------------------------------------- */
.db-caption { font-size: 14px; line-height: 1.6; color: #cbd5e1; max-width: 760px; margin: 0 0 12px; }
.db-caption strong { color: #f8fafc; }

.machines { display: flex; align-items: center; gap: 10px; font-size: 22px; margin-bottom: 16px; }
.machines .arrow { color: #64748b; font-size: 18px; }
.machines .db-can { font-size: 14px; font-weight: 700; color: #38bdf8; }

.db-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 20px; align-items: start; }
@media (max-width: 720px) { .db-grid { grid-template-columns: 1fr; } }

.erd { display: flex; flex-direction: column; gap: 14px; }
.erd-table {
  background: #1e293b; border: 1px solid #334155; border-left: 4px solid var(--c);
  border-radius: 8px; overflow: hidden; transition: opacity 0.15s, box-shadow 0.15s;
}
.erd-table.dim { opacity: 0.32; }
.erd-table.glow { box-shadow: 0 0 0 2px var(--c); }
.erd-head {
  background: #0b1220; color: var(--c); font-weight: 700; font-size: 13px;
  padding: 6px 12px; font-family: "SF Mono", Menlo, Consolas, monospace;
}
.erd-cols { list-style: none; margin: 0; padding: 4px 0; }
.erd-cols li {
  display: flex; align-items: center; gap: 8px; padding: 3px 12px;
  font-size: 13px; font-family: "SF Mono", Menlo, Consolas, monospace; color: #cbd5e1;
}
.key { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; }
.key.pk { background: #fde68a; color: #713f12; }
.key.fk { background: #1d4ed8; color: #dbeafe; }

.block-title {
  font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;
  color: #94a3b8; margin-bottom: 8px; margin-top: 4px;
}
.sql {
  background: #1e293b; border: 1px solid #334155; border-radius: 8px;
  padding: 12px 14px; margin: 0 0 14px; font-family: "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px; line-height: 1.5; color: #e2e8f0; white-space: pre-wrap;
}
.result-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.result-table th, .result-table td {
  border: 1px solid #334155; padding: 5px 10px; text-align: left;
}
.result-table thead th { background: #1e293b; color: #94a3b8; font-weight: 600; }
.result-table td { color: #e2e8f0; }
```

- [ ] **Step 6: Run the db e2e tests**

Run: `python -m pytest tests/test_e2e_db.py -v`
Expected: PASS (5 tests)

- [ ] **Step 7: Run the full suite**

Run: `python -m pytest -v`
Expected: PASS (all tests including `test_menu_card_opens_db_demo`)

- [ ] **Step 8: Commit**

```bash
git add web/db tests/test_e2e_db.py
git commit -m "feat: add database demo (spreadsheet + ERD + query)"
```

---

### Task 5: CLAUDE.md guide + README update

**Files:**
- Create: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Create `CLAUDE.md`**

```markdown
# What They Mean — project guide

A tiny static site that explains tech concepts to **non-developers**, one concept
per screen, shown rather than told. **No build step.**

## Philosophy

- **No bundler, no build.** Plain ES modules resolved by an inline import map.
  Preact + htm are vendored locally by `vendor.sh` into `web/vendor/`.
- **The filesystem is the router.** Each concept is its own page under `web/`,
  reached by a relative link. No JS router, no server rewrites.

## Each demo is a standalone folder

A demo owns everything it needs and shares nothing but the vendored deps:

```
web/<name>/
  index.html    import map -> ../vendor/...  + a back link to ../
  app.js        the Preact app for this concept
  styles.css    this demo's styles only (loaded by nobody else)
  data.js       (optional) inline data the demo renders
```

Because each page loads only its own `styles.css`, styles can't leak between
demos — no scoping tricks needed.

## How to add a demo

1. `cp -r web/db web/<name>` and rewrite its `app.js` / `styles.css` / data.
2. Add a `<a class="card" href="<name>/">` card to `web/index.html`.
3. Add `tests/test_e2e_<name>.py` modelled on `tests/test_e2e_db.py`.

That's it — nothing else to wire up.

## Conventions

- Demo pages live one level deep, so import maps point to `../vendor/...`.
- Each demo sets `window.__APP = { ready: true, ... }` once rendered, so e2e
  tests can wait on it.
- Links are relative (`href="api/"`, `href="../"`) so the project-path GitHub
  Pages URL works.

## Run / test / deploy

```bash
./vendor.sh            # once: download Preact/htm into web/vendor/
python3 serve.py       # http://127.0.0.1:8000
python -m pytest -v    # server + Playwright e2e tests
```

Pushing to `main` runs `.github/workflows/pages.yml`, which vendors the modules
and publishes the whole `web/` directory to GitHub Pages.
```

- [ ] **Step 2: Update `README.md`** — replace the "Tech" file-tree block and intro to reflect the menu + two demos. Replace lines describing structure:

```markdown
# What They Mean

A tiny static site that explains tech concepts to **non-developers** — one
concept per screen, shown rather than told. The landing page is a menu; each
concept is a standalone page.

## Concepts

- **#1 — What is an API?** (`web/api/`) A cooking-app recipe card on top; the
  `GET` request and raw JSON that produced it underneath. Hovering a field links
  the data to the part of the app it became.
- **#2 — What is a database?** (`web/db/`) A spreadsheet workbook with three
  sheets on top; the same three tables as a database — an ERD and a SQL query
  with its result — underneath. The point: a database is a spreadsheet many
  machines share at once, and can be queried.

## Tech

No bundler, no build step. Plain ES modules with an import map, rendered with
Preact + htm, vendored locally by `vendor.sh`. The filesystem is the router:
each demo is its own folder. See [`CLAUDE.md`](CLAUDE.md) for conventions and how
to add a demo.

```
web/
  index.html       the menu
  styles.css       menu styles
  api/             "What is an API?" demo (index.html, app.js, styles.css, recipe.json)
  db/              "What is a database?" demo (index.html, app.js, styles.css, data.js)
  vendor/          vendored preact / preact-hooks / htm
serve.py           static dev server
```

## Run locally

```bash
./vendor.sh          # download dependencies into web/vendor/ (once)
python3 serve.py     # http://127.0.0.1:8000
```

## Deploy

Pushing to `main` triggers [`.github/workflows/pages.yml`](.github/workflows/pages.yml),
which vendors the modules and publishes `web/` to GitHub Pages.
```

- [ ] **Step 3: Run the full suite once more**

Run: `python -m pytest -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: add CLAUDE.md guide and update README for multi-page layout"
```

---

## Self-Review notes

- **Spec coverage:** menu (Task 2), api restructure (Task 1), db demo content — spreadsheet/ERD/query/caption/machines/hover (Task 3-4), CLAUDE.md (Task 5), per-demo tests + server test (Tasks 1,2,4). All covered.
- **No new deps, no router, no shadow DOM, no serve.py change** — matches the multi-page decision.
- **Types consistent:** `SCHEMA`/`runQuery`/`QUERY_SQL` defined in Task 3, consumed in Task 4. `window.__APP.ready` used by both demos' tests.

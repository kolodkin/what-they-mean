import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import htm from "htm";
import { SCHEMA, QUERY_SQL, runQuery } from "./data.js";

const html = htm.bind(h);

// Each table gets a colour, reused in the spreadsheet tabs and the ERD so the
// link between "a sheet" and "a table" is visible.
const COLORS = {
  recipes: "#2563eb",
  ingredients: "#16a34a",
};

const byName = (name) => SCHEMA.find((t) => t.name === name);

// How the ERD reads left-to-right: one `recipes` row has many `ingredients`
// rows (each linked back by recipe_id), drawn with a crow's-foot "1 ──< ∞".
const ERD_LAYOUT = [
  { table: "recipes" },
  { rel: { left: "1", right: "∞", via: "recipe_id" } },
  { table: "ingredients" },
];

function App() {
  const [sheet, setSheet] = useState("recipes"); // which sheet is open
  const [active, setActive] = useState(null); // which table is hover-linked
  const [playing, setPlaying] = useState(false); // auto-tour running?
  const timers = useRef([]); // pending setTimeout ids, so we can cancel
  const result = runQuery();

  // Auto-tour: glow each table in turn, 2 seconds apart, so the link between a
  // "sheet" and a "table" is visible without anyone having to hover.
  function stopTour() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setActive(null);
    setPlaying(false);
  }

  function playTour() {
    if (playing) return stopTour();
    setPlaying(true);
    const tables = SCHEMA.map((t) => t.name);
    tables.forEach((name, i) => {
      timers.current.push(setTimeout(() => setActive(name), i * 2000));
    });
    timers.current.push(
      setTimeout(() => {
        timers.current = [];
        setActive(null);
        setPlaying(false);
      }, tables.length * 2000)
    );
  }

  // Readiness signal for end-to-end tests to wait on.
  useEffect(() => {
    window.__APP = { ready: true };
  }, []);

  // Cancel any pending highlights if the app is torn down mid-tour.
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return html`
    <header class="page-head">
      <p class="page-explain">
        A database is a <strong>spreadsheet many computers can read and write at
        the same time</strong> — and can be asked <strong>precise questions
        (queries)</strong> instead of scrolled.
      </p>
    </header>
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
        playing=${playing}
        onPlay=${playTour}
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
                  ${table.columns.map((c) => html`<td key=${c.name}>${row[c.name]}</td>`)}
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

      <p class="sheet-hint">Two tabs, two sheets — like any workbook.</p>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// BOTTOM — the database: an ERD, a SQL query and its (computed) result.
// ---------------------------------------------------------------------------
function DatabasePane({ result, active, setActive, playing, onPlay }) {
  const tableBox = (name) => {
    const t = byName(name);
    return html`
      <div
        key=${name}
        class=${`erd-table ${active && active !== name ? "dim" : ""} ${
          active === name ? "glow" : ""
        }`}
        data-table=${name}
        style=${`--c:${COLORS[name]}`}
        onMouseEnter=${() => setActive(name)}
        onMouseLeave=${() => setActive(null)}
      >
        <div class="erd-head">${t.name}</div>
        <ul class="erd-cols">
          ${t.columns.map(
            (c) => html`
              <li key=${c.name} class=${c.fk ? "is-fk" : ""}>
                <span class="col-name">${c.name}</span>
                ${c.pk && html`<span class="key pk">PK</span>`}
                ${c.fk && html`<span class="key fk">FK → ${c.fk}</span>`}
              </li>
            `
          )}
        </ul>
      </div>
    `;
  };

  return html`
    <section class="pane pane-db">
      <div class="pane-label">
        <span class="badge badge-db">The database</span>
        <span class="pane-sub">the same tables, underneath</span>
        <button class=${`play ${playing ? "active" : ""}`} onClick=${onPlay}>
          ${playing ? "■ Stop" : "▶ Play demo"}
        </button>
      </div>

      <div class="machines">
        <span class="machine">💻</span><span class="machine">📱</span><span class="machine">🖥️</span>
        <span class="arrow">→</span>
        <span class="db-can">🗄️ one shared database</span>
      </div>

      <div class="block-title">Two tables, joined by a key</div>
      <div class="erd-row">
        ${ERD_LAYOUT.map((item, i) =>
          item.table
            ? tableBox(item.table)
            : html`
                <div class="erd-link" key=${`rel-${i}`}>
                  <span class="card-mark">${item.rel.left}</span>
                  <span class="erd-line"></span>
                  <span class="card-mark">${item.rel.right}</span>
                  <span class="erd-via">${item.rel.via}</span>
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
            <tr><th>name</th><th>ingredient</th><th>amount</th><th>units</th></tr>
          </thead>
          <tbody>
            ${result.map(
              (r, i) => html`
                <tr key=${i}>
                  <td>${r.name}</td><td>${r.ingredient}</td><td>${r.amount}</td><td>${r.units}</td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

render(html`<${App} />`, document.getElementById("app"));

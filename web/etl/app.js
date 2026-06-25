import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import htm from "htm";
import { RAW_ROWS, RULES, runPipeline } from "./data.js";

const html = htm.bind(h);

const { extracted, transformed, loaded } = runPipeline();

// The pipeline is a chain that alternates DATA nodes ( ) and PROCESSING nodes [ ]:
//
//   (data source) -> [extract] -> (bronze) -> [transform]
//                 -> (silver, normalised) -> [load] -> (data store)
//
// Each node starts EMPTY and only fills once the run reaches it, so you watch
// the data move and change one hop at a time.
const SEQ = ["source", "extract", "bronze", "transform", "silver", "load", "store"];

// Timing (ms) for the staged reveal so each hop is legible.
const T_HOP = 360; // between revealing one node and the next
const T_RULE = 300; // between each transform rule lighting up
const T_ROW = 220; // between each row landing in the data store

const fmtPrice = (p) => (p == null ? "—" : p.toFixed(2));

function App() {
  const [revealed, setRevealed] = useState(0); // how many SEQ nodes are filled
  const [lit, setLit] = useState(0); // transform rules applied so far
  const [stored, setStored] = useState(0); // rows landed in the data store
  const [done, setDone] = useState(false);
  const timers = useRef([]);

  // Readiness signal for end-to-end tests to wait on.
  useEffect(() => {
    window.__APP = { ready: true, revealed };
  }, [revealed]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const at = (ms, fn) => timers.current.push(setTimeout(fn, ms));

  function run() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRevealed(0);
    setLit(0);
    setStored(0);
    setDone(false);

    let t = 0;
    SEQ.forEach((key, i) => {
      t += T_HOP;
      at(t, () => setRevealed(i + 1));
      // While the transform node is the freshly-revealed one, light its rules.
      if (key === "transform") {
        RULES.forEach((_, r) => {
          t += T_RULE;
          at(t, () => setLit(r + 1));
        });
      }
      // While the store node is revealed, drop the clean rows in one by one.
      if (key === "store") {
        loaded.forEach((_, r) => {
          t += T_ROW;
          at(t, () => setStored(r + 1));
        });
      }
    });
    t += T_ROW;
    at(t, () => setDone(true));
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRevealed(0);
    setLit(0);
    setStored(0);
    setDone(false);
  }

  const running = revealed > 0 && !done;
  const isOn = (key) => revealed > SEQ.indexOf(key); // node has been reached
  const isActive = (key) => running && SEQ.indexOf(key) === revealed - 1;

  return html`
    <main class="wrap">
      <header class="head">
        <h1>What is a data pipeline?</h1>
        <p class="lede">
          A pipeline <strong>moves data from where it's made to where it's
          used</strong>, fixing it at each hop. It alternates${" "}
          <em>data</em> (the parentheses) with${" "}<em>processing</em> (the
          brackets) — the steps are nicknamed <em>ETL</em>: Extract, Transform,
          Load.
        </p>
        <div class="controls">
          <button class="run" onClick=${run} disabled=${running}>
            ${revealed === 0 ? "▶ Run the pipeline" : running ? "Running…" : "▶ Run again"}
          </button>
          <button class="reset" onClick=${reset} disabled=${revealed === 0}>Reset</button>
        </div>
      </header>

      <div class="chain">
        <${DataNode}
          tone="source" label="data source" sub="a messy export, as-received"
          on=${isOn("source")} active=${isActive("source")}
          rows=${RAW_ROWS} variant="raw"
        />
        <${Arrow} on=${isOn("extract")} />
        <${ProcNode}
          label="extract" desc="read the rows in, untouched"
          on=${isOn("extract")} active=${isActive("extract")}
        />
        <${Arrow} on=${isOn("bronze")} />
        <${DataNode}
          tone="bronze" label="bronze" sub="raw, exactly as it landed"
          on=${isOn("bronze")} active=${isActive("bronze")}
          rows=${RAW_ROWS} variant="raw"
        />
        <${Arrow} on=${isOn("transform")} />
        <${ProcNode}
          label="transform" desc="clean & reshape every row"
          on=${isOn("transform")} active=${isActive("transform")}
        >
          <ul class="rules">
            ${RULES.map(
              (rule, i) => html`
                <li key=${rule.id} class=${i < lit ? "lit" : ""}>
                  <span class="tick">${i < lit ? "✓" : "○"}</span>${rule.label}
                </li>
              `
            )}
          </ul>
        </${ProcNode}>
        <${Arrow} on=${isOn("silver")} />
        <${DataNode}
          tone="silver" label="silver — normalised" sub="cleaned, the junk row dropped"
          on=${isOn("silver")} active=${isActive("silver")}
          rows=${transformed} variant="clean"
        />
        <${Arrow} on=${isOn("load")} />
        <${ProcNode}
          label="load" desc="write the clean rows to the store"
          on=${isOn("load")} active=${isActive("load")}
        />
        <${Arrow} on=${isOn("store")} />
        <${StoreNode} on=${isOn("store")} active=${isActive("store")} stored=${stored} />
      </div>
    </main>
  `;
}

function Arrow({ on }) {
  return html`<div class=${`hop ${on ? "on" : ""}`} aria-hidden="true">↓</div>`;
}

// A DATA node — the "( )" in the diagram. Empty until reached, then shows its
// rows as a small table.
function DataNode({ tone, label, sub, on, active, rows, variant }) {
  const cls = ["node", "node-data", `tone-${tone}`, on ? "on" : "", active ? "active" : ""]
    .filter(Boolean)
    .join(" ");
  return html`
    <section class=${cls} data-node=${tone}>
      <div class="node-head">
        <span class="paren">(</span><span class="node-name">${label}</span><span class="paren">)</span>
        ${on && html`<span class="node-count">${rows.length} rows</span>`}
      </div>
      <p class="node-sub">${sub}</p>
      ${on
        ? html`
            <table class=${`rows ${variant}`}>
              <thead><tr><th>name</th><th>added</th><th>price</th></tr></thead>
              <tbody>
                ${rows.map(
                  (r, i) =>
                    variant === "raw"
                      ? html`
                          <tr key=${i} class=${r.name.trim() === "" ? "junk" : ""}>
                            <td>${r.name === "" ? html`<span class="empty">empty</span>` : `"${r.name}"`}</td>
                            <td>${r.added || html`<span class="empty">—</span>`}</td>
                            <td>${r.price || html`<span class="empty">—</span>`}</td>
                          </tr>
                        `
                      : html`
                          <tr key=${i}>
                            <td>${r.name}</td><td>${r.added}</td><td>${fmtPrice(r.price)}</td>
                          </tr>
                        `
                )}
              </tbody>
            </table>
          `
        : html`<div class="node-empty">waiting…</div>`}
    </section>
  `;
}

// A PROCESSING node — the "[ ]" in the diagram. Empty until reached.
function ProcNode({ label, desc, on, active, children }) {
  const cls = ["node", "node-proc", on ? "on" : "", active ? "active" : ""]
    .filter(Boolean)
    .join(" ");
  return html`
    <section class=${cls} data-node=${label}>
      <div class="proc-head">
        <span class="bracket">[</span><span class="proc-name">${label}</span><span class="bracket">]</span>
      </div>
      ${on
        ? html`<p class="proc-desc">${desc}</p>${children}`
        : html`<div class="node-empty">idle</div>`}
    </section>
  `;
}

// The final DATA store — same 🗄️ icon as the database demo. Rows drop in one
// by one as they are loaded.
function StoreNode({ on, active, stored }) {
  const cls = ["node", "node-data", "node-store", "tone-store", on ? "on" : "", active ? "active" : ""]
    .filter(Boolean)
    .join(" ");
  const rows = loaded.slice(0, stored);
  return html`
    <section class=${cls} data-node="store">
      <div class="node-head">
        <span class="node-name">🗄️ data store</span>
        ${on && html`<span class="node-count">${stored} rows written</span>`}
      </div>
      <p class="node-sub">ready to serve to apps & queries</p>
      ${on
        ? html`
            <table class="rows dest">
              <thead><tr><th>name</th><th>added</th><th>price</th></tr></thead>
              <tbody>
                ${rows.length === 0
                  ? html`<tr class="placeholder"><td colspan="3">waiting for clean rows…</td></tr>`
                  : rows.map(
                      (r, i) => html`
                        <tr key=${i} class="dropped">
                          <td>${r.name}</td><td>${r.added}</td><td>${fmtPrice(r.price)}</td>
                        </tr>
                      `
                    )}
              </tbody>
            </table>
          `
        : html`<div class="node-empty">empty</div>`}
    </section>
  `;
}

render(html`<${App} />`, document.getElementById("app"));

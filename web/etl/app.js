import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import htm from "htm";
import { RAW_ROWS, RULES, runPipeline } from "./data.js";

const html = htm.bind(h);

const { extracted, transformed, loaded } = runPipeline();

// Three stages, left -> right: Extract -> Transform -> Load. Each card stays
// EMPTY until the run reaches it, then fills. The medallion layers (bronze =
// raw, silver = cleaned) ride along as each stage's label.
const T_EXTRACT = 550; // pause after pulling rows in
const T_RULE = 320; // between each Transform rule lighting up
const T_LOAD = 240; // between each row landing in the store

const fmtPrice = (p) => (p == null ? "—" : p.toFixed(2));

function App() {
  const [phase, setPhase] = useState("idle"); // idle -> extract -> transform -> load -> done
  const [litRules, setLitRules] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const timers = useRef([]);

  useEffect(() => {
    window.__APP = { ready: true, phase };
  }, [phase]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const at = (ms, fn) => timers.current.push(setTimeout(fn, ms));

  function run() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setLitRules(0);
    setLoadedCount(0);

    setPhase("extract");
    let t = T_EXTRACT;

    at(t, () => setPhase("transform"));
    RULES.forEach((_, i) => {
      t += T_RULE;
      at(t, () => setLitRules(i + 1));
    });

    t += T_RULE;
    at(t, () => setPhase("load"));
    loaded.forEach((_, i) => {
      t += T_LOAD;
      at(t, () => setLoadedCount(i + 1));
    });

    t += T_LOAD;
    at(t, () => setPhase("done"));
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("idle");
    setLitRules(0);
    setLoadedCount(0);
  }

  const running = phase !== "idle" && phase !== "done";
  const order = ["idle", "extract", "transform", "load", "done"];
  const reached = (p) => order.indexOf(phase) >= order.indexOf(p);

  return html`
    <main class="wrap">
      <header class="head">
        <h1>What is a data pipeline?</h1>
        <p class="lede">
          A pipeline <strong>moves data from where it's made to where it's
          used</strong> — and <strong>fixes it on the way</strong>. The three
          steps are nicknamed <em>ETL</em>: Extract, Transform, Load.
        </p>
        <div class="controls">
          <button class="run" onClick=${run} disabled=${running}>
            ${phase === "idle" ? "▶ Run the pipeline" : running ? "Running…" : "▶ Run again"}
          </button>
          <button class="reset" onClick=${reset} disabled=${phase === "idle"}>Reset</button>
        </div>
      </header>

      <div class="pipeline">
        <${ExtractStage} active=${phase === "extract"} reached=${reached("extract")} />
        <div class="flow ${reached("transform") ? "on" : ""}">→</div>
        <${TransformStage}
          active=${phase === "transform"}
          reached=${reached("transform")}
          lit=${litRules}
        />
        <div class="flow ${reached("load") ? "on" : ""}">→</div>
        <${LoadStage} active=${phase === "load"} reached=${reached("load")} count=${loadedCount} />
      </div>
    </main>
  `;
}

function StageShell({ kind, title, layer, sub, badge, active, reached, children }) {
  const cls = ["stage", `stage-${kind}`, active ? "active" : "", reached ? "reached" : ""]
    .filter(Boolean)
    .join(" ");
  return html`
    <section class=${cls}>
      <div class="stage-head">
        <span class="stage-name">${title}</span>
        ${reached && html`<span class="stage-badge">${badge}</span>`}
      </div>
      <p class="stage-sub">
        <span class=${`medallion m-${layer.key}`}>${layer.name}</span>${sub}
      </p>
      <div class="stage-body">
        ${reached ? children : html`<div class="stage-empty">${title === "Load" ? "empty" : "waiting…"}</div>`}
      </div>
    </section>
  `;
}

// EXTRACT — bronze: read the raw rows out of the messy source, as-is.
function ExtractStage({ active, reached }) {
  return html`
    <${StageShell}
      kind="extract"
      title="Extract"
      layer=${{ key: "bronze", name: "bronze" }}
      sub=" — read the rows in, raw"
      badge=${`${RAW_ROWS.length} rows in`}
      active=${active}
      reached=${reached}
    >
      <table class="rows raw">
        <thead><tr><th>name</th><th>added</th><th>price</th></tr></thead>
        <tbody>
          ${RAW_ROWS.map(
            (r, i) => html`
              <tr key=${i} class=${r.name.trim() === "" ? "junk" : ""}>
                <td>${r.name === "" ? html`<span class="empty">empty</span>` : `"${r.name}"`}</td>
                <td>${r.added || html`<span class="empty">—</span>`}</td>
                <td>${r.price || html`<span class="empty">—</span>`}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    </${StageShell}>
  `;
}

// TRANSFORM — silver: clean & normalise; each rule lights, junk row drops.
function TransformStage({ active, reached, lit }) {
  const done = lit >= RULES.length;
  return html`
    <${StageShell}
      kind="transform"
      title="Transform"
      layer=${{ key: "silver", name: "silver" }}
      sub=" — clean & normalise"
      badge=${done ? `${transformed.length} rows` : "cleaning…"}
      active=${active}
      reached=${reached}
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
      <table class="rows ${done ? "clean" : ""}">
        <thead><tr><th>name</th><th>added</th><th>price</th></tr></thead>
        <tbody>
          ${done
            ? transformed.map(
                (r, i) => html`
                  <tr key=${i}>
                    <td>${r.name}</td><td>${r.added}</td><td>${fmtPrice(r.price)}</td>
                  </tr>
                `
              )
            : RAW_ROWS.map(
                (r, i) => html`
                  <tr key=${i} class=${r.name.trim() === "" ? "junk" : ""}>
                    <td>${r.name.trim() || html`<span class="empty">empty</span>`}</td>
                    <td>${r.added || "—"}</td><td>${r.price || "—"}</td>
                  </tr>
                `
              )}
        </tbody>
      </table>
    </${StageShell}>
  `;
}

// LOAD — store: cleaned rows fly into the 🗄️ database, one by one.
function LoadStage({ active, reached, count }) {
  const rows = loaded.slice(0, count);
  return html`
    <${StageShell}
      kind="load"
      title="Load"
      layer=${{ key: "store", name: "data store" }}
      sub=" — write the clean rows in"
      badge=${`${count} rows written`}
      active=${active}
      reached=${reached}
    >
      <div class="db">
        <div class=${`db-icon ${count > 0 ? "filling" : ""}`}>
          🗄️<span class="db-count">${count}</span>
        </div>
        <span class="db-label">recipes table</span>
      </div>
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
    </${StageShell}>
  `;
}

render(html`<${App} />`, document.getElementById("app"));

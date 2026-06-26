import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import htm from "htm";
import { runPipeline } from "./data.js";

const html = htm.bind(h);

const { sources, transformed, loaded } = runPipeline();

// Three stages, left -> right: Extract -> Transform -> Load.
//   Extract  — pull the raw rows out of THREE mismatched sources, as found.
//   Transform— clean each source & map it onto the one shared schema.
//   Load     — write the unified rows into the store.
// Each stage stays EMPTY until the run reaches it (Extract is filled up front,
// since the source data exists before you press Run). The medallion layers
// (bronze = raw, silver = clean) ride along as each stage's label.
const T_EXTRACT = 550; // pause after pulling rows in
const T_MAP = 480; // between each source being cleaned & mapped
const T_LOAD = 240; // between each row landing in the store

const fmtPrice = (p) => (p == null ? "—" : p.toFixed(2));

// Show a raw cell honestly: quote strings, leave numbers bare, flag blanks.
function rawCell(v) {
  if (v === "") return html`<span class="empty">empty</span>`;
  if (v == null) return html`<span class="empty">null</span>`;
  return typeof v === "string" ? `"${v}"` : String(v);
}

function App() {
  const [phase, setPhase] = useState("idle"); // idle -> extract -> transform -> load -> done
  const [mapped, setMapped] = useState(0); // how many source cards are cleaned
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
    setMapped(0);
    setLoadedCount(0);

    setPhase("extract");
    let t = T_EXTRACT;

    at(t, () => setPhase("transform"));
    sources.forEach((_, i) => {
      t += T_MAP;
      at(t, () => setMapped(i + 1));
    });

    t += T_MAP;
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
    setMapped(0);
    setLoadedCount(0);
  }

  const running = phase !== "idle" && phase !== "done";
  const order = ["idle", "extract", "transform", "load", "done"];
  const reached = (p) => order.indexOf(phase) >= order.indexOf(p);

  return html`
    <main class="wrap">
      <header class="head">
        <h1>What is ETL?</h1>
        <p class="lede">
          <strong>ETL</strong> <strong>moves data from where it's made to where
          it's used</strong> — and <strong>fixes it on the way</strong>. The
          name is its three steps: <em>Extract, Transform, Load</em>.
        </p>
        <div class="controls">
          <button class="run" onClick=${run} disabled=${running}>
            ${phase === "idle" ? "▶ Run the pipeline" : running ? "Running…" : "▶ Run again"}
          </button>
          <button class="reset" onClick=${reset} disabled=${phase === "idle"}>Reset</button>
        </div>
      </header>

      <div class="pipeline">
        <!-- Extract holds the raw sources up front; Transform & Load stay empty
             until the run reaches them. -->
        <${ExtractStage} active=${phase === "extract"} reached=${true} />
        <div class="flow ${reached("transform") ? "on" : ""}">→</div>
        <${TransformStage}
          active=${phase === "transform"}
          reached=${reached("transform")}
          mapped=${mapped}
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
        ${reached && badge && html`<span class="stage-badge">${badge}</span>`}
      </div>
      <p class="stage-sub">
        <span class=${`medallion m-${layer.key}`}>${layer.name}</span>${sub}
      </p>
      <div class="stage-body">
        ${reached
          ? children
          : html`
              <div class="stage-empty">
                <span class="stage-empty-dot"></span>
                <span>waiting to run</span>
              </div>
            `}
      </div>
    </section>
  `;
}

// EXTRACT — bronze: pull the raw rows out of three mismatched sources, exactly
// as found. Each source disagrees on column names AND formats — that mess is
// the input; Transform is what reconciles it.
function ExtractStage({ active, reached }) {
  const total = sources.reduce((n, s) => n + s.rows.length, 0);
  return html`
    <${StageShell}
      kind="extract"
      title="Extract"
      layer=${{ key: "bronze", name: "bronze" }}
      sub=" — pull each source in, raw"
      badge=${`${total} rows in`}
      active=${active}
      reached=${reached}
    >
      <p class="stack-note">three sources, three different sets of columns</p>
      <div class="src-stack">
        ${sources.map((src) => html`<${RawSourceCard} key=${src.id} src=${src} />`)}
      </div>
    </${StageShell}>
  `;
}

// One source's RAW card: its own (messy) column names and untouched values.
function RawSourceCard({ src }) {
  const orig = [src.cols.name, src.cols.added, src.cols.price];
  return html`
    <div class="src-card">
      <div class="src-head">
        <span class="src-name">${src.name}</span>
        <span class="src-kind">${src.kind}</span>
      </div>
      <table class="rows src-in">
        <thead><tr>${orig.map((c) => html`<th key=${c}>${c}</th>`)}</tr></thead>
        <tbody>
          ${src.rows.map(
            (r, i) => html`
              <tr key=${i}>
                <td>${rawCell(r[src.cols.name])}</td>
                <td>${rawCell(r[src.cols.added])}</td>
                <td>${rawCell(r[src.cols.price])}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    </div>
  `;
}

// TRANSFORM — silver: the same three sources, now cleaned and mapped onto one
// shared schema (name / added / price). Cards light up one source at a time.
function TransformStage({ active, reached, mapped }) {
  const done = mapped >= sources.length;
  return html`
    <${StageShell}
      kind="transform"
      title="Transform"
      layer=${{ key: "silver", name: "silver" }}
      sub=" — clean & map onto one schema"
      badge=${done ? "1 schema" : "mapping…"}
      active=${active}
      reached=${reached}
    >
      <p class="stack-note">same sources, now one shared shape</p>
      <div class="src-stack">
        ${sources.map(
          (src, i) => html`
            <${CleanSourceCard}
              key=${src.id}
              src=${src}
              mapped=${mapped > i}
              mapping=${active && mapped === i}
            />
          `
        )}
      </div>
    </${StageShell}>
  `;
}

// One source's CLEAN card: the shared schema, junk dropped. Dim until this
// source has been mapped, then it lights green.
function CleanSourceCard({ src, mapped, mapping }) {
  const cls = ["src-card", mapped ? "mapped" : "", mapping ? "mapping" : ""]
    .filter(Boolean)
    .join(" ");
  return html`
    <div class=${cls}>
      <div class="src-head">
        <span class="src-name">${src.name}</span>
        <span class="src-kind">${src.kind}</span>
      </div>
      <table class="rows src-out ${mapped ? "clean" : ""}">
        <thead><tr><th>name</th><th>added</th><th>price</th></tr></thead>
        <tbody>
          ${src.normalized.map((r, i) => {
            const dropped = r.name === "";
            return html`
              <tr key=${i} class=${dropped ? "junk" : ""}>
                <td>${dropped ? html`<span class="empty">dropped</span>` : r.name}</td>
                <td>${dropped ? "—" : r.added}</td>
                <td>${dropped ? "—" : fmtPrice(r.price)}</td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    </div>
  `;
}

// LOAD — store: the mapped rows from every source fly into the 🗄️ database.
function LoadStage({ active, reached, count }) {
  const rows = loaded.slice(0, count);
  return html`
    <${StageShell}
      kind="load"
      title="Load"
      layer=${{ key: "store", name: "data store" }}
      sub=" — write the unified rows in"
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
            ? html`<tr class="placeholder"><td colspan="3">waiting for mapped rows…</td></tr>`
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

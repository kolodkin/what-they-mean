import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import htm from "htm";
import { SPINE, FORK, APP_BOX, BY_ID, TRACE } from "./data.js";

const html = htm.bind(h);

// One step every T_STEP ms while the data is traced along the path. The token
// leaves a trail: every box it has reached stays lit, the current one pulses.
const T_STEP = 620;

function App() {
  const [step, setStep] = useState(-1); // -1 idle; 0..TRACE.length-1 while tracing
  const [phase, setPhase] = useState("idle"); // idle | tracing | done
  const [selected, setSelected] = useState(null); // clicked box id, or null
  const timers = useRef([]);

  useEffect(() => {
    window.__APP = { ready: true, phase, step, selected };
  }, [phase, step, selected]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function trace() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("tracing");
    setStep(0);
    for (let i = 1; i < TRACE.length; i++) {
      timers.current.push(setTimeout(() => setStep(i), i * T_STEP));
    }
    timers.current.push(setTimeout(() => setPhase("done"), TRACE.length * T_STEP));
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStep(-1);
    setPhase("idle");
    setSelected(null);
  }

  // Which boxes have been reached so far (cumulative), and which are pulsing.
  const litIds = new Set(TRACE.slice(0, step + 1).flat());
  const activeIds = new Set(step >= 0 ? TRACE[step] : []);
  const tracing = phase === "tracing";

  // The live caption under the controls: where the token is right now.
  const here =
    phase === "idle"
      ? null
      : step >= TRACE.length - 1
        ? { names: ["App"], role: "the data has arrived — drawn nicely for a person" }
        : {
            names: TRACE[step].map((id) => BY_ID[id].name),
            role: TRACE[step].map((id) => BY_ID[id].role).join(" / "),
          };

  const boxProps = (box) => ({
    box,
    lit: litIds.has(box.id),
    active: activeIds.has(box.id),
    selected: selected === box.id,
    onClick: () => setSelected(box.id),
  });

  const picked = selected ? BY_ID[selected] : null;

  return html`
    <main class="wrap">
      <header class="head">
        <h1>What is a data platform?</h1>
        <p class="lede">
          ${"A "}<strong>data platform</strong>${" is the whole "}
          <strong>journey your data takes</strong>${" from the messy outside "}
          ${"world to a clean answer on someone's screen. It's not one thing — "}
          ${"it's a line of boxes, each with one job, passing the data along "}
          ${"and "}<strong>refining it at every step</strong>${": raw copies "}
          ${"in "}<em>bronze</em>${", tidy rows in "}<em>silver</em>
          ${", ready-to-read answers in "}<em>gold</em>${". Below is the map. "}
          ${"Press "}<strong>Trace a piece of data</strong>${" to watch a "}
          ${"single coffee sale travel the whole path, or "}
          <strong>click any box</strong>${" to learn what it is."}
        </p>
        <div class="controls">
          <button class="run" onClick=${trace} disabled=${tracing}>
            ${phase === "idle" ? "▶ Trace a piece of data" : tracing ? "Tracing…" : "▶ Trace again"}
          </button>
          <button class="reset" onClick=${reset} disabled=${phase === "idle"}>Reset</button>
          ${here &&
          html`<span class="trace-caption">
            <strong>${here.names.join(" + ")}</strong> — ${here.role}
          </span>`}
        </div>
      </header>

      <!-- The map. A straight spine, then a fork (gold feeds both a backend and
           an agent), then both feed the final app. -->
      <div class="map">
        <div class="spine">
          ${SPINE.map(
            (box, i) => html`
              <${Box} ...${boxProps(box)} />
              ${i < SPINE.length - 1 &&
              html`<div class="arrow ${litIds.has(SPINE[i + 1].id) ? "on" : ""}">→</div>`}
            `
          )}
        </div>

        <div class="tail">
          <div class="arrow fork-in ${litIds.has("backend") ? "on" : ""}">→</div>
          <div class="fork">
            ${FORK.map((box) => html`<${Box} ...${boxProps(box)} />`)}
          </div>
          <div class="arrow fork-out ${litIds.has("app") ? "on" : ""}">→</div>
          <${Box} ...${boxProps(APP_BOX)} />
        </div>
      </div>

      <${Detail} box=${picked} />
    </main>
  `;
}

// One box on the map. Compact: icon + name, a layer tag for the metals, and the
// coffee sale in whatever form it takes here.
function Box({ box, lit, active, selected, onClick }) {
  const cls = [
    "box",
    `box-${box.id}`,
    box.layer ? `layer-${box.layer}` : "",
    lit ? "lit" : "",
    active ? "active" : "",
    selected ? "selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return html`
    <button class=${cls} onClick=${onClick} aria-pressed=${selected}>
      <span class="box-head">
        <span class="box-icon">${box.icon}</span>
        <span class="box-name">${box.name}</span>
        ${box.layer && html`<span class="box-layer">${box.layer}</span>`}
      </span>
      <span class="box-form">${box.form}</span>
      <code class="box-snap">${box.snapshot}</code>
    </button>
  `;
}

// The panel under the map: a fuller, plain-language explanation of one box.
function Detail({ box }) {
  if (!box) {
    return html`
      <section class="detail detail-empty">
        <p>Click any box above to see what it does — and what the coffee sale looks like there.</p>
      </section>
    `;
  }
  const cls = ["detail", box.layer ? `layer-${box.layer}` : ""].filter(Boolean).join(" ");
  return html`
    <section class=${cls}>
      <div class="detail-head">
        <span class="box-icon">${box.icon}</span>
        <h2>${box.name}</h2>
        ${box.layer && html`<span class="box-layer">${box.layer}</span>`}
      </div>
      <p class="detail-text">${box.detail}</p>
      <div class="detail-snap">
        <span class="detail-form">${box.form}</span>
        <code>${box.snapshot}</code>
      </div>
    </section>
  `;
}

render(html`<${App} />`, document.getElementById("app"));

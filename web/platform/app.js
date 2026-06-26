import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import htm from "htm";
import { ALL, BY_ID, TRACE } from "./data.js";

const html = htm.bind(h);

// --- the diagram's geometry ----------------------------------------------
// Everything is laid out in one fixed coordinate space (a "viewBox"). The wires
// are an SVG drawn in this space; the node cards are HTML positioned as a % of
// the same space, so ports and wire ends line up exactly. The canvas keeps this
// aspect ratio, so the two layers never drift apart.
const VB_W = 1240;
const VB_H = 360;
const NODE_W = 132;
const NODE_H = 92;

// A left-to-right flow with a fork at the end: the six-stage spine, then gold
// branches to a backend AND an agent, and both feed the app.
const LAYOUT = {
  connectors: { x: 16, y: 104 },
  bronze: { x: 167, y: 104 },
  normalize: { x: 318, y: 104 },
  silver: { x: 469, y: 104 },
  db: { x: 620, y: 104 },
  gold: { x: 771, y: 104 },
  backend: { x: 946, y: 24 },
  agent: { x: 946, y: 244 },
  app: { x: 1097, y: 104 },
};

// Directed wires between nodes. Order matters: the trace lights them in turn.
const EDGES = [
  ["connectors", "bronze"],
  ["bronze", "normalize"],
  ["normalize", "silver"],
  ["silver", "db"],
  ["db", "gold"],
  ["gold", "backend"],
  ["gold", "agent"],
  ["backend", "app"],
  ["agent", "app"],
];

const portOut = (id) => [LAYOUT[id].x + NODE_W, LAYOUT[id].y + NODE_H / 2];
const portIn = (id) => [LAYOUT[id].x, LAYOUT[id].y + NODE_H / 2];

// A horizontal-tangent cubic bezier from one node's right port to the next
// node's left port — the classic node-graph "wire" look, fork edges included.
function edgePath([from, to]) {
  const [x1, y1] = portOut(from);
  const [x2, y2] = portIn(to);
  const dx = Math.max(34, (x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

const pct = (v, span) => `${(v / span) * 100}%`;

// One step every T_STEP ms; the packet glides each wire in T_PACKET (< T_STEP).
const T_STEP = 760;
const T_PACKET = 600;

function App() {
  const [step, setStep] = useState(-1); // -1 idle; 0..TRACE.length-1 while tracing
  const [phase, setPhase] = useState("idle"); // idle | tracing | done
  const [selected, setSelected] = useState(null); // clicked node id, or null
  const timers = useRef([]);
  const wireRefs = useRef({}); // edge id -> the live <path>, for packet motion

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

  // Cumulative trail of reached nodes; the current step's nodes also pulse.
  const litIds = new Set(TRACE.slice(0, step + 1).flat());
  const activeIds = new Set(step >= 0 ? TRACE[step] : []);
  const tracing = phase === "tracing";

  // The wires whose data is in flight right now (their target just lit up).
  const activeEdges =
    tracing && step >= 0
      ? EDGES.filter(([, to]) => TRACE[step].includes(to)).map(([f, t]) => `${f}-${t}`)
      : [];

  const here =
    phase === "idle"
      ? null
      : step >= TRACE.length - 1
        ? { names: ["App"], role: "the data has arrived — drawn nicely for a person" }
        : {
            names: TRACE[step].map((id) => BY_ID[id].name),
            role: TRACE[step].map((id) => BY_ID[id].role).join(" / "),
          };

  const picked = selected ? BY_ID[selected] : null;

  return html`
    <main class="wrap">
      <header class="head">
        <h1>What is a data platform?</h1>
        <p class="lede">
          ${"A "}<strong>data platform</strong>${" is the whole "}
          <strong>journey your data takes</strong>${" from the messy outside "}
          ${"world to a clean answer on someone's screen. It's not one thing — "}
          ${"it's a wiring diagram of small parts, each with one job, that pass "}
          ${"the data along and "}<strong>refine it at every hop</strong>${": raw "}
          ${"copies in "}<em>bronze</em>${", tidy rows in "}<em>silver</em>
          ${", ready-to-read answers in "}<em>gold</em>${". Press "}
          <strong>Run the data</strong>${" to watch a single coffee sale flow "}
          ${"down the wires, or "}<strong>click any block</strong>${" to learn "}
          ${"what it is."}
        </p>
        <div class="controls">
          <button class="run" onClick=${trace} disabled=${tracing}>
            ${phase === "idle" ? "▶ Run the data" : tracing ? "Running…" : "▶ Run again"}
          </button>
          <button class="reset" onClick=${reset} disabled=${phase === "idle"}>Reset</button>
          ${here &&
          html`<span class="trace-caption">
            <strong>${here.names.join(" + ")}</strong> — ${here.role}
          </span>`}
        </div>
      </header>

      <div class="board">
        <div class="canvas">
          <!-- layer 1: the wires -->
          <svg class="wires" viewBox=${`0 0 ${VB_W} ${VB_H}`}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7"
                      markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="context-stroke" />
              </marker>
            </defs>
            ${EDGES.map((edge) => {
              const id = `${edge[0]}-${edge[1]}`;
              const on = litIds.has(edge[1]);
              const live = activeEdges.includes(id);
              return html`<path
                class=${`wire wire-${edge[0]} ${on ? "on" : ""} ${live ? "live" : ""}`}
                d=${edgePath(edge)}
                marker-end="url(#arrow)"
                ref=${(el) => el && (wireRefs.current[id] = el)}
              />`;
            })}
          </svg>

          <!-- layer 2: the node blocks -->
          ${ALL.map((box) => {
            const p = LAYOUT[box.id];
            const cls = [
              "node",
              `node-${box.id}`,
              box.layer ? `layer-${box.layer}` : "",
              litIds.has(box.id) ? "lit" : "",
              activeIds.has(box.id) ? "active" : "",
              selected === box.id ? "selected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const style =
              `left:${pct(p.x, VB_W)};top:${pct(p.y, VB_H)};` +
              `width:${pct(NODE_W, VB_W)};height:${pct(NODE_H, VB_H)}`;
            return html`
              <button
                class=${cls}
                style=${style}
                onClick=${() => setSelected(box.id)}
                aria-pressed=${selected === box.id}
              >
                <span class="node-top">
                  <span class="node-icon">${box.icon}</span>
                  <span class="node-name">${box.name}</span>
                  ${box.layer && html`<span class="node-layer">${box.layer}</span>`}
                </span>
                <code class="node-snap">${box.snapshot}</code>
              </button>
            `;
          })}

          <!-- layer 3: the data packets in flight -->
          <${Packets} edgeKey=${activeEdges.join("|")} edges=${activeEdges} wireRefs=${wireRefs} />
        </div>
      </div>

      <${Detail} box=${picked} />
    </main>
  `;
}

// A glowing pill, labelled with the data's current form, that rides each live
// wire from the source port to the target port — measured straight off the SVG
// path, so it follows the exact curve, fork and all.
function Packets({ edgeKey, edges, wireRefs }) {
  const [pts, setPts] = useState([]);

  useEffect(() => {
    if (!edges.length) {
      setPts([]);
      return;
    }
    const paths = edges.map((id) => wireRefs.current[id]).filter(Boolean);
    const lens = paths.map((p) => p.getTotalLength());
    const labels = edges.map((id) => BY_ID[id.split("-")[1]].form);
    let raf;
    let start = null;
    function frame(ts) {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / T_PACKET);
      // ease-in-out so the packet accelerates off the port and settles in
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      setPts(
        paths.map((p, i) => {
          const at = p.getPointAtLength(lens[i] * e);
          return { x: at.x, y: at.y, label: labels[i], id: edges[i] };
        })
      );
      if (t < 1) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [edgeKey]);

  return pts.map(
    (p) => html`
      <div class="packet" style=${`left:${pct(p.x, VB_W)};top:${pct(p.y, VB_H)}`}>
        <span>${p.label}</span>
      </div>
    `
  );
}

// The panel under the diagram: a fuller, plain-language read on one block.
function Detail({ box }) {
  if (!box) {
    return html`
      <section class="detail detail-empty">
        <p>Click any block above to see what it does — and what the coffee sale looks like there.</p>
      </section>
    `;
  }
  const cls = ["detail", box.layer ? `layer-${box.layer}` : ""].filter(Boolean).join(" ");
  return html`
    <section class=${cls}>
      <div class="detail-head">
        <span class="node-icon">${box.icon}</span>
        <h2>${box.name}</h2>
        ${box.layer && html`<span class="node-layer">${box.layer}</span>`}
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

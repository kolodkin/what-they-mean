import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import htm from "htm";
import { SCHEMA, LEAVES, buildQuery, runQuery, SEED, MUTATIONS, canSend, mutate, INSPECTS } from "./data.js";

const html = htm.bind(h);

// On a phone the panes stack, so what a step changes can land below the fold.
// Bring it into view the shortest way, only if it isn't already, and without
// animating for anyone who asked their system for less motion.
function reveal(el) {
  const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (el) el.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
}

// On a phone the read panes scroll sideways as one; keep them at the left edge
// and only scroll the page down to them.
function revealRead() {
  const split = document.querySelector(".split");
  split.scrollLeft = 0;
  reveal(split);
}

// Reading tour: scroll to the panes first, then start ticking once they've settled.
const SETTLE = 800;

function App() {
  const [mode, setMode] = useState("read"); // read | change | inspect
  const [picked, setPicked] = useState(() => new Set(["name", "minutes"]));
  const [shelf, setShelf] = useState(SEED);
  const [last, setLast] = useState(null); // { m, answer, touched }
  const [asked, setAsked] = useState(null); // an INSPECTS entry
  const [playing, setPlaying] = useState(false);
  const timers = useRef([]);
  // The server reads the latest shelf even when fired from a tour timer.
  const shelfRef = useRef(shelf);

  function toggle(leaf) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(leaf) ? next.delete(leaf) : next.add(leaf);
      return next;
    });
  }

  function send(m) {
    const res = mutate(shelfRef.current, m);
    shelfRef.current = res.shelf;
    setShelf(res.shelf);
    setLast({ m, ...res });
  }

  function reset() {
    shelfRef.current = SEED;
    setShelf(SEED);
    setLast(null);
  }

  function stopTour() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPlaying(false);
  }

  function switchMode(next) {
    stopTour();
    setMode(next);
  }

  // Auto-tour, 2s a step. Reading: start from nothing and tick one field at a
  // time, so the query and the answer grow together. Changing: start from a
  // fresh shelf and send each mutation in turn. Inspecting: ask each question.
  function playTour() {
    if (playing) return stopTour();
    setPlaying(true);
    const read = mode === "read";
    const steps = read
      ? [() => setPicked(new Set()), ...LEAVES.map((leaf) => () => setPicked((p) => new Set([...p, leaf])))]
      : mode === "change"
        ? [reset, ...MUTATIONS.map((m) => () => send(m))]
        : INSPECTS.map((q) => () => setAsked(q));
    const start = read ? SETTLE : 0;
    if (read) revealRead();
    steps.forEach((step, i) => timers.current.push(setTimeout(step, start + i * 2000)));
    timers.current.push(setTimeout(stopTour, start + steps.length * 2000));
  }

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (playing) revealRead();
  }, [picked]);

  useEffect(() => {
    if (last) reveal(document.querySelector(".shelf"));
  }, [last]);

  // On a phone the questions are one sideways-scrolling row; scroll the row
  // itself (not the page) so the one just asked is in sight.
  useEffect(() => {
    const row = document.querySelector(".asks");
    const btn = row && row.querySelector(".ask.current");
    if (btn && row.scrollWidth > row.clientWidth) row.scrollTo({ left: btn.parentNode.offsetLeft - row.offsetLeft - 22, behavior: "smooth" });
  }, [asked]);

  useEffect(() => {
    window.__APP = { ready: true, mode, picked: [...picked], count: shelf.length, asked: asked && asked.says };
  }, [mode, picked, shelf, asked]);

  return html`
    <header class="page-head">
      <div>
        <p class="page-explain">
          <strong>GraphQL</strong> is a <em>single endpoint</em> for entities and their
          relationships. The data is a <em>graph</em>: a recipe links to its author and
          its ingredients. You send a <em>query</em> shaped like a tree — the fields you want,
          nested under the things they belong to — and get back exactly that shape, in <em>one trip</em>.
          Changing data goes to the same endpoint: a <em>mutation</em> says what to add, change or delete.
          And the endpoint can <em>describe itself</em>: ask it what types, fields and mutations exist.
        </p>
        <div class="tabs">
          <button class=${`tab ${mode === "read" ? "current" : ""}`} onClick=${() => switchMode("read")}>
            Ask for data
          </button>
          <button class=${`tab ${mode === "change" ? "current" : ""}`} onClick=${() => switchMode("change")}>
            Change data
          </button>
          <button class=${`tab ${mode === "inspect" ? "current" : ""}`} onClick=${() => switchMode("inspect")}>
            Ask what exists
          </button>
        </div>
      </div>
      <div class="page-controls">
        <a class="back" href="../">← All concepts</a>
        <button class=${`play ${playing ? "active" : ""}`} onClick=${playTour}>
          ${playing ? "■ Stop" : "▶ Play demo"}
        </button>
      </div>
    </header>
    ${mode === "read"
      ? html`<${ReadView} picked=${picked} toggle=${toggle} playing=${playing} />`
      : mode === "change"
        ? html`<${ChangeView} shelf=${shelf} last=${last} send=${send} reset=${reset} playing=${playing} />`
        : html`<${InspectView} asked=${asked} ask=${setAsked} playing=${playing} />`}
  `;
}

function ReadView({ picked, toggle, playing }) {
  const answer = runQuery(picked);

  return html`
    <main class="split read">
      <section class="pane pane-ask">
        <div class="pane-label">
          <span class="badge badge-app">What you want</span>
          <span class="pane-sub">tick any fields</span>
        </div>
        <ul class="fields">
          ${SCHEMA.map((f) =>
            f.children
              ? html`
                  <li key=${f.key} class="group">
                    <span class="group-name">${f.key}</span>
                    <ul>
                      ${f.children.map((c) => html`<${Field} key=${c} leaf=${`${f.key}.${c}`} label=${c} picked=${picked} toggle=${toggle} disabled=${playing} />`)}
                    </ul>
                  </li>
                `
              : html`<${Field} key=${f.key} leaf=${f.key} label=${f.key} picked=${picked} toggle=${toggle} disabled=${playing} />`
          )}
        </ul>
      </section>

      <section class="pane pane-wire">
        <div class="pane-label">
          <span class="badge badge-api">The query API</span>
          <span class="pane-sub">POST /graphql</span>
        </div>
        <pre class="code query">${buildQuery(picked)}</pre>
        <div class="pane-label">
          <span class="badge badge-api">The answer</span>
          <span class="pane-sub">the same shape, filled in</span>
        </div>
        <pre class="code answer">${JSON.stringify(answer, null, 2)}</pre>
      </section>
    </main>
  `;
}

function Field({ leaf, label, picked, toggle, disabled }) {
  return html`
    <li>
      <label class=${`field ${picked.has(leaf) ? "on" : ""}`}>
        <input type="checkbox" data-leaf=${leaf} checked=${picked.has(leaf)} onChange=${() => toggle(leaf)} disabled=${disabled} />
        ${label}
      </label>
    </li>
  `;
}

function ChangeView({ shelf, last, send, reset, playing }) {
  return html`
    <main class="split">
      <section class="pane pane-ask">
        <div class="pane-label">
          <span class="badge badge-app">The mutation API</span>
          <span class="pane-sub">click one to send it to POST /graphql</span>
        </div>
        <ul class="mutations">
          ${MUTATIONS.map(
            (m) => html`
              <li key=${m.op}>
                <button class=${`mut ${last && last.m === m ? "current" : ""}`} onClick=${() => send(m)} disabled=${playing || !canSend(shelf, m)}>
                  <span class="says">${m.says}</span>
                  <pre class="code query">${m.text}</pre>
                </button>
              </li>
            `
          )}
        </ul>
      </section>

      <section class="pane pane-wire">
        <div class="pane-label">
          <span class="badge badge-api">The server</span>
          <span class="pane-sub">what it keeps</span>
        </div>
        <div class="shelf">
          ${shelf.map(
            (r) => html`
              <div key=${r.id} class=${`item ${last && last.touched === r.id ? "glow" : ""}`}>
                <span class="item-id">${r.id}</span>
                <strong>${r.name}</strong>
                <span class="item-min">${r.minutes} min</span>
              </div>
            `
          )}
          ${shelf.length === 0 && html`<p class="empty">The shelf is empty.</p>`}
        </div>
        <button class="reset" onClick=${reset} disabled=${playing}>Reset the shelf</button>

        <div class="pane-label">
          <span class="badge badge-api">What came back</span>
          <span class="pane-sub">only the fields the mutation asked for</span>
        </div>
        ${last
          ? html`<pre class="code answer">${JSON.stringify(last.answer, null, 2)}</pre>`
          : html`<p class="empty">Pick a mutation to send it.</p>`}
      </section>
    </main>
  `;
}

function InspectView({ asked, ask, playing }) {
  return html`
    <main class="split">
      <section class="pane pane-ask">
        <div class="pane-label">
          <span class="badge badge-app">Questions about the API itself</span>
          <span class="pane-sub">click one to send it to POST /graphql</span>
        </div>
        <ul class="mutations asks">
          ${INSPECTS.map(
            (q) => html`
              <li key=${q.says}>
                <button class=${`mut ask ${asked === q ? "current" : ""}`} onClick=${() => ask(q)} disabled=${playing}>
                  <span class="says">${q.says}</span>
                  <pre class="code query">${q.text}</pre>
                </button>
              </li>
            `
          )}
        </ul>
      </section>

      <section class="pane pane-wire">
        <div class="pane-label">
          <span class="badge badge-api">The answer</span>
          <span class="pane-sub">the schema, read like any other data</span>
        </div>
        ${asked
          ? html`<pre class="code answer">${JSON.stringify(asked.answer, null, 2)}</pre>`
          : html`<p class="empty">Pick a question to send it.</p>`}
      </section>
    </main>
  `;
}

render(html`<${App} />`, document.getElementById("app"));

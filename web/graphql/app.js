import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import htm from "htm";
import { SCHEMA, LEAVES, buildQuery, runQuery, restTrips, SEED, MUTATIONS, mutate } from "./data.js";

const html = htm.bind(h);

// On a phone the panes stack, so what a step changes can land below the fold.
// Bring it into view the shortest way, only if it isn't already, and without
// animating for anyone who asked their system for less motion.
function reveal(el) {
  const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (el) el.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
}

function App() {
  const [mode, setMode] = useState("read"); // read | change
  const [picked, setPicked] = useState(() => new Set(["name", "minutes"]));
  const [shelf, setShelf] = useState(SEED);
  const [last, setLast] = useState(null); // { m, answer, touched }
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
  // fresh shelf and send each mutation in turn.
  function playTour() {
    if (playing) return stopTour();
    setPlaying(true);
    const steps =
      mode === "read"
        ? [() => setPicked(new Set()), ...LEAVES.map((leaf) => () => setPicked((p) => new Set([...p, leaf])))]
        : [reset, ...MUTATIONS.map((m) => () => send(m))];
    steps.forEach((step, i) => timers.current.push(setTimeout(step, i * 2000)));
    timers.current.push(setTimeout(stopTour, steps.length * 2000));
  }

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (playing) reveal(document.querySelector(".pane-wire"));
  }, [picked]);

  useEffect(() => {
    if (last) reveal(document.querySelector(".pane-ask"));
  }, [last]);

  useEffect(() => {
    window.__APP = { ready: true, mode, picked: [...picked], count: shelf.length };
  }, [mode, picked, shelf]);

  return html`
    <header class="page-head">
      <div>
        <p class="page-explain">
          <strong>GraphQL</strong> is one single address you send a <em>shopping list</em> to.
          Instead of picking from a menu of fixed answers, you write down exactly the
          fields you want — even from related things, like the recipe's author — and
          get back exactly that, in <em>one trip</em>. Changing data goes to the very same
          address: a <em>mutation</em> says what to add, change or delete.
        </p>
        <div class="tabs">
          <button class=${`tab ${mode === "read" ? "current" : ""}`} onClick=${() => switchMode("read")}>
            Ask for data
          </button>
          <button class=${`tab ${mode === "change" ? "current" : ""}`} onClick=${() => switchMode("change")}>
            Change data
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
      : html`<${ChangeView} shelf=${shelf} last=${last} send=${send} reset=${reset} playing=${playing} />`}
  `;
}

function ReadView({ picked, toggle, playing }) {
  const answer = runQuery(picked);
  const trips = restTrips(picked);
  const restBytes = trips.reduce((n, t) => n + t.bytes, 0);
  const gqlBytes = JSON.stringify(answer).length;

  return html`
    <main class="split">
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

        <div class="block-title">Trips to the server</div>
        <div class="compare">
          <div class="side">
            <span class="side-name">REST</span>
            ${trips.map((t) => html`<code key=${t.path} class="trip trip-rest">GET ${t.path}</code>`)}
            <span class="weight">${trips.length} trip${trips.length > 1 ? "s" : ""} · ${restBytes} bytes</span>
          </div>
          <div class="side">
            <span class="side-name">GraphQL</span>
            <code class="trip trip-gql">POST /graphql</code>
            <span class="weight">1 trip · ${gqlBytes} bytes</span>
          </div>
        </div>
      </section>

      <section class="pane pane-wire">
        <div class="pane-label">
          <span class="badge badge-api">The query</span>
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
          <span class="badge badge-app">The server</span>
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
          <span class="badge badge-app">The answer</span>
          <span class="pane-sub">${last ? html`to <code class="sent">${last.m.op}</code> — ` : ""}only the fields it asked for</span>
        </div>
        ${last
          ? html`<pre class=${`code answer ${last.answer.errors ? "has-errors" : ""}`}>${JSON.stringify(last.answer, null, 2)}</pre>`
          : html`<p class="empty">Pick a mutation to send it.</p>`}
      </section>

      <section class="pane pane-wire">
        <div class="pane-label">
          <span class="badge badge-api">The mutations</span>
          <span class="pane-sub">all sent to POST /graphql</span>
        </div>
        <ul class="mutations">
          ${MUTATIONS.map(
            (m) => html`
              <li key=${m.op}>
                <button class=${`mut ${last && last.m === m ? "current" : ""}`} onClick=${() => send(m)} disabled=${playing}>
                  <pre class="code query">${m.text}</pre>
                  <span class="says">${m.says}</span>
                </button>
              </li>
            `
          )}
        </ul>
      </section>
    </main>
  `;
}

render(html`<${App} />`, document.getElementById("app"));

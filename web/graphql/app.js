import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import htm from "htm";
import { SCHEMA, LEAVES, buildQuery, runQuery, restTrips } from "./data.js";

const html = htm.bind(h);

function App() {
  const [picked, setPicked] = useState(() => new Set(["name", "minutes"]));
  const [playing, setPlaying] = useState(false);
  const timers = useRef([]);

  function toggle(leaf) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(leaf) ? next.delete(leaf) : next.add(leaf);
      return next;
    });
  }

  function stopTour() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPlaying(false);
  }

  // Auto-tour: start from nothing and tick one field every 2s, so the query
  // and the answer visibly grow together.
  function playTour() {
    if (playing) return stopTour();
    setPlaying(true);
    setPicked(new Set());
    LEAVES.forEach((leaf, i) =>
      timers.current.push(setTimeout(() => setPicked((p) => new Set([...p, leaf])), (i + 1) * 2000))
    );
    timers.current.push(setTimeout(stopTour, (LEAVES.length + 1) * 2000));
  }

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const answer = runQuery(picked);
  const answerText = JSON.stringify(answer, null, 2);
  const trips = restTrips(picked);
  const restBytes = trips.reduce((n, t) => n + t.bytes, 0);
  const gqlBytes = JSON.stringify(answer).length;

  useEffect(() => {
    window.__APP = { ready: true, picked: [...picked] };
  }, [picked]);

  return html`
    <header class="page-head">
      <p class="page-explain">
        <strong>GraphQL</strong> is one single address you send a <em>shopping list</em> to.
        Instead of picking from a menu of fixed answers, you write down exactly the
        fields you want — even from related things, like the recipe's author — and
        get back exactly that, in <em>one trip</em>. Tick fields to change the list.
      </p>
      <div class="page-controls">
        <a class="back" href="../">← All concepts</a>
        <button class=${`play ${playing ? "active" : ""}`} onClick=${playTour}>
          ${playing ? "■ Stop" : "▶ Play demo"}
        </button>
      </div>
    </header>
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
        <pre class="code answer">${answerText}</pre>
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

render(html`<${App} />`, document.getElementById("app"));

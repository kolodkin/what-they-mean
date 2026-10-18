import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import htm from "htm";
import { SEED, REQUESTS, handle, STATUS_TEXT } from "./data.js";

const html = htm.bind(h);

function App() {
  const [shelf, setShelf] = useState(SEED);
  const [last, setLast] = useState(null); // { req, status, body, touched }
  const [playing, setPlaying] = useState(false);
  const timers = useRef([]);
  // The handler reads the latest shelf even when fired from a tour timer.
  const shelfRef = useRef(shelf);

  function send(req) {
    const res = handle(shelfRef.current, req);
    shelfRef.current = res.shelf;
    setShelf(res.shelf);
    setLast({ req, ...res });
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

  // Auto-tour: start from a fresh shelf, then send each request 2s apart.
  function playTour() {
    if (playing) return stopTour();
    reset();
    setPlaying(true);
    REQUESTS.forEach((req, i) => timers.current.push(setTimeout(() => send(req), i * 2000)));
    timers.current.push(setTimeout(stopTour, REQUESTS.length * 2000));
  }

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    window.__APP = { ready: true, count: shelf.length, status: last ? last.status : null };
  }, [shelf, last]);

  return html`
    <header class="page-head">
      <p class="page-explain">
        A <strong>REST API</strong> is a menu of <em>addresses</em>, one per kind of
        thing — <code>/recipes</code>, <code>/recipes/2</code>. You pair an address
        with a <em>verb</em> — GET to look, POST to add, PUT to replace the whole thing,
        PATCH to change one part of it, DELETE to remove — and the server answers with a number saying how it went, plus the data.
      </p>
      <div class="page-controls">
        <a class="back" href="../">← All concepts</a>
        <button class=${`play ${playing ? "active" : ""}`} onClick=${playTour}>
          ${playing ? "■ Stop" : "▶ Play demo"}
        </button>
      </div>
    </header>
    <main class="split">
      <section class="pane pane-menu">
        <div class="pane-label">
          <span class="badge badge-api">The requests</span>
          <span class="pane-sub">verb + address</span>
        </div>
        <ul class="requests">
          ${REQUESTS.map(
            (req, i) => html`
              <li key=${i}>
                <button
                  class=${`req ${last && last.req === req ? "current" : ""}`}
                  onClick=${() => send(req)}
                  disabled=${playing}
                >
                  <code class="http-line">
                    <span class=${`method m-${req.method}`}>${req.method}</span> ${req.path}
                  </code>
                  ${req.body && html`<code class="body">${JSON.stringify(req.body)}</code>`}
                  <span class="says">${req.says}</span>
                </button>
              </li>
            `
          )}
        </ul>
        <button class="reset" onClick=${reset} disabled=${playing}>Reset the shelf</button>
      </section>

      <section class="pane pane-server">
        <div class="pane-label">
          <span class="badge badge-app">The server</span>
          <span class="pane-sub">what it keeps, and what it said back</span>
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

        <div class="block-title">Response</div>
        ${last
          ? html`
              <div class="response">
                <span class=${`status s${String(last.status)[0]}`}>
                  ${last.status} ${STATUS_TEXT[last.status]}
                </span>
                <pre class="json">${last.body == null ? "(nothing — it's gone)" : JSON.stringify(last.body, null, 2)}</pre>
              </div>
            `
          : html`<p class="empty">Pick a request on the left to send it.</p>`}
      </section>
    </main>
  `;
}

render(html`<${App} />`, document.getElementById("app"));

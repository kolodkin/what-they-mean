import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import htm from "htm";
import { SEED, REQUESTS, handle, STATUS_TEXT, DOING } from "./data.js";

const html = htm.bind(h);

function App() {
  const [shelf, setShelf] = useState(SEED);
  const [last, setLast] = useState(null); // { req, status, body, touched }
  const [playing, setPlaying] = useState(false);
  const [leaving, setLeaving] = useState(null); // id of a card fading out after DELETE
  const timers = useRef([]);
  const fade = useRef(null);
  // The handler reads the latest shelf even when fired from a tour timer.
  const shelfRef = useRef(shelf);

  function send(req) {
    const res = handle(shelfRef.current, req);
    const gone = shelfRef.current.find((r) => !res.shelf.some((s) => s.id === r.id));
    shelfRef.current = res.shelf;
    clearTimeout(fade.current);
    setLeaving(gone ? gone.id : null);
    // A deleted card stays on screen while it fades, then the shelf catches up.
    if (gone) fade.current = setTimeout(() => (setShelf(res.shelf), setLeaving(null)), 300);
    else setShelf(res.shelf);
    setLast({ req, ...res });
  }

  function reset() {
    clearTimeout(fade.current);
    shelfRef.current = SEED;
    setShelf(SEED);
    setLeaving(null);
    setLast(null);
  }

  function stopTour() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPlaying(false);
  }

  // Auto-tour: start from a fresh shelf, send each request 2s apart, then clean the shelf.
  function playTour() {
    if (playing) return stopTour();
    reset();
    setPlaying(true);
    REQUESTS.forEach((req, i) => timers.current.push(setTimeout(() => send(req), i * 2000)));
    timers.current.push(setTimeout(() => (reset(), stopTour()), REQUESTS.length * 2000));
  }

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!last) return;
    // On a phone the requests are one sideways-scrolling row; scroll the row
    // itself (not the page) so the one just sent is in sight.
    const row = document.querySelector(".requests");
    const btn = row.querySelector(".req.current");
    if (btn && row.scrollWidth > row.clientWidth) row.scrollTo({ left: btn.offsetLeft - row.offsetLeft - 16, behavior: "smooth" });
    // During the tour pin the request bar to the same spot every step, so the page
    // never jumps as answers grow and shrink (the pane keeps room below it to stay put).
    if (playing) {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.querySelector(".ask").scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
    }
  }, [last]);

  useEffect(() => {
    window.__APP = { ready: true, count: shelf.length, status: last ? last.status : null };
  }, [shelf, last]);

  return html`
    <header class="page-head">
      <p class="page-explain">
        A <strong>REST API</strong> is a menu of <em>addresses</em>, one per <em>resource</em> (a thing the
        server keeps) — <code>/recipes</code>, <code>/recipes/2</code>. You pair an address
        with a <em>verb</em> — GET to look, POST to add, PUT to replace the whole thing,
        PATCH to change only the fields you send, DELETE to remove — and the server answers with a number saying how it went, plus the data.
      </p>
      <div class="page-controls">
        <a class="back" href="../">← All concepts</a>
        <button class=${`play ${playing ? "active" : ""}`} onClick=${playTour}>
          ${playing ? "■ Stop" : "▶ Play demo"}
        </button>
      </div>
    </header>
    <main class=${`pane pane-server ${playing ? "playing" : ""}`}>
      <section class="ask">
        <div class="pane-label">
          <span class="badge badge-api">Send a request</span>
          <span class="pane-sub">verb + address</span>
          <button class="reset" onClick=${reset} disabled=${playing}>Reset the shelf</button>
        </div>
        <div class="requests" role="group" aria-label="Requests">
          ${REQUESTS.map(
            (req, i) => html`
              <button
                key=${i}
                class=${`req ${last && last.req === req ? "current" : ""}`}
                onClick=${() => send(req)}
                disabled=${playing}
                title=${req.says}
              >
                <code class="http-line"><span class=${`method m-${req.method}`}>${req.method}</span> ${req.path}</code>
              </button>
            `
          )}
        </div>
        ${last
          ? html`
              <p class="says">${last.req.says}</p>
              ${last.req.body && html`<code class="body">${JSON.stringify(last.req.body)}</code>`}
            `
          : html`<p class="says">Pick a request to send it.</p>`}
      </section>

      <div class="pane-label">
        <span class="badge badge-app">The server</span>
        ${playing && last && html`<span class=${`doing m-${last.req.method}`}>${DOING[last.req.method]}</span>`}
        <span class="pane-sub">what it keeps</span>
      </div>
      <div class="shelf">
        ${shelf.map(
          (r) => html`
            <div key=${r.id} class=${`item ${last && last.touched === r.id ? "glow" : ""} ${r.id === leaving ? "leaving" : ""}`}>
              <span class="item-id">${r.id}</span>
              <strong>${r.name}</strong>
              <span class="item-min">${r.minutes} min</span>
            </div>
          `
        )}
        ${shelf.length === 0 && html`<p class="empty">The shelf is empty.</p>`}
      </div>

      ${last &&
      html`
        <div class="block-title">
          Response to <code class="sent">${last.req.method} ${last.req.path}</code>
        </div>
        <div class="response">
          <span class=${`status s${String(last.status)[0]}`}>
            ${last.status} ${STATUS_TEXT[last.status]}
          </span>
          <pre class="json">${last.body == null ? "(nothing — it's gone)" : JSON.stringify(last.body, null, 2)}</pre>
        </div>
      `}
    </main>
  `;
}

render(html`<${App} />`, document.getElementById("app"));

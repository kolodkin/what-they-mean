import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import htm from "htm";
import { SCENARIOS, SIDES } from "./data.js";

const html = htm.bind(h);
const STEP_MS = 4000;

function App() {
  const [picked, setPicked] = useState("all"); // "all" or a scenario id
  const [playing, setPlaying] = useState(false);
  const timers = useRef([]);

  function stopTour() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPlaying(false);
  }

  // Auto-tour: sweep slowly through every situation — there's more to read per
  // step here than in the other demos — then land back on "All".
  function playTour() {
    if (playing) return stopTour();
    setPlaying(true);
    const steps = [...SCENARIOS.map((s) => s.id), "all"];
    steps.forEach((id, i) => timers.current.push(setTimeout(() => setPicked(id), i * STEP_MS)));
    timers.current.push(setTimeout(stopTour, (steps.length - 1) * STEP_MS));
  }

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    window.__APP = { ready: true, picked };
  }, [picked]);

  const scenario = SCENARIOS.find((s) => s.id === picked);

  return html`
    <header class="page-head">
      <p class="page-explain">
        <strong>REST</strong> and <strong>GraphQL</strong> are two ways for an app to ask a
        server for data. Neither one always wins — it depends on the job. Pick a situation
        and see which side has the easier time; every situation adds a <em>pro</em> to the
        side that wins it and a <em>con</em> to the side that doesn't. "All situations" shows
        the full list.
      </p>
      <div class="page-controls">
        <a class="back" href="../">← All concepts</a>
        <button class=${`play ${playing ? "active" : ""}`} onClick=${playTour}>
          ${playing ? "■ Stop" : "▶ Play demo"}
        </button>
      </div>
    </header>

    <nav class="scenarios">
      <button class=${`scenario all ${picked === "all" ? "current" : ""}`} onClick=${() => setPicked("all")} disabled=${playing}>
        All situations
      </button>
      ${SCENARIOS.map(
        (s) => html`
          <button
            key=${s.id}
            class=${`scenario win-${s.winner} ${s.id === picked ? "current" : ""}`}
            onClick=${() => setPicked(s.id)}
            disabled=${playing}
          >
            ${s.title}
          </button>
        `
      )}
    </nav>

    <main class="split">
      ${SIDES.map((side) => html`<${Side} key=${side.id} side=${side} scenario=${scenario} setPicked=${setPicked} />`)}
    </main>
  `;
}

function Side({ side, scenario, setPicked }) {
  // With one situation picked, only its pro and con are relevant; "All" lists every one.
  const shown = scenario ? [scenario] : SCENARIOS;
  const pros = shown.filter((s) => s.winner === side.id);
  const cons = shown.filter((s) => s.winner !== side.id);
  const wins = scenario && scenario.winner === side.id;
  const point = (s, kind) => html`
    <li key=${s.id}>
      <button class=${`point ${kind} ${scenario ? "current" : ""}`} onClick=${() => setPicked(s.id)}>
        ${s[side.id].point}
      </button>
    </li>
  `;

  return html`
    <section class=${`side side-${side.id} ${scenario ? (wins ? "wins" : "loses") : ""}`}>
      <div class="side-head">
        <h2>${side.name}</h2>
        ${scenario
          ? html`<span class="verdict">${wins ? "easier here" : "harder here"}</span>`
          : html`<span class="tally">${pros.length} pros · ${cons.length} cons</span>`}
      </div>
      ${scenario &&
      html`
        <pre class="wire">${scenario[side.id].lines.join("\n")}</pre>
        <p class="note">${scenario[side.id].note}</p>
      `}
      <div class="lists">
        <div>
          <div class="list-title">Pros</div>
          <ul class="points">${pros.length ? pros.map((s) => point(s, "pro")) : html`<li class="none">—</li>`}</ul>
        </div>
        <div>
          <div class="list-title">Cons</div>
          <ul class="points">${cons.length ? cons.map((s) => point(s, "con")) : html`<li class="none">—</li>`}</ul>
        </div>
      </div>
    </section>
  `;
}

render(html`<${App} />`, document.getElementById("app"));

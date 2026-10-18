import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import htm from "htm";
import { SCENARIOS, SIDES } from "./data.js";

const html = htm.bind(h);

function App() {
  const [picked, setPicked] = useState(SCENARIOS[0].id);
  const [playing, setPlaying] = useState(false);
  const timers = useRef([]);

  function stopTour() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPlaying(false);
  }

  // Auto-tour: step through every situation, 3s each — there's more to read
  // per step here than in the other demos.
  function playTour() {
    if (playing) return stopTour();
    setPlaying(true);
    SCENARIOS.forEach((s, i) => timers.current.push(setTimeout(() => setPicked(s.id), i * 3000)));
    timers.current.push(setTimeout(stopTour, SCENARIOS.length * 3000));
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
        side that wins it and a <em>con</em> to the side that doesn't.
      </p>
      <div class="page-controls">
        <a class="back" href="../">← All concepts</a>
        <button class=${`play ${playing ? "active" : ""}`} onClick=${playTour}>
          ${playing ? "■ Stop" : "▶ Play demo"}
        </button>
      </div>
    </header>

    <nav class="scenarios">
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
      ${SIDES.map((side) => html`<${Side} key=${side.id} side=${side} scenario=${scenario} picked=${picked} setPicked=${setPicked} />`)}
    </main>
  `;
}

function Side({ side, scenario, picked, setPicked }) {
  const mine = scenario[side.id];
  const wins = scenario.winner === side.id;
  const pros = SCENARIOS.filter((s) => s.winner === side.id);
  const cons = SCENARIOS.filter((s) => s.winner !== side.id);
  const point = (s, kind) => html`
    <li key=${s.id}>
      <button class=${`point ${kind} ${s.id === picked ? "current" : ""}`} onClick=${() => setPicked(s.id)}>
        ${s[side.id].point}
      </button>
    </li>
  `;

  return html`
    <section class=${`side side-${side.id} ${wins ? "wins" : "loses"}`}>
      <div class="side-head">
        <h2>${side.name}</h2>
        <span class="verdict">${wins ? "easier here" : "harder here"}</span>
      </div>
      <pre class="wire">${mine.lines.join("\n")}</pre>
      <p class="note">${mine.note}</p>
      <div class="lists">
        <div>
          <div class="list-title">Pros</div>
          <ul class="points">${pros.map((s) => point(s, "pro"))}</ul>
        </div>
        <div>
          <div class="list-title">Cons</div>
          <ul class="points">${cons.map((s) => point(s, "con"))}</ul>
        </div>
      </div>
    </section>
  `;
}

render(html`<${App} />`, document.getElementById("app"));

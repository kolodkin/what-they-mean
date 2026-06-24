import { h, render } from "preact";
import { useEffect, useState } from "preact/hooks";
import htm from "htm";

const html = htm.bind(h);

// The "endpoint" our app talks to. On GitHub Pages this is a static file, but
// fetching it is a genuine HTTP GET that returns JSON — exactly what a real
// REST API call looks like from the browser's point of view. It sits next to
// this page, so the URL is relative to web/api/.
const API_URL = "./recipe.json";

// Each field of the response gets a colour. The same colour is used in the raw
// JSON below and in the pretty app above, so a non-developer can literally see
// which piece of data becomes which piece of the screen.
const FIELDS = {
  name: { color: "#2563eb", label: "name", hint: "the title" },
  ingredients: { color: "#16a34a", label: "ingredients", hint: "the shopping list" },
  recipe: { color: "#ea580c", label: "recipe", hint: "the steps" },
};

function App() {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(null);
  const [active, setActive] = useState(null); // which field is being hovered

  async function sendRequest() {
    setStatus("loading");
    setError(null);
    const started = performance.now();
    try {
      // A tiny artificial delay so the "request in flight" moment is visible.
      await new Promise((r) => setTimeout(r, 450));
      const res = await fetch(API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const json = await res.json();
      setData(json);
      setElapsed(Math.round(performance.now() - started));
      setStatus("done");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  // Fire one request automatically so the page is alive on first load.
  useEffect(() => {
    sendRequest();
  }, []);

  // Expose a small readiness signal for end-to-end tests to wait on.
  useEffect(() => {
    window.__APP = { status, ready: status === "done", name: data ? data.name : null };
  }, [status, data]);

  return html`
    <main class="split">
      <${AppPane} status=${status} data=${data} active=${active} setActive=${setActive} />
      <${ApiPane}
        status=${status}
        data=${data}
        error=${error}
        elapsed=${elapsed}
        active=${active}
        setActive=${setActive}
        onSend=${sendRequest}
      />
    </main>
  `;
}

// ---------------------------------------------------------------------------
// TOP HALF — what the user sees: a polished cooking-app recipe card.
// ---------------------------------------------------------------------------
function AppPane({ status, data, active, setActive }) {
  const dim = (field) => (active && active !== field ? "dim" : "");
  const glow = (field) => (active === field ? "glow" : "");

  return html`
    <section class="pane pane-app">
      <div class="pane-label">
        <span class="badge badge-app">The app</span>
        <span class="pane-sub">what a person sees</span>
      </div>

      ${status !== "done" &&
      html`<div class="card placeholder">
        <div class="spinner" aria-hidden="true"></div>
        <p>${status === "error" ? "The app has no data to show." : "Loading the recipe…"}</p>
      </div>`}

      ${status === "done" &&
      data &&
      html`
        <article class="card recipe-card">
          <header
            class=${`recipe-head field-name ${dim("name")} ${glow("name")}`}
            onMouseEnter=${() => setActive("name")}
            onMouseLeave=${() => setActive(null)}
          >
            <h1>${data.name}</h1>
            <p class="recipe-tag">Breakfast · serves 4 · 20 min</p>
          </header>

          <div class="recipe-body">
            <div
              class=${`recipe-col field-ingredients ${dim("ingredients")} ${glow("ingredients")}`}
              onMouseEnter=${() => setActive("ingredients")}
              onMouseLeave=${() => setActive(null)}
            >
              <h2>Ingredients</h2>
              <ul class="ingredients">
                ${data.ingredients.map(
                  (item, i) => html`<li key=${i}><span class="check"></span>${item}</li>`
                )}
              </ul>
            </div>

            <div
              class=${`recipe-col field-recipe ${dim("recipe")} ${glow("recipe")}`}
              onMouseEnter=${() => setActive("recipe")}
              onMouseLeave=${() => setActive(null)}
            >
              <h2>Method</h2>
              <ol class="steps">
                ${String(data.recipe)
                  .split("\n")
                  .filter((s) => s.trim())
                  .map((step, i) => html`<li key=${i}>${step}</li>`)}
              </ol>
            </div>
          </div>
        </article>
      `}
    </section>
  `;
}

// ---------------------------------------------------------------------------
// BOTTOM HALF — what the developer sees: the raw API request and response.
// ---------------------------------------------------------------------------
function ApiPane({ status, data, error, elapsed, active, setActive, onSend }) {
  return html`
    <section class="pane pane-api">
      <div class="pane-label">
        <span class="badge badge-api">The API</span>
        <span class="pane-sub">the data underneath</span>
      </div>

      <div class="api-grid">
        <div class="request">
          <div class="block-title">Request</div>
          <code class="http-line"><span class="method">GET</span> ${API_URL}</code>
          <button class="send" onClick=${onSend} disabled=${status === "loading"}>
            ${status === "loading" ? "Sending…" : "Send request"}
          </button>
          <p class="explain">
            The app asks the server for data. It never says <em>how</em> to draw
            anything — it just asks <strong>"give me the recipe"</strong>.
          </p>
        </div>

        <div class="response">
          <div class="block-title">
            Response
            ${status === "done" &&
            html`<span class="status-ok">200 OK${elapsed != null ? ` · ${elapsed} ms` : ""}</span>`}
            ${status === "error" && html`<span class="status-err">failed</span>`}
          </div>

          ${status === "loading" && html`<pre class="json muted">…waiting for the server…</pre>`}
          ${status === "error" && html`<pre class="json err">${error}</pre>`}
          ${status === "done" &&
          data &&
          html`<${JsonView} data=${data} active=${active} setActive=${setActive} />`}
        </div>
      </div>

      <p class="legend">
        ${Object.entries(FIELDS).map(
          ([key, f]) => html`
            <span
              key=${key}
              class="legend-item"
              style=${`--c:${f.color}`}
              onMouseEnter=${() => setActive(key)}
              onMouseLeave=${() => setActive(null)}
            >
              <span class="dot"></span><code>${f.label}</code> → ${f.hint}
            </span>
          `
        )}
      </p>
    </section>
  `;
}

// Hand-rolled pretty-printer so each field key can carry its own colour and be
// linked (on hover) to the matching part of the app above.
function JsonView({ data, active, setActive }) {
  const row = (key, valueNode) => {
    const f = FIELDS[key];
    const dim = active && active !== key ? "dim" : "";
    return html`
      <div
        class=${`jrow ${dim}`}
        style=${`--c:${f.color}`}
        onMouseEnter=${() => setActive(key)}
        onMouseLeave=${() => setActive(null)}
      >
        <span class="jkey">"${key}"</span><span class="jpunc">: </span>${valueNode}
      </div>
    `;
  };

  return html`
    <pre class="json"><span class="jpunc">{</span>
${row("name", html`<span class="jstr">"${data.name}"</span><span class="jpunc">,</span>`)}
${row("recipe", html`<span class="jstr">"${truncate(String(data.recipe).replace(/\n/g, " ↵ "), 90)}"</span><span class="jpunc">,</span>`)}
${row(
      "ingredients",
      html`<span class="jpunc">[</span> <span class="jstr">${data.ingredients.length} items…</span> <span class="jpunc">]</span>`
    )}
<span class="jpunc">}</span></pre>
  `;
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

render(html`<${App} />`, document.getElementById("app"));

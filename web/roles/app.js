import { h, render } from "preact";
import { useEffect, useState } from "preact/hooks";
import htm from "htm";
import { LAYERS, ROLES, ROLE_BY_ID } from "./data.js";

const html = htm.bind(h);

function App() {
  // Which role chip is picked, or null for the resting "pick one" state.
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    window.__APP = { ready: true, selected };
  }, [selected]);

  const role = selected ? ROLE_BY_ID[selected] : null;
  const owned = new Set(role ? role.owns : []);
  // Tint the whole board with the picked role's colour, so the slabs it owns
  // can light up in that one colour without each slab knowing the role.
  const boardStyle = role ? `--role-c:${role.color}` : "";

  return html`
    <main class="wrap">
      <header class="head">
        <h1>Who holds the stack?</h1>
        <p class="lede">
          ${"A data product is built in "}<strong>layers</strong>${", and "}
          ${"different people own different layers. A "}
          <strong>data engineer</strong>${" moves the data; "}
          <strong>data science</strong>${" gives it brains; the "}
          <strong>backend</strong>${" serves it; the "}
          <strong>frontend</strong>${" shows it. Pick a role to see exactly "}
          ${"which slabs of the stack it holds — and notice how "}
          <em>full stack</em>${" and "}<em>“backend in the broad sense”</em>
          ${" are just bigger bites of the very same stack."}
        </p>
      </header>

      <div class="roles">
        ${ROLES.map(
          (r) => html`
            <button
              key=${r.id}
              class=${`role role-${r.id} ${selected === r.id ? "active" : ""}`}
              style=${`--role-c:${r.color}`}
              onClick=${() => setSelected(selected === r.id ? null : r.id)}
              aria-pressed=${selected === r.id}
              data-role=${r.id}
            >
              <span class="role-icon">${r.icon}</span>
              <span class="role-text">
                <span class="role-name">${r.name}</span>
                <span class="role-short">${r.short}</span>
              </span>
            </button>
          `
        )}
      </div>

      <!-- The stack, top (the screen) to bottom (raw data). Owned slabs light;
           the rest dim, so you can read a role as a shape over the stack. -->
      <div class=${`board ${role ? "picked" : ""}`} style=${boardStyle}>
        ${LAYERS.map((layer) => {
          const own = owned.has(layer.id);
          const cls = ["slab", `slab-${layer.id}`, role ? (own ? "own" : "off") : ""]
            .filter(Boolean)
            .join(" ");
          return html`
            <div class=${cls} data-layer=${layer.id}>
              <div class="slab-main">
                <span class="slab-icon">${layer.icon}</span>
                <span class="slab-text">
                  <span class="slab-name">${layer.name}</span>
                  <span class="slab-tag">${layer.tag}</span>
                </span>
                ${own && html`<span class="slab-badge">held by ${role.name}</span>`}
              </div>
              <div class="slab-parts">
                ${layer.parts.map((p) => html`<span key=${p} class="part">${p}</span>`)}
              </div>
            </div>
          `;
        })}
      </div>

      <${Detail} role=${role} />
    </main>
  `;
}

// The panel under the stack: a fuller, plain-language read on the picked role.
function Detail({ role }) {
  if (!role) {
    return html`
      <section class="detail detail-empty">
        <p>Pick a role above to see which slabs of the stack it holds.</p>
      </section>
    `;
  }
  const n = role.owns.length;
  return html`
    <section class=${`detail role-${role.id}`} style=${`--role-c:${role.color}`}>
      <div class="detail-head">
        <span class="detail-icon">${role.icon}</span>
        <h2>${role.name}</h2>
        <span class="detail-owns">${n} layer${n > 1 ? "s" : ""}</span>
      </div>
      <p class="detail-text">${role.detail}</p>
    </section>
  `;
}

render(html`<${App} />`, document.getElementById("app"));

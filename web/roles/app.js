import { h, render } from "preact";
import { useEffect, useState } from "preact/hooks";
import htm from "htm";
import { ROLES, ROLE_BY_ID, LAYER_HOLDER } from "./data.js";

const html = htm.bind(h);

function App() {
  // Which role chip is picked, or null for the resting "pick one" state.
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    window.__APP = { ready: true, selected };
  }, [selected]);

  const role = selected ? ROLE_BY_ID[selected] : null;
  // The chips ARE the stack: a picked role lights up the basic-role chip for
  // every layer it holds, so a composite role (full stack, "backend in the
  // broad sense") visibly contains the smaller roles it's made of.
  const held = new Set(role ? role.owns.map((layer) => LAYER_HOLDER[layer]) : []);
  // Expose the picked role's colour to the whole grid, so the chips it holds
  // can light up in that one colour without each chip knowing the role.
  const selStyle = role ? `--sel-c:${role.color}` : "";

  return html`
    <main class="wrap" style=${selStyle}>
      <header class="head">
        <h1>Who holds the stack?</h1>
        <p class="lede">
          ${"A data product is built in "}<strong>layers</strong>${", and "}
          ${"different people own different layers. A "}
          <strong>data engineer</strong>${" moves the data; "}
          <strong>data science</strong>${" gives it brains; the "}
          <strong>backend</strong>${" serves it; the "}
          <strong>frontend</strong>${" shows it. Pick a role to see exactly "}
          ${"which parts of the stack it holds — and notice how "}
          <em>full stack</em>${" and "}<em>“backend in the broad sense”</em>
          ${" are just bigger bites of the very same stack, lighting up the "}
          ${"smaller roles they contain."}
        </p>
      </header>

      <!-- The stack, as chips. Pick a role and the basic roles it holds light
           up in the picked role's colour; the rest dim, so you can read a role
           as a shape over the same set of chips. -->
      <div class=${`roles ${role ? "picked" : ""}`}>
        ${ROLES.map((r) => {
          const active = selected === r.id;
          const isHeld = held.has(r.id);
          const cls = [
            "role",
            `role-${r.id}`,
            active ? "active" : "",
            role && isHeld ? "held" : "",
            role && !active && !isHeld ? "dim" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return html`
            <button
              key=${r.id}
              class=${cls}
              style=${`--role-c:${r.color}`}
              onClick=${() => setSelected(selected === r.id ? null : r.id)}
              aria-pressed=${active}
              data-role=${r.id}
            >
              <span class="role-icon">${r.icon}</span>
              <span class="role-text">
                <span class="role-name">${r.name}</span>
                <span class="role-short">${r.short}</span>
              </span>
            </button>
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
        <p>Pick a role above to see which parts of the stack it holds.</p>
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

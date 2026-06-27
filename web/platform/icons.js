// Line icons from Lucide (https://lucide.dev), ISC licensed — see vendor note in
// LICENSES.md. Each shape is transcribed straight from the 24×24 / 2px-stroke
// source so there's no build step and no icon font: just inline <svg> that
// inherits its colour from the surrounding node via `currentColor`.
import { h } from "preact";
import htm from "htm";

const html = htm.bind(h);

// Keyed by node id. Bronze, silver and gold deliberately share the medal glyph
// — the metal is told apart by each node's accent colour, not the shape.
const SHAPES = {
  // satellite-dish — reaches out and pulls feeds in
  connectors: () => html`
    <path d="M4 10a7.31 7.31 0 0 0 10 10Z" />
    <path d="m9 15 3-3" />
    <path d="M17 13a6 6 0 0 0-6-6" />
    <path d="M21 13A10 10 0 0 0 11 3" />
  `,
  // medal — the medallion layer
  bronze: medal,
  silver: medal,
  gold: medal,
  // wand-sparkles — reshape onto one schema
  normalize: () => html`
    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" />
    <path d="m14 7 3 3" />
    <path d="M5 6v4" />
    <path d="M19 14v4" />
    <path d="M10 2v2" />
    <path d="M7 8H3" />
    <path d="M21 16h-4" />
    <path d="M11 3H9" />
  `,
  // database — the cylinder
  db: () => html`
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  `,
  // server — serves answers to apps
  backend: () => html`
    <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
    <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
    <line x1="6" x2="6.01" y1="6" y2="6" />
    <line x1="6" x2="6.01" y1="18" y2="18" />
  `,
  // bot — the AI agent
  agent: () => html`
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  `,
  // smartphone — the screen a person sees
  app: () => html`
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  `,
};

function medal() {
  return html`
    <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
    <path d="M11 12 5.12 2.2" />
    <path d="m13 12 5.88-9.8" />
    <path d="M8 7h8" />
    <circle cx="12" cy="17" r="5" />
    <path d="M12 18v-2h-.5" />
  `;
}

// <Icon name=<node id> size=.. /> — a 24-grid line icon in currentColor.
export function Icon({ name, size = 18 }) {
  const shape = SHAPES[name];
  return html`
    <svg
      class="icon"
      viewBox="0 0 24 24"
      width=${size}
      height=${size}
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      ${shape ? shape() : null}
    </svg>
  `;
}

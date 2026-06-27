// "Stack holders": who builds which slab of a data product.
//
// A data product is built in layers. This demo shows the same stack the data
// platform demo wires together — but seen from the side of the PEOPLE who own
// each layer. Pick a role and the slabs it holds light up.
//
// The stack, top (what a person sees) to bottom (raw data coming in). Every
// role lights up one or more of these slabs.
export const LAYERS = [
  {
    id: "frontend",
    name: "Frontend",
    icon: "🖥️",
    tag: "UI / UX",
    parts: ["Layout", "Interactions", "Visualisation"],
  },
  {
    id: "backend",
    name: "Backend",
    icon: "⚙️",
    tag: "Gold → UI/API",
    parts: ["Endpoints", "Auth", "Gold API"],
  },
  {
    id: "science",
    name: "Data Science",
    icon: "🧠",
    tag: "Algo / ML / LLM",
    parts: ["Algorithms", "ML models", "LLM", "Agent backend"],
  },
  {
    id: "engineering",
    name: "Data Engineering",
    icon: "🛠️",
    tag: "ETL · bronze → gold",
    parts: ["Sources", "Bronze", "Silver", "Gold"],
  },
];

// The roles. `owns` lists the layer ids that light up when the role is picked;
// `color` tints both the role chip and the slabs it holds.
export const ROLES = [
  {
    id: "data-engineer",
    name: "Data Engineer",
    icon: "🛠️",
    color: "#b45309",
    owns: ["engineering"],
    short: "Owns the ETL — the bronze-to-gold journey.",
    detail:
      "Responsible for the data ETL: the bronze-to-gold journey. They build " +
      "the pipelines that pull raw data in and refine it, stage by stage, into " +
      "clean, trustworthy, business-ready tables.",
  },
  {
    id: "data-scientist",
    name: "Data Science",
    icon: "🧠",
    color: "#9333ea",
    owns: ["science"],
    short: "Owns the Algo / ML / LLM, and the agent backend.",
    detail:
      "Responsible for the algorithms, ML and LLMs used along the data " +
      "journey — the module that lives in the logic block. Also owns the " +
      "agent's backend: its reasoning, tools and prompts.",
  },
  {
    id: "backend",
    name: "Backend",
    icon: "⚙️",
    color: "#4338ca",
    owns: ["backend"],
    short: "Owns the API from the gold layer to the UI.",
    detail:
      "Builds the API that serves the gold layer to the UI layer — or a " +
      "direct API over gold for other users. The contract between the clean " +
      "data and whatever consumes it.",
  },
  {
    id: "frontend",
    name: "Frontend",
    icon: "🖥️",
    color: "#16a34a",
    owns: ["frontend"],
    short: "Owns the UI/UX — what people see and click.",
    detail:
      "Responsible for the UI/UX implementation — the visualisation and the " +
      "interactive parts of the application or web service. What the person " +
      "actually sees, touches and clicks.",
  },
  {
    id: "fullstack",
    name: "Full Stack",
    icon: "🥪",
    color: "#0284c7",
    owns: ["backend", "frontend"],
    short: "Backend + frontend, in one pair of hands.",
    detail:
      "Backend + frontend. One person (or team) owning both the API and the " +
      "UI it feeds — the whole slice from the data's edge to the screen.",
  },
  {
    id: "backend-broad",
    name: "Backend (broad sense)",
    icon: "🌃",
    color: "#0f766e",
    owns: ["backend", "science", "engineering"],
    short: "Everything behind the frontend.",
    detail:
      "In the broad sense, every layer behind the frontend can be called " +
      "\"backend\" — meaning data science and data engineering as well. " +
      "Whether these split into separate roles and teams usually depends on " +
      "how complex each layer is and on the organisation's own decisions.",
  },
];

export const ROLE_BY_ID = Object.fromEntries(ROLES.map((r) => [r.id, r]));

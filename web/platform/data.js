// The map of a data platform: every box one piece of data passes through on its
// way from the outside world to a person's screen, in plain language.
//
// To keep the demo honest and "shown rather than told", a SINGLE concrete fact
// — a coffee sale — rides the whole path, and each box shows that same fact in
// the form it takes there. So `snapshot` below is literally the coffee sale,
// nine times over, getting cleaner and more useful at every step.
//
// Each box:
//   id      — stable key, used for CSS hooks and the trace order
//   name    — what a non-developer sees
//   icon    — a little glyph for the box
//   layer   — bronze | silver | gold | null  (the three are coloured like the
//             metals; everything else is a neutral box)
//   role    — the one-line caption shown as the trace lights this box
//   detail  — the fuller plain-language explanation in the panel below the map
//   form    — what the data LOOKS like here ("raw JSON", "clean row", …)
//   snapshot— the coffee sale, in that form

// The spine: the straight run from the outside world to the business answer.
export const SPINE = [
  {
    id: "connectors",
    name: "Connectors",
    icon: "🔌",
    layer: null,
    role: "go out and fetch data from outside apps, files & APIs",
    detail:
      "Little programs that reach out to the systems where data is actually " +
      "made — the till, a spreadsheet, a website's API — and pull copies back " +
      "in. Think delivery drivers collecting parcels from all over town.",
    form: "a fetched receipt",
    snapshot: "GET till-api/sales/latest → 1 receipt",
  },
  {
    id: "bronze",
    name: "Bronze",
    icon: "🥉",
    layer: "bronze",
    role: "a copy of everything, dumped exactly as it arrived",
    detail:
      "The raw landing pile. Every parcel is kept exactly as it came in — " +
      "messy spellings, odd field names, nothing fixed — because once you've " +
      "thrown the original away you can never get it back.",
    form: "raw JSON",
    snapshot: '{ "itm": "iced coffee ", "amt": "3.75", "ts": 1719408000 }',
  },
  {
    id: "normalize",
    name: "Normalize",
    icon: "🧹",
    layer: null,
    role: "force mismatched feeds into one shared shape",
    detail:
      "The clean-up step. Different sources disagree on everything — column " +
      "names, date formats, how a price is written — so this maps them all " +
      "onto one agreed shape. (This is the whole job of the ETL demo.)",
    form: "a mapping",
    snapshot: "itm → item · amt → price · ts → sold_at",
  },
  {
    id: "silver",
    name: "Silver",
    icon: "🥈",
    layer: "silver",
    role: "tidy, trustworthy rows — one per thing",
    detail:
      "The cleaned data: consistent, de-duplicated, one neat row per event. " +
      "This is what most people on the team actually build on, because they " +
      "can trust it without re-checking it.",
    form: "a clean row",
    snapshot: "Iced Coffee · 2026-06-26 · £3.75",
  },
  {
    id: "db",
    name: "Database",
    icon: "🗄️",
    layer: null,
    role: "the shared store the clean rows live in",
    detail:
      "The big shared table where every clean row is kept so many machines " +
      "and people can ask it precise questions at once. (That's the database " +
      "demo.) Our one coffee sale is now a single row among thousands.",
    form: "one row among thousands",
    snapshot: "row 8,412 of 53,219",
  },
  {
    id: "gold",
    name: "Gold",
    icon: "🥇",
    layer: "gold",
    role: "business-ready answers: totals & top sellers",
    detail:
      "The data boiled down to the answers a person actually wants — daily " +
      "totals, top sellers, trends. Thousands of rows become a handful of " +
      "numbers you'd put straight onto a dashboard.",
    form: "an answer",
    snapshot: "Iced Coffee — 14 sold today, £52.50",
  },
];

// The fork at the end: gold feeds BOTH a backend and an agent, and both of them
// feed the app. This branch is the one bit of real architecture you can see.
export const FORK = [
  {
    id: "backend",
    name: "Backend",
    icon: "⚙️",
    layer: null,
    role: "serves those answers to apps, as data",
    detail:
      "A program that waits for the app to ask, then hands back the gold " +
      "answer as tidy data (JSON) — the same idea as the API demo. It does " +
      "the asking-the-database part so the app doesn't have to.",
    form: "JSON",
    snapshot: '{ "top": "Iced Coffee", "count": 14 }',
  },
  {
    id: "agent",
    name: "Agent",
    icon: "🤖",
    layer: null,
    role: "an AI that reads the same data and answers in words",
    detail:
      "An AI assistant pointed at the very same gold answers. Instead of " +
      "returning raw data, it replies in plain sentences — so you can just " +
      "ask 'how's coffee doing today?' and get an answer.",
    form: "a sentence",
    snapshot: "“Your best seller today is Iced Coffee — 14 sold.”",
  },
];

// Where the journey ends: a screen a person looks at.
export const APP_BOX = {
  id: "app",
  name: "App",
  icon: "📱",
  layer: null,
  role: "what the person actually sees",
  detail:
    "The finished screen. By the time the coffee sale reaches here it's a " +
    "single, friendly fact — drawn nicely, with all the mess of the journey " +
    "hidden behind it.",
  form: "a screen",
  snapshot: "☕ Top seller today · Iced Coffee · 14 sold",
};

// Every box, keyed by id — handy for the detail panel.
export const ALL = [...SPINE, ...FORK, APP_BOX];
export const BY_ID = Object.fromEntries(ALL.map((b) => [b.id, b]));

// The order the trace lights boxes in. Each entry is the set of boxes lit at
// that step — backend and agent light together, since gold feeds both at once.
export const TRACE = [
  ["connectors"],
  ["bronze"],
  ["normalize"],
  ["silver"],
  ["db"],
  ["gold"],
  ["backend", "agent"],
  ["app"],
];

// Everyday situations. In each, one side has the easier time: its `point`
// becomes a pro for that side, and the other side's `point` becomes a con.
export const SCENARIOS = [
  {
    id: "author",
    title: "Show a recipe with its author's name",
    winner: "graphql",
    rest: {
      lines: ["GET /recipes/1", "GET /authors/7"],
      note: "Two trips, and each one sends back the whole record — bio, dates and all.",
      point: "Extra trips and extra data you didn't ask for",
    },
    graphql: {
      lines: ["POST /graphql", "{ recipe(id: 1) { name author { name } } }"],
      note: "One trip, and only the two names come back.",
      point: "Exactly the fields you need, in one trip",
    },
  },
  {
    id: "screens",
    title: "A phone and a website need different data",
    winner: "graphql",
    rest: {
      lines: ["GET /recipes/1", "GET /recipes/1/summary   ← new, built for the phone"],
      note: "The server team often adds a new address for each new screen.",
      point: "New screens often need new addresses on the server",
    },
    graphql: {
      lines: ["phone:   { recipe(id: 1) { name } }", "website: { recipe(id: 1) { name minutes ingredients { item } } }"],
      note: "Each app writes its own list. Nothing changes on the server.",
      point: "Each app shapes its own data — no server changes",
    },
  },
  {
    id: "docs",
    title: "Find out what data there is",
    winner: "graphql",
    rest: {
      lines: ["read the docs website…", "…and hope it's up to date"],
      note: "The list of addresses lives in separate documentation.",
      point: "Docs live apart from the API and can drift",
    },
    graphql: {
      lines: ["{ __schema { types { name } } }"],
      note: "The API describes itself; tools offer autocomplete as you type.",
      point: "One built-in schema describes everything",
    },
  },
  {
    id: "cache",
    title: "Thousands of people open the same recipe",
    winner: "rest",
    rest: {
      lines: ["GET /recipes/1", "→ saved by the browser and the CDN"],
      note: "Every thing has its own address, so ordinary caches can keep a copy.",
      point: "Easy to cache — one address per thing",
    },
    graphql: {
      lines: ["POST /graphql", "POST /graphql", "POST /graphql"],
      note: "Every request goes to the same address, so ordinary caches can't tell them apart.",
      point: "Harder to cache — every request looks alike",
    },
  },
  {
    id: "try",
    title: "Try it quickly from a browser",
    winner: "rest",
    rest: {
      lines: ["https://example.com/recipes/1"],
      note: "Paste the address in a browser tab. Done.",
      point: "Simple — anyone can try a plain address",
    },
    graphql: {
      lines: ["POST /graphql", '{ "query": "{ recipe(id: 1) { name } }" }'],
      note: "You need to write a query and send it as a POST — usually with a special tool.",
      point: "More to learn: a query language and tooling",
    },
  },
  {
    id: "errors",
    title: "Something goes wrong",
    winner: "rest",
    rest: {
      lines: ["GET /recipes/99", "← 404 Not Found"],
      note: "A standard number every monitoring tool understands.",
      point: "Standard status codes for errors",
    },
    graphql: {
      lines: ["POST /graphql", '← 200 OK  { "errors": [ "No recipe 99" ] }'],
      note: "The reply says OK; the problem is tucked inside it.",
      point: "Errors hide inside a 200 OK",
    },
  },
];

export const SIDES = [
  { id: "rest", name: "REST" },
  { id: "graphql", name: "GraphQL" },
];

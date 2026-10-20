// Everyday situations. In each, one side has the easier time: its `point`
// becomes a pro for that side, and the other side's `point` becomes a con.
// `cost`, where given, is how many trips to the server and how many bytes came
// back (measured on the GraphQL demo's sample recipe and author).
export const SCENARIOS = [
  {
    id: "fields",
    title: "Show just a recipe's name",
    winner: "graphql",
    rest: {
      lines: ["GET /recipes/1", "← name, minutes, servings, calories, description, ingredients…"],
      note: "The address decides what comes back — the whole record, even if you need one field.",
      point: "Sends whole records, even when you need one field",
      cost: { trips: 1, bytes: 355 },
    },
    graphql: {
      lines: ["{ recipe(id: 1) { name } }", "← { name }"],
      note: "You list the fields; only those come back.",
      point: "Exactly the fields you need, nothing more",
      cost: { trips: 1, bytes: 46 },
    },
  },
  {
    id: "relations",
    title: "Follow links: a recipe → its author → their other recipes",
    winner: "graphql",
    rest: {
      lines: ["GET /recipes/1          → authorId: 7", "GET /authors/7          → then…", "GET /authors/7/recipes"],
      note: "Three trips, one after another — each one needs the answer of the one before.",
      point: "Related things mean a chain of trips, one after another",
      cost: { trips: 3, bytes: 1185 },
    },
    graphql: {
      lines: ["{ recipe(id: 1) {", "    author { name  recipes { name } } } }"],
      note: "One query follows the links for you, however deep.",
      point: "Follows relationships in one query",
      cost: { trips: 1, bytes: 114 },
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
];

export const SIDES = [
  { id: "rest", name: "REST" },
  { id: "graphql", name: "GraphQL" },
];

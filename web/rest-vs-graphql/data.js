// Everyday situations. In each, one side has the easier time: its `point`
// becomes a pro for that side, and the other side's `point` becomes a con.
// `cost`, where given, is how many trips to the server and how many bytes came
// back (JSON length of the GraphQL demo's RECIPE, AUTHOR and AUTHOR_RECIPES).
export const SCENARIOS = [
  {
    id: "fields",
    title: "Show just a recipe's name",
    winner: "graphql",
    rest: {
      lines: ["GET /recipes/1", "← name, minutes, servings, calories, description, ingredients…"],
      note: "The address decides what comes back — usually the whole record, even if you need one field.",
      point: "Usually sends whole records, even when you need one field",
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
      note: "One trip to find the author, then two more.",
      point: "Related things mean several trips",
      cost: { trips: 3, bytes: 1172 },
    },
    graphql: {
      lines: ["{ recipe(id: 1) {", "    author { name  recipes { name } } } }"],
      note: "One query follows the links for you, however deep.",
      point: "Follows relationships in one query",
      cost: { trips: 1, bytes: 114 },
    },
  },
  {
    id: "endpoint",
    title: "Find out what you can ask for",
    winner: "graphql",
    rest: {
      lines: ["GET /recipes/1", "GET /authors/7", "GET /authors/7/recipes", "GET /ingredients?recipe=1 …"],
      note: "Every kind of thing has its own address. Nothing tells you what addresses exist or what they return — you read the docs, or guess.",
      point: "Many addresses, and no way to ask what they are",
    },
    graphql: {
      lines: ["POST /graphql", "{ __schema { types { name fields { name } } } }", "← Recipe: name, minutes, author…  Author: name, recipes…"],
      note: "One address for everything, and you can ask it to describe itself: every type, field and link it knows. Tools use this to autocomplete your queries.",
      point: "Single endpoint that describes itself — ask it what exists",
    },
  },
  {
    id: "errors",
    title: "Ask for a recipe that doesn't exist",
    winner: "rest",
    rest: {
      lines: ["GET /recipes/99", "← 404 Not Found"],
      note: "The status code says it failed. Browsers, proxies and logs all understand it without reading the body.",
      point: "Failures are plain — a status code says what went wrong",
    },
    graphql: {
      lines: ["{ recipe(id: 99) { name } }", '← 200 OK  { "data": { "recipe": null }, "errors": [ … ] }'],
      note: "The reply says OK; the failure is a note inside it, next to whatever did work. You have to read the body to know.",
      point: "Failures hide inside an OK reply",
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
    id: "build",
    title: "Build the server yourself",
    winner: "rest",
    rest: {
      lines: ["GET /recipes/:id  → look it up, send it back"],
      note: "One handler per address. Any web framework does this out of the box.",
      point: "Easy to build — a few plain handlers",
    },
    graphql: {
      lines: ["type Recipe { … }", "resolvers: recipe, author, recipes…"],
      note: "You write a schema, a resolver for every field that links, and guard against deep, costly queries.",
      point: "More to build: a schema, resolvers and query limits",
    },
  },
];

export const SIDES = [
  { id: "rest", name: "REST" },
  { id: "graphql", name: "GraphQL" },
];

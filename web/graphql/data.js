// Everything the server knows. REST hands back whole records; GraphQL hands
// back only the fields you ask for.
export const RECIPE = {
  id: 1,
  name: "Fluffy Pancakes",
  minutes: 20,
  servings: 4,
  calories: 410,
  description: "Tall, soft buttermilk pancakes for a slow weekend breakfast.",
  createdAt: "2026-03-14T09:12:00Z",
  authorId: 7,
  ingredients: [
    { item: "flour", amount: "2 cups", grams: 250 },
    { item: "buttermilk", amount: "2 cups", grams: 480 },
    { item: "eggs", amount: "2", grams: 100 },
  ],
};

export const AUTHOR = {
  id: 7,
  name: "Ada Baker",
  country: "Canada",
  bio: "Bakes before sunrise, writes recipes after.",
  joined: "2019-05-02",
};

// The fields a person can tick. A field with children is a related thing you
// can reach into — with REST, author lives at a different address.
export const SCHEMA = [
  { key: "name" },
  { key: "minutes" },
  { key: "ingredients", children: ["item", "amount"] },
  { key: "author", children: ["name", "country"] },
];

// Every tickable leaf, as "field" or "parent.child".
export const LEAVES = SCHEMA.flatMap((f) => (f.children ? f.children.map((c) => `${f.key}.${c}`) : [f.key]));

// Write the GraphQL query for the ticked leaves.
export function buildQuery(picked) {
  const lines = [];
  for (const f of SCHEMA) {
    if (!f.children) {
      if (picked.has(f.key)) lines.push(`    ${f.key}`);
      continue;
    }
    const kids = f.children.filter((c) => picked.has(`${f.key}.${c}`));
    if (kids.length) lines.push(`    ${f.key} {`, ...kids.map((c) => `      ${c}`), "    }");
  }
  return ["{", "  recipe(id: 1) {", ...lines, "  }", "}"].join("\n");
}

// What the GraphQL server answers: exactly the ticked fields, nothing else.
export function runQuery(picked) {
  const recipe = {};
  for (const f of SCHEMA) {
    if (!f.children) {
      if (picked.has(f.key)) recipe[f.key] = RECIPE[f.key];
      continue;
    }
    const kids = f.children.filter((c) => picked.has(`${f.key}.${c}`));
    if (!kids.length) continue;
    const pick = (src) => Object.fromEntries(kids.map((c) => [c, src[c]]));
    recipe[f.key] = f.key === "author" ? pick(AUTHOR) : RECIPE.ingredients.map(pick);
  }
  return { data: { recipe } };
}

// The same need met with REST: one trip for the recipe, a second for the
// author if any author field is wanted — and each trip returns the whole record.
export function restTrips(picked) {
  const trips = [{ path: "/recipes/1", bytes: JSON.stringify(RECIPE).length }];
  if ([...picked].some((p) => p.startsWith("author."))) {
    trips.push({ path: "/authors/7", bytes: JSON.stringify(AUTHOR).length });
  }
  return trips;
}

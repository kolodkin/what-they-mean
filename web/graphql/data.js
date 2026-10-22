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

// Ada's recipes, as GET /authors/7/recipes would return them. The demo doesn't
// show these; the comparison page measures its byte counts on them.
export const AUTHOR_RECIPES = [
  RECIPE,
  {
    id: 4,
    name: "Banana Bread",
    minutes: 70,
    servings: 8,
    calories: 290,
    description: "A moist loaf for the bananas nobody ate in time.",
    createdAt: "2025-11-02T15:40:00Z",
    authorId: 7,
    ingredients: [
      { item: "bananas", amount: "3", grams: 360 },
      { item: "flour", amount: "2 cups", grams: 250 },
      { item: "sugar", amount: "3/4 cup", grams: 150 },
    ],
  },
];

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

// --- changing data: mutations -----------------------------------------------
// Same single address, but the request starts with "mutation". It still names
// which fields of the result to send back.
export const SEED = [
  { id: 1, name: "Pancakes", minutes: 20 },
  { id: 2, name: "Omelette", minutes: 10 },
  { id: 3, name: "Porridge", minutes: 8 },
];

export const MUTATIONS = [
  {
    op: "createRecipe",
    says: "Add Waffles",
    text: 'mutation {\n  createRecipe(name: "Waffles", minutes: 25) {\n    id\n    name\n  }\n}',
  },
  {
    op: "updateRecipe",
    says: "Update Omelette to 15 min",
    text: "mutation {\n  updateRecipe(id: 2, minutes: 15) {\n    name\n    minutes\n  }\n}",
  },
  {
    op: "deleteRecipe",
    says: "Delete Omelette",
    text: "mutation {\n  deleteRecipe(id: 2)\n}",
  },
];

// A pretend GraphQL server for the three mutations above. The page only lets
// a mutation be sent when it makes sense, so there is no error case to show.
export function canSend(shelf, { op }) {
  return op === "createRecipe" ? !shelf.some((r) => r.name === "Waffles") : shelf.some((r) => r.id === 2);
}

export function mutate(shelf, { op }) {
  if (op === "createRecipe") {
    const made = { id: Math.max(0, ...shelf.map((r) => r.id)) + 1, name: "Waffles", minutes: 25 };
    return { shelf: [...shelf, made], touched: made.id, answer: { data: { [op]: { id: made.id, name: made.name } } } };
  }
  if (op === "updateRecipe") {
    const next = { ...shelf.find((r) => r.id === 2), minutes: 15 };
    return {
      shelf: shelf.map((r) => (r.id === 2 ? next : r)),
      touched: 2,
      answer: { data: { [op]: { name: next.name, minutes: next.minutes } } },
    };
  }
  return { shelf: shelf.filter((r) => r.id !== 2), answer: { data: { [op]: true } } };
}

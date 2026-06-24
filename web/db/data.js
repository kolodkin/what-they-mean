// Two tables of a tiny cooking database, in a one-to-many shape: one recipe has
// many ingredients. Kept as plain JS so the demo has no build step and the SQL
// result below is genuinely computed from this data — not hand-faked.

export const recipes = [
  { id: 1, name: "Fluffy Buttermilk Pancakes", minutes: 20, serves: 4 },
  { id: 2, name: "Overnight Oats", minutes: 5, serves: 2 },
];

// Each ingredient belongs to exactly one recipe (recipe_id), so a recipe can
// have many ingredients — the classic one-to-many relationship.
export const ingredients = [
  { id: 1, recipe_id: 1, name: "Flour", amount: "250 g" },
  { id: 2, recipe_id: 1, name: "Buttermilk", amount: "300 ml" },
  { id: 3, recipe_id: 1, name: "Egg", amount: "2 pcs" },
  { id: 4, recipe_id: 1, name: "Butter", amount: "30 g" },
  { id: 5, recipe_id: 2, name: "Rolled oats", amount: "80 g" },
  { id: 6, recipe_id: 2, name: "Milk", amount: "120 ml" },
  { id: 7, recipe_id: 2, name: "Honey", amount: "1 tbsp" },
];

// Ordered metadata used to draw the spreadsheet grids and the ERD boxes.
export const SCHEMA = [
  {
    name: "recipes",
    columns: [
      { name: "id", pk: true },
      { name: "name" },
      { name: "minutes" },
      { name: "serves" },
    ],
    rows: recipes,
  },
  {
    name: "ingredients",
    columns: [
      { name: "id", pk: true },
      { name: "recipe_id", fk: "recipes" },
      { name: "name" },
      { name: "amount" },
    ],
    rows: ingredients,
  },
];

export const QUERY_SQL = `SELECT r.name, i.name AS ingredient, i.amount
FROM recipes r
JOIN ingredients i ON i.recipe_id = r.id
WHERE r.name = 'Fluffy Buttermilk Pancakes';`;

// Run the JOIN above against the in-memory tables, so the result table the demo
// shows is really derived from the data, not typed out by hand.
export function runQuery() {
  const recipe = recipes.find((r) => r.name === "Fluffy Buttermilk Pancakes");
  return ingredients
    .filter((i) => i.recipe_id === recipe.id)
    .map((i) => ({ name: recipe.name, ingredient: i.name, amount: i.amount }));
}

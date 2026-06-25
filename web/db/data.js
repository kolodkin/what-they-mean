// The two tables of a tiny cooking database. Kept as plain JS so the demo has
// no build step and the SQL result below is genuinely computed from this data —
// not hand-faked.
//
// Each ingredient row belongs to exactly one recipe (via recipe_id) and carries
// its own amount and units — a plain one-to-many, no shared catalogue or
// junction table. Amount is the number; units is what to measure it in, kept in
// its own column so the quantity stays a real number you could add up.

export const recipes = [
  { id: 1, name: "Fluffy Buttermilk Pancakes", minutes: 20, serves: 4 },
  { id: 2, name: "Overnight Oats", minutes: 5, serves: 2 },
];

export const ingredients = [
  { recipe_id: 1, name: "Flour", amount: 250, units: "g" },
  { recipe_id: 1, name: "Buttermilk", amount: 300, units: "ml" },
  { recipe_id: 1, name: "Egg", amount: 2, units: "pcs" },
  { recipe_id: 1, name: "Butter", amount: 30, units: "g" },
  { recipe_id: 2, name: "Rolled oats", amount: 80, units: "g" },
  { recipe_id: 2, name: "Milk", amount: 120, units: "ml" },
  { recipe_id: 2, name: "Honey", amount: 1, units: "tbsp" },
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
      { name: "recipe_id", fk: "recipes" },
      { name: "name" },
      { name: "amount" },
      { name: "units" },
    ],
    rows: ingredients,
  },
];

export const QUERY_SQL = `SELECT r.name, i.name AS ingredient, i.amount, i.units
FROM recipes r
JOIN ingredients i ON i.recipe_id = r.id
WHERE r.name = 'Fluffy Buttermilk Pancakes';`;

// Run the JOIN above against the in-memory tables, so the result table the demo
// shows is really derived from the data, not typed out by hand.
export function runQuery() {
  const recipe = recipes.find((r) => r.name === "Fluffy Buttermilk Pancakes");
  return ingredients
    .filter((i) => i.recipe_id === recipe.id)
    .map((i) => ({
      name: recipe.name,
      ingredient: i.name,
      amount: i.amount,
      units: i.units,
    }));
}

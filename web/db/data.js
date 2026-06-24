// The three tables of a tiny cooking database. Kept as plain JS so the demo has
// no build step and the SQL result below is genuinely computed from this data —
// not hand-faked.

export const recipes = [
  { id: 1, name: "Fluffy Buttermilk Pancakes", minutes: 20, serves: 4 },
  { id: 2, name: "Overnight Oats", minutes: 5, serves: 2 },
];

export const ingredients = [
  { id: 1, name: "Flour", unit: "g" },
  { id: 2, name: "Buttermilk", unit: "ml" },
  { id: 3, name: "Egg", unit: "pcs" },
  { id: 4, name: "Butter", unit: "g" },
  { id: 5, name: "Rolled oats", unit: "g" },
  { id: 6, name: "Milk", unit: "ml" },
  { id: 7, name: "Honey", unit: "tbsp" },
];

export const recipe_ingredients = [
  { recipe_id: 1, ingredient_id: 1, amount: "250 g" },
  { recipe_id: 1, ingredient_id: 2, amount: "300 ml" },
  { recipe_id: 1, ingredient_id: 3, amount: "2 pcs" },
  { recipe_id: 1, ingredient_id: 4, amount: "30 g" },
  { recipe_id: 2, ingredient_id: 5, amount: "80 g" },
  { recipe_id: 2, ingredient_id: 6, amount: "120 ml" },
  { recipe_id: 2, ingredient_id: 7, amount: "1 tbsp" },
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
      { name: "name" },
      { name: "unit" },
    ],
    rows: ingredients,
  },
  {
    name: "recipe_ingredients",
    columns: [
      { name: "recipe_id", fk: "recipes" },
      { name: "ingredient_id", fk: "ingredients" },
      { name: "amount" },
    ],
    rows: recipe_ingredients,
  },
];

export const QUERY_SQL = `SELECT recipes.name,
       ingredients.name AS ingredient,
       recipe_ingredients.amount
FROM recipes
JOIN recipe_ingredients
  ON recipe_ingredients.recipe_id = recipes.id
JOIN ingredients
  ON ingredients.id = recipe_ingredients.ingredient_id
WHERE recipes.name = 'Fluffy Buttermilk Pancakes';`;

// Run the JOIN above against the in-memory tables, so the result table the demo
// shows is really derived from the data, not typed out by hand.
export function runQuery() {
  const recipe = recipes.find((r) => r.name === "Fluffy Buttermilk Pancakes");
  return recipe_ingredients
    .filter((ri) => ri.recipe_id === recipe.id)
    .map((ri) => {
      const ing = ingredients.find((i) => i.id === ri.ingredient_id);
      return { name: recipe.name, ingredient: ing.name, amount: ri.amount };
    });
}

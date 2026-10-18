// What's on the server's shelf when the page loads.
export const SEED = [
  { id: 1, name: "Pancakes", minutes: 20 },
  { id: 2, name: "Omelette", minutes: 10 },
  { id: 3, name: "Porridge", minutes: 8 },
];

// The "menu" of requests. Each one is a verb (method) + a noun (path), and the
// plain-English line is what that pair means.
export const REQUESTS = [
  { method: "GET", path: "/recipes", says: "Show me every recipe" },
  { method: "GET", path: "/recipes/2", says: "Show me recipe number 2" },
  { method: "POST", path: "/recipes", says: "Add this new recipe", body: { name: "Waffles", minutes: 25 } },
  { method: "PUT", path: "/recipes/2", says: "Replace recipe 2 with this", body: { name: "Cheese omelette", minutes: 12 } },
  { method: "PATCH", path: "/recipes/2", says: "Change only what I send — here, the time", body: { minutes: 15 } },
  { method: "DELETE", path: "/recipes/2", says: "Throw away recipe 2" },
];

// A pretend server: takes a verb, an address and maybe a body, and returns a
// status code, a response body, and the shelf as it now stands.
export function handle(shelf, { method, path, body }) {
  const id = Number(path.split("/")[2]);
  const found = shelf.find((r) => r.id === id);
  if (method === "GET" && !id) return { status: 200, body: shelf, shelf };
  if (method === "POST") {
    const made = { id: Math.max(0, ...shelf.map((r) => r.id)) + 1, ...body };
    return { status: 201, body: made, shelf: [...shelf, made], touched: made.id };
  }
  if (!found) return { status: 404, body: { error: `No recipe ${id}` }, shelf };
  if (method === "GET") return { status: 200, body: found, shelf, touched: id };
  if (method === "PUT") {
    const next = { id, ...body };
    return { status: 200, body: next, shelf: shelf.map((r) => (r.id === id ? next : r)), touched: id };
  }
  if (method === "PATCH") {
    const next = { ...found, ...body };
    return { status: 200, body: next, shelf: shelf.map((r) => (r.id === id ? next : r)), touched: id };
  }
  return { status: 204, body: null, shelf: shelf.filter((r) => r.id !== id) };
}

export const STATUS_TEXT = { 200: "OK", 201: "Created", 204: "No Content", 404: "Not Found" };

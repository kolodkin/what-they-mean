// Three different SOURCES that all describe the same thing — newly added
// recipes — but disagree on EVERYTHING: column names, date formats, how a
// price is written, even whether a number is a number. Kept as plain JS so the
// demo has no build step and the cleaned rows are genuinely computed, not faked.
//
// This is the real job of Transform: not one table to tidy, but several
// mismatched feeds to MAP onto a single shared schema — { name, added, price }.

export const SOURCES = [
  {
    id: "kitchen",
    name: "kitchen.csv",
    kind: "CSV export",
    // this source calls the columns dish / date / cost
    cols: { name: "dish", added: "date", price: "cost" },
    rows: [
      { dish: "  Mac & Cheese ", date: "3/2/26", cost: "$3.50" },
      { dish: "fluffy  buttermilk PANCAKES", date: "12/25/25", cost: "$4.25" },
    ],
  },
  {
    id: "api",
    name: "recipes-api",
    kind: "JSON feed",
    // …this one calls them title / created / price_usd, and prices are numbers
    cols: { name: "title", added: "created", price: "price_usd" },
    rows: [
      { title: "overnight OATS", created: "2026-02-04", price_usd: 2 },
      { title: "", created: "", price_usd: null }, // blank record -> dropped
    ],
  },
  {
    id: "sheet",
    name: "menu-sheet",
    kind: "spreadsheet",
    // …and this one: item / added_on / amount, with a written-out date
    cols: { name: "item", added: "added_on", price: "amount" },
    rows: [
      { item: "  green smoothie", added_on: "Jan 9, 2026", amount: "5" },
      { item: "Iced  Coffee", added_on: "2/14/26", amount: "3.75" },
    ],
  },
];

// The one schema every source is mapped onto. The viewer reads these.
export const TARGET = ["name", "added", "price"];

// "  fluffy  buttermilk PANCAKES " -> "Fluffy Buttermilk Pancakes"
function titleCase(s) {
  return String(s)
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// Three date dialects -> one ISO date. ISO is left alone; "3/2/26" (M/D/YY)
// and "Jan 9, 2026" are both rewritten to "2026-03-02" style.
function normDate(s) {
  s = String(s).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m) {
    const [, mo, d, yy] = m;
    return `20${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  m = s.match(/^([A-Za-z]{3})[a-z]*\s+(\d{1,2}),\s*(\d{4})$/);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return s;
}

// "$3.50" -> 3.5, "5" -> 5, an actual number is passed through, "" -> null.
function parsePrice(v) {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/[^0-9.]/g, "");
  return cleaned ? parseFloat(cleaned) : null;
}

// Map ONE source row (whatever it calls its columns) onto the shared schema.
function normalizeRow(row, cols) {
  return {
    name: titleCase(row[cols.name] ?? ""),
    added: normDate(row[cols.added] ?? ""),
    price: parsePrice(row[cols.price]),
  };
}

// Run the whole pipeline. Each source keeps its raw rows AND gains a parallel
// `normalized` array, so a Transform card can show the before/after side by
// side. `loaded` is every normalized row from every source, with the blank
// record dropped — one unified table out of three mismatched feeds.
export function runPipeline() {
  const sources = SOURCES.map((src) => ({
    ...src,
    normalized: src.rows.map((r) => normalizeRow(r, src.cols)),
  }));
  const transformed = sources
    .flatMap((s) => s.normalized)
    .filter((r) => r.name !== ""); // the blank record has no name -> dropped
  return { sources, transformed, loaded: transformed };
}

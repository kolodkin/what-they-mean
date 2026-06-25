// A tiny, deliberately MESSY source — a raw export of new recipes someone
// pasted in. Kept as plain JS so the demo has no build step and the cleaned
// rows the pipeline shows are genuinely computed from this data, not faked.
//
// Each row has a different problem on purpose, so the Transform stage has
// visible work to do: stray whitespace, wild capitalisation, two date formats,
// a price written as a "$x.xx" string, and one blank/junk row that should be
// dropped entirely.

export const RAW_ROWS = [
  { id: "1", name: "  Mac & Cheese ", added: "3/2/26", price: "$3.50" },
  { id: "2", name: "overnight OATS", added: "2026-02-04", price: "$2.00" },
  { id: "3", name: "", added: "", price: "" },
  { id: "4", name: "fluffy  buttermilk pancakes", added: "12/25/25", price: "$4.25" },
  { id: "5", name: "  Green Smoothie", added: "2026-01-09", price: "$5" },
];

// The ordered cleaning rules, named so the Transform stage can light each one
// up as it applies. The labels are what the viewer reads.
export const RULES = [
  { id: "trim", label: "trim spaces" },
  { id: "case", label: "fix capitalisation" },
  { id: "date", label: "normalise dates" },
  { id: "drop", label: "drop empty rows" },
  { id: "price", label: "parse price to a number" },
];

// "  fluffy  buttermilk PANCAKES " -> "Fluffy Buttermilk Pancakes"
function titleCase(s) {
  return s
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

// "3/2/26" (M/D/YY) -> "2026-03-02"; an already-ISO date is left alone.
function normDate(s) {
  s = s.trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m) {
    const [, mo, d, yy] = m;
    return `20${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return s;
}

// "$3.50" -> 3.5 (a real number you could add up); "" -> null.
function parsePrice(s) {
  const cleaned = s.replace(/[^0-9.]/g, "");
  return cleaned ? parseFloat(cleaned) : null;
}

// Run the whole pipeline against RAW_ROWS and hand back each stage's data, so
// the demo (and the tests) render from one computed source of truth.
export function runPipeline() {
  const extracted = RAW_ROWS.map((r) => ({ ...r }));
  const transformed = extracted
    .map((r) => ({
      id: r.id,
      name: titleCase(r.name),
      added: normDate(r.added),
      price: parsePrice(r.price),
    }))
    .filter((r) => r.name !== ""); // the junk row has no name -> dropped
  return { extracted, transformed, loaded: transformed };
}

// The staff handbook of a small coffee shop, chopped into eight CHUNKS, plus a
// deliberately tiny EMBEDDING MODEL that turns any text into one number per AXIS.
//
// Nothing here is faked: the question you ask is encoded by the same function
// that encoded the handbook, and the ranking really is cosine similarity
// between those vectors, computed in your browser. The only shortcut is the
// size of the model — see the note on LEXICON below.

// --- the "meaning" axes ----------------------------------------------------
// A real embedding model has hundreds or thousands of these, and nobody can say
// what any one of them means. This many fit on screen, and what each one counts
// is the LEXICON section it heads below. They stay unnamed on the page — naming
// them would suggest a real model's numbers can be read, and they can't.
export const AXES = ["timeoff", "money", "shifts", "kit", "staff", "customers"];

// --- the toy encoder's whole vocabulary -----------------------------------
// THIS is the shortcut. A real embedding model learned its own idea of meaning
// from a mountain of text and has an opinion about every word (and about words
// it has never seen). This one is a word list: if a word isn't below, the model
// is blind to it. Everything else about the mechanism is the real mechanism.
export const LEXICON = {
  // time off
  holiday: { timeoff: 2 }, leave: { timeoff: 1.5 }, vacation: { timeoff: 2 },
  annual: { timeoff: 1.2 }, off: { timeoff: 1.2 }, day: { timeoff: 0.5 },
  sick: { timeoff: 2 }, ill: { timeoff: 1.8 }, unwell: { timeoff: 1.8 },
  absence: { timeoff: 2 }, doctor: { timeoff: 1.2 }, bank: { timeoff: 0.8 },
  // money & buying
  pay: { money: 2 }, paid: { money: 1.6 }, payroll: { money: 2 },
  wage: { money: 2 }, salary: { money: 2 }, expense: { money: 2 },
  receipt: { money: 2 }, refund: { money: 1.6, customers: 0.8 },
  reimburse: { money: 2 }, money: { money: 2 }, spend: { money: 1.6 },
  buy: { money: 1.6 }, buying: { money: 1.6 }, cost: { money: 1.4 },
  claim: { money: 1.2 }, tip: { money: 1.2 }, overtime: { money: 1.4, shifts: 1 },
  supplies: { money: 1.2, kit: 0.4 }, milk: { money: 1, kit: 0.4 },
  bean: { money: 1, kit: 0.4 }, cup: { money: 0.8, kit: 0.4 },
  // shifts & hours
  shift: { shifts: 2 }, rota: { shifts: 2 }, schedule: { shifts: 2 },
  hour: { shifts: 1.8 }, opening: { shifts: 1.8 }, closing: { shifts: 1.8 },
  open: { shifts: 0.8, kit: 0.6 }, close: { shifts: 1.2 }, late: { shifts: 1.5 },
  early: { shifts: 1.2 }, morning: { shifts: 1.4 }, start: { shifts: 1 },
  // the machines
  machine: { kit: 2 }, espresso: { kit: 2 }, grinder: { kit: 2 },
  grind: { kit: 1.6 }, leak: { kit: 2 }, broken: { kit: 1.8 },
  fault: { kit: 2 }, repair: { kit: 2 }, engineer: { kit: 1.8 },
  fix: { kit: 1.6 }, pressure: { kit: 1.6 }, boiler: { kit: 1.8 },
  steam: { kit: 1.4 }, calibration: { kit: 1.4 }, fridge: { kit: 1.6 },
  // staff & training
  manager: { staff: 2 }, supervisor: { staff: 1.8 }, training: { staff: 2 },
  train: { staff: 1.6 }, starter: { staff: 1.8 }, onboarding: { staff: 2 },
  colleague: { staff: 1.6 }, staff: { staff: 1.5 }, team: { staff: 1.5 },
  approval: { staff: 1.2 },
  // customers
  customer: { customers: 2 }, complaint: { customers: 1.6 },
  remake: { customers: 1.2 }, drink: { customers: 0.8, kit: 0.4 },
};

const WORD_RE = /[a-z0-9']+/g;

// Crude suffix trimming so "leaking", "refunds" and "holidays" find their entry.
function lookup(word) {
  if (LEXICON[word]) return word;
  for (const suffix of ["s", "es", "ing", "ed", "'s"]) {
    if (word.endsWith(suffix)) {
      const stem = word.slice(0, -suffix.length);
      if (stem.length >= 3 && LEXICON[stem]) return stem;
    }
  }
  return null;
}

// ENCODE — text in, one point out, with an axis per coordinate. This is the
// whole job of the retrieval model: it never writes a word, it only places
// text. Vectors are scaled to length 1 so long text can't out-shout short text.
export function encode(text) {
  const raw = {};
  for (const axis of AXES) raw[axis] = 0;
  const hits = [];
  for (const token of String(text).toLowerCase().match(WORD_RE) || []) {
    const found = lookup(token);
    if (!found) continue;
    hits.push(found);
    for (const [axis, weight] of Object.entries(LEXICON[found])) raw[axis] += weight;
  }
  const length = Math.hypot(...AXES.map((axis) => raw[axis]));
  const vec = {};
  for (const axis of AXES) vec[axis] = length ? raw[axis] / length : 0;
  return { vec, hits: [...new Set(hits)] };
}

// Similarity between two already-scaled vectors: 1 = same direction, 0 = nothing
// in common. "Nearest" in this space is what "relevant" means to a retriever.
export function cosine(a, b) {
  return AXES.reduce((sum, axis) => sum + a[axis] * b[axis], 0);
}

// --- the handbook ----------------------------------------------------------
// `answer` is this chunk's fact written as a sentence, used when the page shows
// what a language model would have written back from it.
const HANDBOOK = [
  {
    id: "holiday",
    title: "Holiday allowance",
    text: "Every member of staff gets 28 days of paid holiday a year, on top of bank holidays. Request time off in the rota app at least two weeks ahead.",
    answer: "you get 28 days of paid holiday a year on top of bank holidays, requested in the rota app two weeks ahead",
  },
  {
    id: "sick",
    title: "Sick days",
    text: "If you are ill, text your shift manager before 7am. The first three sick days in a row need no doctor's note, and are paid at your normal rate.",
    answer: "sick days are separate from holiday — text your shift manager before 7am, and the first three in a row need no doctor's note",
  },
  {
    id: "expenses",
    title: "Buying supplies",
    text: "You can spend up to 50 pounds on supplies — milk, beans, cups — without asking. Upload the receipt to the expenses app within 30 days and payroll refunds you in the next pay run.",
    answer: "supplies under 50 pounds need no approval: upload the receipt within 30 days and payroll refunds you in the next pay run",
  },
  {
    id: "paydates",
    title: "When you get paid",
    text: "Wages land on the 28th of the month. Anything you claim after the 20th — overtime, expenses, tips — is paid the following month instead.",
    answer: "wages land on the 28th, and anything claimed after the 20th is paid the month after",
  },
  {
    id: "opening",
    title: "The opening shift",
    text: "The opening shift starts at 6:30am. Grinder calibration and a first shot go before the doors open at 7. The closing shift cashes up and cleans the group heads.",
    answer: "the opening shift starts at 6:30am, with grinder calibration before the doors open at 7",
  },
  {
    id: "machine",
    title: "If the espresso machine faults",
    text: "A machine that leaks, screams or will not hold pressure is switched off at the wall and reported to the engineer the same day. Never open the boiler yourself.",
    answer: "switch the machine off at the wall and report it to the engineer the same day — and never open the boiler yourself",
  },
  {
    id: "starters",
    title: "New starters",
    text: "Every new starter works two paid training shifts alongside a supervisor before they are put on a rota alone.",
    answer: "a new starter works two paid training shifts with a supervisor before going on the rota alone",
  },
  {
    id: "refunds",
    title: "Refunds and remakes",
    text: "Remake any drink a customer is unhappy with, free, no questions asked. Refunds under 10 pounds need no manager approval; above that, ask the shift manager.",
    answer: "remake any unhappy customer's drink for free, and refunds under 10 pounds need no manager approval",
  },
];

// The INDEX: every chunk encoded once, up front — long before anyone asks
// anything. At question time only the question still needs encoding.
export const CHUNKS = HANDBOOK.map((c) => ({ ...c, vec: encode(`${c.title} ${c.text}`).vec }));

export const TOP_K = 3; // how many nearest chunks retrieval hands over
export const MIN_SCORE = 0.4; // below this, a chunk is near-ish but not useful

// One retrieval run: encode the question, score every chunk against it, keep
// the nearest few. `used` is the subset worth putting in front of the model.
export function retrieve(question) {
  const q = encode(question);
  const scored = CHUNKS.map((chunk) => ({ chunk, score: cosine(q.vec, chunk.vec) })).sort(
    (a, b) => b.score - a.score
  );
  const top = scored.slice(0, TOP_K);
  return { q, scored, top, used: top.filter((s) => s.score >= MIN_SCORE) };
}

// --- the questions on the buttons -----------------------------------------
// `guess` is what a model with no handbook says: fluent, confident, and either
// invented or generic. That gap is the entire reason RAG exists.
//
// The first one is also what the "Play demo" button up top asks, so keep a
// question that retrieves something at the front of the list.
export const QUESTIONS = [
  {
    id: "days",
    q: "How many days off do I get?",
    guess: "Most employers offer around 25 days of annual leave plus bank holidays, so you can expect roughly 25 days.",
    guessNote: "Fluent, reasonable, and wrong — the handbook says 28.",
  },
  {
    id: "leak",
    q: "The espresso machine is leaking, what do I do?",
    guess: "Try descaling the machine and tightening the portafilter gasket. If it still leaks, replace the group head seal yourself.",
    guessNote: "Generic café advice that contradicts the actual rule: switch it off and call the engineer.",
  },
  {
    id: "milk",
    q: "When do I get paid back for buying milk?",
    guess: "Expense claims are typically reimbursed within 14 days of submission through your company's expenses portal.",
    guessNote: "Invented specifics — plausible numbers, not your numbers.",
  },
];

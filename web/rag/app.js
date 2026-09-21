import { h, render } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import htm from "htm";
import { AXES, CHUNKS, MIN_SCORE, QUESTIONS, TOP_K, retrieve } from "./data.js";

const html = htm.bind(h);

// RAG = Retrieval, then Generation — and the point of this page is that those
// two words are two DIFFERENT models doing two different jobs:
//
//   retrieval  — an EMBEDDING MODEL turns text into numbers so "closest" can be
//                computed. It reads; it never writes. It runs over the whole
//                handbook once up front, and over your question each time.
//   generation — an LLM reads the question plus whatever came back, and writes
//                the answer. It writes; it never searches.
//
// The stages fill in one at a time so each hand-off is visible.
const T_ENCODE = 2000; // question -> its list of numbers
const T_SCORE = 280; // between each chunk being scored
const T_SELECT = 1520; // pause on the nearest few
const T_PROMPT = 1280; // between each line of the prompt being assembled
const T_LINE = 1520; // between each sentence the model "writes"

const ORDER = ["idle", "encode", "score", "select", "prompt", "generate", "done"];
const reached = (phase, step) => ORDER.indexOf(phase) >= ORDER.indexOf(step);

// The whole pipeline is taller than a screen, so a run would otherwise play out
// below the fold: each panel is brought into view as it starts working. Gently —
// the page only moves when the panel isn't already readable, it moves the
// shortest way, and it doesn't animate for anyone who asked their system not to.
const FOCUS = { idle: "ask", encode: "retrieve", prompt: "generate" };

const motionOK = () =>
  !window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function reveal(el) {
  if (!el) return;
  const box = el.getBoundingClientRect();
  const view = window.innerHeight || document.documentElement.clientHeight;
  // Already somewhere it can be read? Leave the page where the reader put it —
  // scrolling under someone who is looking at the right thing is the rude case.
  if (box.top >= 0 && (box.bottom <= view || box.top <= view * 0.35)) return;
  // The browser's own scroll, not a hand-rolled one: it yields the moment the
  // reader scrolls, where a script moving the page frame by frame would fight
  // them and feel frozen.
  el.scrollIntoView({ block: "start", behavior: motionOK() ? "smooth" : "auto" });
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (n) => n.toFixed(2);
const fmtVec = (vec) => `[${AXES.map((axis) => fmt(vec[axis])).join(", ")}]`;

// The prompt as data — one entry per line, in the order they appear. Built here
// so the reveal animation and the markup can never disagree on how many lines
// there are.
function buildPrompt(used, question) {
  return [
    {
      kind: "sys",
      text: "Answer using only the context below. If it isn't there, say you don't know.",
    },
    ...(used.length
      ? used.map((s, i) => ({ kind: "ctx", id: s.chunk.id, cite: i + 1, text: s.chunk.text }))
      : [{ kind: "empty", text: "Context: (nothing was retrieved)" }]),
    { kind: "q", text: `Question: ${question}` },
  ];
}

function App() {
  const [phase, setPhase] = useState("idle");
  const [asked, setAsked] = useState(null); // the question being run
  const [draft, setDraft] = useState(""); // the text box
  const [scored, setScored] = useState(0); // how many chunks have been scored
  const [promptLines, setPromptLines] = useState(0);
  const [written, setWritten] = useState(0); // how many answer sentences exist
  const [hi, setHi] = useState(null); // chunk id highlighted everywhere
  const timers = useRef([]);
  const panels = { ask: useRef(null), retrieve: useRef(null), generate: useRef(null) };
  const follow = useRef(false); // only scroll along with a run the reader started
  const result = useMemo(() => (asked ? retrieve(asked) : null), [asked]);

  useEffect(() => {
    window.__APP = {
      ready: true,
      phase,
      order: ORDER,
      question: asked,
      retrieved: result ? result.top.map((s) => s.chunk.id) : [],
      used: result ? result.used.map((s) => s.chunk.id) : [],
    };
  }, [phase, asked, result]);

  // Cancel every pending step of a run: on unmount, on Reset, and before a new
  // question starts, so two runs can never animate over each other.
  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const at = (ms, fn) => timers.current.push(setTimeout(fn, ms));
  const done = (step) => reached(phase, step);

  useEffect(() => stop, []);

  // Asking hands the scroll position over to the run: each time the work moves
  // to another panel, the page follows it there. Reset walks back to the box.
  useEffect(() => {
    if (!follow.current) return;
    const panel = panels[FOCUS[phase]];
    if (panel) reveal(panel.current);
  }, [phase]);

  function ask(question) {
    const text = question.trim();
    if (!text) return;
    stop();
    follow.current = true;
    const r = retrieve(text);
    setAsked(text);
    setScored(0);
    setPromptLines(0);
    setWritten(0);
    setHi(null);

    // 1 — the embedding model encodes the question (the index is already done).
    setPhase("encode");
    let t = T_ENCODE;

    // 2 — every chunk is scored against it, nearest first.
    at(t, () => setPhase("score"));
    r.scored.forEach((_, i) => {
      t += T_SCORE;
      at(t, () => setScored(i + 1));
    });

    // 3 — the nearest few are handed over. Retrieval's job ends here.
    t += T_SELECT;
    at(t, () => setPhase("select"));

    // 4 — those chunks are pasted into a prompt, line by line.
    t += T_SELECT;
    at(t, () => setPhase("prompt"));
    const lines = buildPrompt(r.used, text).length;
    for (let i = 0; i < lines; i++) {
      t += T_PROMPT;
      at(t, () => setPromptLines(i + 1));
    }

    // 5 — and only now does the LLM write anything.
    t += T_PROMPT;
    at(t, () => setPhase("generate"));
    const sentences = Math.max(r.used.length, 1);
    for (let i = 0; i < sentences; i++) {
      t += T_LINE;
      at(t, () => setWritten(i + 1));
    }

    t += T_LINE;
    at(t, () => setPhase("done"));
  }

  function reset() {
    stop();
    follow.current = true;
    setPhase("idle");
    setAsked(null);
    setDraft("");
    setScored(0);
    setPromptLines(0);
    setWritten(0);
    setHi(null);
  }

  const running = phase !== "idle" && phase !== "done";

  return html`
    <main class="wrap">
      <header class="head">
        <div class="head-top">
          <h1>What is RAG?</h1>
          <button class="demo" type="button" disabled=${running} onClick=${() => {
            setDraft("");
            ask(QUESTIONS[0].q);
          }}>
            ${running ? "Running…" : "▶ Play demo"}
          </button>
        </div>
        <p class="lede">
          An LLM only knows what it was trained on — not your handbook, your
          tickets or your docs. <strong>RAG</strong> (retrieval-augmented
          generation) fixes that without retraining anything:${" "}
          <strong>look the answer up first, then hand what you found to the model
          and let it write.</strong> The name is the two halves, and each half is${" "}
          <strong>a different model doing a different job</strong>.
        </p>
        <div class="two-models">
          <${ModelCard}
            kind="idx"
            step="Step 0 · The index"
            name="The handbook, encoded"
            io=${`${CHUNKS.length} chunks → ${CHUNKS.length} positions, once`}
            blurb="Done once, ahead of time, by the embedding model: the handbook
                   is cut into chunks and each chunk becomes its list of numbers.
                   Nobody has asked anything yet."
          />
          <${ModelCard}
            kind="enc"
            step="Step 1 · Retrieval"
            name="The embedding model"
            io=${`text → ${fmtVec(CHUNKS[0].vec)}`}
            blurb="Turns any text into a list of numbers — a position, so that
                   “closest” becomes something you can actually compute.
                   It reads. It never writes a word."
          />
          <${ModelCard}
            kind="llm"
            step="Step 2 · Generation"
            name="The LLM"
            io="question + found text → an answer"
            blurb="Reads the question together with the paragraphs retrieval
                   found, and writes the reply in sentences.
                   It writes. It never searches."
          />
        </div>
      </header>

      <${IndexStage} hi=${hi} setHi=${setHi} />
      <section class="ask" ref=${panels.ask}>
        <div class="ask-head">
          <span class="ask-mark">?</span>
          <h2 class="ask-title">Your question</h2>
          <span class="ask-by">you</span>
        </div>
        <p class="ask-sub">
          Everything above already happened, before you got here. Everything below
          happens because you asked — so the question goes in here, and the two
          models take it from there.
        </p>
        <div class="chips">
          ${QUESTIONS.map(
            (q) => html`
              <button
                key=${q.id}
                class=${`chip ${asked === q.q ? "on" : ""}`}
                disabled=${running}
                onClick=${() => {
                  setDraft("");
                  ask(q.q);
                }}
              >
                ${q.q}
              </button>
            `
          )}
        </div>
        <form
          class="askbar"
          onSubmit=${(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <input
            class="ask-input"
            placeholder="…or type your own question"
            value=${draft}
            disabled=${running}
            onInput=${(e) => setDraft(e.currentTarget.value)}
          />
          <button class="run" type="submit" disabled=${running || !draft.trim()}>
            ${running ? "Running…" : "▶ Ask"}
          </button>
          <button class="reset" type="button" onClick=${reset} disabled=${phase === "idle"}>
            Reset
          </button>
        </form>
      </section>
      <div class=${`flow ${done("encode") ? "on" : ""}`}>↓</div>
      <${RetrieveStage}
        panelRef=${panels.retrieve}
        phase=${phase}
        result=${result}
        asked=${asked}
        scored=${scored}
        hi=${hi}
        setHi=${setHi}
      />
      <div class=${`flow ${done("prompt") ? "on" : ""}`}>↓</div>
      <${GenerateStage}
        panelRef=${panels.generate}
        phase=${phase}
        result=${result}
        asked=${asked}
        promptLines=${promptLines}
        written=${written}
        hi=${hi}
        setHi=${setHi}
      />
      <${Compare} />
    </main>
  `;
}

// The banner up top: the whole answer to "which model does what?", plus the
// step that happens before either question — the index the embedding model
// built ahead of time. Numbered 0 to match the stage it becomes below.
function ModelCard({ kind, step, name, io, blurb }) {
  return html`
    <div class=${`model model-${kind}`}>
      <span class="model-step">${step}</span>
      <h2 class="model-name">${name}</h2>
      <p class="model-blurb">${blurb}</p>
      <code class="model-io">${io}</code>
    </div>
  `;
}

// The question as what the encoder actually returns: a list of numbers, and
// nothing else. The slots are deliberately unlabelled — a real embedding
// model's numbers have no names, and naming these would teach the wrong thing.
function Vector({ vec }) {
  return html`
    <div class="vec">
      <span class="vec-bracket">[</span>
      ${AXES.map(
        (axis, i) => html`
          <span class=${`vec-num ${vec[axis] > 0 ? "on" : ""}`} key=${axis}>
            ${fmt(vec[axis])}${i < AXES.length - 1 ? "," : ""}
          </span>
        `
      )}
      <span class="vec-bracket">]</span>
    </div>
  `;
}

function StageShell({ kind, num, title, by, sub, badge, active, reached, panelRef, children }) {
  const cls = ["stage", `stage-${kind}`, active ? "active" : "", reached ? "reached" : ""]
    .filter(Boolean)
    .join(" ");
  return html`
    <section class=${cls} ref=${panelRef}>
      <div class="stage-head">
        <span class="stage-num">${num}</span>
        <span class="stage-name">${title}</span>
        <span class="stage-by">${by}</span>
        ${badge && html`<span class="stage-badge">${badge}</span>`}
      </div>
      <p class="stage-sub">${sub}</p>
      ${children}
    </section>
  `;
}

// THE INDEX — the embedding model's other run: every chunk of the handbook,
// encoded once, ahead of time. Nobody has asked anything yet.
function IndexStage({ hi, setHi }) {
  return html`
    <${StageShell}
      kind="index"
      num="0"
      title="The index"
      by="built by the embedding model"
      badge=${`${CHUNKS.length} chunks · ${AXES.length} numbers each`}
      sub="Before anyone asks anything, the handbook is cut into chunks and each
           chunk is encoded once. This is why answering is fast later: the slow
           part already happened."
      active=${false}
      reached=${true}
    >
      <p class="why">
        <strong>Six numbers is a position.</strong> Two numbers pick a spot on a
        map, three pick a spot in a room — six picks a spot in a space nobody can
        picture, but “how far apart are these two?” is the same arithmetic however
        many there are. That's all this step does: turn text into a position, so
        that text about the same thing ends up near other text about the same
        thing. Related becomes near, and near is something a computer can measure.
      </p>
      <div class="chunks">
        ${CHUNKS.map(
          (c) => html`
            <div
              key=${c.id}
              class=${`chunk ${hi === c.id ? "hi" : ""}`}
              onMouseEnter=${() => setHi(c.id)}
              onMouseLeave=${() => setHi(null)}
            >
              <div class="chunk-text">
                <span class="chunk-title">${c.title}</span>
                <span class="chunk-body">${c.text}</span>
              </div>
              <code class="vecnum">${fmtVec(c.vec)}</code>
            </div>
          `
        )}
      </div>
    </${StageShell}>
  `;
}

// 1 — RETRIEVAL. The question gets encoded by the SAME model that built the
// index (it has to be — two different models put text in two different spaces),
// then every chunk is scored by how close it sits. No language is generated
// anywhere in this stage.
function RetrieveStage({ panelRef, phase, result, asked, scored, hi, setHi }) {
  const active = ["encode", "score", "select"].includes(phase);
  const shown = result && reached(phase, "encode");
  const selected = reached(phase, "select");
  return html`
    <${StageShell}
      panelRef=${panelRef}
      kind="retrieve"
      num="1"
      title="Retrieval"
      by="the embedding model"
      badge=${shown && result ? `nearest ${TOP_K} of ${CHUNKS.length}` : ""}
      sub="Your question goes through the same encoder the index did — it has to
           be the same one, or the numbers wouldn't be comparable. Then it is
           pure arithmetic: how close is each chunk? Every score below is really
           computed, here, as you watch."
      active=${active}
      reached=${shown}
    >
      ${!shown
        ? html`<${Waiting} label="waiting for a question" />`
        : html`
            <div class="split">
              <div class="pane">
                <h3 class="pane-title">The question, encoded</h3>
                <p class="qtext">“${asked}”</p>
                <p class="words">
                  ${result.q.hits.length
                    ? html`
                        <span class="words-label">words it recognised:</span>
                        ${result.q.hits.map((w) => html`<span key=${w} class="w-hit">${w}</span>`)}
                      `
                    : html`<span class="words-none">
                        It recognised none of these words — so the question has no
                        position at all, and nothing can be near it.
                      </span>`}
                </p>
                <${Vector} vec=${result.q.vec} />
                <p class="pane-note">
                  <strong>The slots have no names</strong>, and in a real embedding
                  model they couldn't: it returns several hundred numbers, and
                  nobody can say what any one of them means. What matters is only
                  that the same encoder always sends the same kind of text to the
                  same place — that's what makes two pieces of text comparable.
                </p>
              </div>
              <div class="pane">
                <h3 class="pane-title">Every chunk, scored against it</h3>
                <ol class="ranks">
                  ${result.scored.map((s, i) => {
                    const shown = scored > i;
                    const isTop = selected && result.top.includes(s);
                    const isUsed = selected && result.used.includes(s);
                    const cls = [
                      "rank",
                      shown ? "shown" : "",
                      isTop ? "top" : "",
                      isUsed ? "used" : "",
                      selected && !isTop ? "cut" : "",
                      hi === s.chunk.id ? "hi" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return html`
                      <li
                        key=${s.chunk.id}
                        class=${cls}
                        onMouseEnter=${() => setHi(s.chunk.id)}
                        onMouseLeave=${() => setHi(null)}
                      >
                        <span class="rank-title">${s.chunk.title}</span>
                        <span class="rank-track">
                          <i style=${`width:${shown ? Math.max(s.score * 100, 1) : 0}%`}></i>
                        </span>
                        <span class="rank-score">${shown ? s.score.toFixed(2) : "—"}</span>
                        <span class="rank-flag">
                          ${isUsed ? "handed over" : isTop && shown ? "too weak" : ""}
                        </span>
                      </li>
                    `;
                  })}
                </ol>
                ${selected &&
                html`<p class="pane-note">
                  Nearest ${TOP_K} kept; anything under ${MIN_SCORE.toFixed(2)} is
                  close-ish but not worth showing the model.
                  ${result.used.length === 0
                    ? " Here that's all of them — nothing in the handbook is about this."
                    : ""}
                </p>`}
              </div>
            </div>
          `}
    </${StageShell}>
  `;
}

// 2 — GENERATION. Retrieval is over; the embedding model is done for good. The
// chunks it found are pasted into a prompt, and the LLM writes from that.
function GenerateStage({ panelRef, phase, result, asked, promptLines, written, hi, setHi }) {
  const active = ["prompt", "generate"].includes(phase);
  const shown = result && reached(phase, "prompt");
  const used = result ? result.used : [];
  return html`
    <${StageShell}
      panelRef=${panelRef}
      kind="generate"
      num="2"
      title="Generation"
      by="the LLM"
      badge=${shown ? (used.length ? `${used.length} chunks in the prompt` : "no context found") : ""}
      sub="The retrieved text is pasted into the prompt above the question — that
           paste is the whole trick. The model answers from what's in front of
           it rather than from memory."
      active=${active}
      reached=${shown}
    >
      ${!shown
        ? html`<${Waiting} label="waiting for retrieval" />`
        : html`
            <div class="split">
              <div class="pane">
                <h3 class="pane-title">What the LLM actually receives</h3>
                <div class="prompt">
                  ${buildPrompt(used, asked)
                    .slice(0, promptLines)
                    .map(
                      (line) => html`
                        <div
                          key=${line.text}
                          class=${`p-line p-${line.kind} ${hi === line.id ? "hi" : ""}`}
                          onMouseEnter=${() => setHi(line.id || null)}
                          onMouseLeave=${() => setHi(null)}
                        >
                          ${line.cite && html`<span class="cite">[${line.cite}]</span> `}${line.text}
                        </div>
                      `
                    )}
                </div>
                <p class="pane-note">
                  Nothing was retrained or remembered — next question, this prompt
                  is built again from scratch.
                </p>
              </div>
              <div class="pane">
                <h3 class="pane-title">What it writes back</h3>
                <div class=${`answer ${phase === "generate" ? "writing" : ""}`}>
                  ${used.length === 0
                    ? written > 0 &&
                      html`<p class="a-refuse">
                        I can't find anything about that in the handbook.
                      </p>`
                    : html`
                        ${written > 0 && html`<p class="a-lead">From the handbook:</p>`}
                        ${used.map(
                          (s, i) =>
                            written > i &&
                            html`
                              <p
                                key=${s.chunk.id}
                                class=${`a-line ${hi === s.chunk.id ? "hi" : ""}`}
                                onMouseEnter=${() => setHi(s.chunk.id)}
                                onMouseLeave=${() => setHi(null)}
                              >
                                ${capitalize(s.chunk.answer)}
                                <span class="cite">[${i + 1}]</span>
                              </p>
                            `
                        )}
                      `}
                  ${written === 0 && html`<p class="a-wait">…</p>`}
                </div>
                <p class="staged">
                  <strong>No language model runs here.</strong> Retrieval above is
                  real; this reply is stitched from the chunks it found, so the
                  page needs no server. A real app sends the prompt on the left to
                  an LLM.
                </p>
                <p class="pane-note">
                  Each sentence cites its chunk — hover one to light it up in the
                  prompt and the index. RAG answers can be checked.
                </p>
              </div>
            </div>
          `}
    </${StageShell}>
  `;
}

function Waiting({ label }) {
  return html`
    <div class="stage-empty">
      <span class="stage-empty-dot"></span><span>${label}</span>
    </div>
  `;
}

// The straight answer to "so which model does what?", in one table.
const ROWS = [
  {
    q: "Its job",
    enc: "Place text in space, so closeness can be measured",
    llm: "Write the answer",
  },
  { q: "What comes out", enc: "A list of numbers", llm: "Words" },
  {
    q: "How often it runs",
    enc: "Once over every chunk up front, then once per question",
    llm: "Once per question",
  },
  {
    q: "What it knows",
    enc: "Nothing about your question's answer — only where text sits",
    llm: "Only what is in the prompt it was handed",
  },
  { q: "Size & cost", enc: "Small, fast, pennies", llm: "Large, slower, the expensive part" },
  {
    q: "When it fails",
    enc: "It hands over the wrong paragraphs",
    llm: "It writes something the paragraphs don't support",
  },
];

function Compare() {
  return html`
    <section class="compare">
      <h2>Two models, two jobs</h2>
      <table class="cmp">
        <thead>
          <tr>
            <th></th>
            <th class="c-enc">Embedding model <span>retrieval</span></th>
            <th class="c-llm">LLM <span>generation</span></th>
          </tr>
        </thead>
        <tbody>
          ${ROWS.map(
            (r) => html`
              <tr key=${r.q}>
                <th scope="row">${r.q}</th>
                <td class="c-enc">${r.enc}</td>
                <td class="c-llm">${r.llm}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
      <p class="compare-note">
        Bad retrieval is the failure people mistake for a “dumb model”: hand an
        LLM the wrong paragraphs and it will answer confidently from the wrong
        paragraphs. Most of the work in a real RAG system is spent on step 1.
      </p>
    </section>
  `;
}

render(html`<${App} />`, document.getElementById("app"));

import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
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
const T_ENCODE = 820; // question -> its five numbers
const T_SCORE = 110; // between each chunk being scored
const T_SELECT = 620; // pause on the nearest few
const T_PROMPT = 520; // between each line of the prompt being assembled
const T_LINE = 620; // between each sentence the model "writes"

const ORDER = ["idle", "encode", "score", "select", "prompt", "generate", "done"];
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function App() {
  const [phase, setPhase] = useState("idle");
  const [asked, setAsked] = useState(null); // the question being run
  const [result, setResult] = useState(null); // what retrieve() returned
  const [draft, setDraft] = useState(""); // the text box
  const [scored, setScored] = useState(0); // how many chunks have been scored
  const [promptLines, setPromptLines] = useState(0);
  const [written, setWritten] = useState(0); // how many answer sentences exist
  const [hi, setHi] = useState(null); // chunk id highlighted everywhere
  const timers = useRef([]);

  useEffect(() => {
    window.__APP = {
      ready: true,
      phase,
      question: asked,
      retrieved: result ? result.top.map((s) => s.chunk.id) : [],
      used: result ? result.used.map((s) => s.chunk.id) : [],
    };
  }, [phase, asked, result]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const at = (ms, fn) => timers.current.push(setTimeout(fn, ms));
  const reached = (p) => ORDER.indexOf(phase) >= ORDER.indexOf(p);

  function ask(question) {
    const text = question.trim();
    if (!text) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const r = retrieve(text);
    setAsked(text);
    setResult(r);
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
    const lines = 2 + Math.max(r.used.length, 1);
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
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("idle");
    setAsked(null);
    setResult(null);
    setDraft("");
    setScored(0);
    setPromptLines(0);
    setWritten(0);
    setHi(null);
  }

  const running = phase !== "idle" && phase !== "done";
  const preset = QUESTIONS.find((q) => q.q === asked) || null;

  return html`
    <main class="wrap">
      <header class="head">
        <h1>What is RAG?</h1>
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
            kind="enc"
            step="Step 1 · Retrieval"
            name="The embedding model"
            io="text → [0.94, 0.18, 0.22, 0.00, 0.17, 0.00]"
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
        <div class="controls">
          <span class="controls-label">Ask the handbook:</span>
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
        </div>
      </header>

      <${IndexStage} hi=${hi} setHi=${setHi} />
      <div class=${`flow ${reached("encode") ? "on" : ""}`}>↓</div>
      <${RetrieveStage}
        phase=${phase}
        reached=${reached("encode")}
        result=${result}
        asked=${asked}
        scored=${scored}
        selected=${reached("select")}
        hi=${hi}
        setHi=${setHi}
      />
      <div class=${`flow ${reached("prompt") ? "on" : ""}`}>↓</div>
      <${GenerateStage}
        phase=${phase}
        reached=${reached("prompt")}
        result=${result}
        asked=${asked}
        preset=${preset}
        promptLines=${promptLines}
        written=${written}
        hi=${hi}
        setHi=${setHi}
      />
      <${Compare} />
    </main>
  `;
}

// The two-models banner: the whole answer to "which model does what?", up top.
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

// A vector drawn as five bars — the only honest picture of "text as numbers".
function Vector({ vec, labels }) {
  return html`
    <div class=${`vec ${labels ? "vec-labelled" : ""}`}>
      ${AXES.map(
        (a) => html`
          <div class="vec-axis" key=${a.key} title=${a.label}>
            <span class="vec-bar">
              <i style=${`height:${Math.max(Math.round(vec[a.key] * 100), 2)}%`}></i>
            </span>
            <span class="vec-num">${vec[a.key].toFixed(2)}</span>
            ${labels && html`<span class="vec-label">${a.label}</span>`}
          </div>
        `
      )}
    </div>
  `;
}

function StageShell({ kind, num, title, by, sub, badge, active, reached, children }) {
  const cls = ["stage", `stage-${kind}`, active ? "active" : "", reached ? "reached" : ""]
    .filter(Boolean)
    .join(" ");
  return html`
    <section class=${cls}>
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
              <${Vector} vec=${c.vec} />
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
function RetrieveStage({ phase, reached, result, asked, scored, selected, hi, setHi }) {
  const active = ["encode", "score", "select"].includes(phase);
  return html`
    <${StageShell}
      kind="retrieve"
      num="1"
      title="Retrieval"
      by="the embedding model"
      badge=${reached && result ? `nearest ${TOP_K} of ${CHUNKS.length}` : ""}
      sub="Your question goes through the same encoder the index did — it has to
           be the same one, or the numbers wouldn't be comparable. Then it is
           pure arithmetic: how close is each chunk? Every score below is really
           computed, here, as you watch."
      active=${active}
      reached=${reached}
    >
      ${!reached
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
                <${Vector} vec=${result.q.vec} labels=${true} />
                <p class="pane-note">
                  Six numbers here; a real embedding model gives back several
                  hundred, and no human chose what any of them mean.
                </p>
              </div>
              <div class="pane">
                <h3 class="pane-title">Every chunk, scored against it</h3>
                <ol class="ranks">
                  ${result.scored.map((s, i) => {
                    const shown = scored > i;
                    const isTop = selected && i < TOP_K;
                    const isUsed = isTop && s.score >= MIN_SCORE;
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
function GenerateStage({ phase, reached, result, asked, preset, promptLines, written, hi, setHi }) {
  const active = ["prompt", "generate"].includes(phase);
  const used = result ? result.used : [];
  return html`
    <${StageShell}
      kind="generate"
      num="2"
      title="Generation"
      by="the LLM"
      badge=${reached ? (used.length ? `${used.length} chunks in the prompt` : "no context found") : ""}
      sub="The retrieved text is pasted into the prompt above the question — that
           paste is the whole trick. The model answers from what's in front of
           it rather than from memory."
      active=${active}
      reached=${reached}
    >
      ${!reached
        ? html`<${Waiting} label="waiting for retrieval" />`
        : html`
            <div class="split">
              <div class="pane">
                <h3 class="pane-title">What the LLM actually receives</h3>
                <div class="prompt">
                  ${promptLines > 0 &&
                  html`<div class="p-line p-sys">
                    Answer using only the context below. If it isn't there, say you
                    don't know.
                  </div>`}
                  ${used.length === 0
                    ? promptLines > 1 &&
                      html`<div class="p-line p-empty">Context: (nothing was retrieved)</div>`
                    : used.map(
                        (s, i) =>
                          promptLines > i + 1 &&
                          html`
                            <div
                              key=${s.chunk.id}
                              class=${`p-line p-ctx ${hi === s.chunk.id ? "hi" : ""}`}
                              onMouseEnter=${() => setHi(s.chunk.id)}
                              onMouseLeave=${() => setHi(null)}
                            >
                              <span class="cite">[${i + 1}]</span> ${s.chunk.text}
                            </div>
                          `
                      )}
                  ${promptLines >= 2 + Math.max(used.length, 1) &&
                  html`<div class="p-line p-q">Question: ${asked}</div>`}
                </div>
                <p class="pane-note">
                  Nothing was retrained and nothing was remembered. Next question,
                  this prompt is thrown away and built again.
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
                  <strong>No language model runs on this page.</strong> Retrieval
                  above is real — your words are encoded and scored in your
                  browser. This reply is stitched from the sentences the
                  retrieved chunks carry, so the demo needs no server and no API
                  key. In a real app the prompt on the left is exactly what gets
                  sent, and the reply comes back written. Type your own question
                  and you'll see the difference: the chunks it finds are genuinely
                  found, but the wording won't bend to fit what you asked.
                </p>
                <p class="pane-note">
                  Every sentence carries the chunk it came from — hover one to
                  light it up in the prompt and the index. That traceability is
                  the other thing RAG buys you: an answer you can check.
                </p>
                <div class="norag">
                  <h4>Same question, no retrieval</h4>
                  ${preset
                    ? html`
                        <p class="norag-answer">“${preset.guess}”</p>
                        <p class="norag-note">${preset.guessNote}</p>
                      `
                    : html`<p class="norag-note">
                        Ask one of the four questions above to see what the model
                        says with no handbook in front of it.
                      </p>`}
                </div>
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

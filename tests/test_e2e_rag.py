"""End-to-end tests for the RAG demo."""
import os

import pytest
from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


@pytest.fixture()
def rag(page: Page, server_url: str):
    page.set_viewport_size({"width": 1280, "height": 1400})
    page.goto(server_url + "/rag/")
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)
    return page


def wait_until(page: Page, phase: str = "done"):
    """Block until the scripted run has reached `phase` (the page publishes the
    phase order, so tests wait exactly as far as they need to and no further)."""
    page.wait_for_function(
        f"() => window.__APP.order.indexOf(window.__APP.phase) >= "
        f"window.__APP.order.indexOf('{phase}')",
        timeout=20000,
    )


def ask(page: Page, question: str, until: str = "done"):
    page.locator("button.chip", has_text=question).click()
    wait_until(page, until)


IN_VIEW = """(sel) => {
    const b = document.querySelector(sel).getBoundingClientRect();
    const h = window.innerHeight;
    // Where the page leaves a panel it has scrolled to: top on screen, and
    // either the whole panel visible or its top in the upper half.
    return b.top >= -2 && (b.bottom <= h + 2 || b.top <= h * 0.5);
}"""


def wait_in_view(page: Page, selector: str):
    """Block until `selector` has been scrolled to (smooth scrolling takes a
    moment, so this polls rather than sampling once)."""
    page.wait_for_function(IN_VIEW, arg=selector, timeout=5000)


def test_both_models_are_named_up_front(rag: Page):
    # The page's whole point: two models, one per half of the acronym — and the
    # step before both, numbered 0 to match the stage it becomes further down.
    expect(rag.locator(".model")).to_have_count(3)
    expect(rag.locator(".model-idx")).to_contain_text("Step 0")
    expect(rag.locator(".model-idx")).to_contain_text("index")
    expect(rag.locator(".model-idx")).to_contain_text("embedding model")
    expect(rag.locator(".model-enc")).to_contain_text("embedding model")
    expect(rag.locator(".model-enc")).to_contain_text("Retrieval")
    expect(rag.locator(".model-llm")).to_contain_text("LLM")
    expect(rag.locator(".model-llm")).to_contain_text("Generation")
    rag.screenshot(path=os.path.join(SHOTS, "16-rag-idle.png"), full_page=True)


def test_the_selected_question_stays_legible_under_the_cursor(rag: Page):
    # The chip you just clicked keeps the cursor on it. Its hover tint must not
    # win over its selected style, or the label goes teal-on-teal and vanishes.
    chip = rag.locator("button.chip").first
    chip.click()
    # The hover style only applies once the run finishes and the chip re-enables.
    wait_until(rag)
    chip.hover()
    # Poll: the colour transition takes a moment to settle.
    rag.wait_for_function(
        """() => {
             const el = document.querySelector('button.chip.on');
             const cs = getComputedStyle(el);
             const rgb = (c) => c.match(/\\d+/g).slice(0, 3).map(Number);
             const [f, b] = [rgb(cs.color), rgb(cs.backgroundColor)];
             return f.reduce((d, v, i) => d + Math.abs(v - b[i]), 0) > 200;
           }""",
        timeout=5000,
    )


def test_index_is_encoded_before_any_question(rag: Page):
    # Stage 0 is filled at rest — the handbook was encoded ahead of time.
    expect(rag.locator(".stage-index .chunk")).to_have_count(8)
    # …and the page says in one place what those six numbers even are.
    expect(rag.locator(".stage-index .why")).to_contain_text("Six numbers is a position")
    # Every chunk carries its six numbers, written out as numbers.
    expect(rag.locator(".stage-index .vecnum")).to_have_count(8)
    expect(
        rag.locator(".stage-index .chunk", has_text="Holiday allowance").locator(".vecnum")
    ).to_have_text("[0.94, 0.18, 0.22, 0.00, 0.17, 0.00]")
    # Retrieval and generation wait for a question.
    expect(rag.locator(".stage-empty")).to_have_count(2)


def test_the_question_box_sits_between_the_index_and_retrieval(rag: Page):
    # Asking is its own step in the flow, and it belongs where it happens: after
    # the index that was built ahead of time, before the retrieval that cannot
    # start until you have asked something.
    order = rag.evaluate(
        """() => [...document.querySelectorAll(
                    '.stage-index, .ask, .stage-retrieve, .stage-generate')]
                   .map((el) => el.classList.contains('ask') ? 'ask'
                        : el.classList.contains('stage-index') ? 'index'
                        : el.classList.contains('stage-retrieve') ? 'retrieve'
                        : 'generate')"""
    )
    assert order == ["index", "ask", "retrieve", "generate"]
    # …which means it is no longer part of the header.
    expect(rag.locator(".head button.chip")).to_have_count(0)
    expect(rag.locator(".ask button.chip")).to_have_count(4)
    expect(rag.locator(".ask .ask-input")).to_be_visible()


def test_retrieval_encodes_the_question_and_ranks_every_chunk(rag: Page):
    ask(rag, "How many days off do I get?")
    # The question was encoded by the same model, and the words it knows are shown.
    expect(rag.locator(".stage-retrieve .qtext")).to_contain_text("How many days off")
    expect(rag.locator(".stage-retrieve .w-hit")).to_have_count(2)  # "day", "off"
    # Its vector is written out as bare numbers — one slot non-zero, none named.
    expect(rag.locator(".stage-retrieve .vec-num")).to_have_count(6)
    expect(rag.locator(".stage-retrieve .vec-num.on")).to_have_count(1)
    expect(rag.locator(".stage-retrieve .vec-num").first).to_contain_text("1.00")
    # And the page says why they are nameless.
    expect(rag.locator(".stage-retrieve")).to_contain_text("The slots have no names")
    # All 8 chunks scored; the nearest two clear the threshold and are handed over.
    expect(rag.locator(".stage-retrieve .rank")).to_have_count(8)
    used = rag.locator(".stage-retrieve .rank.used")
    expect(used).to_have_count(2)
    expect(used.first).to_contain_text("Holiday allowance")
    expect(used.nth(1)).to_contain_text("Sick days")
    assert rag.evaluate("() => window.__APP.used") == ["holiday", "sick"]
    rag.screenshot(path=os.path.join(SHOTS, "17-rag-answered.png"), full_page=True)


def test_a_near_miss_is_retrieved_but_dropped(rag: Page):
    # Retrieval is fuzzy: "The opening shift" is the third-nearest chunk to a
    # question about the espresso machine (grinders, opening up) — near, but
    # not near enough to be worth showing the model.
    ask(rag, "The espresso machine is leaking, what do I do?", until="select")
    expect(rag.locator(".stage-retrieve .rank.top")).to_have_count(3)
    expect(rag.locator(".stage-retrieve .rank.used")).to_have_count(1)
    weak = rag.locator(".stage-retrieve .rank.top", has_text="The opening shift")
    expect(weak).to_contain_text("too weak")


def test_generation_gets_the_chunks_in_its_prompt_and_cites_them(rag: Page):
    ask(rag, "When do I get paid back for buying milk?")
    prompt = rag.locator(".stage-generate .prompt")
    expect(prompt).to_contain_text("Answer using only the context below")
    expect(prompt).to_contain_text("Question: When do I get paid back for buying milk?")
    # The two retrieved chunks are pasted in verbatim…
    expect(rag.locator(".stage-generate .p-ctx")).to_have_count(2)
    expect(prompt).to_contain_text("Upload the receipt to the expenses app")
    # …and every written sentence points back at the chunk it came from.
    lines = rag.locator(".stage-generate .a-line")
    expect(lines).to_have_count(2)
    expect(lines.first).to_contain_text("[1]")
    expect(rag.locator(".stage-generate .answer")).to_contain_text("30 days")


def test_the_page_says_no_llm_actually_runs(rag: Page):
    # The input box invites any question, so the page has to be plain about
    # which half is genuinely running: retrieval yes, generation no.
    ask(rag, "How many days off do I get?", until="prompt")
    staged = rag.locator(".stage-generate .staged")
    expect(staged).to_contain_text("No language model runs here")
    expect(staged).to_contain_text("stitched")
    expect(rag.locator(".stage-retrieve")).to_contain_text("Every score below is really computed")


def test_hovering_a_written_line_lights_up_its_source(rag: Page):
    ask(rag, "When do I get paid back for buying milk?")
    rag.locator(".stage-generate .a-line").first.hover()
    # The same chunk lights in the prompt, the ranking and the index.
    expect(rag.locator(".stage-generate .p-ctx.hi")).to_have_count(1)
    expect(rag.locator(".stage-retrieve .rank.hi")).to_have_count(1)
    expect(rag.locator(".stage-index .chunk.hi")).to_contain_text("Buying supplies")


def test_nothing_relevant_means_the_model_says_it_does_not_know(rag: Page):
    # The handbook has nothing about wifi, so retrieval hands over nothing and
    # generation has nothing to answer from — the honest RAG failure mode.
    ask(rag, "What is the wifi password?")
    expect(rag.locator(".stage-retrieve .words-none")).to_be_visible()
    expect(rag.locator(".stage-retrieve .rank.used")).to_have_count(0)
    assert rag.evaluate("() => window.__APP.used") == []
    expect(rag.locator(".stage-generate .p-empty")).to_contain_text("nothing was retrieved")
    expect(rag.locator(".stage-generate .a-refuse")).to_contain_text("can't find anything")
    # And the contrast: with no retrieval the model invents a password anyway.
    expect(rag.locator(".norag-answer")).to_contain_text("northwind-guest")
    rag.screenshot(path=os.path.join(SHOTS, "18-rag-no-answer.png"), full_page=True)


def test_a_typed_question_is_encoded_the_same_way(rag: Page):
    rag.locator(".ask-input").fill("who trains a new starter?")
    rag.locator("button.run").click()
    wait_until(rag)
    assert rag.evaluate("() => window.__APP.used")[0] == "starters"
    expect(rag.locator(".stage-generate .answer")).to_contain_text("supervisor")


def test_asking_walks_the_page_down_to_whatever_is_working(rag: Page):
    # The pipeline is taller than a window, so the interesting half of a run
    # would otherwise happen off-screen. A short viewport makes that true here.
    rag.set_viewport_size({"width": 1280, "height": 700})
    chip = rag.locator("button.chip").first
    chip.scroll_into_view_if_needed()
    before = rag.evaluate("() => window.scrollY")

    chip.click()
    wait_until(rag, "score")
    wait_in_view(rag, ".stage-retrieve")
    at_retrieval = rag.evaluate("() => window.scrollY")
    assert at_retrieval > before

    # …and again when the work hands over to the LLM.
    wait_until(rag, "generate")
    wait_in_view(rag, ".stage-generate")
    assert rag.evaluate("() => window.scrollY") > at_retrieval


def test_reset_walks_back_up_to_the_question_box(rag: Page):
    rag.set_viewport_size({"width": 1280, "height": 700})
    ask(rag, "How many days off do I get?")
    wait_in_view(rag, ".stage-generate")
    # dispatch_event rather than click(): a real click would scroll the button
    # into view first, and then there would be nothing left for Reset to prove.
    rag.locator("button.reset").dispatch_event("click")
    wait_in_view(rag, ".ask")


def test_the_page_stays_put_when_the_reader_can_already_see_the_work(rag: Page):
    # Gently: on a window tall enough to show the whole pipeline, asking must
    # not yank the page around — there is nothing off-screen to go to.
    rag.set_viewport_size({"width": 1280, "height": 2400})
    chip = rag.locator("button.chip").first
    chip.scroll_into_view_if_needed()
    before = rag.evaluate("() => window.scrollY")
    chip.click()
    wait_until(rag, "generate")
    rag.wait_for_timeout(600)
    assert rag.evaluate("() => window.scrollY") == before


def test_reset_returns_to_the_index_only(rag: Page):
    # Reset mid-run, so this also covers the pending steps being cancelled: the
    # next scheduled step ("score", 820ms in) lands inside the wait below and
    # would push the phase off "idle" if Reset had not cleared the timers.
    ask(rag, "How many days off do I get?", until="encode")
    rag.locator("button.reset").click()
    rag.wait_for_timeout(1100)
    assert rag.evaluate("() => window.__APP.phase") == "idle"
    expect(rag.locator(".stage-empty")).to_have_count(2)
    expect(rag.locator(".stage-index .chunk")).to_have_count(8)
    rag.wait_for_function("() => window.__APP.question === null", timeout=5000)

"""End-to-end tests for the REST vs GraphQL comparison."""
import os
import re

import pytest
from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)

CURRENT = re.compile(r"\bcurrent\b")
WINS = re.compile(r"\bwins\b")


@pytest.fixture()
def cmp(page: Page, server_url: str):
    page.set_viewport_size({"width": 1100, "height": 800})
    page.goto(server_url + "/rest-vs-graphql/")
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)
    return page


def _situations(page: Page):
    return page.locator(".scenario:not(.all)")


def test_all_situations_is_first_and_shows_everything(cmp: Page):
    expect(cmp.locator(".side")).to_have_count(2)
    first = cmp.locator(".scenario").nth(0)
    expect(first).to_have_class(re.compile(r"\ball\b"))
    expect(first).to_have_class(CURRENT)
    n = _situations(cmp).count()
    assert n > 0
    # Every situation is a pro on one side and a con on the other.
    expect(cmp.locator(".point.pro")).to_have_count(n)
    expect(cmp.locator(".point.con")).to_have_count(n)
    # Fair fight: each side has as many pros as cons.
    for side in ("rest", "graphql"):
        expect(cmp.locator(f".side-{side} .pro")).to_have_count(n // 2)
        expect(cmp.locator(f".side-{side} .con")).to_have_count(n // 2)
    expect(cmp.locator(".side.wins")).to_have_count(0)
    expect(cmp.locator(".wire")).to_have_count(0)
    cmp.screenshot(path=os.path.join(SHOTS, "50-rest-vs-graphql.png"))


def test_picking_a_situation_filters_to_it(cmp: Page):
    for i in range(_situations(cmp).count()):
        chip = _situations(cmp).nth(i)
        chip.click()
        expect(chip).to_have_class(CURRENT)
        winner = "rest" if "win-rest" in chip.get_attribute("class") else "graphql"
        loser = "graphql" if winner == "rest" else "rest"
        expect(cmp.locator(f".side-{winner}")).to_have_class(WINS)
        expect(cmp.locator(f".side-{loser}")).not_to_have_class(WINS)
        # Only this situation's pro (winner) and con (loser) remain.
        expect(cmp.locator(".point")).to_have_count(2)
        expect(cmp.locator(f".side-{winner} .pro")).to_have_count(1)
        expect(cmp.locator(f".side-{loser} .con")).to_have_count(1)
        expect(cmp.locator(".wire")).to_have_count(2)
    cmp.screenshot(path=os.path.join(SHOTS, "51-rest-vs-graphql-filtered.png"))
    cmp.locator(".scenario.all").click()
    expect(cmp.locator(".point")).to_have_count(2 * _situations(cmp).count())


def test_trip_counts_show_on_both_sides_or_neither(cmp: Page):
    expect(cmp.locator(".cost")).to_have_count(0)
    seen = 0
    for i in range(_situations(cmp).count()):
        _situations(cmp).nth(i).click()
        n = cmp.locator(".cost").count()
        assert n in (0, 2)
        seen += n
    assert seen > 0


def test_clicking_a_point_picks_its_situation(cmp: Page):
    cmp.locator(".side-rest .pro").nth(0).click()
    expect(cmp.locator(".side-rest")).to_have_class(WINS)
    expect(cmp.locator(".point")).to_have_count(2)


def test_play_demo_sweeps_situations(cmp: Page):
    cmp.get_by_text("Play demo").click()
    expect(_situations(cmp).nth(0)).to_have_class(CURRENT)
    expect(_situations(cmp).nth(1)).to_have_class(CURRENT, timeout=6000)


def test_on_a_phone_the_demo_follows_the_winner(page: Page, server_url: str):
    page.set_viewport_size({"width": 375, "height": 740})
    page.goto(server_url + "/rest-vs-graphql/")
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)
    assert page.evaluate("document.documentElement.scrollWidth") <= 375
    # The situations are one row of one-line chips.
    chips = page.locator(".scenario")
    boxes = [chips.nth(i).bounding_box() for i in range(chips.count())]
    assert len({round(b["y"]) for b in boxes}) == 1
    assert len({round(b["height"]) for b in boxes}) == 1
    page.get_by_text("Play demo").click()
    # It scrolls the situations up to the top first and steps only after a pause.
    page.wait_for_function("document.querySelector('.scenarios').getBoundingClientRect().top < 2", timeout=700)
    assert page.evaluate("window.__APP.picked") == "all"
    # Each step keeps its situation chip and the side that wins it on screen.
    for i in range(2):
        chip = _situations(page).nth(i)
        expect(chip).to_have_class(CURRENT, timeout=6000)
        expect(chip).to_be_in_viewport(timeout=3000)
        expect(page.locator(".side.wins")).to_be_in_viewport(timeout=3000)
        # Stacked, the winner comes first.
        assert page.locator(".side.wins").bounding_box()["y"] < page.locator(".side.loses").bounding_box()["y"]
        # A long query line scrolls inside its box instead of pushing the card off screen.
        box = page.locator(".side.loses").bounding_box()
        assert box["x"] + box["width"] <= 375
    page.wait_for_timeout(800)  # let the smooth scroll settle for the screenshot
    page.screenshot(path=os.path.join(SHOTS, "52-rest-vs-graphql-phone.png"))

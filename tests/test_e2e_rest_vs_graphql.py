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


def test_two_sides_with_balanced_pros_and_cons(cmp: Page):
    expect(cmp.locator(".side")).to_have_count(2)
    n = cmp.locator(".scenario").count()
    assert n > 0
    # Every situation is a pro on one side and a con on the other.
    expect(cmp.locator(".point.pro")).to_have_count(n)
    expect(cmp.locator(".point.con")).to_have_count(n)
    for side in ("rest", "graphql"):
        pros = cmp.locator(f".side-{side} .pro").count()
        cons = cmp.locator(f".side-{side} .con").count()
        assert pros + cons == n
    cmp.screenshot(path=os.path.join(SHOTS, "50-rest-vs-graphql.png"))


def test_picking_a_scenario_crowns_its_winner(cmp: Page):
    for i in range(cmp.locator(".scenario").count()):
        chip = cmp.locator(".scenario").nth(i)
        chip.click()
        expect(chip).to_have_class(CURRENT)
        winner = "rest" if "win-rest" in chip.get_attribute("class") else "graphql"
        loser = "graphql" if winner == "rest" else "rest"
        expect(cmp.locator(f".side-{winner}")).to_have_class(WINS)
        expect(cmp.locator(f".side-{loser}")).not_to_have_class(WINS)
        # The winner's pro and the loser's con for this situation light up.
        expect(cmp.locator(f".side-{winner} .pro.current")).to_have_count(1)
        expect(cmp.locator(f".side-{loser} .con.current")).to_have_count(1)
        expect(cmp.locator(".point.current")).to_have_count(2)


def test_clicking_a_point_picks_its_scenario(cmp: Page):
    cmp.locator(".side-rest .pro").nth(0).click()
    expect(cmp.locator(".side-rest")).to_have_class(WINS)
    expect(cmp.locator(".side-rest .pro").nth(0)).to_have_class(CURRENT)


def test_play_demo_steps_through_scenarios(cmp: Page):
    cmp.get_by_text("Play demo").click()
    expect(cmp.locator(".scenario").nth(0)).to_have_class(CURRENT)
    expect(cmp.locator(".scenario").nth(1)).to_have_class(CURRENT, timeout=5000)

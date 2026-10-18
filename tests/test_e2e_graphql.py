"""End-to-end tests for the GraphQL demo."""
import json
import os

import pytest
from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


@pytest.fixture()
def gql(page: Page, server_url: str):
    page.set_viewport_size({"width": 1100, "height": 800})
    page.goto(server_url + "/graphql/")
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)
    return page


def _answer(page: Page):
    return json.loads(page.locator(".answer").inner_text())["data"]["recipe"]


def test_answer_matches_ticked_fields(gql: Page):
    ticked = gql.locator(".fields input:checked")
    expect(ticked).to_have_count(2)
    assert sorted(_answer(gql)) == sorted(ticked.evaluate_all("els => els.map(e => e.dataset.leaf)"))
    gql.screenshot(path=os.path.join(SHOTS, "40-graphql.png"))


def test_untick_removes_field_from_answer(gql: Page):
    gql.locator('[data-leaf="minutes"]').uncheck()
    assert list(_answer(gql)) == ["name"]
    assert "minutes" not in gql.locator(".query").inner_text()


def test_author_costs_rest_a_second_trip(gql: Page):
    expect(gql.locator(".trip-rest")).to_have_count(1)
    gql.locator('[data-leaf="author.name"]').check()
    expect(gql.locator(".trip-rest")).to_have_count(2)
    expect(gql.locator(".trip-gql")).to_have_count(1)
    assert list(_answer(gql)["author"]) == ["name"]
    gql.screenshot(path=os.path.join(SHOTS, "41-graphql-author.png"))


def test_play_demo_ticks_fields(gql: Page):
    gql.get_by_text("Play demo").click()
    expect(gql.locator(".fields input:checked")).to_have_count(0)
    expect(gql.locator(".fields input:checked")).to_have_count(1, timeout=4000)
    expect(gql.locator(".fields input:checked")).to_have_count(2, timeout=4000)

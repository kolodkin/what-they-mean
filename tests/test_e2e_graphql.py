"""End-to-end tests for the GraphQL demo."""
import json
import os
import re

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


def test_author_is_reached_in_the_same_query(gql: Page):
    gql.locator('[data-leaf="author.name"]').check()
    assert list(_answer(gql)["author"]) == ["name"]
    gql.screenshot(path=os.path.join(SHOTS, "41-graphql-author.png"))


def test_play_demo_ticks_fields(gql: Page):
    gql.get_by_text("Play demo").click()
    expect(gql.locator(".fields input:checked")).to_have_count(0)
    expect(gql.locator(".fields input:checked")).to_have_count(1, timeout=4000)
    expect(gql.locator(".fields input:checked")).to_have_count(2, timeout=4000)


@pytest.fixture()
def change(gql: Page):
    gql.locator(".tab").nth(1).click()
    expect(gql.locator(".mut")).to_have_count(3)
    return gql


def test_tabs_switch_modes(gql: Page):
    expect(gql.locator(".tab")).to_have_count(2)
    expect(gql.locator(".tab").nth(0)).to_have_class(re.compile(r"\bcurrent\b"))
    gql.locator(".tab").nth(1).click()
    expect(gql.locator(".fields")).to_have_count(0)
    expect(gql.locator(".shelf .item")).to_have_count(3)
    gql.locator(".tab").nth(0).click()
    expect(gql.locator(".fields")).to_have_count(1)


def _mut_answer(page: Page):
    return json.loads(page.locator(".answer").inner_text())


def test_create_update_delete(change: Page):
    change.locator(".mut").nth(0).click()  # create
    expect(change.locator(".shelf .item")).to_have_count(4)
    expect(change.locator(".shelf .item.glow")).to_have_count(1)
    change.locator(".mut").nth(1).click()  # update
    expect(change.locator(".shelf .item.glow")).to_have_count(1)
    assert "errors" not in _mut_answer(change)
    change.locator(".mut").nth(2).click()  # delete
    expect(change.locator(".shelf .item")).to_have_count(3)
    change.screenshot(path=os.path.join(SHOTS, "42-graphql-mutations.png"))


def test_delete_missing_answers_with_errors(change: Page):
    change.locator(".mut").nth(2).click()
    change.locator(".mut").nth(2).click()
    expect(change.locator(".answer")).to_have_class(re.compile(r"\bhas-errors\b"))
    assert _mut_answer(change)["errors"]
    change.get_by_role("button", name=re.compile("Reset")).click()
    expect(change.locator(".shelf .item")).to_have_count(3)


def test_play_demo_sends_mutations(change: Page):
    change.get_by_text("Play demo").click()
    expect(change.locator(".mut").nth(0)).to_have_class(re.compile(r"\bcurrent\b"), timeout=4000)
    expect(change.locator(".mut").nth(2)).to_have_class(re.compile(r"\bcurrent\b"), timeout=8000)
    expect(change.locator(".shelf .item")).to_have_count(3)


@pytest.fixture()
def phone(page: Page, server_url: str):
    page.set_viewport_size({"width": 375, "height": 740})
    page.goto(server_url + "/graphql/")
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)
    assert page.evaluate("document.documentElement.scrollWidth") <= 375
    return page


def test_on_a_phone_the_reading_demo_brings_the_answer_into_view(phone: Page):
    expect(phone.locator(".answer")).not_to_be_in_viewport()
    phone.get_by_text("Play demo").click()
    expect(phone.locator(".answer")).to_be_in_viewport(timeout=5000)


def test_on_a_phone_a_mutation_brings_the_shelf_into_view(phone: Page):
    phone.locator(".tab").nth(1).click()
    phone.evaluate("scrollTo(0, document.body.scrollHeight)")
    # Recipe 2 is what the update mutation changes; it starts off screen.
    expect(phone.locator(".shelf .item").nth(1)).not_to_be_in_viewport()
    phone.locator(".mut").nth(1).click()
    expect(phone.locator(".shelf .item.glow")).to_be_in_viewport(timeout=4000)
    phone.screenshot(path=os.path.join(SHOTS, "43-graphql-phone.png"))

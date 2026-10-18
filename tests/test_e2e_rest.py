"""End-to-end tests for the REST API demo."""
import os
import re

import pytest
from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


@pytest.fixture()
def rest(page: Page, server_url: str):
    page.set_viewport_size({"width": 1100, "height": 800})
    page.goto(server_url + "/rest/")
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)
    return page


def test_menu_of_six_requests(rest: Page):
    expect(rest.locator(".req")).to_have_count(6)
    assert rest.locator(".method").all_inner_texts() == ["GET", "GET", "POST", "PUT", "PATCH", "DELETE"]
    expect(rest.locator(".shelf .item")).to_have_count(3)
    expect(rest.locator(".response")).to_have_count(0)
    rest.screenshot(path=os.path.join(SHOTS, "30-rest.png"))


def test_get_one_highlights_it(rest: Page):
    rest.locator(".req").nth(1).click()
    expect(rest.locator(".req").nth(1)).to_have_class(re.compile(r"\bcurrent\b"))
    expect(rest.locator(".status")).to_have_class(re.compile(r"\bs2\b"))
    expect(rest.locator(".shelf .item.glow")).to_have_count(1)


def test_post_adds_and_delete_removes(rest: Page):
    rest.locator(".req").nth(2).click()  # POST
    expect(rest.locator(".shelf .item")).to_have_count(4)
    rest.locator(".req").nth(5).click()  # DELETE
    expect(rest.locator(".shelf .item")).to_have_count(3)
    # Deleting the same thing twice: the server says it isn't there.
    rest.locator(".req").nth(5).click()
    expect(rest.locator(".status")).to_have_class(re.compile(r"\bs4\b"))
    expect(rest.locator(".shelf .item")).to_have_count(3)
    rest.get_by_role("button", name=re.compile("Reset")).click()
    expect(rest.locator(".shelf .item")).to_have_count(3)
    expect(rest.locator(".response")).to_have_count(0)


def test_play_demo_walks_requests(rest: Page):
    rest.get_by_text("Play demo").click()
    expect(rest.locator(".req").nth(0)).to_have_class(re.compile(r"\bcurrent\b"))
    expect(rest.locator(".req").nth(1)).to_have_class(re.compile(r"\bcurrent\b"), timeout=4000)
    # By the end the POST added one and the DELETE took one away.
    expect(rest.locator(".req").nth(5)).to_have_class(re.compile(r"\bcurrent\b"), timeout=14000)
    expect(rest.locator(".shelf .item")).to_have_count(3)
    rest.screenshot(path=os.path.join(SHOTS, "31-rest-play-demo.png"))


def test_put_replaces_and_patch_keeps_the_rest(rest: Page):
    item = rest.locator(".shelf .item").nth(1)
    name_before = item.locator("strong").inner_text()
    rest.locator(".req").nth(4).click()  # PATCH: only the time changes
    expect(item.locator("strong")).to_have_text(name_before)
    rest.locator(".req").nth(3).click()  # PUT: the whole record is swapped
    expect(item.locator("strong")).not_to_have_text(name_before)

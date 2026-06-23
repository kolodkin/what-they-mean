"""End-to-end tests driving the SPA in a real browser.

Each test saves a screenshot into test-results/ so the e2e screenshot report
has a curated visual record of every flow.
"""
import os
import re

import pytest
from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


def _wait_ready(page: Page):
    """Block until the app has fetched the recipe and rendered it."""
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)


def _shot(page: Page, name: str):
    path = os.path.join(SHOTS, name)
    page.screenshot(path=path, full_page=False)
    assert os.path.getsize(path) > 1000, f"{name} looks empty"


@pytest.fixture()
def app(page: Page, server_url: str):
    page.set_viewport_size({"width": 1100, "height": 800})
    page.goto(server_url + "/")
    _wait_ready(page)
    return page


def test_recipe_card_renders(app: Page):
    """Top pane shows the cooking-app card built from the API data."""
    expect(app.locator(".recipe-card h1")).to_have_text("Fluffy Buttermilk Pancakes")
    assert app.locator(".ingredients li").count() == 8
    assert app.locator(".steps li").count() == 6
    _shot(app, "01-loaded-full-page.png")


def test_api_pane_shows_request_and_response(app: Page):
    """Bottom pane shows GET line, a 200 response, and the three JSON keys."""
    expect(app.locator(".http-line")).to_contain_text("GET")
    expect(app.locator(".http-line")).to_contain_text("/api/recipe.json")
    expect(app.locator(".status-ok")).to_contain_text("200 OK")
    keys = app.locator(".jkey").all_inner_texts()
    assert keys == ['"name"', '"recipe"', '"ingredients"']
    _shot(app, "02-api-pane.png")


def test_send_request_refetches(app: Page):
    """Clicking 'Send request' fires another GET and shows 200 OK again."""
    app.get_by_text("Send request").click()
    # Button shows a sending state, then the response returns.
    expect(app.locator(".status-ok")).to_contain_text("200 OK", timeout=10000)
    _wait_ready(app)
    expect(app.locator(".recipe-card h1")).to_have_text("Fluffy Buttermilk Pancakes")
    _shot(app, "03-after-resend.png")


def test_hover_links_field_to_ui(app: Page):
    """Hovering the 'ingredients' legend dims unrelated fields and glows the match."""
    app.locator(".legend-item", has_text="ingredients").hover()
    expect(app.locator(".field-ingredients")).to_have_class(re.compile(r"\bglow\b"))
    # A non-matching field should be dimmed.
    expect(app.locator(".field-name")).to_have_class(re.compile(r"\bdim\b"))
    _shot(app, "04-hover-link-ingredients.png")

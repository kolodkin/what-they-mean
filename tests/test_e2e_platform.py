"""End-to-end tests for the data platform map demo."""
import os

import pytest
from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


@pytest.fixture()
def platform(page: Page, server_url: str):
    page.set_viewport_size({"width": 1200, "height": 1000})
    page.goto(server_url + "/platform/")
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)
    return page


def test_all_nine_boxes_render(platform: Page):
    # connectors → bronze → normalize → silver → db → gold → {backend, agent} → app
    expect(platform.locator(".box")).to_have_count(9)
    for box_id, name in [
        ("connectors", "Connectors"),
        ("bronze", "Bronze"),
        ("normalize", "Normalize"),
        ("silver", "Silver"),
        ("db", "Database"),
        ("gold", "Gold"),
        ("backend", "Backend"),
        ("agent", "Agent"),
        ("app", "App"),
    ]:
        expect(platform.locator(f".box-{box_id}")).to_contain_text(name)
    platform.screenshot(path=os.path.join(SHOTS, "11-platform-idle.png"))


def test_medallion_layers_are_tagged(platform: Page):
    # The three metal layers carry their name as a tag; nothing else does.
    expect(platform.locator(".box-layer")).to_have_count(3)
    expect(platform.locator(".box-bronze .box-layer")).to_have_text("bronze")
    expect(platform.locator(".box-silver .box-layer")).to_have_text("silver")
    expect(platform.locator(".box-gold .box-layer")).to_have_text("gold")


def test_gold_forks_to_backend_and_agent(platform: Page):
    # The one bit of real architecture: backend and agent sit together in the
    # fork, both downstream of gold and upstream of the app.
    fork = platform.locator(".fork")
    expect(fork.locator(".box")).to_have_count(2)
    expect(fork.locator(".box-backend")).to_be_visible()
    expect(fork.locator(".box-agent")).to_be_visible()
    expect(platform.locator(".tail .box-app")).to_be_visible()


def test_one_fact_appears_in_every_form(platform: Page):
    # The same coffee sale, shown raw at bronze and as a finished card at the app.
    expect(platform.locator(".box-bronze .box-snap")).to_contain_text("iced coffee")
    expect(platform.locator(".box-gold .box-snap")).to_contain_text("14 sold")
    expect(platform.locator(".box-app .box-snap")).to_contain_text("Top seller")


def test_trace_lights_boxes_through_to_the_app(platform: Page):
    expect(platform.locator(".box.lit")).to_have_count(0)
    platform.locator("button.run").click()
    # The trace ends with every box reached, the app among them.
    expect(platform.locator(".box.lit")).to_have_count(9, timeout=10000)
    expect(platform.locator(".box-app.lit")).to_be_visible()
    expect(platform.locator(".trace-caption")).to_contain_text("App")
    platform.screenshot(path=os.path.join(SHOTS, "12-platform-traced.png"))


def test_clicking_a_box_explains_it(platform: Page):
    # The detail panel starts empty, then shows the clicked box's explanation.
    expect(platform.locator(".detail-empty")).to_be_visible()
    platform.locator(".box-bronze").click()
    detail = platform.locator(".detail")
    expect(detail).to_contain_text("Bronze")
    expect(detail).to_contain_text("raw landing pile")
    platform.screenshot(path=os.path.join(SHOTS, "13-platform-detail.png"))


def test_reset_returns_to_idle(platform: Page):
    platform.locator("button.run").click()
    expect(platform.locator(".box.lit")).to_have_count(9, timeout=10000)
    platform.locator(".box-silver").click()
    platform.locator("button.reset").click()
    # Reset clears the trail and any selection.
    expect(platform.locator(".box.lit")).to_have_count(0)
    expect(platform.locator(".detail-empty")).to_be_visible()

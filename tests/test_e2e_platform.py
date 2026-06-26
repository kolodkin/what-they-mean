"""End-to-end tests for the data platform component diagram."""
import os

import pytest
from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


@pytest.fixture()
def platform(page: Page, server_url: str):
    page.set_viewport_size({"width": 1280, "height": 980})
    page.goto(server_url + "/platform/")
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)
    return page


def test_all_nine_nodes_render(platform: Page):
    # connectors → bronze → normalize → silver → db → gold → {backend, agent} → app
    expect(platform.locator(".node")).to_have_count(9)
    for node_id, name in [
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
        expect(platform.locator(f".node-{node_id}")).to_contain_text(name)
    platform.screenshot(path=os.path.join(SHOTS, "11-platform-idle.png"))


def test_wires_connect_every_hop_including_the_fork(platform: Page):
    # Nine directed wires: five along the spine, then gold forks to backend and
    # agent, and both converge on the app.
    expect(platform.locator(".wire")).to_have_count(9)
    for wire in [
        "wire-connectors",  # → bronze
        "wire-bronze",      # → normalize
        "wire-normalize",   # → silver
        "wire-silver",      # → db
        "wire-db",          # → gold
        "wire-backend",     # → app
        "wire-agent",       # → app
    ]:
        expect(platform.locator(f".{wire}")).to_have_count(1)
    # gold leaves on two wires — one to the backend, one to the agent.
    expect(platform.locator(".wire-gold")).to_have_count(2)


def test_medallion_layers_are_tagged(platform: Page):
    # Only the three metal blocks carry their layer name.
    expect(platform.locator(".node-layer")).to_have_count(3)
    expect(platform.locator(".node-bronze .node-layer")).to_have_text("bronze")
    expect(platform.locator(".node-silver .node-layer")).to_have_text("silver")
    expect(platform.locator(".node-gold .node-layer")).to_have_text("gold")


def test_one_fact_appears_in_every_form(platform: Page):
    # The same coffee sale, shown raw at bronze and as a finished card at the app.
    expect(platform.locator(".node-bronze .node-snap")).to_contain_text("iced coffee")
    expect(platform.locator(".node-gold .node-snap")).to_contain_text("14 sold")
    expect(platform.locator(".node-app .node-snap")).to_contain_text("Top seller")


def test_running_lights_the_blocks_through_to_the_app(platform: Page):
    expect(platform.locator(".node.lit")).to_have_count(0)
    platform.locator("button.run").click()
    # Mid-flight: a labelled data packet rides the live wire between blocks.
    expect(platform.locator(".node-silver.lit")).to_be_visible(timeout=10000)
    expect(platform.locator(".wire.live")).not_to_have_count(0)
    platform.screenshot(path=os.path.join(SHOTS, "12-platform-running.png"))
    # The run ends with every block lit, the app among them.
    expect(platform.locator(".node.lit")).to_have_count(9, timeout=10000)
    expect(platform.locator(".node-app.lit")).to_be_visible()
    expect(platform.locator(".trace-caption")).to_contain_text("App")


def test_clicking_a_block_explains_it(platform: Page):
    # The detail panel starts empty, then shows the clicked block's explanation.
    expect(platform.locator(".detail-empty")).to_be_visible()
    platform.locator(".node-bronze").click()
    detail = platform.locator(".detail")
    expect(detail).to_contain_text("Bronze")
    expect(detail).to_contain_text("raw landing pile")
    platform.screenshot(path=os.path.join(SHOTS, "13-platform-detail.png"))


def test_reset_returns_to_idle(platform: Page):
    platform.locator("button.run").click()
    expect(platform.locator(".node.lit")).to_have_count(9, timeout=10000)
    platform.locator(".node-silver").click()
    platform.locator("button.reset").click()
    # Reset clears the trail and any selection.
    expect(platform.locator(".node.lit")).to_have_count(0)
    expect(platform.locator(".detail-empty")).to_be_visible()

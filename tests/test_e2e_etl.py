"""End-to-end tests for the ETL demo."""
import os

import pytest
from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


@pytest.fixture()
def etl(page: Page, server_url: str):
    page.set_viewport_size({"width": 1200, "height": 980})
    page.goto(server_url + "/etl/")
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)
    return page


def test_three_stages_render(etl: Page):
    expect(etl.locator(".stage")).to_have_count(3)
    expect(etl.locator(".stage-extract")).to_contain_text("Extract")
    expect(etl.locator(".stage-transform")).to_contain_text("Transform")
    expect(etl.locator(".stage-load")).to_contain_text("Load")
    # The medallion layers ride along as each stage's label.
    expect(etl.locator(".stage-extract .medallion")).to_have_text("bronze")
    expect(etl.locator(".stage-transform .medallion")).to_have_text("silver")
    expect(etl.locator(".stage-load .medallion")).to_have_text("data store")
    etl.screenshot(path=os.path.join(SHOTS, "08-etl-idle.png"))


def test_extract_holds_the_three_raw_sources_up_front(etl: Page):
    # The raw, mismatched sources exist before the run, so Extract starts filled
    # with one card per source — each keeping its OWN column names.
    expect(etl.locator(".stage.reached")).to_have_count(1)
    cards = etl.locator(".stage-extract .src-card")
    expect(cards).to_have_count(3)
    expect(etl.locator(".src-card", has_text="kitchen.csv").locator(".src-in thead")).to_contain_text("dish")
    expect(etl.locator(".src-card", has_text="recipes-api").locator(".src-in thead")).to_contain_text("title")
    expect(etl.locator(".src-card", has_text="menu-sheet").locator(".src-in thead")).to_contain_text("item")
    # Transform & Load wait until the run reaches them.
    expect(etl.locator(".stage-empty")).to_have_count(2)
    expect(etl.locator(".stage-transform .src-card")).to_have_count(0)


def test_transform_cleans_each_source_onto_one_schema(etl: Page):
    etl.locator("button.run").click()
    cards = etl.locator(".stage-transform .src-card")
    expect(cards).to_have_count(3)
    # Every Transform card shows the SAME shared schema, no raw columns.
    expect(etl.locator(".stage-transform .src-out thead").first).to_contain_text("name")
    expect(etl.locator(".stage-transform")).not_to_contain_text("dish")
    # All three sources get mapped (lit) as the run reaches them.
    expect(etl.locator(".stage-transform .src-card.mapped")).to_have_count(3, timeout=10000)
    expect(etl.locator(".stage-transform")).to_contain_text("Mac & Cheese")  # cleaned
    expect(etl.locator(".stage-transform")).to_contain_text("2026-01-09")  # from "Jan 9, 2026"
    etl.screenshot(path=os.path.join(SHOTS, "10-etl-transform.png"))


def test_blank_record_is_dropped_during_transform(etl: Page):
    etl.locator("button.run").click()
    # The recipes-api feed carries one blank record; Transform flags it dropped.
    api = etl.locator(".stage-transform .src-card", has_text="recipes-api")
    expect(api.locator(".src-out tr.junk")).to_have_count(1, timeout=10000)
    expect(api).to_contain_text("dropped")


def test_run_loads_unified_rows_into_database(etl: Page):
    etl.locator("button.run").click()
    # 6 rows in across 3 sources, the one blank record dropped -> 5 unified rows.
    expect(etl.locator(".stage-load .rows.dest tbody tr")).to_have_count(5, timeout=10000)
    dest = etl.locator(".stage-load .rows.dest")
    expect(dest).to_contain_text("Mac & Cheese")  # trimmed + recapitalised (kitchen.csv)
    expect(dest).to_contain_text("2026-03-02")  # date normalised from "3/2/26"
    expect(dest).to_contain_text("3.50")  # price parsed from "$3.50"
    expect(etl.locator(".db-count")).to_have_text("5")
    etl.screenshot(path=os.path.join(SHOTS, "09-etl-loaded.png"))


def test_reset_returns_to_only_extract_filled(etl: Page):
    etl.locator("button.run").click()
    expect(etl.locator(".stage-load .rows.dest tbody tr")).to_have_count(5, timeout=10000)
    etl.locator("button.reset").click()
    # Reset returns to the start state: only Extract filled (its 3 raw sources).
    expect(etl.locator(".stage.reached")).to_have_count(1)
    expect(etl.locator(".stage-empty")).to_have_count(2)
    expect(etl.locator(".stage-extract .src-card")).to_have_count(3)
    expect(etl.locator(".stage-transform .src-card")).to_have_count(0)

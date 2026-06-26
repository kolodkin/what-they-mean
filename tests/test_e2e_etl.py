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


def test_extract_lists_three_sources_before_run(etl: Page):
    # The sources exist up front, so Extract starts filled, listing the three
    # mismatched feeds; Transform & Load wait until the run reaches them.
    expect(etl.locator(".stage.reached")).to_have_count(1)
    expect(etl.locator(".stage-extract .source")).to_have_count(3)
    expect(etl.locator(".stage-extract")).to_contain_text("kitchen.csv")
    expect(etl.locator(".stage-extract")).to_contain_text("recipes-api")
    expect(etl.locator(".stage-extract")).to_contain_text("menu-sheet")
    expect(etl.locator(".stage-empty")).to_have_count(2)
    expect(etl.locator(".stage-transform .src-card")).to_have_count(0)


def test_transform_has_one_card_per_source_with_its_own_columns(etl: Page):
    etl.locator("button.run").click()
    cards = etl.locator(".stage-transform .src-card")
    expect(cards).to_have_count(3)
    # Each card keeps its source's OWN column names on the way in…
    expect(etl.locator(".src-card", has_text="kitchen.csv").locator(".src-in thead")).to_contain_text("dish")
    expect(etl.locator(".src-card", has_text="recipes-api").locator(".src-in thead")).to_contain_text("title")
    expect(etl.locator(".src-card", has_text="menu-sheet").locator(".src-in thead")).to_contain_text("item")
    # …and all three get mapped onto the one shared schema.
    expect(etl.locator(".stage-transform .src-card.mapped")).to_have_count(3, timeout=10000)
    expect(etl.locator(".src-card .src-out thead").first).to_contain_text("name")
    etl.screenshot(path=os.path.join(SHOTS, "10-etl-transform.png"))


def test_run_loads_unified_rows_into_database(etl: Page):
    etl.locator("button.run").click()
    # 6 rows in across 3 sources, the one blank record dropped -> 5 unified rows.
    expect(etl.locator(".stage-load .rows.dest tbody tr")).to_have_count(5, timeout=10000)
    dest = etl.locator(".stage-load .rows.dest")
    expect(dest).to_contain_text("Mac & Cheese")  # trimmed + recapitalised (kitchen.csv)
    expect(dest).to_contain_text("2026-03-02")  # date normalised from "3/2/26"
    expect(dest).to_contain_text("2026-01-09")  # date normalised from "Jan 9, 2026" (menu-sheet)
    expect(dest).to_contain_text("3.50")  # price parsed from "$3.50"
    expect(etl.locator(".db-count")).to_have_text("5")
    etl.screenshot(path=os.path.join(SHOTS, "09-etl-loaded.png"))


def test_blank_record_is_dropped_during_mapping(etl: Page):
    etl.locator("button.run").click()
    # The recipes-api feed carries one blank record; mapping flags it dropped.
    api = etl.locator(".src-card", has_text="recipes-api")
    expect(api.locator(".src-out tr.junk")).to_have_count(1, timeout=10000)
    expect(api.locator(".src-out")).to_contain_text("dropped")


def test_reset_empties_every_card_again(etl: Page):
    etl.locator("button.run").click()
    expect(etl.locator(".stage-load .rows.dest tbody tr")).to_have_count(5, timeout=10000)
    etl.locator("button.reset").click()
    # Reset returns to the start state: only Extract filled (its 3 sources).
    expect(etl.locator(".stage.reached")).to_have_count(1)
    expect(etl.locator(".stage-empty")).to_have_count(2)
    expect(etl.locator(".stage-extract .source")).to_have_count(3)
    expect(etl.locator(".stage-transform .src-card")).to_have_count(0)

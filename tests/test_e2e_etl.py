"""End-to-end tests for the ETL / data pipeline demo."""
import os

import pytest
from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


@pytest.fixture()
def etl(page: Page, server_url: str):
    page.set_viewport_size({"width": 1200, "height": 820})
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


def test_cards_empty_until_played(etl: Page):
    # Before Run, no stage is "reached" and no data rows are rendered.
    expect(etl.locator(".stage.reached")).to_have_count(0)
    expect(etl.locator(".stage-empty")).to_have_count(3)
    expect(etl.locator(".rows tbody tr")).to_have_count(0)


def test_run_loads_cleaned_rows_into_database(etl: Page):
    etl.locator("button.run").click()
    # The junk row is dropped, so 4 clean rows land in the destination table.
    expect(etl.locator(".stage-load .rows.dest tbody tr")).to_have_count(4, timeout=10000)
    dest = etl.locator(".stage-load .rows.dest")
    expect(dest).to_contain_text("Mac & Cheese")  # trimmed + recapitalised
    expect(dest).to_contain_text("2026-03-02")  # date normalised from "3/2/26"
    expect(dest).to_contain_text("3.50")  # price parsed from "$3.50"
    # Extract held the raw 5 rows (incl. the junk row) on the way in.
    expect(etl.locator(".stage-extract .rows tbody tr")).to_have_count(5)
    expect(etl.locator(".db-count")).to_have_text("4")
    etl.screenshot(path=os.path.join(SHOTS, "09-etl-loaded.png"))


def test_all_transform_rules_light_up(etl: Page):
    etl.locator("button.run").click()
    expect(etl.locator(".rules li.lit")).to_have_count(5, timeout=10000)


def test_reset_empties_every_card_again(etl: Page):
    etl.locator("button.run").click()
    expect(etl.locator(".stage-load .rows.dest tbody tr")).to_have_count(4, timeout=10000)
    etl.locator("button.reset").click()
    expect(etl.locator(".stage.reached")).to_have_count(0)
    expect(etl.locator(".rows tbody tr")).to_have_count(0)

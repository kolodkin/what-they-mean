"""End-to-end tests for the ETL / data pipeline demo."""
import os

import pytest
from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


@pytest.fixture()
def etl(page: Page, server_url: str):
    page.set_viewport_size({"width": 1000, "height": 900})
    page.goto(server_url + "/etl/")
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)
    return page


def test_chain_alternates_data_and_processing(etl: Page):
    # Four data nodes ( ): source, bronze, silver, store — and three [ ]: e/t/l.
    expect(etl.locator(".node-data")).to_have_count(4)
    expect(etl.locator(".node-proc")).to_have_count(3)
    expect(etl.locator('[data-node="bronze"]')).to_contain_text("bronze")
    expect(etl.locator('[data-node="silver"]')).to_contain_text("normalised")
    expect(etl.locator('[data-node="transform"]')).to_contain_text("transform")
    etl.screenshot(path=os.path.join(SHOTS, "08-etl-idle.png"))


def test_cards_empty_until_played(etl: Page):
    # Before Run, no node is "on" and no data rows are rendered anywhere.
    expect(etl.locator(".node.on")).to_have_count(0)
    expect(etl.locator(".rows tbody tr")).to_have_count(0)
    expect(etl.locator(".node-empty")).to_have_count(7)


def test_run_flows_data_through_the_chain(etl: Page):
    etl.locator("button.run").click()
    # Bronze ends up holding the raw 5 rows (incl. the junk row), as landed.
    expect(etl.locator('[data-node="bronze"] .rows tbody tr')).to_have_count(5, timeout=10000)
    expect(etl.locator('[data-node="bronze"] .rows tr.junk')).to_have_count(1)
    # Silver is the cleaned, normalised 4 rows (junk dropped).
    silver = etl.locator('[data-node="silver"] .rows')
    expect(silver.locator("tbody tr")).to_have_count(4)
    expect(silver).to_contain_text("Mac & Cheese")  # trimmed + recapitalised
    expect(silver).to_contain_text("2026-03-02")  # date normalised from "3/2/26"
    expect(silver).to_contain_text("3.50")  # price parsed from "$3.50"
    # The data store fills with the 4 clean rows.
    expect(etl.locator('[data-node="store"] .rows.dest tbody tr')).to_have_count(4)
    expect(etl.locator('[data-node="store"] .node-count')).to_contain_text("4 rows written")
    etl.screenshot(path=os.path.join(SHOTS, "09-etl-loaded.png"))


def test_all_transform_rules_light_up(etl: Page):
    etl.locator("button.run").click()
    expect(etl.locator(".rules li.lit")).to_have_count(5, timeout=10000)


def test_reset_empties_every_card_again(etl: Page):
    etl.locator("button.run").click()
    expect(etl.locator('[data-node="store"] .rows.dest tbody tr')).to_have_count(4, timeout=10000)
    etl.locator("button.reset").click()
    expect(etl.locator(".node.on")).to_have_count(0)
    expect(etl.locator(".rows tbody tr")).to_have_count(0)

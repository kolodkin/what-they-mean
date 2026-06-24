"""End-to-end tests for the database demo."""
import os
import re

import pytest
from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


@pytest.fixture()
def db(page: Page, server_url: str):
    page.set_viewport_size({"width": 1100, "height": 800})
    page.goto(server_url + "/db/")
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)
    return page


def test_workbook_has_two_sheets(db: Page):
    tabs = db.locator(".sheet-tab")
    expect(tabs).to_have_count(2)
    assert tabs.nth(0).inner_text() == "recipes"
    assert tabs.nth(1).inner_text() == "ingredients"
    db.screenshot(path=os.path.join(SHOTS, "05-db-spreadsheet.png"))


def test_erd_has_two_tables(db: Page):
    expect(db.locator(".erd-table")).to_have_count(2)
    db.screenshot(path=os.path.join(SHOTS, "06-db-erd.png"))


def test_query_result_rows(db: Page):
    # The pancakes recipe has 4 ingredient rows in the seed data.
    expect(db.locator(".result-table tbody tr")).to_have_count(4)
    expect(db.locator(".result-table")).to_contain_text("Buttermilk")


def test_switch_sheet(db: Page):
    db.locator(".sheet-tab", has_text="ingredients").nth(0).click()
    # ingredients sheet has 7 rows across both recipes
    expect(db.locator(".grid tbody tr")).to_have_count(7)


def test_hover_links_sheet_to_erd(db: Page):
    db.locator(".sheet-tab", has_text="ingredients").hover()
    expect(db.locator('.erd-table[data-table="ingredients"]')).to_have_class(re.compile(r"\bglow\b"))
    expect(db.locator('.erd-table[data-table="recipes"]')).to_have_class(re.compile(r"\bdim\b"))
    db.screenshot(path=os.path.join(SHOTS, "07-db-hover.png"))

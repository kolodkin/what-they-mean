"""End-to-end tests for the landing menu."""
import os

from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


def test_menu_lists_all_demos(page: Page, server_url: str):
    page.set_viewport_size({"width": 1100, "height": 800})
    page.goto(server_url + "/")
    expect(page.locator(".card")).to_have_count(6)
    expect(page.locator('.card[href="api/"]')).to_contain_text("API")
    expect(page.locator('.card[href="db/"]')).to_contain_text("database")
    expect(page.locator('.card[href="etl/"]')).to_contain_text("ETL")
    expect(page.locator('.card[href="platform/"]')).to_contain_text("data platform")
    expect(page.locator('.card[href="rag/"]')).to_contain_text("RAG")
    expect(page.locator('.card[href="roles/"]')).to_contain_text("stack")
    # All six cards must sit above the fold at a normal laptop size.
    for href in ("api/", "db/", "etl/", "platform/", "rag/", "roles/"):
        box = page.locator(f'.card[href="{href}"]').bounding_box()
        assert box["y"] + box["height"] <= 800, f"{href} card falls below the fold"
    page.screenshot(path=os.path.join(SHOTS, "00-menu.png"))


def test_menu_card_opens_roles_demo(page: Page, server_url: str):
    page.goto(server_url + "/")
    page.locator('.card[href="roles/"]').click()
    expect(page).to_have_url(server_url + "/roles/")


def test_menu_card_opens_rag_demo(page: Page, server_url: str):
    page.goto(server_url + "/")
    page.locator('.card[href="rag/"]').click()
    expect(page).to_have_url(server_url + "/rag/")


def test_menu_card_opens_platform_demo(page: Page, server_url: str):
    page.goto(server_url + "/")
    page.locator('.card[href="platform/"]').click()
    expect(page).to_have_url(server_url + "/platform/")


def test_menu_card_opens_etl_demo(page: Page, server_url: str):
    page.goto(server_url + "/")
    page.locator('.card[href="etl/"]').click()
    expect(page).to_have_url(server_url + "/etl/")


def test_menu_card_opens_api_demo(page: Page, server_url: str):
    page.goto(server_url + "/")
    page.locator('.card[href="api/"]').click()
    expect(page).to_have_url(server_url + "/api/")


def test_menu_card_opens_db_demo(page: Page, server_url: str):
    page.goto(server_url + "/")
    page.locator('.card[href="db/"]').click()
    expect(page).to_have_url(server_url + "/db/")

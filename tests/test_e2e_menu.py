"""End-to-end tests for the landing menu."""
import os

from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


def test_menu_lists_all_demos(page: Page, server_url: str):
    page.set_viewport_size({"width": 1100, "height": 800})
    page.goto(server_url + "/")
    expect(page.locator(".card")).to_have_count(5)
    expect(page.locator('.card:has(.card-go[href="api/"])')).to_contain_text("API")
    expect(page.locator('.card:has(.card-go[href="db/"])')).to_contain_text("database")
    expect(page.locator('.card:has(.card-go[href="etl/"])')).to_contain_text("ETL")
    expect(page.locator('.card:has(.card-go[href="platform/"])')).to_contain_text("data platform")
    expect(page.locator('.card:has(.card-go[href="roles/"])')).to_contain_text("stack")
    page.screenshot(path=os.path.join(SHOTS, "00-menu.png"))


def test_menu_card_learn_more_expands(page: Page, server_url: str):
    """Clicking a topic's 'Learn more' reveals an inline explanation."""
    page.goto(server_url + "/")
    card = page.locator('.card:has(.card-go[href="api/"])')
    blurb = card.locator(".card-learn p")
    expect(blurb).to_be_hidden()
    card.locator(".card-learn summary").click()
    expect(blurb).to_be_visible()
    expect(blurb).to_contain_text("waiter")


def test_menu_card_opens_roles_demo(page: Page, server_url: str):
    page.goto(server_url + "/")
    page.locator('.card-go[href="roles/"]').click()
    expect(page).to_have_url(server_url + "/roles/")


def test_menu_card_opens_platform_demo(page: Page, server_url: str):
    page.goto(server_url + "/")
    page.locator('.card-go[href="platform/"]').click()
    expect(page).to_have_url(server_url + "/platform/")


def test_menu_card_opens_etl_demo(page: Page, server_url: str):
    page.goto(server_url + "/")
    page.locator('.card-go[href="etl/"]').click()
    expect(page).to_have_url(server_url + "/etl/")


def test_menu_card_opens_api_demo(page: Page, server_url: str):
    page.goto(server_url + "/")
    page.locator('.card-go[href="api/"]').click()
    expect(page).to_have_url(server_url + "/api/")


def test_menu_card_opens_db_demo(page: Page, server_url: str):
    page.goto(server_url + "/")
    page.locator('.card-go[href="db/"]').click()
    expect(page).to_have_url(server_url + "/db/")

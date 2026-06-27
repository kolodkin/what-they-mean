"""End-to-end tests for the stack-holders (roles) demo."""
import os

import pytest
from playwright.sync_api import Page, expect

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-results")
os.makedirs(SHOTS, exist_ok=True)


@pytest.fixture()
def roles(page: Page, server_url: str):
    page.set_viewport_size({"width": 1100, "height": 900})
    page.goto(server_url + "/roles/")
    page.wait_for_function("() => window.__APP && window.__APP.ready === true", timeout=20000)
    return page


def test_six_roles_and_four_slabs_render(roles: Page):
    expect(roles.locator(".role")).to_have_count(6)
    for role_id, name in [
        ("data-engineer", "Data Engineer"),
        ("data-scientist", "Data Science"),
        ("backend", "Backend"),
        ("frontend", "Frontend"),
        ("fullstack", "Full Stack"),
        ("backend-broad", "Backend (broad sense)"),
    ]:
        expect(roles.locator(f".role-{role_id}")).to_contain_text(name)
    expect(roles.locator(".slab")).to_have_count(4)
    for layer_id in ["frontend", "backend", "science", "engineering"]:
        expect(roles.locator(f".slab-{layer_id}")).to_have_count(1)
    roles.screenshot(path=os.path.join(SHOTS, "12-roles-idle.png"))


def test_resting_state_has_no_owned_slabs(roles: Page):
    # Nothing picked yet: the board isn't in the "picked" mode and no slab owns.
    expect(roles.locator(".board.picked")).to_have_count(0)
    expect(roles.locator(".slab.own")).to_have_count(0)
    expect(roles.locator(".detail-empty")).to_have_count(1)


def test_data_engineer_owns_only_engineering(roles: Page):
    roles.locator('.role[data-role="data-engineer"]').click()
    expect(roles.locator(".slab.own")).to_have_count(1)
    expect(roles.locator('.slab[data-layer="engineering"]')).to_have_class(__import__("re").compile(r"\bown\b"))
    expect(roles.locator(".detail")).to_contain_text("bronze-to-gold")
    roles.screenshot(path=os.path.join(SHOTS, "13-roles-engineer.png"))


def test_full_stack_owns_backend_and_frontend(roles: Page):
    roles.locator('.role[data-role="fullstack"]').click()
    owned = {el.get_attribute("data-layer") for el in roles.locator(".slab.own").all()}
    assert owned == {"backend", "frontend"}


def test_backend_broad_owns_everything_behind_the_frontend(roles: Page):
    roles.locator('.role[data-role="backend-broad"]').click()
    owned = {el.get_attribute("data-layer") for el in roles.locator(".slab.own").all()}
    assert owned == {"backend", "science", "engineering"}
    # the frontend is the one slab it does NOT hold
    expect(roles.locator('.slab[data-layer="frontend"]')).to_have_class(__import__("re").compile(r"\boff\b"))
    roles.screenshot(path=os.path.join(SHOTS, "14-roles-backend-broad.png"))


def test_clicking_a_selected_role_again_clears_it(roles: Page):
    chip = roles.locator('.role[data-role="frontend"]')
    chip.click()
    expect(roles.locator(".slab.own")).to_have_count(1)
    chip.click()
    expect(roles.locator(".slab.own")).to_have_count(0)
    expect(roles.locator(".detail-empty")).to_have_count(1)

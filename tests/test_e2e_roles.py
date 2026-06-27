"""End-to-end tests for the stack-holders (roles) demo.

The role chips ARE the stack: picking a role lights up the basic-role chip for
every layer it holds, so a composite role visibly contains the smaller roles it
is built from. (There is no separate board — it only restated these chips.)
"""
import os
import re

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


def held_roles(page: Page):
    return {el.get_attribute("data-role") for el in page.locator(".role.held").all()}


def test_six_roles_render(roles: Page):
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
    # The redundant middle board is gone.
    expect(roles.locator(".board")).to_have_count(0)
    expect(roles.locator(".slab")).to_have_count(0)
    roles.screenshot(path=os.path.join(SHOTS, "12-roles-idle.png"))


def test_resting_state_has_no_lit_chips(roles: Page):
    # Nothing picked yet: no chip is lit or dimmed, and the prompt shows.
    expect(roles.locator(".roles.picked")).to_have_count(0)
    expect(roles.locator(".role.held")).to_have_count(0)
    expect(roles.locator(".role.dim")).to_have_count(0)
    expect(roles.locator(".detail-empty")).to_have_count(1)


def test_data_engineer_holds_only_engineering(roles: Page):
    roles.locator('.role[data-role="data-engineer"]').click()
    # Data engineer holds one layer (engineering) — its own chip lights up.
    assert held_roles(roles) == {"data-engineer"}
    expect(roles.locator(".detail")).to_contain_text("bronze-to-gold")
    roles.screenshot(path=os.path.join(SHOTS, "13-roles-engineer.png"))


def test_full_stack_lights_backend_and_frontend(roles: Page):
    roles.locator('.role[data-role="fullstack"]').click()
    assert held_roles(roles) == {"backend", "frontend"}


def test_backend_broad_lights_everything_behind_the_frontend(roles: Page):
    roles.locator('.role[data-role="backend-broad"]').click()
    assert held_roles(roles) == {"backend", "data-scientist", "data-engineer"}
    # the frontend is the one role it does NOT hold, so its chip dims
    expect(roles.locator('.role[data-role="frontend"]')).to_have_class(re.compile(r"\bdim\b"))
    roles.screenshot(path=os.path.join(SHOTS, "14-roles-backend-broad.png"))


def test_clicking_a_selected_role_again_clears_it(roles: Page):
    chip = roles.locator('.role[data-role="frontend"]')
    chip.click()
    expect(roles.locator(".role.held")).to_have_count(1)
    chip.click()
    expect(roles.locator(".role.held")).to_have_count(0)
    expect(roles.locator(".detail-empty")).to_have_count(1)

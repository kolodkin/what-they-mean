"""Server / API contract tests — no browser required."""
import json
import urllib.request


def _get(url):
    with urllib.request.urlopen(url, timeout=2) as r:
        return r.status, r.headers.get("Content-Type", ""), r.read()


def test_index_served(server_url):
    status, ctype, body = _get(server_url + "/index.html")
    assert status == 200
    assert "text/html" in ctype
    assert b'id="app"' in body


def test_recipe_endpoint_shape(server_url):
    """The 'REST API' returns {name: str, recipe: str, ingredients: list[str]}."""
    status, ctype, body = _get(server_url + "/api/recipe.json")
    assert status == 200
    assert "application/json" in ctype

    data = json.loads(body)
    assert set(data) == {"name", "recipe", "ingredients"}
    assert isinstance(data["name"], str) and data["name"]
    assert isinstance(data["recipe"], str) and data["recipe"]
    assert isinstance(data["ingredients"], list)
    assert data["ingredients"] and all(isinstance(x, str) for x in data["ingredients"])

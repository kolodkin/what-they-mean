# What They Mean — project guide

A tiny static site that explains tech concepts to **non-developers**, one concept
per screen, shown rather than told. **No build step.**

## Philosophy

- **No bundler, no build.** Plain ES modules resolved by an inline import map.
  Preact + htm are vendored locally by `vendor.sh` into `web/vendor/`.
- **The filesystem is the router.** Each concept is its own page under `web/`,
  reached by a relative link. No JS router, no server rewrites.

## Each demo is a standalone folder

A demo owns everything it needs and shares nothing but the vendored deps:

```
web/<name>/
  index.html    import map -> ../vendor/...  + a back link to ../
  app.js        the Preact app for this concept
  styles.css    this demo's styles only (loaded by nobody else)
  data.js       (optional) inline data the demo renders
```

Because each page loads only its own `styles.css`, styles can't leak between
demos — no scoping tricks needed.

## How to add a demo

1. `cp -r web/db web/<name>` and rewrite its `app.js` / `styles.css` / data.
2. Add an `<a class="card" href="<name>/">` card to `web/index.html`.
3. Add `tests/test_e2e_<name>.py` modelled on `tests/test_e2e_db.py`.

That's it — nothing else to wire up.

## Conventions

- Demo pages live one level deep, so import maps point to `../vendor/...`.
- Each demo sets `window.__APP = { ready: true, ... }` once rendered, so e2e
  tests can wait on it.
- Links are relative (`href="api/"`, `href="../"`) so the project-path GitHub
  Pages URL works.

## Run / test / deploy

```bash
./vendor.sh            # once: download Preact/htm into web/vendor/
python3 serve.py       # http://127.0.0.1:8000
uv run pytest -v       # server + Playwright e2e tests
```

Pushing to `main` runs `.github/workflows/pages.yml`, which vendors the modules
and publishes the whole `web/` directory to GitHub Pages.

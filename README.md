# What They Mean

A tiny static site that explains tech concepts to **non-developers** — one
concept per screen, shown rather than told. The landing page is a menu; each
concept is a standalone page.

## Concepts

- **#1 — What is an API?** ([`web/api/`](web/api/)) A cooking-app recipe card on
  top; the `GET` request and raw JSON that produced it underneath. The fields are
  colour-coded, and hovering one highlights the matching part everywhere else —
  so it's obvious that **the pretty app is just this data, drawn nicely.** The
  "endpoint" is the static file [`web/api/recipe.json`](web/api/recipe.json);
  fetching it is a genuine HTTP `GET` returning JSON.
- **#2 — What is a database?** ([`web/db/`](web/db/)) A spreadsheet workbook with
  two sheets on top; the same two tables as a database — an ERD and a SQL
  query with its (computed) result — underneath. Hovering a sheet tab highlights
  its matching table. The point: **a database is a spreadsheet many machines
  share at once, and can be asked precise questions (queries).**

## Tech

No bundler, no build step. Plain ES modules with an
[import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap),
rendered with [Preact](https://preactjs.com/) + [htm](https://github.com/developit/htm).
Dependencies are vendored locally by `vendor.sh`. The filesystem is the router:
each demo is its own folder. See [`CLAUDE.md`](CLAUDE.md) for conventions and how
to add a demo. (Tech borrowed from the
[`pcl-viewer`](https://github.com/kolodkin/samples/tree/main/pcl-viewer) sample.)

```
web/
  index.html       the menu
  styles.css       menu styles
  api/             "What is an API?" demo (index.html, app.js, styles.css, recipe.json)
  db/              "What is a database?" demo (index.html, app.js, styles.css, data.js)
  vendor/          vendored preact / preact-hooks / htm
vendor.sh          downloads preact / preact-hooks / htm into web/vendor/
serve.py           static dev server with no-cache + correct MIME types
```

## Run locally

```bash
./vendor.sh          # download dependencies into web/vendor/ (once)
python3 serve.py     # http://127.0.0.1:8000
```

## Deploy

Pushing to `main` triggers [`.github/workflows/pages.yml`](.github/workflows/pages.yml),
which vendors the modules and publishes `web/` to GitHub Pages. Enable it once
under **Settings → Pages → Build and deployment → Source: GitHub Actions**.

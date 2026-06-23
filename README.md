# What They Mean

A tiny SPA that explains tech concepts to **non-developers** — one concept per
screen, shown rather than told.

## Concept #1 — What is an API?

The page is split exactly in half (100vh → 50/50):

- **Top half — "the app".** A polished cooking-app recipe card: title,
  ingredient checklist, and method steps. This is what a person sees.
- **Bottom half — "the API".** The actual `GET` request and the raw JSON it
  returns: `{ name, recipe, ingredients }`. Press **Send request** to fire the
  call again and watch the response come back.

The three fields are colour-coded, and hovering one (in the JSON, the app, or
the legend) highlights the matching part everywhere else — so it's obvious that
**the pretty app is just this data, drawn nicely.** That's what an API does: it
hands over data and lets the app decide how to show it.

The "endpoint" is the static file [`web/api/recipe.json`](web/api/recipe.json).
On GitHub Pages, fetching it is a genuine HTTP `GET` returning JSON — the same
shape as a real REST API call.

## Tech

No bundler, no build step. Plain ES modules with an
[import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap),
rendered with [Preact](https://preactjs.com/) + [htm](https://github.com/developit/htm).
Dependencies are vendored locally by `vendor.sh`. (Tech borrowed from the
[`pcl-viewer`](https://github.com/kolodkin/samples/tree/main/pcl-viewer) sample.)

```
web/
  index.html      import map + mount point
  app.js          the Preact app (both panes)
  styles.css
  api/recipe.json the "REST endpoint"
vendor.sh         downloads preact / preact-hooks / htm into web/vendor/
serve.py          static dev server with no-cache + correct MIME types
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

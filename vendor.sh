#!/usr/bin/env bash
# Download the ES-module dependencies into web/vendor/ so the app runs with no
# bundler and no build step — the import map in index.html points here.
set -euo pipefail

PREACT_VERSION="10.19.3"
HTM_VERSION="3.1.1"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/web/vendor"
mkdir -p "$DIR"

fetch() {
  echo "  → $2"
  curl -fsSL "$1" -o "$DIR/$2"
}

echo "Vendoring ES modules into $DIR"
fetch "https://unpkg.com/preact@${PREACT_VERSION}/dist/preact.module.js" "preact.module.js"
fetch "https://unpkg.com/preact@${PREACT_VERSION}/hooks/dist/hooks.module.js" "preact-hooks.module.js"
fetch "https://unpkg.com/htm@${HTM_VERSION}/dist/htm.module.js" "htm.module.js"

# preact/hooks imports "preact" as a bare specifier; rewrite it to the relative
# vendored file so it resolves without depending on the import map.
sed -i.bak 's#from"preact"#from"./preact.module.js"#g; s#from "preact"#from "./preact.module.js"#g' \
  "$DIR/preact-hooks.module.js"
rm -f "$DIR/preact-hooks.module.js.bak"

echo "Done."

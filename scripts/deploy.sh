#!/usr/bin/env bash
# Compila el sitio y publica dist/ en la rama gh-pages (GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
touch dist/.nojekyll
REMOTE=$(git remote get-url origin)
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "deploy: $(date '+%Y-%m-%d %H:%M')"
git push -f "$REMOTE" gh-pages
rm -rf .git
echo "Publicado en https://carforck.github.io/Landing-Sotec/"

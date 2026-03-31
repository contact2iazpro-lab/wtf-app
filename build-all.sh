#!/bin/bash
set -e

# 1. Build main app → dist/
echo "==> Building WTF App..."
npm run build:app

# 2. Build admin tool → admin-tool/dist/
echo "==> Building Admin Tool..."
cd admin-tool
npm install
npm run build
cd ..

# 3. Copy admin build into dist/admin/
echo "==> Merging admin into dist/admin/..."
cp -r admin-tool/dist dist/admin

# 4. Copy serve.json into dist/ for SPA routing
cp serve.json dist/serve.json

echo "==> Done! dist/ ready to serve."

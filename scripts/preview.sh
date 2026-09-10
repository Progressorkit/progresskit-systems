#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export PK_PRODUCT_DB="${PK_PRODUCT_DB:-/tmp/progresskit-product-preview/product.db}"
export PK_PUBLIC_ORIGIN="${PK_PUBLIC_ORIGIN:-http://127.0.0.1:8092}"
exec "${PK_PYTHON:-python3}" -m uvicorn preview:app --app-dir analytics --host 127.0.0.1 --port 8092 --no-access-log

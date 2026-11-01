# ProgressKit — local proof of direction

Only three scenes: hero, one Glikemia Premium device, and the transition into an ecosystem fragment. This is an isolated review candidate; owner visual approval is OPEN. Do not propagate it into the public site before that approval.

`template.html` and `build.py` produce `index.html` using the existing catalogue. The mark, landscape and real product screenshot are existing assets. `world.css`, `world.js` and the deterministic brushed-metal SVG are private to this prototype. The public staging allowlist intentionally excludes this directory.

Regenerate or validate:

```sh
python3 prototypes/living-object/build.py
python3 prototypes/living-object/build.py --check
```

Use a Python environment with the existing `analytics/requirements.txt` dependencies. Start the local preview from the repository root, with an isolated database:

```sh
PK_PRODUCT_DB=/tmp/progresskit-proof-product.db \
PK_PUBLIC_ORIGIN=http://127.0.0.1:8194 \
python -m uvicorn proof_preview:app --app-dir prototypes/living-object --host 127.0.0.1 --port 8194
```

Open `http://127.0.0.1:8194/proof-of-direction/`. The preview serves exactly four prototype files and mounts the existing public preview for original product links. Source files, evidence and repository internals remain outside the public routes.

Run `python prototypes/living-object/test_preview.py` in that environment for eight integration tests. The browser scripts and visual evidence are under `docs/evidence/living-object-proof-20261101/`; their tool paths are specific to this workstation. See `docs/PROGRESSKIT_LIVING_OBJECT_PROOF_20261101.md` for the final results and limitations.

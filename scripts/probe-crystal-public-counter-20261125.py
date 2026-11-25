#!/usr/bin/env python3
"""Exactly one public read-only counter GET; no site JS, redirects or APK traffic."""
import argparse
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

URL = "https://progresskit.pl/api/glikemia/downloads"
OUT = Path(__file__).resolve().parents[1] / "docs/evidence/crystal-world-20261125"

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise RuntimeError("Counter endpoint unexpectedly redirected; no follow-up sent")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=("before", "after"))
    args = parser.parse_args()
    target = OUT / f"production-counter-{args.phase}.json"
    if target.exists():
        raise SystemExit("Existing evidence is preserved; do not silently overwrite it")
    request = urllib.request.Request(URL, method="GET", headers={"Accept": "application/json", "Cache-Control": "no-cache"})
    with urllib.request.build_opener(NoRedirect).open(request, timeout=20) as response:
        raw = response.read(4097)
        if response.status != 200 or len(raw) > 4096:
            raise RuntimeError("Unexpected counter response")
        data = json.loads(raw)
        count = data.get("downloads")
        if type(count) is not int or count < 0:
            raise RuntimeError("Invalid aggregate counter")
        report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "phase": args.phase,
                  "url": URL, "method": "GET", "status": response.status,
                  "downloads": count, "cacheControl": response.headers.get("Cache-Control"),
                  "scope": "One public aggregate counter GET only. No page, JS, review-token, APK or POST request.",
                  "mechanism": "analytics/product.py count route performs SELECT total FROM downloads WHERE id=1"}
    OUT.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False))

if __name__ == "__main__":
    main()

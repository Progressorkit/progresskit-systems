# Art direction — local browser evidence, 2026-11-01

This directory contains fresh evidence for the current pass. Historical evidence directories were not modified.

The application was served by its existing explicit public-file allowlist on `http://127.0.0.1:8191/`. Chrome viewport/touch emulation is local browser evidence, not a physical Android test or proof of production deployment. The localhost origin keeps the production analytics tracker disabled. No external messages or production writes were performed.

## Captured stages

- `before/`: original 1440×900 and 320×568 first view, collapsed showroom and expanded product. 10 PASS / 0 FAIL.
- `phase1/`: initial atmosphere capture diagnosed a stale preview route table. The newly added CSS returned HTML 404, producing a stylesheet MIME error. These images do not establish the new atmosphere.
- `phase1-fixed/`: after preview reload, atmosphere and services. 10 PASS / 0 FAIL. The single services image is an extra capture outside the main report screenshot count.
- `phase2/`: full-width hero, original logo, steel typography, dark mountains and restrained mobile CTA. 10 PASS / 0 FAIL.
- `phase3/`: dark showroom faces and wide expanded housing. 10 PASS / 0 FAIL, plus 320×568 expanded and stage-detail screenshots. A diagnostic confirmed that a temporarily blank collapsed product image was lazy-loading, not a CSS geometry failure; the later stage image shows all visible reviewed thumbnails loaded.

`phase3-card-readability/` contains 28 checks and cropped active-module screenshots: every one of 14 project names, stages and CTA labels at 320 and 390 pixels. 28 PASS / 0 FAIL. Geometry checks supplement the actual image review; they do not certify image quality or product runtime.

Phase 4 services were reviewed at 1440, 390 and 320 pixels. Phase 5 ecosystem screenshots and `phase5-pointer/ecosystem-review.json` record six successful pointer/focus/touch checks. The first locator-based hover attempt waited for a static target while the requested subtle node floating was active; the successful run uses real mouse input at observed bounds without disabling motion.

The initial sandbox Chrome launch failed with a `setsockopt` / SIGTRAP environment restriction. Subsequent browser checks use permitted local Chrome execution outside that sandbox.

## Reproduction

`visual-review.cjs` accepts an output stage as its first argument. `before` captures the initial desktop/mobile pair; names beginning with `phase` capture the 1440×900 and 390×844 pair; `final` runs the five requested sizes, keyboard/touch/reduced-motion checks and two interaction recordings. Every output report records the exact scope and any fatal error independently of assertion totals.

`section-shot.cjs STAGE SELECTOR LABEL WIDTH HEIGHT` captures a requested section in a separate stage directory. It is a visual aid, not a separate test suite.

Phase 6 process composition was reviewed at 1440 and 390 pixels. Phase 7 black nature/footer (including Glikemia) and about screenshots were valid; contact/brief captures exposed the existing reveal enhancement leaving content invisible. Those preliminary blank screenshots are not acceptance evidence. Phase 8 is expected to remove homepage content hiding; the final runner explicitly verifies visible reveal opacity before every screenshot.

`phase8/motion-smoke.json` records 11 PASS / 0 FAIL: corrected contact/brief opacity, ordered scroll progression, bounded desktop pointer response, shared pause, static reduced-motion stages, zero running infinite animations with reduced motion and one compact-mobile flowing connection. Corrected screenshots in `phase8/` supersede the preliminary blank Phase 7 contact/brief images.

The first final matrix was interrupted after real horizontal document overflow was detected on desktop. Its partial screenshots and failure log are preserved in `final-preliminary-overflow/`; no unexecuted checks count as passing. `overflow-diagnostic.json` isolates the projected ecosystem backplane pseudo-element as the cause: hiding that layer alone reduced document width1772→1366. Source changes to correct it belong to the implementation owner; the complete matrix must be rerun after the fix.

## Final accepted evidence

`final-fixed/report.json`: **157 PASS / 0 FAIL / 0 BLOCKED** with explicit provenance: 75 unaffected desktop matrix checks retained after a mobile-only CSS selector correction; 82 mobile/behavior/recording checks freshly executed after it. `final-fixed/mobile-fix-retry-report.json` is the raw successful sequential run.

The complete expanded-project sweep found and verified the real mobile CTA regression: the new active-card top offset had also matched an expanded relative-positioned card, placing controls over the primary CTA. The implementation owner restricted that offset to collapsed cards. All 14 expanded projects at 320 and 390 now have exact anchor hit targets and controls below the housing: 28 checks, plus 2 paused-open checks, **30 PASS / 0 FAIL** in `final-fixed/expanded-actions-review.json`. Old obstructed screenshots/videos/reports remain in `attempt-before-mobile-flow-fix/`.

Additional accepted checks: collapsed-project readability 28 PASS, ecosystem pointer/focus/touch 6 PASS and five-width preflight 5 PASS. 188 frozen source files match before/after the final mobile validation. The SIGTERM 143 environment interruption, first encoder lookup failure and animation-target automation waits are retained separately; no interrupted or unexecuted check is counted as passing.

Current H.264/yuv420p recordings: desktop 1440×900, 17.08 s / 427 frames; mobile 390×844, 14.68 s / 367 frames. `final-fixed/video-verification.json` records actual decoded frame counts, dimensions, bytes and SHA-256. Both contain actual browser interaction; extracted current frames were personally inspected.

The main capture run contains 63 screenshots; supplemental full panels, action viewports and ecosystem previews are listed in `final-artifacts-manifest.json`. `qa-summary.json` gives categorized totals and provenance. This completes local automated QA and evidence collection; it is not owner visual approval or production verification.

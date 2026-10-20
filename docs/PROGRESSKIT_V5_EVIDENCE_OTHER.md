# ProgressKit Systems V5 — evidence: remaining projects
Audit date: 2026-10-15. Scope: read-only source discovery for requested inventory items 9–14. No product repositories modified. No production changes, form submissions, purchases, or authentication attempts.

## Inventory and identity resolution
| Requested position | Source identity | Disposition |
| --- | --- | --- |
| 9. Maria-Salon / Ignira | One local and public repository; page title and brand explicitly say Ignira | One public record: ignira |
| 10. Lejek Sprzedażowy / Marek Zaworski | Public repository Progressorkit/marekzaworski.github.io; title OBSERWATOR and author Marek Zaworski | Covered by one record obserwator; no independent lead-funnel implementation or conversion result established |
| 11. Obserwator | Same available author-site implementation as #10 | One public web record; no independently located anonymity-first platform repository |
| 12. RWR | Portfolio commit 961c50c renames RWR to KAN SYSTEM while retaining controller-management description | Alias of #14, no duplicate record |
| 13. P.A. Barczewska | No local or connected GitHub source found | Discovery gap only; no invented public product record |
| 14. Controller-management system | Existing portfolio names it KAN SYSTEM | One partial public record: kan-system; source application unavailable |

## Discovery boundaries
- Local repository discovery: all .git directories under /home/pawe/Pulpit up to depth 4; filename/path searches under that tree for Maria, Ignira, Obserwator, Barczewska, Lejek, Zaworski, RWR, KAN SYSTEM and controller terms.
- Additional name-only directory search under /home/pawe up to depth 4 located another portfolio copy at /home/pawe/progresskit-systems, not an independent product source. The active workspace identity remains /home/pawe/Pulpit/Projekty It/ProgressorKit Systems.
- Local Maria-Salon HEAD 0ac253980bfc4e4e2d27bf9fd4bda4d8e7c035f8, 2026-08-24. Read-only Git status showed an operator-owned untracked photo directory; untouched.
- GitHub connector repository metadata confirms public visibility for Progressorkit/Maria-Salon and Progressorkit/marekzaworski.github.io. Their latest available commits match the audited revisions below. Repository links may therefore be public.
- Connected GitHub installation searches for rwr, obserwator, barczew, kan-system and lejek returned no matching repositories. Public account search found Maria-Salon, portfolio, Glikemia privacy and Marek author-site repositories. This is access-bounded discovery, not proof that no other private repository exists.
- Direct read attempts for both corresponding GitHub Pages URLs were unavailable: web tool reported inaccessible, shell urllib reported DNS resolution failure. Current deployed availability and runtime behavior remain unverified. Public stage is null and coverage partial, rather than inventing maturity.
- Requested dates refer to actual latest audited source commits, not audit time.

## Ignira / Maria-Salon
Source root: /home/pawe/Pulpit/Projekty It/Maria-Salon.
Revision: 0ac253980bfc4e4e2d27bf9fd4bda4d8e7c035f8 (2026-08-24).
Public repository: https://github.com/Progressorkit/Maria-Salon

Evidence:
- index.html:7–13, 35–41: Ignira identity and Maria-Salon repository are the same implementation.
- index.html:118–167: real-work gallery markup with local assets and descriptive alt text.
- index.html:205–277: booking-request form, required fields, service, date, inspiration and preferred contact. This prepares a message; no booking calendar/backend is implemented.
- js/app.js:20–58: mobile menu open/close, Escape return-focus and inert background.
- js/app.js:61–78, 200–232: reduced-motion guards and conditional pointer effects.
- js/app.js:248–275, 284–331: clipboard fallback, booking-message builder, preview and external contact opening.
- js/app.js:9–14, 303–306, 324–330, 343–350: Messenger is not configured; explicit fallback exists. Do not describe direct Messenger or automatic message delivery as complete.
- css/style.css:1425–1477, 1494–1501, 1545–1597 and mobile media rules: contact grid, bounded field widths and CTA section.
- git show 0ac2539 proves committed contact/header/layout changes; no preserved failing test exists. Cause is inferred from the layout change, not an independently reproduced browser incident.
- Current verification: node --check js/app.js PASS (exit 0). Product browser/E2E checks were not run in this subtask. Historical browser checks in memory were not promoted to current runtime evidence.

Case structure:
PROBLEM: contact layout and header needed refinement across viewport sizes.
DIAGNOSIS: inspect committed HTML/CSS diff and current field/grid rules.
ROOT CAUSE: exact original failure was not independently reproduced; layout constraints identified in diff are an implementation explanation only.
SOLUTION: normal-flow header, explicit grid areas, field width limits and separate submit/status block.
VERIFICATION: immutable commit diff plus JS syntax check; no new product browser proof.
RESULT: changes present in source; end-to-end messaging and deployment unverified.
SOURCE: 0ac2539, files/lines above.

Remaining: configure authorized direct Messenger destination; verify actual live site and end-to-end clipboard/contact behavior on mobile. There are no independently verified conversion or booking metrics.

## Obserwator / Marek Zaworski
No local product checkout found. Read directly via GitHub connector.
Repository: https://github.com/Progressorkit/marekzaworski.github.io
Revision: 03f9bbf50afc52392f595b2f0688fe1b9a8e0f99 (2026-03-19).
index.html blob: 79fab804a6b338a2dd2e47ea7d8250600a8d36e1.
archiwum.html blob: 4be8c7916e7c0a7bb3fed25b63e00a9812d96a32.
bielik.html blob: 2015631c17dffc95802bf2dc34ffdf4d8256e32d.
raport.html blob: a05e98614d8a9e22d92221dcc5b3d725c9220ca6.

Evidence:
- index.html:6, 192–202 and 280–285: title, main identity and author attribution explicitly connect Obserwator and Marek Zaworski.
- index.html:205–230; archiwum.html:91–123: archive navigation and existing PDF links.
- index.html:249–257: submission form exists with an external service; no submission performed and recipient delivery unverified.
- index.html:259–267: external purchase CTA exists; payment and access delivery unverified. Do not claim completed commerce.
- index.html:274–278: external counter image exists. Therefore anonymity-first is not an audited technical guarantee of this source.
- index.html:293–350 and bielik.html:67–89: presentation interaction exists in browser code. It is not evidence of server authorization. Do not publish implementation details or promote it as secure publishing/authentication.
- raport.html:369–400: typewriter rendering, autoscroll and event handlers that stop autoscroll on user interaction. This is a source-backed UX implementation, not a reproduced historical failure.
- Commit 03f9bbf modifies literary text and comments around pre-existing autoscroll logic. Do not falsely attribute introduction of manual autoscroll cancellation to that commit.
- Portfolio source d6662ca:index.html:4194–4222 and 4536–4553 mixes Obserwator title, Marek attribution and Lejek Sprzedażowy heading. Public product source disambiguates the available implementation as one author website; separate funnel identity remains unverified.
- Current origin/main portfolio a36969be:index.html:673 states anonymity-first; no implementation evidence accompanies that statement. Current audit does not promote it to a verified capability or claim that this is a second separate platform.

Case structure:
PROBLEM: readable animated text requires the reader to retain scrolling control.
DIAGNOSIS: inspect scripted rendering loop and manual-input listeners.
ROOT CAUSE: no historical incident/failing test available.
SOLUTION: existing code stops autoscroll following touch, wheel or mouse input.
VERIFICATION: static source at raport.html:369–400; browser behavior not newly tested.
RESULT: control logic exists; no conversion, privacy or secure-access outcome claimed.
SOURCE: revision 03f9bbf, raport.html.

## KAN SYSTEM / RWR / controller management
Source application unavailable. Product identity established from portfolio history only.
Portfolio revision 961c50c9820544dd8c32139d82cf8621b328f79d (2026-08-31), subject: fix: replace RWR with KAN SYSTEM.
- git show 961c50c -- index.html: data-case, title, labels and template all renamed together; description remains controller management, trip reports and settlements.
- Follow-up c9bb17c8c5d30973f94d72e731c480d3d13aedc5 (2026-08-31): image-reference repair and binary asset renames from rwr1–4 to kan-system-1–4.
- c9bb17c:index.html:4111–4139: KAN public name and reference to assets/projects/rwr/rwr-cover.webp. Existing tracked file confirms the restored reference.
- Active legacy portfolio d6662ca:index.html:4520–4534: controller-management gallery and an old -40% claim. No test/measurement source found; that metric is rejected for V5.
- Source code, architecture, technologies, tests, deployment and current product maturity are unknown. Public features and technologies arrays deliberately empty. Description is explicitly evidence-limited.
- Private operational documents under /home/pawe/Pulpit/rwr were not read; they are not required to establish implementation and may contain third-party information.

Case structure (portfolio presentation only):
PROBLEM: product rename left a reference to a missing cover directory.
DIAGNOSIS: compare 961c50c and c9bb17c against tracked asset paths.
ROOT CAUSE: technical asset reference changed together with public naming, while the existing image retained its RWR path.
SOLUTION: c9bb17c restores reference to actual existing file.
VERIFICATION: immutable diff and existing tracked asset; no product runtime proof.
RESULT: correct portfolio reference; no controller-system acceptance or time-saving claim.
SOURCE: 961c50c and c9bb17c.

## Media privacy review
Inspected existing covers with view_image:
- assets/projects/rwr/rwr-cover.webp: browser chrome, unrelated tab title and local address visible.
- assets/projects/obserwator/obserwator-cover.webp: browser chrome, unrelated tabs and account-related text visible.
Neither is included in this subtask's gallery data. Detailed controller/report/publishing screenshots were not promoted as sanitized. Maria preview assets exist in its source repository but no corresponding existing portfolio asset is available under this task's ownership.
Public records use gallery:[]; parent implementation may add genuinely sanitized or freshly captured authentic assets. No fabricated image/video/demo is supplied.

## Output and validation
/tmp/v5-other.json: three records ignira, obserwator, kan-system. All six requested positions accounted above; no phantom Barczewska/funnel/anonymous-platform record.
Each public source object omits filesystem paths. All unsupported metrics and security/production claims omitted.

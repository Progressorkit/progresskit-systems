# Workshop interaction diagnosis

Local read-only Chrome profiling, 2026-11-02. Intel UHD Graphics 620 via ANGLE/OpenGL. Viewport 1440 × 1000, DPR 1, no video recording. Two trials per variant; each trial includes 1.5 seconds of pointer input on the first group, 1.5 seconds on the last large group, and 2 seconds of wheel scrolling. All baseline source/index requests are served from `source-before` snapshots. No production source was changed by this profiler.

## Findings

The strongest isolated hot path is the technology field's changing gradient variables. `--field-x`, `--field-y` move large radial gradients; inherited `--field-scan` changes on scrolling and invalidates the painted materials of all groups. These surfaces have clipping, multiple gradient stops and inset shadows.

In the two baseline wheel trials, RecalcStyle cost was 399.76 / 236.82 ms. With the gradient variables held constant using browser-only diagnostic CSS, this dropped to 23.81 / 29.99 ms. Wheel RAF p95 was 33.4 / 16.8 ms baseline versus 16.7 / 16.8 ms with fixed gradients. RAF delays over 50 ms were 4 / 1 baseline versus 0 / 1 fixed. Last-group pointer p95 was 16.8 / 33.4 ms baseline versus 16.8 / 16.8 ms fixed.

The baseline trace contains 906.30 ms of `UpdateLayoutTree`, 415.68 ms of `RasterTask`, and 249.11 ms of `Paint`. Layout duration was zero in each measured interaction phase. Cross-thread trace sums overlap and must not be summed into elapsed time. RAF callbacks measure callback delivery and are not proof of display presentation FPS.

Disabling haze alone, body grain alone, or group transforms alone does not produce a consistent improvement. In particular, keeping animated gradients but removing transforms still leaves the large last group at RAF p95 66.7 / 49.9 ms. Haze is not supported as the sole cause of the lag by this experiment.

There were no page errors and no external requests. No long tasks over 50 ms were delivered by the Long Task API during the sample, despite individual RAF delays: this is a rendering/style/compositing pacing issue rather than a confirmed long JS task.

## Minimal fix recommendation

- Keep the material backgrounds static; remove per-scroll `--field-scan` updates.
- Move only a small, separate reflection layer through transform/opacity. Do not animate the radial-gradient center of the complete plate.
- Scope pointer properties to the active decorative reflection; avoid inheriting them over 110 text links.
- Throttle pointer work and skip redundant writes. Avoid repeatedly retargeting a long transform transition.
- Preserve haze and existing Three.js architecture until a separate measurement demonstrates a relevant cost.

Short local samples vary with shader warm-up, resource load and host scheduling. The causal style-cost reduction is stronger evidence than an exact FPS percentage. Repeat the same interaction protocol after implementation.

Raw evidence: `baseline-interactions.json`, `baseline-summary.json`, `baseline-trace.json`. Reproducible harness: `interaction-profile.cjs baseline`; after implementation: `interaction-profile.cjs after`.

## After the product fix

Identical hardware/viewport/protocol, two trials, first trial traced. `after-interactions.json` confirms that the nine fingerprinted source/index files were unchanged throughout the after benchmark. There were no page errors or external requests.

| Interaction | Before RecalcStyle, ms (trials 1 / 2) | After, ms (trials 1 / 2) |
| --- | ---: | ---: |
| First group pointer | 234.68 / 218.99 | 45.63 / 42.73 |
| Last large group pointer | 232.67 / 313.02 | 89.44 / 52.74 |
| Wheel scrolling | 399.76 / 236.82 | 5.50 / 5.73 |

All six after phases have RAF p95 16.7–16.8 ms and zero callback gaps over 50 ms. Baseline p95 ranged 16.8–33.4 ms with six gaps over 50 ms across the six phases. This does not measure optical display FPS or the host preview application.

The comparable first-trial trace shows `UpdateLayoutTree` 906.30 → 172.24 ms, `RasterTask` 415.68 → 197.87 ms, and `Paint` 249.11 → 226.85 ms. The principal improvement is style/repaint invalidation and raster work, rather than elimination of every paint operation.

## Startup and start of reaction

`latency-and-visuals.json` contains two alternating baseline/after trials, each using a new browser process/context. The OS filesystem and driver caches were not cleared. These are local standalone Chrome measurements. The in-app Browser was unavailable; **host preview latency remains UNKNOWN**.

| Navigation mark | Baseline, ms (trials 1 / 2) | After, ms (trials 1 / 2) |
| --- | ---: | ---: |
| First contentful paint | 596 / 604 | 648 / 684 |
| DOMContentLoaded | 1234.7 / 1218.0 | 1319.4 / 1378.7 |
| Fonts ready | 1234.8 / 1218.1 | 1319.4 / 1378.8 |
| Hero DOM + first RAF observation | 359.0 / 376.5 | 397.8 / 427.5 |
| Three.js renderer ready | 3564.1 / 3327.4 | 3463.0 / 3539.2 |

No startup speedup is claimed. The benchmark addresses interaction stuttering; renderer initialization still takes roughly 3.3–3.6 seconds in this local warm-OS sample. Earlier preliminary cold-process samples were roughly 4.0–4.4 seconds, illustrating cache/host variability.

For the first Workshop hover, the after trusted DOM event timestamp → active DOM state was 7.3 / 12.9 ms. The handler itself → active DOM state was 0.2 / 0.3 ms. For the Core, the actual WebGL canvas receives pointer input (the DOM proxy button deliberately has `pointer-events:none`): event timestamp → next engine frame was 35.8 / 32.6 ms after, versus 55.2 / 69.6 ms baseline. Handler → active Core DOM state was 3.1 / 3.0 ms after. DOM and engine callbacks are CPU observations; they do not include input transport through the host application's preview, compositor presentation, or screen scan-out.

Event Timing is supported and raw entries are retained. Hover entries have `interactionId:0`; these samples are not an INP measurement. Complete project materialization was outside the short response probe and is not claimed from its null field.

`latency-instrumentation-preliminary.json` is explicitly invalid for reaction timing: an initial harness used the RAF frame timestamp and listened to the non-interactive Core proxy. Corrected final measurements use `performance.now()` inside the RAF callback and the actual canvas input. Startup/navigation and screenshots from that preliminary run were valid; only corrected reaction results above are used.

## Visual review artifacts

- `workshop-desktop.png`: actual 1440 × 1000 Chrome screenshot with the first group active.
- `workshop-mobile.png`: actual 390 × 844 Chrome emulation; physical device verification not run.
- `workshop-reaction-desktop.mp4`: approximately 13 seconds of actual local browser interaction at normal playback speed. Recording is excluded from performance measurements.

Visual inspection confirms a transparent dark center, doubled bevel/edge reflection, controlled pale reflections and a small red bounce. Desktop tilt softens text rasterization slightly. Owner visual approval remains OPEN.

# Astra follow-up review — November 2, 2026

This work is **after submission**. The confirmed hackathon build is preserved at `8b74bbb` and tag `hackathon-2026-11-02`. These follow-up changes were not in the submitted demo.

An independent Codex agent using GPT-6 Astra reviewed the source and then the patch read-only. It found no critical issue in its review scope; this is not a security certification or a guarantee of winning.

## Findings and corrections

- A clip request for moment A could finish after choosing B and display A’s clip under B. The new latest-request scope ignores stale successes, errors and cleanup after moment changes, session changes, newer requests or unmount. It does **not** cancel a clip request already sent to Twitch.
- The search inspects at most ten unique candidates individually. If those are rejected, another sheet-scored candidate can still rank first. Preserve that candidate and the call limit, but return its actual visual scoring stage. The UI labels it **Preview candidate / Not individually checked**. A full-pipeline offline regression exercises eleven distinct frames with ten rejected refinements.
- Heuristic scores appeared as percentages. Preview, result cards and accessible timeline labels now say **relevance out of ten**. Scores remain relevance signals, not calibrated probabilities.

No packages, model changes, extra paid calls or lossy deduplication were added. Prompts, image-cache keys and ranking stay unchanged. Cached scores are copied before attaching the scoring stage; duplicate timestamps retain the same stage.

## Verification

`npm test` builds the production UI and passes **25/25** tests. The three added checks exercise stale response/error cleanup, overlapping requests, and the full eleven-frame refinement-budget case. Existing duplicate-frame coverage also checks refinement-stage propagation. The independent reviewer approved the narrow patch after inspecting its code and the test log. See [the offline test receipt](verification/astra-follow-up.txt).

These automated checks verify application behavior, not model accuracy. A credential-free production UI on localhost:5174 was also checked in a separate Chrome window: sample search, timeline accessibility labels, preview and result-card typography, and provisional-candidate text rendered correctly. The provisional-label check used an explicitly modified local UI fixture, restored afterward; it is not model-quality evidence. The original integration/demo evidence and its limitations remain historical records of the submitted build.

## What still needs evidence

We have no representative gameplay or other creator-stream accuracy benchmark, calibrated confidence, or measured per-stream-hour cost. The available visual quality fixture contains eight original illustrations; actual EventSub delivery was checked with one message in a separate capture after the public stream. No SOTA or best-in-class claim is warranted.

The next benchmark needs footage with clear reuse rights; it need not be gaming. Fix queries and human-labeled relevant time windows before searching. Include close negatives, small objects and the 12-to-13 unique-frame boundary where sheet tiles become smaller. Report precision@5, temporal-window recall, absent-query false positives, latency and measured tokens per query per recorded hour, with cold and warm caches separated. Any paid run needs an explicit spending cap. Do not substitute extrapolated illustrated-fixture cost for that measurement.

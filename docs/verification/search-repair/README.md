# Search reliability fixes and rejected rubric experiment

Two small production fixes remain: individual visual checks are selected by visual score, independent of chat priority; Structured Outputs now requires exactly the requested number of scores, cell IDs within range and scores between 0 and 10. Client checks still reject duplicates, missing cells and malformed output. [Official schema support](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

The broader whole-query rubric was tested and **not shipped**. Its official aggregate did not improve, one previously correct case regressed, and a NASA response had the wrong score count. The previous scoring instructions and compatible v3/v4 paid caches were restored. Experimental v5 caches and historical receipts are retained separately. This release does not claim better semantic accuracy or exact event boundaries.

## Frozen candidate experiment

The [contract](protocol.json) and [529 frame hashes](inputs.json) were committed in `1a98e7c` before inference. All six existing official QVHighlights queries and all six NASA development queries were included; no replacement or filtering occurred. The prior moderation block was retained without retry. [Predictions](predictions.json) were committed in `cb590b0` before grading. This is development on inspected cases, not new held-out evidence.

| Check | Baseline | Rejected candidate |
|---|---:|---:|
| Official R@1, temporal IoU ≥ 0.5 | 3/6 | 3/6 |
| Official R@1, temporal IoU ≥ 0.7 | 2/6 | 2/6 |
| NASA positive-query Hit@1 | 4/4 | 2/4 |
| NASA absence checks | 0/2 with hits, both completed | 0/1 with hits, one unattempted |

The candidate fixed some individual official cases and broke another; aggregate equality is not superiority. All six official outcomes remain in the denominator. The NASA candidate includes one format failure and one unattempted positive as misses. Its unattempted absence query is not a successful negative check.

The candidate's [format failure](format-failure.json) returned **one score for 45 cells**. Validation rejected it; the runner conservatively stopped before two remaining NASA cases. We did not retry or repair that failed answer into a success. [Metrics](metrics.json) retain all 12 planned cases, the format failure, retained moderation block and two unattempted rows. The later schema probe is a separate post-fix conformance check and does not replace these outcomes.

## Final production verification

[All 12 baseline cases replay identically](stable-replay.json) under final source `21c1d36`: 11 successful numeric score/ranking comparisons plus the retained moderation block, with zero network or paid calls. This checks compatible cached behavior, not new independent accuracy or fresh inference. Generic explanation text is excluded from numeric comparisons.

A separately frozen [45-cell conformance contract](schema-probe-contract.json) then made one uncached request using public NASA footage and the final constraints. It returned [45 unique valid scores](schema-probe.json); repeating it made zero vision calls. The client still validates output because refusal, truncation or duplicate IDs must fail visibly.

[31 offline tests pass](tests.txt), including a concrete case where chat previously displaced stronger visual evidence from the ten-frame refinement budget, plus current-schema request assertions and cache-contract isolation. The final 16-check [isolated Chrome smoke](../browser-smoke.json) covers the offline UI; it does not test live OBS, OAuth or Twitch clips. Historical model-comparison/NASA/video receipts and all 97 Perception Test questions were regraded without inference; their unchanged adapters were not rerun as paid experiments.

[Independent Astra review](independent-review.json) verified raw receipts, costs, metrics, rollback and the conformance probe. No dependency was added. Private screens, camera, Twitch sessions and personal recordings were not used. Source videos and original official query/gold files remain ignored locally under their existing dataset rights; public receipts do not relicense or redistribute them.

## Cost and reproduction

The rejected candidate cost **$0.0281492** across 60 successful charged responses, including the invalid score set. The schema probe cost **$0.001302**. This pass cost **$0.0294512**; with the prior expansion's $0.0160496, cumulative estimated charges are **$0.0455008**, below the original $0.10 cap. All charges are known. These conservative token-based estimates ignore cached-input discounts and are not account billing statements or measured hourly costs.

The shared persistent ledger includes prior spending; each sequential request reserves $0.02 before sending. One-shot markers and phase-wide accounting prevent restarts from resetting the cap. No automatic inference retries, provider fallbacks or ledger resets were used.

`node scripts/qvh-expansion.mjs --repair` displays the saved candidate metrics for free. `--repair --grade` recomputes with the original ignored gold after verifying complete prediction coverage and input hashes. `--repair --live` is paid and refuses existing prediction markers or previous phase requests. It is not an automatic retry entry point. Frozen inference source remains available at the commits above; the current runtime intentionally differs after rollback and schema hardening.

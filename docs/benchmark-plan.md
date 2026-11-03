# Benchmarks

These results measure visual retrieval without chat or audio. The QVHighlights and DiDeMo subsets use different metrics and must not be combined. Neither represents a full benchmark leaderboard or establishes accuracy on long livestreams.

## QVHighlights holdout

All 24 official queries on 24 previously untested source videos completed: 1,774 frames across 59.1 minutes. Selection used a fixed hash order within an accessible archive prefix, excluding earlier videos. This access-constrained sample is not representative of all streams.

| Measure | Result |
| --- | ---: |
| First result, temporal IoU ≥ 0.5 / ≥ 0.7 | 11/24 / 10/24 |
| Median cold / warm search | 14.293 s / 24.793 ms |
| Reference cost / uncertain charges | $0.0797524 / $0 |
| Warm network calls | 0 |

Predictions were frozen before grading. Independent review reconstructed frame scores, ranked hits, interval conversion and token costs. Absent-event controls were not included.

## DiDeMo unseen-video check

The next three videos in the fixed CC-BY validation hash order supplied 12 official queries. Both methods completed every query using identical two-second samples and no chat/audio. The sequence prompt was fixed before these videos were selected. Predictions were frozen locally before grading with the author's 21-interval consensus rules. This small, rights-filtered sample is not representative of the full dataset.

| Measure | Current search | Sequence candidate |
| --- | ---: | ---: |
| Consensus R@1 / R@5 | 1/12 / 3/12 | 3/12 / 6/12 |
| Mean temporal IoU | 22.92% | 45.14% |
| Mean absolute midpoint offset, answered queries | 6.81 s | 4.75 s |
| Queries returning an interval | 9/12 | 12/12 |
| Unsupported matches on completed absence controls | 0/3 | 2/3 |
| Cost across both groups | $0.0127324 | $0.0071604 |
| Image requests across both groups | 35 | 15 |

Timing error compares the first raw predicted interval's midpoint with each annotator interval's midpoint, averaging absolute offsets within each query, then across answered queries. Labels use five-second bins, so this is not exact-frame error. Misses are excluded from that mean and shown in coverage; rejecting answers can lower the mean without improving their timestamps.

Five separate absence controls were manually reviewed against all sampled frames before inference; two were blocked by moderation and are excluded from the completed-control denominator. These are sampled-evidence controls, not official negative labels or proof of full-video absence. The candidate invented support for a train stopping beside the camera and a crab walking across the seabed. It also lost one existing top-five success on the official queries.

**Decision: retain current search.** Sequence interpretation improved aggregate localization and reduced cost by 43.76%, but introduced unsupported matches. The candidate and its evaluation tools remain outside the application. Total new spending was $0.0198928, with no uncertain charges or warm network calls; no queries were retried or replaced.

## Evidence and reproduction

Costs use recorded input/output tokens at $0.40/$1.60 per million, including reused inference and excluding cached-input discounts. They are estimates, not billing statements or per-stream-hour prices. No uncertain charges occurred in these runs.

[Earlier protocols, commitments, paired regressions and experiment history](https://github.com/OttObottr/semvod/blob/767763fab025e36eb30309cd89a4aaf574bcccab/docs/benchmark-plan.md) preserve prior comparisons. Earlier tools and public receipts are in the [research snapshot](https://github.com/OttObottr/semvod/tree/53ecc81bd8d586265e0476db1ac6d61012e4f98a); its `node scripts/benchmark.mjs` command replays saved fixtures without paid inference. Later raw runs and licensed media remain in the separate local benchmark workspace and are not bundled with a fresh clone.

Frame grouping and neighboring-frame reranking were also evaluated and rejected after regressions. Perception Test measures a different capability and is not included in retrieval results. No matched commercial-competitor evaluation has been run.

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

## DiDeMo comparison

All 48 official queries from 12 hash-selected, explicitly CC-BY-licensed validation videos were retained. Three moderation blocks count as misses. Sampled results are converted to the 21 official candidate intervals and graded with the author's consensus rules. The sequence variant used these known development cases; it is not shipped.

| Measure | Current search | Sequence experiment |
| --- | ---: | ---: |
| Consensus R@1 / R@5 | 4/48 / 10/48 | 7/48 / 16/48 |
| Mean temporal IoU | 22.75% | 33.75% |
| Reference cost | $0.0420176 | $0.0197684 |
| Image requests | 135 | 45 |

The sequence variant interprets chronological sheets and returns event boundaries, replacing both independent-frame scoring and refinement. Cost fell 52.95%, but one existing R@1 success and four R@5 successes regressed. Absent-event controls and unseen-video confirmation are required before adoption. Receipt replay verifies the experiment's cache, not production search latency.

## Evidence and reproduction

Costs use recorded input/output tokens at $0.40/$1.60 per million, including reused inference and excluding cached-input discounts. They are estimates, not billing statements or per-stream-hour prices. No uncertain charges occurred in these runs.

[Complete protocols, commitments, paired regressions and experiment history](https://github.com/OttObottr/semvod/blob/767763fab025e36eb30309cd89a4aaf574bcccab/docs/benchmark-plan.md) preserve the evidence behind this summary. Earlier tools and public receipts are in the [research snapshot](https://github.com/OttObottr/semvod/tree/53ecc81bd8d586265e0476db1ac6d61012e4f98a); its `node scripts/benchmark.mjs` command replays saved fixtures without paid inference. Later raw runs and licensed media remain in the separate local benchmark workspace and are not bundled with a fresh clone.

Frame grouping and neighboring-frame reranking were also evaluated and rejected after regressions. Perception Test measures a different capability and is not included in retrieval results. No matched commercial-competitor evaluation has been run.

# Benchmarks

SemVOD's integration works; retrieval accuracy remains limited. These measurements support a reproducible baseline, not a claim of superiority. The app searches sampled stills and literal chat, not audio. Model comparisons and frame-pruning experiments remain outside production.

## QVHighlights holdout

Production search completed all **24 official queries on 24 previously untested source videos**: 1,774 frames, approximately 59.1 minutes, without chat or audio. Selection included every eligible validation clip in a fixed 2 GiB archive prefix, excluding earlier source videos, then ordered them by a frozen hash rule. This access-constrained sample is not representative of all streams.

| Measure | Result |
| --- | ---: |
| R@1, temporal IoU ≥ 0.5 | 11/24 (45.8%) |
| R@1, temporal IoU ≥ 0.7 | 10/24 (41.7%) |
| Completed / operational failures | 24 / 0 |
| Median cold / warm latency | 14.293 s / 24.793 ms |
| Warm network calls | 0 across all 24 |
| Estimated total cost / uncertain charges | $0.0797524 / $0 |

Predictions were committed before grading. Independent review reconstructed every frame score, all 75 ranked hits, intervals and metrics. The unchanged interval adapter converts point results into contiguous above-threshold windows. Requests were serialized with a shared budget ledger and no retries.

Cost covers 193 responses, 116,437 input and 20,736 output tokens, at the recorded $0.40/$1.60 per million token rates, ignoring cached-input discounts. It is not an account statement or a measured per-stream-hour price. Verified absent-event controls were not included in this holdout.

## Experiments

| Comparison | Evidence and decision |
| --- | --- |
| Score-only coarse output | Development pilot saved 32.9% with unchanged aggregate hit metrics. Adopted; refinement still supplies reasons. |
| Three-frame temporal refinement | Four new source videos; both arms scored 3/4 at IoU 0.5 and 2/4 at 0.7. One raw IoU improved without crossing either threshold. New spend $0.0220544, zero unknown charges. Including reused coarse work, temporal reference cost was $0.0173072 versus $0.0135128 baseline. Not adopted. |
| RGB frame differences | Four thresholds on the prior 24-video set removed at most 60/1,774 frames; no reduction in sheets. Not adopted. |
| Apple Vision feature prints | At distance 0.30 with ten-second anchors, retained 1,502/1,774 frames, projecting 45 instead of 48 sheets. All 38 annotated windows retained a frame; local preprocessing took 7.53 s. Retrieval quality and billed savings remain untested. Not adopted. |

The temporal pilot used four hash-selected new videos from eight eligible clips in a fixed 3 GiB prefix, excluding all 30 earlier parents. Both arms completed without failures; eight coarse responses were reused. Local frame reduction was a development diagnostic, not a fresh holdout. No extra runtime package was added.

## Frame-grouping comparison

Before inference: compare fixed Apple Vision distance 0.30 with production search on all 24 prior QVHighlights queries and all six NASA controls (four positive, two absent). Preserve original timestamps and disclose representative-frame aliases. Reuse exact requests; refresh missing current-schema NASA controls within the same combined $0.10 cap. No retries or replacement queries. Adoption requires all 30 complete, no lost per-query QV IoU 0.5/0.7 or hit@5 successes, no NASA hit@1 loss/new absent-query hits, and at least 10% lower reference token cost including reused calls. This is a development comparison with known labels, not a new holdout. Tools and preflight diagnostics stay outside the app. Execution contract SHA-256: `23f208fb6af8998c1dfe64ed89aba8e3ca361848b45d581b1ffe28cb4299ba66`.

Complete predictions frozen before grading: baseline SHA-256 `6d5b943fa3a4396275faccc29372b18d5941501938ef590c02c08d6b587f0a60`; grouped SHA-256 `dae036fb9e7abb00281bf16a1524542d9d444962337eb44315cddab437aefdeb`.

## Reproduction and historical evidence

The [immutable research snapshot](https://github.com/OttObottr/semvod/tree/53ecc81bd8d586265e0476db1ac6d61012e4f98a) preserves runners, protocols, raw published receipts, evaluation tests, failed attempts and limitations. [README instructions](../README.md#code-and-evidence) open it in a separate checkout. Current app tests stay in this repository; research tooling stays outside the working app.

Earlier results include [97 Perception Test questions](https://github.com/OttObottr/semvod/blob/53ecc81bd8d586265e0476db1ac6d61012e4f98a/docs/verification/perception-v1/README.md), [NASA/model comparisons](https://github.com/OttObottr/semvod/blob/53ecc81bd8d586265e0476db1ac6d61012e4f98a/docs/verification/real-footage/README.md), and [retrieval reliability fixes](https://github.com/OttObottr/semvod/blob/53ecc81bd8d586265e0476db1ac6d61012e4f98a/docs/verification/search-repair/README.md). These are different tasks and development subsets; do not combine them into a leaderboard score.

New holdout/pilot media, gold files, runners and full receipts remain in the separate local `semvod-benchmarks` workspace. They are not bundled with a fresh clone; hashes establish commitments, not independent access to those artifacts. QVHighlights footage is not generally redistributable. See the [frozen selection and dataset discussion](https://github.com/OttObottr/semvod/blob/53ecc81bd8d586265e0476db1ac6d61012e4f98a/docs/benchmark-plan.md).

SHA-256 commitments, retained verbatim for audit tooling:

- Holdout execution contract: `53adce1b9aae3de4735a36473d5caad6bd31ac8ca09e1d8a4f3abbec77088559` (committed in `06e9131` before inference).
- Holdout predictions: `16d282383e035049c92cbae0c0795465485be32369f8f5861f92e71d5fefb3de` (committed in `faa90bc` before grading).
- Temporal contract: `aa9602efcc94ed75124c932e9c9d2f2bf66e3d355e85ae4e7802110794e2f25d` (committed in `5e821e6` before inference).
- Temporal baseline predictions: `138168c651f40e4055d3800cf6bf2553e1fbda1d2327faa2f34fb31941df720c`.
- Temporal candidate predictions: `09d63461ff9e8a8c1d2f248c6d3d18aaf3498bbf8ed7a90d4eef9cc91d61bf95` (both prediction hashes committed in `23bb22b` before grading).

Semantic video search already exists in commercial products. No matched competitor evaluation was run. [Prior competitive research and candidate benchmarks](https://github.com/OttObottr/semvod/blob/53ecc81bd8d586265e0476db1ac6d61012e4f98a/docs/benchmark-plan.md#competition-exists) remain available; nothing here establishes a first-place ranking.

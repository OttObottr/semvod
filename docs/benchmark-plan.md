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

All 30 queries completed in both arms. Reference token cost includes reused Responses; actual new spend for both arms was **$0.0706448**, across 146 new responses, with zero unknown charges. All 60 warm repeats made zero network calls.

| Measure | Baseline | Grouped |
| --- | ---: | ---: |
| QV R@1, IoU ≥ 0.5 | 11/24 | 14/24 |
| QV R@1, IoU ≥ 0.7 | 10/24 | 11/24 |
| QV any top-five hit in a labeled window | 21/24 | 22/24 |
| NASA positive first-hit matches | 3/4 | 4/4 |
| Absent controls with hits | 0/2 | 0/2 |
| Logical vision calls / coarse sheets | 217 / 54 | 210 / 51 |
| Reference token cost | $0.0908828 | $0.0820700 |

Independent review reconstructed all paired metrics, alias mappings and spend. **Not adopted.** Reference savings were 9.7%, below the fixed 10% gate. More importantly, QV queries 32, 657 and 8977 lost an existing threshold success or top-five match despite better aggregate results. A separate top-five coverage check rose from 28/38 to 31/38 windows but lost two previously covered windows (queries 666 and 8977). Grouping used 1,568 representatives for 1,864 frames, but 11 returned hits inherited another frame's evidence. NASA baseline was refreshed under the current schema, so its first-hit result differs from the older pilot. Cold wall times mix live inference and receipt replay and cannot establish a latency improvement. Runtime code and dependencies remain unchanged. This is development evidence, not a representative stream-quality guarantee.

## Free ranking replay

Before replay: one fixed tie-break orders existing top-five results by unchanged score, then mean full-trace neighbor score within ±2 seconds, then time. It preserves every hit and score; empty neighborhoods score zero. All 40 saved cases remain: 24 QVHighlights, two earlier pilot cases (including one failure), four continuation cases, four temporal-baseline cases, and six current NASA controls. Require a new QV IoU 0.5/0.7 pass with no per-case threshold or first-hit-containment losses. No parameter sweep, inference, or network. Known-label development evidence only; neighboring scores are not independent confirmation. Protocol SHA-256: `c3ede483d913a1ce65043a18e09641bcd0fe13ff6957f661026d346cebadc1b3`.

Complete ranking predictions committed before grading: SHA-256 `0bfd458778f8876edce3cd65b70a852cebf3c51b62e32afce72010d68f674c9c`.

**Not adopted.** Independent replay checked all 40 cases and 2,719 saved scores with zero network calls or spend. The 24-query set improved from 11→14 at IoU 0.5 and 10→11 at 0.7, but continuation query 8976 fell from IoU 0.636 to 0 and lost first-hit relevance (that set fell 2→1 at IoU 0.5). Other QV threshold totals were unchanged; NASA positive first-hit matches rose 3→4/4 and absent controls remained 0/2. All hit memberships, top-five coverage and false-hit counts were unchanged; the earlier failed query remained counted. Neighbor agreement promoted a wrong moment, so the aggregate gains do not pass the frozen no-regression gate. Production ranking remains unchanged.

## Fresh video preparation

Prepared 20 unused [Perception Test](https://github.com/google-deepmind/perception_test) validation videos: 15 hash-selected general cases plus five separately reported cases requiring official reveal cuts, excluding all 25 previously tested IDs. Include every official MCQA question for each selected video; no content/answer filters or replacements. Selection precedes question inspection. This is a fresh capability audit, not a timestamp-retrieval benchmark. CC-BY 4.0 materials stay in the external research workspace with attribution; no inference or new packages. Protocol SHA-256: `fbcb9b528875d5c61cf48365b65bcc707fcd0f220fde5e0a9110d72f9b120463`.

Also prepared 12 previously unused [DiDeMo](https://github.com/LisaAnne/LocalizingMoments#dataset) validation videos, selected by a fixed hash from 145 explicitly CC-BY-licensed videos among 1,094 validation videos. All queries and original annotator time segments are retained; unavailable selections will not be replaced. This rights-filtered subset is not representative of the complete split. Media is capped at the official first 30 seconds; official DiDeMo metrics need their own evaluation contract. Protocol SHA-256: `89856437629434f8b621e3464f8c543a77e520057372be20d38c82213dfa44ae`.

Independent preparation audits verified selection, media hashes, timestamps and complete annotations. Preparation completed with no replacements or paid inference: Perception has **85 questions / 244 frames / 463.2 seconds** after official reveal cuts; DiDeMo has **48 queries / 168 frames / 328.5 seconds**. DiDeMo source containers were uniformly normalized to 30 fps from t=0, at most 640px wide, before two-second sampling; original annotator bins remain unchanged. These are short-video subsets, not long-stream validation. Manifest SHA-256: Perception `bb3ef6042a378b5fbf984298348fdc696b950bbf26456b664cf34f09406f094a`; DiDeMo `c447a1bd405be6521f785f0452ceb3ee0a8920b3ac21619cc01b42b3d966f1b3`. Perception remains unscored; DiDeMo results follow below.


## DiDeMo production-search evaluation

Before inference: all 48 prepared queries, unchanged production search, no chat/audio, one cold search followed by an identical warm search. Phase cap $0.12 within the existing shared cap; $0.02 reserved per request, no retries or fallback. Frozen interval adapter ranks all 21 official candidates by lexicographic overlap with existing ranked app windows (clip candidate seconds to available media; unavailable bins last; ties shorter then earlier). The [author’s evaluator](https://github.com/LisaAnne/LocalizingMoments/blob/b6a555c8134581305d0ed4716fbc192860e0b88c/utils/eval.py) averages the three best annotator ranks for R@1/R@5 and the three best top-prediction IoUs for mIoU, preserving duplicate votes and inclusive bin coordinates. Failures, unattempted queries and abstentions receive zero, retaining all 48 in the denominator. This evaluates production outputs through a fixed adapter, not a native DiDeMo model or a full-split leaderboard submission. Contract SHA-256: `9861592ebf9c4d4476feae42c1cb794d91ab7a76342310f047986a9501ad0821`.

Complete predictions frozen before grading: SHA-256 `18b9d043a44d0973bfd464108ee85f44c4e5308dc2c2fd90f750db18479c0406`.

Independent audit reconstructed all 628 returned frame scores from 137 exact request hashes and saved model responses. **Accuracy remains weak on this subset.** Of 48 queries, 45 searches completed, including 16 with no hits; three moderation blocks remain counted as misses. No query was replaced or retried.

| Measure | Result |
| --- | ---: |
| Official consensus R@1 / R@5 | 4/48 (8.3%) / 9/48 (18.8%) |
| Mean IoU / video-macro mean IoU | 20.76% / 20.54% |
| Median cold / warm latency | 4.778 s / 12.631 ms |
| Warm network calls | 0 across all 45 completed searches |
| Estimated new cost / uncertain charges | $0.0423984 / $0 |

Cost uses 69,844 input and 9,038 output tokens at the recorded $0.40/$1.60 per million rates, ignoring cached-input discounts. All source and input hashes remained unchanged. These short clips and the fixed interval adapter do not establish long-stream accuracy or a per-stream-hour price; the low cost does not establish useful retrieval quality.

A credential-free Chrome replay checked all 48 cases: every one of the 628 returned scores, rendered heatmap bins and ranked hits matched the frozen results; the three cached moderation blocks displayed errors. All 45 cover downloads decoded at 1280×720, with no mobile overflow, browser exceptions or external page requests. Provider access was blocked and replay spent $0. The production build passed; app code, tests and dependencies were unchanged.


The subsequent no-hit audit traced all 16 abstentions: 15 queries received only zero coarse scores; one candidate scored 10 and then 0 on full-frame refinement. All 233 coarse-cell mappings were correct. Nine queries used approximately 4:3 frames whose contact sheets cropped roughly 25% of their vertical view. Sheets now preserve aspect ratio with padding, and a layout-version bump rebuilds old crops. The existing regression test failed before this fix and passed afterward; all 28 tests pass. Offline checks covered 168 real frames and eight synthetic aspect/layout cases; all four edges survived and five exact-16:9 sheets stayed byte-identical. No paid calls were made. The scores above describe [the pre-fix revision](https://github.com/OttObottr/semvod/tree/bae3907f72c3fa129db4e6cca7557cc1ef9b10a0); accuracy after this fix is unmeasured. Motion, brief events and small-object detail remain possible causes, not established explanations for individual misses.

Contain comparison, frozen before new inference: repeat all 48 queries using the corrected sheets, identical model/prompt/ranking/interval adapter, and a pinned copy of the 185 prior image/moderation cache files. Preserve prior blocked queries and abstentions in the denominator; report every per-query regression and reference token cost including reused responses. No retries or parameter sweep. New spend capped at $0.06 within the existing shared cap, retaining the $0.02 request reservation. Hybrid cached/live wall time is not cold latency. This is a known-label development comparison, not a fresh holdout. Contract SHA-256: `cac0e14a61d01a78123bcb7d7c3474bd6b4c2a141a9b01b4fc12af4bbe0efcaf`.

Contain comparison predictions frozen before grading: SHA-256 `a1e1b441e1ac01f7a43800b534d2cba15e284d930dbb0c103796a51006570ea8`.

Independent comparison: R@1 stayed **4/48**, R@5 changed **9→10/48**, and mean IoU **20.76%→22.75%**. Three abstentions recovered and three new ones appeared; total abstentions remained 16. R@5 gained queries 42548/46009 and lost 17820; raw IoU improved on five queries and worsened on seven. All 20 queries on unchanged widescreen sheets retained identical scores/hits. The 135 logical image responses include 92 reused and 43 new; full reference token cost was **$0.0420176 versus $0.0423984 (0.90% lower)**, while incremental spending was **$0.0174156**, with zero unknown charges. All 45 warm repeats made zero calls, and the isolated Chrome replay verified all 48 cases, 628 scores/heatmap values and 45 cover downloads without paid access. This verifies a rendering correction with mixed retrieval outcomes, not a general accuracy or cost breakthrough.


Sequence experiment frozen before inference: all 48 known development queries, identical contained sheets and model, one request returning up to five ranked start/end cell spans. Chronological interpretation replaces independent-frame scoring and single-frame refinement together; this is a [NumPro-inspired](https://arxiv.org/abs/2411.10332) adaptation, not a replication or isolated component ablation. Cell endpoints map to frame times ±1 second, clipped to duration, then use the same 21-candidate overlap ranking and official consensus evaluator. Valid cached moderation blocks, empty answers and failures stay in the denominator. No retries or tuning; $0.06 phase cap within the unchanged shared allowance, with $0.02 reserved before each request. Runner/media remain outside the app. Contract SHA-256: `5483a39294de2820f82223effda202d7b4315729442368f4f6b85b9b0eaf77ec`.

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

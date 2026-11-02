# QVHighlights retrieval pilot

This evaluates **two official validation queries on two videos**, using the first two complete validation members accessible in the authors' video archive. All queries for those videos were retained. Archive order determined selection before media, query or gold inspection; this is an access-constrained sample, not a random sample, a hardest-case selection or a leaderboard result.

The [selection protocol](protocol.json), [runner contract](runner-contract.json) and [input hashes](inputs.json) were frozen before inference. Predictions were committed at `e3f0b1f` before grading. The task and annotations come from the [official QVHighlights repository](https://github.com/jayleicn/moment_detr).

## Results

R@1 measures whether the first ranked interval reaches the specified temporal intersection-over-union threshold against any official relevant window. Both queries remain in the denominator, including moderation blocks.

| Arm | R@1, IoU ≥ 0.5 | R@1, IoU ≥ 0.7 | Moderation blocks |
| --- | ---: | ---: | ---: |
| Gemini 2.5 Flash-Lite, native audiovisual video | 0/2 | 0/2 | 0 |
| SemVOD, GPT-4.1-mini sheets and refinement | 1/2 | 1/2 | 1 |
| SemVOD, Jev sheets and GPT-4.1-mini refinement | 1/2 | 1/2 | 1 |

For query `601`, both SemVOD arms returned a first interval with IoU **0.93103448**; Gemini's first interval had IoU zero. For query `8967`, Gemini's first interval had IoU 0.3. Production OpenAI moderation blocked that query before either SemVOD arm sent images. The native Gemini harness did not use that separate OpenAI moderation step. These are different input and policy paths, so the aggregate scores do not isolate model quality.

The unchanged runner initially also marked the second query unattempted after each moderation block. An [audited manual continuation](continuations.json) removed only that unattempted placeholder and ran the second query once. The original block remained a miss. Neither blocked query was retried, rewritten or allowed around moderation; the original result files were retained privately.

The preregistered checked-evidence-first ordering used the same saved scores with no further inference. It left both first intervals and both R@1 scores unchanged. This sample provides no measured ranking benefit to justify a production ranking change.

## Inputs and cost

The first complete source clip is **127.526 seconds**, rounded to **128 seconds** in the official annotations; the second is **150 seconds**. All available footage was retained, without padding or cropping to gold windows. Frame arms sampled every two seconds, yielding 64 and 75 frames. Evaluation bounds use the official durations. Gemini received the full audiovisual clips; the Jev arm replaces only sheet scoring, retaining OpenAI individual-frame refinement.

Separate production image caches were used, but the shared budget helper reused three byte-identical OpenAI refinement requests in the Jev arm. These are the same recorded responses, not independent cold trials. The frozen metric receipt's `estimatedUsd` sums reference request costs, including those replays. The [derived cost basis](cost-basis.json) separates them:

| Arm | New paid-request cost | Replayed response reference cost | Total reference cost |
| --- | ---: | ---: | ---: |
| Gemini, both queries | $0.010258900 | $0 | $0.010258900 |
| OpenAI, query 601 only | $0.004104000 | $0 | $0.004104000 |
| Jev hybrid, query 601 only | $0.001331426 | $0.000574000 | $0.001905426 |

OpenRouter costs come from response usage; OpenAI costs are estimates from reported tokens and list prices, not account billing. There were 21 new paid requests across these arms. The two image-arm moderation blocks incurred no vision cost. Repeating the successful image query then made zero vision calls in both arms.

On the common 150-second query `601`, Gemini cost $0.005596600. Multiplying that short-clip cost by 24 gives $0.1343184 per recorded hour for one query; the same arithmetic gives $0.098496 for OpenAI and $0.045730224 for the Jev hybrid at reference cost, or $0.031954224 in new spend after its shared replays. **These are arithmetic extrapolations, not measured hourly costs.** Longer footage can change sheet count, refinement coverage, repetition, token usage and cache reuse. The tiny sample cannot establish accuracy or cost on creator streams.

## Free replay and rights

From the repository root, with project dependencies installed:

```sh
node scripts/qvh-eval.mjs
node scripts/qvh-eval.mjs --score --official-gold
```

The first command displays saved receipts without network inference. The second downloads the small [official validation annotation file](https://github.com/jayleicn/moment_detr/blob/main/data/highlight_val_release.jsonl), verifies its frozen SHA-256 and recomputes metrics from the published predictions. Neither command invokes a model or requires API keys. The explicit `--live` entry is separate and requires the private inputs and frozen setup.

Published [model traces](responses.json) contain numeric predictions, timestamps and usage; media, original query text and gold annotations are not bundled. The official annotations carry [CC BY-NC-SA 4.0](https://github.com/jayleicn/moment_detr/blob/main/data/LICENSE). This was a local noncommercial research evaluation. The repository's code license does not relicense those annotations or the source videos, and access through the authors' archive does not grant permission to redistribute the media.

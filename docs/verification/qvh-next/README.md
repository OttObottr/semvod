# Four additional official QVHighlights cases

This is a small access-constrained validation expansion, not a leaderboard result or representative creator-stream benchmark. The earlier two cases remain separate in [qvh-v1](../qvh-v1/README.md).

## Results

All four selected queries were attempted with current SemVOD frame search, `gpt-4.1-mini`, and no chat. Each clip is 150 seconds, sampled every two seconds at 384px: 300 frames total. Search settings and the point-to-interval adapter were unchanged.

| Metric | Result |
|---|---:|
| First interval, temporal IoU ≥ 0.5 | **2/4 (50%)** |
| First interval, temporal IoU ≥ 0.7 | **1/4 (25%)** |
| Transport, moderation or format failures | 0/4 |
| New successful vision requests | 46 |
| Estimated charges | **$0.0160496** |
| Unknown-charge reservations | $0 |
| Median first-search latency | 21.868 seconds |
| Repeat searches: vision calls | 0 across all four |

The first interval completely missed the annotated event on queries 9367 and 609. Query 8976 overlapped enough to pass 0.5 but failed 0.7; query 617 passed both. These misses remain in the denominator. No inference retry, model fallback, replacement example or threshold adjustment was used.

Costs use 23,876 reported input tokens and 4,062 output tokens at conservative [$0.40/$1.60 per million](https://developers.openai.com/api/docs/models/gpt-4.1-mini), ignoring cached-input discounts. They are usage-based estimates, not account billing statements. The authorized phase cap was $0.10; each sequential request reserved $0.02 before sending and shared the existing evaluation ledger. A durable one-shot marker blocks automatic restarts; phase-wide accounting includes unknown reservations. No unknown charge arose. Short-clip latency and cost do not establish performance per stream-hour.

## Freeze and independent checks

Selection was committed before acquisition. Inference code and frame/query hashes were committed before paid calls; final preflight was `cbf726b`. [All four predictions](predictions.json) were committed in `67395ff` **before official gold grading**. [Metrics](metrics.json) pin that prediction file by SHA-256. [Provider score cells, usage and response IDs](responses.json) retain the scoring evidence; explanation text is omitted and its original output hash retained. [All 30 offline tests passed](tests.txt). [Independent Astra review](independent-review.json) reconstructed scoring, rankings, intervals and grading from full local provider receipts and verified all 46 request charges against the ledger.

[Inputs](inputs.json) pin every frame and inference source. The grading path verifies exact prediction-query coverage before reading gold. Original query text, official gold and videos remain ignored locally. They were not sent as answers in prompts.

## Diagnostic, not an improvement claim

All four original top hits were unrefined candidates. After grading, a free [diagnostic](ranking-diagnostic.json) reused the unchanged checked-evidence-first rule already defined in qvh-v1. It **worsened** these results to 1/4 at IoU 0.5 and 0/4 at IoU 0.7. This was post-hoc analysis of the same saved scores, not another held-out test. We did not adopt it or alter the shipped ranking. Simply prioritizing checked candidates is not supported as a fix by this sample.

## Selection, security and rights

The [selection rule](protocol.json) chose the first four additional complete validation members in the authors’ archive order, excluding the original two IDs. A 128 MiB download yielded no additional videos; the [empty receipt](acquisition-128mib.json) remains. Only the download allowance was increased to 512 MiB before inference. [Acquisition](acquisition.json) records the four selected videos. This is not random sampling or a hardest-case claim.

Only data came from the [authors’ archive](https://github.com/jayleicn/moment_detr/blob/main/data/README.md). Standard-library code checked HTTP ranges, archive ETag, member sizes and SHA-256 hashes. It copied selected MP4 bytes without extracting archive paths or running downloaded code. Existing native tooling decoded frames; no new package was installed. No private screen, Twitch session or personal recording was used.

Official annotations are [CC BY-NC-SA 4.0](https://github.com/jayleicn/moment_detr/blob/main/data/LICENSE). This local noncommercial evaluation does not redistribute source media, and the repository’s MIT license does not relicense dataset material. Data checks reduce exposure; they do not prove media is harmless.

## Free replay

`node scripts/qvh-expansion.mjs` displays the saved metrics without keys, network or inference. `--grade` recomputes using the original ignored local gold file and verifies its frozen hash. Public readers can obtain the official validation annotations from the authors and select the frozen query IDs; do not substitute labels or change their serialization to bypass the expected hash. `--live` is separately paid and refuses an existing prediction marker or prior phase requests; it is not a free replay or an automatic retry entry point.

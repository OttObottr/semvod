# Scoring experiment, not a leaderboard

One identical owned eight-frame contact sheet, three queries, two models, one scoring call per case. No refinements or explanations for either model. Fixed hit threshold 3/10. `results.json` includes scores, usage, timing and provider request IDs. The renderer and release use actual Responses results separately.

Both models matched the 24 initial cell labels. Median scoring latency: Responses 2346 ms; Decisions 283 ms. Tiny development fixture; no statistical confidence or broader accuracy claim.

## Adversarial follow-up

The initially omitted close negative `cat` exposed a failure: the Decisions pipeline ranked an illustrated dog at 7.25/10 for cat. An independent single-frame typed predicate returned cat 0.84 and dog 0.29, while its choice question preferred dog 0.65 versus cat 0.17. These inconsistent judgments are recorded in `cat-control.json`; they are model outputs, not calibrated truth. Consequently we did not ship the Decisions switch. The release Responses pipeline returned zero cat hits on the same real OBS session; its full visual score arrays are in `../semantic-series.json`.

The sample is stylized artwork, not a representative gameplay corpus. Future evaluation needs held-out real streams, close negatives and small objects before changing engines or reducing resolution further. No claim of best-in-class accuracy, cost or speed follows from this experiment.

The recorded 7.25/10 full-pipeline false positives are under `pipelineFollowup` in `cat-control.json`; the earlier predicate/choice answers are a different diagnostic on one frame. Reading saved receipts costs nothing; a new provider response is stochastic and is not guaranteed to repeat the same score.

Replay saved output and the adversarial receipt: `node scripts/benchmark.mjs`. Paid rerun of the original three-query fixture only (does not rerun the cat diagnostic): `node scripts/benchmark.mjs --live` (six requests; no automatic retries). Official API references: https://developers.openai.com/api/docs/guides/decisions and https://developers.openai.com/api/docs/models/gpt-4.1-mini.

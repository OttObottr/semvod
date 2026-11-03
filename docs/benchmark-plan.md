# Benchmark and model-selection plan

The available evidence supports limited, reproducible comparisons rather than leaderboard claims. The [real-footage pilot](verification/real-footage/README.md) is development evidence. The [official Perception Test subset](verification/perception-v1/README.md) evaluates 97 questions across 25 preregistered videos; the [QVHighlights check](verification/qvh-v1/README.md) covers only two official queries. Accuracy, first-hit relevance, false alarms, cache efficiency, latency and dollars can trade off; no aggregate score should conceal regressions.

| Benchmark | Why it fits | What must be respected |
|---|---|---|
| [Perception Test](https://github.com/google-deepmind/perception_test) | Supplemental video understanding: memory, abstraction, physics and semantics. We ran every official MCQA question for 20 hash-selected validation videos plus five hash-selected memory games. | Official reveal cuts are mandatory. Multiple-choice accuracy is not timestamp retrieval; models may exploit language priors or prior exposure to public data. The image configurations use identical frames, while native Gemini also receives audio and denser video. See the [frozen protocol and complete results](verification/perception-v1/README.md). |
| [QVHighlights](https://github.com/jayleicn/moment_detr) | Closest task: language queries → relevant temporal windows and highlight saliency. Official measures include R@1 at temporal IoU 0.5/0.7, retrieval mAP and highlight mAP/Hit@1. | SemVOD currently returns points, so the official interval evaluator requires a declared conversion or genuine interval retrieval. Annotations are CC BY-NC-SA 4.0; underlying YouTube footage is described as research/fair-use material, not generally redistributable. The [official evaluator](https://github.com/jayleicn/moment_detr/tree/main/standalone_eval) says CodaLab closed and test labels were released; do not call a local result a live leaderboard rank. |
| [Ego4D natural-language queries](https://ego4d-data.org/docs/benchmarks/episodic-memory/) | Hard everyday scenes, small objects and temporal relationships. Common metrics are R@1/R@5 at temporal IoU 0.3/0.5. | Requires a [dataset agreement and approved access](https://ego4d-data.org/docs/start-here/); not a no-account sample download. Use an untouched evaluation split, not prompt tuning on test labels. |
| [Video-MME](https://github.com/MME-Benchmarks/Video-MME) | Supplemental audiovisual QA: 900 videos and 2,700 multiple-choice questions. Useful for audio-on/off comparisons. | Answer accuracy is not moment-retrieval accuracy. Published terms are academic research only, with commercial use/redistribution prohibited without permission. No dataset was downloaded for this product evaluation. |

## QVHighlights holdout

Current production `gpt-4.1-mini` search completed all **24 queries on 24 new source videos**: 1,774 frames, approximately 59.1 minutes, without chat or audio. This includes every eligible validation clip in the fixed 2 GiB archive prefix after excluding previously tested parents. The frozen hash rule ordered the entire eligible pool. [Selection and input commitments](https://github.com/OttObottr/semvod/blob/20f3dd1/docs/benchmark-plan.md#next-frozen-evaluation) preceded inference; this access-constrained sample is not representative of all streams.

| Measure | Result |
| --- | ---: |
| R@1, temporal IoU ≥ 0.5 | 11/24 (45.8%) |
| R@1, temporal IoU ≥ 0.7 | 10/24 (41.7%) |
| Completed / operational failures | 24 / 0 |
| Median successful-query latency, cold / warm | 14.293 s / 24.793 ms |
| Warm-search network calls | 0 across all 24 |
| Estimated total cost / uncertain charges | $0.0797524 / $0 |

The unchanged interval adapter and ranking were used with serial charged requests, isolated caches and no retries. Per-parent averages equal query averages because each video has one query. Cost covers 193 responses (116,437 input and 20,736 output tokens) at [published prices](https://developers.openai.com/api/docs/models/gpt-4.1-mini), conservatively ignoring cached-input discounts, within the $0.20 cap. It is not an account billing statement or a measured per-stream-hour price. Verified absent-event controls remain untested.

Independent review reconstructed every frame score, all 75 ranked hits, intervals and metrics from original receipts. Localization accuracy remains limited; this establishes a baseline, not an improvement or competitor comparison. Footage, separate query/gold files, tools and raw logs stay outside the repo in `semvod-benchmarks/qvh-holdout`.

Execution contract SHA-256 `53adce1b9aae3de4735a36473d5caad6bd31ac8ca09e1d8a4f3abbec77088559` was committed in `06e9131` before inference. Complete predictions SHA-256 `16d282383e035049c92cbae0c0795465485be32369f8f5861f92e71d5fefb3de` was committed in `faa90bc` before gold grading.

## Competition exists

- [OpusClip ClipAnything](https://www.opus.pro/clipanything) supports prompt-based clipping using visual/audio/sentiment cues. It is a direct competitor, not merely an automatic highlights tool.
- [TwelveLabs search](https://docs.twelvelabs.io/docs/resources/playground/search) finds relevant video clips with natural-language or image queries and timestamps.
- [Cutsio](https://cutsio.com/blog/how-to-find-highlights-from-long-gaming-streams-automatically) advertises visual/audio indexing and semantic search across a stream library.
- [ChatClipThat](https://chatclipthat.com/features) advertises semantic searches using available visual, transcript, audio and chat context, followed by creator-controlled clipping. Its [support page](https://chatclipthat.com/support) describes both free and paid plans.
- [Eklipse](https://eklipse.gg/) is an adjacent streamer highlight/clip workflow.

Twitch itself offers [Stream Recaps and voice-triggered clipping](https://blog.twitch.tv/en/2026/10/20/stream-recaps/), and documents [Auto Clips alpha testing](https://help.twitch.tv/s/article/auto-clips). We have not found official documentation of the same arbitrary natural-language visual-and-chat VOD search workflow, but cannot infer the absence of every native or experimental feature. Public messaging should describe the implemented workflow and avoid claiming that Twitch has no related tools.

We have not run these services on the same labeled footage, so we cannot claim superior accuracy, latency or price. SemVOD's demonstrated distinction is its small local OBS/Twitch workflow with user-controlled queries, caches and credentials—not exclusive ownership of semantic video search.

## Cheap techniques worth testing

1. **Score-only coarse output:** measured and adopted. Reasons remain on individual refinement calls. In this pilot it saved 32.9% without changing aggregate hit metrics; larger evaluation is still needed.
2. **Typed decisions over a shared sheet:** [Jev](https://openrouter.ai/docs/guides/community/jev) evaluates many named questions over one image without prose output. [TypeSafe's context rules](https://docs.typesafe.ai/models) say shared state is ingested once. Our Jev cascade was cheaper but had an extra off-target candidate; keep it experimental. Confidence is not proof of calibration on this task.
3. **Audio/video intervals with strict timestamps:** [Gemini video understanding](https://ai.google.dev/gemini-api/docs/video-understanding) supports audiovisual input. Our exploratory result improved when the output contract used explicit `MM:SS` intervals instead of a long score array or ambiguous decimal times. This is a representation improvement, not proof of model superiority. Preserve raw timestamps, validate ranges, and evaluate boundary error.
4. **Spend only on unresolved evidence:** a cheap candidate pass followed by detailed checks is useful only if candidate recall stays high. Measure missed moments before discarding low-scoring frames. Perceptual deduplication and lower sampling rates can erase small but decisive changes; exact dedup is currently safer and reproducible.
5. **Reuse input and outputs:** content-addressed results avoid calls entirely. Stable shared-image/video prefixes can additionally benefit from provider prompt caching; inspect actual cached-token usage, not an assumed discount. A transcript computed once could support repeated spoken-word searches, but it does not detect all sounds or motion.

No embedding runtime, vector database, model-training framework, third-party SDK, or new package was added. Current runtime remains four pinned packages. External model experiments use native HTTP and remain outside the shipped search engine. The [hackathon rules](https://twitchcon-codex.devpost.com/rules) require a Twitch-connected project built with Codex and allow authorized third-party integrations; they do not require an OpenAI-only runtime. All these experiments occurred after the submitted snapshot.

## Temporal-context pilot commitment

Before inference: compare production refinement with three chronological frames (center and nearest ±4 seconds, letterboxed) on four previously untested source videos. Selection uses a fixed 3 GiB archive prefix and excludes all 30 earlier parents; all four selected queries remain in the denominator. Coarse requests, model, ranking and interval adapter are shared; no retries or replacements. Combined cap: $0.08 within the existing ledger. Contract SHA-256 `aa9602efcc94ed75124c932e9c9d2f2bf66e3d355e85ae4e7802110794e2f25d`. Media and tooling stay in the separate benchmark workspace; predictions must be committed before grading.

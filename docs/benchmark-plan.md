# Benchmark and model-selection plan

SemVOD is not established as #1 on any public benchmark. The [real-footage pilot](verification/real-footage/README.md) is development evidence. Accuracy, first-hit relevance, false alarms, cache efficiency, latency and dollars can trade off; no aggregate score should conceal regressions.

| Benchmark | Why it fits | What must be respected |
|---|---|---|
| [QVHighlights](https://github.com/jayleicn/moment_detr) | Closest task: language queries → relevant temporal windows and highlight saliency. Official measures include R@1 at temporal IoU 0.5/0.7, retrieval mAP and highlight mAP/Hit@1. | SemVOD currently returns points, so the official interval evaluator requires a declared conversion or genuine interval retrieval. Annotations are CC BY-NC-SA 4.0; underlying YouTube footage is described as research/fair-use material, not generally redistributable. The [official evaluator](https://github.com/jayleicn/moment_detr/tree/main/standalone_eval) says CodaLab closed and test labels were released; do not call a local result a live leaderboard rank. |
| [Ego4D natural-language queries](https://ego4d-data.org/docs/benchmarks/episodic-memory/) | Hard everyday scenes, small objects and temporal relationships. Common metrics are R@1/R@5 at temporal IoU 0.3/0.5. | Requires a [dataset agreement and approved access](https://ego4d-data.org/docs/start-here/); not a no-account sample download. Use an untouched evaluation split, not prompt tuning on test labels. |
| [Video-MME](https://github.com/MME-Benchmarks/Video-MME) | Supplemental audiovisual QA: 900 videos and 2,700 multiple-choice questions. Useful for audio-on/off comparisons. | Answer accuracy is not moment-retrieval accuracy. Published terms are academic research only, with commercial use/redistribution prohibited without permission. No dataset was downloaded for this product evaluation. |

Next useful evidence is independently reviewed, permitted real footage from several domains, with visible-state, speech, motion and absent-event queries reported separately. Include brief appearances and tiny objects. Freeze queries/labels before model calls; use a held-out subset to confirm any threshold or model selected on development data. Report temporal localization, format failures, abstentions, cold/warm latency, measured tokens and cost. Keep an unoptimized baseline and all failed arms. An actual hour-long workload is needed before claiming cost per stream-hour.

## Competition exists

- [OpusClip ClipAnything](https://www.opus.pro/clipanything) supports prompt-based clipping using visual/audio/sentiment cues. It is a direct competitor, not merely an automatic highlights tool.
- [TwelveLabs search](https://docs.twelvelabs.io/docs/resources/playground/search) finds relevant video clips with natural-language or image queries and timestamps.
- [Eklipse](https://eklipse.gg/) is an adjacent streamer highlight/clip workflow.

We have not run these services on the same labeled footage, so we cannot claim superior accuracy, latency or price. SemVOD's demonstrated distinction is its small local OBS/Twitch workflow with user-controlled queries, caches and credentials—not exclusive ownership of semantic video search.

## Cheap techniques worth testing

1. **Score-only coarse output:** measured and adopted. Reasons remain on individual refinement calls. In this pilot it saved 32.9% without changing aggregate hit metrics; larger evaluation is still needed.
2. **Typed decisions over a shared sheet:** [Jev](https://openrouter.ai/docs/guides/community/jev) evaluates many named questions over one image without prose output. [TypeSafe's context rules](https://docs.typesafe.ai/models) say shared state is ingested once. Our Jev cascade was cheaper but had an extra off-target candidate; keep it experimental. Confidence is not proof of calibration on this task.
3. **Audio/video intervals with strict timestamps:** [Gemini video understanding](https://ai.google.dev/gemini-api/docs/video-understanding) supports audiovisual input. Our exploratory result improved when the output contract used explicit `MM:SS` intervals instead of a long score array or ambiguous decimal times. This is a representation improvement, not proof of model superiority. Preserve raw timestamps, validate ranges, and evaluate boundary error.
4. **Spend only on unresolved evidence:** a cheap candidate pass followed by detailed checks is useful only if candidate recall stays high. Measure missed moments before discarding low-scoring frames. Perceptual deduplication and lower sampling rates can erase small but decisive changes; exact dedup is currently safer and reproducible.
5. **Reuse input and outputs:** content-addressed results avoid calls entirely. Stable shared-image/video prefixes can additionally benefit from provider prompt caching; inspect actual cached-token usage, not an assumed discount. A transcript computed once could support repeated spoken-word searches, but it does not detect all sounds or motion.

No embedding runtime, vector database, model-training framework, third-party SDK, or new package was added. Current runtime remains four pinned packages. External model experiments use native HTTP and remain outside the shipped search engine. The [hackathon rules](https://twitchcon-codex.devpost.com/rules) require a Twitch-connected project built with Codex and allow authorized third-party integrations; they do not require an OpenAI-only runtime. All these experiments occurred after the submitted snapshot.

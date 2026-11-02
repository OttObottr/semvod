# Official Perception Test subset

This is a zero-shot **model/input capability audit**, not SemVOD retrieval accuracy, a full benchmark submission, or a leaderboard rank. It uses the official [DeepMind Perception Test](https://github.com/google-deepmind/perception_test) validation questions and original three-way answer options. It is substantially less forgiving than our illustrated demo, but we do not claim it is the hardest video benchmark.

| Configuration | All questions | Original hash sample | Added memory games | Completed-call cost | Unknown charge held |
|---|---:|---:|---:|---:|---:|
| Jev 1.14, frames | **71/97 (73.2%)** | 57/77 | 14/20 | $0.003464118 | $0.02 |
| Gemini 2.5 Flash-Lite, audiovisual | 61/97 (62.9%) | 49/77 | 12/20 | $0.0203527 | $0 |
| GPT-4.1 mini, frames | 54/97 (55.7%) | 44/77 | 10/20 | $0.020332 | $0 |

Uniform random guessing has expected accuracy 33.3%. Jev's HTTP400 on `video_9116` counts as **two wrong answers**; its original error body was unfortunately not retained. The failed request hash is permanently blocked, and its full $0.02 upper-bound reservation remains charged against our budget. After explicit audit, the remaining four independent videos ran with unchanged inputs and prompts; the failed video was not retried. The three prediction files were committed in `67288ee` before labels were opened for grading.

Jev is promising here, but this is a small clustered sample, with no text-only control and no training-contamination guarantee. It does not establish that Jev is better at timestamp retrieval, that it used the images for every answer, or that Gemini's audio caused any difference. No production model switch follows from this QA result alone. [Full breakdown](summary.json).

## Selection fixed before predictions

Commit `4fe229a` preregistered the first 20 IDs sorted by SHA256 of a fixed seed plus each official MCQA validation ID. Commit `837979c` added five hash-selected memory-game videos requiring an official reveal cut, after observing that the original twenty contained none. All original twenty stayed in. No media, question content, labels, or predictions were inspected to choose these examples. The extra stratum is deliberate and reported separately; the combined set is not a simple random sample.

[Protocol](protocol.json) · [exact media/question hashes](inputs.json) · [decoded export checks](media-check.json). There are **25 videos and all 97 official questions**. Missing/invalid answers count as incorrect. HTTP failures are retained, with no replacement or retry. The unit of accuracy is the question, not the video; questions within a video are correlated. Public validation material may have appeared in model pretraining.

## Inputs and leakage checks

- OpenAI `gpt-4.1-mini` and Jev `typesafe/jev-1.14` receive identical chronological contact sheets: a frame every two seconds, 384×216 letterboxed tiles, at most four columns. No deduplication, tiny-tile reduction, audio, or inferred motion. This QA adapter uses larger tiles than SemVOD's long-session search sheets.
- Gemini `google/gemini-2.5-flash-lite` receives the clipped video with its original audio. This compares complete input/model configurations. It does **not** isolate the benefit of audio from denser video or model differences.
- All questions for one video are batched in one request, with unchanged options and original answer indices. Only question IDs, text, and options are sent; answer labels and category metadata are excluded. Prompts, schemas, temperatures and provider routes were fixed before inference.
- Five memory games end strictly before the official cut frame. A pre-inference check caught compressed-packet timestamps containing MP4 edit offsets and non-frame markers. The extractor was corrected to use decoded presentation timestamps, with the cutoff rounded downward by less than 1/60,000 second. Re-exported clips contain exactly **170, 432, 280, 382 and 503 decoded frames** respectively. All 25 clips contain an audio track. This correction happened before any model received the media.

## Receipts and free reproduction

After all arms finish, `summary.json` contains accuracy by selection stratum, skill area and reasoning category. Per-arm files retain every answer, response ID, request hash, usage and latency. `responses.json` preserves successful provider responses, and the grader verifies saved answers against them. Unknown failed charges remain fully reserved rather than being called free.

```sh
node scripts/perception-eval.mjs       # free receipt status
node scripts/grade-perception.mjs      # free grading, no network or keys
```

Live reruns are separate paid experiments. Preparation uses Python's standard library to fetch only selected ZIP members with HTTP ranges, CRC and SHA256 checks; no dataset code executes. `scripts/prepare-perception.py --extract` additionally uses the locally compiled `scripts/extract-eval.swift`. `scripts/perception-eval.mjs --prepare` builds sheets and hashes. Native encoders can produce different bytes on different systems; retain a new run's manifest rather than replacing these receipts. `--live gemini|openai|jev` is explicit, pins providers and enforces the shared local ledger's remaining $0.42 limit. It never silently creates a fresh budget ledger.

Costs are successful provider-reported OpenRouter charges and conservative OpenAI list-price estimates at $0.40/$1.60 per million input/output tokens, without assumed cache discounts. Replaying saved receipts makes no inference calls. These short QA clips do not measure cost per stream-hour or search latency.

## Attribution and rights

Perception Test data and annotations are by DeepMind and the [paper's authors](https://arxiv.org/abs/2305.13786), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) under the dataset's official README. `annotations.json` is an unchanged selected subset of question records, packaged under video IDs; it remains CC BY 4.0, not this repository's MIT software license. Videos are not redistributed. Predictions and evaluation software are ours. Source URLs and selection hashes are in the protocol and preparation script.

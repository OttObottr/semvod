# Adversarial review — November 2, 2026

Release scope: a local hackathon MVP, with real integrations and a clearly labeled illustrated sample. This review does not establish competitor superiority or production reliability over arbitrary streams.

## Reproduced defects and corrections

The [before log](verification/adversarial-before.txt) has three failing regression checks. The [after log](verification/adversarial-after.txt) has 22 passing tests.

| Failure case | Before | Correction |
| --- | --- | --- |
| Stop while OBS authentication is pending | Startup could finish after Stop and leave recording active | Stop waits for startup settlement |
| A late event from an old Twitch socket | Message could enter the next recording | Socket callbacks and queued writes belong to their original session |
| JSON written under umask 022 | Temporary file could start as 0644 before token chmod | Atomic files are created 0600 with exclusive creation; new private directories use 0700 |
| OBS disconnect | Capture could silently stop producing frames | Capture retries a disconnected OBS connection; failure is persisted and shown in the UI; simulated disconnect/recovery passes |
| Chat phrase near multiple frames | Equal scores favored an early nearby frame and could duplicate a message | Distance weighting selects the nearest frame; real message at 66.316s now selects 66.336s |
| Coarse vision false positive on an exact duplicate | Refinement only corrected one timestamp | Refinement updates every alias of that image; regression test covers removal of the false positive |

Recorder index writes are serialized, so late persistence cannot overwrite the final session with an older recording state.

## Quality and cost receipts

[Machine-readable results](verification/cost-and-quality.json).

- Real OpenAI vision finds the illustrated dog and blue portal. An absent elephant produces no hits.
- A fresh positive search on 63 captured frames / eight unique images used 1,855 input and 278 output tokens, three vision calls, and 7,228 ms.
- At the [published GPT-4.1-mini rates](https://developers.openai.com/api/docs/models/gpt-4.1-mini), that is a list-price estimate of **$0.0011868**, before any provider prompt-cache discount. This is not the account's total bill or a long-stream cost estimate.
- The normalized repeat used **zero vision calls, zero new vision tokens, and 17 ms**. Caches also survived a fresh process.
- A separate OpenAI Decisions experiment scored the same eight illustrated cells for dog, brightest blue, and elephant in 594–945 ms. At the existing 3/10 threshold, it selected the expected dog/portal cells and no elephant cells. This is a small scoring-pass experiment, not an end-to-end production comparison.
- Three-sheet concurrency is bounded and tested on 145 distinct generated frames. Repeated scores remain content-addressed; failed calls are not silently retried.

## Security and integration checks

The HTTP tests reject cross-origin and null-origin mutations, missing client headers, a forged Host sent through raw HTTP, traversal IDs, malformed queries, and invalid OAuth state. Covers safely render escaped title text. Query moderation blocks a flagged query before any image is sent.

No actual OpenAI key or Twitch client secret matched any tracked repository file when scanned using the local values. `.env` and the OAuth token file are mode 0600. Package versions are locked; install scripts are disabled. Prior registry verification reported zero known advisories, 83 verified signatures, and 43 verified attestations. These checks are not a malware-free guarantee.

Actual Linux OBS capture, Twitch authorization, EventSub delivery, archive matching, and a confirmed 30-second Twitch clip were exercised. The public test scene contained only original artwork, with no Mac screen, camera, or microphone. All disposable OBS containers, images, and the isolated network were removed; the pre-existing OrbStack installation was retained.

The original narration draft used a macOS system voice. Review caught Apple's public-redistribution restriction; that upload was made private and the narration replaced with OpenAI-generated speech. The replacement carries an on-screen AI-voice disclosure. No microphone input is used.

## Remaining limits

- The real end-to-end dataset is a short, original illustrated broadcast. There is no hours-long gameplay soak test or representative streamer benchmark; do not claim one.
- Real OBS testing used Linux OBS 29 / WebSocket 5.1. Native macOS OBS was deliberately not installed or verified. Later lifecycle hardening is covered by mock protocol regressions.
- Still frames cannot establish speech or every action between captures. Small objects and image-model errors remain possible. Relevance scores are not calibrated accuracy percentages.
- Twitch returned an empty video_id and null vod_offset for the confirmed clip. Creation and playback were verified, and offset math follows the [official end-offset contract](https://dev.twitch.tv/docs/api/reference/#create-clip-from-vod); exact alignment was not independently established from that metadata. Do not claim frame-accurate clipping.
- Twitch does not replay messages lost during an EventSub outage. Reconnect recovery cannot reconstruct missing chat. See the [official WebSocket guide](https://dev.twitch.tv/docs/eventsub/handling-websocket-events).
- This is a single-user localhost app. Keys and session files should remain private to the creator's OS account. No independent security certification or adversarial model-ranking benchmark is claimed.

## Lean architecture comparison

Reviewed the [OpenAI sampled-frame example](https://developers.openai.com/cookbook/examples/gpt_with_vision_for_video_understanding), [obs-websocket-js](https://github.com/obs-websocket-community-projects/obs-websocket-js), and [Twurple](https://github.com/twurple/twurple). The current representation is small: sessions own timestamped frames and chat; exact image hashes own score aliases; query/model/prompt versions identify cached work. No SDK, database, model checkpoint, or new runtime dependency was added during review. Broader SDKs and CLIP embeddings remain options when a representative workload demonstrates a benefit.

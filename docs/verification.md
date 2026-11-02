# Verification status

Updated during the build on November 2, 2026. Keep this honest as live setup progresses.

See [the adversarial review and before/after receipts](adversarial-review.md) for failure cases, measured costs, and remaining limits.

## Verified locally

- A clean checkout passes `npm ci`, production build, and all 22 tests with package install scripts disabled.
- TypeScript checking and production Vite build pass.
- Twenty-two native Node tests pass, with no real OpenAI calls.
- Production HTTP integration serves the sample, supports search, and downloads a correctly sized 1280×720 cover.
- Cross-origin requests, missing mutation headers, invalid session paths, and invalid OAuth state are rejected.
- Mock OBS v5 challenge authentication, current-program-scene screenshot requests, frame persistence, and graceful stop pass.
- Mock Twitch EventSub subscription identities/scopes, message deduplication, and reconnect migration pass.
- Vision response validation, moderation blocking, concurrent-work coalescing, query normalization, duplicate-frame fan-out, persistent score reuse, and model-change invalidation pass.
- VOD stream/time matching, recorder-start offset, clip end-offset semantics, and boundary clamping pass.
- Desktop and 400px phone layouts were visually checked; full-page screenshots are saved in `docs/screenshots/`.
- In Chrome, the sample loads; clicking `dog` and `brightest blue` changes the timeline, selected frame, and nearby chat.
- Current `npm audit`: zero known vulnerabilities. `npm audit signatures`: 83 verified registry signatures; 43 verified attestations. This is package-authenticity/advisory evidence, not a malware-free guarantee.

- Live Twitch OAuth completed for `ottobottr`; token validation confirms `user:read:chat` and `channel:manage:clips`.
- Live EventSub WebSocket welcome and `channel.chat.message` subscription succeeded with status `enabled`; actual message delivery also passed in the separate capture described below.

- Actual OBS 29.0.2 / WebSocket 5.1.0 capture passes in the network-disabled Linux sandbox; a captured image was visually inspected. Native macOS OBS remains intentionally uninstalled.
- The artwork-only public Twitch test produced 63 captured frames, matched archive `2917774778`, and created confirmed clip `TardyResourcefulTurtleRuleFive-4N9rgxv50ZQTaF0g`. The channel was verified offline afterward.
- Actual EventSub message `lol` from `ottobottr` was received while OBS frames were captured in a separate offline test session.
- Real OpenAI moderation and `gpt-4.1-mini` vision requests passed for `dog` and `brightest blue` on the 63-frame Twitch recording. Eight unique frames share one detailed sheet. The initial vision check made nine paid requests without collecting token usage. A later fresh search did collect usage and a list-price estimate; see `verification/cost-and-quality.json`.
- The first compact sheet missed the small illustrated dog. Short sheets now retain 384×216 frame detail; refinement also updates every exact duplicate timestamp. A regression test checks that a coarse false positive disappears from all its duplicates.
- Repeated normalized queries and a fresh app process reused persisted scores with **zero paid vision calls**. See `verification/vision-report.json` and `screenshots/real-dog-search.png`.
- The [public YouTube demo](https://www.youtube.com/watch?v=1-FCJHXmjm4) is published on Bellverse Labs. Signed-out incognito playback succeeded. The exported 1920×1080 H.264/AAC file is 141.967 seconds with an audio track. Page-only captures, original artwork, and OpenAI-generated narration with an on-screen disclosure keep the Mac desktop and microphone out of the video.
- Sandbox configuration and evidence are recorded in `sandbox-testing.md`. Cleanup is complete: both test containers, the isolated network, all six test images, and the downloaded base image were removed. Docker lists no remaining containers or images. Temporary build folders were moved to Trash; temporary setup/proxy files were removed. The pre-existing OrbStack installation remains intact, and no native OBS app was installed.

## Submitted

Devpost displayed **“Project submitted!”** for [SemVOD](https://devpost.com/software/semvod), listed under Codex x TwitchCon Hackathon, before the November 2 deadline. Public demo: https://www.youtube.com/watch?v=1-FCJHXmjm4.

Source is published at https://github.com/OttObottr/semvod.

## API contracts checked

- Twitch API reference: `POST /helix/videos/clips`; `channel:manage:clips` for broadcaster authorization; end-offset semantics; required editor, broadcaster, VOD, offset, and title fields.
- EventSub `channel.chat.message` v1: `user:read:chat`; broadcaster and authorized reader IDs; WebSocket welcome/subscription, deduplication, and migration handling.
- OBS WebSocket v5 protocol: challenge authentication, program-scene lookup, screenshot request options.
- OpenAI Responses image input/structured outputs and `omni-moderation-latest` moderation.

Official references are linked in the README. The app's implemented behavior and simulated tests do not replace real integration validation.


### Final clean-checkout verification

On November 2, a `git archive` checkout with no `.env`, OAuth tokens, or recordings passed `npm ci --offline --ignore-scripts --no-audit --no-fund`, `npm run build`, and all 22 tests. Test transports reject external fetch/WebSocket destinations; the HTTP test runs in a temporary directory with synthetic credentials. This is test isolation, not an OS-level sandbox. The release remains on Responses after the faster Decisions experiment failed a cat-versus-dog adversarial check. See the [raw model comparison](verification/benchmark/README.md) and [illustrated-fixture search timelines](verification/semantic-comparison.png).


### Fresh-clone test command correction

A second clean checkout reproduced a missing `dist/client` failure when `npm test` ran before a build. The command now explicitly runs `npm run build` before the test runner. A `pretest` hook alone would be skipped by this repository’s `ignore-scripts=true` policy. The corrected `npm test` then built successfully and passed all 22 tests in that checkout. No runtime search behavior or dependencies changed.

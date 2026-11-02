# Devpost draft

**Project:** SemVOD

**Tagline:** Ctrl+F for your stream.

**Elevator pitch:** Search your OBS captures in plain words, inspect Twitch chat activity, create a cover, and request a Twitch clip for a selected moment. Runs locally with your own key.

## Inspiration

After a stream, creators often remember a moment but not its timestamp. Turning that memory into a clip means scrubbing through the archive, making a cover, and finding the moment again on Twitch. For small streamers doing their own editing, that is time they could spend creating.

We wanted the streamer to define the moment. “Find the dog” and “find the brightest blue” should be useful searches, even when those moments were quiet. Chat energy should provide context rather than decide what counts as a highlight.

## What it does

SemVOD is a local desktop web app that captures small frames from the OBS program scene and records Twitch chat while a creator streams. Afterward, the creator searches in plain words and explores a relevance heatmap alongside a chat-energy line.

Select a result to inspect the frame and nearby chat, download a 1280×720 cover with optional title text, and request a clip from the matching Twitch archive. If Twitch declines clip creation, a VOD timestamp link offers a direct route back to the moment.

The repository includes a clearly labeled, original illustrated sample with synthetic chat and bundled results. Judges can explore the UI and download covers without accounts or API keys. Real semantic search uses the streamer's OpenAI key. Phrase search uses recorded chat, not audio transcription.

## How it connects to Twitch

The recorder uses Twitch EventSub over WebSocket with `channel.chat.message`, scoped to the chosen broadcaster and authorized chat reader. Twitch OAuth requests `user:read:chat` and `channel:manage:clips`. OBS supplies the actual frames because Twitch's metadata API does not provide the VOD video file.

For clipping, SemVOD matches the recording's stream ID and time to a Twitch archive. It translates the recording-relative timestamp into the VOD offset and calls Twitch's Create Clip From VOD endpoint. It polls for confirmation and provides a timestamp-link fallback when clipping is unavailable.

## How we built it with Codex

The build happened in one Codex thread, from the initial brief through implementation and verification. Codex consulted the official Twitch, OBS, and OpenAI documentation, implemented native HTTP and WebSocket adapters, built the React interface, generated original procedural sample artwork, and wrote focused protocol, caching, and integration tests.

Human feedback pushed the implementation toward smaller dependencies and lower inference cost. Codex responded with contact sheets, exact duplicate-frame reuse, normalized-query memoization, and per-image caches that survive restarts and interrupted searches. Tests caught a chat substring false positive and recording-state races before live testing.

**Codex build session ID:** `01a19d28-f0f4-7e53-8bda-dd046fd0c3a8`

## Technical choices

Forty-eight small numbered frames share one vision call. A second pass refines at most ten separated candidates. Scores are cached by image content, query, model, and prompt version; simultaneous identical requests share work. The UI reports vision calls and cache hits. Moderation runs before a live query can send any frame.

SemVOD runs in one local Node process without a database or hosted backend. Twitch, OpenAI, and OBS use native transports rather than additional SDKs. Credentials and real recordings are excluded from the repository, and package installation scripts are disabled.

## Challenges

A recording may start well after a Twitch broadcast begins. Clip offsets must account for that difference, and Twitch's VOD endpoint takes the **end** of the desired clip. We tested stream matching and boundary clamping so that a result cannot silently jump to an unrelated latest archive.

Still images also have limits: they do not establish spoken words or every action. SemVOD shows chat and visual evidence separately and labels the offline sample explicitly.

Live testing exposed an accuracy tradeoff: 192-pixel tiles missed a small illustrated dog. Short sessions now keep 384-pixel detail, while long sessions retain compact sheets. Refinement corrections propagate to every duplicate timestamp. Live API searches for `dog` and `brightest blue` found the expected frames in that illustrated test, and restarting the app preserved zero-call cache reuse.

## What’s next

A moderator replay queue, automatic stream chapters, higher-quality optional cover capture, and vertical cover layouts. The creator should keep control over which moments represent their stream.

## Built with

TypeScript, Node.js, React, Vite, Sharp, OBS WebSocket v5, Twitch OAuth, Twitch EventSub, Twitch Clips API, OpenAI vision and moderation, OpenAI Codex.

## Submission references

- Repository URL: https://github.com/OttObottr/semvod
- Public YouTube demo URL: https://www.youtube.com/watch?v=1-FCJHXmjm4 (2:22)
- Codex session ID: `01a19d28-f0f4-7e53-8bda-dd046fd0c3a8`
- Verified Twitch archive: https://www.twitch.tv/videos/2917774778
- Verified app-created clip: https://www.twitch.tv/ottobottr/clip/TardyResourcefulTurtleRuleFive-4N9rgxv50ZQTaF0g
- Tested integration paths and their limitations are documented in `docs/verification.md`.


## Semantic comparison gallery
Live API scores for dog, cat, and brightest blue on the illustrated test share one fixed 0–10 timeline scale, plus a stacked sum of relevance divided by ten. The absent cat query stays flat in this recorded comparison. This graphic describes that fixture; it does not establish accuracy on other footage. The UI searches one query at a time. See `verification/semantic-comparison.png` and the published raw arrays.

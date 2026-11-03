# SemVOD

**Ctrl+F for your stream.** Search captured visuals and Twitch chat, find a moment on the timeline, download a cover, and create a Twitch clip.

A local Node app captures small frames from OBS. Your OpenAI key pays only for uncached searches. No hosted backend, database, or account is needed for the sample.

**[Demo video](https://www.youtube.com/watch?v=1-FCJHXmjm4)** · [Real Twitch clip](https://www.twitch.tv/ottobottr/clip/TardyResourcefulTurtleRuleFive-4N9rgxv50ZQTaF0g) · [Verification](docs/verification.md) · [Benchmarks](docs/benchmark-plan.md)

![Visual-query timelines for dog, cat, and brightest blue](docs/verification/semantic-comparison.png)

These timelines come from a test broadcast of eight original illustrations, not gameplay. All rows share a 0–10 relevance scale, not probabilities. The absent `cat` query stays flat. [Scores](https://github.com/OttObottr/semvod/blob/53ecc81bd8d586265e0476db1ac6d61012e4f98a/docs/verification/semantic-series.json) · [Plotting tool](https://github.com/OttObottr/semvod/blob/53ecc81bd8d586265e0476db1ac6d61012e4f98a/scripts/plot-comparison.mjs).

## Try it

Requires **Node.js 24+** and npm:

```sh
npm ci
npm run demo
```

Open **http://localhost:5173**. Try `dog` or `brightest blue`, select a result, and download a titled 1280×720 cover.

The bundled sample uses original procedural illustrations, synthetic chat, and explicitly labeled saved results. It makes **zero model calls** and cannot create real Twitch clips. Other sample queries require your key and the “Use my key for real AI search” checkbox.

## Record your stream

```sh
cp .env.example .env
chmod 600 .env
```

1. **OpenAI:** create an [API key](https://platform.openai.com/api-keys), enable API billing, and set `OPENAI_API_KEY`. A ChatGPT subscription does not include API billing. The default model is `gpt-4.1-mini`; `OPENAI_MODEL` is configurable.
2. **Twitch:** enable 2FA and register a **confidential** app in the [developer console](https://dev.twitch.tv/console/apps), category **Application Integration**, redirect **`http://localhost:5173/auth/twitch/callback`**. Set `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`. Restart SemVOD, then use **Setup → Connect Twitch** with the broadcaster account.
3. **OBS 28+:** configure your intended source. Enable **Tools → WebSocket Server Settings** on port **4455**, keep authentication enabled, and set `OBS_PASSWORD`. SemVOD captures the current program scene; check its contents before broadcasting.
4. **Broadcast:** enable **Store past broadcasts** and clips in Twitch. Connect OBS to Twitch and start the broadcast. Select **Record a stream** in SemVOD. Stop recording when finished, then stop broadcasting and allow the archive to process.
5. Search the saved session. Select a result to download a cover or create a clip. If clipping is unavailable, copy the matching VOD timestamp link.

Restart after editing `.env`. Set `TWITCH_CHANNEL` only to override the recording channel. Authorization needs `user:read:chat` and `channel:manage:clips`. For OBS-only capture, use `npm run semvod -- record --no-chat`; this has no chat or linked Twitch archive.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run demo` | Sample with development UI |
| `npm run dev` | UI and recording controls |
| `npm run semvod -- record` | Record frames and chat; Ctrl+C saves |
| `npm run semvod -- index <session-id>` | Build/reuse contact sheets |
| `npm run build` then `npm start` | Build and run production UI |
| `npm test` | Build, then offline app regression tests |
| `npm run demo:generate` | Regenerate original sample assets |
| `npm audit` / `npm audit signatures` | Dependency advisory/signature checks |

## Search and cost

- **Capture:** roughly one 384px JPEG every two seconds, plus EventSub chat. Frames, timestamps and chat persist locally during recording.
- **Coarse search:** exact duplicate images share scores. Numbered contact sheets hold up to 48 distinct 192×108 tiles; sheets of at most 12 frames use 384×216 tiles. The model returns scores without written explanations.
- **Refinement:** up to ten separated visual candidates get individual scores and short reasons. Images are capped at 768px without enlarging small inputs.
- **Caching:** normalized query, model, prompt version, cell count and image hash identify reusable scores. Successful calls are saved immediately across sessions and restarts; concurrent identical requests share work. Errors have no automatic retries or model upgrades.
- **Moderation:** live queries are checked before images are sent. Decisions are cached for one day; blocked queries and provider errors fail visibly.
- **Chat:** literal phrase matches contribute separately from visual relevance. A ten-second chat-energy line shows message/emote activity.

An uncached query needs one call per distinct sheet plus up to ten refinements. The UI reports calls and cache hits, not a dollar quote. Use a dedicated OpenAI project and its billing controls. Model experiments and perceptual frame pruning are **not** shipped features.

## Privacy and limits

`.env`, `.semvod/` credentials/cache, and `sessions/` recordings are ignored by Git. OAuth tokens use owner-only permissions. For live search, your query and compressed images go to OpenAI with `store:false`; see [provider data controls](https://developers.openai.com/api/docs/guides/your-data). This does not guarantee zero provider retention.

The server binds to loopback, checks Host/Origin, requires a custom mutation header, and validates short-lived OAuth state. Do not expose it through a public tunnel. Dependencies are pinned; `.npmrc` disables installation lifecycle scripts. Runtime packages are React, React DOM, Lucide and Sharp. An advisory scan cannot prove absence of malware.

The app searches **sampled stills and chat, not audio**. It can miss brief events, infer motion incorrectly, or return false matches. Covers upscale captured frames. Chat latency can shift alignment. Clips require the recording's broadcaster and a matching archive among the latest 100 VODs; the app will not silently choose an unrelated archive.

If OBS fails, check its WebSocket settings and use **Setup → Test OBS connection**. For chat errors, reconnect Twitch and inspect the session's `chatStatus`. For clipping errors, check archive/clip settings and use the VOD-link fallback. For quota errors, fix billing before retrying; completed scoring calls are reused.

## Code and evidence

`src/client/` contains the UI; `src/server/` contains capture, search, storage and integrations; `src/shared/` contains types and public limits. `tests/` covers app regressions, `sample/` holds the offline demo, and `scripts/generate-demo.ts` regenerates it.

`npm test` builds and runs 28 offline regression cases with external provider transports blocked. [Verification](docs/verification.md) covers browser, integration and security checks; [benchmarks](docs/benchmark-plan.md) report retrieval accuracy and cost, including limitations and regressions. Research tools and raw experiment logs stay outside the application tree.

## Built with Codex

Built in one Codex thread: architecture, OBS/EventSub integrations, memoized search, UI, procedural sample art, tests and documentation. Human direction emphasized low cost, privacy and minimal dependencies.

**Build session:** `01a19d28-f0f4-7e53-8bda-dd046fd0c3a8`.

The [submitted hackathon build](https://github.com/OttObottr/semvod/tree/hackathon-2026-11-02) is preserved; later `main` changes are post-submission development. [Submission materials](https://github.com/OttObottr/semvod/tree/53ecc81bd8d586265e0476db1ac6d61012e4f98a/docs).

MIT licensed. Sample art is original; dependency licenses remain with their authors.

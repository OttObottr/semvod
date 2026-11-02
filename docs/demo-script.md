# SemVOD demo — 2 minutes 40 seconds

Record a real test broadcast first. Show its Twitch page and the resulting archive/clip in this video. Offline fixtures can explain the UI, but do not present them as real AI search or proof of Twitch integration.

## 0:00–0:15 — Problem

**Screen:** Twitch archive, then SemVOD.

“I streamed for hours. I remember a great moment, but not when it happened. Finding it, making a cover, and clipping it can take longer than posting it. SemVOD is Ctrl+F for your stream.”

## 0:15–1:45 — Live use

**0:15–0:35:** Show the real stream on Twitch and OBS, then SemVOD’s recording/session indicator.

“SemVOD captures small stills from my OBS program scene and records Twitch chat with EventSub. Everything stays on my computer until I search with my own OpenAI key.”

**0:35–1:00:** Search a visible object that actually appeared in the broadcast—`dog` if available. Show the heatmap changing and select a strong peak.

“I type what I remember. These peaks show visual relevance. The line underneath is chat energy, so I can see whether the community felt it too.”

**1:00–1:15:** Search `hella insane` only if that phrase was actually sent in chat. Show its chat explanation.

“I can also find phrases from chat. SemVOD keeps visual evidence and chat matches separate; it doesn’t claim to transcribe the audio.”

**1:15–1:30:** Select a hit, enter a short title, download and open the cover.

“Pick a moment and download a 1280 by 720 cover, ready to share.”

**1:30–1:45:** Create the real Twitch clip. Show the confirmation and open it on Twitch. If the endpoint rejects it, visibly use the VOD timestamp fallback and say so.

“It finds the matching archive, accounts for when I started recording, and asks Twitch to create a clip around this moment. If Twitch blocks creation, I still have the exact VOD link.”

## 1:45–2:15 — How Codex built it

**Screen:** This Codex thread, then the source and passing tests. Keep `.env` and token files closed.

“I built SemVOD with Codex in one thread. We checked Twitch’s current API contracts, wrote lean OBS and EventSub adapters, and tested reconnects and timestamp math. To reduce spend, Codex built tiny contact sheets, duplicate-frame detection, and persistent memoization. Repeat searches reuse the scores—even after restarting. There’s no hosted backend or SDK stack.”

## 2:15–2:30 — Why it matters

**Screen:** Repeat the first query; show `0 vision calls` for the real cached result.

“The streamer chooses what matters. This saves the search work without handing creative control to an automatic hype detector.”

## 2:30–2:40 — What’s next

**Screen:** Selected real moment, cover, Twitch clip.

“Next: a replay queue for moderators, stream chapters, and vertical covers. SemVOD: find the moment, keep the magic.”

## Before recording

- Use a dedicated scene/window; close private tabs and notifications.
- Record an actual stream with archives enabled. Show an object, a vivid color, and a funny action for several seconds each. Type a memorable phrase into your own Twitch chat.
- Allow Twitch archive processing. Run the intended queries once to confirm useful matches. Say when results are cached; never imply a cache replay is a fresh AI call.
- Ensure a real clip works, or rehearse the honest timestamp-link fallback.
- Set your recording to capture app audio/mic as desired, with readable browser zoom.
- Keep the video under 3 minutes, upload to YouTube as **Public**, and check playback in a signed-out browser.

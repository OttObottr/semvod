# Verification

## Automated checks

`npm test` builds the app, checks unused TypeScript code and runs 28 regression cases with external provider transports blocked. Coverage includes recording, OBS/EventSub reconnection, OAuth and clip boundaries, concurrent cache writes, query normalization, HTTP access controls and the offline demo. Tests need no API keys.

## Browser and integration evidence

- [Chrome verification](https://github.com/OttObottr/semvod/blob/767763fab025e36eb30309cd89a4aaf574bcccab/docs/verification/browser-smoke.json): 17 workflows in development and production, including covers, errors, session changes, mobile layout and keyboard navigation.
- UI replay matched all 1,774 saved scores and ranked hits across 24 real-video sessions; all 24 titled covers decoded at 1280×720. This verifies rendering, not retrieval accuracy.
- Recorded Lighthouse 13.0.3 desktop/mobile runs scored 100 in all four categories. These are local page-load measurements, not guarantees of accessibility or search quality.
- The [OBS/Twitch integration test](https://github.com/OttObottr/semvod/blob/53ecc81bd8d586265e0476db1ac6d61012e4f98a/docs/sandbox-testing.md) captured original artwork, received EventSub chat, called OpenAI moderation/vision and created the [demo clip](https://www.twitch.tv/ottobottr/clip/TardyResourcefulTurtleRuleFive-4N9rgxv50ZQTaF0g). No desktop, camera or microphone content was broadcast.

## Security and accuracy

The [recorded Git credential audit](https://github.com/OttObottr/semvod/blob/767763fab025e36eb30309cd89a4aaf574bcccab/docs/verification/git-secret-audit.json) found no secrets in the inspected history, refs, working files or Git configuration. The recorded dependency scan found zero known vulnerabilities and verified 83 signatures and 43 attestations. These are point-in-time checks, not proof that all vulnerabilities or secrets are absent.

[Retrieval benchmarks](benchmark-plan.md) report accuracy, costs and regressions separately from integration checks. The app searches sampled stills and chat, not audio. The illustrated demo is not a gameplay benchmark.

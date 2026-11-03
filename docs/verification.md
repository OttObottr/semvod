# Verification status

Updated November 2, 2026. The [submitted build](https://github.com/OttObottr/semvod/tree/hackathon-2026-11-02) is preserved; current `main` includes post-submission improvements.

## Current checks

- `npm test` builds first, checks unused TypeScript code, and passes 28 offline app regression cases. Provider transports are blocked; no keys are required.
- [Chrome receipts](verification/browser-smoke.json): 17 workflow checks pass in both development and production, including errors, covers, session changes, mobile layout, and keyboard navigation before searching a 200-frame session.
- All 24 real-video holdout sessions work through the UI. Every one of 1,774 saved numeric scores and all ranked hits match the frozen predictions; all 24 titled covers decode at 1280×720. This replays saved inference, not a new accuracy measurement.
- Lighthouse 13.0.3 scores 100 for performance, accessibility, best practices and SEO on both standard desktop and mobile profiles. These are local page-load lab results; they do not establish complete accessibility or search quality.
- Linear, memoized timeline binning matches the previous output in 67 cases. For 10,800 frames, isolated CPU medians fell from 9.90 ms to 0.067 ms; this is not end-to-end search speed.
- Adversarial review and regression cases cover overlapping Twitch token writes, concurrent sheet publication, stale clipboard responses, cache isolation, recording state and clip boundaries. Astra reviewed the final changes with no remaining blocker found in that scope.
- `npm audit`: zero known vulnerabilities. Registry verification: 83 package signatures and 43 attestations. [Git credential scan](verification/git-secret-audit.json): no findings across local objects, remote branches/tags/PR heads, working files and local Git configuration. These checks cannot prove the absence of malware or unknown secrets.

The repository cleanup preserves all 28 app regression cases; four evaluation-tool cases live with the archived benchmark tools. No packages or paid model calls were added for the cleanup. Detailed new audit tooling and reports remain in the separate benchmark workspace. Test isolation is not an OS sandbox.

## Integration and submission evidence

The earlier [isolated OBS/Twitch test](https://github.com/OttObottr/semvod/blob/53ecc81bd8d586265e0476db1ac6d61012e4f98a/docs/sandbox-testing.md) captured 63 frames from original artwork and created the [public demo clip](https://www.twitch.tv/ottobottr/clip/TardyResourcefulTurtleRuleFive-4N9rgxv50ZQTaF0g). EventSub message delivery and real OpenAI moderation/vision requests also passed. The test broadcast is now unpublished; the clip remains available. No desktop, camera or microphone content was broadcast.

The [2:22 public demo](https://www.youtube.com/watch?v=1-FCJHXmjm4) uses original artwork and disclosed generated narration. Devpost displayed “Project submitted!” for [SemVOD](https://devpost.com/software/semvod) before the deadline. Test containers, downloaded test images and temporary setup files were removed; native OBS was not installed.

## Accuracy limits

Integration success does not prove retrieval quality. The [frozen 24-video holdout](benchmark-plan.md#qvhighlights-holdout) achieved 11/24 at temporal IoU 0.5 and 10/24 at 0.7. Localization still needs improvement. The app searches sampled stills and chat, not audio; the illustrated demo is not a real-gameplay benchmark. Historical evidence remains in [the review](https://github.com/OttObottr/semvod/blob/53ecc81bd8d586265e0476db1ac6d61012e4f98a/docs/adversarial-review.md) and [evaluation summary](benchmark-plan.md).

# Real-footage development pilot

Post-submission work. The submitted release is preserved at tag `hackathon-2026-11-02`. This is a small, exploratory regression dataset, **not a representative stream benchmark, independent test set, or leaderboard result**.

Two NASA videos supply 90 seconds each (source seconds 30–120), sampled every two seconds at 384px: 90 distinct frames, two 45-cell contact sheets. Six visual queries cover four positives and two absent objects. Labels are provisional agent-reviewed sampled windows, frozen in commit `1c47961` before inference. Two additional speech queries use NASA caption timings, frozen in `5a00695`. They were not given to the models. No synthetic chat was added.

## Measured results

All visual arms use the same six queries. Hit@1/5 counts positive queries whose first/any top-five returned timestamp falls within a labeled window. Precision pools relevant returned hits over all returned hits on positive queries; it is **not** fixed-denominator precision@5. Absent-query false positives are separate. A format failure stays in the planned denominator as a miss. These are point-window metrics, not temporal IoU or continuous-event recall.

| Visual arm | Hit@1 | Hit@5 | Precision among returned hits | Absent queries with hits | Format failures | Six-query cost |
|---|---:|---:|---:|---:|---:|---:|
| Original OpenAI pipeline | 4/4 | 4/4 | 6/8 (75%) | 0/2 | 0/6 | $0.0157824 |
| Score-only coarse pass, OpenAI refinement | 4/4 | 4/4 | 6/8 (75%) | 0/2 | 0/6 | $0.0105912 |
| Jev coarse pass, OpenAI refinement | 4/4 | 4/4 | 6/9 (67%) | 0/2 | 0/6 | $0.005226578 |
| Gemini: dense score array | 1/4 | 1/4 | 1/7 (14%) | 0/2 | 1/6 | $0.01160216 |
| Gemini: decimal-second intervals | 1/4 | 1/4 | 1/4 (25%) | 0/2 | 0/6 | $0.01146911 |
| Gemini: explicit `MM:SS` intervals | 2/4 | 4/4 | 4/7 (57%) | 0/2 | 0/6 | $0.01147352 |
| Uniform timestamps 0,22,44,66,88 | 1/4 | 3/4 | 3/20 (15%) | 2/2 | — | $0 |

Score-only output reduced pilot cost **32.9%** and output tokens from 6,238 to 2,784. It needed 21 vision calls versus 18, so token savings did not simply come from fewer calls. The runtime now uses this change; individual checks still request reasons and reuse the unchanged `visual-v3` cache keys. Coarse caches are versioned separately. No dependencies were added; production TypeScript grew by one net line. All 25 tests pass, including score-only parsing and preservation of single-frame validation.

Jev cut cost another 50.7% versus score-only OpenAI, but introduced an extra off-target provisional candidate. Its three-level rubric (absent / possible / clear) is mapped from 0–2 to 0–10; these are not calibrated equivalents across models. Both original and optimized pipelines retain high-scoring unrefined candidates. A correct top hit can therefore still be a provisional candidate. Do not interpret these numbers as individually verified detection rates.

**Gemini experiments were adapted after seeing failures.** They are development comparisons, not held-out comparisons. The first request format produced 48 scores instead of 45 on one query. The next sometimes emitted `0.44` where `00:44` appeared intended. We did not repair those old answers into successes. The final format requires explicit `MM:SS` strings and validates their bounds. Interval hits use the interval midpoint, with the same score≥3 threshold and twelve-second spacing as the frame arms. Complete interval lengths and evidence remain in the receipts; a midpoint match does not establish accurate boundaries.

For the two **speech-only queries**, dense and decimal-interval Gemini arms aligned 0/2; explicit timestamps aligned **1/2**. The Spanish answer identified the requested statement but returned an interval too broad for its midpoint to pass the caption-derived window. This does not establish that Gemini cannot understand Spanish. Audio and video tracks were verified in both 90-second clips, and OpenRouter usage reports audio/video input tokens. The current SemVOD app still searches frames and chat; these audiovisual experiments are not a shipped audio-search feature.

## Cost, caching, and limits

Total new development inference: **$0.074620048 across 89 calls**, including all failed-format and exploratory arms. OpenAI amounts are conservative list-price estimates from actual usage at $0.40/M input and $1.60/M output, without cached-input discounts; OpenRouter amounts are reported `usage.cost`, including any provider caching. Taxes/credit-purchase fees are excluded. This is not the account's historical spend or billing balance.

Each frame-based query was immediately repeated: all eighteen repeats made **zero vision calls and used zero model tokens**. Successful scores persist on disk. Identical video requests replay saved responses; invalid responses are retained instead of being silently retried. OpenRouter also reported provider prompt-cache hits; cold costs will differ. Latency is a single sequential run with warm local preprocessing, not a robust model ranking.

There are nine query-minutes of visual footage per arm (six queries ×1.5 minutes). Dividing measured spend by 0.15 gives **$0.1052 per query-hour** for original OpenAI and **$0.0706** for score-only OpenAI. These are normalized short-clip costs, **not a measured hour-long stream forecast**: refinement overhead, deduplication, sheet counts, and cache hits change with duration/content.

The harnesses share an exclusive lock and a persistent **$0.50** ledger in `.semvod/real-footage/spend.json`. Bounded OpenAI/Jev requests reserve $0.02; Gemini reserves $0.32, enough for its entire verified context at the highest applicable audio rate plus capped output. Known usage replaces the reservation; unknown charges retain it and stop further work. No automatic inference retries or model fallbacks. Do not reset the ledger to bypass a cap. These controls apply to the evaluation scripts, **not the app's normal searches**.

## Replay without spending

After the normal locked dependency installation:

```sh
node scripts/real-footage-eval.mjs
node scripts/video-eval.mjs
node scripts/video-eval.mjs --intervals
node scripts/video-eval.mjs --timestamps
```

These commands read committed receipts; they make no model calls and require no keys. [Baseline](baseline.json), [score-only](scores.json), [Jev cascade](jev.json), [dense Gemini](gemini.json), [decimal intervals](gemini-intervals.json), [explicit timestamps](gemini-timestamps.json), [usage ledger](requests.json), [raw OpenRouter responses](provider-responses.json), [test output](tests.txt).

The OpenAI end-to-end receipts retain all resulting frame scores, hit rankings, usage and repeat-cache checks. The ledger retains each call's response ID/request hash/usage; identical-request temporary response files could overwrite an earlier raw response during the original comparison, so those files are not represented as a complete historical OpenAI response archive.

## Reproduce live, explicitly paid

Source media is not bundled. The manifest contains official URLs, source/clip/frame hashes, timestamps and extraction settings. Download only those media files; no third-party executable is needed. On macOS, the checked-in extractor uses system AVFoundation and preserves the source audio in `clip.mp4`:

```sh
mkdir -p .semvod/real-footage
node --input-type=module - <<'JS'
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const {sessions}=JSON.parse(fs.readFileSync('docs/verification/real-footage/labels.json'));
for(const s of sessions){
  const r=await fetch(s.url);if(!r.ok)throw Error(r.status);
  const bytes=Buffer.from(await r.arrayBuffer());
  if(createHash('sha256').update(bytes).digest('hex')!==s.videoSha256)throw Error('Source hash changed');
  fs.writeFileSync(`.semvod/real-footage/${s.id}.mp4`,bytes);
}
JS
swiftc -parse-as-library scripts/extract-eval.swift -o .semvod/real-footage/extract
.semvod/real-footage/extract .semvod/real-footage/eval-nasa-lab.mp4 sessions/eval-nasa-lab 30 90
.semvod/real-footage/extract .semvod/real-footage/eval-nasa-kitchen.mp4 sessions/eval-nasa-kitchen 30 90
```

Native encoder versions can change frame/clip hashes. The live harness refuses changed media instead of silently treating it as the same experiment. Keep committed receipts intact; a new independent run needs its own named output files and declared budget. Existing completed arms are skipped, so `--live` is resumable, not a force-rebill switch.

The original runs used `node --import tsx scripts/real-footage-eval.mjs --live baseline`, then `scores`, then `jev`. OpenAI uses the normal local `.env`; optional OpenRouter experiments load `.semvod/openrouter.env` containing `OPENROUTER_API_KEY`, never a committed key. Video arms use `node --import tsx scripts/video-eval.mjs --live` with optional `--intervals` or `--timestamps`. Freeze any changed protocol before inference and disclose it. Provider prices/modalities/context are checked before calls; re-check current documentation rather than assuming the historical rates remain valid.

## Source and scope

Source footage: **NASA Glenn’s Space Experiments Laboratory** (NASA Glenn Research Center Imaging Technology Center) and **Cocina espacial / Space Kitchen** (NASA). [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) permit factual informational use subject to their restrictions. No NASA endorsement, model validation, or accuracy responsibility is implied. We publish factual evaluation data, not promotional astronaut imagery or a redistributed video collection. The repository MIT license does not relicense NASA media.

This pilot has only two related educational videos, six visual queries, two caption-derived speech queries, no gameplay, no independently adjudicated labels, no motion-specific challenge, and no statistical confidence interval. Both easy negatives pass; harder confounders and brief/tiny events remain untested. Use it to reject broken implementations, not to claim general superiority. See [benchmark and competitor research](../../benchmark-plan.md) for the larger evaluation path.

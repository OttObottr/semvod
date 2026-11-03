# Public footage validation status

No personal screen, camera, Twitch session or private recording was used. This update installed no dependencies and made no paid calls.

The [current-code replay](current-footage-replay.json) checks all six previously labeled NASA queries against existing saved model responses and disk caches. Frame bytes and label hashes were verified. Numeric scores, evidence stages and ranked timestamps match prior results; generic coarse explanation wording differs as documented. Missing saved responses fail closed instead of calling a provider. Every query then repeats with zero vision-cache misses.

| Retrieval check | Result |
|---|---:|
| Positive-query Hit@1 | 4/4 |
| Positive-query Hit@5 | 4/4 |
| Precision among returned positive-query hits | 6/8 (75%) |
| Fixed-denominator positive-query precision@5 | 6/20 (30%) |
| Absent queries with any hit | 0/2 |

Precision@5 counts five slots for every positive query, including unfilled slots. It measures a different quantity from precision among returned hits. The four provisional positive windows do not establish continuous-time recall. These two 90-second clips and six queries are a development regression set, not new held-out accuracy evidence. Local replay time does not measure model latency or cost per stream-hour. Original pilot costs and footage attribution remain in the [pilot report](real-footage/README.md).

Both original official QVHighlights queries were also checked using current source and network-disabled caches. Query 601 retains identical numeric predictions; query 8967 remains moderation-blocked and a miss. The official result stays 1/2 at IoU 0.5 and 0.7. Regrading all 97 Perception Test questions reproduced the existing results; that is model QA evidence, not retrieval accuracy. [QV results](qvh-v1/README.md) · [Perception results](perception-v1/README.md).

[Four additional official video/query pairs](qvh-next/README.md) are now acquired with frozen selection and input hashes. A subsequent explicitly authorized $0.10 scoring phase is now complete: [results and misses](qvh-next/README.md). It achieved 2/4 at temporal IoU 0.5 and 1/4 at 0.7, with estimated charges $0.0160496. The $0 statement above applies to this earlier replay/preparation update, not that subsequent phase. There is no leaderboard or competitive-superiority claim.

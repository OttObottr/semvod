# Additional public-video cases: prepared, not scored

Four additional QVHighlights validation videos and all four associated queries are frozen in [acquisition.json](acquisition.json). They are not accuracy results. No inference has run on these inputs and no new account spend occurred.

The [selection rule](protocol.json) was committed before acquisition: first four additional complete validation members in the authors’ archive order, excluding the two previously tested videos. The first 128 MiB contained no additional validation videos; its [empty receipt](acquisition-128mib.json) remains. We increased only the download allowance to 512 MiB before scoring, keeping the selection rule. This is an access-constrained sample, not a random or hardest-case sample.

Only data was read from the [authors’ archive](https://github.com/jayleicn/moment_detr/blob/main/data/README.md). Python standard-library code checked the HTTP range, archive ETag, member sizes and SHA-256 hashes. It copied selected MP4 bytes to ignored local files without extracting archive paths or running any downloaded code. No package was installed. Public data and these checks reduce exposure; they do not prove a media file is harmless.

Original videos, query text and gold records remain local and ignored. The official annotations are [CC BY-NC-SA 4.0](https://github.com/jayleicn/moment_detr/blob/main/data/LICENSE); archive access does not grant redistribution rights to source videos. This preparation is for local noncommercial research, and the repository’s MIT license does not relicense dataset material.

The next scoring batch must retain every selected case, freeze predictions before grading, count moderation blocks and malformed responses as failures, and report R@1 at temporal IoU 0.5/0.7. A separate explicit inference budget is needed; the preparation budget is $0. Four additional cases still cannot establish that SemVOD is best or accurately model a multi-hour livestream.

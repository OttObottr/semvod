# Isolated integration testing

The user requested that OBS stay off the macOS host and be removed after testing. OBS was therefore tested inside OrbStack's existing Linux VM, in disposable Docker containers. This is isolation against access to the host; it is not a guarantee that third-party software is malware-free.

## Sources and installation

- Base: Docker Official Image `node:24.22.1-bookworm-slim`, pinned during the test to `sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c`.
- OBS: Debian's signed Bookworm package repository, `obs-studio 29.0.2+dfsg-1+b1`, with obs-websocket 5.1.0.
- Xvfb: `2:21.1.7-3+deb12u13`.
- FFmpeg: `7:5.1.9-0+deb12u1`.
- npm: the project's exact lockfile, with install scripts disabled. Linux build and all 18 tests pass.

The installation stage ran with no host filesystem mounts and no credentials. It was removed after its contents were placed into the disposable test image. No OBS macOS app was installed.

## Runtime restrictions

Both OBS and SemVOD run as the non-root `node` user, with a read-only image, all Linux capabilities dropped, `no-new-privileges`, PID/memory/CPU limits, and temporary RAM-backed directories for runtime data. No host folders, Docker socket, camera, microphone, or macOS display are mounted into the containers.

The only OBS input is an `image_source` named `Original sample artwork`, pointing into the copied `sample/frames/` directory. Its source list and all special audio inputs were checked immediately before the public broadcast. The audio inputs were null. The Linux virtual display is separate from the host desktop.

The first capture test ran with `--network none`, with no Twitch or OpenAI credentials. It captured three actual OBS frames and generated a contact sheet. See `verification/sandbox-capture-report.json` and `verification/obs-frame.jpg`.

For the live phase, the app container uses an internal-only Docker network. A separate relay permits HTTPS CONNECT only to `api.twitch.tv`, `id.twitch.tv`, `api.openai.com`, and `eventsub.wss.twitch.tv`, on port 443. Twitch WebSocket and RTMP forwarding have fixed public upstream addresses. The relay does not terminate HTTPS. Requests to an unapproved destination and direct connections to the host were tested and blocked.

The browser UI is exposed through the relay only at `127.0.0.1:5180`; strict Host/Origin checks remain active. `SEMVOD_SANDBOX=1` allows the app to listen on the container interface for this explicit test mode. Normal execution continues to bind to host loopback.

## Live verification

A private bandwidth test sent 2,570,279 bytes over 11.4 seconds, with zero skipped frames and no reconnects; the channel remained publicly offline.

After the user explicitly approved an artwork-only public test, OBS broadcast the original illustrations, SemVOD captured 63 frames and linked the actual Twitch stream, and the VOD clip endpoint created a confirmed 30-second clip. The channel was confirmed offline afterward.

- Archive: https://www.twitch.tv/videos/2917774778
- Clip: https://www.twitch.tv/ottobottr/clip/TardyResourcefulTurtleRuleFive-4N9rgxv50ZQTaF0g
- Evidence: `verification/live-twitch-report.json` and `verification/twitch-clip-thumbnail.jpg`.

Actual chat delivery also passed: `lol` from `ottobottr` arrived through EventSub during a second, offline OBS recording after the broadcast had ended. Real OpenAI moderation and vision searches also passed inside the isolated container using the user's key supplied through stdin into a private temporary file. Repeated queries reused persisted scores with zero vision calls. These tests establish Linux OBS behavior; a native macOS OBS capture was deliberately not performed.

## Cleanup commitment

**Completed November 2, 2026:** test containers, network, all test image layers, and the downloaded base image were removed. Docker reports no remaining containers or images. Temporary build folders were moved to Trash; temporary key-save/proxy files were removed. OBS was never installed on the Mac. The saved recordings, memoized scores, and demo video remain in ignored project folders for the creator.

After all integration checks and required demo artifacts are saved, remove the named `semvod-live` and `semvod-egress` containers, the `semvod-test-internal` network, the test image and its temporary parent images, and the downloaded Node base image if no other workload uses it. Remove the temporary stream-key file and local key-save helper. Keep only source, non-private evidence, and selected test-session assets needed for the demonstration.

Do not run a broad Docker prune or remove unrelated user images/containers. The pre-existing OrbStack installation remains intact. Cleanup status must be recorded in `verification.md`; it is not complete merely because the stream stopped.

## Reproducing the harness

The test-only entry points are `scripts/sandbox.ts` and `scripts/sandbox-egress.mjs`. They are not part of the normal app startup. `sandbox.ts` rejects execution outside Linux with explicit sandbox mode enabled, configures a virtual OBS scene from original sample images, and runs the real capture check. Online mode loads credentials from a temporary, owner-only runtime file. Never bake `.env`, OAuth tokens, or a stream key into a container image.

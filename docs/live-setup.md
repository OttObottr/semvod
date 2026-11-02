# Live integration setup

The bundled sample works without connecting accounts. Keep stream keys and other credentials in local configuration.

## 1. Sign into Twitch

Go to https://www.twitch.tv/ and sign in, or create your account. Verify your email. In Settings → Security and Privacy, enable two-factor authentication. Twitch requires 2FA for developer app registration.

Complete account creation, password entry, two-factor authentication, and any billing directly with the provider.

## 2. Register SemVOD as a Twitch app

Open https://dev.twitch.tv/console/apps and choose **Register Your Application**.

- Name: `SemVOD Local <your-username>` (must be unique).
- OAuth redirect: `http://localhost:5173/auth/twitch/callback` — add it exactly.
- Category: **Application Integration**.
- Client type: **Confidential**, if the form asks.

Create it, open **Manage**, and copy the client ID into your local `.env` under `TWITCH_CLIENT_ID`. Generate a client secret and place it under `TWITCH_CLIENT_SECRET`. Keep this file private. Restart SemVOD, open **Setup**, and click **Connect Twitch**. Approve chat reading and clip management for your broadcaster account.

Official guide: https://dev.twitch.tv/docs/authentication/register-app/

## 3. Set up OBS

Download from https://obsproject.com/download and install OBS Studio. Use the official macOS build for your Mac. The app's first-run wizard can configure streaming; select Twitch as the service and connect your account in **Settings → Stream**.

Create a scene with a **macOS Screen Capture** or window source. Prefer one specific window so you control what the audience sees. Approve macOS screen-recording access for OBS when prompted. Do not capture private documents or key-management pages.

Open **Tools → WebSocket Server Settings**:

- Enable WebSocket server.
- Port: `4455`.
- Keep authentication enabled.
- Copy the displayed password to `OBS_PASSWORD` in your local `.env`.

Restart SemVOD after editing `.env`. Open **Setup → Test OBS connection**. It should show the name of your current scene.

Official guide: https://obsproject.com/kb/quick-start-guide

## 4. Enable Twitch archives

In Twitch Creator Dashboard, open **Settings → Stream**. Enable **Store past broadcasts** and allow clips. Do this before starting the test stream.

Streams are public. A short, intentional test scene is enough; you do not need your desktop or webcam. A clearly titled test broadcast helps viewers understand what they are seeing.

## 5. Get an OpenAI API key

Visit https://platform.openai.com/api-keys. Check billing/credit status in the OpenAI dashboard first. A ChatGPT plan is separate from API billing.

Use a dedicated project/key. Put the key into `OPENAI_API_KEY` in `.env`, save, and restart SemVOD. Do not paste the key in the browser UI, source files, GitHub, or this chat. Use project billing controls for your desired budget.

The sample still works without this step. Live visual searches require API access.

## 6. Capture a short test

1. Prepare your source window with three clear moments: a dog picture or toy, a strongly blue scene, and a distinct action. Use your own media or original sample assets. Keep each moment visible for at least 8–10 seconds.
2. In OBS, click **Start Streaming**. Check your Twitch channel and confirm the broadcast is visible.
3. In SemVOD, click **Record a stream**. Verify frames/message counts increase. In your Twitch channel chat, type a recognizable phrase, such as `great moment`, at a chosen timestamp.
4. After 2–3 minutes, stop SemVOD and stop OBS streaming.
5. Wait for the Twitch archive to become available. Search your saved session and test a cover. Create a clip and confirm it opens on Twitch, or use the VOD timestamp fallback.

If you only need to test OBS first, select **Start recording** in Setup before connecting Twitch. The app will tell you chat is off. That recording will not be linked to a Twitch archive.

## 7. Prepare a reproducible demonstration

- Sign into GitHub using `gh auth login` (or your browser). Create/push the repo, checking that `.env`, `.semvod`, and real sessions are absent.
- Record a video under three minutes following `demo-script.md`, including actual Twitch footage and this Codex build thread.
- Upload to YouTube as **Public**, check playback, and add the URL to Devpost.
- Paste the description from `devpost.md`, adjust it to exactly what the video demonstrates, and include the Codex session ID.
- Check that every public link works and that the description distinguishes implemented features from demonstrated results.

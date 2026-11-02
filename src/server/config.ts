import { loadEnvFile } from 'node:process';
try { if(process.env.NODE_ENV!=='test')loadEnvFile(); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
export const config = {
  port: Number(process.env.PORT || 5173),
  openaiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  twitchClientId: process.env.TWITCH_CLIENT_ID || '',
  twitchSecret: process.env.TWITCH_CLIENT_SECRET || '',
  redirectUri: process.env.TWITCH_REDIRECT_URI || `http://localhost:${process.env.PORT || 5173}/auth/twitch/callback`,
  channel: process.env.TWITCH_CHANNEL || '',
  obsUrl: process.env.OBS_URL || 'ws://127.0.0.1:4455',
  obsPassword: process.env.OBS_PASSWORD || '',
};

import { loadEnvFile } from 'node:process';
import { defaultPort, chatScoreWeight } from '../shared/settings.js';
try {
  if (process.env.NODE_ENV !== 'test')
    loadEnvFile();
}
catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
    throw error;
}
export const config = {
  port: Number(process.env.PORT || defaultPort),
  openaiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  twitchClientId: process.env.TWITCH_CLIENT_ID || '',
  twitchSecret: process.env.TWITCH_CLIENT_SECRET || '',
  redirectUri: process.env.TWITCH_REDIRECT_URI || `http://localhost:${process.env.PORT || defaultPort}/auth/twitch/callback`,
  channel: process.env.TWITCH_CHANNEL || '',
  obsUrl: process.env.OBS_URL || 'ws://127.0.0.1:4455',
  obsPassword: process.env.OBS_PASSWORD || '',
};
// Algorithm defaults are versioned code, not unchecked environment overrides.
export const searchConfig = {
  minScore: 3,
  maxHits: 5,
  hitGapSeconds: 12,
  maxRefinements: 10,
  refinementGapSeconds: 6,
  parallelSheets: 3,
  chatWeight: chatScoreWeight,
} as const;
export const visionConfig = {
  coarseVersion: 'visual-v4-score-only',
  singleFrameVersion: 'visual-v3',
  requestTimeoutMs: 90000,
  moderationTtlMs: 86400000,
  minimumOutputTokens: 900,
  outputTokensPerCell: 90,
  reasonLength: 180,
  refinementWidth: 768,
  jpegQuality: 78,
} as const;
export const captureConfig = { intervalMs: 2000, width: 384, jpegQuality: 75 } as const;
// Bump version when changing layout or rendering; existing paid image caches remain reusable.
export const sheetConfig = {
  version: 'sheet-v4-short-session-detail',
  maxFrames: 48,
  detailedMaxFrames: 12,
  detailedWidth: 384,
  compactWidth: 192,
  detailedColumns: 4,
  compactColumns: 8,
  tileQuality: 78,
  sheetQuality: 80,
} as const;

export const chatConfig = {
  bucketSeconds: 10,
  emoteWeight: 1.5,
  relevanceWindowSeconds: 8,
  partialMatchScore: 8,
  decaySeconds: 80,
} as const;

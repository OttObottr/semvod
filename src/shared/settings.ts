// Public input limits and defaults shared by the UI and local API. Never put secrets here.
export const inputLimits = {
  query: 200,
  sessionId: 100,
  coverTitle: 100,
  clipTitle: 140,
} as const;

export const defaultClipTitle = 'Found with SemVOD';
export const sampleQueries = ['dog', 'great moment', 'brightest blue', 'when I fell off the map'] as const;

export const defaultPort = 5173;
export const defaultRedirectUri = `http://localhost:${defaultPort}/auth/twitch/callback`;

export const chatScoreWeight = 0.92;

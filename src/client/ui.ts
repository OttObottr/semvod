// Shared browser-facing contracts, requests and media display helpers.
export interface Status {
  demo: boolean;
  openai: boolean;
  model: string;
  redirectUri?: string;
  twitchConfigured: boolean;
  twitch: { login: string; id: string } | null;
  obsConfigured: boolean;
  recording: string | null;
}

export interface ClipResult {
  id?: string;
  url?: string;
  edit_url?: string;
  pending?: boolean;
  fallbackUrl?: string;
  error?: string;
}

export async function api<T>(url: string, data?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: data === undefined ? 'GET' : 'POST',
    headers: data === undefined ? {} : {
      'Content-Type': 'application/json',
      'X-Semvod-Client': '1',
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = String(Math.floor(seconds % 3600 / 60)).padStart(2, '0');
  const remainder = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${hours ? `${hours}:` : ''}${minutes}:${remainder}`;
}

export const frameUrl = (sessionId: string, frameId: number) =>
  `/media/${sessionId}/frame/${frameId}`;

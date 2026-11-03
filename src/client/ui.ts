// Shared browser-facing contracts, requests and media display helpers.
import type { Hit } from '../shared/types';
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

// Invalidating a selection prevents its delayed success, error or cleanup from changing the next one.
export function latestRequest() {
  let revision=0;
  return {
    invalidate(){revision++;},
    async run<T>(work:(current:()=>boolean)=>Promise<T>,commit:(value:T)=>void,fail:(error:unknown)=>void,done=()=>{}){
      const request=++revision;
      const current=()=>request===revision;
      try{const value=await work(current);if(current())commit(value);}
      catch(error){if(current())fail(error);}
      finally{if(current())done();}
    }
  };
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = String(Math.floor(seconds % 3600 / 60)).padStart(2, '0');
  const remainder = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${hours ? `${hours}:` : ''}${minutes}:${remainder}`;
}

export const frameUrl = (sessionId: string, frameId: number) =>
  `/media/${sessionId}/frame/${frameId}`;

export function timelineBins(scores: Hit[], duration: number, count: number) {
  const bins = Array<Hit | undefined>(count).fill(undefined);
  for (const hit of scores) {
    if (!(hit.t >= 0 && hit.t < duration)) continue;
    let index = Math.min(count - 1, Math.floor(hit.t / duration * count));
    // Match the displayed interval edges despite floating-point rounding.
    if (hit.t < index / count * duration) index--;
    else if (hit.t >= (index + 1) / count * duration) index++;
    if (!bins[index] || hit.score > bins[index]!.score) bins[index] = hit;
  }
  return bins;
}

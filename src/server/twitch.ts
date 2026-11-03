import path from 'node:path';
import { defaultClipTitle, inputLimits } from '../shared/settings.js';
import { config } from './config.js';
import { atomicJson, readJson, root } from './store.js';
import type { Session } from '../shared/types.js';
export const SCOPES = ['user:read:chat', 'channel:manage:clips'];
const tokenFile = path.join(root,'.semvod','twitch.json');
interface Token { access_token: string; refresh_token: string; expires_in: number; scope: string[]; obtainedAt: number }
export interface Identity { user_id: string; login: string; client_id: string; scopes: string[] }
export interface Vod { id: string; stream_id: string; created_at: string; duration: string; url: string }
let tokenTail: Promise<unknown> = Promise.resolve();
// Serialize reads and complete writes so an old refresh cannot replace a new login.
function withToken<T>(work: () => Promise<T>): Promise<T> {
  const next = tokenTail.then(work, work);
  tokenTail = next.catch(() => {});
  return next;
}
async function tokenRequest(params: Record<string,string>): Promise<Token> {
  const response = await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',body:new URLSearchParams({...params,client_id:config.twitchClientId,client_secret:config.twitchSecret}),signal:AbortSignal.timeout(20000)});
  const token = await response.json() as Token & {message?: string};
  if (!response.ok) throw new Error(`Twitch authorization failed: ${token.message || response.status}`);
  token.obtainedAt = Date.now(); await atomicJson(tokenFile,token); return token;
}
export async function exchangeCode(code: string) { await withToken(() => tokenRequest({grant_type:'authorization_code',code,redirect_uri:config.redirectUri})); return validateIdentity(); }
async function accessToken() {
  return withToken(async () => {
    const token = await readJson<Token>(tokenFile).catch(() => {throw new Error('Connect Twitch in Settings first.');});
    if (Date.now() < token.obtainedAt + (token.expires_in-120)*1000) return token.access_token;
    return (await tokenRequest({grant_type:'refresh_token',refresh_token:token.refresh_token})).access_token;
  });
}
export async function validateIdentity(): Promise<Identity> {
  const response = await fetch('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${await accessToken()}`},signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('Twitch login expired. Reconnect Twitch in Settings.');
  const identity = await response.json() as Identity;
  if (identity.client_id !== config.twitchClientId) throw new Error('Twitch login belongs to a different app. Reconnect Twitch.');
  return identity;
}
export async function helix<T>(endpoint: string, method='GET', body?: unknown): Promise<T> {
  const response = await fetch(`https://api.twitch.tv/helix/${endpoint}`,{method,headers:{Authorization:`Bearer ${await accessToken()}`,'Client-Id':config.twitchClientId,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const result = await response.json() as T & {message?:string};
  if (!response.ok) throw new Error(`Twitch ${response.status}: ${result.message || 'Request failed'}`);
  return result;
}
export function vodDuration(value: string) {
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  return m ? Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0) : 0;
}
export function matchVod(session: Session, vods: Vod[], t: number) {
  const target = Date.parse(session.startedAt) + t*1000;
  // A matching stream ID is stronger than nearest-date guessing. Never use an unrelated latest VOD.
  return vods.find(v => (!session.streamId || v.stream_id === session.streamId) && target>=Date.parse(v.created_at) && target<=Date.parse(v.created_at)+vodDuration(v.duration)*1000);
}
export function clipWindow(session: Session, vod: Vod, t: number, duration=30) {
  const moment = (Date.parse(session.startedAt)-Date.parse(vod.created_at))/1000+t;
  const available = vodDuration(vod.duration);
  if (moment<0 || moment>available || available<5) throw new Error('Selected moment is outside the available VOD.');
  const length = Math.min(duration,available);
  const end = Math.floor(Math.min(available,Math.max(length,moment+length/2)));
  return {vodOffset:end,duration:length,moment:Math.floor(moment)};
}
export function vodTimestampUrl(vodId: string, seconds: number) {
  const t = Math.max(0,Math.floor(seconds));
  return `https://www.twitch.tv/videos/${encodeURIComponent(vodId)}?t=${Math.floor(t/3600)}h${Math.floor(t%3600/60)}m${t%60}s`;
}
export async function resolveVod(session: Session,t: number) {
  if (session.demo) throw new Error('Sample session has no Twitch VOD. Record your own stream to create clips.');
  if (!session.broadcasterId) throw new Error('This recording has no linked Twitch channel.');
  const {data} = await helix<{data:Vod[]}>(`videos?user_id=${session.broadcasterId}&type=archive&first=100`);
  const vod = matchVod(session,data,t);
  if (!vod) throw new Error('No matching Twitch archive is available yet. Enable Store past broadcasts, then try again after processing.');
  return {vod,window:clipWindow(session,vod,t)};
}
export async function createClip(session: Session,t: number,title: string) {
  const identity = await validateIdentity();
  const {vod,window} = await resolveVod(session,t);
  const fallbackUrl = vodTimestampUrl(vod.id,window.moment);
  try {
    if (identity.user_id!==session.broadcasterId) throw new Error('Connect the broadcaster account that owns this recording.');
    if (!identity.scopes.includes('channel:manage:clips')) throw new Error('Reconnect Twitch to grant channel:manage:clips.');
    const params = new URLSearchParams({editor_id:identity.user_id,broadcaster_id:session.broadcasterId!,vod_id:vod.id,vod_offset:String(window.vodOffset),duration:String(window.duration),title:title.slice(0,inputLimits.clipTitle)||defaultClipTitle});
    const result = await helix<{data:{id:string;edit_url:string}[]}>(`videos/clips?${params}`,'POST');
    const clip = result.data[0]; if (!clip) throw new Error('Twitch did not return a clip.');
    return {...clip,url:`https://clips.twitch.tv/${encodeURIComponent(clip.id)}`,fallbackUrl,pending:true};
  } catch (error) {return {fallbackUrl,error:(error as Error).message};}
}
export async function clipStatus(id: string) {
  const {data} = await helix<{data:{id:string;url:string}[]}>(`clips?id=${encodeURIComponent(id)}`);
  return data[0] || null;
}

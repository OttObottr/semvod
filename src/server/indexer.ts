import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { atomicJson, hash, loadSession, readJson, sessionDir } from './store.js';
import type { ChatMessage, Frame, HypeBucket, Sheet } from '../shared/types.js';
export const SHEET_VERSION = 'sheet-v4-short-session-detail';
export const EMOTES = /^(lul|lulw|kekw|pog|poggers|pogchamp|omegalul|wow|hype|letsgo|pepega)$/i;
export function buildHype(chat: ChatMessage[], duration: number): HypeBucket[] {
  const buckets = Array.from({length: Math.max(1, Math.ceil(duration / 10))}, (_, i) => ({t:i*10,count:0,emotes:0,value:0}));
  for (const m of chat) {
    const b = buckets[Math.min(buckets.length-1, Math.max(0, Math.floor(m.t/10)))]; b.count++;
    b.emotes += (m.emotes?.length ?? 0) + m.text.split(/\s+/).filter(t => EMOTES.test(t.replace(/[!.,]/g,''))).length;
  }
  const max = Math.max(1, ...buckets.map(b => b.count + b.emotes * 1.5));
  return buckets.map(b => ({...b, value:(b.count+b.emotes*1.5)/max}));
}
export async function buildSheets(id: string): Promise<Sheet[]> {
  const session = await loadSession(id); const dir = sessionDir(id); const sheets: Sheet[] = [];
  await fs.mkdir(path.join(dir, 'sheets'), {recursive:true});
  const unique: Frame[] = [];
  const seen = new Map<string, Frame>();
  for (const original of session.frames) {
    const image = await fs.readFile(path.join(dir, original.file));
    const fingerprint = hash(image);
    const previous = seen.get(fingerprint);
    if (previous) previous.duplicates!.push(original.id);
    else {const frame = {...original, hash:fingerprint, duplicates:[]}; seen.set(fingerprint,frame); unique.push(frame);}
  }
  for (let start = 0; start < unique.length; start += 48) {
    const frames = unique.slice(start,start+48);
    // Short recordings can afford more detail; tiny objects disappear in 192px tiles.
    const width=frames.length<=12?384:192,height=width*9/16,columns=Math.min(frames.length,frames.length<=12?4:8);
    const fingerprint = hash(SHEET_VERSION + frames.map(frame=>frame.hash).join(','));
    const file = `sheets/${fingerprint}.jpg`;
    try { await fs.access(path.join(dir,file)); }
    catch {
      const tiles = await Promise.all(frames.map(async (frame,i) => {
        const image=await fs.readFile(path.join(dir,frame.file));
        const label = Buffer.from(`<svg width="${width}" height="${height}"><rect width="31" height="23" fill="#101114"/><text x="7" y="16" fill="white" font-family="sans-serif" font-size="15" font-weight="bold">${i+1}</text></svg>`);
        return {input:await sharp(image).resize(width,height,{fit:'cover'}).composite([{input:label}]).jpeg({quality:78}).toBuffer(),left:(i%columns)*width,top:Math.floor(i/columns)*height};
      }));
      await sharp({create:{width:columns*width,height:Math.ceil(frames.length/columns)*height,channels:3,background:'#151619'}}).composite(tiles).jpeg({quality:80}).toFile(path.join(dir,file));
    }
    sheets.push({file,hash:fingerprint,frames});
  }
  await atomicJson(path.join(dir,'sheets/index.json'),sheets); return sheets;
}
export function chatRelevance(query: string, t: number, chat: ChatMessage[]) {
  const words: string[] = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (!words.length) return {score:0,reason:''};
  let best = 0; let reason = '';
  for (const m of chat) if (Math.abs(m.t-t)<=8) {
    const tokens: string[] = m.text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    const exact = ` ${tokens.join(' ')} `.includes(` ${words.join(' ')} `);
    const score = (exact ? 10 : words.filter(w => tokens.includes(w)).length / words.length * 8)*(1-Math.abs(m.t-t)/80);
    if (score>best) {best=score;reason=m.text;}
  }
  return {score:best,reason};
}

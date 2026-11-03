import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chatConfig, sheetConfig } from './config.js';
import { atomicJson, atomicWrite, hash, loadSession, sessionDir } from './store.js';
import type { ChatMessage, Frame, HypeBucket, Sheet } from '../shared/types.js';
const EMOTES = /^(lul|lulw|kekw|pog|poggers|pogchamp|omegalul|wow|hype|letsgo|pepega)$/i;
export function buildHype(chat: ChatMessage[], duration: number): HypeBucket[] {
  const buckets = Array.from({length: Math.max(1, Math.ceil(duration / chatConfig.bucketSeconds))}, (_, i) => ({t:i*chatConfig.bucketSeconds,count:0,emotes:0,value:0}));
  for (const m of chat) {
    const b = buckets[Math.min(buckets.length-1, Math.max(0, Math.floor(m.t/chatConfig.bucketSeconds)))]; b.count++;
    b.emotes += (m.emotes?.length ?? 0) + m.text.split(/\s+/).filter(t => EMOTES.test(t.replace(/[!.,]/g,''))).length;
  }
  const max = Math.max(1, ...buckets.map(b => b.count + b.emotes * chatConfig.emoteWeight));
  return buckets.map(b => ({...b, value:(b.count+b.emotes*chatConfig.emoteWeight)/max}));
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
  for (let start = 0; start < unique.length; start += sheetConfig.maxFrames) {
    const frames = unique.slice(start,start+sheetConfig.maxFrames);
    // Short recordings can afford more detail; tiny objects disappear in 192px tiles.
    const width=frames.length<=sheetConfig.detailedMaxFrames?sheetConfig.detailedWidth:sheetConfig.compactWidth,height=width*9/16,columns=Math.min(frames.length,frames.length<=sheetConfig.detailedMaxFrames?sheetConfig.detailedColumns:sheetConfig.compactColumns);
    const fingerprint = hash(sheetConfig.version + frames.map(frame=>frame.hash).join(','));
    const file = `sheets/${fingerprint}.jpg`;
    try { await fs.access(path.join(dir,file)); }
    catch {
      const tiles = await Promise.all(frames.map(async (frame,i) => {
        const image=await fs.readFile(path.join(dir,frame.file));
        const label = Buffer.from(`<svg width="${width}" height="${height}"><rect width="31" height="23" fill="#101114"/><text x="7" y="16" fill="white" font-family="sans-serif" font-size="15" font-weight="bold">${i+1}</text></svg>`);
        return {input:await sharp(image).resize(width,height,{fit:'cover'}).composite([{input:label}]).jpeg({quality:sheetConfig.tileQuality}).toBuffer(),left:(i%columns)*width,top:Math.floor(i/columns)*height};
      }));
      const image = await sharp({create:{width:columns*width,height:Math.ceil(frames.length/columns)*height,channels:3,background:'#151619'}}).composite(tiles).jpeg({quality:sheetConfig.sheetQuality}).toBuffer();
      await atomicWrite(path.join(dir,file), image);
    }
    sheets.push({file,hash:fingerprint,frames});
  }
  await atomicJson(path.join(dir,'sheets/index.json'),sheets); return sheets;
}
const tokenize = (text: string): string[] => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export function chatRelevance(query: string, t: number, chat: ChatMessage[]) {
  const words = tokenize(query);
  if (!words.length) return {score:0,reason:''};
  let best = 0; let reason = '';
  for (const m of chat) if (Math.abs(m.t-t)<=chatConfig.relevanceWindowSeconds) {
    const tokens = tokenize(m.text);
    const exact = ` ${tokens.join(' ')} `.includes(` ${words.join(' ')} `);
    const score = (exact ? 10 : words.filter(w => tokens.includes(w)).length / words.length * chatConfig.partialMatchScore)*(1-Math.abs(m.t-t)/chatConfig.decaySeconds);
    if (score>best) {best=score;reason=m.text;}
  }
  return {score:best,reason};
}

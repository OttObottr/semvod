import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { atomicJson, loadChat, loadSession, memoizeAsync, normalizeQuery, sessionDir } from '../src/server/store.js';
import { buildHype, buildSheets, chatRelevance } from '../src/server/indexer.js';
import { distinctHits, search } from '../src/server/search.js';
import { validateCells } from '../src/server/vision.js';
import { clipWindow, matchVod, vodDuration, vodTimestampUrl, type Vod } from '../src/server/twitch.js';
import type { Hit, Session } from '../src/shared/types.js';
const session:Session={id:'test',title:'test',startedAt:'2026-11-01T10:15:00Z',duration:120,status:'complete',frames:[],streamId:'stream-1'};
const vod:Vod={id:'123',stream_id:'stream-1',created_at:'2026-11-01T10:00:00Z',duration:'1h2m3s',url:'https://twitch.tv/videos/123'};
test('equivalent queries normalize to the same cache key',()=>{assert.equal(normalizeQuery('  DOG \n  Friend  '),'dog friend');assert.equal(normalizeQuery('ＤＯＧ'),'dog');});
test('session IDs cannot traverse the filesystem',()=>{for(const id of ['../secret','/etc/passwd','a/b','a%2fb','..'])assert.throws(()=>sessionDir(id));});
test('concurrent work is coalesced and rejection does not poison retry',async()=>{let calls=0;const work=memoizeAsync(async(k:string)=>{calls++;await new Promise(r=>setTimeout(r,5));if(k==='fail')throw new Error('no');return k;});assert.deepEqual(await Promise.all([work('yes'),work('yes')]),['yes','yes']);assert.equal(calls,1);await assert.rejects(work('fail'));await assert.rejects(work('fail'));assert.equal(calls,3);});
test('vision JSON must contain one valid score per real cell',()=>{assert.deepEqual(validateCells([{cell:1,score:8,reason:'dog'}],1),[{cell:1,score:8,reason:'dog'}]);for(const invalid of [[{cell:2,score:9,reason:'x'}],[{cell:1,score:11,reason:'x'}],[{cell:1,score:NaN,reason:'x'}],[{cell:1,score:8}],[{cell:1,score:8,reason:null}],[],[{cell:1,score:1,reason:'x'},{cell:1,score:2,reason:'x'}]])assert.throws(()=>validateCells(invalid,invalid.length||1));});
test('chat phrase relevance is distinct from visual evidence',()=>{assert.equal(chatRelevance('great moment',10,[{t:10,user:'a',text:'that was a great moment'}]).score,10);assert.ok(chatRelevance('dog',10,[{t:10,user:'a',text:'dog'}]).score>chatRelevance('dog',16,[{t:10,user:'a',text:'dog'}]).score);assert.equal(chatRelevance('dog',50,[{t:10,user:'a',text:'dog'}]).score,0);assert.equal(chatRelevance('dog',10,[{t:10,user:'a',text:'dogma'}]).score,0);});
test('hype catches emote bursts and handles an empty session',()=>{const b=buildHype([{t:12,user:'a',text:'LUL KEKW POG'},{t:1,user:'b',text:'hello'}],30);assert.equal(b[1].emotes,3);assert.equal(b[1].value,1);assert.equal(b[0].count,1);assert.equal(buildHype([],0).length,1);});
test('top hits suppress adjacent near-identical moments',()=>{const hits=[0,2,4,20,40].map((t,i)=>({id:i,t,file:'x',score:10-i,visualScore:10-i,chatScore:0,reason:'x'} as Hit));assert.deepEqual(distinctHits(hits).map(h=>h.t),[0,20,40]);});
test('VOD matching requires the correct stream and time interval',()=>{assert.equal(matchVod(session,[{...vod,stream_id:'wrong'},vod],30)?.id,'123');assert.equal(matchVod(session,[{...vod,created_at:'2026-11-02T10:00:00Z'}],30),undefined);assert.equal(vodDuration('1h2m3s'),3723);assert.equal(vodDuration('25s'),25);});
test('clip offset is the end, includes recorder start delta, and clamps at VOD edges',()=>{assert.deepEqual(clipWindow(session,vod,30),{vodOffset:945,duration:30,moment:930});assert.equal(clipWindow({...session,startedAt:vod.created_at},vod,1).vodOffset,30);assert.equal(clipWindow({...session,startedAt:vod.created_at},vod,3720).vodOffset,3723);assert.throws(()=>clipWindow(session,{...vod,duration:'4s'},0));assert.equal(vodTimestampUrl('123',3661),'https://www.twitch.tv/videos/123?t=1h1m1s');});
test('offline sample supports four queries with zero model calls',async()=>{for(const query of ['dog','great moment','brightest blue','when I fell off the map']){const r=await search('demo',query);assert.equal(r.mode,'demo');assert.equal(r.stats.visionCalls,0);assert.ok(r.hits.length>0);}await assert.rejects(search('demo','an arbitrary uncached query'),/offline sample/i);assert.equal((await loadSession('demo')).frames.length,96);assert.ok((await loadChat('demo')).length>0);});
test('contact sheets deduplicate frames and publish complete images under concurrency',async()=>{
 const id=`test-sheets-${Date.now()}`,dir=sessionDir(id);
 await fs.mkdir(path.join(dir,'frames'),{recursive:true});
 const toFile=sharp.prototype.toFile,rename=fs.rename;
 let opened!:()=>void,release!:()=>void,held=false,first:ReturnType<typeof buildSheets>|undefined;
 const writing=new Promise<void>(resolve=>{opened=resolve;}),resume=new Promise<void>(resolve=>{release=resolve;});
 // Pause the first writer before publication; another reader must never see its partial output.
 sharp.prototype.toFile=(async function(this:ReturnType<typeof sharp>,file:string){
  if(!held){held=true;await fs.writeFile(file,'partial JPEG');opened();await resume;}
  return toFile.call(this,file);
 }) as typeof toFile;
 fs.rename=async(from,to)=>{
  if(!held&&String(to).endsWith('.jpg')){held=true;opened();await resume;}
  return rename(from,to);
 };
 try{
  const image=await sharp({create:{width:384,height:216,channels:3,background:'#7799aa'}}).jpeg().toBuffer();
  await fs.writeFile(path.join(dir,'frames/0.jpg'),image);await fs.writeFile(path.join(dir,'frames/1.jpg'),image);
  await atomicJson(path.join(dir,'index.json'),{...session,id,frames:[{id:0,t:0,file:'frames/0.jpg'},{id:1,t:2,file:'frames/1.jpg'}]});
  first=buildSheets(id);await writing;
  const [concurrent]=await buildSheets(id);
  const metadata=await sharp(path.join(dir,concurrent.file)).metadata();
  assert.equal(metadata.width,384);assert.equal(metadata.height,216);
  release();const [sheet]=await first;
  assert.equal(sheet.frames.length,1);assert.deepEqual(sheet.frames[0].duplicates,[1]);assert.equal(concurrent.hash,sheet.hash);
  const before=(await fs.stat(path.join(dir,sheet.file))).mtimeMs;
  const [again]=await buildSheets(id);assert.equal(again.hash,sheet.hash);assert.equal((await fs.stat(path.join(dir,sheet.file))).mtimeMs,before);
 }finally{
  release();
  try{await first;}finally{sharp.prototype.toFile=toFile;fs.rename=rename;await fs.rm(dir,{recursive:true,force:true});}
 }
});

test('atomic JSON creates owner-only files even under a permissive umask',async()=>{const id=`test-private-${Date.now()}`,dir=sessionDir(id),mask=process.umask(0o022);try{await atomicJson(path.join(dir,'private.json'),{canary:'not-a-real-secret'});assert.equal((await fs.stat(path.join(dir,'private.json'))).mode&0o777,0o600);}finally{process.umask(mask);await fs.rm(dir,{recursive:true,force:true});}});

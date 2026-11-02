import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { config } from '../src/server/config.js';
import { atomicJson, sessionDir } from '../src/server/store.js';
import { search, runSearch } from '../src/server/search.js';

test('live search memoizes paid calls, fans out duplicate frames, and invalidates when model changes',async()=>{
 const id=`test-vision-${Date.now()}`;const dir=sessionDir(id);const originalFetch=globalThis.fetch;const originalKey=config.openaiKey;const originalModel=config.model;
 const query=`test object ${Date.now()}`;let visionCalls=0,moderationCalls=0;
 globalThis.fetch=async(input,init)=>{
  const url=String(input),body=JSON.parse(String(init?.body));
  if(url.endsWith('/moderations')){moderationCalls++;return Response.json({results:[{flagged:false}]});}
  if(url.endsWith('/responses')){visionCalls++;assert.equal(body.store,false);const count=Number(/all (\d+) numbered/.exec(body.input[0].content[0].text)?.[1]);assert.equal(body.text.format.schema.properties.scores.items.required.includes('reason'),count===1);const scores=Array.from({length:count},(_,i)=>({cell:i+1,score:count===1?2:8,...(count===1?{reason:'refined: weak evidence'}:{})}));return Response.json({usage:{input_tokens:100,output_tokens:20},output:[{content:[{type:'output_text',text:JSON.stringify({scores})}]}]});}
  throw new Error(`Unexpected network request in test: ${url}`);
 };
 config.openaiKey='test-only-not-a-real-key';
 try{
  await fs.mkdir(path.join(dir,'frames'),{recursive:true});
  for(let i=0;i<3;i++)await sharp({create:{width:384,height:216,channels:3,background:i===1?'#00aa77':'#993300'}}).jpeg().toFile(path.join(dir,`frames/${i}.jpg`));
  await atomicJson(path.join(dir,'index.json'),{id,title:'test',startedAt:new Date().toISOString(),duration:30,status:'complete',frames:[0,1,2].map(i=>({id:i,t:i*10,file:`frames/${i}.jpg`}))});
  const key=JSON.stringify({id,query,liveDemo:false});const [a,b]=await Promise.all([runSearch(key),runSearch(key)]);
  assert.equal(a,b);assert.equal(a.scores.length,3);assert.equal(a.scores[0].visualScore,2);assert.equal(a.scores[2].visualScore,2);assert.ok(a.scores.every(s=>s.visualStage==='refined'));assert.equal(a.hits.length,0);assert.equal(visionCalls,3);assert.equal(moderationCalls,1);assert.equal(a.stats.visionCalls,3);assert.equal(a.stats.inputTokens,300);assert.equal(a.stats.outputTokens,60);
  const cached=await search(id,`  ${query.toUpperCase()}  `);assert.equal(cached.cached,true);assert.equal(cached.stats.visionCalls,0);assert.equal(cached.stats.inputTokens,0);assert.equal(cached.stats.outputTokens,0);assert.equal(visionCalls,3);assert.equal(moderationCalls,1);
  config.model='test-other-model';await search(id,query);assert.equal(visionCalls,6);assert.equal(moderationCalls,1);
 }finally{globalThis.fetch=originalFetch;config.openaiKey=originalKey;config.model=originalModel;await fs.rm(dir,{recursive:true,force:true});}
});
test('a candidate beyond the ten-frame refinement budget remains explicitly provisional',async()=>{
 const id=`test-provisional-${Date.now()}`,dir=sessionDir(id),native=globalThis.fetch,oldKey=config.openaiKey;let calls=0;
 config.openaiKey='test-only';globalThis.fetch=async(input,init)=>{
  if(String(input).endsWith('/moderations'))return Response.json({results:[{flagged:false}]});
  const body=JSON.parse(String(init?.body)),count=Number(/all (\d+) numbered/.exec(body.input[0].content[0].text)![1]);calls++;
  return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({scores:Array.from({length:count},(_,i)=>({cell:i+1,score:count===1?0:9,reason:count===1?'rejected on inspection':'sheet candidate'}))})}]}]});
 };
 try{
  await fs.mkdir(path.join(dir,'frames'),{recursive:true});const frames=Array.from({length:11},(_,i)=>({id:i,t:i*20,file:`frames/${i}.jpg`}));
  await Promise.all(frames.map(f=>sharp({create:{width:32,height:18,channels:3,background:{r:f.id*20,g:100,b:50}}}).jpeg().toFile(path.join(dir,f.file))));
  await atomicJson(path.join(dir,'index.json'),{id,title:'test',startedAt:new Date().toISOString(),duration:220,status:'complete',frames});
  const result=await search(id,`provisional ${Date.now()}`);assert.equal(result.stats.refined,10);assert.equal(calls,11);assert.equal(result.hits.length,1);assert.equal(result.hits[0].id,10);assert.equal(result.hits[0].visualStage,'coarse');assert.ok(result.scores.slice(0,10).every(s=>s.visualStage==='refined'&&s.visualScore===0));
 }finally{globalThis.fetch=native;config.openaiKey=oldKey;await fs.rm(dir,{recursive:true,force:true});}
});
test('moderation rejects a flagged query before sending any frame',async()=>{
 const original=globalThis.fetch;const key=config.openaiKey;config.openaiKey='test-key';let vision=0;
 globalThis.fetch=async(input)=>{if(String(input).endsWith('/moderations'))return Response.json({results:[{flagged:true}]});vision++;throw new Error('No image should be sent');};
 try{await assert.rejects(search('demo',`flagged-test-${Date.now()}`,true),/flagged/);assert.equal(vision,0);}finally{globalThis.fetch=original;config.openaiKey=key;}
});

test('longer sessions process at most three sheets concurrently and count actual token usage',async()=>{
 const id=`test-parallel-${Date.now()}`,dir=sessionDir(id),native=globalThis.fetch,oldKey=config.openaiKey;let active=0,maximum=0,calls=0;
 config.openaiKey='test-only';globalThis.fetch=async(input,init)=>{if(String(input).endsWith('/moderations'))return Response.json({results:[{flagged:false}]});const body=JSON.parse(String(init?.body)),count=Number(/all (\d+) numbered/.exec(body.input[0].content[0].text)![1]);active++;maximum=Math.max(active,maximum);calls++;await new Promise(r=>setTimeout(r,30));active--;return Response.json({usage:{input_tokens:100,output_tokens:20},output:[{content:[{type:'output_text',text:JSON.stringify({scores:Array.from({length:count},(_,i)=>({cell:i+1,score:0,reason:'absent'}))})}]}]});};
 try{await fs.mkdir(path.join(dir,'frames'),{recursive:true});const frames=Array.from({length:145},(_,i)=>({id:i,t:i*2,file:`frames/${i}.jpg`}));await Promise.all(frames.map(async f=>sharp({create:{width:32,height:18,channels:3,background:{r:f.id,g:(f.id*3)%256,b:(f.id*7)%256}}}).jpeg({quality:100}).toFile(path.join(dir,f.file))));await atomicJson(path.join(dir,'index.json'),{id,title:'test',startedAt:new Date().toISOString(),duration:290,status:'complete',frames});const r=await search(id,`parallel ${Date.now()}`);assert.equal(r.stats.sheets,4);assert.equal(maximum,3);assert.equal(calls,4);assert.equal(r.stats.inputTokens,400);assert.equal(r.stats.outputTokens,80);assert.equal(r.hits.length,0);}
 finally{globalThis.fetch=native;config.openaiKey=oldKey;await fs.rm(dir,{recursive:true,force:true});}
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { OBSClient } from '../src/server/obs.js';
import { Recorder } from '../src/server/recorder.js';
import { loadSession, sessionDir } from '../src/server/store.js';
test('OBS authentication, capture and a retried stop preserve a session',async()=>{
 const Native=globalThis.WebSocket;const messages:any[]=[];const image=await sharp({create:{width:384,height:216,channels:3,background:'#88bb77'}}).jpeg().toBuffer();
 class MockSocket extends EventTarget{
  static OPEN=1;readyState=1;
  constructor(){super();queueMicrotask(()=>this.receive({op:0,d:{authentication:{salt:'salt',challenge:'challenge'}}}));}
  receive(value:unknown){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(value)}));}
  send(raw:string){const m=JSON.parse(raw);messages.push(m);if(m.op===1)queueMicrotask(()=>this.receive({op:2,d:{negotiatedRpcVersion:1}}));else if(m.op===6)queueMicrotask(()=>this.receive({op:7,d:{requestId:m.d.requestId,requestStatus:{result:true},responseData:m.d.requestType==='GetCurrentProgramScene'?{currentProgramSceneName:'Main'}:{imageData:`data:image/jpeg;base64,${image.toString('base64')}`}}}));}
  close(){this.readyState=3;this.dispatchEvent(new Event('close'));}
 }
 globalThis.WebSocket=MockSocket as unknown as typeof WebSocket;
 const recorder=new Recorder();let id:string|undefined;
 try{
  const obs=new OBSClient();await obs.connect('ws://127.0.0.1:4455','password');const digest=(v:string)=>createHash('sha256').update(v).digest('base64');assert.equal(messages[0].d.authentication,digest(digest('passwordsalt')+'challenge'));obs.close();
  const session=await recorder.start(false);id=session.id;
  for(let i=0;i<200&&!session.frames.length;i++)await new Promise(r=>setTimeout(r,5));
  assert.equal(session.frames.length,1);
  const rename=fs.rename;let failed=false;
  fs.rename=async(from,to)=>{if(String(to)===path.join(sessionDir(id!),'index.json')&&JSON.parse(await fs.readFile(from,'utf8')).status==='complete'){failed=true;throw new Error('Simulated final index failure');}return rename(from,to);};
  try{await assert.rejects(recorder.stop(),/Simulated final index failure/);assert.equal(failed,true);assert.equal((await loadSession(id)).status,'recording');await assert.rejects(recorder.start(false),/Retry Stop/);assert.equal((await fs.readdir(sessionDir(id))).some(file=>file.endsWith('.tmp')),false);}
  finally{fs.rename=rename;}
  const duration=session.duration;await Promise.all([recorder.stop(),recorder.stop()]);const saved=await loadSession(id);assert.equal(saved.duration,duration);assert.equal(saved.status,'complete');assert.equal(saved.frames.length,1);assert.ok(saved.frames[0].t>=0);assert.ok(saved.duration>=saved.frames[0].t);assert.equal(saved.chatStatus,'off');assert.equal(await fs.readFile(path.join(sessionDir(id),'chat.jsonl'),'utf8'),'');const screenshot=messages.find(m=>m.d?.requestType==='GetSourceScreenshot');assert.equal(screenshot.d.requestData.imageWidth,384);assert.equal(screenshot.d.requestData.sourceName,'Main');
 }finally{await recorder.stop();globalThis.WebSocket=Native;if(id)await fs.rm(sessionDir(id),{recursive:true,force:true});}
});
test('test transports and OBS reject external network connections',async()=>{await assert.rejects(new OBSClient().connect('ws://example.com:4455',''),/loopback/);await assert.rejects(fetch('https://example.com'),/External network disabled/);assert.throws(()=>new WebSocket('wss://example.com'),/External network disabled/);});

test('stopping during OBS authentication waits for startup and leaves no recording running',async()=>{
 const Native=globalThis.WebSocket;let identify!:()=>void;const identifying=new Promise<void>(r=>{identify=r;});
 const image=await sharp({create:{width:384,height:216,channels:3,background:'#884477'}}).jpeg().toBuffer();
 class DelayedSocket extends EventTarget{
  static OPEN=1;readyState=1;
  constructor(){super();queueMicrotask(()=>this.receive({op:0,d:{}}));}
  receive(value:unknown){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(value)}));}
  send(raw:string){const m=JSON.parse(raw);if(m.op===1){identify();setTimeout(()=>this.receive({op:2,d:{}}),20);}else if(m.op===6)queueMicrotask(()=>this.receive({op:7,d:{requestId:m.d.requestId,requestStatus:{result:true},responseData:m.d.requestType==='GetCurrentProgramScene'?{currentProgramSceneName:'Main'}:{imageData:`data:image/jpeg;base64,${image.toString('base64')}`}}}));}
  close(){this.readyState=3;this.dispatchEvent(new Event('close'));}
 }
 globalThis.WebSocket=DelayedSocket as unknown as typeof WebSocket;const recorder=new Recorder();let id:string|undefined;
 try{const starting=recorder.start(false);await identifying;const stopping=recorder.stop();const session=await starting;id=session.id;await stopping;assert.equal((await loadSession(id)).status,'complete');}
 finally{await recorder.stop();globalThis.WebSocket=Native;if(id)await fs.rm(sessionDir(id),{recursive:true,force:true});}
});

test('OBS disconnect is visible and capture resumes after reconnect',async()=>{
 const Native=globalThis.WebSocket;let opened=0,shot!:()=>void;const captured=new Promise<void>(r=>{shot=r;});
 const image=await sharp({create:{width:384,height:216,channels:3,background:'#4455aa'}}).jpeg().toBuffer();
 class DroppingSocket extends EventTarget{
  static OPEN=1;readyState=1;number=++opened;
  constructor(){super();queueMicrotask(()=>this.receive({op:0,d:{}}));}
  receive(value:unknown){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(value)}));}
  send(raw:string){const m=JSON.parse(raw);if(m.op===1)queueMicrotask(()=>this.receive({op:2,d:{}}));else if(m.op===6){if(this.number===1){this.close();return;}queueMicrotask(()=>{this.receive({op:7,d:{requestId:m.d.requestId,requestStatus:{result:true},responseData:m.d.requestType==='GetCurrentProgramScene'?{currentProgramSceneName:'Main'}:{imageData:`data:image/jpeg;base64,${image.toString('base64')}`}}});if(m.d.requestType==='GetSourceScreenshot')shot();});}}
  close(){this.readyState=3;this.dispatchEvent(new Event('close'));}
 }
 globalThis.WebSocket=DroppingSocket as unknown as typeof WebSocket;const recorder=new Recorder();let id:string|undefined;let timeout:ReturnType<typeof setTimeout>|undefined;
 try{const session=await recorder.start(false);id=session.id;await new Promise(r=>setTimeout(r,25));assert.match((await loadSession(id)).captureError!,/disconnected/);await Promise.race([captured,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Capture did not recover')),5000);})]);await recorder.stop();const saved=await loadSession(id);assert.equal(saved.frames.length,1);assert.equal(saved.captureError,undefined);assert.equal(opened,2);}
 finally{clearTimeout(timeout);await recorder.stop();globalThis.WebSocket=Native;if(id)await fs.rm(sessionDir(id),{recursive:true,force:true});}
});

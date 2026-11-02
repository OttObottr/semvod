import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
test('EventSub subscribes with correct identities, deduplicates messages, and migrates without resubscribing',async()=>{
 const cwd=process.cwd(),temp=await fs.mkdtemp(path.join(os.tmpdir(),'semvod-eventsub-'));process.chdir(temp);
 const {Recorder}=await import('../src/server/recorder.js');const {config}=await import('../src/server/config.js');const {loadChat}=await import('../src/server/store.js');
 const nativeFetch=globalThis.fetch,nativeWS=globalThis.WebSocket;const sockets:MockSocket[]=[];const subscriptions:any[]=[];
 let subscribed!:()=>void;const subscriptionReady=new Promise<void>(r=>{subscribed=r;});
 const image=await sharp({create:{width:384,height:216,channels:3,background:'#778855'}}).jpeg().toBuffer();
 class MockSocket extends EventTarget {
  static OPEN=1;readyState=1;url:string;
  constructor(url:string){super();this.url=url;sockets.push(this);queueMicrotask(()=>this.receive(url.startsWith('ws:')?{op:0,d:{}}:{metadata:{message_type:'session_welcome'},payload:{session:{id:'test-session',keepalive_timeout_seconds:30}}}));}
  receive(value:unknown){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(value)}));}
  send(raw:string){const m=JSON.parse(raw);if(m.op===1)queueMicrotask(()=>this.receive({op:2,d:{}}));else if(m.op===6)queueMicrotask(()=>this.receive({op:7,d:{requestId:m.d.requestId,requestStatus:{result:true},responseData:m.d.requestType==='GetCurrentProgramScene'?{currentProgramSceneName:'Main'}:{imageData:`data:image/jpeg;base64,${image.toString('base64')}`}}}));}
  close(){this.readyState=3;this.dispatchEvent(new Event('close'));}
 }
 config.twitchClientId='test-client';config.channel='test-channel';
 await fs.mkdir('.semvod');await fs.writeFile('.semvod/twitch.json',JSON.stringify({access_token:'test-token',expires_in:3600,obtainedAt:Date.now(),scope:['user:read:chat']}));
 globalThis.WebSocket=MockSocket as unknown as typeof WebSocket;
 globalThis.fetch=async(input,init)=>{
  const url=String(input);
  if(url.endsWith('/validate'))return Response.json({user_id:'viewer-1',login:'test-channel',client_id:'test-client',scopes:['user:read:chat']});
  if(url.includes('/users?'))return Response.json({data:[{id:'broadcaster-1'}]});
  if(url.includes('/streams?'))return Response.json({data:[{id:'stream-1'}]});
  if(url.endsWith('/eventsub/subscriptions')){subscriptions.push(JSON.parse(String(init?.body)));subscribed();return Response.json({data:[{id:'subscription-1'}]});}
  throw new Error('Unexpected network in EventSub test');
 };
 const recorder=new Recorder();
 try{
  const first=recorder.start();await assert.rejects(recorder.start(),/already/);const session=await first;await subscriptionReady;
  assert.equal(session.streamId,'stream-1');assert.equal(session.broadcasterId,'broadcaster-1');assert.equal(subscriptions.length,1);assert.deepEqual(subscriptions[0].condition,{broadcaster_user_id:'broadcaster-1',user_id:'viewer-1'});assert.equal(subscriptions[0].type,'channel.chat.message');assert.equal(subscriptions[0].transport.method,'websocket');
  const twitch=sockets.find(s=>s.url.startsWith('wss:'))!;
  const message={metadata:{message_type:'notification',message_id:'same-id',message_timestamp:new Date().toISOString()},payload:{event:{chatter_user_name:'fan',message:{text:'POG dog!',fragments:[{type:'emote',text:'POG'}]}}}};
  twitch.receive(message);twitch.receive(message);await new Promise(r=>setImmediate(r));
  twitch.receive({metadata:{message_type:'session_reconnect'},payload:{session:{reconnect_url:'wss://eventsub.wss.twitch.tv/ws?reconnect=test'}}});await new Promise(r=>setImmediate(r));
  assert.equal(subscriptions.length,1);assert.equal(sockets.filter(s=>s.url.startsWith('wss:')).length,2);
  await recorder.stop();const chat=await loadChat(session.id);assert.equal(chat.length,1);assert.equal(chat[0].text,'POG dog!');assert.deepEqual(chat[0].emotes,['POG']);
  const next=await recorder.start();twitch.receive({...message,metadata:{...message.metadata,message_id:'late-old-session'}});await new Promise(r=>setImmediate(r));await recorder.stop();assert.equal((await loadChat(next.id)).length,0,'late messages from a closed socket must not enter a new recording');
 }finally{await recorder.stop();globalThis.fetch=nativeFetch;globalThis.WebSocket=nativeWS;process.chdir(cwd);await fs.rm(temp,{recursive:true,force:true});}
});

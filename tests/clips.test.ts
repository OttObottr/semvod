import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
test('Twitch clips use the correct VOD and token changes preserve the connected account',async()=>{
 const cwd=process.cwd(),dir=await fs.mkdtemp(path.join(os.tmpdir(),'semvod-clip-'));process.chdir(dir);
 const {config}=await import('../src/server/config.js');const {createClip,clipStatus,exchangeCode,validateIdentity}=await import('../src/server/twitch.js');
 const nativeFetch=globalThis.fetch;const requests:{url:URL;init?:RequestInit}[]=[];let blocked=false;
 config.twitchClientId='test-client';await fs.mkdir('.semvod');await fs.writeFile('.semvod/twitch.json',JSON.stringify({access_token:'test-token',expires_in:3600,obtainedAt:Date.now()}));
 globalThis.fetch=async(input,init)=>{const url=new URL(String(input));requests.push({url,init});
  if(url.pathname.endsWith('/validate'))return Response.json({user_id:'broadcaster-1',login:'test',client_id:'test-client',scopes:['user:read:chat','channel:manage:clips']});
  if(url.pathname==='/helix/videos')return Response.json({data:[{id:'vod-1',stream_id:'stream-1',created_at:'2026-11-01T10:00:00Z',duration:'1h',url:'https://www.twitch.tv/videos/vod-1'}]});
  if(url.pathname==='/helix/videos/clips')return blocked?Response.json({message:'Clips disabled'},{status:403}):Response.json({data:[{id:'test-clip',edit_url:'https://www.twitch.tv/test/clip/test-clip'}]},{status:202});
  if(url.pathname==='/helix/clips')return Response.json({data:[{id:'test-clip',url:'https://clips.twitch.tv/test-clip'}]});
  throw new Error('Unexpected clip-test network request');
 };
 try{
  const session={id:'test',title:'test',startedAt:'2026-11-01T10:15:00Z',duration:120,status:'complete' as const,frames:[],broadcasterId:'broadcaster-1',streamId:'stream-1'};
  const result=await createClip(session,30,'A moment');assert.equal('id' in result&&result.id,'test-clip');assert.equal(result.fallbackUrl,'https://www.twitch.tv/videos/vod-1?t=0h15m30s');
  const request=requests.find(r=>r.url.pathname==='/helix/videos/clips')!;assert.equal(request.init?.method,'POST');assert.equal(request.url.searchParams.get('editor_id'),'broadcaster-1');assert.equal(request.url.searchParams.get('broadcaster_id'),'broadcaster-1');assert.equal(request.url.searchParams.get('vod_id'),'vod-1');assert.equal(request.url.searchParams.get('vod_offset'),'945');assert.equal(request.url.searchParams.get('duration'),'30');assert.equal(request.url.searchParams.get('title'),'A moment');
  assert.equal((await clipStatus('test-clip'))?.id,'test-clip');blocked=true;const fallback=await createClip(session,30,'blocked');assert.match('error' in fallback?fallback.error||'':'',/Clips disabled/);assert.equal(fallback.fallbackUrl,result.fallbackUrl);

  const token=(account:string)=>({access_token:account,refresh_token:`rotated-${account}`,expires_in:3600,obtainedAt:Date.now(),scope:[]});
  const expire=()=>fs.writeFile('.semvod/twitch.json',JSON.stringify({...token('A'),refresh_token:'old-refresh-A',expires_in:0}));
  const identity=(init?:RequestInit)=>Response.json({user_id:(init?.headers as Record<string,string>).Authorization.slice(6),login:'mock',client_id:'test-client',scopes:[]});
  // A reconnect must wait for an existing refresh, including its atomic credential write.
  for(const rejected of [false,true]){
   await expire();let started!:()=>void,release!:()=>void,exchangeStarted=false;
   const refreshing=new Promise<void>(resolve=>{started=resolve;});
   globalThis.fetch=async(input,init)=>{
    if(String(input).endsWith('/validate'))return identity(init);
    assert.equal(String(input),'https://id.twitch.tv/oauth2/token');
    const params=new URLSearchParams(String(init?.body));
    if(params.get('grant_type')==='refresh_token'){
     assert.equal(params.get('refresh_token'),'old-refresh-A');
     started();return new Promise<Response>(resolve=>{release=()=>resolve(Response.json(token('A')));});
    }
    exchangeStarted=true;
    return rejected?Response.json({message:'Rejected mock code'},{status:400}):Response.json(token('B'));
   };
   const old=validateIdentity();await refreshing;
   const connection=exchangeCode('mock-code').then(value=>({value,error:undefined}),error=>({value:undefined,error}));
   try{assert.equal(exchangeStarted,false,'a new grant must not race a refresh write');}
   finally{release();await Promise.all([old,connection]);}
   const outcome=await connection;
   if(rejected)assert.match(outcome.error.message,/Rejected mock code/);else assert.equal(outcome.value?.user_id,'B');
   const saved=JSON.parse(await fs.readFile('.semvod/twitch.json','utf8'));
   assert.equal(saved.access_token,rejected?'A':'B');
   assert.equal(saved.refresh_token,rejected?'rotated-A':'rotated-B');
   assert.equal((await validateIdentity()).user_id,rejected?'A':'B');
  }
  // Waiting callers re-read the rotated token instead of issuing duplicate refreshes.
  await expire();let refreshes=0;
  globalThis.fetch=async(input,init)=>{
   if(String(input).endsWith('/validate'))return identity(init);
   assert.equal(String(input),'https://id.twitch.tv/oauth2/token');
   assert.equal(new URLSearchParams(String(init?.body)).get('grant_type'),'refresh_token');
   assert.equal(new URLSearchParams(String(init?.body)).get('refresh_token'),'old-refresh-A');
   refreshes++;return Response.json(token('A'));
  };
  assert.deepEqual((await Promise.all([validateIdentity(),validateIdentity(),validateIdentity()])).map(i=>i.user_id),['A','A','A']);
  assert.equal(refreshes,1);
 }finally{globalThis.fetch=nativeFetch;process.chdir(cwd);await fs.rm(dir,{recursive:true,force:true});}
});

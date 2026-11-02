import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
test('VOD clip API uses the broadcaster scope and end offset, with a real timestamp fallback on rejection',async()=>{
 const cwd=process.cwd(),dir=await fs.mkdtemp(path.join(os.tmpdir(),'semvod-clip-'));process.chdir(dir);
 const {config}=await import('../src/server/config.js');const {createClip,clipStatus}=await import('../src/server/twitch.js');
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
 }finally{globalThis.fetch=nativeFetch;process.chdir(cwd);await fs.rm(dir,{recursive:true,force:true});}
});

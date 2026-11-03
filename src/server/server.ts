import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import { config } from './config.js';
import { inputLimits, defaultClipTitle } from '../shared/settings.js';
import { loadSession, listSessions, loadChat, sessionDir, root, xml, normalizeQuery } from './store.js';
import { buildHype, buildSheets } from './indexer.js';
import { runSearch } from './search.js';
import { Recorder } from './recorder.js';
import { OBSClient } from './obs.js';
import { createClip, clipStatus, exchangeCode, resolveVod, SCOPES, validateIdentity, vodTimestampUrl } from './twitch.js';
export const recorder=new Recorder();
async function body(req:IncomingMessage){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8192)throw new Error('Request too large');}return raw?JSON.parse(raw):{};}
function json(res:ServerResponse,data:unknown,status=200){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function textInput(value:unknown,max:number=inputLimits.query){if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(`Expected text between 1 and ${max} characters`);return value.trim();}
function seconds(value:unknown,duration:number){const n=Number(value);if(!Number.isFinite(n)||n<0||n>duration)throw new Error('Invalid moment timestamp');return n;}
const oauthStates=new Map<string,number>();
export async function startServer(dev=false,demo=false){
  const vite=dev?await (await import('vite')).createServer({server:{middlewareMode:true,host:'127.0.0.1',allowedHosts:['localhost','127.0.0.1']},appType:'custom'}):null;
  const server=http.createServer((req,res)=>{void handle(req,res).catch(error=>{if(!res.headersSent)json(res,{error:error.message||'Request failed'},400);else res.end();});});
  async function handle(req:IncomingMessage,res:ServerResponse){
    const allowedHosts=[`localhost:${config.port}`,`127.0.0.1:${config.port}`];
    if(!allowedHosts.includes(req.headers.host||''))return json(res,{error:'Invalid localhost host'},403);
    if(req.headers.origin&&!allowedHosts.map(h=>`http://${h}`).includes(req.headers.origin))return json(res,{error:'Cross-origin requests are blocked'},403);
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    const url=new URL(req.url||'/',`http://localhost:${config.port}`);const p=url.pathname;
    if(req.method!=='GET'&&req.method!=='HEAD'&&req.headers['x-semvod-client']!=='1')return json(res,{error:'Missing local client header'},403);
    if(p==='/api/status'){
      const identity=await validateIdentity().catch(()=>null);
      return json(res,{demo,openai:!!config.openaiKey,model:config.model,redirectUri:config.redirectUri,twitchConfigured:!!config.twitchClientId&&!!config.twitchSecret,twitch:identity?{login:identity.login,id:identity.user_id}:null,obsConfigured:!!config.obsPassword,recording:recorder.session?.status==='recording'?recorder.session.id:null});
    }
    if(p==='/api/sessions'&&req.method==='GET')return json(res,(await listSessions()).map(s=>({...s,frames:undefined,frameCount:s.frames.length})));
    if(p==='/api/session'&&req.method==='GET'){
      const id=url.searchParams.get('id')||'demo';const session=await loadSession(id);const chat=await loadChat(id);return json(res,{...session,chat,hype:buildHype(chat,session.duration)});
    }
    if(p==='/api/search'&&req.method==='POST'){
      const b=await body(req);const id=textInput(b.sessionId,inputLimits.sessionId),query=textInput(b.query);return json(res,await runSearch(JSON.stringify({id,query:normalizeQuery(query),liveDemo:b.liveDemo===true})));
    }
    if(p==='/api/obs/test'&&req.method==='POST'){
      const obs=new OBSClient();try{await obs.connect(config.obsUrl,config.obsPassword);const result=await obs.call('GetCurrentProgramScene');return json(res,{ok:true,scene:result.currentProgramSceneName});}finally{obs.close();}
    }
    if(p==='/api/record/start'&&req.method==='POST'){const b=await body(req);return json(res,await recorder.start(b.chat!==false));}
    if(p==='/api/record/stop'&&req.method==='POST'){const session=await recorder.stop();if(session)await buildSheets(session.id);return json(res,session||{error:'No active recording'});}
    if(p==='/api/clip'&&req.method==='POST'){const b=await body(req);const s=await loadSession(textInput(b.sessionId,inputLimits.sessionId));return json(res,await createClip(s,seconds(b.t,s.duration),textInput(b.title||defaultClipTitle,inputLimits.clipTitle)));}
    if(p==='/api/clip/status'&&req.method==='GET')return json(res,await clipStatus(textInput(url.searchParams.get('id'),150)));
    if(p==='/api/vod-link'&&req.method==='POST'){const b=await body(req);const s=await loadSession(textInput(b.sessionId,inputLimits.sessionId));const {vod,window}=await resolveVod(s,seconds(b.t,s.duration));return json(res,{url:vodTimestampUrl(vod.id,window.moment)});}
    if(p==='/auth/twitch'&&req.method==='GET'){
      if(!config.twitchClientId||!config.twitchSecret)throw new Error('Add TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET to .env, then restart.');
      for(const [state,expires] of oauthStates)if(expires<Date.now())oauthStates.delete(state);
      const state=randomBytes(32).toString('hex');oauthStates.set(state,Date.now()+600000);
      const params=new URLSearchParams({client_id:config.twitchClientId,redirect_uri:config.redirectUri,response_type:'code',scope:SCOPES.join(' '),state});
      res.writeHead(302,{Location:`https://id.twitch.tv/oauth2/authorize?${params}`,'Set-Cookie':`semvod_oauth=${state}; HttpOnly; SameSite=Lax; Max-Age=600; Path=/auth`});return res.end();
    }
    if(p==='/auth/twitch/callback'&&req.method==='GET'){
      const state=url.searchParams.get('state')||'';const cookie=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('semvod_oauth='))?.split('=')[1]||'';
      if(!state||state.length!==cookie.length||!timingSafeEqual(Buffer.from(state),Buffer.from(cookie))||(oauthStates.get(state)||0)<Date.now())throw new Error('OAuth state expired or invalid. Start Connect Twitch again.');
      oauthStates.delete(state);if(url.searchParams.has('error'))throw new Error('Twitch connection was cancelled.');
      await exchangeCode(textInput(url.searchParams.get('code'),500));res.writeHead(302,{Location:'/?connected=1','Set-Cookie':'semvod_oauth=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/auth'});return res.end();
    }
    const media=/^\/media\/([\w-]+)\/(frame|cover)\/(\d+)$/.exec(p);
    if(media&&req.method==='GET'){
      const [,id,type,n]=media;const session=await loadSession(id);const frame=session.frames.find(f=>f.id===Number(n));if(!frame)throw new Error('Frame not found');
      const source=path.join(sessionDir(id),frame.file);
      if(type==='frame'){res.writeHead(200,{'Content-Type':'image/jpeg','Cache-Control':'private, max-age=3600'});return res.end(await fs.readFile(source));}
      const title=(url.searchParams.get('title')||'').slice(0,inputLimits.coverTitle);
      let image=sharp(source).resize(1280,720,{fit:'cover'});
      if(title){const chars=Array.from(title);const lines=chars.length<=24?[title]:Array.from({length:Math.ceil(chars.length/32)},(_,i)=>chars.slice(i*32,i*32+32).join(''));const overlay=Buffer.from(`<svg width="1280" height="720"><defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></linearGradient></defs><path d="M0 450h1280v270H0z" fill="url(#bg)"/>${lines.map((line,i)=>`<text x="50" y="${660-(lines.length-1-i)*42}" font-family="sans-serif" font-size="${chars.length<=24?48:36}" font-weight="bold" fill="white">${xml(line)}</text>`).join('')}</svg>`);image=image.composite([{input:overlay}]);}
      res.writeHead(200,{'Content-Type':'image/jpeg','Content-Disposition':`attachment; filename="semvod-${id}-${n}.jpg"`});return res.end(await image.jpeg({quality:90}).toBuffer());
    }
    if(p.startsWith('/api/')||p.startsWith('/media/'))return json(res,{error:'Not found'},404);
    if(vite){return vite.middlewares(req,res,async()=>{try{const html=await vite.transformIndexHtml(req.url||'/',await fs.readFile(path.join(root,'index.html'),'utf8'));res.setHeader('Content-Type','text/html');res.end(html);}catch(error){res.statusCode=500;res.end('Frontend failed to load');console.error(error);}});}
    if(p!=='/'&&!p.startsWith('/assets/'))return json(res,{error:'Not found'},404);
    const publicRoot=path.join(root,'dist/client');const file=p.startsWith('/assets/')?path.resolve(publicRoot,`.${p}`):path.join(publicRoot,'index.html');
    if(!file.startsWith(publicRoot+path.sep))return json(res,{error:'Invalid path'},400);
    const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
    res.setHeader('Cache-Control',p.startsWith('/assets/')?'private, max-age=31536000, immutable':'no-cache');
    const compress=/\.(js|css)$/.test(file);if(compress)res.setHeader('Vary','Accept-Encoding');
    const gzip=compress&&req.headers['accept-encoding']?.split(',').some(value=>value.trim()==='gzip');
    const content=await fs.readFile(gzip?`${file}.gz`:file);if(gzip)res.setHeader('Content-Encoding','gzip');return res.end(content);
  }
  await new Promise<void>(resolve=>server.listen(config.port,process.env.SEMVOD_SANDBOX==='1'?'0.0.0.0':'127.0.0.1',resolve));
  console.log(`SemVOD → http://localhost:${config.port}${demo?' (offline sample)':''}`);
  let closing=false;const close=async()=>{if(closing)return;closing=true;await recorder.stop();await vite?.close();server.close(()=>process.exit(0));};
  process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());return server;
}

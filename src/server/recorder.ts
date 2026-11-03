import { promises as fs } from 'node:fs';
import path from 'node:path';
import { config, captureConfig } from './config.js';
import { OBSClient } from './obs.js';
import { atomicJson, hash, sessionDir } from './store.js';
import { helix, validateIdentity } from './twitch.js';
import type { ChatMessage, Session } from '../shared/types.js';
export class Recorder {
  session?: Session; private obs = new OBSClient(); private timer?: ReturnType<typeof setTimeout>;
  private sockets = new Set<WebSocket>(); private stopped = true; private seen = new Set<string>();
  private writes: Promise<unknown> = Promise.resolve(); private capturePending?: Promise<void>;
  private validationTimer?: ReturnType<typeof setInterval>;
  private starting = false; private stopPending?: Promise<Session | undefined>;
  private startSettled?: Promise<void>;
  private saves:Promise<void>=Promise.resolve();
  async start(chatEnabled = true) {
    if(!this.stopped || this.starting || this.stopPending) throw new Error('A recording is already starting, running, or stopping.');
    this.starting = true;
    let settled!:()=>void;this.startSettled=new Promise(resolve=>{settled=resolve;});
    try {
      await this.obs.connect(config.obsUrl,config.obsPassword);
      const identity = chatEnabled ? await validateIdentity() : undefined;
      if(identity&&!identity.scopes.includes('user:read:chat'))throw new Error('Reconnect Twitch to grant user:read:chat.');
      const channel = config.channel || identity?.login;
      const broadcaster = identity ? (await helix<{data:{id:string}[]}>(`users?login=${encodeURIComponent(channel!)}`)).data[0] : undefined;
      if(identity&&!broadcaster)throw new Error('Twitch channel was not found. Check TWITCH_CHANNEL.');
      const stream = broadcaster ? (await helix<{data:{id:string}[]}>(`streams?user_id=${broadcaster.id}`)).data[0] : undefined;
      const startedAt = new Date().toISOString();
      this.session={id:startedAt.replace(/[:.]/g,'-'),title:channel?`${channel}’s stream`:'OBS recording',startedAt,duration:0,frames:[],status:'recording',channel,broadcasterId:broadcaster?.id,streamId:stream?.id,chatStatus:identity?'connecting':'off'};
      await fs.mkdir(path.join(sessionDir(this.session.id),'frames'),{recursive:true,mode:0o700});
      await fs.writeFile(path.join(sessionDir(this.session.id),'chat.jsonl'),'',{mode:0o600});
      this.seen.clear();
      this.stopped=false; await this.save();
      if(identity){this.connectChat(identity.user_id);this.validationTimer=setInterval(()=>{void validateIdentity().catch(error=>this.chatState(error.message));},3600000);}
      this.tick();return this.session;
    } catch(error){this.stopped=true;this.session=undefined;this.obs.close();throw error;} finally {this.starting=false;settled();}
  }
  private elapsed(){return (Date.now()-Date.parse(this.session!.startedAt))/1000;}
  private save(){const session=this.session;if(!session)return Promise.resolve();return this.saves=this.saves.catch(()=>{}).then(()=>atomicJson(path.join(sessionDir(session.id),'index.json'),session));}
  private chatState(status:string){if(this.session){this.session.chatStatus=status;void this.save().catch(console.error);}}
  private tick(){
    if(this.stopped)return;
    this.capturePending=this.capture().catch(async error=>{this.session!.captureError=error.message;await this.save().catch(console.error);console.error('Capture:',error.message);}).finally(()=>{if(!this.stopped)this.timer=setTimeout(()=>this.tick(),captureConfig.intervalMs);});
  }
  private async capture(){
    if(!this.obs.connected)await this.obs.connect(config.obsUrl,config.obsPassword);
    const {currentProgramSceneName}=await this.obs.call<{currentProgramSceneName:string}>('GetCurrentProgramScene');
    const t=this.elapsed();
    const {imageData}=await this.obs.call<{imageData:string}>('GetSourceScreenshot',{sourceName:currentProgramSceneName,imageFormat:'jpg',imageWidth:captureConfig.width,imageCompressionQuality:captureConfig.jpegQuality});
    const image=Buffer.from(imageData.split(',')[1],'base64');const id=this.session!.frames.length;
    const file=`frames/${String(id).padStart(6,'0')}.jpg`;await fs.writeFile(path.join(sessionDir(this.session!.id),file),image,{mode:0o600});
    this.session!.captureError=undefined;this.session!.frames.push({id,t:Number(t.toFixed(3)),file,hash:hash(image)});this.session!.duration=this.elapsed();await this.save();
  }
  private connectChat(userId:string,url='wss://eventsub.wss.twitch.tv/ws',migrating=false){
    const session=this.session;if(this.stopped||!session)return;const active=()=>!this.stopped&&this.session===session;
    // Reconnect URLs are supplied by Twitch; never forward credentials to other origins.
    const target=new URL(url);if(target.protocol!=='wss:'||target.hostname!=='eventsub.wss.twitch.tv'){this.chatState('Invalid Twitch reconnect URL');return;}
    const ws=new WebSocket(url);this.sockets.add(ws);let watchdog:ReturnType<typeof setTimeout>;let transferred=false;
    const arm=(seconds=30)=>{clearTimeout(watchdog);watchdog=setTimeout(()=>ws.close(),(seconds+5)*1000);};arm();
    ws.addEventListener('message',event=>{void(async()=>{
      if(!active())return;
      const message=JSON.parse(String(event.data));const {metadata,payload}=message;arm(payload.session?.keepalive_timeout_seconds||30);
      if(metadata.message_type==='session_welcome'){
        if(!migrating)await helix('eventsub/subscriptions','POST',{type:'channel.chat.message',version:'1',condition:{broadcaster_user_id:session.broadcasterId,user_id:userId},transport:{method:'websocket',session_id:payload.session.id}});
        if(!active())return;
        this.chatState('connected');
        if(migrating)for(const other of this.sockets)if(other!==ws)other.close();
      }else if(metadata.message_type==='session_reconnect'){
        transferred=true;this.connectChat(userId,payload.session.reconnect_url,true);
      }else if(metadata.message_type==='revocation'){this.chatState(`revoked: ${payload.subscription.status}`);}
      else if(metadata.message_type==='notification'&&!this.seen.has(metadata.message_id)){
        this.seen.add(metadata.message_id);if(this.seen.size>10000)this.seen.delete(this.seen.values().next().value!);
        const e=payload.event;const t=(Date.parse(metadata.message_timestamp)-Date.parse(session.startedAt))/1000;
        const chat:ChatMessage={t:Math.max(0,t),user:e.chatter_user_name,text:e.message.text,emotes:e.message.fragments.filter((f:{type:string})=>f.type==='emote').map((f:{text:string})=>f.text)};
        this.writes=this.writes.then(()=>fs.appendFile(path.join(sessionDir(session.id),'chat.jsonl'),JSON.stringify(chat)+'\n')).catch(console.error);
      }
    })().catch(error=>{if(active())this.chatState(error.message);});});
    ws.addEventListener('close',()=>{clearTimeout(watchdog);this.sockets.delete(ws);if(active()&&!transferred&&this.sockets.size===0){this.chatState('reconnecting');setTimeout(()=>{if(active())this.connectChat(userId);},3000);}});
    ws.addEventListener('error',()=>{if(active())this.chatState('connection error');});
  }
  stop(): Promise<Session | undefined> {
    return this.stopPending ??= this.finishStop().finally(()=>{this.stopPending=undefined;});
  }
  private async finishStop(){
    await this.startSettled;
    if(this.stopped)return this.session;
    this.stopped=true;clearTimeout(this.timer);clearInterval(this.validationTimer);
    for(const ws of this.sockets)ws.close();await this.capturePending;await this.writes;this.obs.close();
    this.session!.duration=this.elapsed();this.session!.status='complete';await this.save();return this.session;
  }
}

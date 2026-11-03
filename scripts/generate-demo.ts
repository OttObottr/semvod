import { sampleQueries } from '../src/shared/settings.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { atomicJson, hash } from '../src/server/store.js';
import { chatRelevance } from '../src/server/indexer.js';
import { distinctHits } from '../src/server/search.js';
import type { ChatMessage, Frame, Hit, SearchResult, Session } from '../src/shared/types.js';
const dir=path.resolve('sample');await fs.mkdir(path.join(dir,'frames'),{recursive:true});
// Original procedural game artwork. No downloaded stock assets or third-party game footage.
export function scene(i:number){
  const t=i*2;const dog=t>=38&&t<=76||t>=140&&t<=158;const blue=t>=82&&t<=122;const fall=t>=126&&t<=140;
  const x=460+Math.sin(i/7)*80;const y=fall?480+(t-126)*12:423;
  const trees=Array.from({length:13},(_,n)=>{const a=(n*193+82)%1320;const b=275+(n%3)*57;return `<g transform="translate(${a} ${b})"><path d="M0 0v110" stroke="#503f44" stroke-width="13"/><path d="M-49 45L0-77 49 45Z" fill="${blue?'#368c9c':'#32645c'}"/><path d="M-38 0L0-92 38 0Z" fill="${blue?'#5ba8ac':'#497d67'}"/></g>`;}).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs>
  <linearGradient id="sky" x2="0" y2="1"><stop stop-color="${blue?'#1c4778':'#92c4c4'}"/><stop offset="1" stop-color="${blue?'#80ceee':'#e5dcc4'}"/></linearGradient>
  <linearGradient id="grass" x2="0" y2="1"><stop stop-color="${blue?'#327d8a':'#81a278'}"/><stop offset="1" stop-color="${blue?'#143c55':'#416c59'}"/></linearGradient>
  <radialGradient id="glow"><stop stop-color="#aefaff" stop-opacity=".9"/><stop offset="1" stop-color="#61afff" stop-opacity="0"/></radialGradient>
  <linearGradient id="shade" x2="0" y2="1"><stop stop-color="#091920" stop-opacity="0"/><stop offset="1" stop-color="#091920" stop-opacity=".7"/></linearGradient>
  </defs><path fill="url(#sky)" d="M0 0h1280v720H0z"/><circle cx="970" cy="120" r="55" fill="#ffedc8" opacity=".65"/>
  <path d="M0 370L175 138l160 191 200-250 245 267 184-197 316 240v210H0" fill="${blue?'#376a89':'#7a9d96'}"/><path d="M325 329L535 79l117 131-115-48-66 79-35-14Z" fill="#d7ded0" opacity=".5"/>
  <path d="M0 440L175 288l173 156 197-174 205 156 261-155 269 176v273H0" fill="${blue?'#235471':'#5e8677'}"/>${trees}
  <path d="M0 478Q275 360 520 452T1280 412v308H0" fill="url(#grass)"/>
  <path d="M789 422Q650 499 806 720h226Q771 504 858 426" fill="${blue?'#58a9b8':'#c4b79b'}"/>
  ${fall?'<path d="M270 470l352-8 109 258H131z" fill="#153246"/><path d="M270 470l352-8 9 25-376 15z" fill="#abc18b"/>':''}
  ${blue?'<circle cx="706" cy="310" r="190" fill="url(#glow)"/><path d="M656 378V201h100v177" fill="#317eac" stroke="#7ee8ff" stroke-width="7"/><path d="M674 364V222h64v142" fill="#93eafa"/><path d="M622 378h169v22H622z" fill="#61bdd0"/>':''}
  <g transform="translate(${x} ${y})"><ellipse cy="51" rx="28" ry="9" fill="#193e38" opacity=".4"/><path d="M-13 7l-11 36h14L0 25l8 20h14L12 7" fill="#3b4152"/><path d="M-22-23h42l10 35h-61z" fill="#d88663"/><circle cy="-42" r="18" fill="#e7b68d"/><path d="M-19-45q0-30 34-11l5 20-13-8-26 9" fill="#503d3f"/><path d="M-20-18L-39 6m58-24L34 6" stroke="#e7b68d" stroke-width="12" stroke-linecap="round"/><path d="M-18-20h36v28h-36z" fill="#de956b"/><path d="M-7-18h14v34H-7z" fill="#e6c49b"/></g>
  ${dog?`<g transform="translate(${x+133} 448)"><ellipse cy="29" rx="42" ry="9" fill="#173f38" opacity=".3"/><path d="M-28 0h55v24h-11V12h-27v12h-12z" fill="#dbad71"/><ellipse rx="33" ry="18" fill="#e5c394"/><circle cx="30" cy="-16" r="22" fill="#ead1a9"/><path d="M13-33Q1-8 18-8M43-33Q57-8 41-8" fill="#8f6245"/><circle cx="25" cy="-19" r="3" fill="#322d32"/><circle cx="39" cy="-19" r="3" fill="#322d32"/><path d="M28-10h8l-4 5z" fill="#322d32"/><path d="M-30-4q-31-40-25-8" fill="none" stroke="#e5c394" stroke-width="12" stroke-linecap="round"/><path d="M18 3h24" stroke="#cf6e55" stroke-width="5"/></g>`:''}
  ${Array.from({length:38},(_,n)=>`<circle cx="${(n*137+23)%1280}" cy="${490+(n*43)%220}" r="${n%3+1}" fill="${n%2?'#d5d79b':'#cfb1a4'}" opacity=".65"/>`).join('')}
  <path fill="url(#shade)" d="M0 480h1280v240H0z"/>
  <g font-family="sans-serif" fill="#fff"><rect x="29" y="26" width="168" height="34" rx="17" fill="#18372f" opacity=".65"/><circle cx="48" cy="43" r="5" fill="#c9e99b"/><text x="62" y="48" font-size="13" letter-spacing="2">WANDER VALLEY</text><text x="36" y="664" font-size="22" font-weight="bold">${blue?'The Azure Gate':fall?'A slight miscalculation.':dog?'An unexpected companion':'The long way home'}</text><text x="36" y="690" font-size="13" opacity=".7">Original SemVOD sample · illustrated gameplay</text><text x="1236" y="48" text-anchor="end" font-size="13" opacity=".75">DAY 04 · ${blue?'AZURE RUINS':'PINE RIDGE'}</text></g>
  <g transform="translate(1040 516)"><rect width="208" height="172" rx="12" fill="#202b34" stroke="#cfb59a" stroke-width="3"/><rect x="6" y="6" width="196" height="158" rx="8" fill="#3f4354"/><circle cx="104" cy="80" r="46" fill="#d9aa90"/><path d="M57 76q-7-76 73-55 40 12 27 60l-24-22-35 0-36 19" fill="#34303e"/><path d="M67 119q36 20 74-2l29 47H38z" fill="#b48777"/><path d="M70 52q-31 20-9 65m86-65q28 23 8 65" fill="none" stroke="#181e27" stroke-width="14"/><circle cx="86" cy="82" r="4" fill="#40313b"/><circle cx="124" cy="82" r="4" fill="#40313b"/><path d="M92 105q13 ${dog||fall?22:6} 25-2" fill="none" stroke="#7d4843" stroke-width="4" stroke-linecap="round"/><rect x="145" y="114" width="15" height="50" rx="7" fill="#222630"/></g></svg>`;
}
const frames:Frame[]=[];
for(let i=0;i<96;i++){const file=`frames/${String(i).padStart(6,'0')}.jpg`;const image=await sharp(Buffer.from(scene(i))).resize(640,360).jpeg({quality:82}).toBuffer();await fs.writeFile(path.join(dir,file),image);frames.push({id:i,t:i*2,file,hash:hash(image)});}
const session:Session={id:'demo',title:'A little lost in Wander Valley',startedAt:'2026-11-01T22:00:00.000Z',duration:192,frames,status:'complete',demo:true,channel:'semvod_sample',chatStatus:'sample'};
const chat:ChatMessage[]=[];
for(let t=1;t<192;t+=4){chat.push({t,user:['mossyboots','lunara','pixelpals','cozycat'][Math.floor(t/4)%4],text:['the music is so good','this is beautiful','which way are we going?','cozy stream'][Math.floor(t/4)%4]});}
for(const [t,text] of [[43,'DOG!!'],[45,'pet the dog'],[48,'we have a new friend'],[51,'the dog is following you 😭'],[58,'good boy'],[90,'brightest blue I have ever seen'],[95,'that gate is GLOWING'],[130,'great moment'],[132,'LUL LUL LUL'],[133,'KEKW'],[134,'when you fell off the map LUL'],[135,'NOOOO'],[136,'POG KEKW'],[143,'the dog waited for us'],[146,'DOG is back']] as [number,string][]){for(let n=0;n<(t>=130&&t<=136?5:2);n++)chat.push({t:t+n*.2,user:['fernfriend','pixelpals','lunara','mossyboots','cozycat'][n],text});}
chat.sort((a,b)=>a.t-b.t);await atomicJson(path.join(dir,'index.json'),session);await fs.writeFile(path.join(dir,'chat.jsonl'),chat.map(m=>JSON.stringify(m)).join('\n')+'\n');
const fixtures:Record<string,SearchResult>={};
for(const query of sampleQueries){
 const scores:Hit[]=frames.map(f=>{let v=0;if(query==='dog')v=(f.t>=38&&f.t<=76||f.t>=140&&f.t<=158)?8+(Math.sin(f.id)*.5+.5)*1.7:.2;
 if(query==='brightest blue')v=f.t>=82&&f.t<=122?8+Math.sin(f.id)*.8:.4;
 if(query==='when I fell off the map')v=f.t>=126&&f.t<=140?7+Math.sin(f.id)*1.5:0;
 const c=chatRelevance(query,f.t,chat);return {...f,visualScore:v,chatScore:c.score,score:Math.max(v,c.score*.92),reason:query==='great moment'?'Chat: “great moment”':query==='dog'?'A golden dog beside the player':query==='brightest blue'?'A luminous cyan gate in the ruins':'The character falls into a gap in the path'};});
 fixtures[query.toLowerCase()]={query,hits:distinctHits(scores),scores,cached:true,mode:'demo',stats:{sheets:2,visionCalls:0,cacheHits:1,refined:0,elapsedMs:0}};
}
await atomicJson(path.join(dir,'searches.json'),fixtures);console.log('Generated 96 original sample frames, chat, and offline search fixtures.');

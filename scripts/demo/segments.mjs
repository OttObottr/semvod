// Optional video editing of approved page screenshots and the app-created Twitch clip.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
if(process.platform!=='linux'||process.env.SEMVOD_SANDBOX!=='1')throw Error('Run in the disposable Linux sandbox.');
const root=path.resolve(process.argv[2]||'/tmp/demo');process.chdir(root);
const font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const label=text=>`drawbox=x=0:y=0:w=iw:h=58:color=0x111514@0.94:t=fill,drawtext=fontfile=${font}:text='${text}':x=34:y=17:fontsize=23:fontcolor=0xc8e99b`;
function make(name,input,filter,seconds,still=true){
 const args=['-hide_banner','-loglevel','error','-y','-filter_threads','1',...(still?['-loop','1']:[]),'-i',input,'-vf',filter,'-t',String(seconds),'-r','30','-an','-c:v','libx264','-threads','2','-preset','fast','-crf','21','-pix_fmt','yuv420p',`${name}.mp4`];
 const r=spawnSync('ffmpeg',args,{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr.slice(-1500));
}
function join(name,parts){fs.writeFileSync(`${name}-list.txt`,parts.map(p=>`file '${p}.mp4'`).join('\n'));const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',`${name}-list.txt`,'-c','copy',`${name}.mp4`],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr.slice(-1500));}
const pan=(page,seconds)=>`scale=1920:-2,crop=1920:1080:0:'200+min(t/${seconds},1)*850',${label(page)}`;
make('twitch-page','twitch-page.png',`crop=2128:1198:0:0,scale=1920:1080,${label('ACTUAL TWITCH PAGE  /  App-created clip on ottobottr')}`,5.2);
make('twitch-playback','twitch-test-clip.mp4',`scale=1920:1080,${label('REAL TWITCH TEST  /  ottobottr  /  Original illustrated artwork')}`,11,false);
join('twitch',['twitch-page','twitch-playback']);
if(process.argv.includes('--twitch-only'))process.exit(0);
make('dog-pan','dog-page.png',pan('REAL AI SEARCH  /  dog  /  Memoized replay',9.8),10.2);
make('blue-pan','blue-page.png',pan('REAL AI SEARCH  /  brightest blue  /  Memoized replay',9.8),10.2);
join('search',['dog-pan','blue-pan']);
make('chat','chat-page.png',`scale=1920:-2,crop=1920:1080:0:862,${label('REAL EVENTSUB MESSAGE  /  Separate offline OBS capture')}`,14.3);
make('cover-controls','cover-page.png',`scale=1920:-2,crop=1920:1080:0:850,${label('ACTUAL APP EXPORT  /  Optional title  /  1280 x 720 cover')}`,6.4);
make('cover-result','titled-cover.jpg',`scale=1920:1080,${label('DOWNLOADED COVER  /  Original OBS capture with title')}`,4.4);
make('clip-result','twitch-test-clip.mp4',`scale=1920:1080,${label('CONFIRMED TWITCH CLIP  /  App-created from archive 2917774778')}`,9.2,false);
join('share',['cover-controls','cover-result','clip-result']);
for(const id of ['intro','cache','codex','next'])fs.copyFileSync(`cards/${id}.png`,`${id}.png`);
console.log('Prepared page-only demo segments. No host screen, private tabs, webcam, or microphone captured.');

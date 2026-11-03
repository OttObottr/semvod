// Assemble approved page-only captures and narration inside the disposable Linux sandbox.
// Input: intro/cache/codex/next.png, twitch/search/chat/share.mp4, audio/<segment>.aiff.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
if(process.platform!=='linux'||process.env.SEMVOD_SANDBOX!=='1')throw Error('Run in the disposable Linux sandbox.');
const root=path.resolve(process.argv[2]||'/tmp/demo');
const ids=['intro','twitch','search','chat','share','cache','codex','next'];
const cards=new Set(['intro','cache','codex','next']);
function run(command,args){const r=spawnSync(command,args,{encoding:'utf8'});if(r.status!==0)throw Error(`${command}: ${(r.stderr||'failed').slice(-2000)}`);return r.stdout.trim();}
let total=0;const parts=[];
for(const id of ids){
 const audio=path.join(root,'audio',`${id}.aiff`);
 const input=path.join(root,`${id}.${cards.has(id)?'png':'mp4'}`);
 if(!fs.existsSync(audio)||!fs.existsSync(input))throw Error(`Missing approved assets for ${id}`);
 const seconds=Number(run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',audio]))+.5;
 total+=seconds;if(total>179)throw Error('Demo exceeds the three-minute limit. Shorten narration.');
 const output=path.join(root,`${id}-segment.mp4`);parts.push(output);
 run('ffmpeg',['-hide_banner','-loglevel','error','-y','-filter_threads','1',...(cards.has(id)?['-loop','1']:['-stream_loop','-1']),'-i',input,'-i',audio,'-vf','scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1','-af','apad','-t',String(seconds),'-r','30','-c:v','libx264','-threads','2','-preset','fast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k',output]);
}
fs.writeFileSync(path.join(root,'segments.txt'),parts.map(p=>`file '${p.replaceAll("'","'\\''")}'`).join('\n'));
const output=path.join(root,'semvod-demo.mp4');
run('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',path.join(root,'segments.txt'),'-c','copy','-movflags','+faststart',output]);
console.log(JSON.stringify({output,seconds:total,screenCapture:'isolated approved app assets only'}));

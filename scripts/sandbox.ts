// Test harness only. Runs inside a disposable Linux container, never on the macOS desktop.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { OBSClient } from '../src/server/obs.js';
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
if(process.env.SEMVOD_SANDBOX!=='1'||process.platform!=='linux')throw new Error('This harness requires the isolated Linux test container.');
const online=process.env.SEMVOD_TEST_MODE==='online';
if(online){while(!(await fs.stat('/app/runtime/private.env').catch(()=>null)))await wait(250);process.loadEnvFile('/app/runtime/private.env');}
const password=randomBytes(24).toString('hex');
Object.assign(process.env,{OBS_PASSWORD:password,OBS_URL:'ws://127.0.0.1:4455',PORT:'5180',DISPLAY:':99',LIBGL_ALWAYS_SOFTWARE:'1',QT_X11_NO_MITSHM:'1'});
const obsRoot='/home/node/.config/obs-studio';
await fs.mkdir(path.join(obsRoot,'plugin_config/obs-websocket'),{recursive:true});
await fs.mkdir(path.join(obsRoot,'basic/profiles/SemVOD'),{recursive:true});
await fs.writeFile(path.join(obsRoot,'plugin_config/obs-websocket/config.json'),JSON.stringify({server_enabled:true,server_port:4455,auth_required:true,server_password:password,alerts_enabled:false}));
await fs.writeFile(path.join(obsRoot,'global.ini'),`[General]\nFirstRun=true\n[Basic]\nProfile=SemVOD\nProfileDir=SemVOD\nSceneCollection=SemVOD\nSceneCollectionFile=SemVOD\n[OBSWebSocket]\nFirstLoad=false\nServerEnabled=true\nServerPort=4455\nAlertsEnabled=false\nAuthRequired=true\nServerPassword=${password}\n`);
await fs.writeFile(path.join(obsRoot,'basic/profiles/SemVOD/basic.ini'),'[General]\nName=SemVOD\n[Video]\nBaseCX=1280\nBaseCY=720\nOutputCX=1280\nOutputCY=720\nFPSType=0\nFPSCommon=30\n[Output]\nMode=Simple\n[SimpleOutput]\nStreamEncoder=x264\nVBitrate=1800\nABitrate=128\nPreset=veryfast\n[Audio]\nSampleRate=48000\nChannelSetup=Stereo\n');
const logs=await fs.open('/tmp/obs.log','w');
const xvfb=spawn('Xvfb',[':99','-screen','0','1280x720x24','-nolisten','tcp'],{stdio:'ignore'});
await wait(1000);
const obs=spawn('obs',['--profile','SemVOD','--collection','SemVOD','--disable-missing-files-check','--disable-shutdown-check'],{stdio:['ignore',logs.fd,logs.fd],env:process.env});
process.on('SIGTERM',()=>{obs.kill('SIGTERM');xvfb.kill('SIGTERM');});
let client:OBSClient|undefined;
for(let i=0;i<20;i++){
 const attempt=new OBSClient();try{await attempt.connect(process.env.OBS_URL!,password);client=attempt;break;}catch{attempt.close();await wait(1000);}
}
if(!client){console.error((await fs.readFile('/tmp/obs.log','utf8')).slice(-6000));throw new Error('OBS did not start in the sandbox.');}
const version=await client.call('GetVersion');
const scenes=await client.call('GetSceneList');
if(!scenes.scenes.some((s:{sceneName:string})=>s.sceneName==='SemVOD Test'))await client.call('CreateScene',{sceneName:'SemVOD Test'});
await client.call('CreateInput',{sceneName:'SemVOD Test',inputName:'Original sample artwork',inputKind:'image_source',inputSettings:{file:'/app/sample/frames/000024.jpg'},sceneItemEnabled:true});
const items=await client.call('GetSceneItemList',{sceneName:'SemVOD Test'});
await client.call('SetSceneItemTransform',{sceneName:'SemVOD Test',sceneItemId:items.sceneItems[0].sceneItemId,sceneItemTransform:{boundsType:'OBS_BOUNDS_STRETCH',boundsWidth:1280,boundsHeight:720}});
await client.call('SetCurrentProgramScene',{sceneName:'SemVOD Test'});
console.log(JSON.stringify({obsReady:true,version:version.obsVersion,websocket:version.obsWebSocketVersion,online}));
if(online){
 const {startServer}=await import('../src/server/server.js');await startServer(false);
 // Cycle original artwork so the stream and sampled frames have distinct, known visual moments.
 let i=0;const sequence=[24,30,44,52,64,68,72,84];
 setInterval(()=>{void client!.call('SetInputSettings',{inputName:'Original sample artwork',inputSettings:{file:`/app/sample/frames/${String(sequence[i++%sequence.length]).padStart(6,'0')}.jpg`}}).catch(console.error);},10000);
}else{
 const {Recorder}=await import('../src/server/recorder.js');const {buildSheets}=await import('../src/server/indexer.js');
 const recorder=new Recorder();const session=await recorder.start(false);await wait(2500);
 await client.call('SetInputSettings',{inputName:'Original sample artwork',inputSettings:{file:'/app/sample/frames/000048.jpg'}});await wait(2500);
 await recorder.stop();const sheets=await buildSheets(session.id);
 const stats=await sharp(path.join('/app/sessions',session.id,session.frames[0].file)).stats();
 if(session.frames.length<2||stats.isOpaque===false||Math.max(...stats.channels.map(c=>c.stdev))<10)throw new Error('Captured frames are missing or blank.');
 const report={passed:true,sessionId:session.id,frames:session.frames.length,sheets:sheets.length,obsVersion:version.obsVersion,websocketVersion:version.obsWebSocketVersion,network:'none',nonRoot:process.getuid?.()!==0};
 await fs.writeFile('/app/sessions/sandbox-report.json',JSON.stringify(report,null,2));console.log('OFFLINE_CAPTURE_PASSED '+JSON.stringify(report));
 setInterval(()=>{},60000);
}

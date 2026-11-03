// Frozen four-case expansion. Default replay is free; --live requires prepared inputs and a $0.10 phase cap.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {hash,read,write,evaluationBudget} from './eval-budget.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir=path.join(root,'docs/verification/qvh-next'),scratch=path.join(root,'.semvod/qvh-next');
const acquisition=read(path.join(dir,'acquisition.json')),queriesFile=path.join(scratch,'queries.jsonl'),manifestFile=path.join(dir,'inputs.json'),predictionsFile=path.join(dir,'predictions.json');
const lines=file=>fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const sources=['scripts/qvh-expansion.mjs','scripts/eval-budget.mjs','src/server/search.ts','src/server/vision.ts','src/server/indexer.ts','src/server/config.ts','src/server/store.ts','src/shared/settings.ts'];
const sourceHashes=()=>Object.fromEntries(sources.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]));
// Same frozen point-to-interval adapter as qvh-v1; no gold-dependent proposal widths.
function windows(hits,scores,duration){
 const ordered=[...scores].sort((a,b)=>a.t-b.t),result=[];
 for(const hit of hits){let l=ordered.findIndex(f=>f.id===hit.id),r=l;if(l<0||ordered[l].score<3)continue;
  while(l>0&&ordered[l-1].score>=3&&Math.abs(ordered[l].t-ordered[l-1].t-2)<1e-6)l--;
  while(r+1<ordered.length&&ordered[r+1].score>=3&&Math.abs(ordered[r+1].t-ordered[r].t-2)<1e-6)r++;
  const start=Math.max(0,ordered[l].t-1),end=Math.min(duration,ordered[r].t+1);if(!result.some(w=>w[0]===start&&w[1]===end))result.push([start,end,hit.score]);
 }return result;
}
if(process.argv.includes('--prepare')){
 if(fs.existsSync(predictionsFile))throw Error('Predictions exist; preparation is frozen');
 if(hash(fs.readFileSync(queriesFile))!==acquisition.queriesSha256)throw Error('Query inputs changed');
 const queries=lines(queriesFile),videos=[];
 for(const [i,v] of acquisition.completeVideos.entries()){
  const source=path.join(scratch,v.id+'.mp4'),session=`qvhn-${i}`,folder=path.join(scratch,'sessions',session);
  if(hash(fs.readFileSync(source))!==v.sha256)throw Error('Source video changed');
  if(!fs.existsSync(path.join(folder,'index.json')))execFileSync(path.join(root,'.semvod/real-footage/extract'),[source,folder,'0','150'],{stdio:'pipe'});
  const index=read(path.join(folder,'index.json')),duration=queries.find(q=>q.vid===v.id).duration;
  if(Math.abs(index.duration-duration)>1||index.frames.length!==Math.ceil(index.duration/2))throw Error('Full-clip duration/frame count mismatch');
  videos.push({vid:v.id,session,duration,nativeDuration:index.duration,indexSha256:hash(fs.readFileSync(path.join(folder,'index.json'))),frames:index.frames.map(f=>({...f,sha256:hash(fs.readFileSync(path.join(folder,f.file)))}))});
 }
 write(manifestFile,{queryIds:queries.map(q=>q.qid),acquisitionHash:hash(fs.readFileSync(path.join(dir,'acquisition.json'))),sources:sourceHashes(),queriesHash:acquisition.queriesSha256,goldHash:acquisition.goldSha256,videos,model:'gpt-4.1-mini',phaseCapUsd:.10,requestReserveUsd:.02,ratesUsdPerMillion:{input:.4,output:1.6},priceSource:'https://developers.openai.com/api/docs/models/gpt-4.1-mini',method:'Current production search and moderation; same qvh-v1 interval adapter; no chat. Freeze predictions before grade. No inference retries or model fallback.'});
 console.log('Prepared four full clips and frozen inference contract; no inference.');
}else if(process.argv.includes('--live')){
 if(fs.existsSync(predictionsFile))throw Error('No automatic reruns; predictions already exist');
 const manifest=read(manifestFile);
 if(manifest.acquisitionHash!==hash(fs.readFileSync(path.join(dir,'acquisition.json')))||acquisition.protocolSha256!==hash(fs.readFileSync(path.join(dir,'protocol.json'))))throw Error('Frozen acquisition/protocol changed');
 if(JSON.stringify(manifest.sources)!==JSON.stringify(sourceHashes())||manifest.queriesHash!==hash(fs.readFileSync(queriesFile)))throw Error('Frozen source/query changed');
 for(const v of manifest.videos){const folder=path.join(scratch,'sessions',v.session);if(fs.existsSync(path.join(folder,'chat.jsonl'))&&fs.readFileSync(path.join(folder,'chat.jsonl'),'utf8').trim())throw Error('Benchmark chat must be empty');if(hash(fs.readFileSync(path.join(folder,'index.json')))!==v.indexSha256||v.frames.some(f=>hash(fs.readFileSync(path.join(folder,f.file)))!==f.sha256))throw Error('Frame inputs changed');}
 process.loadEnvFile(path.join(root,'.env'));if(!process.env.OPENAI_API_KEY)throw Error('Missing local OpenAI key');process.env.NODE_ENV='test';process.env.OPENAI_MODEL=manifest.model;
 const nativeFetch=globalThis.fetch,ledgerFile=path.join(root,'.semvod/real-footage/spend.json');
 if(read(ledgerFile).requests.some(r=>r.arm==='qvh-next-openai'))throw Error('This phase already attempted inference; no automatic restart');
 const pay=evaluationBudget(root);
 const result={manifestHash:hash(fs.readFileSync(manifestFile)),model:manifest.model,phaseCapUsd:.10,rows:[],requests:[]};let queue=Promise.resolve(),stop=false;
 write(predictionsFile,result); // Persist the one-shot marker before the first network request.
 const phaseRequests=()=>read(ledgerFile).requests.filter(r=>r.arm==='qvh-next-openai');
 const spent=()=>phaseRequests().reduce((s,r)=>s+(r.estimatedUsd??r.reservedUsd),0);
 globalThis.fetch=(url,options)=>{
  if(String(url)==='https://api.openai.com/v1/moderations')return nativeFetch(url,options);
  return queue=queue.then(async()=>{
   if(stop||String(url)!=='https://api.openai.com/v1/responses'||spent()+.02>.10)throw Error('Phase budget/destination guard stopped inference');
   const body=JSON.parse(options.body),parts=body.input[0].content,images=parts.filter(p=>p.type==='input_image'),plain=JSON.stringify({...body,input:[{role:'user',content:parts.filter(p=>p.type!=='input_image')}]});
   if(images.length!==1||body.model!==manifest.model||Buffer.byteLength(plain)>6000||!Number.isInteger(body.max_output_tokens)||body.max_output_tokens<1||body.max_output_tokens>4320)throw Error('Request envelope changed');
   const meta=await sharp(Buffer.from(images[0].image_url.split(',')[1],'base64')).metadata();if(meta.width>1536||meta.height>1296)throw Error('Image envelope changed');
   const receipt=await pay({arm:'qvh-next-openai',url:String(url),body,headers:options.headers,reserveUsd:.02,cost:d=>[d.usage?.input_tokens,d.usage?.output_tokens].every(n=>Number.isSafeInteger(n)&&n>=0)?(d.usage.input_tokens*.4+d.usage.output_tokens*1.6)/1e6:NaN});
   result.requests.push({requestHash:receipt.requestHash,responseId:receipt.responseId,usage:receipt.usage,estimatedUsd:receipt.estimatedUsd,elapsedMs:receipt.elapsedMs,replayed:!!receipt.replayed});return Response.json(receipt.response);
  });
 };
 const cwd=path.join(scratch,'run');fs.mkdirSync(cwd,{recursive:true});if(!fs.existsSync(path.join(cwd,'sessions')))fs.symlinkSync(path.join(scratch,'sessions'),path.join(cwd,'sessions'));process.chdir(cwd);
 const {search}=await import(path.join(root,'src/server/search.ts'));
 for(const q of lines(queriesFile)){
  const video=manifest.videos.find(v=>v.vid===q.vid),row={qid:q.qid};
  if(stop)row.error='Unattempted after budget or transport failure';else try{const output=await search(video.session,q.query),repeat=await search(video.session,q.query);if(repeat.stats.visionCalls!==0)throw Error('Repeat cache missed');Object.assign(row,{windows:windows(output.hits,output.scores,video.duration),hits:output.hits.map(({reason,...r})=>r),scores:output.scores.map(({reason,...r})=>r),stats:output.stats,repeatStats:repeat.stats});}catch(e){row.error=e.message;if(!e.message.includes('flagged by moderation'))stop=true;}
  result.rows.push(row);result.accountedUsd=spent();write(predictionsFile,result);console.log(`Recorded query ${q.qid}: ${row.error?'failure':'complete'}; accounted $${spent().toFixed(6)}`);
 }
 await Promise.allSettled([queue]);result.accountedUsd=spent();result.newRequests=phaseRequests();write(predictionsFile,result);
}else if(process.argv.includes('--grade')){
 const manifest=read(manifestFile),predictions=read(predictionsFile),goldFile=path.join(scratch,'gold.jsonl');
 if(JSON.stringify(predictions.rows.map(r=>r.qid).sort())!==JSON.stringify(manifest.queryIds.slice().sort()))throw Error('Incomplete frozen prediction denominator');
 if(predictions.manifestHash!==hash(fs.readFileSync(manifestFile))||hash(fs.readFileSync(goldFile))!==manifest.goldHash)throw Error('Frozen inputs differ');
 const gold=lines(goldFile);if(JSON.stringify(predictions.rows.map(r=>r.qid).sort())!==JSON.stringify(gold.map(r=>r.qid).sort()))throw Error('Incomplete denominator');
 const rows=predictions.rows.map(r=>{const p=r.windows?.[0],g=gold.find(q=>q.qid===r.qid),iou=p?Math.max(0,...g.relevant_windows.map(w=>{const i=Math.max(0,Math.min(p[1],w[1])-Math.max(p[0],w[0]));return i/((p[1]-p[0])+(w[1]-w[0])-i);})):0;return {qid:r.qid,error:r.error??null,bestIoU:iou,r1IoU50:Number(iou>=.5),r1IoU70:Number(iou>=.7)};});
 const metrics={predictionSha256:hash(fs.readFileSync(predictionsFile)),queries:rows.length,r1IoU50:rows.reduce((s,r)=>s+r.r1IoU50,0)/rows.length,r1IoU70:rows.reduce((s,r)=>s+r.r1IoU70,0)/rows.length,failures:rows.filter(r=>r.error).length,accountedUsd:predictions.accountedUsd,rows};write(path.join(dir,'metrics.json'),metrics);console.log(JSON.stringify(metrics,null,2));
}else console.log(fs.existsSync(path.join(dir,'metrics.json'))?JSON.stringify(read(path.join(dir,'metrics.json')),null,2):'No graded results. Preparation and replay are free; --live is explicitly paid.');

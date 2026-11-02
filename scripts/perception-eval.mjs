// Official MCQA capability audit. No paid calls unless --live is explicit; never read gold during inference.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {hash,read,write,evaluationBudget,validateRate,usageCost} from './eval-budget.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), dir=path.join(root,'docs/verification/perception-v1'), scratch=path.join(root,'.semvod/perception-v1');
const mode=process.argv[2], arm=process.argv[3], manifestFile=path.join(dir,'inputs.json');
if(!['--prepare','--live'].includes(mode)){
  for(const name of ['gemini','openai','jev']){const file=path.join(dir,`${name}.json`);console.log(name,fs.existsSync(file)?`${read(file).rows.length}/25 videos recorded`:'not run');}
  console.log('Free status. Grade published receipts with node scripts/grade-perception.mjs. Paid inference requires --live gemini|openai|jev.');process.exit(0);
}
const protocol=read(path.join(dir,'protocol.json')), inputs=read(path.join(scratch,'inputs.json')), arms=['gemini','openai','jev'];
const protocolHash=hash(fs.readFileSync(path.join(dir,'protocol.json'))), inputHash=hash(fs.readFileSync(path.join(scratch,'inputs.json')));
if(JSON.stringify(inputs.map(x=>x.id))!==JSON.stringify(protocol.selection.ids))throw Error('Selection differs from preregistration');
if(inputs.some(x=>x.questions.some(q=>Object.keys(q).sort().join(',')!=='id,options,question'||q.options.length!==3))||inputs.some(x=>new Set(x.questions.map(q=>q.id)).size!==x.questions.length))throw Error('Inference inputs contain unexpected fields or duplicate questions');
if(mode==='--prepare'){
  const manifest=[];
  for(const x of inputs){
    const session=path.join(root,'sessions',x.session), index=read(path.join(session,'index.json')), frames=index.frames, columns=Math.min(4,frames.length);
    const width=columns*384,height=Math.max(256,Math.ceil(frames.length/columns)*216), tiles=[];
    for(const [i,f] of frames.entries()){
      const label=Buffer.from(`<svg width="384" height="216"><rect width="35" height="24" fill="black"/><text x="6" y="17" fill="white" font-size="16">${i+1}</text></svg>`);
      tiles.push({input:await sharp(path.join(session,f.file)).resize(384,216,{fit:'contain',background:'#151619'}).composite([{input:label}]).jpeg({quality:80}).toBuffer(),left:i%columns*384,top:Math.floor(i/columns)*216});
    }
    const sheet=await sharp({create:{width,height,channels:3,background:'#151619'}}).composite(tiles).jpeg({quality:80}).toBuffer();
    fs.writeFileSync(path.join(session,'evaluation-sheet.jpg'),sheet);
    if(hash(fs.readFileSync(path.join(session,'clip.mp4')))!==x.clipSha256||index.duration!==x.duration||frames.some(f=>f.t>=x.duration))throw Error('Media manifest mismatch');
    manifest.push({id:x.id,session:x.session,duration:x.duration,cutFrame:x.cutFrame,clipSha256:x.clipSha256,sheetSha256:hash(sheet),width,height,frames:frames.map(f=>({...f,sha256:hash(fs.readFileSync(path.join(session,f.file)))})),questionIds:x.questions.map(q=>q.id),questionInputSha256:hash(JSON.stringify(x.questions))});
  }
  write(manifestFile,{protocolHash,inputHash,layout:'384x216 letterboxed tiles, four columns maximum, numbered chronological 2-second samples, minimum sheet height256. Identical image bytes for OpenAI/Jev; no deduplication.',videos:manifest});
  console.log(`Prepared ${inputs.length} videos, ${inputs.reduce((s,x)=>s+x.questions.length,0)} questions; no inference.`);
}else if(mode==='--live'){
  if(!arms.includes(arm))throw Error('Expected --live gemini|openai|jev');
  const manifest=read(manifestFile);if(manifest.protocolHash!==protocolHash||manifest.inputHash!==inputHash)throw Error('Frozen inputs changed');
  process.loadEnvFile(path.join(root,arm==='openai'?'.env':'.semvod/openrouter.env'));
  const model=arm==='openai'?'gpt-4.1-mini':arm==='jev'?'typesafe/jev-1.14':'google/gemini-2.5-flash-lite';
  const token=process.env[arm==='openai'?'OPENAI_API_KEY':'OPENROUTER_API_KEY'];if(!token)throw Error('Missing local API key');
  if(arm!=='openai'){
    const url='https://openrouter.ai/api/v1/models',rates=arm==='jev'?{prompt:4.2e-8,completion:0}:{prompt:1e-7,audio:3e-7,completion:4e-7},context=arm==='jev'?262144:1048576;
    const catalog=await(await fetch(url+(arm==='jev'?'?output_modalities=decisions&input_modalities=image':''))).json(),entry=catalog.data?.find(x=>x.id===model);
    validateRate(entry,context,rates);
    if(!(arm==='jev'?['image']:['video','audio']).every(m=>entry.architecture?.input_modalities.includes(m)))throw Error('Model modality changed');
    const endpoints=await(await fetch(`${url}/${model}/endpoints`)).json();validateRate(endpoints.data?.endpoints?.find(x=>x.tag===(arm==='jev'?'typesafe':'google-ai-studio')),context,rates);
  }
  const request=evaluationBudget(root), file=path.join(dir,`${arm}.json`), result=fs.existsSync(file)?read(file):{arm,model,protocolHash,inputHash,rows:[]};
  if(result.protocolHash!==protocolHash||result.inputHash!==inputHash)throw Error('Receipt belongs to different inputs');
  for(const x of inputs){
    if(result.rows.some(r=>r.id===x.id))continue;
    const expected=manifest.videos.find(v=>v.id===x.id),session=path.join(root,'sessions',x.session),isVideo=arm==='gemini';
    const media=fs.readFileSync(path.join(session,isVideo?'clip.mp4':'evaluation-sheet.jpg'));
    if(hash(media)!==(isVideo?expected.clipSha256:expected.sheetSha256)||media.length>15000000||hash(JSON.stringify(x.questions))!==expected.questionInputSha256)throw Error('Inference media/question hash changed');
    if(!isVideo&&(expected.width>1536||expected.height>1296||expected.width<256||expected.height<256))throw Error('Image outside request envelope');
    const questions=x.questions.map(q=>({id:`q${q.id}`,question:q.question,options:q.options}));
    if(Buffer.byteLength(JSON.stringify(questions))>10000)throw Error('Question batch exceeds request envelope');
    const schema={type:'object',properties:Object.fromEntries(questions.map(q=>[q.id,{type:'integer',enum:[0,1,2]}])),required:questions.map(q=>q.id),additionalProperties:false};
    const mediaUrl=`data:${isVideo?'video/mp4':'image/jpeg'};base64,${media.toString('base64')}`;
    let url,body;
    if(arm==='openai'){
      url='https://api.openai.com/v1/responses';body={model,store:false,temperature:0,max_output_tokens:1024,instructions:protocol.evaluation.promptOpenAI,input:[{role:'user',content:[{type:'input_image',image_url:mediaUrl,detail:'high'},{type:'input_text',text:JSON.stringify(questions)}]}],text:{format:{type:'json_schema',name:'answers',strict:true,schema}}};
    }else if(arm==='gemini'){
      url='https://openrouter.ai/api/v1/chat/completions';body={model,provider:{only:['google-ai-studio'],allow_fallbacks:false,require_parameters:true,max_price:{prompt:.10,completion:.40}},temperature:0,max_tokens:1024,messages:[{role:'system',content:protocol.evaluation.promptGemini},{role:'user',content:[{type:'video_url',video_url:{url:mediaUrl}},{type:'text',text:JSON.stringify(questions)}]}],response_format:{type:'json_schema',json_schema:{name:'answers',strict:true,schema}}};
    }else{
      url='https://openrouter.ai/api/alpha/decisions';body={model,provider:{only:['typesafe'],allow_fallbacks:false,max_price:{prompt:.042,completion:0}},state:[protocol.evaluation.promptJev,{type:'image_url',image_url:{url:mediaUrl}}],questions:Object.fromEntries(questions.map(q=>[q.id,{type:'choice',instructions:q.question,criteria:Object.fromEntries(q.options.map((o,i)=>[String(i),o]))}]))};
    }
    const receipt=await request({arm:`perception-${arm}`,url,body,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},reserveUsd:isVideo?.32:.02,cost:data=>arm==='openai'?([data.usage?.input_tokens,data.usage?.output_tokens].every(n=>Number.isSafeInteger(n)&&n>=0)?(data.usage.input_tokens*.4+data.usage.output_tokens*1.6)/1e6:NaN):usageCost(data)});
    const data=receipt.response;let parsed={};
    try{parsed=arm==='jev'?Object.fromEntries(Object.entries(data.answers??{}).map(([k,v])=>[k,['0','1','2'].includes(v.choice)?Number(v.choice):null])):JSON.parse(arm==='openai'?data.output.flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join(''):data.choices[0].message.content);}catch{/* Invalid responses count wrong; no retry. */}
    const answers=Object.fromEntries(questions.map(q=>[q.id,Number.isInteger(parsed?.[q.id])&&parsed[q.id]>=0&&parsed[q.id]<=2?parsed[q.id]:null]));
    result.rows.push({id:x.id,answers,invalid:Object.values(answers).filter(v=>v===null).length,requestHash:receipt.requestHash,responseId:receipt.responseId,estimatedUsd:receipt.estimatedUsd,elapsedMs:receipt.elapsedMs,usage:receipt.usage});write(file,result);
    console.log(arm,x.id,'answered',questions.length,'invalid',result.rows.at(-1).invalid,'USD',receipt.estimatedUsd);
  }
}

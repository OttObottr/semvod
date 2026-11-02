// Shared evaluation-only guard. No credentials, media, or request headers are persisted.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const hash=value=>createHash('sha256').update(value).digest('hex');
export const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
export function write(file,value){const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{mode:0o600});fs.renameSync(temp,file);}
export function evaluationBudget(root){
  const nativeFetch=globalThis.fetch;let queue=Promise.resolve();
  const dir=path.join(root,'.semvod/real-footage'),file=path.join(dir,'spend.json'),lock=path.join(dir,'eval.lock');
  fs.closeSync(fs.openSync(lock,'wx',0o600));process.on('exit',()=>fs.unlinkSync(lock));
  const ledger=read(file),cap=Math.min(ledger.capUsd,0.074620048+.42);
  if(ledger.capUsd!==.5||ledger.requests.some(r=>r.state!=='complete'||!Number.isFinite(r.estimatedUsd)||r.estimatedUsd<0))throw Error('Unresolved or invalid shared budget ledger');
  const run=async({arm,url,body,headers,reserveUsd,cost})=>{
    if(!['https://api.openai.com/v1/responses','https://openrouter.ai/api/alpha/decisions','https://openrouter.ai/api/v1/chat/completions'].includes(url))throw Error('Unexpected provider destination');
    if(![.02,.32].includes(reserveUsd))throw Error('Unaudited request envelope');
    const requestHash=hash(JSON.stringify({url,body})),saved=path.join(dir,`${requestHash}.json`);
    if(fs.existsSync(saved))return {...read(saved),replayed:true};
    const committed=ledger.requests.reduce((s,r)=>s+(r.estimatedUsd??r.reservedUsd),0);
    if(committed+reserveUsd>cap)throw Error('Shared remaining $0.42 cap reached');
    const entry={arm,reservedUsd:reserveUsd,state:'pending',requestHash,startedAt:new Date().toISOString()};
    ledger.requests.push(entry);write(file,ledger);const start=Date.now();
    const response=await nativeFetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
    const data=await response.json();if(!response.ok)throw Error(`Provider HTTP ${response.status}; unknown charge reserved; no retry`);
    const charge=cost(data);
    if(!Number.isFinite(charge)||charge<0||charge>reserveUsd)throw Error('Unknown/out-of-envelope charge retained; no retry');
    entry.state='complete';entry.estimatedUsd=charge;entry.usage=data.usage;entry.responseId=data.id;write(file,ledger);
    const receipt={...entry,elapsedMs:Date.now()-start,response:data};write(saved,receipt);return receipt;
  };
  // A failed/uncertain request rejects the queue; later sheets cannot start spending.
  return request=>(queue=queue.then(()=>run(request)));
}
export function validateRate(model,maxContext,rates){
  if(!model||!Number.isSafeInteger(model.context_length)||model.context_length<=0||model.context_length>maxContext||Object.entries(rates).some(([k,max])=>model.pricing?.[k]==null||!Number.isFinite(Number(model.pricing[k]))||Number(model.pricing[k])<0||Number(model.pricing[k])>max))throw Error('Model price/context envelope changed');
}
export const usageCost=data=>{
  const u=data.usage, input=u?.input_tokens??u?.prompt_tokens,output=u?.output_tokens??u?.completion_tokens;
  if(![input,output].every(n=>Number.isSafeInteger(n)&&n>=0))return NaN;
  return u.cost;
};

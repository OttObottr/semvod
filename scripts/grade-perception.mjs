// Free, deterministic grading of every preregistered question. --publish imports local evidence once all arms finish.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash,read,write} from './eval-budget.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), dir=path.join(root,'docs/verification/perception-v1');
const protocol=read(path.join(dir,'protocol.json')), manifest=read(path.join(dir,'inputs.json')), arms=['gemini','openai','jev'];
const predictions=Object.fromEntries(arms.map(arm=>[arm,read(path.join(dir,`${arm}.json`))]));
for(const [arm,result] of Object.entries(predictions)){
  if(result.protocolHash!==hash(fs.readFileSync(path.join(dir,'protocol.json')))||result.inputHash!==manifest.inputHash||JSON.stringify(result.rows.map(r=>r.id))!==JSON.stringify(protocol.selection.ids))throw Error(`${arm}: incomplete/changed frozen selection; do not silently reduce denominator`);
  for(const row of result.rows){const expected=manifest.videos.find(v=>v.id===row.id).questionIds.map(id=>`q${id}`).sort();if(JSON.stringify(Object.keys(row.answers).sort())!==JSON.stringify(expected))throw Error('Missing/extra question answers');}
}
if(process.argv.includes('--publish')){
  // First gold access occurs only after exact coverage for all three arms above.
  const gold=read(path.join(root,'.semvod/perception-v1/gold.json'));
  const official=read(path.join(root,'.semvod/perception-v1/annotations.json'));
  for(const id of protocol.selection.ids)if(JSON.stringify(gold[id])!==JSON.stringify(official[id].mc_question))throw Error('Selected gold differs from official annotation records');
  write(path.join(dir,'annotations.json'),{license:'CC BY 4.0',source:'https://github.com/google-deepmind/perception_test',videos:gold});
  const raw=Object.fromEntries(arms.map(arm=>[arm,predictions[arm].rows.map(row=>read(path.join(root,'.semvod/real-footage',`${row.requestHash}.json`)))]));
  write(path.join(dir,'responses.json'),raw);
}
const gold=read(path.join(dir,'annotations.json')).videos, raw=read(path.join(dir,'responses.json')), hard=new Set(protocol.selection.additionalHardStratum.ids);
const summary={benchmark:'Official Perception Test validation subset; not a leaderboard result',selection:25,questions:97,chanceExpectedAccuracy:1/3,metric:'Question-weighted top-one accuracy; invalid/missing predictions wrong',arms:{}};
for(const arm of arms){
  const rows=predictions[arm].rows, scored=[];
  for(const row of rows){
    const evidence=raw[arm].find(r=>r.requestHash===row.requestHash);
    if(!evidence||(row.error?evidence.state!=='failed-reserved'||evidence.reservedUsd!==row.reservedUsd:(evidence.responseId!==row.responseId||evidence.estimatedUsd!==row.estimatedUsd)))throw Error('Response receipt mismatch');
    let values={};try{values=arm==='jev'?Object.fromEntries(Object.entries(evidence.response.answers??{}).map(([k,v])=>[k,['0','1','2'].includes(v.choice)?Number(v.choice):null])):JSON.parse(arm==='openai'?evidence.response.output.flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join(''):evidence.response.choices[0].message.content);}catch{}
    for(const q of gold[row.id]){
      if(![0,1,2].includes(q.answer_id))throw Error('Invalid official answer label');
      const value=values?.[`q${q.id}`],prediction=Number.isInteger(value)&&value>=0&&value<=2?value:null;
      if(row.answers[`q${q.id}`]!==prediction)throw Error('Saved prediction differs from raw model response');
      scored.push({id:row.id,questionId:q.id,area:q.area,reasoning:q.reasoning,stratum:hard.has(row.id)?'memory-games':'hash-selected',correct:prediction===q.answer_id,invalid:prediction===null});
    }
  }
  if(scored.length!==97||new Set(scored.map(r=>`${r.id}:${r.questionId}`)).size!==97)throw Error('Wrong question denominator');
  const count=xs=>({correct:xs.filter(x=>x.correct).length,total:xs.length,accuracy:xs.filter(x=>x.correct).length/xs.length,invalid:xs.filter(x=>x.invalid).length});
  const group=key=>Object.fromEntries([...new Set(scored.map(r=>String(r[key])))].sort().map(value=>[value,count(scored.filter(r=>String(r[key])===value))]));
  summary.arms[arm]={...count(scored),strata:group('stratum'),areas:group('area'),reasoning:group('reasoning'),estimatedCompletedUsd:rows.reduce((s,r)=>s+(r.estimatedUsd??0),0),reservedUnknownUsd:rows.reduce((s,r)=>s+(r.reservedUsd??0),0),elapsedMs:rows.reduce((s,r)=>s+(r.elapsedMs??0),0),successfulCalls:rows.filter(r=>!r.error).length,failedCalls:rows.filter(r=>r.error).length};
}
write(path.join(dir,'summary.json'),summary);console.log(JSON.stringify(summary,null,2));

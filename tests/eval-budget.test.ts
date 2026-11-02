import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {evaluationBudget} from '../scripts/eval-budget.mjs';

test('evaluation budget serializes native fetch and stops queued spending after uncertainty',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'semvod-budget-'));
 const dir=path.join(root,'.semvod/real-footage');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'spend.json'),JSON.stringify({capUsd:.5,requests:[]}));
 const original=globalThis.fetch;let active=0,peak=0,calls=0;
 globalThis.fetch=async()=>{calls++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;if(calls===3)throw Error('uncertain network failure');return Response.json({id:'mock',usage:{cost:.001}});};
 const request=evaluationBudget(root);
 process.on('exit',()=>fs.rmSync(root,{recursive:true,force:true}));
 globalThis.fetch=async()=>{throw Error('adapter must not be called recursively');};
 const make=(id:number)=>request({arm:'mock',url:'https://api.openai.com/v1/responses',body:{id},headers:{},reserveUsd:.02,cost:(d:any)=>d.usage.cost});
 try{
  await Promise.all([make(1),make(2)]);assert.equal(peak,1);assert.equal(calls,2);
  assert.equal((await make(1)).replayed,true);assert.equal(calls,2);
  const failed=await Promise.allSettled([make(3),make(4)]);
  assert.ok(failed.every(r=>r.status==='rejected'));assert.equal(calls,3);
  const ledger=JSON.parse(fs.readFileSync(path.join(dir,'spend.json'),'utf8'));
  assert.equal(ledger.requests.length,3);assert.equal(ledger.requests[2].state,'pending');assert.equal(ledger.requests[2].reservedUsd,.02);
 }finally{globalThis.fetch=original;}
});

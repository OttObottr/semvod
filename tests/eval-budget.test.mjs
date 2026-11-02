import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {evaluationBudget,hash} from '../scripts/eval-budget.mjs';

test('evaluation budget serializes native fetch and stops queued spending after uncertainty',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'semvod-budget-'));
 const dir=path.join(root,'.semvod/real-footage');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'spend.json'),JSON.stringify({capUsd:.5,requests:[]}));
 const original=globalThis.fetch;let active=0,peak=0,calls=0;
 globalThis.fetch=async()=>{calls++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;if(calls===3)throw Error('uncertain network failure');return Response.json({id:'mock',usage:{cost:.001}});};
 const request=evaluationBudget(root);
 process.on('exit',()=>fs.rmSync(root,{recursive:true,force:true}));
 globalThis.fetch=async()=>{throw Error('adapter must not be called recursively');};
 const make=(id)=>request({arm:'mock',url:'https://api.openai.com/v1/responses',body:{id},headers:{},reserveUsd:.02,cost:(d)=>d.usage.cost});
 try{
  await Promise.all([make(1),make(2)]);assert.equal(peak,1);assert.equal(calls,2);
  assert.equal((await make(1)).replayed,true);assert.equal(calls,2);
  const failed=await Promise.allSettled([make(3),make(4)]);
  assert.ok(failed.every(r=>r.status==='rejected'));assert.equal(calls,3);
  const ledger=JSON.parse(fs.readFileSync(path.join(dir,'spend.json'),'utf8'));
  assert.equal(ledger.requests.length,3);assert.equal(ledger.requests[2].state,'pending');assert.equal(ledger.requests[2].reservedUsd,.02);
 }finally{globalThis.fetch=original;}
});
test('audited failed reservations remain charged, block their hash, and preserve sanitized HTTP errors',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'semvod-budget-audit-')),dir=path.join(root,'.semvod/real-footage');fs.mkdirSync(dir,{recursive:true});
 const url='https://api.openai.com/v1/responses',oldHash=hash(JSON.stringify({url,body:{id:1}}));
 fs.writeFileSync(path.join(dir,'spend.json'),JSON.stringify({capUsd:.5,requests:[{arm:'mock',requestHash:oldHash,state:'failed-reserved',reservedUsd:.02,audit:{noRetry:true,reason:'explicit test audit'}}]}));
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({error:{message:'Rejected Bearer test-secret-token'}},{status:400});};
 const request=evaluationBudget(root);process.on('exit',()=>fs.rmSync(root,{recursive:true,force:true}));
 try{
  await assert.rejects(request({arm:'mock',url,body:{id:2},headers:{Authorization:'Bearer test-secret-token'},reserveUsd:.02,cost:()=>0}),/unknown charge reserved/);
  assert.equal(calls,1);
  const file=path.join(dir,`${hash(JSON.stringify({url,body:{id:2}}))}.json`),text=fs.readFileSync(file,'utf8');
  assert.equal(JSON.parse(text).httpStatus,400);assert.ok(!text.includes('test-secret-token'));
  const ledger=JSON.parse(fs.readFileSync(path.join(dir,'spend.json'),'utf8'));
  assert.equal(ledger.requests[0].state,'failed-reserved');assert.equal(ledger.requests[1].state,'pending');
  assert.equal(ledger.requests.reduce((s,r)=>s+(r.estimatedUsd??r.reservedUsd),0),.04);
 }finally{globalThis.fetch=original;}
 const root2=fs.mkdtempSync(path.join(os.tmpdir(),'semvod-budget-no-retry-')),dir2=path.join(root2,'.semvod/real-footage');fs.mkdirSync(dir2,{recursive:true});
 fs.writeFileSync(path.join(dir2,'spend.json'),JSON.stringify({capUsd:.5,requests:[{requestHash:oldHash,state:'failed-reserved',reservedUsd:.02,audit:{noRetry:true,reason:'explicit test audit'}}]}));
 globalThis.fetch=async()=>{throw Error('must not reach provider');};
 const blocked=evaluationBudget(root2);process.on('exit',()=>fs.rmSync(root2,{recursive:true,force:true}));
 try{await assert.rejects(blocked({arm:'mock',url,body:{id:1},headers:{},reserveUsd:.02,cost:()=>0}),/permanently blocked/);}finally{globalThis.fetch=original;}
});

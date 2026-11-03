import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latestRequest, timelineBins } from '../src/client/ui.js';
import type { Hit } from '../src/shared/types.js';

test('changing moment or session suppresses late clip results, errors and cleanup',async()=>{
  for(const reject of [false,true]){
    const requests=latestRequest();let settle!:(value:string)=>void,fail!:(error:Error)=>void;
    const response=new Promise<string>((resolve,reject)=>{settle=resolve;fail=reject;});
    const updates:string[]=[];
    const pending=requests.run(async current=>{const value=await response;if(current())updates.push('clipboard');return value;},v=>updates.push(v),()=>updates.push('error'),()=>updates.push('idle'));
    requests.invalidate();
    if(reject)fail(new Error('old request failed'));else settle('clip for old moment');
    await pending;assert.deepEqual(updates,[]);
  }
});

test('timeline bins preserve edges, strongest hits and stable ties without sorting input',()=>{
  const scores=[[-1,10],[0,2],[1,8],[1.5,8],[2,9],[10,10]].map(([t,score],id)=>({id,t,score} as Hit));
  assert.deepEqual(timelineBins(scores,10,5).map(hit=>hit?.id),[2,4,undefined,undefined,undefined]);
  assert.deepEqual(scores.map(hit=>hit.id),[0,1,2,3,4,5]);
  assert.deepEqual(timelineBins([],10,2),[undefined,undefined]);
});
test('an older request cannot overwrite a newer result or reset its pending state',async()=>{
  const requests=latestRequest();let finishOld!:(value:string)=>void,finishNew!:(value:string)=>void;
  const old=new Promise<string>(r=>{finishOld=r;}),next=new Promise<string>(r=>{finishNew=r;}),updates:string[]=[];
  const callbacks=[(v:string)=>updates.push(v),()=>updates.push('error'),()=>updates.push('idle')] as const;
  const first=requests.run(()=>old,...callbacks),second=requests.run(()=>next,...callbacks);
  finishOld('old');await first;assert.deepEqual(updates,[]);
  finishNew('new');await second;assert.deepEqual(updates,['new','idle']);
});

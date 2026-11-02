import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latestRequest } from '../src/client/latest.js';

test('changing moment or session suppresses late clip results, errors and cleanup',async()=>{
  for(const reject of [false,true]){
    const requests=latestRequest();let settle!:(value:string)=>void,fail!:(error:Error)=>void;
    const response=new Promise<string>((resolve,reject)=>{settle=resolve;fail=reject;});
    const updates:string[]=[];
    const pending=requests.run(()=>response,v=>updates.push(v),()=>updates.push('error'),()=>updates.push('idle'));
    requests.invalidate();
    if(reject)fail(new Error('old request failed'));else settle('clip for old moment');
    await pending;assert.deepEqual(updates,[]);
  }
});
test('an older request cannot overwrite a newer result or reset its pending state',async()=>{
  const requests=latestRequest();let finishOld!:(value:string)=>void,finishNew!:(value:string)=>void;
  const old=new Promise<string>(r=>{finishOld=r;}),next=new Promise<string>(r=>{finishNew=r;}),updates:string[]=[];
  const callbacks=[(v:string)=>updates.push(v),()=>updates.push('error'),()=>updates.push('idle')] as const;
  const first=requests.run(()=>old,...callbacks),second=requests.run(()=>next,...callbacks);
  finishOld('old');await first;assert.deepEqual(updates,[]);
  finishNew('new');await second;assert.deepEqual(updates,['new','idle']);
});

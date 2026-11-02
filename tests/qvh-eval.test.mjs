import test from 'node:test';
import assert from 'node:assert/strict';
import {frameWindows,checkedFirst,recallAtOne} from '../scripts/qvh-eval.mjs';
test('QV frozen interval adapter respects gaps, edges, ranking and duplicate runs',()=>{
 const scores=[0,2,4,6,8,12].map((t,id)=>({id,t,score:[8,7,1,5,6,9][id]}));
 assert.deepEqual(frameWindows([scores[4],scores[3],scores[0],scores[5]],scores,13),[[5,9,6],[0,3,8],[11,13,9]]);
 assert.deepEqual(recallAtOne([[0,5,9]],[[0,10],[20,25]]),{bestIoU:.5,r1IoU50:1,r1IoU70:0});
 assert.deepEqual(recallAtOne([],[[0,10]]),{bestIoU:0,r1IoU50:0,r1IoU70:0});
});
test('QV checked-first ablation preserves threshold and spacing without upgrading coarse evidence',()=>{
 const scores=[{id:0,t:0,score:10,visualStage:'coarse'},{id:1,t:4,score:4,visualStage:'refined'},{id:2,t:20,score:9,visualStage:'coarse'},{id:3,t:40,score:2,visualStage:'refined'}];
 assert.deepEqual(checkedFirst(scores).map(h=>h.id),[1,2]);
 assert.equal(scores[0].visualStage,'coarse');
});

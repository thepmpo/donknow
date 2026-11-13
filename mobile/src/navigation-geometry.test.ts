import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tabAtPoint,lensPosition,shouldScrub} from './navigation-geometry.ts';
test('navigation release selects only a real target; outside release cancels',()=>{
 const frames={a:{x:0,y:0,width:60,height:58},b:{x:60,y:0,width:60,height:58}};
 assert.equal(tabAtPoint({x:90,y:28},frames),'b');
 for(const point of [{x:-1,y:28},{x:90,y:59},{x:121,y:28}])assert.equal(tabAtPoint(point,frames),null);
});
test('lens follows the finger inside bounds and never escapes narrow/short bars',()=>{
 assert.deepEqual(lensPosition({x:100,y:30},{width:52,height:52},{width:300,height:58}),{x:74,y:4});
 assert.deepEqual(lensPosition({x:900,y:-10},{width:52,height:52},{width:300,height:58}),{x:248,y:0});
 assert.deepEqual(lensPosition({x:20,y:20},{width:52,height:52},{width:40,height:40}),{x:0,y:0});
});
test('scrubbing only captures the tab axis; overflowing bars retain scrolling',()=>{
 assert.equal(shouldScrub(8,1,false,false),true);assert.equal(shouldScrub(1,8,true,false),true);
 assert.equal(shouldScrub(1,8,false,false),false);assert.equal(shouldScrub(5,5,true,false),false);
 assert.equal(shouldScrub(1,80,true,true),false);
});

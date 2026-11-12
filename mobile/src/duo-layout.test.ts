import test from 'node:test';
import assert from 'node:assert/strict';
import {readDuoGeometry,hasDuoCapability,duoSafeFrame,intersectRects} from './duo-layout.ts';
import type {DuoGeometry,DuoRect} from './duo-layout.ts';
const base = (overrides: Partial<DuoGeometry> = {}): DuoGeometry => ({apiAvailable:true,hasHinge:true,width:960,height:740,safeArea:{top:20,left:16,right:48,bottom:24},regions:[],...overrides});
function clearOf(frame:DuoRect,g:DuoGeometry){assert.ok(frame.width>=0&&frame.height>=0);assert.ok(frame.x>=g.safeArea.left);assert.ok(frame.y>=g.safeArea.top);assert.ok(frame.x+frame.width<=g.width-g.safeArea.right);assert.ok(frame.y+frame.height<=g.height-g.safeArea.bottom);for(const region of g.regions.filter(x=>x.active))assert.equal(intersectRects(frame,region.frame),null);}
test('only native iOS API-confirmed hinge activates trailing navigation in any dimensions',()=>{
 for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[960,740]]){
  const g=base({width,height});assert.equal(hasDuoCapability('ios',g),true);
  assert.equal(hasDuoCapability('ios',{...g,hasHinge:false}),false); // ordinary iPhone/iPad, including landscape
  assert.equal(hasDuoCapability('ios',{...g,apiAvailable:false}),false);
  for(const os of ['web','android','macos'])assert.equal(hasDuoCapability(os,g),false);
 }
 assert.equal(hasDuoCapability('ios',null),false);
});
test('validates native geometry and refuses malformed/stale capabilities rather than guessing',()=>{
 assert.deepEqual(readDuoGeometry(base()),base());
 for(const input of [null,{},base({width:Infinity}),base({height:0}),base({hasHinge:'true' as unknown as boolean}),base({safeArea:{top:-1,bottom:0,left:0,right:0}}),base({regions:[{kind:'division',active:true,frame:{x:NaN,y:0,width:10,height:740}}]})])assert.equal(readDuoGeometry(input),null);
});
test('asymmetric safe areas are applied independently and inactive zero-width fold does not shrink open content',()=>{
 const g=base({regions:[{kind:'division',active:false,frame:{x:480,y:0,width:0,height:740}}]});
 assert.deepEqual(duoSafeFrame(g),{x:16,y:20,width:896,height:696});
});
test('partially folded book and tabletop layouts leave active hinge and cameras clear',()=>{
 for(const fold of [{x:460,y:0,width:40,height:740},{x:0,y:350,width:960,height:40}]){
  const g=base({regions:[{kind:'division',active:true,frame:fold},{kind:'occlusion',active:true,frame:{x:880,y:10,width:80,height:90}}]});clearOf(duoSafeFrame(g),g);
 }
});
test('asymmetric book fold keeps navigation in the right pane even when the left pane is larger',()=>{
 const g=base({regions:[{kind:'division',active:true,frame:{x:520,y:0,width:40,height:740}}]});
 const frame=duoSafeFrame(g);assert.equal(frame.x,560);assert.equal(frame.x+frame.width,g.width-g.safeArea.right);clearOf(frame,g);
});
test('camera occlusions do not select a tall narrow sliver when a usable clear area exists',()=>{
 const g=base({regions:[{kind:'occlusion',active:true,frame:{x:80,y:20,width:832,height:650}}]});
 const frame=duoSafeFrame(g);assert.equal(frame.width,896);assert.equal(frame.y,670);clearOf(frame,g);
});
test('off-view/partially overlapping region geometry uses view-local clipping',()=>{
 const g=base({regions:[{kind:'occlusion',active:true,frame:{x:-20,y:-10,width:75,height:90}},{kind:'division',active:true,frame:{x:2000,y:0,width:10,height:740}}]});clearOf(duoSafeFrame(g),g);
});
test('fold-open-fold transitions are deterministic without a state reset or size fingerprint',()=>{
 const open=base(),fold=base({regions:[{kind:'division',active:true,frame:{x:460,y:0,width:40,height:740}}]});
 const before=duoSafeFrame(fold);assert.notDeepEqual(before,duoSafeFrame(open));assert.deepEqual(duoSafeFrame(fold),before);
 // No model-name field is consumed: a fake label cannot make an ordinary device into Duo.
 assert.equal(hasDuoCapability('ios',readDuoGeometry({...open,hasHinge:false,model:'iPhone Duo'})),false);
});

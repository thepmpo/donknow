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

test('camera-column controls use full native coordinates even when the body safe inset lies far to their left',async()=>{
 const {duoSceneLayout,duoTabFrame}=await import('./duo-layout.ts');
 for(const [width,height,hingeStatus] of [[390,844,'closed'],[960,740,'fullyOpen'],[740,960,'fullyOpen']] as const){
  const camera={x:width-60,y:32,width:28,height:28};
  const g=base({width,height,hingeStatus,safeArea:{left:16,top:20,right:100,bottom:20},regions:[{kind:'occlusion',active:true,frame:camera}]});
  const scene=duoSceneLayout(g),tabs=duoTabFrame(scene,true)!;
  assert.equal(scene.alignment,'trailing-occlusion');assert.equal(scene.column!.x+scene.column!.width/2,camera.x+camera.width/2);assert.equal(tabs.x,scene.column!.x);assert.equal(scene.back!.x,tabs.x);assert.ok(scene.back!.y>=camera.y+camera.height+8);assert.ok(scene.body.x+scene.body.width<tabs.x,'chrome is not hosted at the inset body edge');
  for(const frame of [scene.back!,tabs])for(const region of g.regions.filter(r=>r.active))assert.equal(intersectRects(frame,region.frame),null);
  assert.equal(!!scene.panes,hingeStatus==='fullyOpen'&&width>height);
 }
});
test('hidden inner camera geometry keeps the same camera column; unrelated or absent occlusions have explicit fallback sources',async()=>{
 const {duoSceneLayout}=await import('./duo-layout.ts');
 const camera={x:900,y:32,width:28,height:28},g=base({hingeStatus:'fullyOpen',safeArea:{left:16,top:20,right:80,bottom:20},regions:[{kind:'occlusion',active:false,frame:camera}]});
 assert.equal(duoSceneLayout(g).column!.x+32,914);assert.equal(duoSceneLayout(g).alignment,'trailing-occlusion');
 assert.equal(duoSceneLayout({...g,regions:[]}).alignment,'system-inset');assert.equal(duoSceneLayout({...g,regions:[],safeArea:{...g.safeArea,right:0}}).alignment,'trailing-edge');
 for(const hingeStatus of ['closed','partiallyOpen','unknown'] as const)assert.equal(duoSceneLayout({...g,hingeStatus}).panes,null);
 assert.equal(duoSceneLayout({...g,hingeStatus:undefined}).panes,null,'an old binary without a pose cannot guess unfolded from width');
 assert.equal(readDuoGeometry({...g,hingeStatus:'invented'}),null);
});
test('unfolded landscape panels clear the actual fold and camera independently; portrait and modal content stay single',async()=>{
 const {duoSceneLayout,duoTabFrame}=await import('./duo-layout.ts');
 const g=base({hingeStatus:'fullyOpen',safeArea:{left:16,top:20,right:80,bottom:20},regions:[{kind:'division',active:true,frame:{x:460,y:0,width:40,height:740}},{kind:'occlusion',active:true,frame:{x:900,y:32,width:28,height:28}}]});
 const scene=duoSceneLayout(g);assert.ok(scene.panes);clearOf(scene.panes!.leading,g);clearOf(scene.panes!.trailing,g);assert.equal(scene.panes!.leading.x+scene.panes!.leading.width,460);assert.equal(scene.panes!.trailing.x,500);assert.equal(duoSceneLayout(g,false).panes,null,'modals must not span the fold');
 const short=duoSceneLayout({...g,height:240,regions:[{kind:'occlusion',active:true,frame:{x:900,y:24,width:28,height:28}}]});const tabs=duoTabFrame(short,true)!;assert.ok(tabs.height>=44);assert.equal(intersectRects(tabs,short.back!),null);assert.equal(tabs.y+tabs.height,212);
});

test('approved divider follows the actual pane gutter, respects insets and skips occupied hardware',async()=>{
 const {duoSceneLayout,DUO_CHROME}=await import('./duo-layout.ts');
 const g=base({hingeStatus:'fullyOpen',safeArea:{left:16,top:20,right:80,bottom:20},regions:[{kind:'occlusion',active:false,frame:{x:900,y:32,width:28,height:28}}]});
 const scene=duoSceneLayout(g),{leading,trailing}=scene.panes!,divider=scene.divider!;
 assert.ok(divider);assert.equal(divider.x+divider.width/2,(leading.x+leading.width+trailing.x)/2);
 assert.notEqual(divider.x+divider.width/2,g.width/2,'camera column is excluded from pane midpoint');
 assert.equal(divider.y,Math.max(leading.y,trailing.y)+DUO_CHROME.dividerInset);
 assert.equal(divider.y+divider.height,Math.min(leading.y+leading.height,trailing.y+trailing.height)-DUO_CHROME.dividerInset);
 const fold={kind:'division' as const,active:true,frame:{x:460,y:0,width:40,height:740}};
 const occupied=duoSceneLayout({...g,regions:[...g.regions,fold]});assert.ok(occupied.panes);assert.equal(occupied.divider,null,'hardware already divides the panes; do not draw in the hinge');
 assert.ok(duoSceneLayout({...g,regions:[...g.regions,{...fold,active:false}]}).divider);
 for(const hingeStatus of ['closed','partiallyOpen','unknown'] as const)assert.equal(duoSceneLayout({...g,hingeStatus}).divider,null);
 assert.equal(duoSceneLayout({...g,width:740,height:960}).divider,null);assert.equal(duoSceneLayout(g,false).divider,null);
});

test('Today stays above the unchanged camera-column tabs and yields when space is insufficient',async()=>{
 const {duoSceneLayout,duoTabFrame,duoTodayFrame,DUO_CHROME}=await import('./duo-layout.ts');
 for(const [width,height,hingeStatus] of [[390,844,'closed'],[960,740,'fullyOpen'],[740,960,'fullyOpen']] as const){
  const scene=duoSceneLayout(base({width,height,hingeStatus,safeArea:{left:16,top:20,right:80,bottom:20},regions:[{kind:'occlusion',active:hingeStatus==='closed',frame:{x:width-60,y:32,width:28,height:28}}]}));
  const before=duoTabFrame(scene,true)!,today=duoTodayFrame(scene,true)!;assert.ok(today);assert.equal(today.x,before.x);assert.equal(today.width,64);assert.equal(today.y+today.height+DUO_CHROME.gap,before.y+before.height-Math.min(before.height,DUO_CHROME.height));assert.equal(intersectRects(today,scene.back!),null);assert.deepEqual(duoTabFrame(scene,true),before);
 }
 const short=duoSceneLayout(base({height:240}));assert.equal(duoTodayFrame(short,true),null);
});

test('calendar accessories swap: Today above view switch without moving the tabs',async()=>{
 const {duoSceneLayout,duoTodayFrame,duoCalendarViewFrame}=await import('./duo-layout.ts');
 const scene=duoSceneLayout(base({height:844})),today=duoTodayFrame(scene,true,true)!,switcher=duoCalendarViewFrame(scene,true)!;
 assert.ok(switcher);assert.equal(switcher.x,today.x);assert.equal(today.y+today.height+8,switcher.y);assert.equal(intersectRects(switcher,scene.back!),null);
 assert.equal(duoCalendarViewFrame(duoSceneLayout(base({height:240})),true),null);
});
test('Calendar can distribute only the unoccupied bottom safe strip; hardware gaps stay reserved',async()=>{
 const {duoSceneLayout}=await import('./duo-layout.ts');
 const g=base({width:960,height:740,hingeStatus:'fullyOpen',safeArea:{left:16,top:20,right:80,bottom:34}}),scene=duoSceneLayout(g);
 assert.equal(scene.calendarBottomExtension,34);
 const blocked=duoSceneLayout({...g,regions:[...g.regions,{kind:'occlusion',active:true,frame:{x:0,y:720,width:960,height:20}}]});assert.equal(blocked.calendarBottomExtension,0);
 const noBottom=duoSceneLayout({...g,safeArea:{...g.safeArea,bottom:0}});assert.equal(noBottom.calendarBottomExtension,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {revealOffset} from './scroll-reveal.ts';
import {duoDismissFrames,duoSceneLayout,duoTabFrame,intersectRects} from './duo-layout.ts';
test('reveal full inline picker after expansion without changing the viewport',()=>{
 assert.equal(revealOffset(80,100,400,380,260),232);
 assert.equal(revealOffset(232,100,400,228,260),232);
 assert.equal(revealOffset(232,100,400,80,60),200);
 assert.equal(revealOffset(0,100,400,80,60),0);
});
test('oversized region aligns its beginning inside a short viewport',()=>{
 assert.equal(revealOffset(0,100,160,350,220),238);
 assert.equal(revealOffset(40,100,160,112,220),40);
});
test('keyboard is a separate safe control above X on folded, landscape and portrait Duo',()=>{
 for(const [width,height] of [[431,640],[960,540],[740,960],[431,240]]){
  const scene=duoSceneLayout({apiAvailable:true,hasHinge:true,width,height,hingeStatus:width>height?'fullyOpen':'closed',safeArea:{top:20,bottom:20,left:16,right:80},regions:[{kind:'occlusion',active:true,frame:{x:width-60,y:24,width:28,height:28}}]});
  const {back,keyboard}=duoDismissFrames(scene,true,true);assert.ok(back&&keyboard);
  assert.equal(back.x+back.width/2,keyboard.x+keyboard.width/2);assert.equal(back.x+back.width/2,scene.column!.x+32);
  assert.equal(intersectRects(back,keyboard),null);assert.ok(keyboard.y+keyboard.height<back.y);
  for(const f of [back,keyboard]){assert.ok(f.width>=44&&f.height>=44);for(const r of scene.reserved)assert.equal(intersectRects(f,r),null);}
  const tabs=duoTabFrame(scene,true,back.y+back.height);if(tabs)assert.equal(intersectRects(tabs,back),null);
  assert.deepEqual(duoDismissFrames(scene,true,false),{back:scene.back,keyboard:null});
 }
});

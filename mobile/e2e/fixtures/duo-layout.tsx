import {Shell} from '../../App';
import {SafeAreaProvider} from 'react-native-safe-area-context';
// All marker geometry is fixture-only. Product screens never draw a fake camera.
import React,{useEffect,useState} from 'react';
import {View,TextInput,ScrollView,Text,Pressable} from 'react-native';
import {DuoLayoutFrame,useDuoTrailingNavigation} from '../../src/DuoLayout';
import {AppNavigation} from '../../src/AppNavigation';
import type {AppTab} from '../../src/AppNavigation';
import {BackButton} from '../../src/ui';
import type {DuoGeometry} from '../../src/duo-layout';
const {createRoot}=require('react-dom/client') as {createRoot:(element:Element)=>{render:(node:React.ReactNode)=>void}};
const host=globalThis as unknown as {duoFixture:{change:(value:DuoGeometry|null)=>void;setReady:(value:boolean)=>void;mounts:number;unmounts:number;showApp:()=>void}};
host.duoFixture={change:()=>{},setReady:()=>{},mounts:0,unmounts:0,showApp:()=>{}};
function Work(){
 const [draft,setDraft]=useState(''),[tab,setTab]=useState<AppTab>('todos'),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false);const duo=useDuoTrailingNavigation();
 useEffect(()=>{host.duoFixture.mounts++;return()=>{host.duoFixture.unmounts++;};},[]);
 return <View style={{flex:1,minHeight:0}}>
  <View style={{minHeight:48,paddingHorizontal:8}}><Text style={{fontSize:26}}>🦆</Text></View>
  <View testID="full-width-body" style={{flex:1,minHeight:0}}><Text testID="current-tab">{tab==='duck'?'duckduck':tab}</Text><Text testID="editing">{editing?'editing':'closed'}</Text>{editing&&<BackButton onPress={()=>setEditing(false)} disabled={busy}/>}<Pressable onPress={()=>setBusy(value=>!value)}><Text>작업 중 전환</Text></Pressable>
   <Pressable onPress={()=>{setTab('duck');setEditing(true);}}><Text>편집 시작</Text></Pressable><TextInput testID="draft" value={draft} onChangeText={setDraft}/>
   <ScrollView testID="scroll" style={{flex:1,minHeight:0}}>{Array.from({length:100},(_,i)=><Text key={i} style={{height:50}}>행 {i}</Text>)}</ScrollView>
  </View><AppNavigation tab={tab} onSelect={setTab} duo={duo}/>
 </View>;
}
function Fixture(){
 const [geometry,setGeometry]=useState<DuoGeometry|null>(null),[app,setApp]=useState(false),[ready,setReady]=useState(true);host.duoFixture.change=setGeometry;host.duoFixture.showApp=()=>setApp(true);host.duoFixture.setReady=setReady;
 const camera=geometry?.regions.find(r=>r.kind==='occlusion')?.frame;
 return <SafeAreaProvider initialMetrics={{frame:{x:0,y:0,width:960,height:740},insets:{top:0,right:0,bottom:0,left:0}}}><View style={{flex:1,minHeight:0}}>
  {geometry&&camera&&<View pointerEvents="none" style={{position:'absolute',left:geometry.width-geometry.safeArea.right,top:0,bottom:0,width:geometry.safeArea.right,backgroundColor:'#edf8ff'}}/>}
  <DuoLayoutFrame geometry={geometry} enabled={!!geometry} ready={ready}>{app?<Shell/>:<Work/>}</DuoLayoutFrame>
  {camera&&<View pointerEvents="none" testID="fixture-camera-marker" style={{position:'absolute',left:camera.x,top:camera.y,width:camera.width,height:camera.height,borderRadius:camera.width/2,backgroundColor:'#111',zIndex:100}}/>}
 </View></SafeAreaProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);

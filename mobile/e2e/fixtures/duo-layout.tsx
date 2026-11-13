import {Shell} from '../../App';
import {SafeAreaProvider} from 'react-native-safe-area-context';
// Deterministic geometry fixture only; never imported by the production app.
import React,{useEffect,useState} from 'react';
import {View,TextInput,ScrollView,Text,Pressable} from 'react-native';
import {DuoLayoutFrame,useDuoTrailingNavigation} from '../../src/DuoLayout';
import {AppNavigation} from '../../src/AppNavigation';
import type {AppTab} from '../../src/AppNavigation';
import type {DuoGeometry} from '../../src/duo-layout';
const {createRoot}=require('react-dom/client') as {createRoot:(element:Element)=>{render:(node:React.ReactNode)=>void}};
const host=globalThis as unknown as {duoFixture:{change:(value:DuoGeometry|null)=>void;mounts:number;unmounts:number;showApp:()=>void}};
host.duoFixture={change:()=>{},mounts:0,unmounts:0,showApp:()=>{}};
function Work(){
 const [draft,setDraft]=useState(''),[tab,setTab]=useState<AppTab>('todos'),[editing,setEditing]=useState(false);const duo=useDuoTrailingNavigation();
 useEffect(()=>{host.duoFixture.mounts++;return()=>{host.duoFixture.unmounts++;};},[]);
 return <View style={{flex:1,minHeight:0}}>
  <View testID="office-header" style={{minHeight:48,paddingHorizontal:8,gap:4,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{fontSize:26}}>🦆</Text>{duo&&<AppNavigation tab={tab} onSelect={setTab} duo/>}</View>
  <View testID="full-width-body" style={{flex:1,minHeight:0}}><Text testID="current-tab">{tab==='duck'?'duckduck':tab}</Text><Text testID="editing">{editing?'editing':'closed'}</Text>
   <Pressable onPress={()=>{setTab('duck');setEditing(true);}}><Text>편집 시작</Text></Pressable><TextInput testID="draft" value={draft} onChangeText={setDraft}/>
   <ScrollView testID="scroll" style={{flex:1,minHeight:0}}>{Array.from({length:100},(_,i)=><Text key={i} style={{height:50}}>행 {i}</Text>)}</ScrollView>
  </View>{!duo&&<AppNavigation tab={tab} onSelect={setTab} duo={false}/>}
 </View>;
}
function Fixture(){const [geometry,setGeometry]=useState<DuoGeometry|null>(null),[app,setApp]=useState(false);host.duoFixture.change=setGeometry;host.duoFixture.showApp=()=>setApp(true);return <SafeAreaProvider initialMetrics={{frame:{x:0,y:0,width:960,height:740},insets:{top:0,right:0,bottom:0,left:0}}}><DuoLayoutFrame geometry={geometry} enabled={!!geometry}>{app?<Shell/>:<Work/>}</DuoLayoutFrame></SafeAreaProvider>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);

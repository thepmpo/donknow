// Deterministic geometry fixture only. This entry is never imported by the production app.
import React, { useEffect, useState } from 'react';
import { View, TextInput, ScrollView, Text, Pressable } from 'react-native';
import { DuoLayoutFrame, useDuoTrailingNavigation } from '../../src/DuoLayout';
import type { DuoGeometry } from '../../src/duo-layout';
const {createRoot}=require('react-dom/client') as {createRoot:(element:Element)=>{render:(node:React.ReactNode)=>void}};

const host=globalThis as unknown as {duoFixture: {change:(value:DuoGeometry|null)=>void;mounts:number;unmounts:number}};
host.duoFixture={change:()=>{},mounts:0,unmounts:0};
function Work(){
 const [draft,setDraft]=useState(''),[tab,setTab]=useState('Todo'),[editing,setEditing]=useState(false);
 const duo=useDuoTrailingNavigation();
 useEffect(()=>{host.duoFixture.mounts++;return()=>{host.duoFixture.unmounts++;};},[]);
 return <View style={{flex:1,minHeight:0,paddingRight:duo?76:0}}>
  <Text testID="current-tab">{tab}</Text><Text testID="editing">{editing?'editing':'closed'}</Text>
  <Pressable onPress={()=>{setTab('duckduck');setEditing(true);}}><Text>편집 시작</Text></Pressable>
  <TextInput testID="draft" value={draft} onChangeText={setDraft}/>
  <ScrollView testID="scroll" style={{flex:1,minHeight:0}}>{Array.from({length:100},(_,index)=><Text key={index} style={{height:50}}>행 {index}</Text>)}</ScrollView>
  <View testID="navigation" style={duo?{position:'absolute',right:0,top:0,bottom:0,width:76}:{height:60}}><Text>{duo?'right':'bottom'}</Text></View>
 </View>;
}
function Fixture(){const [geometry,setGeometry]=useState<DuoGeometry|null>(null);host.duoFixture.change=setGeometry;return <DuoLayoutFrame geometry={geometry} enabled={!!geometry}><Work/></DuoLayoutFrame>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);

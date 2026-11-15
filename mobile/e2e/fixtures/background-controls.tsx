import React,{useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {DuoLayoutFrame,useDuoTrailingNavigation} from '../../src/DuoLayout';
import type {DuoGeometry} from '../../src/duo-layout';
import {AppNavigation} from '../../src/AppNavigation';
import {useDuoToday} from '../../src/DuoChrome';
import {KeyboardUXProvider,KeyboardDismiss} from '../../src/KeyboardUX';
import {TodoEditorForm,CloseButton,colors} from '../../src/ui';
import {useTodos} from '../../src/useTodos';
import {MotionModal,MotionProvider} from '../../src/motion';
const {createRoot}=require('react-dom/client');const host=globalThis as any;
const counts={today:0,view:0,tab:0,back:0,writes:0};
function Background(){const duo=useDuoTrailingNavigation();useDuoToday('2026-11-15',()=>counts.today++,true,1,{expanded:false,onPress:()=>counts.view++});return <View style={{flex:1,backgroundColor:colors.bg,padding:20}}><Text style={{fontSize:28,color:colors.text}}>캘린더</Text><KeyboardDismiss/><CloseButton onPress={()=>counts.back++}/><AppNavigation duo={duo} tab="calendar" onSelect={()=>counts.tab++}/></View>;}
function Form({close}:{close:()=>void}){const store=useTodos();return store.loading?<View/>:<TodoEditorForm todo={{id:'sample',title:'준비할 일',notes:'작성 중인 메모',dueDate:'2026-11-15',done:false,category:'일상'}} dueDate={null} store={{...store,update:async()=>{counts.writes++;return true;}}} onClose={close}/>;}
function Fixture(){const [geometry,setGeometry]=useState<DuoGeometry|null>(null),[open,setOpen]=useState(false),[nested,setNested]=useState(false),[keyboard,setKeyboard]=useState(false);host.backgroundControls={geometry:setGeometry,open:setOpen,nested:setNested,keyboard:setKeyboard,counts};const frame=(content:React.ReactNode)=><DuoLayoutFrame enabled={!!geometry} geometry={geometry}>{content}</DuoLayoutFrame>;
return <SafeAreaProvider initialMetrics={{frame:{x:0,y:0,width:960,height:740},insets:{top:0,right:0,bottom:0,left:0}}}><KeyboardUXProvider occlusion={keyboard}><View style={{flex:1,minHeight:0}} testID="root-layer">{frame(<><Background/><MotionModal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}><View testID="editor-layer" style={{flex:1,minHeight:0}}>{frame(<><Form close={()=>setOpen(false)}/><MotionModal visible={nested} transparent animationType="fade" onRequestClose={()=>setNested(false)}><View testID="nested-layer" style={{flex:1,minHeight:0}}>{frame(<View style={{flex:1,backgroundColor:colors.scrim,justifyContent:'center',padding:24}}><View style={{backgroundColor:colors.sheet,borderRadius:24,padding:24}}><Text style={{color:colors.text,fontSize:20}}>확인 창</Text><CloseButton onPress={()=>setNested(false)}/></View></View>)}</View></MotionModal></>)}</View></MotionModal></>)}</View></KeyboardUXProvider></SafeAreaProvider>;}
createRoot(document.getElementById('root')).render(<MotionProvider><Fixture/></MotionProvider>);

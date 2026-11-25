import React,{useEffect,useState} from 'react';
import {View,Pressable,Text,RefreshControl} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {MotionProvider} from '../../src/motion';
import {KeyboardUXProvider} from '../../src/KeyboardUX';
import {BrandLoading,BrandMotion} from '../../src/BrandLoading';
import {BrandWordmark} from '../../src/BrandWordmark';
import {Page} from '../../src/ui';
import {CalendarScreen,type CalendarNavigationRequest} from '../../src/screens/CalendarScreen';
import {AppNavigation} from '../../src/AppNavigation';
import {useTodos} from '../../src/useTodos';
const {createRoot}=require('react-dom/client');
function Fixture(){
 const store=useTodos(),[refreshing,setRefreshing]=useState(false),[calendar,setCalendar]=useState(false),[request,setRequest]=useState<CalendarNavigationRequest>();
 useEffect(()=>{void store.connect({mode:'demo'});},[]);
 const cycle=()=>setRequest(old=>({id:(old?.id??0)+1,action:'cycle',scope:'demo'}));
 return <SafeAreaProvider><MotionProvider><KeyboardUXProvider><View style={{flex:1,backgroundColor:'#19202b'}}><View style={{flexDirection:'row',alignItems:'center',gap:12,padding:12}}><BrandLoading size={88}/><BrandWordmark ai style={{fontSize:28,color:'#fff'}}/><BrandMotion size={64} label="메인 브랜드 모션"/></View><Pressable accessibilityRole="button" accessibilityLabel="테스트 새로고침" onPress={()=>setRefreshing(v=>!v)}><Text style={{color:'#fff',padding:10}}>새로고침</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="테스트 캘린더" onPress={()=>setCalendar(true)}><Text style={{color:'#fff',padding:10}}>캘린더</Text></Pressable>{calendar?<CalendarScreen store={store} onAdd={()=>{}} onEdit={()=>{}} navigationRequest={request}/>:<Page testID="fixture-refresh-page" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>setRefreshing(true)}/>}><Text>합성 새로고침 화면</Text></Page>}<AppNavigation tab="calendar" onSelect={()=>{}} onCalendarLongPress={cycle} duo={false}/></View></KeyboardUXProvider></MotionProvider></SafeAreaProvider>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);

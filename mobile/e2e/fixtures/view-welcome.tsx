import {TodoEditor} from '../../src/ui';
import type {Todo} from '../../src/domain';
import {createCalendarEditQueue} from '../../src/calendar-device-queue';
import {createDeviceTodos} from '../../src/todo-device-queue';
import {createCalendarCreateQueue} from '../../src/calendar-create-queue';
import {TodosScreen} from '../../src/screens/TodosScreen';
import {LogScreen} from '../../src/screens/LogScreen';
import React,{useEffect,useRef,useState} from 'react';import {Text,View,useWindowDimensions} from 'react-native';import {SafeAreaProvider} from 'react-native-safe-area-context';
import {listenAssistantEntry} from '../../src/assistant-entry';
import {fakeAppleCalendar} from './fake-apple-calendar';
import {ProfileScreen} from '../../src/screens/ProfileScreen';
import {MotionProvider} from '../../src/motion';import {DuoLayoutFrame} from '../../src/DuoLayout';import {KeyboardUXProvider} from '../../src/KeyboardUX';import {CalendarScreen} from '../../src/screens/CalendarScreen';import {DuckScreen} from '../../src/screens/DuckScreen';import {AppNavigation,type AppTab} from '../../src/AppNavigation';import {useTodos} from '../../src/useTodos';import {DesktopPresentation} from '../../src/DesktopPresentation';
const deviceQueue=createCalendarCreateQueue({
 read:async owner=>sessionStorage.getItem('fixture.calendar.outbox.'+owner),
 write:async(owner,value)=>{sessionStorage.setItem('fixture.calendar.outbox.'+owner,value);},
 clear:async owner=>{sessionStorage.removeItem('fixture.calendar.outbox.'+owner);},
});
const testStorage={
 get:async (key:string)=>sessionStorage.getItem(key),
 set:async(key:string,value:string)=>{sessionStorage.setItem(key,value);},
 remove:async (key:string)=>{sessionStorage.removeItem(key);},
};
const testDeviceTodos=createDeviceTodos(testStorage,async origin=>JSON.parse(sessionStorage.getItem('fixture.offline-user.'+origin)??'null'));
const deviceEditQueue=createCalendarEditQueue(testStorage);
const {createRoot}=require('react-dom/client');
function Work({mode}:{mode:string}){const store=useTodos(new URLSearchParams(location.search).has('deviceTodos')?testDeviceTodos:undefined),sequence=useRef(0),[tab,setTab]=useState<AppTab>('calendar'),[request,setRequest]=useState<any>(),[cycles,setCycles]=useState(0),[keyboard,setKeyboard]=useState(false),[profileRequest,setProfileRequest]=useState<any>();
 const [calendarTicket,setCalendarTicket]=useState<Todo>();
 useEffect(()=>{if(!new URLSearchParams(location.search).has('nativeCalendar'))return;return listenAssistantEntry(entry=>{((globalThis as any).exportedAppleEntries??=[]).push(entry);});},[]);
 const appleDevice=new URLSearchParams(location.search).has('nativeCalendar')?fakeAppleCalendar:undefined;
 const calendarStore=new URLSearchParams(location.search).has('reminderError')?{...store,reminders:{...store.reminders,error:'일정 알림을 모두 갱신하지 못했어요. 이전 예약은 유지해요.'}}:store;
 const nav=(action:'today'|'cycle')=>setRequest({id:++sequence.current,action,scope:store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo'});
 useEffect(()=>{
  if(store.user&&new URLSearchParams(location.search).has('initialWeek'))setRequest({id:++sequence.current,action:'week',
   scope:store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user.id:'demo'});
 },[store.user?.id]);
 const select=(id:AppTab)=>{if(id==='calendar')nav('today');setTab(id);};const cycle=()=>{setCycles(v=>v+1);nav('cycle');setTab('calendar');};
 (globalThis as any).viewWelcomeFixture={showAI:()=>setTab('duck'),showCalendar:()=>setTab('calendar'),showTodos:()=>setTab('todos'),showLog:()=>setTab('log'),keyboard:setKeyboard};
 return <KeyboardUXProvider occlusion={keyboard}><DesktopPresentation.Provider value={mode==='web'}><View style={{flex:1,minHeight:0}}><Text testID="fixture-cycle-count" style={{height:1,fontSize:1}}>{cycles}</Text><View style={[{flex:1,minHeight:0},tab!=='calendar'&&{display:'none'}]}><CalendarScreen syncWhileHidden deviceEditQueue={new URLSearchParams(location.search).has('deviceEdits')?deviceEditQueue:undefined} deviceCreateQueue={new URLSearchParams(location.search).has('deviceQueue')?deviceQueue:undefined} appleDevice={appleDevice} onManageConnections={()=>{setProfileRequest({id:Date.now(),kind:'services'});setTab('profile');}} store={calendarStore} active={tab==='calendar'} navigationRequest={request} onAdd={()=>{}} onEdit={setCalendarTicket}/></View><View style={[{flex:1,minHeight:0},tab!=='duck'&&{display:'none'}]}><DuckScreen store={store} active={tab==='duck'} desktop={mode==='web'} desktopChatRequest={tab==='duck'?1:0} onOpenTodos={()=>{}} onOpenLog={()=>{}} onOpenTodo={()=>{}}/></View>{tab==='todos'&&<TodosScreen store={store}/>} {tab==='log'&&<LogScreen store={store}/>} {tab==='profile'&&<ProfileScreen appleDevice={appleDevice} store={store} request={profileRequest} onConnection={()=>{}}/>}{calendarTicket&&<TodoEditor todo={calendarTicket} dueDate={calendarTicket.dueDate} store={store} onClose={()=>setCalendarTicket(undefined)}/>} {mode!=='web'&&!(keyboard&&mode==='standard')&&<AppNavigation tab={tab} onSelect={select} onCalendarDoublePress={mode==='duo'?undefined:cycle} onCalendarLongPress={mode==='duo'?undefined:cycle} duo={mode==='duo'}/>}</View></DesktopPresentation.Provider></KeyboardUXProvider>;
}
function Fixture(){const {width,height}=useWindowDimensions(),mode=new URLSearchParams(location.search).get('mode')??'duo',geometry={apiAvailable:true,hasHinge:true,width,height,hingeStatus:'closed' as const,safeArea:{top:20,bottom:20,left:16,right:80},regions:[{kind:'occlusion' as const,active:true,frame:{x:width-60,y:32,width:28,height:28}}]};return <SafeAreaProvider><MotionProvider><DuoLayoutFrame enabled={mode==='duo'} geometry={mode==='duo'?geometry:null}><Work mode={mode}/></DuoLayoutFrame></MotionProvider></SafeAreaProvider>;}
createRoot(document.getElementById('root')).render(<Fixture/>);

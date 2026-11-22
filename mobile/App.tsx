import AsyncStorage from '@react-native-async-storage/async-storage';
import {listenAssistantEntry} from './src/assistant-entry';
import type {AssistantChatRequest} from './src/screens/AssistantChat';
import {DuoWorkspace} from './src/DuoWorkspace';
import {configureKeyboardAccessory} from './src/keyboard-done';
import {KeyboardDismiss,KeyboardUXProvider,useKeyboardUX} from './src/KeyboardUX';
import {useDuoScene} from './src/DuoChrome';
import {connectPush,pushPreferenceKey,listenForDuckNotification} from './src/push';
import { DuoSafeSurface, useDuoTrailingNavigation } from './src/DuoLayout';
import {DesktopWorkspace} from './src/DesktopWorkspace';
import {AppNavigation} from './src/AppNavigation';
import type {AppTab} from './src/AppNavigation';
import { MotionProvider, MotionView } from './src/motion';
import { MotionPressable as Pressable } from './src/motion';
import { AuthScreen } from './src/screens/AuthScreen';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTodos } from './src/useTodos';
import { Button, colors, TodoEditor } from './src/ui';
import { typography, layout } from './src/theme';
import { dateKey,type Todo } from './src/domain';
import { TodosScreen } from './src/screens/TodosScreen';
import { CalendarScreen,type CalendarNavigationRequest } from './src/screens/CalendarScreen';
import { DuckScreen } from './src/screens/DuckScreen';
import { LogScreen } from './src/screens/LogScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ConnectionScreen } from './src/screens/ConnectionScreen';
export function Shell({keyboardOccluded,keyboardTop}:{keyboardOccluded?:boolean;keyboardTop?:number|null}={}){return <KeyboardUXProvider occlusion={keyboardOccluded} occlusionTop={keyboardTop}><ShellContent/></KeyboardUXProvider>;}
function ShellContent() {
  const keyboard=useKeyboardUX();
  const store = useTodos();
  const pushAttempt=useRef<string|null>(null);
  useEffect(()=>{if(Platform.OS!=='ios'||!store.user||store.reminders.permission!=='allowed')return;const owner=pushPreferenceKey(store);if(pushAttempt.current===owner)return;pushAttempt.current=owner;let active=true;void AsyncStorage.getItem(owner).then(value=>{if(value===null&&active&&store.isCurrentSession())return connectPush(store);}).catch(()=>{if(active&&store.isCurrentSession())store.setNotice('도착 알림을 연결하지 못했어요. ME → 브리핑·날씨 예약에서 다시 연결할 수 있어요.');});return()=>{active=false;};},[store.user?.id,store.connection?.mode==='cloud'?store.connection.baseUrl:'demo',store.reminders.permission]);
  const insets=useSafeAreaInsets();
  const {width}=useWindowDimensions();
  const duo=useDuoTrailingNavigation();
  const {scene,ready}=useDuoScene();
  useEffect(()=>{if(ready)return configureKeyboardAccessory(duo);},[duo,ready]);
  const split=!!scene?.panes;
  const desktop=Platform.OS==='web'&&!duo;
  const [entry,setEntry]=useState<AssistantChatRequest|null>(null);
  const [tab, setTab] = useState<AppTab>(desktop?'duck':'todos'),[unread,setUnread]=useState(0),[todoTopRequest,setTodoTopRequest]=useState(0);
  const [settings, setSettings] = useState(false);
  const [desktopChatRequest,setDesktopChatRequest]=useState(0);
  const [profileRequest,setProfileRequest]=useState<{id:number;kind:'services'|'briefing'|'overview'}|null>(null);
  const openDesktopChat=()=>{setTab('duck');setDesktopChatRequest(v=>v+1);};
  const openDesktopProfile=(kind:'services'|'briefing')=>{setProfileRequest({id:Date.now(),kind});setTab('profile');};
  const calendarSequence=useRef(0),[calendarNavigation,setCalendarNavigation]=useState<{target:'active'|'fixed';request:CalendarNavigationRequest}|null>(null);
  const calendarScope=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo';
  const requestCalendar=useCallback((action:'today'|'fortnight',target:'active'|'fixed'='active',resetToToday=false)=>setCalendarNavigation({target,request:{id:++calendarSequence.current,action,resetToToday,scope:calendarScope}}),[calendarScope]);
  const selectTab=useCallback((next:AppTab)=>{keyboard.dismiss();if(next==='profile')setProfileRequest(desktop?{id:Date.now(),kind:'overview'}:null);if(next==='calendar'&&(!duo||tab==='calendar'))requestCalendar('today');if(next==='todos'&&tab==='todos')setTodoTopRequest(v=>v+1);setTab(next);},[duo,tab,requestCalendar,desktop]);
  const longPressCalendar=useCallback(()=>{
   const target=duo&&split&&tab!=='calendar'?'fixed':'active';
   requestCalendar('fortnight',target,!duo&&tab!=='calendar');if(target==='active')setTab('calendar');
  },[duo,split,tab,requestCalendar]);

  useEffect(()=>{let active=true;const stop=listenAssistantEntry(value=>{void(async()=>{const files=[];if(store.user)for(const f of value.files??[]){if(!active)return;files.push(await store.featureRequest('/api/agent/files','POST',f) as import('./src/agent').AgentFile);}if(!active)return;setEntry({id:value.id,message:value.message,autoSend:value.autoSend&&!!store.user,files});setTab('duck');})().catch(()=>{if(active)store.setError('전달한 자료를 준비하지 못했어요. 덕 채팅에서 다시 확인해주세요.');});});return()=>{active=false;stop();};},[store.user?.id,calendarScope]);
  useEffect(()=>listenForDuckNotification(()=>setTab('duck')),[]);
  const editorSequence = useRef(0);
  const [editor, setEditor] = useState<{ instance:number; todo?: Todo; date: string | null } | null>(null);
  const onAdd = (date: string | null) => { Keyboard.dismiss();setEditor({ instance:++editorSequence.current, date }); };
  const onEdit = (todo: Todo) => { if(todo.saveState){store.setNotice('저장 결과를 확인하고 있어요. 덕 채팅에서 결과를 확인해주세요.');return;}Keyboard.dismiss();setEditor({ instance:++editorSequence.current, todo, date: todo.dueDate }); };
  const [duckSession, setDuckSession] = useState(0);
  useEffect(() => { setEditor(null);setEntry(null);setDesktopChatRequest(0);setProfileRequest(null);setUnread(0);setCalendarNavigation(null); setDuckSession(current => current + 1); setTab(desktop?'duck':'todos'); }, [store.user?.id, store.connection?.mode, store.connection?.mode === 'cloud' ? store.connection.baseUrl : '']);
  const sessionPending=store.sessionStatus==='restoring'||store.sessionStatus==='unavailable';
  const needsAuth = store.connection?.mode === 'cloud' && !store.user&&!sessionPending;
  const navigationVisible=!!store.connection&&!settings&&!needsAuth;
  const rightPane=scene?.panes?{marginLeft:scene.panes.trailing.x-scene.body.x,width:scene.panes.trailing.width}:null;
  if (store.loading && !store.connection) return <View style={styles.loading}><Text style={{ fontSize: 45 }}>🦆</Text><ActivityIndicator color={colors.blue} style={{ marginTop: 24 }} /></View>;
  return <DesktopWorkspace active={desktop&&navigationVisible} tab={tab} onSelect={selectTab} store={store} disabled={sessionPending} unread={unread} onAdd={()=>onAdd(dateKey(new Date()))} onEdit={onEdit} onChat={openDesktopChat} onServices={()=>openDesktopProfile('services')} onSchedule={()=>openDesktopProfile('briefing')}><KeyboardAvoidingView style={[styles.root,(duo||desktop&&navigationVisible)&&styles.duoRoot]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {!duo&&!desktop&&<View testID="app-brand-header" style={styles.header}><Text accessibilityLabel="덕 오리 마크" style={{fontSize:26}}>🦆</Text><Text style={styles.storage}>{store.connection?.mode==='demo'?'체험 모드':''}</Text>{(!navigationVisible||tab!=='duck'&&tab!=='calendar')&&!editor&&<KeyboardDismiss fallback/>}</View>}
    {duo&&(!navigationVisible||tab!=='duck'&&tab!=='calendar')&&!editor&&<KeyboardDismiss fallback/>}
    {!!store.notice && <View style={[styles.errorBar,{backgroundColor:'#edf4ff'},rightPane]}><Text accessibilityLiveRegion="polite" style={[styles.error,{color:colors.blue}]}>{store.notice}</Text><Pressable style={styles.retry} accessibilityRole="button" accessibilityLabel="안내 닫기" onPress={()=>store.setNotice('')}><Text style={{color:colors.blue}}>×</Text></Pressable></View>}
    {!!store.error && !sessionPending && (tab!=='calendar'||split) && <View style={[styles.errorBar,rightPane]}><Text accessibilityRole="alert" style={styles.error}>{store.error}</Text>{store.connection && <Pressable accessibilityRole="button" accessibilityLabel="데이터 다시 불러오기" onPress={() => { void store.refresh(); }} style={styles.retry}><Text style={{ color: colors.blue, fontSize: 11 }}>다시 시도</Text></Pressable>}</View>}
    <MotionView variant="navigation" initial={false} disabled={split} testID="screen-transition" style={[styles.content]} transitionKey={!store.connection ? 'connection' : settings ? 'settings' : sessionPending?'restoring':needsAuth ? 'auth' : split?'duo-split':tab}><DuoWorkspace enabled={navigationVisible&&!sessionPending} fixed={<CalendarScreen fixedPane navigationRequest={calendarNavigation?.target==='fixed'?calendarNavigation.request:undefined} key={`${store.connection?.mode}-${store.connection?.mode==='cloud'?store.connection.baseUrl:''}-${store.user?.id??'demo'}`} store={store} active={navigationVisible&&!sessionPending&&split} onAdd={onAdd} onEdit={onEdit}/>}>{!store.connection || settings ? <ConnectionScreen store={store} onDone={store.connection ? () => { setSettings(false); setDuckSession(current => current + 1); } : undefined} /> : sessionPending ? <View testID="session-restoration" style={styles.loading}><Text style={{fontSize:45}}>🦆</Text><Text accessibilityLiveRegion="polite" style={{color:colors.secondary,marginTop:20}}>{store.sessionStatus==='restoring'?'로그인을 확인하고 있어요.':'연결을 확인하지 못했어요.'}</Text>{store.sessionStatus==='restoring'?<ActivityIndicator color={colors.blue} style={{marginTop:16}}/>:<View style={{padding:24,gap:16}}><Text accessibilityRole="alert" style={{color:colors.muted}}>{store.error}</Text><Button title="연결 다시 확인" onPress={()=>void store.retrySession()}/></View>}</View> : needsAuth ? <AuthScreen store={store} onSettings={() => setSettings(true)} /> : <MotionView variant="navigation" testID="active-screen-transition" disabled={!split} transitionKey={tab} distance={0} style={styles.content}>
      <View style={[styles.content,tab!=='calendar'&&styles.hidden]} accessibilityElementsHidden={tab!=='calendar'} importantForAccessibility={tab==='calendar'?'auto':'no-hide-descendants'}><CalendarScreen navigationRequest={calendarNavigation?.target==='active'?calendarNavigation.request:undefined} key={`${store.connection?.mode}-${store.connection?.mode==='cloud'?store.connection.baseUrl:''}-${store.user?.id??'demo'}`} store={store} active={tab==='calendar'} onAdd={onAdd} onEdit={onEdit}/></View>
      <View style={[styles.content,tab!=='todos'&&styles.hidden]} accessibilityElementsHidden={tab!=='todos'} importantForAccessibility={tab==='todos'?'auto':'no-hide-descendants'} aria-hidden={tab!=='todos'}><TodosScreen store={store} active={tab==='todos'} scrollToTopRequest={todoTopRequest}/></View>
      <View style={[styles.content, tab !== 'duck' && styles.hidden]} accessibilityElementsHidden={tab !== 'duck'} importantForAccessibility={tab !== 'duck' ? 'no-hide-descendants' : 'auto'}><DuckScreen desktop={desktop} desktopChatRequest={desktopChatRequest} key={`${duckSession}-${store.user?.id ?? 'demo'}`} store={store} entry={entry} active={tab==='duck'} onUnreadChange={setUnread} onOpenTodos={() => selectTab('todos')} onOpenLog={() => selectTab('log')} onOpenTodo={onEdit} /></View>
      {tab === 'log' && <LogScreen store={store} />}
      {tab === 'profile' && <ProfileScreen request={profileRequest} store={store} onOpenTodos={()=>selectTab('todos')} onConnection={() => setSettings(true)} />}
    </MotionView>}</DuoWorkspace></MotionView>
    {navigationVisible && !desktop && (duo||!keyboard.occluding) && <AppNavigation tab={tab} onSelect={selectTab} onCalendarLongPress={longPressCalendar} unread={unread} disabled={sessionPending} duo={duo} bottomInset={insets.bottom} small={width<360}/>}
    {editor && !needsAuth && !settings && <TodoEditor key={editor.instance} todo={editor.todo} dueDate={editor.date} store={store} onClose={() => setEditor(current=>current?.instance===editor.instance?null:current)} />}
  </KeyboardAvoidingView></DesktopWorkspace>;
}
export default function App() { return <MotionProvider><SafeAreaProvider><SafeAreaView edges={[]} style={styles.safe}><StatusBar style="auto" /><DuoSafeSurface workspace><Shell /></DuoSafeSurface></SafeAreaView></SafeAreaProvider></MotionProvider>; }
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, root: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', backgroundColor: colors.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { minHeight: layout.headerHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: layout.pageInset, paddingVertical: 4, gap: 12 },
  brand: { ...typography.body, color: colors.text, fontWeight: '700', flexShrink: 1 }, storage: { ...typography.caption, color: colors.muted, flexShrink: 1, textAlign: 'right' },
  content: { flex: 1, minHeight: 0 }, hidden: { display: 'none' },
  duoRoot:{maxWidth:'100%'},duoHeader:{paddingHorizontal:8,gap:4},
  errorBar: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: colors.surface, flexDirection: 'row', gap: 12, alignItems: 'center' },
  error: { ...typography.caption, flex: 1, color: colors.danger }, retry: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
});

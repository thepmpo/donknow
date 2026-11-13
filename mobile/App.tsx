import {listenForDuckNotification} from './src/push';
import { DuoSafeSurface, useDuoTrailingNavigation } from './src/DuoLayout';
import {AppNavigation} from './src/AppNavigation';
import type {AppTab} from './src/AppNavigation';
import { MotionProvider, MotionView } from './src/motion';
import { MotionPressable as Pressable } from './src/motion';
import { AuthScreen } from './src/screens/AuthScreen';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTodos } from './src/useTodos';
import { colors, TodoEditor } from './src/ui';
import { typography, layout } from './src/theme';
import type { Todo } from './src/domain';
import { TodosScreen } from './src/screens/TodosScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { DuckScreen } from './src/screens/DuckScreen';
import { LogScreen } from './src/screens/LogScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ConnectionScreen } from './src/screens/ConnectionScreen';
export function Shell() {
  const store = useTodos();
  const insets=useSafeAreaInsets();
  const {width}=useWindowDimensions();
  const duo=useDuoTrailingNavigation();
  const [tab, setTab] = useState<AppTab>('todos'),[unread,setUnread]=useState(0);
  const [settings, setSettings] = useState(false);
  useEffect(()=>listenForDuckNotification(()=>setTab('duck')),[]);
  const editorSequence = useRef(0);
  const [editor, setEditor] = useState<{ instance:number; todo?: Todo; date: string | null } | null>(null);
  const onAdd = (date: string | null) => setEditor({ instance:++editorSequence.current, date });
  const onEdit = (todo: Todo) => setEditor({ instance:++editorSequence.current, todo, date: todo.dueDate });
  const [duckSession, setDuckSession] = useState(0);
  useEffect(() => { setEditor(null);setUnread(0); setDuckSession(current => current + 1); setTab('todos'); }, [store.user?.id, store.connection?.mode, store.connection?.mode === 'cloud' ? store.connection.baseUrl : '']);
  const needsAuth = store.connection?.mode === 'cloud' && !store.user;
  const navigationVisible=!!store.connection&&!settings&&!needsAuth;
  if (store.loading && !store.connection) return <View style={styles.loading}><Text style={{ fontSize: 45 }}>🦆</Text><ActivityIndicator color={colors.blue} style={{ marginTop: 24 }} /></View>;
  return <KeyboardAvoidingView style={[styles.root,duo&&styles.duoRoot]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[styles.header,duo&&navigationVisible&&styles.duoHeader]}><Text accessibilityLabel="덕 오리 마크" style={{fontSize:26}}>🦆</Text><Text style={styles.storage}>{store.connection?.mode==='demo'?'체험 모드':''}</Text></View>
    {!!store.notice && <View style={[styles.errorBar,{backgroundColor:'#edf4ff'},duo&&navigationVisible&&styles.duoControls]}><Text accessibilityLiveRegion="polite" style={[styles.error,{color:colors.blue}]}>{store.notice}</Text><Pressable style={styles.retry} accessibilityRole="button" accessibilityLabel="안내 닫기" onPress={()=>store.setNotice('')}><Text style={{color:colors.blue}}>×</Text></Pressable></View>}
    {!!store.error && <View style={[styles.errorBar,duo&&navigationVisible&&styles.duoControls]}><Text accessibilityRole="alert" style={styles.error}>{store.error}</Text>{store.connection && <Pressable accessibilityRole="button" accessibilityLabel="데이터 다시 불러오기" onPress={() => { void store.refresh(); }} style={styles.retry}><Text style={{ color: colors.blue, fontSize: 11 }}>다시 시도</Text></Pressable>}</View>}
    <MotionView testID="screen-transition" style={[styles.content,duo&&navigationVisible&&styles.duoControls]} transitionKey={!store.connection ? 'connection' : settings ? 'settings' : needsAuth ? 'auth' : tab}>{!store.connection || settings ? <ConnectionScreen store={store} onDone={store.connection ? () => { setSettings(false); setDuckSession(current => current + 1); } : undefined} /> : needsAuth ? <AuthScreen store={store} onSettings={() => setSettings(true)} /> : <View style={styles.content}>
      {tab === 'calendar' && <CalendarScreen store={store} onAdd={onAdd} onEdit={onEdit} />}
      {tab === 'todos' && <TodosScreen store={store} onEdit={onEdit} onAdd={onAdd} />}
      <View style={[styles.content, tab !== 'duck' && styles.hidden]} accessibilityElementsHidden={tab !== 'duck'} importantForAccessibility={tab !== 'duck' ? 'no-hide-descendants' : 'auto'}><DuckScreen key={`${duckSession}-${store.user?.id ?? 'demo'}`} store={store} active={tab==='duck'} onUnreadChange={setUnread} onOpenTodos={() => setTab('todos')} onOpenTodo={onEdit} /></View>
      {tab === 'log' && <LogScreen store={store} />}
      {tab === 'profile' && <ProfileScreen store={store} onConnection={() => setSettings(true)} />}
    </View>}</MotionView>
    {navigationVisible && <AppNavigation tab={tab} onSelect={setTab} unread={unread} duo={duo} bottomInset={insets.bottom} small={width<360}/>}
    {editor && !needsAuth && !settings && <TodoEditor key={editor.instance} todo={editor.todo} dueDate={editor.date} store={store} onClose={() => setEditor(current=>current?.instance===editor.instance?null:current)} />}
  </KeyboardAvoidingView>;
}
export default function App() { return <MotionProvider><SafeAreaProvider><SafeAreaView edges={['top','left','right']} style={styles.safe}><StatusBar style="dark" /><DuoSafeSurface><Shell /></DuoSafeSurface></SafeAreaView></SafeAreaProvider></MotionProvider>; }
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, root: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', backgroundColor: colors.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { minHeight: layout.headerHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: layout.pageInset, paddingVertical: 4, gap: 12 },
  brand: { ...typography.body, color: colors.text, fontWeight: '700', flexShrink: 1 }, storage: { ...typography.caption, color: colors.muted, flexShrink: 1, textAlign: 'right' },
  content: { flex: 1, minHeight: 0 }, hidden: { display: 'none' },
  duoRoot:{maxWidth:'100%'},duoHeader:{paddingLeft:8,paddingRight:layout.duoControlInset,gap:4},duoControls:{paddingRight:layout.duoControlInset},
  errorBar: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff0f2', flexDirection: 'row', gap: 12, alignItems: 'center' },
  error: { ...typography.caption, flex: 1, color: colors.danger }, retry: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
});

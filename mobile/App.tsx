import {BlurView} from 'expo-blur';
import { MotionProvider, MotionView } from './src/motion';
import { MotionPressable as Pressable } from './src/motion';
import { AuthScreen } from './src/screens/AuthScreen';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTodos } from './src/useTodos';
import { colors, TodoEditor } from './src/ui';
import { typography, palette } from './src/theme';
import type { Todo } from './src/domain';
import { TodosScreen } from './src/screens/TodosScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { DuckScreen } from './src/screens/DuckScreen';
import { LogScreen } from './src/screens/LogScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ConnectionScreen } from './src/screens/ConnectionScreen';
const tabs = [
  { id: 'calendar', name: '캘린더', icon: 'calendar-outline' },
  { id: 'todos', name: 'Todo 리스트', icon: 'checkmark-circle-outline' },
  { id: 'duck', name: 'duckduck', icon: 'chatbubble-outline' },
  { id: 'log', name: 'log', icon: 'time-outline' },
  { id: 'profile', name: '내정보', icon: 'person-outline' },
] as const;
type Tab = typeof tabs[number]['id'];
function Shell() {
  const store = useTodos();
  const [tab, setTab] = useState<Tab>('todos');
  const [settings, setSettings] = useState(false);
  const editorSequence = useRef(0);
  const [editor, setEditor] = useState<{ instance:number; todo?: Todo; date: string | null } | null>(null);
  const onAdd = (date: string | null) => setEditor({ instance:++editorSequence.current, date });
  const onEdit = (todo: Todo) => setEditor({ instance:++editorSequence.current, todo, date: todo.dueDate });
  const [duckSession, setDuckSession] = useState(0);
  useEffect(() => { setEditor(null); setDuckSession(current => current + 1); setTab('todos'); }, [store.user?.id, store.connection?.mode, store.connection?.mode === 'cloud' ? store.connection.baseUrl : '']);
  const needsAuth = store.connection?.mode === 'cloud' && !store.user;
  if (store.loading && !store.connection) return <View style={styles.loading}><Text style={{ fontSize: 45 }}>🦆</Text><ActivityIndicator color={colors.blue} style={{ marginTop: 24 }} /></View>;
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.header}><Text style={styles.brand}>{'duckduck'}</Text><Text style={styles.storage}>{store.connection?.mode==='demo'?'체험 모드':''}</Text></View>
    {!!store.notice && <View style={[styles.errorBar,{backgroundColor:'#edf4ff'}]}><Text accessibilityLiveRegion="polite" style={[styles.error,{color:colors.blue}]}>{store.notice}</Text><Pressable style={styles.retry} accessibilityRole="button" accessibilityLabel="안내 닫기" onPress={()=>store.setNotice('')}><Text style={{color:colors.blue}}>×</Text></Pressable></View>}
    {!!store.error && <View style={styles.errorBar}><Text accessibilityRole="alert" style={styles.error}>{store.error}</Text>{store.connection && <Pressable accessibilityRole="button" accessibilityLabel="데이터 다시 불러오기" onPress={() => { void store.refresh(); }} style={styles.retry}><Text style={{ color: colors.blue, fontSize: 11 }}>다시 시도</Text></Pressable>}</View>}
    <MotionView testID="screen-transition" style={styles.content} transitionKey={!store.connection ? 'connection' : settings ? 'settings' : needsAuth ? 'auth' : tab}>{!store.connection || settings ? <ConnectionScreen store={store} onDone={store.connection ? () => { setSettings(false); setDuckSession(current => current + 1); } : undefined} /> : needsAuth ? <AuthScreen store={store} onSettings={() => setSettings(true)} /> : <View style={styles.content}>
      {tab === 'calendar' && <CalendarScreen store={store} onAdd={onAdd} onEdit={onEdit} />}
      {tab === 'todos' && <TodosScreen store={store} onEdit={onEdit} onAdd={onAdd} />}
      <View style={[styles.content, tab !== 'duck' && styles.hidden]} accessibilityElementsHidden={tab !== 'duck'} importantForAccessibility={tab !== 'duck' ? 'no-hide-descendants' : 'auto'}><DuckScreen key={`${duckSession}-${store.user?.id ?? 'demo'}`} store={store} onOpenTodos={() => setTab('todos')} onOpenTodo={onEdit} /></View>
      {tab === 'log' && <LogScreen store={store} />}
      {tab === 'profile' && <ProfileScreen store={store} onConnection={() => setSettings(true)} />}
    </View>}</MotionView>
    {store.connection && !settings && !needsAuth && <BlurView intensity={65} tint="light" style={styles.tabBar} accessibilityRole="tablist">{tabs.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.name} accessibilityState={{ selected: item.id === tab }} onPress={() => setTab(item.id)} style={styles.tab}>{item.id === 'duck' ? <Text style={styles.duckTab}>🦆</Text> : <Ionicons name={item.icon} size={24} color={item.id === tab ? colors.blue : palette.grey500} />}<Text style={[styles.tabLabel, item.id === tab && styles.selected]}>{item.name}</Text></Pressable>)}</BlurView>}
    {editor && !needsAuth && !settings && <TodoEditor key={editor.instance} todo={editor.todo} dueDate={editor.date} store={store} onClose={() => setEditor(current=>current?.instance===editor.instance?null:current)} />}
  </KeyboardAvoidingView>;
}
export default function App() { return <MotionProvider><SafeAreaProvider><SafeAreaView style={styles.safe}><StatusBar style="dark" /><Shell /></SafeAreaView></SafeAreaProvider></MotionProvider>; }
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, root: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', backgroundColor: colors.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12, gap: 12 },
  brand: { ...typography.body, color: colors.text, fontWeight: '700', flexShrink: 1 }, storage: { ...typography.caption, color: colors.muted, flexShrink: 1, textAlign: 'right' },
  content: { flex: 1, minHeight: 0 }, hidden: { display: 'none' },
  tabBar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius:24, overflow:'hidden', borderWidth:1, borderColor:'rgba(180,190,205,0.3)', marginHorizontal:8, marginBottom:4, paddingTop: 8, paddingBottom: 6 },
  tab: { flex: 1, minHeight: 58, paddingHorizontal: 2, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabLabel: { fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' }, selected: { color: colors.blueText, fontWeight: '600' }, duckTab: { fontSize: 24, lineHeight: 28 },
  errorBar: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff0f2', flexDirection: 'row', gap: 12, alignItems: 'center' },
  error: { ...typography.caption, flex: 1, color: colors.danger }, retry: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
});

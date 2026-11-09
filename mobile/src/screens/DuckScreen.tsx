import {pasteTodos} from '../paste-todos';
import {TodaySheet} from './TodaySheet';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ScreenHeading} from '../ScreenHeading';
import {layout} from '../theme';
import {AssistantSheet} from './AssistantSheet';
import {NotesField} from '../NotesField';
import { DraggableSheet, MotionView, useReducedMotion } from '../motion';
import { MotionPressable as Pressable, MotionModal as Modal } from '../motion';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RecordSearchSheet } from './RecordSearchSheet';
import type { Todo } from '../domain';
import { dateKey } from '../domain';
import type { TodoStore } from '../useTodos';
import { typography } from '../theme';
import { CloseButton, Button, colors, DateField } from '../ui';
type Card = { id: number; title: string; notes: string; dueDate: string | null; saved: boolean; saving: boolean };
export function DuckScreen({ store, onOpenTodos, onOpenTodo }: { store: TodoStore; onOpenTodos: () => void; onOpenTodo: (todo: Todo) => void }) {
  const reduced = useReducedMotion();
  const insets=useSafeAreaInsets();
  const searchSequence=useRef(0);
  const [searching, setSearching] = useState<number|null>(null);
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [assistantMessage,setAssistantMessage]=useState('');
  const [assistantPaste,setAssistantPaste]=useState('');
  const [todayOpen,setTodayOpen]=useState(false);
  const [assistantEnabled,setAssistantEnabled]=useState(false);
  useEffect(()=>{let active=true;setAssistantEnabled(false);if(store.user&&store.connection?.mode==='cloud')void store.featureRequest('/api/assistant/status').then(value=>{if(active)setAssistantEnabled(!!(value as {enabled?:boolean}).enabled);}).catch(()=>{});return()=>{active=false;};},[store.user?.id,store.connection?.mode]);
  const [input, setInput] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [status, setStatus] = useState('');
  const [pasting, setPasting] = useState(false);
  const [conversation, setConversation] = useState('');
  const [task, setTask] = useState('');
  const [pasteHint,setPasteHint]=useState('');
  const scrollOnNextContent=useRef(false);
  function closePaste() { setPasting(false); setConversation(''); setTask('');setPasteHint(''); }
  function prepareTask() {
    if (!task.trim()) return;
    scrollOnNextContent.current=true;
    setCards(current => [...current, { id: Date.now() + Math.random(), title: task.trim(), dueDate: dateKey(new Date()), notes: '', saved: false, saving: false }]);
    closePaste(); setStatus('할 일과 날짜를 확인하고 Todo 리스트에 추가해주세요.');
  }
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const savingIds = useRef(new Set<number>());
  function send() {
    const title = input.trim(); if (!title) return;
    if(assistantEnabled){setAssistantPaste('');setAssistantMessage(title);setAssistantOpen(true);setInput('');return;}
    scrollOnNextContent.current=true;
    setCards(current => [...current, { id: Date.now() + Math.random(), title, dueDate: dateKey(new Date()), notes: '', saved: false, saving: false }]); setInput(''); setStatus('');
  }
  function change(id: number, patch: Partial<Card>) { setCards(current => current.map(card => card.id === id ? { ...card, ...patch } : card)); }
  async function transfer(card: Card) {
    if (card.saved || savingIds.current.has(card.id)) return;
    savingIds.current.add(card.id); change(card.id, { saving: true });
    try {
      const todo = await store.add({ title: card.title, notes: card.notes, dueDate: card.dueDate, category: '일상' });
      if (todo) { change(card.id, { saved: true }); setStatus('Todo 리스트에 추가했어요.'); }
      else setStatus('추가하지 못했어요. 연결과 날짜를 확인하고 다시 시도해주세요.');
    } finally { savingIds.current.delete(card.id); change(card.id, { saving: false }); }
  }
  return <View style={[styles.screen,{paddingBottom:layout.navigationHeight+insets.bottom+layout.pageTop}]}><ScreenHeading embedded title="덕"/>
    {!cards.length ? <View style={styles.welcome}><Text style={styles.duck}>🦆</Text><Text style={styles.greeting}>무엇을 도와드릴까요?</Text><Text style={styles.welcomeNote}>떠오른 일을 편하게 적어주세요.</Text></View> : <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} ref={scroll} contentContainerStyle={styles.conversation} keyboardShouldPersistTaps="handled" onContentSizeChange={() => {if(scrollOnNextContent.current){scrollOnNextContent.current=false;scroll.current?.scrollToEnd({animated:!reduced});}}}>
      {cards.map(card => <MotionView key={card.id} style={styles.card}><View style={styles.cardHeading}><Text style={styles.cardLabel}>{card.saved ? 'Todo에 담았어요' : '할 일로 정리하기'}</Text>{!card.saved && <Pressable accessibilityRole="button" accessibilityLabel="초안 버리기" disabled={card.saving} onPress={() => { setCards(current => current.filter(item => item.id !== card.id)); setStatus(''); }} style={styles.dismiss}><Text style={styles.cardLabel}>버리기</Text></Pressable>}</View>{card.saved ? <Text style={styles.cardTitle}>{card.title}</Text> : <TextInput accessibilityLabel="정리한 할 일" value={card.title} onChangeText={title => change(card.id, { title })} editable={!card.saving} maxLength={120} multiline style={styles.draftInput} placeholder="할 일을 적어주세요" />}{!card.saved && <DateField value={card.dueDate} onChange={dueDate => { if (!card.saving) change(card.id, { dueDate }); }} />}{!card.saved&&<NotesField label="초안 메모" value={card.notes} onChange={notes=>change(card.id,{notes})} disabled={card.saving}/>}{card.saved&&!!card.notes&&<Text style={styles.status}>{card.notes}</Text>}<Button title={card.saved ? '추가 완료 ✓' : card.saving ? '추가 중…' : 'Todo 리스트에 추가'} loading={card.saving} onPress={() => { void transfer(card); }} disabled={card.saved || card.saving || !card.title.trim() || store.busyIds.includes('create')} />{card.saved && <Button title="Todo 보기 →" quiet onPress={onOpenTodos} />}</MotionView>)}
    </ScrollView>}
    {!!status && <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text>}
    <View style={styles.shortcuts}><Pressable accessibilityRole="button" accessibilityLabel="오늘의 브리핑 열기" onPress={()=>setTodayOpen(true)} style={styles.shortcut}><Text style={styles.shortcutText}>오늘 브리핑</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="덕 AI 비서 열기" onPress={()=>{setAssistantPaste('');setAssistantMessage('');setAssistantOpen(true);}} style={styles.shortcut}><Text style={styles.shortcutText}>비서</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="할 일과 기록 찾기" onPress={() => setSearching(++searchSequence.current)} style={styles.shortcut}><Text style={styles.shortcutText}>기록 찾기</Text></Pressable><Text style={styles.cardLabel}>·</Text><Pressable accessibilityRole="button" accessibilityLabel="카카오톡 대화 붙여넣기" onPress={() => setPasting(true)} style={styles.shortcut}><Text style={styles.shortcutText}>대화 붙여넣기</Text></Pressable></View>
    {todayOpen&&<TodaySheet store={store} onClose={()=>setTodayOpen(false)}/>}
    {assistantOpen&&<AssistantSheet pastedText={assistantPaste} initialMessage={assistantMessage} store={store} onClose={()=>{setAssistantOpen(false);setAssistantPaste('');}} onOpenTodos={onOpenTodos}/>}
    {searching && <RecordSearchSheet key={searching} store={store} onClose={() => setSearching(current=>current===searching?null:current)} onOpenTodo={onOpenTodo} />}
    <Modal visible={pasting} transparent animationType="slide" onRequestClose={closePaste}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><DraggableSheet visible={pasting} style={styles.sheet} onDismiss={closePaste}><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
        <View style={styles.cardHeading}><Text style={styles.cardTitle}>대화에서 할 일 만들기</Text><CloseButton onPress={closePaste}/></View>
        <Text style={styles.status}>어떤 서비스의 글이든 붙여넣어주세요. 목록은 초안으로 나누고, 대화는 AI에 동의한 뒤 분석할 수 있어요.</Text>
        <TextInput accessibilityLabel="복사한 카카오톡 대화" value={conversation} onChangeText={setConversation} multiline maxLength={10000} placeholder="길게 눌러 대화 붙여넣기" style={styles.pasteInput} />
        <Button title="목록에서 할 일 초안 나누기" disabled={!conversation.trim()} quiet onPress={()=>{const titles=pasteTodos(conversation);if(!titles.length){setPasteHint('추출할 목록을 찾지 못했어요. 직접 정리하거나 AI 분석을 이용해주세요.');return;}scrollOnNextContent.current=true;setCards(current=>[...current,...titles.map(title=>({id:Date.now()+Math.random(),title,notes:'',dueDate:null,saved:false,saving:false}))]);closePaste();setStatus('최대 20개 목록을 초안으로 나눴어요. 제목과 날짜를 확인하고 필요한 항목만 추가해주세요.');}}/>
        <Text accessibilityLiveRegion="polite" style={styles.status}>{pasteHint}</Text>
        <Text style={styles.status}>줄 앞 - 또는 번호, 빈 체크박스 목록을 최대 20개 추출해요. 완료 체크는 제외하고 날짜는 직접 확인해요. 일반 문장은 아래에서 직접 정리하거나 AI로 분석해주세요.</Text>
        {assistantEnabled&&<Button title="붙여넣은 내용 AI 분석 준비" disabled={!conversation.trim()} quiet onPress={()=>{setAssistantPaste(conversation);setAssistantMessage('붙여넣은 내용에서 미완료 할 일을 개별 Todo 초안으로 제안해줘. 완료 기록과 기존 Todo는 제외하고 날짜가 불명확하면 null로 남겨줘.');closePaste();setAssistantOpen(true);}}/>}
        <TextInput accessibilityLabel="대화에서 정리한 할 일" value={task} onChangeText={setTask} maxLength={120} placeholder="예: 금요일까지 회의 자료 보내기" style={styles.pasteInput} />
        <Text style={styles.status}>대화 원문은 이 화면에서만 사용하며 닫으면 지워져요. Todo에는 확인한 할 일만 저장돼요.</Text>
        <Button title="할 일 확인하기" disabled={!task.trim()} onPress={prepareTask} />
      </ScrollView></DraggableSheet></KeyboardAvoidingView>
    </Modal>
    <View style={styles.composer}><TextInput accessibilityLabel="덕에게 이야기하기" value={input} onChangeText={setInput} maxLength={120} placeholder="덕에게 이야기하기" placeholderTextColor={colors.muted} style={styles.input} onSubmitEditing={send} returnKeyType="send" /><Pressable accessibilityRole="button" accessibilityLabel="덕에게 보내기" disabled={!input.trim()} onPress={send} style={[styles.send, !input.trim() && { opacity: .4 }]}><Text style={styles.sendText}>↑</Text></Pressable></View>
    <Text style={styles.note}>직접 적어 Todo로 담거나, 비서에서 연결한 자료로 요청해보세요.</Text>
  </View>;
}
const styles = StyleSheet.create({
  shortcuts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }, shortcut: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }, shortcutText: { ...typography.caption, color: colors.muted },
  welcomeNote: { ...typography.detail, color: colors.muted, marginTop: 12, textAlign: 'center' },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, dismiss: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  draftInput: { ...typography.body, color: colors.text, minHeight: 56, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }, sheet: { maxHeight: '90%', backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  pasteInput: { ...typography.detail, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, color: colors.text, minHeight: 64, backgroundColor: colors.surface },
  screen: { flex: 1, paddingTop:layout.pageTop,paddingHorizontal: layout.pageInset, paddingBottom: 16 }, welcome: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 32, minHeight: 200 },
  duck: { fontSize: 56, marginBottom: 24 }, greeting: { ...typography.heading, color: colors.text, textAlign: 'center' },
  conversation: { paddingVertical: 24, gap: 20 }, card: { borderRadius: 24, padding: 24, backgroundColor: colors.surface, gap: 12 },
  cardLabel: { ...typography.caption, color: colors.muted }, cardTitle: { ...typography.body, color: colors.text, fontWeight: '600' }, status: { ...typography.caption, color: colors.muted, paddingVertical: 12 },
  composer: { backgroundColor: colors.grouped, borderRadius: 24, padding: 8, paddingLeft: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }, input: { ...typography.body, flex: 1, color: colors.text, paddingVertical: 12, paddingHorizontal: 4, minHeight: 48 },
  send: { width: 44, height: 44, backgroundColor: colors.blue, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }, sendText: { color: colors.white, fontSize: 26 }, note: { ...typography.caption, color: colors.muted, textAlign: 'center', marginTop: 12 },
});

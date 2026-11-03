import {NotesField} from './NotesField';
import { DraggableSheet, MotionView, useReducedMotion, useModalDismiss, motion } from './motion';
import { MotionPressable as Pressable, MotionModal as Modal } from './motion';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, ScrollView, StyleSheet, Text, TextInput, View, Switch, Keyboard, KeyboardAvoidingView, Share, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { dateKey, validateDraft } from './domain';
import type { Draft, Todo } from './domain';
import type { TodoStore } from './useTodos';
import { colors, typography, spacing, radius } from './theme';
export { colors } from './theme';
export function Label({ children }: { children: React.ReactNode }) { return <Text style={s.label}>{children}</Text>; }
export function Button({ title, onPress, disabled = false, quiet = false, loading = false, accessibilityLabel }: { title: string; onPress: () => void; disabled?: boolean; quiet?: boolean; loading?: boolean; accessibilityLabel?: string }) {
  const reduced = useReducedMotion();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [s.button, quiet && s.quietButton, { opacity: disabled ? .4 : pressed ? .75 : 1 }]}>{loading && !reduced && <ActivityIndicator color={quiet ? colors.blueText : colors.white} size="small" />}<Text style={[s.buttonText, quiet && { color: colors.blueText }]}>{title}</Text></Pressable>;
}
export function CloseButton({onPress,disabled=false}:{onPress:()=>void;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel="닫기" disabled={disabled} onPress={onPress} style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center',opacity:disabled ? 0.4 : 1}}><Text style={{fontSize:24,lineHeight:28,color:colors.muted}}>×</Text></Pressable>;
}
export function Page({ children, refreshControl, compact = false }: { children: React.ReactNode; refreshControl?: React.ReactElement; compact?: boolean }) {
  return <MotionView style={{flex:1}} distance={0}><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={refreshControl} contentContainerStyle={[s.page,compact&&{paddingTop:16}]}>{children}</ScrollView></MotionView>;
}
export function TodoRow({ todo, pending = false, pendingUntil, busy = false, canToggleWhileBusy = false, onToggle, onEdit, log = false }: { todo: Todo; pending?: boolean; pendingUntil?: number; busy?: boolean; canToggleWhileBusy?: boolean; onToggle: () => void; onEdit?: () => void; log?: boolean }) {
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced); reducedRef.current = reduced;
  const exit = useRef(new Animated.Value(1)).current;
  const rowHeight = useRef(60);
  const [collapsing, setCollapsing] = useState(false);
  useEffect(() => {
    exit.stopAnimation(); exit.setValue(1); setCollapsing(false);
    if (!pending || !pendingUntil || reduced) return;
    const remaining = Math.max(0, pendingUntil - Date.now());
    const duration = Math.min(motion.feedback, remaining);
    const timer = setTimeout(() => {
      setCollapsing(true);
      Animated.timing(exit, { toValue: 0, duration, useNativeDriver: false }).start();
    }, Math.max(0, remaining - duration));
    return () => { clearTimeout(timer); exit.stopAnimation(); };
  }, [pending, pendingUntil, reduced, exit]);
  const offset = useRef(new Animated.Value(0)).current;
  const checked = useRef(new Animated.Value(todo.done ? 1 : 0)).current;
  useEffect(() => {
    checked.stopAnimation();
    if (reduced) { checked.setValue(todo.done ? 1 : 0); return; }
    const animation = Animated.timing(checked, { toValue: todo.done ? 1 : 0, duration: motion.feedback, useNativeDriver: Platform.OS !== 'web' });
    animation.start(); return () => animation.stop();
  }, [todo.done, reduced, checked]);
  const onToggleRef = useRef(onToggle); onToggleRef.current = onToggle;
  const busyRef = useRef(busy); busyRef.current = busy;
  const toggleBlocked = useRef(busy && !canToggleWhileBusy); toggleBlocked.current = busy && !canToggleWhileBusy;
  const suppressUntil = useRef(0);
  const swiping = useRef(false);
  function press(action?: () => void, toggle = false) { if (!swiping.current && Date.now() >= suppressUntil.current && !(toggle ? toggleBlocked.current : busyRef.current)) action?.(); }
  const reset = () => { offset.stopAnimation(); if (reducedRef.current) offset.setValue(0); else Animated.timing(offset, { toValue: 0, duration: motion.feedback, useNativeDriver: Platform.OS !== 'web' }).start(); };
  useEffect(() => () => offset.stopAnimation(), [offset]);
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => !toggleBlocked.current && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
    onPanResponderGrant: () => { offset.stopAnimation(); swiping.current = true; },
    onPanResponderMove: (_, gesture) => offset.setValue(Math.max(-95, Math.min(95, gesture.dx))),
    onPanResponderRelease: (_, gesture) => { swiping.current = false; suppressUntil.current = Date.now() + 300; reset(); if (Math.abs(gesture.dx) >= 64 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4 && !toggleBlocked.current) onToggleRef.current(); },
    onPanResponderTerminate: () => { swiping.current = false; suppressUntil.current = Date.now() + 300; reset(); },
  }), [offset]);
  const source = todo.source ? (todo.source.provider === 'apple-reminders' ? '미리 알림' : todo.source.provider === 'google' && todo.source.externalId.includes(':tasks:') ? 'Google Tasks' : ({ google: 'Google', slack: 'Slack', notion: 'Notion' }[todo.source.provider] ?? '가져온 할 일')) : '';
  const date = log && todo.completedAt ? new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(todo.completedAt)) : todo.dueDate ? todo.dueDate.slice(5).replace('-', ' / ') : '';
  const detail = [date, source].filter(Boolean).join(' · ');
  return <Animated.View testID={`completion-motion-${todo.id}`} style={[s.swipeWrap, {opacity:exit}, collapsing && {height:exit.interpolate({inputRange:[0,1],outputRange:[0,rowHeight.current]})}]}>
    <View style={s.swipeBack}><Text style={s.swipeBackText}>{todo.done ? '되돌리기' : '완료'}</Text><Text style={s.swipeBackText}>{todo.done ? '되돌리기' : '완료'}</Text></View>
    <Animated.View onLayout={event=>{if(!collapsing)rowHeight.current=event.nativeEvent.layout.height;}} {...responder.panHandlers} style={[s.todoRow, { transform: [{ translateX: offset }] }]} testID={`todo-${todo.id}`}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: todo.done, disabled: busy && !canToggleWhileBusy }} accessibilityLabel={`${todo.title} ${todo.done ? '미완료로 변경' : '완료하기'}`} disabled={busy && !canToggleWhileBusy} onPress={() => press(onToggle, true)} hitSlop={9} style={[s.checkbox, todo.done && s.checked]}><Animated.Text style={[s.checkText,{opacity:checked,transform:[{scale:checked.interpolate({inputRange:[0,1],outputRange:[0.7,1]})}]}]}>✓</Animated.Text></Pressable>
      <Pressable disabled={!onEdit || busy} onPress={() => press(onEdit)} accessibilityRole={onEdit ? 'button' : undefined} accessibilityLabel={onEdit ? `${todo.title} 수정` : undefined} style={s.todoBody}>
        <Text numberOfLines={2} style={[s.todoTitle, todo.done && !log && s.doneText]}>{todo.title}</Text>
        {pending ? <Text style={s.pendingText}>완료 · 4초 후 log로 이동</Text> : !!detail && <Text numberOfLines={1} style={s.todoDate}>{detail}</Text>}
      </Pressable>
      {pending || log ? <Pressable onPress={() => press(onToggle, true)} disabled={busy && !canToggleWhileBusy} accessibilityRole="button" accessibilityLabel={`${todo.title} 되돌리기`} style={s.more}><Text style={s.restore}>되돌리기</Text></Pressable> : onEdit ? <Pressable accessibilityRole="button" accessibilityLabel={`${todo.title} 수정 메뉴`} onPress={() => press(onEdit)} disabled={busy} style={s.more}><Text style={s.moreText}>···</Text></Pressable> : null}
    </Animated.View>
  </Animated.View>;
}
export function DateField({ value, onChange }: { value: string | null; onChange: (date: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return <View><View style={s.dateField}><Label>예정일</Label>{Platform.OS === 'web' ? <TextInput accessibilityLabel="예정일 YYYY-MM-DD" placeholder="YYYY-MM-DD" maxLength={10} value={value ?? ''} onChangeText={text => onChange(text || null)} style={s.dateInput} /> : <Pressable accessibilityRole="button" accessibilityLabel="예정일 선택" onPress={() => {Keyboard.dismiss();setOpen(!open);}} style={s.datePick}><Text style={{ color: colors.blue }}>{value ?? '날짜 선택'}</Text></Pressable>}{value && <Pressable onPress={() => { onChange(null); setOpen(false); }} hitSlop={10} accessibilityRole="button" accessibilityLabel="날짜 해제"><Text style={s.muted}>해제</Text></Pressable>}</View>
    {open && Platform.OS !== 'web' && <DateTimePicker value={value ? new Date(value + 'T12:00:00') : new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} locale="ko-KR" onChange={(event, date) => { if (Platform.OS !== 'ios') setOpen(false); if (event.type !== 'dismissed' && date) onChange(dateKey(date)); }} />}</View>;
}
export function TodoEditor({ todo, dueDate, store, onClose: onDismiss }: { todo?: Todo; dueDate: string | null; store: TodoStore; onClose: () => void }) {
  const {visible,close:onClose} = useModalDismiss(onDismiss);
  const [title, setTitle] = useState(todo?.title ?? '');
  const [date, setDate] = useState(todo?.dueDate ?? dueDate);
  const [notes,setNotes] = useState(todo?.notes ?? '');
  const [alarm, setAlarm] = useState(!!todo?.reminderAt);
  const originalTime = todo?.reminderAt ? new Date(todo.reminderAt) : null;
  const [alarmTime, setAlarmTime] = useState(originalTime ? `${String(originalTime.getHours()).padStart(2, '0')}:${String(originalTime.getMinutes()).padStart(2, '0')}` : '09:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setSaving(true); setError('');
    try {
      let reminderAt: string | null = null;
      if (alarm) { if (!date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(alarmTime)) throw new Error('예정일과 알림 시간을 확인해주세요.'); reminderAt = new Date(`${date}T${alarmTime}:00`).toISOString(); if (Date.parse(reminderAt) <= Date.now() && reminderAt !== todo?.reminderAt) throw new Error('알림은 미래 시간으로 정해주세요.'); }
      const draft: Draft = validateDraft({ title, notes, dueDate: date, reminderAt, category: todo?.category ?? '일상' });
      const ok = todo ? await store.update(todo.id, { title: draft.title, dueDate: date, reminderAt: draft.reminderAt, notes: draft.notes }) : await store.add(draft);
      if (ok) onClose(); else setError('저장하지 못했어요. 연결을 확인하고 다시 시도해주세요.');
    } catch (e) { setError(e instanceof Error ? e.message : '입력 내용을 확인해주세요.'); }
    finally { setSaving(false); }
  }
  const [shareStatus, setShareStatus] = useState('');
  async function shareTodo() {
    if (!todo) return;
    const message = `🦆 duckduck\n${todo.title}${todo.dueDate ? `\n예정일: ${todo.dueDate}` : ''}`;
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) await navigator.share({ text: message });
        else { await navigator.clipboard.writeText(message); setShareStatus('복사했어요. 카카오톡 대화창에 붙여넣어 보내주세요.'); }
      } else {
        await Share.share({ message });
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setShareStatus('공유하지 못했어요. 다시 시도해주세요.');
    }
  }
  async function remove() { if (!todo) return; setSaving(true); if (await store.remove(todo.id)) onClose(); else { setError('삭제하지 못했어요. 다시 시도해주세요.'); setSaving(false); } }
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!saving) onClose(); }}>
    <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DraggableSheet visible={visible} style={s.sheet} onDismiss={()=>{if(!saving)onClose();}} disabled={saving}><View style={s.sheetHeader}><Text style={s.sectionTitle}>{todo ? '할 일 수정' : '새로운 할 일'}</Text><CloseButton disabled={saving} onPress={onClose} /></View><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" testID="editor-scroll" style={{flexShrink:1}}>
        <TextInput accessibilityLabel="할 일 제목" placeholder="어떤 일을 해볼까요?" value={title} onChangeText={setTitle} maxLength={120} autoFocus editable={!saving} style={s.editorInput} />
        <DateField value={date} onChange={setDate} /><NotesField value={notes} onChange={setNotes} disabled={saving} />
        <View style={s.dateField}><Label>알림</Label><View style={{ flex: 1 }} /><Switch accessibilityLabel="할 일 알림" value={alarm} onValueChange={setAlarm} disabled={saving} trackColor={{ true: colors.blue }} /></View>
        {alarm && <View><TextInput accessibilityLabel="알림 시간 HH:mm" value={alarmTime} onChangeText={setAlarmTime} placeholder="09:00" maxLength={5} style={s.dateInput} /><Text style={[s.muted, { marginVertical: 12 }]}>{store.reminders.supported ? store.reminders.enabled ? '선택한 시간에 이 기기에서 알려드려요.' : '내정보에서 기기 알림도 켜주세요.' : '웹에서는 시간을 저장해요. 알림은 아이폰에서 켤 수 있어요.'}</Text></View>}
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <Button title={saving ? '저장 중…' : '저장'} loading={saving} onPress={save} disabled={saving || !title.trim()} />
        {!!todo && <View><Button title="카카오톡 등으로 공유" quiet disabled={saving} onPress={() => { void shareTodo(); }} /><Text style={s.muted}>공유창에서 카카오톡을 선택하세요. 웹에서 공유창을 지원하지 않으면 내용을 복사해요. 저장된 내용이 공유돼요.</Text>{!!shareStatus && <Text accessibilityLiveRegion="polite" style={s.muted}>{shareStatus}</Text>}</View>}
        {!!todo && <Pressable accessibilityRole="button" disabled={saving} onPress={remove} style={s.deleteButton}><Text style={s.deleteText}>할 일 삭제</Text></Pressable>}
      </ScrollView></DraggableSheet>
    </KeyboardAvoidingView>
  </Modal>;
}
export const s = StyleSheet.create({
  page: { padding: spacing.xl, paddingTop: spacing.xxl, paddingBottom: 40, flexGrow: 1 },
  label: { ...typography.caption, color: colors.muted }, muted: { ...typography.caption, color: colors.muted },
  h1: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  subtitle: { ...typography.detail, color: colors.muted },
  sectionTitle: { ...typography.section, color: colors.text },
  button: { backgroundColor: colors.blue, paddingHorizontal: 20, paddingVertical: 14, minHeight: 56, borderRadius: radius.button, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...typography.body, color: colors.white, fontWeight: '600', textAlign: 'center', flexShrink: 1 }, quietButton: { backgroundColor: colors.pale, minHeight: 48 },
  todoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, paddingVertical: 6, gap: spacing.md, minHeight: 60, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  swipeWrap: { overflow: 'hidden' }, swipeBack: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.pale, padding: 20 }, swipeBackText: { ...typography.detail, color: colors.blueText, fontWeight: '600' },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: colors.subtle, alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: colors.blue, borderColor: colors.blue }, checkText: { color: colors.white, fontSize: 18 },
  todoBody: { flex: 1, minHeight: 44, justifyContent: 'center' }, todoTitle: { ...typography.list, color: colors.text }, doneText: { color: colors.subtle, textDecorationLine: 'line-through' }, todoDate: { ...typography.caption, color: colors.muted, marginTop: 2 }, pendingText: { ...typography.caption, color: colors.blueText, marginTop: 2 },
  more: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' }, moreText: { fontSize: 23, color: colors.muted }, restore: { ...typography.caption, color: colors.blueText },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, flexWrap: 'wrap' }, dateInput: { flex: 1, minHeight: 48, padding: spacing.md, borderRadius: radius.small, backgroundColor: colors.grouped, color: colors.text, ...typography.detail }, datePick: { flex: 1, minHeight: 44, padding: spacing.md, alignItems: 'flex-end', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }, sheet: { maxHeight:'90%', backgroundColor: colors.white, padding: spacing.xl, paddingBottom: 38, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, width: '100%', maxWidth: 600, alignSelf: 'center' }, sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.xl },
  editorInput: { ...typography.body, color: colors.text, backgroundColor: colors.grouped, padding: spacing.lg, borderRadius: radius.button, minHeight: 60 }, error: { ...typography.caption, color: colors.danger, marginVertical: spacing.md }, deleteButton: { alignItems: 'center', minHeight: 48, padding: 18, marginTop: 10 }, deleteText: { ...typography.detail, color: colors.danger },
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 56, gap: spacing.md }, emptyText: { ...typography.detail, color: colors.muted, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.xl, marginTop: spacing.xl },
});

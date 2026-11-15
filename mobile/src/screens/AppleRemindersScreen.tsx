import {MePage,MeRow,MeSection} from '../MeSettings';
import { MotionPressable as Pressable } from '../motion';
import { reconcileApple } from '../apple-reconcile';
import {readReminderItems} from '../apple-reminder-read';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator,Platform, Text, View } from 'react-native';
import type { TodoStore } from '../useTodos';
import { Button, s } from '../ui';
import {colors} from '../theme';
type Item = { id: string; title: string; dueDate: string | null;dueTime?:string|null;notes?:string;modifiedAt?:string; completed: boolean };
export function AppleRemindersScreen({ store, onClose }: { store: TodoStore; onClose: () => void }) {
  const [lists, setLists] = useState<{ id: string; title: string }[]>([]), [items, setItems] = useState<Item[]>([]), [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const active=useRef(true);useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const [syncCursor,setSyncCursor]=useState(''),[confirmDevice,setConfirmDevice]=useState(false),[syncDirection,setSyncDirection]=useState<'device'|'duck'|null>(null);
  const [listId, setListId] = useState<string | undefined>(), [completed, setCompleted] = useState(false),[loadingName,setLoadingName]=useState(''),[visibleItems,setVisibleItems]=useState(50);
  const reading=useRef(false);
  const current = () => active.current && store.isCurrentSession();
  async function load(targetListId?: string, showCompleted = false) {
    if (!current() || busy || reading.current) return;
    reading.current=true;setBusy(true); setError(''); setMessage('');
    try {
      const Calendar = await import('expo-calendar');
      let permission = await Calendar.getRemindersPermissions();if(!permission.granted)permission=await Calendar.requestRemindersPermissions();
      if (!current()) return;
      if (!permission.granted) throw new Error('아이폰 설정에서 덕의 미리 알림 접근을 허용해주세요.');
      if (!targetListId) { const calendars = await Calendar.getCalendars(Calendar.EntityTypes.REMINDER); if (!current()) return; setLists(calendars); setItems([]); setSelected([]); setListId(undefined); setCompleted(false); }
      else {
        setLoadingName(lists.find(l=>l.id===targetListId)?.title??'선택한 목록');
        const plain=await readReminderItems(targetListId,()=>Calendar.getCalendars(Calendar.EntityTypes.REMINDER),current);
        if(!plain||!current())return;
        const shown=plain.filter(item=>item.completed===showCompleted);setItems(shown);setVisibleItems(50);setListId(targetListId);setCompleted(showCompleted);setSelected([]);
        if(!shown.length)setMessage(plain.length?(showCompleted?'완료 기록이 없어요. 미완료 목록도 확인할 수 있어요.':'이 목록은 모두 완료된 항목이에요. 완료 기록에서 확인할 수 있어요.'):'이 목록에서 항목을 읽지 못했어요. 원본에 내용이 있다면 동기화와 접근 권한을 확인하고 다시 읽어주세요.');
        if(!plain.length)void store.featureRequest('/api/assistant/notices','POST',{code:'reminders-empty',provider:'apple-reminders',title:lists.find(l=>l.id===targetListId)?.title||'미리 알림'}).catch(()=>{});
      }
    } catch (e) { if (current()) setError(e instanceof Error ? e.message : '미리 알림을 읽지 못했어요.'); }
    finally { reading.current=false;if (current()){setBusy(false);setLoadingName('');} }
  }
  async function importSelected() {
    if (!current() || busy) return;
    setBusy(true); setError('');
    try {
      const value = await store.featureRequest('/api/integrations/apple-reminders/import', 'POST', { items: items.filter(item => !item.completed && selected.includes(item.id)) }) as { results: { created: boolean }[] };
      await store.refresh(); if (!current()) return; setSelected([]); setMessage(`${value.results.filter(item => item.created).length}개를 추가했어요. 이미 가져온 할 일은 중복 추가하지 않아요.`);
    } catch (e) { if (current()) setError(e instanceof Error ? e.message : '가져오지 못했어요.'); }
    finally { if (current()) setBusy(false); }
  }
  async function reconcile(direction:'device'|'duck'){
    if (!current() || busy) return;
    setBusy(true);setError('');setConfirmDevice(false);
    try{const Calendar=await import('expo-calendar');const permission=await Calendar.requestRemindersPermissions();if(!current())return;if(!permission.granted)throw new Error('미리 알림 접근을 허용해주세요.');
      const result=await reconcileApple(store.todos,direction,{active:current,read:async id=>{const item=await Calendar.ExpoCalendarReminder.get(id);return {completed:!!item.completed,update:patch=>item.update(patch)};},saveTodo:async(id,done)=>!!(await store.update(id,{done}))},syncDirection===direction?syncCursor:'');
      if(current()){setSyncDirection(direction);setSyncCursor(result.nextCursor??'');setMessage(`${result.changed}개 상태를 맞췄어요.${result.failed?` ${result.failed}개는 이 기기에서 확인하지 못했어요.`:''}${result.nextCursor?' 다음 5개도 확인할 수 있어요.':''}`);}
    }catch(e){if(current())setError(e instanceof Error?e.message:'상태를 맞추지 못했어요.');}finally{if(current())setBusy(false);}
  }
  return <MePage title="아이폰 미리 알림" onClose={onClose} disabled={busy}>
    <Text style={s.subtitle}>목록에서 필요한 할 일만 골라 덕으로 가져와요. 선택한 제목·메모·예정일은 덕 계정에 저장돼요. 가져오기만 하면 원래 항목은 변경하지 않아요. 상태 맞추기는 아래에서 별도로 실행해요.</Text>
    {Platform.OS !== 'ios' ? <Text style={s.subtitle}>미리 알림 가져오기는 아이폰 앱에서 사용할 수 있어요.</Text> : !store.user ? <Text style={s.subtitle}>클라우드 계정으로 로그인한 뒤 사용할 수 있어요.</Text> : <>
      {!!store.todos.some(todo=>todo.source?.provider==='apple-reminders')&&<View style={s.card}><Text style={s.sectionTitle}>가져온 항목의 완료 상태 맞추기</Text><Text style={s.subtitle}>이 기기에서 접근 가능한 항목을 5개씩 확인해요. 제목·날짜는 변경하지 않아요.</Text><Button title="아이폰 완료 상태를 덕에 반영" quiet disabled={busy} onPress={()=>{void reconcile('duck');}} /><Button title="덕의 완료 상태를 아이폰에 반영" quiet disabled={busy} onPress={()=>setConfirmDevice(true)} />{confirmDevice&&<><Text style={s.subtitle}>덕에 저장된 완료 여부로 아이폰 원본을 변경합니다.</Text><Button title="아이폰 원본 상태 변경 확인" disabled={busy} onPress={()=>{void reconcile('device');}} /><Button title="취소" quiet onPress={()=>setConfirmDevice(false)} /></>}</View>}
      <Button title="권한 허용하고 목록 보기" disabled={busy} onPress={() => { void load(); }} />
      <MeSection compact>{lists.map(list=><MeRow key={list.id} title={list.title} status={list.id===listId?'선택됨':undefined} icon="list-outline" disabled={busy} onPress={()=>void load(list.id)}/>)}</MeSection>
      {busy&&<View style={{flexDirection:'row',alignItems:'center',gap:8}}><ActivityIndicator/><Text accessibilityLiveRegion="polite" style={s.muted}>{loadingName?loadingName+' 목록 확인 중…':'미리 알림 확인 중…'}</Text></View>}
      {listId&&<Button title="이 목록 다시 읽기" quiet disabled={busy} onPress={()=>void load(listId,completed)}/>}
      {listId && <Button title={completed ? '미완료 할 일 보기' : '완료 기록 보기'} quiet disabled={busy} onPress={() => { void load(listId, !completed); }} />}
      <Text style={s.muted}>완료 기록은 참고용으로만 조회해요. Todo로 가져오거나 클라우드에 저장하지 않아요.</Text>
      {items.slice(0,visibleItems).map(item => <Pressable key={item.id} accessibilityRole={item.completed ? undefined : "checkbox"} accessibilityLabel={item.title} accessibilityState={{ checked: selected.includes(item.id) }} disabled={busy || item.completed} onPress={() => setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : current.length < 20 ? [...current, item.id] : current)} style={{ paddingVertical: 16 }}><Text style={{color:colors.text}}>{item.completed ? '✓ 완료 · 참고용' : selected.includes(item.id) ? '☑' : '□'} {item.title}</Text>{item.dueDate && <Text style={s.muted}>{item.dueDate}</Text>}</Pressable>)}
      {items.length>visibleItems&&<Button title="미리 알림 더 보기" quiet onPress={()=>setVisibleItems(n=>n+50)}/>}<View style={{ height: 16 }} /><Button title={`선택한 ${selected.length}개 가져오기`} disabled={busy || !selected.length} onPress={() => { void importSelected(); }} /><Text style={s.muted}>한 번에 최대 20개 · 상태 맞추기는 직접 실행해요.</Text>
    </>}
    {!!message && <Text accessibilityLiveRegion="polite" style={s.subtitle}>{message}</Text>}{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </MePage>;
}

import {MeCopy,MePage,MeRow,MeSection,MeServiceIntro} from '../MeSettings';
import { MotionPressable as Pressable } from '../motion';
import { reconcileApple } from '../apple-reconcile';
import {readReminderItems} from '../apple-reminder-read';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator,Linking,Platform, Text, View } from 'react-native';
import type { TodoStore } from '../useTodos';
import { Button, s } from '../ui';
import {Ionicons} from '@expo/vector-icons';
import {colors} from '../theme';
type Item = { id: string; title: string; dueDate: string | null;dueTime?:string|null;notes?:string;modifiedAt?:string; completed: boolean };
export function AppleRemindersScreen({ store, onClose }: { store: TodoStore; onClose: () => void }) {
  const [page,setPage]=useState<'overview'|'lists'|'items'|'sync'>('overview');
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
      if (!targetListId) { const calendars = await Calendar.getCalendars(Calendar.EntityTypes.REMINDER); if (!current()) return; setLists(calendars); setItems([]); setSelected([]); setListId(undefined); setCompleted(false);setPage('lists'); }
      else {
        setLoadingName(lists.find(l=>l.id===targetListId)?.title??'선택한 목록');
        const plain=await readReminderItems(targetListId,()=>Calendar.getCalendars(Calendar.EntityTypes.REMINDER),current);
        if(!plain||!current())return;
        const shown=plain.filter(item=>item.completed===showCompleted);setItems(shown);setVisibleItems(50);setListId(targetListId);setCompleted(showCompleted);setSelected([]);setPage('items');
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
  const available=Platform.OS==='ios'&&!!store.user;
  const back=()=>{if(page==='overview')onClose();else setPage(page==='items'?'lists':'overview');};
  return <MePage key={page} title={page==='lists'?'미리 알림 목록':page==='items'?lists.find(l=>l.id===listId)?.title||'미리 알림':page==='sync'?'완료 상태 맞추기':'아이폰 미리 알림'} onClose={back} disabled={busy}>
    {page==='overview'&&<>
     <MeServiceIntro title="미리 알림" icon="checkbox-outline" description="아이폰의 할 일을 가져와 덕에서 함께 관리해요."/>
     <MeSection compact><MeCopy title="필요한 항목만 가져와요">목록을 고르고 미완료 항목을 선택해 가져와요. 제목·메모·예정일은 덕 계정에 저장돼요.</MeCopy><MeCopy title="권한은 아이폰에서 관리해요">목록을 열 때 미리 알림 접근 권한을 확인해요. 아이폰 설정에서 언제든 변경할 수 있어요.</MeCopy><MeCopy title="원본 변경은 저장한 뒤에">가져오기만 하면 원본은 바뀌지 않아요. 가져온 항목의 내용·시간을 수정해 저장하면 원본에도 반영해요. 완료 상태 맞추기는 직접 실행해요.</MeCopy></MeSection>
     <View style={{marginTop:16,gap:12}}><Button title="미리 알림 목록 보기" loading={busy} disabled={!available||busy} onPress={()=>void load()}/>{store.todos.some(todo=>todo.source?.provider==='apple-reminders')&&<MeSection compact><MeRow title="완료 상태 맞추기" icon="sync-outline" onPress={()=>setPage('sync')}/></MeSection>}</View>
    </>}
    {!available&&<MeCopy title={Platform.OS!=='ios'?'아이폰 앱에서 연결해주세요':'로그인이 필요해요'}>{Platform.OS!=='ios'?'웹에서는 기능과 권한 안내를 볼 수 있어요. 실제 목록은 아이폰 앱에서 확인할 수 있어요.':'로그인한 계정에 선택한 항목을 가져와요.'}</MeCopy>}
    {page==='sync'&&available&&<View style={{gap:12,marginTop:16}}><Text style={s.subtitle}>접근 가능한 항목을 5개씩 확인해요. 여기서는 제목·날짜를 바꾸지 않아요.</Text><Button title="아이폰 완료 상태를 덕에 반영" quiet disabled={busy} onPress={()=>void reconcile('duck')}/><Button title="덕의 완료 상태를 아이폰에 반영" quiet disabled={busy} onPress={()=>setConfirmDevice(true)}/>{confirmDevice&&<><Text style={s.subtitle}>덕에 저장된 완료 여부로 아이폰 원본을 변경합니다.</Text><Button title="아이폰 원본 상태 변경 확인" disabled={busy} onPress={()=>void reconcile('device')}/><Button title="취소" quiet onPress={()=>setConfirmDevice(false)}/></>}</View>}
    {page==='lists'&&available&&<><Text style={s.subtitle}>가져올 할 일이 있는 목록을 선택해주세요.</Text><MeSection compact>{lists.map(list=><MeRow key={list.id} title={list.title} icon="list-outline" disabled={busy} onPress={()=>void load(list.id)}/>)}</MeSection>{!lists.length&&!busy&&<MeCopy title="목록을 찾지 못했어요">아이폰 미리 알림 앱에서 목록이 보이는지 확인한 뒤 다시 읽어주세요.</MeCopy>}<View style={{marginTop:16}}><Button title="목록 다시 읽기" quiet disabled={busy} onPress={()=>void load()}/></View></>}
    {page==='items'&&available&&<><View style={{flexDirection:'row',gap:8,marginTop:16}}><View style={{flex:1}}><Button title="이 목록 다시 읽기" quiet disabled={busy} onPress={()=>void load(listId,completed)}/></View><View style={{flex:1}}><Button title={completed?'미완료 할 일 보기':'완료 기록 보기'} quiet disabled={busy} onPress={()=>void load(listId,!completed)}/></View></View>
      {completed&&<MeCopy title="완료 기록은 참고용이에요">덕으로 가져오거나 계정에 저장하지 않아요.</MeCopy>}
      <MeSection compact>{items.slice(0,visibleItems).map(item=><Pressable key={item.id} accessibilityRole={item.completed?undefined:'checkbox'} accessibilityLabel={item.title} accessibilityState={{checked:selected.includes(item.id)}} disabled={busy||item.completed} onPress={()=>setSelected(old=>old.includes(item.id)?old.filter(id=>id!==item.id):old.length<20?[...old,item.id]:old)} style={{minHeight:52,padding:12,flexDirection:'row',alignItems:'center',gap:12}}><Ionicons name={item.completed?'checkmark-circle-outline':selected.includes(item.id)?'checkbox':'square-outline'} size={23} color={selected.includes(item.id)?colors.blueText:colors.muted}/><View style={{flex:1,minWidth:0}}><Text style={{color:colors.text,fontSize:16,lineHeight:24}}>{item.title}</Text>{item.dueDate&&<Text style={s.muted}>{item.dueDate}</Text>}</View></Pressable>)}</MeSection>
      {items.length>visibleItems&&<Button title="미리 알림 더 보기" quiet onPress={()=>setVisibleItems(n=>n+50)}/>}{!completed&&items.length>0&&<View style={{gap:8,marginTop:16}}><Button title={`선택한 ${selected.length}개 가져오기`} loading={busy} disabled={busy||!selected.length} onPress={()=>void importSelected()}/><Text style={s.muted}>한 번에 최대 20개 · 이미 가져온 항목은 중복 추가하지 않아요.</Text></View>}
    </>}
    {busy&&<View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:16}}><ActivityIndicator/><Text accessibilityLiveRegion="polite" style={s.muted}>{loadingName?loadingName+' 목록 확인 중…':'미리 알림 확인 중…'}</Text></View>}
    {!!message&&<Text accessibilityLiveRegion="polite" style={[s.subtitle,{marginTop:16}]}>{message}</Text>}{!!error&&<View style={{gap:8,marginTop:16}}><Text accessibilityRole="alert" style={s.error}>{error}</Text>{Platform.OS==='ios'&&/권한|접근/.test(error)&&<Button title="아이폰 설정 열기" quiet onPress={()=>void Linking.openSettings().catch(()=>setError('아이폰 설정에서 덕의 미리 알림 접근을 허용해주세요.'))}/>}</View>}
  </MePage>;
}

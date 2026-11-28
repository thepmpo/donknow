import {BrandLoading} from '../BrandLoading';
import {appleReminderDevice} from '../apple-reminder-device';
import type {ReminderDevice} from '../apple-reminder-device';
import {MeCopy,MePage,MeRow,MeSection,MeServiceIntro} from '../MeSettings';
import { MotionPressable as Pressable } from '../motion';
import { reconcileApple } from '../apple-reconcile';
import {importReminderItems} from '../apple-reminder-import';
import type {ReminderImportProgress} from '../apple-reminder-import';
import {readAllReminderItems,readReminderItems} from '../apple-reminder-read';
import React, { useEffect, useRef, useState } from 'react';
import { AppState,Linking,Platform, Text, View } from 'react-native';
import type { TodoStore } from '../useTodos';
import { Button, s } from '../ui';
import {Ionicons} from '@expo/vector-icons';
import {colors} from '../theme';
type Item = { id: string; title: string; dueDate: string | null;dueTime?:string|null;notes?:string;modifiedAt?:string; completed: boolean;listTitle?:string;color?:string };
export function AppleRemindersScreen({ store, onClose,device=appleReminderDevice }: { store: TodoStore; onClose: () => void;device?:ReminderDevice }) {
  const [page,setPage]=useState<'overview'|'lists'|'items'|'sync'>('overview');
  const [lists, setLists] = useState<{ id: string; title: string }[]>([]), [items, setItems] = useState<Item[]>([]), [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const active=useRef(true);useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const [syncCursor,setSyncCursor]=useState(''),[confirmDevice,setConfirmDevice]=useState(false),[syncDirection,setSyncDirection]=useState<'device'|'duck'|null>(null);
  const [listId, setListId] = useState<string | undefined>(), [completed, setCompleted] = useState(false),[loadingName,setLoadingName]=useState(''),[visibleItems,setVisibleItems]=useState(50);
  const reading=useRef(false);
  const [progress,setProgress]=useState<ReminderImportProgress|null>(null),[failedLists,setFailedLists]=useState<{id:string;title:string}[]>([]);
  const current = () => active.current && store.isCurrentSession();
  useEffect(()=>{
    if(page!=='lists'||!device.available||!store.user)return;
    let disposed=false,timer:ReturnType<typeof setTimeout>|undefined;
    async function refreshLists(){
      try{
        const latest=await device.lists();
        if(!disposed&&current()&&!reading.current)setLists(latest);
      }catch{
        // Keep the previous catalog when the source is temporarily unavailable.
      }
    }
    const subscription=AppState.addEventListener('change',state=>{if(state==='active')void refreshLists();});
    const unsubscribe=device.subscribe?.(()=>{clearTimeout(timer);timer=setTimeout(()=>void refreshLists(),300);});
    return()=>{disposed=true;clearTimeout(timer);subscription.remove();unsubscribe?.();};
  },[page,device,store.user?.id]);
  async function load(targetListId?: string, showCompleted = false) {
    if (!current() || busy || reading.current) return;
    reading.current=true;setBusy(true); setError(''); setMessage('');
    try {
      const granted=await device.authorize();
      if (!current()) return;
      if (!granted) throw new Error('아이폰 설정에서 docen의 미리 알림 접근을 허용해주세요.');
      if (!targetListId) { const calendars = await device.lists(); if (!current()) return; setLists(calendars); setItems([]); setSelected([]); setListId(undefined); setCompleted(false);setPage('lists'); }
      else {
        setLoadingName(lists.find(l=>l.id===targetListId)?.title??'선택한 목록');
        const plain=await readReminderItems(targetListId,()=>device.lists(),current);
        if(!plain||!current())return;
        const shown=plain.filter(item=>item.completed===showCompleted);setItems(shown);setVisibleItems(50);setListId(targetListId);setCompleted(showCompleted);setSelected(shown.filter(i=>!i.completed).map(i=>i.id));setFailedLists([]);setProgress(null);setPage('items');
        if(!shown.length)setMessage(plain.length?(showCompleted?'완료 기록이 없어요. 미완료 목록도 확인할 수 있어요.':'이 목록은 모두 완료된 항목이에요. 완료 기록에서 확인할 수 있어요.'):'이 목록에서 항목을 읽지 못했어요. 원본에 내용이 있다면 동기화와 접근 권한을 확인하고 다시 읽어주세요.');
        if(!plain.length)void store.featureRequest('/api/assistant/notices','POST',{code:'reminders-empty',provider:'apple-reminders',title:lists.find(l=>l.id===targetListId)?.title||'미리 알림'}).catch(()=>{});
      }
    } catch (e) { if (current()) setError(e instanceof Error ? e.message : '미리 알림을 읽지 못했어요.'); }
    finally { reading.current=false;if (current()){setBusy(false);setLoadingName('');} }
  }
  async function loadAll(){
    if(!current()||busy||reading.current)return;reading.current=true;setBusy(true);setError('');setMessage('');setProgress(null);setFailedLists([]);
    try{const granted=await device.authorize();if(!current())return;if(!granted)throw Error('아이폰 설정에서 docen의 미리 알림 접근을 허용해주세요.');
      const all=await device.lists();if(!current())return;setLists(all);
      const result=await readAllReminderItems(all,()=>device.lists(),current,(n,total)=>setLoadingName(`전체 ${total}개 중 ${n}개`));if(!result||!current())return;
      setItems(result.items);setSelected(result.items.map(i=>i.id));setVisibleItems(50);setListId(undefined);setCompleted(false);setFailedLists(result.failedLists);setPage('items');
      setMessage(result.items.length?`미완료 ${result.items.length}개를 찾았어요. 전체가 선택되어 있어요.`:result.failedLists.length?'읽지 못한 목록이 남아 있어요.':'접근 가능한 목록에 미완료 항목이 없어요.');if(result.failedLists.length){setError(`${result.failedLists.length}개 목록을 읽지 못했어요. 읽은 항목을 먼저 가져오고, 실패한 목록을 다시 확인해주세요.`);void store.featureRequest('/api/assistant/notices','POST',{code:'reminders-empty',provider:'apple-reminders',title:(result.failedLists[0].title+(result.failedLists.length>1?' 외 '+(result.failedLists.length-1)+'개 목록':'')).slice(0,150)}).catch(()=>{});}
    }catch(e){if(current())setError(e instanceof Error?e.message:'전체 미리 알림을 읽지 못했어요.');}finally{reading.current=false;if(current()){setBusy(false);setLoadingName('');}}
  }
  async function importSelected() {
    if (!current() || busy || reading.current) return;
    reading.current=true;setBusy(true);setError('');setMessage('');setProgress({processed:0,total:selected.length,created:0,existing:0});
    try{
      const result=await importReminderItems(items.filter(item=>selected.includes(item.id)).map(item=>({...item,notes:item.notes??'',dueTime:item.dueTime??null})),batch=>store.featureRequest('/api/integrations/apple-reminders/import','POST',{items:batch}),current,setProgress);
      if(!current())return;setSelected(result.remaining.map(i=>i.id));setMessage(`${result.created}개 추가 · 이미 가져온 ${result.existing}개 확인${result.remaining.length?' · 남은 '+result.remaining.length+'개는 이어서 가져올 수 있어요.':''}`);setError(result.error);if(result.error)void store.featureRequest('/api/assistant/notices','POST',{code:'reminders-import-failed',provider:'apple-reminders',title:'미리 알림 '+result.total+'개 가져오기'}).catch(()=>{});
      if(result.processedIds.length)void store.refresh();
    }catch(e){if(current())setError(e instanceof Error?e.message:'가져오지 못했어요.');}
    finally{reading.current=false;if(current())setBusy(false);}
  }
  async function reconcile(direction:'device'|'duck'){
    if (!current() || busy) return;
    setBusy(true);setError('');setConfirmDevice(false);
    try{const Calendar=await import('expo-calendar');const permission=await Calendar.requestRemindersPermissions();if(!current())return;if(!permission.granted)throw new Error('미리 알림 접근을 허용해주세요.');
      const result=await reconcileApple(store.todos,direction,{active:current,read:async id=>{const item=await Calendar.ExpoCalendarReminder.get(id);return {completed:!!item.completed,update:patch=>item.update(patch)};},saveTodo:async(id,done)=>!!(await store.update(id,{done}))},syncDirection===direction?syncCursor:'');
      if(current()){setSyncDirection(direction);setSyncCursor(result.nextCursor??'');setMessage(`${result.changed}개 상태를 맞췄어요.${result.failed?` ${result.failed}개는 이 기기에서 확인하지 못했어요.`:''}${result.nextCursor?' 다음 5개도 확인할 수 있어요.':''}`);}
    }catch(e){if(current())setError(e instanceof Error?e.message:'상태를 맞추지 못했어요.');}finally{if(current())setBusy(false);}
  }
  const available=device.available&&!!store.user;
  const back=()=>{if(page==='overview')onClose();else setPage(page==='items'?'lists':'overview');};
  return <MePage key={page} title={page==='lists'?'미리 알림 목록':page==='items'?lists.find(l=>l.id===listId)?.title||'전체 미완료':page==='sync'?'완료 상태 맞추기':'아이폰 미리 알림'} onClose={back} disabled={busy}>
    {!!progress&&<Text accessibilityLiveRegion="polite" style={s.muted}>{progress.total}개 중 {progress.processed}개 확인 · 새로 {progress.created}개 추가</Text>}{failedLists.length>0&&<View style={{gap:8}}><Text style={s.muted}>확인 필요: {failedLists.map(l=>l.title).join(' · ')}</Text><Button title="읽지 못한 목록 다시 확인" quiet disabled={busy} onPress={()=>void loadAll()}/></View>}
    {busy&&<View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:16}}><BrandLoading size={28}/><Text accessibilityLiveRegion="polite" style={s.muted}>{loadingName?loadingName+' 목록 확인 중…':'미리 알림 확인 중…'}</Text></View>}
    {!!message&&<Text accessibilityLiveRegion="polite" style={[s.subtitle,{marginTop:16}]}>{message}</Text>}{!!error&&<View style={{gap:8,marginTop:16}}><Text accessibilityRole="alert" style={s.error}>{error}</Text>{Platform.OS==='ios'&&/권한|접근/.test(error)&&<Button title="아이폰 설정 열기" quiet onPress={()=>void Linking.openSettings().catch(()=>setError('아이폰 설정에서 docen의 미리 알림 접근을 허용해주세요.'))}/>}</View>}
    {page==='overview'&&<>
     <MeServiceIntro title="미리 알림" icon="checkbox-outline" description="아이폰의 Ticket을 가져와 docen에서 함께 관리해요."/>
     <MeSection compact><MeCopy title="전체를 한 번에 가져와요">모든 목록의 미완료 항목을 한 번에 선택해 가져올 수 있어요. 제목·메모·예정일은 docen 계정에 저장돼요.</MeCopy><MeCopy title="권한은 아이폰에서 관리해요">목록을 열 때 미리 알림 접근 권한을 확인해요. 아이폰 설정에서 언제든 변경할 수 있어요.</MeCopy><MeCopy title="원본 변경은 저장한 뒤에">가져오기만 하면 원본은 바뀌지 않아요. 가져온 항목의 내용·시간을 수정해 저장하면 원본에도 반영해요. docen에서 완료하거나 되돌리면 원본 완료 상태도 반영해요.</MeCopy></MeSection>
     <View style={{marginTop:16,gap:12}}><Button title="전체 미완료 가져오기" loading={busy} disabled={!available||busy} onPress={()=>void loadAll()}/><Button title="미리 알림 목록 보기" loading={busy} disabled={!available||busy} onPress={()=>void load()}/>{store.todos.some(todo=>todo.source?.provider==='apple-reminders')&&<MeSection compact><MeRow title="완료 상태 맞추기" icon="sync-outline" onPress={()=>setPage('sync')}/></MeSection>}</View>
    </>}
    {!available&&<MeCopy title={Platform.OS!=='ios'?'아이폰 앱에서 연결해주세요':'로그인이 필요해요'}>{Platform.OS!=='ios'?'웹에서는 기능과 권한 안내를 볼 수 있어요. 실제 목록은 아이폰 앱에서 확인할 수 있어요.':'로그인한 계정에 선택한 항목을 가져와요.'}</MeCopy>}
    {page==='sync'&&available&&<View style={{gap:12,marginTop:16}}><Text style={s.subtitle}>접근 가능한 항목을 5개씩 확인해요. 여기서는 제목·날짜를 바꾸지 않아요.</Text><Button title="아이폰 완료 상태를 docen에 반영" quiet disabled={busy} onPress={()=>void reconcile('duck')}/><Button title="docen의 완료 상태를 아이폰에 반영" quiet disabled={busy} onPress={()=>setConfirmDevice(true)}/>{confirmDevice&&<><Text style={s.subtitle}>docen에 저장된 완료 여부로 아이폰 원본을 변경합니다.</Text><Button title="아이폰 원본 상태 변경 확인" disabled={busy} onPress={()=>void reconcile('device')}/><Button title="취소" quiet onPress={()=>setConfirmDevice(false)}/></>}</View>}
    {page==='lists'&&available&&<><Button title="전체 미완료 가져오기" disabled={busy} onPress={()=>void loadAll()}/><Text style={s.subtitle}>목록 하나만 고를 수도 있어요.</Text><MeSection compact>{lists.map(list=><MeRow key={list.id} title={list.title} icon="list-outline" disabled={busy} onPress={()=>void load(list.id)}/>)}</MeSection>{!lists.length&&!busy&&<MeCopy title="목록을 찾지 못했어요">아이폰 미리 알림 앱에서 목록이 보이는지 확인한 뒤 다시 읽어주세요.</MeCopy>}<View style={{marginTop:16}}><Button title="목록 다시 읽기" quiet disabled={busy} onPress={()=>void load()}/></View></>}
    {page==='items'&&available&&<><View style={{flexDirection:'row',gap:8,marginTop:16}}><View style={{flex:1}}><Button title="이 목록 다시 읽기" quiet disabled={busy} onPress={()=>void(listId?load(listId,completed):loadAll())}/></View>{!!listId&&<View style={{flex:1}}><Button title={completed?'미완료 Ticket 보기':'완료 기록 보기'} quiet disabled={busy} onPress={()=>void load(listId,!completed)}/></View>}</View>
      {completed&&<MeCopy title="완료 기록은 참고용이에요">docen으로 가져오거나 계정에 저장하지 않아요.</MeCopy>}
      {!completed&&items.length>0&&<View style={{gap:8,marginVertical:12}}><Text style={s.muted}>미완료 {items.length}개 · 선택 {selected.length}개</Text><Button title={`선택한 ${selected.length}개 가져오기`} loading={busy} disabled={busy||!selected.length} onPress={()=>void importSelected()}/><Button title={selected.length===items.length?'전체 선택 해제':'전체 선택'} quiet disabled={busy} onPress={()=>setSelected(selected.length===items.length?[]:items.map(i=>i.id))}/></View>}<MeSection compact>{items.slice(0,visibleItems).map(item=><Pressable key={item.id} accessibilityRole={item.completed?undefined:'checkbox'} accessibilityLabel={item.title} accessibilityState={{checked:selected.includes(item.id)}} disabled={busy||item.completed} onPress={()=>setSelected(old=>old.includes(item.id)?old.filter(id=>id!==item.id):[...old,item.id])} style={{minHeight:52,padding:12,flexDirection:'row',alignItems:'center',gap:12}}><Ionicons name={item.completed?'checkmark-circle-outline':selected.includes(item.id)?'checkbox':'square-outline'} size={23} color={selected.includes(item.id)?colors.blueText:colors.muted}/><View style={{flex:1,minWidth:0}}><Text style={{color:colors.text,fontSize:16,lineHeight:24}}>{item.title}</Text>{item.listTitle&&<Text style={s.muted}>{item.listTitle}</Text>}{item.dueDate&&<Text style={s.muted}>{item.dueDate}</Text>}</View></Pressable>)}</MeSection>
      {items.length>visibleItems&&<Button title="미리 알림 더 보기" quiet onPress={()=>setVisibleItems(n=>n+50)}/>}{!completed&&items.length>0&&<View style={{gap:8,marginTop:16}}><Text style={s.muted}>접근 가능한 미완료 항목 전체를 순서대로 가져와요. 이미 가져온 항목은 중복 추가하지 않아요.</Text></View>}
    </>}

  </MePage>;
}

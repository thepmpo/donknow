import {useReducedMotion} from './motion';
import React,{useEffect,useRef,useState} from 'react';
import {Modal,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import {Button,colors} from './ui';
import {typography} from './theme';
import type {CalendarEvent} from './calendar-model';
import type {TodoStore} from './useTodos';
import {hideCalendarDeletion,removeCalendarEventWrites} from './calendar-write-overlay';
import {HttpResponseError,retryableDocenCalendarCreate} from './http-response';
export function CalendarEventDelete({event:opened,store,onDeleted,onBusy,onDeleteNative,onRefresh,onCheck,onMissing,onDiscard}:{event:CalendarEvent;onCheck:(event:CalendarEvent)=>Promise<CalendarEvent|null>;onMissing:()=>void;store:TodoStore;onDeleted:()=>void;onRefresh:()=>Promise<void>;onBusy:(busy:boolean)=>void;onDeleteNative?:(event:CalendarEvent)=>Promise<void>;onDiscard?:()=>Promise<void>}){
 const reduced=useReducedMotion();
 const [checked,setChecked]=useState<CalendarEvent|null>(null);
 const event=checked??opened;
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[action,setAction]=useState<string|null>(null),[locked,setLocked]=useState(false),[checkingAccess,setCheckingAccess]=useState(false);const cancel=useRef<React.ComponentRef<typeof View>>(null),alive=useRef(true),executing=useRef(false),accessRun=useRef(0);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(open&&Platform.OS==='web')requestAnimationFrame(()=>{(cancel.current as unknown as HTMLElement)?.focus();});},[open]);
 const canDelete=!!onDiscard||!!(event.canWrite&&event.etag);
 async function checkAccess(){
  const run=++accessRun.current;
  const current=()=>alive.current&&run===accessRun.current&&store.isCurrentSession();
  setCheckingAccess(true);setError('');
  try{
   const fresh=await onCheck(opened);
   if(!current())return;
   if(!fresh){setOpen(false);onMissing();return;}
   setChecked(fresh);
  }catch(e){if(current())setError(e instanceof Error?e.message:'원본 Event를 확인하지 못했어요.');}
  finally{if(current())setCheckingAccess(false);}
 }
 function openDelete(){
  setChecked(null);setError('');
  setOpen(true);
  if(!onDiscard&&(!opened.canWrite||!opened.etag))void checkAccess();
 }
 function close(){if(!busy&&!locked){accessRun.current++;setCheckingAccess(false);setChecked(null);setOpen(false);setError('');}}
 async function execute(){if(!canDelete||busy||executing.current||locked)return;executing.current=true;setBusy(true);onBusy(true);setError('');try{
  if(onDiscard){await onDiscard();if(alive.current){setOpen(false);onBusy(false);onDeleted();}return;}
  if(event.provider==='docen'||event.provider==='apple-calendar'){
   const owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo';
   const release=hideCalendarDeletion(owner,event);
   setOpen(false);onDeleted();
   try{
    if(event.provider==='apple-calendar'){
     if(!onDeleteNative)throw Error('아이폰 캘린더에서 확인해주세요.');
     await onDeleteNative(event);
    }else{
     const remove=()=>store.featureRequest('/api/calendar/docen/'+encodeURIComponent(event.eventId!),'DELETE',{revision:event.duckDetails?.revision});
     try{await remove();}catch(e){
      if(!retryableDocenCalendarCreate(e)||!store.isCurrentSession())throw e;
      await remove();
     }
    }
    if(store.isCurrentSession()){removeCalendarEventWrites(owner,event);store.reminders.retry();}
    release(true);
   }catch(e){
    release(false);
    if(store.isCurrentSession())store.setNotice(e instanceof Error?e.message:'Event를 삭제하지 못했어요.');
   }finally{if(store.isCurrentSession())onRefresh();}
   return;
  }
  let id=action;if(!id){const prepared=await store.featureRequest('/api/assistant/actions','POST',{operation:'calendar.delete',args:{calendarId:event.calendarId??'primary',id:event.eventId,expectedETag:event.etag,...(event.connectionId?{connectionId:event.connectionId}: {})}}) as {id:string};id=prepared.id;setAction(id);}
  setLocked(true);const result=await store.featureRequest('/api/assistant/actions/'+id+'/confirm','POST',{confirmation:true}) as {status:string};if(result.status!=='succeeded')throw Error('삭제 결과를 확인해주세요.');
  if(alive.current){setOpen(false);store.reminders.retry();onDeleted();}
 }catch(e){
  if(alive.current)setError(e instanceof Error?e.message:'삭제하지 못했어요.');
  if(!locked&&e instanceof HttpResponseError&&[404,410].includes(e.status)&&event.provider==='google')await checkAccess();
 }finally{executing.current=false;if(alive.current){setBusy(false);onBusy(false);}}}
 async function check(){if(!action||busy)return;setBusy(true);onBusy(true);try{const result=await store.featureRequest('/api/assistant/actions/'+action) as {status:string};if(result.status==='succeeded'){setOpen(false);store.reminders.retry();onDeleted();}else if(['failed','cancelled','expired'].includes(result.status)){setLocked(false);setAction(null);setError('삭제되지 않았어요. Event를 다시 확인해주세요.');}else setError('결과를 아직 확인할 수 없어요. 다시 삭제하지 말고 캘린더를 새로고침해주세요.');}catch(e){setError(e instanceof Error?e.message:'결과를 확인하지 못했어요.');}finally{if(alive.current){setBusy(false);onBusy(false);}}}
 return <><Pressable accessibilityRole="button" accessibilityLabel="Event 삭제" onPress={openDelete} style={{minHeight:48,borderRadius:16,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'}}><Text style={[s.body,{color:colors.danger}]}>Event 삭제</Text></Pressable><Modal visible={open} transparent animationType={reduced?'none':'fade'} onRequestClose={close}><View style={s.backdrop}><Pressable accessibilityLabel="삭제 확인 닫기" disabled={busy||locked} onPress={close} style={StyleSheet.absoluteFill}/><View accessibilityViewIsModal role="alertdialog" aria-modal aria-label="Event 삭제 확인" style={s.card}><Text accessibilityRole="header" style={s.title}>{canDelete?'Event를 삭제할까요?':'삭제 가능 여부'}</Text><Text style={s.body}>{event.title}</Text><Text style={s.help}>{!canDelete?(checkingAccess?'원본 Event를 확인하고 있어요.':event.etag?'이 캘린더에서 Event를 삭제할 권한이 없어요.':'원본 Event 정보를 확인하지 못했어요. 다시 확인해주세요.'):onDiscard?'도슨에서 Event를 삭제해요.':(event.mirror?.name?('도슨과 '+event.mirror.name):event.calendarName??'선택한 캘린더')+'에서 삭제돼요.'}{event.recurring?' 반복 Event의 이 한 건만 삭제해요.':''}</Text>{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}{locked?<><Button title="삭제 결과 확인" disabled={busy} onPress={()=>void check()}/><Button title="닫고 Event 새로 확인" quiet disabled={busy} onPress={()=>{setOpen(false);store.reminders.retry();}}/></>:<View style={s.actions}><Pressable ref={cancel as never} accessibilityRole="button" accessibilityLabel="삭제 취소" disabled={busy} onPress={close} style={s.choice}><Text style={s.body}>취소</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={!canDelete?"삭제 가능 여부 다시 확인":onDiscard?"기기 Event 삭제 확인":"원본에서도 Event 삭제"} disabled={busy||checkingAccess} onPress={()=>void (canDelete?execute():checkAccess())} style={s.choice}><Text style={[s.body,{color:colors.danger,fontWeight:'600'}]}>{checkingAccess?'확인 중…':!canDelete?'다시 확인':busy?'삭제 중…':'삭제'}</Text></Pressable></View>}</View></View></Modal></>;
}
const s=StyleSheet.create({backdrop:{flex:1,backgroundColor:'#00000055',alignItems:'center',justifyContent:'center',padding:24},card:{width:'100%',maxWidth:340,borderRadius:24,backgroundColor:colors.bg,padding:20,gap:12},title:{...typography.section,color:colors.text},body:{...typography.body,color:colors.text},help:{...typography.detail,color:colors.secondary},error:{...typography.caption,color:colors.danger},actions:{flexDirection:'row',borderTopWidth:StyleSheet.hairlineWidth,borderColor:colors.line},choice:{minHeight:48,flex:1,alignItems:'center',justifyContent:'center'}});

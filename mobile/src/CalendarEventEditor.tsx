import {Ionicons} from '@expo/vector-icons';
import {ScrollArea as ScrollView} from './ScrollArea';
import React,{useRef,useState} from 'react';
import {Platform,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {CalendarDateTimeRow,DateTimeField} from './DateTimeField';
import {calendarReminderInstant,reminderDateLabel,reminderChoices,reminderOffsetLabel} from './calendar-display';
import {MotionPressable as Pressable} from './motion';
import {Button,Label} from './ui';
import {colors,typography} from './theme';
import {dateKey} from './domain';
import {localTime,shiftDay,wallTime,zonedDay} from './calendar-model';
import type {CalendarEvent,CalendarSource} from './calendar-model';
import type {TodoStore} from './useTodos';
export {eventDraft} from './calendar-edit-model';
export type {CalendarDraft} from './calendar-edit-model';
import {calendarWriteArgs,calendarDuckPatch,confirmedCalendarPatch} from './calendar-edit-model';
import type {CalendarDraft} from './calendar-edit-model';
export function CalendarDateField({label,value,onChange,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;disabled?:boolean}){return <DateTimeField label={label} value={value} disabled={disabled} onChange={v=>v&&onChange(v)} stacked/>;}
function TimeField({label,value,onChange,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;disabled?:boolean}){return <DateTimeField label={label} value={value} disabled={disabled} mode="time" onChange={v=>v&&onChange(v)} stacked/>;}
export type CalendarPending={id:string;status:string;expiresAt?:number;accountLabel?:string|null;targetTitle?:string|null;calendarName?:string|null;destinationCalendarName?:string|null;result?:{id?:string|null}};
export type CalendarActionState={pending:CalendarPending;locked:boolean;remoteDone?:boolean;savedEventId?:string};
export function CalendarEventEditor({store,draft,onDraft,event,sources,onSaved,onBusy,actionState,onActionState,metadataAvailable=false,sourceCursor,onMoreSources,sourceError}:{store:TodoStore;draft:CalendarDraft;onDraft:(v:CalendarDraft)=>void;event?:CalendarEvent;sources:CalendarSource[];onSaved:(patch?:Partial<CalendarEvent>)=>void;onBusy:(v:boolean)=>void;actionState?:CalendarActionState;onActionState:(value:CalendarActionState|null)=>void;metadataAvailable?:boolean;sourceCursor?:string|null;onMoreSources?:()=>void;sourceError?:string}){
 const scrollRef=useRef<React.ComponentRef<typeof ScrollView>|null>(null),revealReminder=useRef(false);
 const pending=actionState?.pending??null,locked=actionState?.locked??false;
 const [picker,setPicker]=useState<{row:'시작'|'종료';mode:'date'|'time'}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[calendarOpen,setCalendarOpen]=useState(false),[reminderOpen,setReminderOpen]=useState(false),[moreOpen,setMoreOpen]=useState(false);
 const update=(patch:Partial<CalendarDraft>)=>onDraft({...draft,...patch});
 const source=sources.find(c=>c.id===draft.calendarId),canWrite=event?event.canWrite===true:source?.canWrite===true;
 const localPatch=metadataAvailable?calendarDuckPatch(draft,event):{},hasLocal=Object.keys(localPatch).length>0;
 const connectionId=event?.connectionId??source?.connectionId;
 async function work(fn:()=>Promise<void>){if(busy)return;setBusy(true);onBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'일정을 저장하지 못했어요.');}finally{setBusy(false);onBusy(false);}}
 async function prepare(){await work(async()=>{
  const args=calendarWriteArgs(draft,event,!metadataAvailable);
  if(!args&&!hasLocal)throw Error('변경한 내용이 없어요.');
  if(hasLocal&&!connectionId)throw Error('연결을 새로 확인한 뒤 덕 정보를 저장해주세요.');
  if(args){if(!canWrite)throw Error('이 캘린더는 읽기 전용이에요.');if(event&&!event.etag)throw Error('원본 버전을 새로 확인해주세요.');onActionState({pending:await store.featureRequest('/api/assistant/actions','POST',{operation:event?'calendar.update':'calendar.create',args:{...args,...(connectionId?{connectionId}: {})}}) as CalendarPending,locked:false});}
  else onActionState({pending:{id:'duck-local',status:'pending'},locked:false});
 });}
 async function finish(savedEventId:string,remote:boolean){
  let patch:Partial<CalendarEvent>=remote?confirmedCalendarPatch(draft,event):{};
  if(hasLocal){
   if(!connectionId||!savedEventId)throw Error('Google 저장은 완료됐지만 덕 정보를 연결할 일정 번호를 확인하지 못했어요. 원본을 새로 확인해주세요.');
   const details=await store.featureRequest('/api/calendar/event-details','PATCH',{connectionId,calendarId:draft.calendarId,eventId:savedEventId,expectedRevision:event&&draft.calendarId!==(event.calendarId??'primary')?0:event?.duckDetails?.revision??0,patch:localPatch,timeZone:draft.timeZone}) as {revision:number;fields:NonNullable<CalendarEvent['duckDetails']>['fields']};
   patch={...patch,duckDetails:{revision:details.revision,fields:details.fields}};
   }
  store.reminders.retry();
  onSaved(patch);
 }
 async function confirm(){await work(async()=>{
  if(!pending||locked)return;
  if(pending.id==='duck-local'){await finish(event?.eventId??'',false);return;}
  onActionState({pending,locked:true});
  const result=await store.featureRequest('/api/assistant/actions/'+pending.id+'/confirm','POST',{confirmation:true}) as CalendarPending;
  if(result.status==='succeeded'){const id=result.result?.id??event?.eventId??'';onActionState({pending:result,locked:true,remoteDone:true,savedEventId:id});await finish(id,true);return;}
  setError('실행 결과를 확인해주세요. 자동으로 다시 저장하지 않아요.');
 });}
 async function check(){await work(async()=>{
  if(!pending)return;
  if(actionState?.remoteDone){await finish(actionState.savedEventId??event?.eventId??'',true);return;}
  const result=await store.featureRequest('/api/assistant/actions/'+pending.id) as CalendarPending;
  if(result.status==='succeeded'){const id=result.result?.id??event?.eventId??'';onActionState({pending:result,locked:true,remoteDone:true,savedEventId:id});await finish(id,true);}
  else if(['failed','cancelled','expired'].includes(result.status)||(result.status==='pending'&&result.expiresAt!==undefined&&result.expiresAt<Date.now())){if(result.status==='pending')await store.featureRequest('/api/assistant/actions/'+pending.id,'DELETE');onActionState(null);setError('이 저장은 실행되지 않았어요. 내용을 확인하고 새 미리보기를 만들어주세요.');}
  else setError(result.status==='unknown'?'저장 결과가 불확실해요. Google 원본을 확인해주세요. 다시 저장하지 마세요.':'현재 상태: '+result.status+'. 덕의 실행 기록에서도 확인할 수 있어요.');
 });}
 async function cancelPreview(){await work(async()=>{if(pending&&pending.id!=='duck-local')await store.featureRequest('/api/assistant/actions/'+pending.id,'DELETE');onActionState(null);});}
 const readonly=!canWrite;
 return <View style={{minHeight:0,flexShrink:1}}><ScrollView ref={scrollRef} onContentSizeChange={()=>{if(revealReminder.current){revealReminder.current=false;requestAnimationFrame(()=>scrollRef.current?.scrollToEnd({animated:true}));}}} style={{flexShrink:1}} testID="calendar-event-editor" keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:16,paddingBottom:24}}>
  {pending?<>
   <Text style={s.title}>{actionState?.remoteDone?'일정 저장 완료 · 알림 확인':locked?'저장 결과 확인이 필요해요':'저장 전 확인'}</Text><Text style={s.eventTitle}>{draft.title}</Text>
   <Text style={s.help}>{draft.startDay} {draft.allDay?'종일':draft.startTime} → {draft.endDay} {draft.allDay?'종일':draft.endTime}</Text>
   <Text style={s.help}>{pending.id==='duck-local'?'알림 설정을 저장해요.':'연결한 캘린더에도 같은 내용을 저장해요.'}</Text>
   <Text numberOfLines={2} style={s.help}>{pending.destinationCalendarName??source?.name??pending.calendarName??event?.calendarName??'선택한 캘린더'}</Text>{!!pending.accountLabel&&<Text style={s.help}>{pending.accountLabel}</Text>}
   {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
   {locked?<Button title={actionState?.remoteDone?'알림 저장 다시 시도':'저장 결과 확인'} quiet onPress={()=>void check()} disabled={busy}/>:<><Button title="저장" accessibilityLabel={event?'확인하고 일정 수정':'확인하고 일정 추가'} onPress={()=>void confirm()} disabled={busy}/><Button title="미리보기 취소하고 편집" quiet onPress={()=>void cancelPreview()} disabled={busy}/></>}
  </>:<>
   <View style={s.group}><TextInput accessibilityLabel="일정 제목" placeholder="제목" placeholderTextColor={colors.muted} value={draft.title} onChangeText={title=>update({title})} editable={!readonly} maxLength={event?.title===draft.title?Math.max(120,draft.title.length):120} style={[s.input,s.eventTitle]}/></View>
   <View style={s.group}>
    <View style={s.row}><Text style={s.title}>하루 종일</Text><Switch accessibilityLabel="종일 일정" value={draft.allDay} disabled={readonly} onValueChange={allDay=>{setPicker(null);update({allDay});}}/></View>
    <CalendarDateTimeRow kind="시작" day={draft.startDay} time={draft.startTime} allDay={draft.allDay} disabled={readonly} open={picker?.row==='시작'?picker.mode:null} onOpen={mode=>setPicker(mode?{row:'시작',mode}:null)} onDay={startDay=>update({startDay,endDay:draft.endDay<startDay?startDay:draft.endDay})} onTime={startTime=>update({startTime})}/>
    <CalendarDateTimeRow kind="종료" day={draft.endDay} time={draft.endTime} allDay={draft.allDay} disabled={readonly} open={picker?.row==='종료'?picker.mode:null} onOpen={mode=>setPicker(mode?{row:'종료',mode}:null)} onDay={endDay=>update({endDay})} onTime={endTime=>update({endTime})}/>
   </View>
   <View style={s.group}><Pressable accessibilityRole="button" accessibilityLabel="저장할 캘린더 선택" accessibilityState={{expanded:calendarOpen}} disabled={readonly} onPress={()=>setCalendarOpen(v=>!v)} style={s.row}><Text style={s.help}>캘린더</Text><Text numberOfLines={1} style={[s.title,{flex:1,textAlign:'right',marginLeft:12}]}>{source?.name??event?.calendarName??'캘린더 선택'}</Text>{!readonly&&<Ionicons name={calendarOpen?'chevron-up':'chevron-down'} size={17} color={colors.muted}/>}</Pressable>
   {calendarOpen&&<>{sources.map(c=><Pressable key={c.id} accessibilityRole="radio" accessibilityLabel={'캘린더 '+c.name} accessibilityState={{checked:c.id===draft.calendarId,disabled:!c.canWrite||!!event?.connectionId&&c.connectionId!==event.connectionId}} disabled={!c.canWrite||!!event?.connectionId&&c.connectionId!==event.connectionId} onPress={()=>{update({calendarId:c.id});setCalendarOpen(false);}} style={s.choice}><Text numberOfLines={2} style={[s.title,{flex:1}]}>{c.name}</Text><Text style={s.help}>{!c.canWrite?'읽기 전용':event?.connectionId&&c.connectionId!==event.connectionId?'다른 계정':c.id===draft.calendarId?'선택됨':''}</Text></Pressable>)}{!!sourceError&&<Text accessibilityRole="alert" style={s.error}>{sourceError}</Text>}{sourceCursor&&<Button title="캘린더 목록 더 보기" quiet onPress={()=>onMoreSources?.()}/>}</>}
   </View>
   {metadataAvailable&&<View style={s.group}><Pressable accessibilityRole="button" accessibilityLabel="덕 알림 선택" accessibilityState={{expanded:reminderOpen}} onPress={()=>{revealReminder.current=!reminderOpen;setReminderOpen(v=>!v);}} style={s.row}><Text style={s.title}>덕 알림</Text><Text style={s.help}>{reminderOffsetLabel(draft.reminderMinutes)}</Text><Ionicons name={reminderOpen?'chevron-up':'chevron-down'} size={17} color={colors.muted}/></Pressable>{reminderOpen&&<View testID="calendar-reminder-menu" style={s.popup}><ScrollView nestedScrollEnabled style={{maxHeight:300}} contentContainerStyle={{padding:4}}>{reminderChoices.map(minutes=><Pressable key={String(minutes)} style={s.choice} accessibilityRole="radio" accessibilityLabel={'덕 알림 '+reminderOffsetLabel(minutes)} accessibilityState={{checked:draft.reminderMinutes===minutes}} onPress={()=>{update({reminderMinutes:minutes});setReminderOpen(false);}}><View style={{flex:1,gap:2}}><Text style={s.title}>{reminderOffsetLabel(minutes)}</Text>{minutes!==null&&<Text style={s.help}>{(()=>{try{return reminderDateLabel(calendarReminderInstant(draft.startDay,draft.startTime,draft.allDay,draft.timeZone,minutes,event?.startAt)!,draft.timeZone);}catch{return '날짜와 시간을 확인해주세요.';}})()}</Text>}</View>{draft.reminderMinutes===minutes&&<Ionicons name="checkmark" size={18} color={colors.blueText}/>}</Pressable>)}</ScrollView>{!store.reminders.enabled&&store.reminders.supported&&<Button title="이 기기에서 알림 켜기" quiet disabled={store.reminders.busy} onPress={()=>void store.reminders.toggle(true)}/ >}{!!store.reminders.error&&<Text accessibilityRole="alert" style={s.error}>{store.reminders.error}</Text>}</View>}{draft.reminderMinutes!==null&&<Text testID="calendar-reminder-preview" style={s.help}>{(()=>{try{return reminderDateLabel(calendarReminderInstant(draft.startDay,draft.startTime,draft.allDay,draft.timeZone,draft.reminderMinutes,event?.startAt)!,draft.timeZone)+' · '+draft.timeZone+(draft.allDay?' · 종일 일정은 오전 9시 기준':'');}catch{return '날짜와 시간을 확인해주세요.';}})()}</Text>}</View>}
   <Pressable accessibilityRole="button" accessibilityLabel="일정 세부사항" accessibilityState={{expanded:moreOpen}} onPress={()=>setMoreOpen(v=>!v)} style={s.row}><Text style={s.help}>장소·메모</Text><Text style={s.help}>{moreOpen?'접기':'편집'}</Text></Pressable>
   {moreOpen&&<View style={s.group}><TextInput placeholder="장소" placeholderTextColor={colors.muted} accessibilityLabel="일정 장소" editable={!readonly} value={draft.location} onChangeText={location=>update({location})} maxLength={1000} style={s.input}/>{event?.notesPartial?<Text style={s.help}>긴 메모는 그대로 보존돼요.</Text>:<TextInput placeholder="메모" placeholderTextColor={colors.muted} accessibilityLabel="일정 메모" editable={!readonly} multiline value={draft.notes} onChangeText={notes=>update({notes})} maxLength={4000} style={[s.input,{minHeight:64,textAlignVertical:'top'}]}/>}</View>}
   {readonly&&<Text style={s.help}>읽기 전용 일정이에요.{metadataAvailable?' 알림은 바꿀 수 있어요.':''}</Text>}
   {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </>}
 </ScrollView>{!pending&&<View style={{paddingTop:8,borderTopWidth:StyleSheet.hairlineWidth,borderColor:colors.line}}><Button title="저장" accessibilityLabel="일정 저장 내용 미리보기" disabled={busy||!!picker||(!canWrite&&!metadataAvailable)} onPress={()=>void prepare()}/></View>}</View>;
}
const s=StyleSheet.create({popup:{backgroundColor:colors.popup,borderRadius:20,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.popupLine,overflow:'hidden'},field:{gap:4},input:{minHeight:44,backgroundColor:colors.grouped,borderRadius:12,padding:10,...typography.body,color:colors.text},group:{gap:8,padding:12,borderRadius:20,backgroundColor:colors.surface},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:44},dates:{flexDirection:'row',gap:8},choice:{minHeight:44,paddingVertical:8,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},title:{...typography.body,color:colors.text,fontWeight:'600'},eventTitle:{fontSize:24,lineHeight:32,fontWeight:'700',color:colors.text},section:{...typography.section,color:colors.text},help:{...typography.detail,color:colors.muted},error:{...typography.detail,color:colors.danger},options:{flexDirection:'row',flexWrap:'wrap',gap:6},option:{minHeight:44,padding:10,borderRadius:14,backgroundColor:colors.grouped,justifyContent:'center'},selected:{borderWidth:1,borderColor:colors.action}});

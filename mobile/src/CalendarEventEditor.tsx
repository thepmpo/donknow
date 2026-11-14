import {ScrollArea as ScrollView} from './ScrollArea';
import React,{useState} from 'react';
import {Platform,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
export function CalendarDateField({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);
 return <View style={s.field}><Label>{label}</Label>{Platform.OS==='web'?React.createElement('input',{type:'date','aria-label':label,value,onChange:(e:React.ChangeEvent<HTMLInputElement>)=>onChange(e.target.value),style:{minHeight:44,fontSize:16,padding:10,width:'100%',boxSizing:'border-box'}}):<><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={()=>setOpen(v=>!v)} style={s.input}><Text style={{color:colors.text}}>{value}</Text></Pressable>{open&&<DateTimePicker value={new Date(value+'T12:00:00')} mode="date" display="spinner" locale="ko-KR" onChange={(_,date)=>{if(date)onChange(dateKey(date));}}/>}</>}</View>;
}
function TimeField({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);const time=new Date();time.setHours(+value.slice(0,2),+value.slice(3),0,0);
 return <View style={s.field}><Label>{label}</Label>{Platform.OS==='web'?React.createElement('input',{type:'time','aria-label':label,value,onChange:(e:React.ChangeEvent<HTMLInputElement>)=>onChange(e.target.value),style:{minHeight:44,fontSize:16,padding:10,width:'100%',boxSizing:'border-box'}}):<><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={()=>setOpen(v=>!v)} style={s.input}><Text style={{color:colors.text}}>{value}</Text></Pressable>{open&&<DateTimePicker value={time} mode="time" display="spinner" locale="ko-KR" onChange={(_,date)=>{if(date)onChange(String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0'));}}/>}</>}</View>;
}
export type CalendarPending={id:string;status:string;expiresAt?:number;accountLabel?:string|null;targetTitle?:string|null;calendarName?:string|null;result?:{id?:string|null}};
export type CalendarActionState={pending:CalendarPending;locked:boolean;remoteDone?:boolean;savedEventId?:string};
export function CalendarEventEditor({store,draft,onDraft,event,sources,onSaved,onBusy,actionState,onActionState,metadataAvailable=false}:{store:TodoStore;draft:CalendarDraft;onDraft:(v:CalendarDraft)=>void;event?:CalendarEvent;sources:CalendarSource[];onSaved:(patch?:Partial<CalendarEvent>)=>void;onBusy:(v:boolean)=>void;actionState?:CalendarActionState;onActionState:(value:CalendarActionState|null)=>void;metadataAvailable?:boolean}){
 const pending=actionState?.pending??null,locked=actionState?.locked??false;
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const update=(patch:Partial<CalendarDraft>)=>onDraft({...draft,...patch});
 const source=sources.find(c=>c.id===draft.calendarId),canWrite=event?event.canWrite===true:source?.canWrite===true;
 const localPatch=metadataAvailable?calendarDuckPatch(draft,event):{},hasLocal=Object.keys(localPatch).length>0;
 const connectionId=event?.connectionId??source?.connectionId;
 async function work(fn:()=>Promise<void>){if(busy)return;setBusy(true);onBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'일정을 저장하지 못했어요.');}finally{setBusy(false);onBusy(false);}}
 async function prepare(){await work(async()=>{
  const args=calendarWriteArgs(draft,event,!metadataAvailable);
  if(!args&&!hasLocal)throw Error('변경한 내용이 없어요.');
  if(hasLocal&&!connectionId)throw Error('연결을 새로 확인한 뒤 덕 정보를 저장해주세요.');
  if(args){if(!canWrite)throw Error('Google 원본은 읽기 전용입니다. 덕 전용 정보만 변경할 수 있어요.');if(event&&!event.etag)throw Error('원본 버전을 새로 확인해주세요.');onActionState({pending:await store.featureRequest('/api/assistant/actions','POST',{operation:event?'calendar.update':'calendar.create',args}) as CalendarPending,locked:false});}
  else onActionState({pending:{id:'duck-local',status:'pending'},locked:false});
 });}
 async function finish(savedEventId:string,remote:boolean){
  let patch:Partial<CalendarEvent>=remote?confirmedCalendarPatch(draft,event):{};
  if(hasLocal){
   if(!connectionId||!savedEventId)throw Error('Google 저장은 완료됐지만 덕 정보를 연결할 일정 번호를 확인하지 못했어요. 원본을 새로 확인해주세요.');
   const details=await store.featureRequest('/api/calendar/event-details','PATCH',{connectionId,calendarId:draft.calendarId,eventId:savedEventId,expectedRevision:event?.duckDetails?.revision??0,patch:localPatch,timeZone:draft.timeZone}) as {revision:number;fields:NonNullable<CalendarEvent['duckDetails']>['fields']};
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
 return <ScrollView testID="calendar-event-editor" keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:16,paddingBottom:24}}>
  {pending?<>
   <Text style={s.title}>{actionState?.remoteDone?'Google 저장 완료 · 덕 정보 저장 확인':locked?'저장 결과 확인이 필요해요':'저장 전 확인'}</Text><Text style={s.eventTitle}>{draft.title}</Text>
   <Text style={s.help}>{draft.startDay} {draft.allDay?'종일':draft.startTime} → {draft.endDay} {draft.allDay?'종일':draft.endTime}</Text>
   <Text style={s.help}>{pending.id==='duck-local'?'덕에만 저장합니다. Google 원본은 바뀌지 않아요.':'제목·시간·장소·원본 메모의 변경 항목만 Google에 저장합니다. 초대 메일은 보내지 않아요.'}</Text>
   {hasLocal&&<Text style={s.help}>덕 알림·덕 메모·URL·첨부 링크는 덕에 별도로 저장합니다.</Text>}
   <Text numberOfLines={2} style={s.help}>{pending.calendarName??source?.name??event?.calendarName??'선택한 캘린더'}</Text>{!!pending.accountLabel&&<Text style={s.help}>{pending.accountLabel}</Text>}
   {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
   {locked?<Button title={actionState?.remoteDone?'덕 정보 저장 다시 시도':'저장 결과 확인'} quiet onPress={()=>void check()} disabled={busy}/>:<><Button title={event?'확인하고 일정 수정':'확인하고 일정 추가'} onPress={()=>void confirm()} disabled={busy}/><Button title="미리보기 취소하고 편집" quiet onPress={()=>void cancelPreview()} disabled={busy}/></>}
  </>:<>
   <View style={s.group}><Label>일정 제목</Label><TextInput accessibilityLabel="일정 제목" value={draft.title} onChangeText={title=>update({title})} editable={!readonly} maxLength={event?.title===draft.title?Math.max(120,draft.title.length):120} style={[s.input,s.eventTitle]}/></View>
   <View style={s.group}>
    <View style={s.row}><Text style={s.title}>하루 종일</Text><Switch accessibilityLabel="종일 일정" value={draft.allDay} disabled={readonly} onValueChange={allDay=>update({allDay})}/></View>
    <CalendarDateField label="일정 시작일" value={draft.startDay} onChange={startDay=>!readonly&&update({startDay,endDay:draft.endDay<startDay?startDay:draft.endDay})}/>
    {!draft.allDay&&<TimeField label="일정 시작 시간" value={draft.startTime} onChange={startTime=>!readonly&&update({startTime})}/>}
    <CalendarDateField label="일정 종료일" value={draft.endDay} onChange={endDay=>!readonly&&update({endDay})}/>
    {!draft.allDay&&<TimeField label="일정 종료 시간" value={draft.endTime} onChange={endTime=>!readonly&&update({endTime})}/>}
    <Text style={s.help}>{draft.timeZone} · 종일 종료일은 마지막 날짜를 포함해요.</Text>
   </View>
   <View style={s.group}><Label>캘린더</Label>{(event?sources.filter(c=>c.id===draft.calendarId):sources).map(c=><Pressable key={c.id} accessibilityRole="radio" accessibilityState={{checked:c.id===draft.calendarId,disabled:!!event||!c.canWrite}} disabled={!!event||!c.canWrite} onPress={()=>update({calendarId:c.id})} style={s.choice}><Text numberOfLines={2} style={s.title}>{c.id===draft.calendarId?'● ':'○ '}{c.name}{!c.canWrite?' · 읽기 전용':''}</Text></Pressable>)}{event&&!source&&<Text style={s.title}>{event.calendarName??'Google 캘린더'}</Text>}</View>
   <View style={s.group}><Label>장소</Label><TextInput accessibilityLabel="일정 장소" editable={!readonly} value={draft.location} onChangeText={location=>update({location})} maxLength={1000} style={s.input}/><Label>원본 메모</Label>{event?.notesPartial?<Text style={s.help}>긴 원본 메모는 그대로 보존합니다. Google에서 편집해주세요.</Text>:<TextInput accessibilityLabel="일정 메모" editable={!readonly} multiline value={draft.notes} onChangeText={notes=>update({notes})} maxLength={4000} style={[s.input,{minHeight:88,textAlignVertical:'top'}]}/>}</View>
   {event?.providerDetails&&<View style={s.group}><Text style={s.title}>Google에서 관리하는 정보</Text><Text style={s.help}>{event.recurring?'반복 일정의 이 한 건 · ':''}원본 알림{(event.providerDetails.attendees?.length??0)?' · 참석자 '+(event.providerDetails.attendees?.length??0)+'명':''}{(event.providerDetails.attachments?.length??0)?' · 원본 첨부 '+(event.providerDetails.attachments?.length??0)+'개':''}은 그대로 보존해요. 변경은 Google 원본에서 해주세요.</Text></View>}
   {metadataAvailable&&<>
    <Text style={s.section}>덕에만 저장</Text>
    <View style={s.group}><Text style={s.title}>덕 앱 알림</Text><View style={s.options}>{[[null,'없음'],[0,'시작할 때'],[10,'10분 전'],[30,'30분 전'],[60,'1시간 전'],[1440,'1일 전']].map(([minutes,label])=><Pressable key={String(minutes)} style={[s.option,draft.reminderMinutes===minutes&&s.selected]} accessibilityRole="radio" accessibilityLabel={'덕 알림 '+label} accessibilityState={{checked:draft.reminderMinutes===minutes}} onPress={()=>update({reminderMinutes:minutes as number|null})}><Text style={s.help}>{label}</Text></Pressable>)}</View><Text style={s.help}>종일 일정은 오전 9시 기준이에요. Google 알림과 별개이며, 이 기기의 덕 알림 허용이 필요해요.</Text>{!store.reminders.enabled&&store.reminders.supported&&<Button title="이 기기에서 덕 알림 켜기" quiet disabled={store.reminders.busy} onPress={()=>void store.reminders.toggle(true)}/ >}{!store.reminders.supported&&<Text style={s.help}>실제 알림은 iPhone 앱에서 켤 수 있어요.</Text>}{!!store.reminders.error&&<Text accessibilityRole="alert" style={s.error}>{store.reminders.error}</Text>}</View>
    <View style={s.group}><Label>덕 전용 메모</Label><TextInput accessibilityLabel="덕 전용 메모" multiline value={draft.localNotes} onChangeText={localNotes=>update({localNotes})} maxLength={8000} style={[s.input,{minHeight:88,textAlignVertical:'top'}]}/><Label>URL</Label><TextInput accessibilityLabel="덕 일정 URL" value={draft.duckUrl} onChangeText={duckUrl=>update({duckUrl})} autoCapitalize="none" keyboardType="url" maxLength={2000} placeholder="https://" style={s.input}/>
     <Label>첨부 링크</Label>{draft.attachments.map((a,i)=><View key={i} style={{gap:6}}><TextInput accessibilityLabel={'첨부 링크 이름 '+(i+1)} value={a.name} onChangeText={name=>update({attachments:draft.attachments.map((v,k)=>k===i?{...v,name}:v)})} maxLength={200} style={s.input}/><TextInput accessibilityLabel={'첨부 링크 주소 '+(i+1)} value={a.url} onChangeText={url=>update({attachments:draft.attachments.map((v,k)=>k===i?{...v,url}:v)})} autoCapitalize="none" keyboardType="url" maxLength={2000} style={s.input}/><Button title={'첨부 링크 '+(i+1)+' 삭제'} quiet onPress={()=>update({attachments:draft.attachments.filter((_,k)=>k!==i)})}/></View>)}{draft.attachments.length<20&&<Button title="첨부 링크 추가" quiet onPress={()=>update({attachments:[...draft.attachments,{name:'',url:''}]})}/>}<Text style={s.help}>파일 자체를 업로드하지 않고 링크를 저장해요.</Text>
    </View>
   </>}
   {readonly&&<Text style={s.help}>Google 원본은 읽기 전용이에요.{metadataAvailable?' 덕에만 저장하는 정보는 편집할 수 있어요.':' 내정보에서 캘린더 쓰기를 승인해주세요.'}</Text>}
   {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}<Button title="일정 저장 내용 미리보기" disabled={busy||(!canWrite&&!metadataAvailable)} onPress={()=>void prepare()}/>
  </>}
 </ScrollView>;
}
const s=StyleSheet.create({field:{gap:4},input:{minHeight:44,backgroundColor:colors.grouped,borderRadius:12,padding:10,...typography.body,color:colors.text},group:{gap:8,padding:12,borderRadius:20,backgroundColor:colors.surface},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:44},choice:{minHeight:44,paddingVertical:10},title:{...typography.body,color:colors.text,fontWeight:'600'},eventTitle:{fontSize:24,lineHeight:32,fontWeight:'700',color:colors.text},section:{...typography.section,color:colors.text},help:{...typography.detail,color:colors.muted},error:{...typography.detail,color:colors.danger},options:{flexDirection:'row',flexWrap:'wrap',gap:6},option:{minHeight:44,padding:10,borderRadius:14,backgroundColor:colors.grouped,justifyContent:'center'},selected:{borderWidth:1,borderColor:colors.action}});

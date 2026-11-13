import React,{useState} from 'react';
import {Platform,ScrollView,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {MotionPressable as Pressable} from './motion';
import {Button,Label} from './ui';
import {colors,typography} from './theme';
import {dateKey} from './domain';
import {localTime,shiftDay,wallTime,zonedDay} from './calendar-model';
import type {CalendarEvent,CalendarSource} from './calendar-model';
import type {TodoStore} from './useTodos';
export type CalendarDraft={title:string;startDay:string;endDay:string;startTime:string;endTime:string;allDay:boolean;notes:string;location:string;calendarId:string;timeZone:string};
export function eventDraft(day:string,zone:string,calendarId:string,event?:CalendarEvent):CalendarDraft{return {title:event?.title??'',startDay:event?.allDay?event.dueDate??day:event?.startAt?zonedDay(event.startAt,zone):day,endDay:event?.allDay?shiftDay(event.endDate??shiftDay(day,1),-1):event?.endAt?zonedDay(event.endAt,zone):day,startTime:event?.startAt?localTime(event.startAt,zone):'09:00',endTime:event?.endAt?localTime(event.endAt,zone):'10:00',allDay:event?.allDay??false,notes:event?.notes??'',location:event?.location??'',calendarId:event?.calendarId??calendarId,timeZone:zone};}
export function CalendarDateField({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);
 return <View style={s.field}><Label>{label}</Label>{Platform.OS==='web'?React.createElement('input',{type:'date','aria-label':label,value,onChange:(e:React.ChangeEvent<HTMLInputElement>)=>onChange(e.target.value),style:{minHeight:44,fontSize:16,padding:10,width:'100%',boxSizing:'border-box'}}):<><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={()=>setOpen(v=>!v)} style={s.input}><Text style={{color:colors.text}}>{value}</Text></Pressable>{open&&<DateTimePicker value={new Date(value+'T12:00:00')} mode="date" display="spinner" locale="ko-KR" onChange={(_,date)=>{if(date)onChange(dateKey(date));}}/>}</>}</View>;
}
function TimeField({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);const time=new Date();time.setHours(+value.slice(0,2),+value.slice(3),0,0);
 return <View style={s.field}><Label>{label}</Label>{Platform.OS==='web'?React.createElement('input',{type:'time','aria-label':label,value,onChange:(e:React.ChangeEvent<HTMLInputElement>)=>onChange(e.target.value),style:{minHeight:44,fontSize:16,padding:10,width:'100%',boxSizing:'border-box'}}):<><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={()=>setOpen(v=>!v)} style={s.input}><Text style={{color:colors.text}}>{value}</Text></Pressable>{open&&<DateTimePicker value={time} mode="time" display="spinner" locale="ko-KR" onChange={(_,date)=>{if(date)onChange(String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0'));}}/>}</>}</View>;
}
export type CalendarPending={id:string;status:string;expiresAt?:number;accountLabel?:string|null;targetTitle?:string|null;calendarName?:string|null};
export function CalendarEventEditor({store,draft,onDraft,event,sources,onSaved,onBusy,actionState,onActionState}:{store:TodoStore;draft:CalendarDraft;onDraft:(v:CalendarDraft)=>void;event?:CalendarEvent;sources:CalendarSource[];onSaved:()=>void;onBusy:(v:boolean)=>void;actionState?:{pending:CalendarPending;locked:boolean};onActionState:(value:{pending:CalendarPending;locked:boolean}|null)=>void}){
 const pending=actionState?.pending??null,locked=actionState?.locked??false;
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const setPending=(pending:CalendarPending|null)=>onActionState(pending?{pending,locked:false}:null);
 const update=(patch:Partial<CalendarDraft>)=>onDraft({...draft,...patch});
 const source=sources.find(c=>c.id===draft.calendarId),canWrite=event?event.canWrite===true:source?.canWrite===true;
 async function work(fn:()=>Promise<void>){if(busy)return;setBusy(true);onBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'일정을 저장하지 못했어요.');}finally{setBusy(false);onBusy(false);}}
 function args(){const base={title:draft.title.trim(),calendarId:draft.calendarId,timeZone:draft.timeZone,location:draft.location,...(!event?.notesPartial?{notes:draft.notes}:{}),...(event?{id:event.eventId??'',...(event.etag?{expectedETag:event.etag}:{})}:{})};if(!base.title)throw Error('일정 제목을 적어주세요.');if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDay)||!/^\d{4}-\d{2}-\d{2}$/.test(draft.endDay))throw Error('날짜를 선택해주세요.');return draft.allDay?{...base,allDay:true,startDate:draft.startDay,endDate:shiftDay(draft.endDay,1)}:{...base,allDay:false,start:wallTime(draft.startDay,draft.startTime,draft.timeZone),end:wallTime(draft.endDay,draft.endTime,draft.timeZone)};}
 async function prepare(){await work(async()=>{if(!canWrite)throw Error('이 캘린더의 쓰기 권한을 내정보에서 승인해주세요.');const a=args();if(draft.endDay<draft.startDay)throw Error('종료일은 시작일 이후로 선택해주세요.');setPending(await store.featureRequest('/api/assistant/actions','POST',{operation:event?'calendar.update':'calendar.create',args:a}) as CalendarPending);});}
 async function confirm(){await work(async()=>{if(!pending||locked)return;onActionState({pending,locked:true});const result=await store.featureRequest('/api/assistant/actions/'+pending.id+'/confirm','POST',{confirmation:true}) as CalendarPending;if(result.status==='succeeded'){onSaved();return;}setError('실행 결과를 확인해주세요. 자동으로 다시 저장하지 않아요.');});}
 async function check(){await work(async()=>{if(!pending)return;const result=await store.featureRequest('/api/assistant/actions/'+pending.id) as CalendarPending;if(result.status==='succeeded')onSaved();else if(['failed','cancelled','expired'].includes(result.status)||(result.status==='pending'&&result.expiresAt!==undefined&&result.expiresAt<Date.now())){if(result.status==='pending')await store.featureRequest('/api/assistant/actions/'+pending.id,'DELETE');setPending(null);setError('이 저장은 실행되지 않았어요. 내용을 확인하고 새 미리보기를 만들어주세요.');}else setError(result.status==='unknown'?'저장 결과가 불확실해요. Google 원본을 확인해주세요. 다시 저장하지 마세요.':'현재 상태: '+result.status+'. 덕의 실행 기록에서도 확인할 수 있어요.');});}
 async function cancelPreview(){await work(async()=>{if(pending){await store.featureRequest('/api/assistant/actions/'+pending.id,'DELETE');setPending(null);}});}
 return <ScrollView testID="calendar-event-editor" keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:14,paddingBottom:24}}>
  <Text style={s.help}>Google 원본에 {event?'이 일정 한 건을 수정':'새 일정을 추가'}합니다. 초대 메일은 보내지 않아요.</Text>
  {pending?<><Text style={s.title}>{locked?'저장 결과 확인이 필요해요':'저장 전 확인'}</Text><Text style={s.title}>{draft.title}</Text><Text style={s.help}>{draft.startDay} {draft.allDay?'종일':draft.startTime} → {draft.endDay} {draft.allDay?'종일':draft.endTime}</Text><Text style={s.help}>{draft.timeZone} · {pending.calendarName??source?.name??'선택한 캘린더'}</Text>{!!pending.accountLabel&&<Text style={s.help}>{pending.accountLabel}</Text>}{!!pending.targetTitle&&event&&<Text style={s.help}>원본: {pending.targetTitle}</Text>}{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}{locked?<Button title="저장 결과 확인" quiet onPress={()=>void check()} disabled={busy}/>:<><Button title={event?'확인하고 일정 수정':'확인하고 일정 추가'} onPress={()=>void confirm()} disabled={busy}/><Button title="미리보기 취소하고 편집" quiet onPress={()=>void cancelPreview()} disabled={busy}/></>}</>:<>
   <Label>일정 제목</Label><TextInput accessibilityLabel="일정 제목" value={draft.title} onChangeText={title=>update({title})} maxLength={120} style={s.input}/>
   <View style={s.row}><Text style={s.title}>종일</Text><Switch accessibilityLabel="종일 일정" value={draft.allDay} onValueChange={allDay=>update({allDay})}/></View>
   <CalendarDateField label="일정 시작일" value={draft.startDay} onChange={startDay=>update({startDay,endDay:draft.endDay<startDay?startDay:draft.endDay})}/><CalendarDateField label="일정 종료일" value={draft.endDay} onChange={endDay=>update({endDay})}/>
   {!draft.allDay&&<><TimeField label="일정 시작 시간" value={draft.startTime} onChange={startTime=>update({startTime})}/><TimeField label="일정 종료 시간" value={draft.endTime} onChange={endTime=>update({endTime})}/></>}
   <Text style={s.help}>입력한 시각의 시간대: {draft.timeZone}. 종일 종료일은 마지막 날짜를 포함해 표시합니다.</Text>
   <Label>저장할 캘린더</Label>{sources.map(c=><Pressable key={c.id} accessibilityRole="radio" accessibilityState={{checked:c.id===draft.calendarId,disabled:!!event||!c.canWrite}} disabled={!!event||!c.canWrite} onPress={()=>update({calendarId:c.id})} style={s.choice}><Text style={{color:c.canWrite?colors.text:colors.muted}}>{c.id===draft.calendarId?'● ':'○ '}{c.name}{!c.canWrite?' · 읽기 전용':''}</Text></Pressable>)}
   <Label>장소</Label><TextInput accessibilityLabel="일정 장소" value={draft.location} onChangeText={location=>update({location})} maxLength={1000} style={s.input}/>
   <Label>메모</Label>{event?.notesPartial?<Text style={s.help}>긴 원본 메모는 그대로 보존합니다. 원본에서 편집해주세요.</Text>:<TextInput accessibilityLabel="일정 메모" multiline value={draft.notes} onChangeText={notes=>update({notes})} maxLength={4000} style={[s.input,{minHeight:100,textAlignVertical:'top'}]}/>}
   {!canWrite&&<Text style={s.help}>읽기 전용입니다. 내정보 → Google에서 캘린더 쓰기를 승인하고, 쓸 수 있는 캘린더를 선택해주세요.</Text>}
   {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}<Button title="일정 저장 내용 미리보기" disabled={busy||!canWrite} onPress={()=>void prepare()}/>
  </>}
 </ScrollView>;
}
const s=StyleSheet.create({field:{gap:6},input:{minHeight:48,backgroundColor:colors.surface,borderRadius:12,padding:12,...typography.body,color:colors.text},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:44},choice:{minHeight:44,paddingVertical:10},title:{...typography.body,color:colors.text,fontWeight:'600'},help:{...typography.detail,color:colors.muted},error:{...typography.detail,color:colors.danger}});

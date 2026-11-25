import {appleEventPatch,isAppleCalendar} from './apple-calendar-model';
import {useKeyboardUX} from './KeyboardUX';
import {ScrollRevealContext,ScrollRevealRegion,useFocusedField} from './useFocusedField';
import {Ionicons} from '@expo/vector-icons';
import {ScrollArea as ScrollView} from './ScrollArea';
import React,{useContext,useEffect,useRef,useState} from 'react';
import {Platform,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {CalendarDateTimeRow,DateTimeField} from './DateTimeField';
import {reminderChoices,reminderOffsetLabel} from './calendar-display';
import {MotionPressable as Pressable} from './motion';
import {Button,Label} from './ui';
import {colors,typography} from './theme';
import {validZone,safeCalendarLink} from './calendar-model';
import type {CalendarEvent,CalendarSource} from './calendar-model';
import type {TodoStore} from './useTodos';
export {eventDraft} from './calendar-edit-model';
export type {CalendarDraft} from './calendar-edit-model';
import {calendarWriteArgs,calendarDuckPatch,confirmedCalendarPatch} from './calendar-edit-model';
import type {CalendarDraft} from './calendar-edit-model';
export function CalendarDateField({label,value,onChange,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;disabled?:boolean}){return <DateTimeField label={label} value={value} disabled={disabled} onChange={v=>v&&onChange(v)} stacked/>;}
function TimeField({label,value,onChange,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;disabled?:boolean}){return <DateTimeField label={label} value={value} disabled={disabled} mode="time" onChange={v=>v&&onChange(v)} stacked/>;}
export type CalendarPending={args?:Record<string,unknown>;id:string;status:string;expiresAt?:number;accountLabel?:string|null;targetTitle?:string|null;calendarName?:string|null;destinationCalendarName?:string|null;result?:{id?:string|null}};
export type CalendarActionState={pending:CalendarPending;locked:boolean;remoteDone?:boolean;savedEventId?:string};
export function CalendarEventEditor({store,draft,onDraft,event,sources,onSaved,onBusy,actionState,onActionState,metadataAvailable=false,createOptionsAvailable=false,sourceLoading=false,onOpenConnections,onSaveNative,inline=false,prepareAction,sourceCursor,onMoreSources,sourceError,onRefreshPermission,onBackgroundSave}:{store:TodoStore;draft:CalendarDraft;onDraft:(v:CalendarDraft)=>void;event?:CalendarEvent;sources:CalendarSource[];onSaved:(patch?:Partial<CalendarEvent>)=>void;onBusy:(v:boolean)=>void;actionState?:CalendarActionState;onActionState:(value:CalendarActionState|null)=>void;inline?:boolean;prepareAction?:(args:Record<string,unknown>)=>Promise<CalendarPending>;metadataAvailable?:boolean;createOptionsAvailable?:boolean;sourceLoading?:boolean;onOpenConnections?:()=>void;onSaveNative?:(draft:CalendarDraft,event?:CalendarEvent)=>Promise<CalendarEvent>;sourceCursor?:string|null;onMoreSources?:()=>void;sourceError?:string;onRefreshPermission?:()=>void;onBackgroundSave?:(job:{optimistic:CalendarEvent;run:()=>Promise<Partial<CalendarEvent>>;check:()=>Promise<Partial<CalendarEvent>>})=>void}){
 const keyboard=useKeyboardUX();
 const scrollRef=useRef<React.ComponentRef<typeof ScrollView>|null>(null);
 const titleRef=useRef<React.ComponentRef<typeof TextInput>>(null),notesRef=useRef<React.ComponentRef<typeof TextInput>>(null),localField=useFocusedField(scrollRef),parentReveal=useContext(ScrollRevealContext),inlineFocused=useRef<React.ComponentRef<typeof TextInput>|null>(null);
 const field=inline?{...localField,show:parentReveal,focus:(input:React.ComponentRef<typeof TextInput>|null)=>{inlineFocused.current=input;parentReveal(input);},reveal:()=>parentReveal(inlineFocused.current)}:localField;
 const pending=actionState?.pending??null,locked=actionState?.locked??false;
 const [picker,setPicker]=useState<{row:'시작'|'종료';mode:'date'|'time'}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[calendarOpen,setCalendarOpen]=useState(false),[reminderOpen,setReminderOpen]=useState(false),[repeatOpen,setRepeatOpen]=useState(false);
 const update=(patch:Partial<CalendarDraft>)=>onDraft({...draft,...patch});
 const source=sources.find(c=>c.id===draft.calendarId),canWrite=event?event.canWrite===true:source?.canWrite===true;
 const writableDestination=sources.find(calendar=>calendar.canWrite&&(!sourceError||isAppleCalendar(calendar.id)));
 useEffect(()=>{
  if(!event&&!pending&&!sourceLoading&&!canWrite&&writableDestination){
   onDraft({...draft,calendarId:writableDestination.id});
  }
 },[event,pending,sourceLoading,canWrite,writableDestination?.id,draft,onDraft]);
 const localPatch=metadataAvailable?calendarDuckPatch(draft,event):{},hasLocal=Object.keys(localPatch).length>0;
 const native=isAppleCalendar(draft.calendarId)||event?.provider==='apple-calendar',nativeWriting=useRef(false);
 const connectionId=event?.connectionId??source?.connectionId;
 function notify(unknown:boolean){void store.featureRequest('/api/assistant/notices','POST',{code:unknown?'calendar-unknown':'calendar-failed',provider:native?'apple-calendar':'google',title:draft.title}).catch(()=>{});}
 async function work(fn:()=>Promise<void>){if(busy)return;setBusy(true);onBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'일정을 저장하지 못했어요.');if(locked||pending||e instanceof Error&&/권한|연결|버전/.test(e.message))notify(locked||!!(e&&typeof e==='object'&&'writeState' in e&&e.writeState==='unknown'));}finally{setBusy(false);onBusy(false);}}
 async function prepare(){await work(async()=>{
  if(!validZone(draft.timeZone))throw Error('시간대를 확인해주세요.');
  if(draft.duckUrl&&!safeCalendarLink(draft.duckUrl)||draft.attachments.some(a=>!a.name.trim()||!safeCalendarLink(a.url)))throw Error('링크와 첨부 파일에는 이름과 https 주소를 입력해주세요.');
  if(!event&&!native&&!createOptionsAvailable&&((draft.repeat&&draft.repeat!=='none')||draft.guests?.trim()))throw Error('연결을 새로 확인한 뒤 반복·초대를 설정해주세요.');
  if(native){if(!canWrite||!onSaveNative)throw Error('쓰기 가능한 아이폰 캘린더를 선택해주세요.');appleEventPatch(draft,event);onActionState({pending:{id:'apple-local',status:'pending'},locked:false});return;}
  const args=calendarWriteArgs(draft,event,!metadataAvailable);
  if(!args&&!hasLocal)throw Error('변경한 내용이 없어요.');
  if(hasLocal&&!connectionId)throw Error('연결을 새로 확인한 뒤 docen 정보를 저장해주세요.');
  if(args){if(!canWrite)throw Error('원본 수정 권한이 필요해요. ME → 연결된 서비스 → Google에서 캘린더 수정 권한을 확인해주세요.');if(event&&!event.etag)throw Error('원본 버전을 새로 확인해주세요.');onActionState({pending:prepareAction?await prepareAction({...args,...(connectionId?{connectionId}:{})}):await store.featureRequest('/api/assistant/actions','POST',{operation:event?'calendar.update':'calendar.create',args:{...args,...(connectionId?{connectionId}: {})}}) as CalendarPending,locked:false});}
  else onActionState({pending:{id:'duck-local',status:'pending'},locked:false});
 });}
 async function finish(savedEventId:string,remote:boolean,deliver=true){
  if(remote&&!savedEventId)throw Error('저장한 원본 일정 번호를 확인하지 못했어요. 같은 실행의 결과를 다시 확인해주세요.');
  let patch:Partial<CalendarEvent>=remote?confirmedCalendarPatch(draft,event):{};
  if(hasLocal){
   if(!connectionId||!savedEventId)throw Error('Google 저장은 완료됐지만 docen 정보를 연결할 일정 번호를 확인하지 못했어요. 원본을 새로 확인해주세요.');
   const details=await store.featureRequest('/api/calendar/event-details','PATCH',{connectionId,calendarId:draft.calendarId,eventId:savedEventId,expectedRevision:event&&draft.calendarId!==(event.calendarId??'primary')?0:event?.duckDetails?.revision??0,patch:localPatch,timeZone:draft.timeZone}) as {revision:number;fields:NonNullable<CalendarEvent['duckDetails']>['fields']};
   patch={...patch,duckDetails:{revision:details.revision,fields:details.fields}};
   }
  if(remote&&!event)patch={...patch,id:'confirmed:'+connectionId+':'+draft.calendarId+':'+savedEventId,eventId:savedEventId,connectionId,calendarId:draft.calendarId,calendarName:source?.name,title:draft.title.trim(),dueDate:draft.startDay,canWrite:false};
  store.reminders.retry();
  if(deliver)onSaved(patch);return patch;
 }
 async function confirm(){
  if(pending?.id==='apple-local'){if(nativeWriting.current||locked||!onSaveNative)return;nativeWriting.current=true;await work(async()=>{onActionState({pending,locked:true});try{const saved=await onSaveNative(draft,event);onSaved(saved);}catch(error){if(error&&typeof error==='object'&&'writeState' in error&&error.writeState==='unknown'){onActionState({pending:{...pending,status:'unknown'},locked:true});}else{nativeWriting.current=false;onActionState(null);}throw error;}});return;}
  if(pending&&!locked&&pending.id!=='duck-local'&&onBackgroundSave){
   const action=pending;onActionState({pending:action,locked:true});
   const optimistic:CalendarEvent={...event,...confirmedCalendarPatch(draft,event),id:event?.id??'pending:'+action.id,title:draft.title.trim(),calendarId:draft.calendarId,calendarName:source?.name??event?.calendarName,connectionId,dueDate:draft.startDay,saveState:'saving',canWrite:false,etag:null};
   const attempt=async(readOnly=false):Promise<Partial<CalendarEvent>>=>{
    let result:CalendarPending;
    try{result=await store.featureRequest('/api/assistant/actions/'+action.id+(readOnly?'':'/confirm'),readOnly?'GET':'POST',readOnly?undefined:{confirmation:true}) as CalendarPending;}
    catch(error){if(!readOnly){try{result=await store.featureRequest('/api/assistant/actions/'+action.id) as CalendarPending;}catch{throw Object.assign(new Error('저장 결과를 아직 확인하지 못했어요.'),{writeState:'unknown'});}}else throw error;}
    if(result.status!=='succeeded')throw Object.assign(new Error('원본 저장 결과를 확인해주세요.'),{writeState:['failed','cancelled','expired'].includes(result.status)?'failed':'unknown'});
    try{return await finish(result.result?.id??event?.eventId??'',true,false);}catch{throw Object.assign(new Error('원본은 저장됐지만 docen 알림·추가 정보 저장을 확인해야 해요.'),{writeState:'unknown'});}
   };
   onBackgroundSave({optimistic,run:()=>attempt(),check:()=>attempt(true)});return;
  }
  await work(async()=>{
  if(!pending||locked)return;
  if(pending.id==='duck-local'){await finish(event?.eventId??'',false);return;}
  onActionState({pending,locked:true});
  const result=await store.featureRequest('/api/assistant/actions/'+pending.id+'/confirm','POST',{confirmation:true}) as CalendarPending;
  if(result.status==='succeeded'){const id=result.result?.id??event?.eventId??'';onActionState({pending:result,locked:true,remoteDone:true,savedEventId:id});await finish(id,true);return;}
  setError('실행 결과를 확인해주세요. 자동으로 다시 저장하지 않아요.');notify(true);
 });}
 async function check(){await work(async()=>{
  if(!pending)return;
  if(pending.id==='apple-local'){onRefreshPermission?.();setError('아이폰 캘린더에서 저장 결과를 확인해주세요.');return;}
  if(actionState?.remoteDone){await finish(actionState.savedEventId??event?.eventId??'',true);return;}
  const result=await store.featureRequest('/api/assistant/actions/'+pending.id) as CalendarPending;
  if(result.status==='succeeded'){const id=result.result?.id??event?.eventId??'';onActionState({pending:result,locked:true,remoteDone:true,savedEventId:id});await finish(id,true);}
  else if(['failed','cancelled','expired'].includes(result.status)||(result.status==='pending'&&result.expiresAt!==undefined&&result.expiresAt<Date.now())){if(result.status==='pending')await store.featureRequest('/api/assistant/actions/'+pending.id,'DELETE');onActionState(null);setError('이 저장은 실행되지 않았어요. 내용을 확인하고 새 미리보기를 만들어주세요.');}
  else {if(result.status==='unknown')notify(true);setError(result.status==='unknown'?'저장 결과가 불확실해요. Google 원본을 확인해주세요. 다시 저장하지 마세요.':'현재 상태: '+result.status+'. docen의 실행 기록에서도 확인할 수 있어요.');}
 });}
 async function cancelPreview(){await work(async()=>{if(pending&&pending.id!=='duck-local'&&pending.id!=='apple-local')await store.featureRequest('/api/assistant/actions/'+pending.id,'DELETE');onActionState(null);});}
 // A local new draft stays editable while its calendar permission is being read.
 const readonly=!!event&&!canWrite;
 const repeatLabels={none:'안 함',daily:'매일',weekly:'매주',monthly:'매월',yearly:'매년'};
 const fields=<>
  {pending?<>
   <Text style={s.title}>{actionState?.remoteDone?'일정 저장 완료 · 알림 확인':locked?'저장 결과 확인이 필요해요':'저장 전 확인'}</Text><Text style={s.eventTitle}>{draft.title}</Text>
   <Text style={s.help}>{draft.startDay} {draft.allDay?'종일':draft.startTime} → {draft.endDay} {draft.allDay?'종일':draft.endTime}</Text>
   <Text style={s.help}>{pending.id==='duck-local'?'알림 설정을 저장해요.':'연결한 캘린더에도 같은 내용을 저장해요.'}</Text>
   {!!draft.repeat&&draft.repeat!=='none'&&<Text style={s.help}>반복 · {repeatLabels[draft.repeat]}</Text>}{!!draft.guests?.trim()&&<Text style={s.help}>초대 메일을 보내요 · {draft.guests}</Text>}
   <Text numberOfLines={2} style={s.help}>{pending.destinationCalendarName??source?.name??pending.calendarName??event?.calendarName??'선택한 캘린더'}</Text>{!!pending.accountLabel&&<Text style={s.help}>{pending.accountLabel}</Text>}
   {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
   {locked?<Button title={actionState?.remoteDone?'알림 저장 다시 시도':'저장 결과 확인'} quiet onPress={()=>void check()} disabled={busy}/>:<><Button title="저장" accessibilityLabel={event?'확인하고 일정 수정':'확인하고 일정 추가'} onPress={()=>void confirm()} disabled={busy}/><Button title="미리보기 취소하고 편집" quiet onPress={()=>void cancelPreview()} disabled={busy}/></>}
  </>:<>
   <View style={s.group}><TextInput ref={titleRef} onFocus={()=>{setPicker(null);field.focus(titleRef.current);}} accessibilityLabel="일정 제목" placeholder="제목" placeholderTextColor={colors.muted} value={draft.title} onChangeText={title=>update({title})} editable={!busy} maxLength={event?.title===draft.title?Math.max(120,draft.title.length):120} style={[s.input,s.eventTitle]}/></View>
   <View style={s.group}>
    <CalendarDateTimeRow kind="시작" day={draft.startDay} time={draft.startTime} allDay={draft.allDay} disabled={readonly} open={picker?.row==='시작'?picker.mode:null} onOpen={mode=>setPicker(mode?{row:'시작',mode}:null)} onDay={startDay=>update({startDay,endDay:draft.endDay<startDay?startDay:draft.endDay})} onTime={startTime=>update({startTime})}/>
    <CalendarDateTimeRow kind="종료" day={draft.endDay} time={draft.endTime} allDay={draft.allDay} disabled={readonly} open={picker?.row==='종료'?picker.mode:null} onOpen={mode=>setPicker(mode?{row:'종료',mode}:null)} onDay={endDay=>update({endDay})} onTime={endTime=>update({endTime})}/>
    <View style={s.row}><Text style={s.title}>하루 종일</Text><Switch accessibilityLabel="종일 일정" value={draft.allDay} disabled={readonly} onValueChange={allDay=>{setPicker(null);update({allDay});}}/></View>

    {!event&&(createOptionsAvailable||native)&&<><Pressable accessibilityRole="button" accessibilityLabel="일정 반복 선택" accessibilityState={{expanded:repeatOpen}} onPress={()=>{setPicker(null);setRepeatOpen(v=>!v);}} style={s.row}><Text style={s.title}>반복</Text><Text style={s.help}>{repeatLabels[draft.repeat??'none']}</Text><Ionicons name="chevron-down" size={16} color={colors.muted}/></Pressable>{repeatOpen&&<View>{(Object.keys(repeatLabels) as Array<keyof typeof repeatLabels>).map(repeat=><Pressable key={repeat} accessibilityRole="radio" accessibilityLabel={'반복 '+repeatLabels[repeat]} accessibilityState={{checked:(draft.repeat??'none')===repeat}} onPress={()=>{update({repeat});setRepeatOpen(false);}} style={s.choice}><Text style={s.title}>{repeatLabels[repeat]}</Text>{(draft.repeat??'none')===repeat&&<Ionicons name="checkmark" size={18} color={colors.blueText}/>}</Pressable>)}</View>}</>}


   </View>
   {!event&&!native&&createOptionsAvailable&&<View style={s.group}><Text style={s.help}>초대받는 사람</Text><TextInput accessibilityLabel="일정 초대 이메일" placeholder="이메일 주소 · 여러 명은 쉼표로 구분" placeholderTextColor={colors.muted} value={draft.guests??''} onChangeText={guests=>update({guests})} autoCapitalize="none" keyboardType="email-address" maxLength={5100} style={s.input}/></View>}

   <View style={[s.group,{gap:0}]}><Pressable accessibilityRole="button" accessibilityLabel="저장할 캘린더 선택" accessibilityState={{expanded:calendarOpen,busy:sourceLoading}} disabled={readonly} onPress={()=>{setPicker(null);setReminderOpen(false);setCalendarOpen(v=>!v);}} style={s.row}><Text style={s.title}>캘린더</Text><View style={s.trailing}><Text numberOfLines={1} style={[s.help,{flexShrink:1,color:colors.text}]}>{source?.name??event?.calendarName??(sourceLoading?'확인 중':sourceError?'연결 확인':'선택')}</Text>{!readonly&&<Ionicons name={calendarOpen?'chevron-up':'chevron-down'} size={17} color={colors.muted}/>}</View></Pressable>
    {calendarOpen&&<View testID="calendar-destination-menu">{sources.map(c=>{const disabled=!c.canWrite||!!event&&(event.provider==='apple-calendar'?c.id!==event.calendarId:!!event.connectionId&&c.connectionId!==event.connectionId);return <Pressable key={c.id} accessibilityRole="radio" accessibilityLabel={'캘린더 '+c.name} accessibilityState={{checked:c.id===draft.calendarId,disabled}} disabled={disabled} onPress={()=>{update({calendarId:c.id});setCalendarOpen(false);}} style={s.choice}><Text numberOfLines={2} style={[s.help,{flex:1,color:disabled?colors.muted:colors.text}]}>{c.name}</Text><View style={s.checkSlot}>{c.id===draft.calendarId&&<Ionicons name="checkmark" size={18} color={colors.blueText}/>}</View></Pressable>})}
    {sourceLoading&&<Text accessibilityLiveRegion="polite" style={[s.help,{paddingVertical:12}]}>확인 중</Text>}
    {sourceCursor&&<Button title="더 보기" quiet onPress={()=>onMoreSources?.()}/>}
    {!!sourceError&&<Pressable accessibilityRole="button" accessibilityLabel="캘린더 목록 다시 확인" onPress={onRefreshPermission} style={s.choice}><Text style={s.actionText}>다시 확인</Text><Ionicons name="refresh-outline" size={18} color={colors.blueText}/></Pressable>}
    {(!sources.some(c=>c.canWrite)||!!sourceError)&&onOpenConnections&&<Pressable accessibilityRole="button" accessibilityLabel="ME 연결 관리 열기" onPress={onOpenConnections} style={s.choice}><Text style={s.actionText}>ME에서 연결 관리</Text><Ionicons name="chevron-forward" size={18} color={colors.blueText}/></Pressable>}
    </View>}
   </View>
   {(metadataAvailable||native)&&<View style={[s.group,{gap:0}]}><Pressable accessibilityRole="button" accessibilityLabel="알림 선택" accessibilityState={{expanded:reminderOpen}} onPress={()=>{setPicker(null);setCalendarOpen(false);setReminderOpen(v=>!v);}} style={s.row}><Text style={s.title}>알림</Text><View style={s.trailing}><Text style={s.help}>{reminderOffsetLabel(draft.reminderMinutes)}</Text><Ionicons name={reminderOpen?'chevron-up':'chevron-down'} size={17} color={colors.muted}/></View></Pressable>
    {reminderOpen&&<ScrollRevealRegion><View testID="calendar-reminder-menu" accessibilityRole="radiogroup" accessibilityLabel="알림 시간" style={s.popup}>{reminderChoices.map((minutes,index)=><Pressable key={String(minutes)} style={[s.reminderChoice,index>0&&s.choiceDivider]} accessibilityRole="radio" accessibilityLabel={'알림 '+reminderOffsetLabel(minutes)} accessibilityState={{checked:draft.reminderMinutes===minutes}} onPress={()=>{update({reminderMinutes:minutes});setReminderOpen(false);}}><Text style={s.reminderText}>{reminderOffsetLabel(minutes)}</Text><View testID={'calendar-reminder-check-'+String(minutes)} style={s.checkSlot}>{draft.reminderMinutes===minutes&&<Ionicons name="checkmark" size={18} color={colors.blueText}/>}</View></Pressable>)}</View></ScrollRevealRegion>}
   </View>}
   <View style={s.group}><TextInput ref={notesRef} placeholder="메모" placeholderTextColor={colors.muted} onFocus={()=>{setPicker(null);field.focus(notesRef.current);}} accessibilityLabel="일정 메모" editable={!busy&&!event?.notesPartial} multiline value={draft.notes} onChangeText={notes=>update({notes})} maxLength={4000} onContentSizeChange={field.reveal} style={[s.input,{minHeight:110,textAlignVertical:'top'}]}/>
    {(metadataAvailable||native)&&<View style={s.row}><Ionicons name="link-outline" size={19} color={colors.muted}/><TextInput accessibilityLabel="일정 링크" placeholder="URL" placeholderTextColor={colors.muted} value={draft.duckUrl} onChangeText={duckUrl=>update({duckUrl})} autoCapitalize="none" keyboardType="url" maxLength={2000} style={[s.input,{flex:1}]}/></View>}
   </View>
   {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </>}
  </>;
 return <ScrollRevealContext.Provider value={field.show}><View style={{minHeight:0,flexShrink:inline?0:1,...(!inline&&keyboard.occluding?{flex:1}:{})}}>{inline?<View testID="calendar-event-editor" style={{gap:16,paddingBottom:24}}>{fields}</View>:<ScrollView ref={scrollRef} onLayout={field.reveal} onScroll={field.onScroll} onContentSizeChange={field.reveal} style={{flexShrink:1,...(keyboard.occluding?{flex:1}:{})}} testID="calendar-event-editor" keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:16,paddingBottom:24}}>{fields}</ScrollView>}{!pending&&!keyboard.occluding&&!picker&&!reminderOpen&&!calendarOpen&&<View style={{paddingTop:8,borderTopWidth:StyleSheet.hairlineWidth,borderColor:colors.line}}><Button title="저장" accessibilityLabel="일정 저장 내용 미리보기" loading={busy} disabled={busy||!!picker||(!canWrite&&(!event||!metadataAvailable))} onPress={()=>void prepare()}/></View>}</View></ScrollRevealContext.Provider>;
}
const s=StyleSheet.create({trailing:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:8,flexShrink:1,marginLeft:16},checkSlot:{width:24,height:24,alignItems:'center',justifyContent:'center',flexShrink:0},actionText:{...typography.detail,color:colors.blueText},reminderText:{...typography.body,color:colors.text,flex:1},reminderChoice:{minHeight:48,paddingHorizontal:14,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:12},choiceDivider:{borderTopWidth:StyleSheet.hairlineWidth,borderColor:colors.line},popup:{backgroundColor:colors.popup,borderRadius:20,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.popupLine,overflow:'hidden'},field:{gap:4},input:{minHeight:44,backgroundColor:colors.grouped,borderRadius:12,padding:10,...typography.body,color:colors.text},group:{gap:8,padding:12,borderRadius:20,backgroundColor:colors.surface},row:{gap:8,flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:44},dates:{flexDirection:'row',gap:8},choice:{minHeight:44,paddingVertical:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},title:{...typography.body,color:colors.text,fontWeight:'600'},eventTitle:{fontSize:24,lineHeight:32,fontWeight:'700',color:colors.text},section:{...typography.section,color:colors.text},help:{...typography.detail,color:colors.muted},error:{...typography.detail,color:colors.danger},options:{flexDirection:'row',flexWrap:'wrap',gap:6},option:{minHeight:44,padding:10,borderRadius:14,backgroundColor:colors.grouped,justifyContent:'center'},selected:{borderWidth:1,borderColor:colors.action}});

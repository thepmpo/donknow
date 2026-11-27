import type {CalendarEditQueue} from '../calendar-device-queue';
import {ScrollRevealContext,useFocusedField} from '../useFocusedField';
import {putCalendarWrite,removeCalendarWrite,removeCalendarEventWrites} from '../calendar-write-overlay';
import {useKeyboardUX} from '../KeyboardUX';
import {calendarStartLabel,reminderOffsetLabel,calendarReminderInstant,reminderDateLabel} from '../calendar-display';
import {CalendarEventDelete} from '../CalendarEventDelete';
import {ScrollArea as ScrollView} from '../ScrollArea';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AccessibilityInfo,findNodeHandle,Linking,Platform,Pressable as NativePressable,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import type {ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {duoCalendarViewFrame} from '../duo-layout';
import {useDuoBackState} from '../DuoBackNavigation';
import {useDuoScene,useDuoToday} from '../DuoChrome';
import {ScreenHeading} from '../ScreenHeading';
import {colors,layout,typography} from '../theme';
import {MotionPressable as Pressable,useReducedMotion} from '../motion';
import {Button,TodoRow,TodoEditorForm} from '../ui';
import {useDuoTrailingNavigation} from '../DuoLayout';
import {CalendarViewTransition} from '../CalendarViewTransition';
import {CalendarVisibilityList} from '../CalendarVisibilityList';
import {CalendarSheet} from '../CalendarSheet';
import {CalendarPeriodMotion,CalendarWeekMotion} from '../CalendarPeriodMotion';
import type {CalendarPeriodMotionHandle} from '../CalendarPeriodMotion';
import {CalendarDragSurface,CalendarDraggableEvent,CalendarDropDate,useCalendarEventDrag} from '../CalendarEventDrag';
import {CalendarPeriodGesture,TodoGestureScroll} from '../todo-gestures';
import {calendarWriteArgs,confirmedCalendarPatch,eventDraftForDateMove} from '../calendar-edit-model';
import {CalendarDayTodos} from '../CalendarDayTodos';
import {CalendarWeekWorkspace} from '../CalendarWeekWorkspace';
import {calendarWeekDays} from '../calendar-week-model';
import {useDesktopPresentation} from '../DesktopPresentation';
import {CalendarYearNavigator} from '../CalendarYearNavigator';
import {calendarFeatures} from '../calendar-features';
import {CalendarEventEditor,eventDraft,saveDocenEvent} from '../CalendarEventEditor';
import type {CalendarDraft,CalendarActionState,CalendarPending} from '../CalendarEventEditor';
import {useUnifiedCalendarData} from '../useUnifiedCalendarData';
import {isAppleCalendar} from '../apple-calendar-model';
import type {CalendarCreateQueue} from '../calendar-create-queue';
import type {AppleCalendarDevice} from '../apple-calendar-model';
import {useCalendarSelection} from '../useCalendarSelection';
import {docenCalendarId,deviceZone,calendarEventsByDay,calendarTodosByDay,eventOccurs,eventTime,localTime,minutesAt,monthCellHeight,nextLongPressCalendarView,periodShift,safeCalendarLink,shiftDay,validZone,visibleDays,weekDays,zonedDay} from '../calendar-model';
import type {CalendarEvent,CalendarView} from '../calendar-model';
import type {Todo} from '../domain';
import type {TodoStore} from '../useTodos';
export type CalendarNavigationRequest={id:number;action:'today'|'week'|'fortnight'|'cycle';resetToToday?:boolean;scope:string};
const webCalendarSwipe=Platform.OS==='web'?({touchAction:'pan-y'} as unknown as ViewStyle):undefined;
type Overlay='day'|'event'|'editor'|'picker'|'sources'|'settings'|'search'|'views'|'connection'|null;
export function CalendarScreen({store,onAdd,onEdit,active=true,syncWhileHidden=false,fixedPane=false,navigationRequest,onManageConnections,appleDevice,deviceCreateQueue,deviceEditQueue}:{store:TodoStore;onAdd:(date:string)=>void;onEdit:(todo:Todo)=>void;active?:boolean;syncWhileHidden?:boolean;fixedPane?:boolean;navigationRequest?:CalendarNavigationRequest;onManageConnections?:()=>void;appleDevice?:AppleCalendarDevice;deviceCreateQueue?:CalendarCreateQueue;deviceEditQueue?:CalendarEditQueue}){
 const keyboard=useKeyboardUX(),desktop=useDesktopPresentation();
 const {scene}=useDuoScene(),backState=useDuoBackState();
 const insets=useSafeAreaInsets(),duo=useDuoTrailingNavigation(),reduced=useReducedMotion(),{fontScale}=useWindowDimensions();
 const yearButton=useRef<React.ComponentRef<typeof NativePressable>>(null);
 const [weekScrollReset,setWeekScrollReset]=useState(0),[focusMinute,setFocusMinute]=useState<number>();
 const [yearOpen,setYearOpen]=useState(false),[yearCloseRequest,setYearCloseRequest]=useState(0);
 const [zone,setZone]=useState(deviceZone),[zoneDraft,setZoneDraft]=useState(zone),[startDay,setStartDay]=useState(0),[density,setDensity]=useState<'details'|'compact'>('details');
 const today=zonedDay(Date.now(),zone),[selected,setSelected]=useState(today),[month,setMonth]=useState(today.slice(0,7)),[view,setView]=useState<Exclude<CalendarView,'fortnight'>>('month');
 const [size,setSize]=useState({width:390,height:700}),[headHeight,setHeadHeight]=useState(67),[weekdaysHeight,setWeekdaysHeight]=useState(31.5),[overlay,setOverlay]=useState<Overlay>(null),[event,setEvent]=useState<CalendarEvent|undefined>(),[editorKey,setEditorKey]=useState('new'),[editorBusy,setEditorBusy]=useState(false),[localError,setLocalError]=useState(''),[showDone,setShowDone]=useState(false),[importing,setImporting]=useState(false),[query,setQuery]=useState(''),[pickedMonth,setPickedMonth]=useState(month);
 const [addKind,setAddKind]=useState<'event'|'todo'>('event');
 const drafts=useRef<Record<string,CalendarDraft>>({});
 function setDrafts(fn:(old:Record<string,CalendarDraft>)=>Record<string,CalendarDraft>){drafts.current=fn(drafts.current);}
 const selection=useCalendarSelection(store);
 const navigationScope=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo';
 const sourceIds=selection.ids,shownSources=useMemo(()=>new Set(sourceIds),[sourceIds]);
 const isVisible=(event:CalendarEvent)=>{
  if(event.calendarId===docenCalendarId&&event.mirror)return !selection.hiddenIds.includes(event.mirror.calendarId);
  const id=event.mirror?.calendarId??event.calendarId??'primary';
  if(isAppleCalendar(id))return !selection.hiddenIds.includes(id);
  return id===docenCalendarId?selection.showDocen:shownSources.has(id);
 };
 function revealSavedEvent(saved:CalendarEvent){
  const day=!saved.allDay&&saved.startAt?zonedDay(saved.startAt,zone):saved.dueDate;
  setFocusMinute(!saved.allDay&&saved.startAt?minutesAt(saved.startAt,zone):undefined);setWeekScrollReset(v=>v+1);
  if(day){setSelected(day);setMonth(day.slice(0,7));}
  selection.reveal(saved.mirror?.calendarId??saved.calendarId??'primary');
 }
 const [startDayDraft,setStartDayDraft]=useState(startDay),[densityDraft,setDensityDraft]=useState(density);
 const periodMotion=useRef<CalendarPeriodMotionHandle>(null),[periodSequence,setPeriodSequence]=useState(0),[periodDirection,setPeriodDirection]=useState(0);
 const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null),savedScroll=useRef(0),agendaY=useRef(0);
 const latest=useRef({month,selected,view,active});latest.current={month,selected,view,active};
 const days=useMemo(()=>view==='week'?calendarWeekDays(selected):visibleDays(month,selected,view,startDay),[month,selected,view,startDay]);
 const refreshKey=navigationRequest?.scope===navigationScope&&navigationRequest.action==='today'?navigationRequest.id:undefined;
 const data=useUnifiedCalendarData(store,{start:days[0],end:shiftDay(days.at(-1)!,1),month,timeZone:zone,selected:sourceIds,hidden:selection.hiddenIds,active,syncWhileHidden,refreshKey,selectionReady:selection.ready},appleDevice,deviceCreateQueue,deviceEditQueue);
 const appleSourceIds=JSON.stringify(data.sources.filter(source=>isAppleCalendar(source.id)).map(source=>source.id));
 useEffect(()=>{
  if(active&&selection.ready)selection.reconcileApple(JSON.parse(appleSourceIds));
 },[active,selection.ready,navigationScope,appleSourceIds]);
 // Refresh source metadata as well as the visible period on each entry.
 useEffect(()=>{if((active||syncWhileHidden)&&data.version===2&&store.user)void data.loadSources();},[active,syncWhileHidden,refreshKey,data.version,store.user?.id,store.connection?.mode==='cloud'?store.connection.baseUrl:'demo']);
 useEffect(()=>{if(active&&store.user){void store.refresh();store.refreshSources?.();}},[active,refreshKey,store.user?.id,store.refreshSources]);
 useEffect(()=>{if(active&&data.readAt)store.reminders.retry();},[active,data.readAt]);
 const events=useMemo(()=>data.events.filter(isVisible),[data.events,shownSources,selection.showDocen,selection.hiddenIds]);
 const eventsByDay=useMemo(()=>calendarEventsByDay(events,days,zone),[events,days,zone]);
 const todosByDay=useMemo(()=>calendarTodosByDay(store.todos),[store.todos]);
 const dayEvents=(day:string)=>eventsByDay.get(day)??[];
 const dayTasks=(day:string)=>todosByDay.get(day)??[],daily=dayEvents(selected),tasks=dayTasks(selected),unfinished=tasks.filter(t=>!t.done),completed=tasks.filter(t=>t.done);
 const extension=duo&&!(keyboard.occluding&&overlay==='editor')?(scene?.calendarBottomExtension??0):0;
 const bottom=keyboard.occluding&&overlay==='editor'?0:duo?extension+8:layout.navigationHeight+insets.bottom+layout.navigationBottomGap;
 const gridView=view==='month';
 const compact=density==='compact'||fontScale>1.3;
 const eventParent=useRef<'day'|null>(null);
 const imported=new Set(store.todos.filter(t=>t.source?.provider==='google').map(t=>t.source!.externalId));
 const [editorActions,setEditorActions]=useState<Record<string,CalendarActionState>>({});
 function clearEditorAction(key:string){setEditorActions(old=>{const n={...old};delete n[key];return n;});}
 useEffect(()=>{
  if(active)return;
  if(overlay==='editor'&&!event&&!editorActions[editorKey]&&!editorBusy)discardDraft(editorKey);
  setOverlay(null);setLocalError('');
 },[active]);
 useEffect(()=>{if(active)scroll.current?.scrollTo({y:savedScroll.current,animated:false});},[active]);
 function animatePeriod(direction=0){setPeriodDirection(direction);setPeriodSequence(v=>v+1);}
 function move(amount:number){setFocusMinute(undefined);const c=latest.current,next=periodShift(c.month,c.selected,c.view,amount);setMonth(next.month);setSelected(next.selected);animatePeriod(amount);}
 const calendarDrag=useCalendarEventDrag(active&&(!overlay||overlay==='day')&&!yearOpen,moveEventDate,(todo,day)=>{
  if(store.isCurrentSession())void store.update(todo.id,{dueDate:day});
 });
 const moveRef=useRef(move),swipeConsumed=useRef(false),viewport=useRef<React.ComponentRef<typeof View>>(null);moveRef.current=move;
 useEffect(()=>{
  if(Platform.OS!=='web'||!active||overlay||yearOpen)return;
  const node=viewport.current as unknown as HTMLElement|null;
  if(!node)return;
  let touch:{id:number;x:number;y:number;horizontal:boolean}|null=null;
  function start(event:TouchEvent){
   swipeConsumed.current=false;
   const point=event.touches[0],target=event.target;
   touch=event.touches.length===1&&point&&target instanceof Element&&!target.closest('[data-testid="calendar-day-todos"]')
    ?{id:point.identifier,x:point.clientX,y:point.clientY,horizontal:false}:null;
  }
  function dragPoint(x:number,y:number,event:Event){
   if(!touch)return;
   if(calendarDrag.session.current){cancel();return;}
   const dx=x-touch.x,dy=y-touch.y;
   if(!touch.horizontal&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){cancel();return;}
   if(!touch.horizontal&&Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.5)touch.horizontal=true;
   if(!touch.horizontal)return;
   if(event.cancelable)event.preventDefault();
   swipeConsumed.current=true;
   periodMotion.current?.drag(dx);
  }
  function drag(event:TouchEvent){
   const point=event.touches[0];
   if(!point||event.touches.length!==1||point.identifier!==touch?.id){cancel();return;}
   dragPoint(point.clientX,point.clientY,event);
  }
  function endAt(x:number){
   if(!touch)return;
   const dx=x-touch.x;
   if(touch.horizontal&&Math.abs(dx)>55&&!calendarDrag.session.current)moveRef.current(dx<0?1:-1);
   else if(touch.horizontal)periodMotion.current?.cancel();
   touch=null;
  }
  function end(event:TouchEvent){
   const point=Array.from(event.changedTouches).find(point=>point.identifier===touch?.id);
   if(point)endAt(point.clientX);
  }
  function cancel(){
   if(touch?.horizontal)periodMotion.current?.cancel();
   touch=null;
  }
  function clearClick(event:MouseEvent){
   if(swipeConsumed.current){event.preventDefault();event.stopPropagation();swipeConsumed.current=false;}
  }
  function mouseStart(event:PointerEvent){
   if(event.pointerType!=='mouse'||event.button!==0)return;
   swipeConsumed.current=false;
   const target=event.target;
   touch=target instanceof Element&&!target.closest('[data-testid="calendar-day-todos"]')
    ?{id:-1,x:event.clientX,y:event.clientY,horizontal:false}:null;
  }
  function mouseDrag(event:PointerEvent){
   if(event.pointerType==='mouse'&&touch?.id===-1)dragPoint(event.clientX,event.clientY,event);
  }
  function mouseEnd(event:PointerEvent){
   if(event.pointerType==='mouse'&&touch?.id===-1)endAt(event.clientX);
  }
  node.addEventListener('touchstart',start,{capture:true,passive:true});
  node.addEventListener('touchmove',drag,{capture:true,passive:false});
  node.addEventListener('touchend',end,true);
  node.addEventListener('touchcancel',cancel,true);
  node.addEventListener('click',clearClick,true);
  node.addEventListener('pointerdown',mouseStart,true);
  window.addEventListener('pointermove',mouseDrag,true);
  window.addEventListener('pointerup',mouseEnd,true);
  return ()=>{
   node.removeEventListener('touchstart',start,true);
   node.removeEventListener('touchmove',drag,true);
   node.removeEventListener('touchend',end,true);
   node.removeEventListener('touchcancel',cancel,true);
   node.removeEventListener('click',clearClick,true);
   node.removeEventListener('pointerdown',mouseStart,true);
   window.removeEventListener('pointermove',mouseDrag,true);
   window.removeEventListener('pointerup',mouseEnd,true);
  };
 },[active,overlay,yearOpen]);
 async function feedback(){if(Platform.OS!=='ios'||reduced)return;try{const h=await import('expo-haptics');await h.selectionAsync();}catch{}}
 function choose(day:string,detail=true){setSelected(day);if(day.slice(0,7)!==month)setMonth(day.slice(0,7));if(detail)setOverlay('day');void feedback();}
 const nextView=view==='month'?'week':view==='week'?'day':'month';
 const nextViewLabel=nextView==='week'?'주간':nextView==='day'?'일간':'월',viewLabel=view==='week'?'주간':view==='day'?'일간':'월';
 function cycleView(){setYearOpen(false);setView(nextView);savedScroll.current=0;scroll.current?.scrollTo({y:0,animated:false});animatePeriod();}
 useDuoToday(today,()=>{setYearOpen(false);now();},active&&!overlay,fixedPane?1:2,duo?{expanded:view!=='month',label:viewLabel,accessibilityLabel:nextViewLabel+' 보기로 전환',onPress:cycleView}:undefined);
 function now(){setFocusMinute(undefined);setWeekScrollReset(v=>v+1);animatePeriod();setMonth(today.slice(0,7));setSelected(today);scroll.current?.scrollTo({y:0,animated:!reduced});}
 const handledNavigation=useRef(0);
 useEffect(()=>{
  if(!navigationRequest||navigationRequest.scope!==navigationScope||handledNavigation.current===navigationRequest.id)return;
  handledNavigation.current=navigationRequest.id;
  // Navigation shortcuts never discard an open form or run later after it closes.
  if(!active||overlay)return;
  setYearOpen(false);
  if(navigationRequest.action==='today'||navigationRequest.resetToToday)now();
  if(navigationRequest.action==='cycle'){const target=nextLongPressCalendarView(view);setView(target);savedScroll.current=0;scroll.current?.scrollTo({y:0,animated:false});}
  if(navigationRequest.action==='fortnight'||navigationRequest.action==='week')setView('week');
  animatePeriod();void feedback();
 },[navigationRequest?.id,active,navigationScope]);


 async function close(){if(editorBusy)return;if(overlay==='editor'&&editorActions[editorKey]&&!editorActions[editorKey].locked){try{if(editorActions[editorKey].pending.id!=='duck-local'&&editorActions[editorKey].pending.id!=='apple-local')await store.featureRequest('/api/assistant/actions/'+editorActions[editorKey].pending.id,'DELETE');clearEditorAction(editorKey);}catch(e){setLocalError(e instanceof Error?e.message:'미리보기를 취소하지 못했어요.');return;}}if(overlay==='editor'&&!editorActions[editorKey]?.locked)discardDraft(editorKey);setLocalError('');setOverlay(overlay==='editor'&&event?'event':overlay==='event'?eventParent.current:null);}
 function toggleSource(id:string){
  if(selection.toggle(id))setLocalError('');
  else setLocalError('Google 캘린더는 최대 10개까지 표시할 수 있어요.');
 }
 function openVisibility(){
  setLocalError('');setOverlay('sources');
  if(store.user)void data.loadSources();
 }
 const [legacyDetailsOpen,setLegacyDetailsOpen]=useState(false);
 useEffect(()=>{
  if(!event||(overlay!=='event'&&overlay!=='editor'))return;
  const fresh=data.events.find(item=>item.id===event.id||(!event.recurring&&!!event.eventId&&item.eventId===event.eventId
   &&item.calendarId===event.calendarId&&item.connectionId===event.connectionId));
  if(fresh){
   if(fresh!==event)setEvent(fresh);
  }else if(overlay==='event'&&!editorBusy&&data.confirmedAbsent(event)){
   setEvent(undefined);
   setLocalError('');
   setOverlay(eventParent.current);
  }
 },[data.events,data.confirmedAbsent,event,overlay,editorBusy]);
 function openEvent(e:CalendarEvent){if(!e.etag&&!data.devicePending(e))void data.load();setLegacyDetailsOpen(false);eventParent.current=overlay==='day'?'day':null;const day=e.allDay?e.dueDate:e.startAt?zonedDay(e.startAt,zone):e.dueDate;if(day){setSelected(day);setMonth(day.slice(0,7));}setEvent(e);setOverlay('event');setLocalError('');}
 function discardDraft(key:string){delete drafts.current[key];}
 function beginEvent(day=selected,time='09:00',existing?:CalendarEvent,forceTimed=false){
  if(store.user)void data.loadSources();
  if(existing&&(!existing.etag||!existing.canWrite))void data.load();
  const detail=existing;
  if(existing)existing=data.editingOriginal(existing);
  const key=existing?existing.id+'@'+(existing.etag??'unknown'):'new:'+day;setAddKind('event');setSelected(day);setMonth(day.slice(0,7));setYearOpen(false);setEvent(detail);setEditorKey(key);setDrafts(old=>({...old,[key]:old[key]??{...eventDraft(day,zone,(data.enqueueCreate&&sourceIds.find(id=>data.sources.some(source=>source.id===id&&source.canWrite)))||(data.enqueueCreate?docenCalendarId:sourceIds[0]??'primary'),existing),...(!existing?{...(forceTimed?{allDay:false}:{}),startTime:time,endTime:(+time.slice(0,2)<23?String(+time.slice(0,2)+1).padStart(2,'0'): '23')+':'+(time.startsWith('23')?'59':time.slice(3))}: {})}}));setOverlay('editor');setLocalError('');
 }
 async function importEvent(e:CalendarEvent){if(importing)return;setImporting(true);setLocalError('');try{await store.featureRequest('/api/integrations/google/import','POST',{ids:[e.id]});await store.refresh();}catch(error){setLocalError(error instanceof Error?error.message:'가져오지 못했어요.');}finally{setImporting(false);}}
 async function external(value?:string|null){const url=safeCalendarLink(value);if(!url){setLocalError('열 수 있는 안전한 링크가 없어요.');return;}try{await Linking.openURL(url);}catch{setLocalError('링크를 열지 못했어요.');}}
 const statusText=data.phase==='unconnected'?'Google 캘린더를 연결하면 일정을 함께 볼 수 있어요.':data.phase==='loading'?(events.length?'기존 일정을 보며 새로 확인하고 있어요.':'일정을 불러오고 있어요.'):data.phase==='error'?'일정을 확인하지 못했어요.':data.phase==='partial'?'일부 일정만 표시 중이에요. 더 불러오거나 다시 확인해주세요.':data.readAt?'업데이트 '+new Intl.DateTimeFormat('ko-KR',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(data.readAt)):store.user?'선택한 기간의 일정을 표시해요.':'내 할 일을 달력에서 확인하세요.';
 function sourceColor(e:CalendarEvent){return e.color??e.mirror?.color??data.sources.find(c=>c.id===(e.calendarId??'primary'))?.color??colors.action;}
 const hasCursor=Object.keys(data.cursors).length>0;
 function eventRow(e:CalendarEvent,day:string,dragEnabled=true){return <CalendarDraggableEvent key={e.id} event={e} day={day} dragEnabled={dragEnabled} accessibilityRole="button" accessibilityLabel={e.title+' 일정 상세'} onPress={()=>openEvent(e)} contentStyle={s.eventRow}>
  <View style={s.timeColumn}><Text style={s.eventTime}>{e.allDay?'종일':eventTime(e,zone).split(' – ')[0]}</Text></View>
  <View style={{width:3,minHeight:28,alignSelf:'stretch',borderRadius:2,backgroundColor:sourceColor(e)}}/>
  <View style={{flex:1,gap:3}}><Text style={s.eventTitle}>{e.title}</Text><Text style={s.meta}>{e.mirror?.name||e.calendarName||'Google 캘린더'}{e.allDay&&e.endDate&&e.dueDate!==shiftDay(e.endDate,-1)?' · 여러 날 일정':''}</Text>{!!e.location&&<Text numberOfLines={1} style={s.meta}>{e.location}</Text>}</View>
 </CalendarDraggableEvent>;}
 function agenda(day=selected,periodEvents=events,interactive=true){const agendaEvents=periodEvents===events?[...dayEvents(day)]:periodEvents.filter(e=>eventOccurs(e,day,zone)),agendaTodos=dayTasks(day),agendaUnfinished=agendaTodos.filter(t=>!t.done),agendaCompleted=agendaTodos.filter(t=>t.done);return <View testID="calendar-agenda" onLayout={interactive?e=>{agendaY.current=e.nativeEvent.layout.y;}:undefined} style={[s.agenda,view==='day'&&s.dayAgenda]}>
  <View style={s.agendaHeading}><Text style={s.section}>{new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(new Date(day+'T12:00:00'))}{day===today?' · 오늘':''}</Text><Pressable accessibilityRole="button" accessibilityLabel="일정 또는 할 일 추가" style={s.control} onPress={()=>beginEvent(day)}><Text style={s.link}>추가 ＋</Text></Pressable></View>
  <View style={s.agendaHeading}><Text style={s.section}>일정</Text></View>
  {agendaEvents.length?agendaEvents.sort((a,b)=>Number(!!b.allDay)-Number(!!a.allDay)||(a.startAt??'').localeCompare(b.startAt??'')).map(e=>eventRow(e,day,interactive)):<Text style={s.empty}>{data.phase==='loading'?'일정을 확인하고 있어요.':data.phase==='error'?'연결이 복구되면 이 날의 일정을 확인할 수 있어요.':data.phase==='unconnected'?'Google 캘린더를 연결하면 일정을 표시해요.':data.phase==='partial'?'아직 읽지 않은 일정이 있을 수 있어요.':'이 날은 일정이 없어요.'}</Text>}
  <Text style={[s.section,{marginTop:16}]}>할 일</Text>{!agendaUnfinished.length&&<Text style={s.empty}>미완료 할 일이 없어요.</Text>}<CalendarDayTodos day={day} todos={agendaUnfinished} store={store} interactive={interactive} dateTargets={calendarDrag.targets.current} onEdit={t=>{setOverlay(null);onEdit(t);}}/>
  {!!agendaCompleted.length&&<><Pressable accessibilityRole="button" accessibilityState={{expanded:showDone}} accessibilityLabel="완료한 할 일 펼치기" style={s.control} onPress={()=>setShowDone(v=>!v)}><Text style={s.link}>완료 {agendaCompleted.length}개 {showDone?'접기':'보기'}</Text></Pressable>{showDone&&agendaCompleted.map(t=><TodoRow key={t.id} todo={t} onToggle={()=>void store.update(t.id,{done:false})} onEdit={()=>{setOverlay(null);onEdit(t);}}/>)}</>}
  {hasCursor&&<Button title="일정 더 불러오기" quiet disabled={data.phase==='loading'} onPress={()=>void data.load(true)}/>}
 </View>;}

 function dateGrid(periodDays=days,periodMonth=month,periodSelected=selected,periodEvents=events,interactive=true){const periodRows=gridView?periodDays.length/7:1,height=monthCellHeight(size.height,headHeight,duo?0:bottom,fontScale,periodRows,weekdaysHeight);
  if(view==='day')return <View testID="calendar-day-strip" style={{flexDirection:'row'}}>{weekDays(periodSelected,startDay).map(day=><CalendarDropDate key={day} day={day} enabled={interactive} style={{flex:1}}><Pressable accessibilityRole="button" accessibilityLabel={day+' 일간 보기'} accessibilityState={{selected:day===periodSelected}} onPress={()=>{if(!swipeConsumed.current&&!calendarDrag.session.current)choose(day,false);}} delayLongPress={500} accessibilityHint="길게 누르면 이 날짜에 일정 또는 할 일을 추가해요." accessibilityActions={[{name:'longpress',label:'이 날짜에 일정 또는 할 일 추가'}]} onAccessibilityAction={e=>{if(e.nativeEvent.actionName==='longpress')beginEvent(day);}} onLongPress={()=>{if(!swipeConsumed.current&&!calendarDrag.session.current)beginEvent(day);}} style={[{flex:1,minHeight:48,alignItems:'center',justifyContent:'center'},day===today&&s.todayCell]}><Text style={[s.number,day===periodSelected&&s.chosenNumber]}>{Number(day.slice(8))}</Text></Pressable></CalendarDropDate>)}</View>;
  const indexByDay=periodEvents===events?eventsByDay:calendarEventsByDay(periodEvents,periodDays,zone);
  return <View testID="calendar-date-grid" style={webCalendarSwipe}>{Array.from({length:periodRows},(_,index)=><View key={periodDays[index*7]} style={{flexDirection:'row'}}>{gridView&&(()=>{const row=periodDays.slice(index*7,index*7+7),first=row.findIndex(day=>day.slice(0,7)===periodMonth),count=row.filter(day=>day.slice(0,7)===periodMonth).length;return first<0?null:<View testID={'calendar-week-divider-'+row[0]} pointerEvents="none" style={{position:'absolute',top:0,left:first*size.width/7,width:count*size.width/7,height:StyleSheet.hairlineWidth,backgroundColor:colors.line,zIndex:1}}/>;})()}{periodDays.slice(index*7,index*7+7).map(day=>{
   const ev=indexByDay.get(day)??[],ts=dayTasks(day),tasks=ts.filter(t=>!t.done),count=ev.length+tasks.length,chosen=periodSelected===day,isToday=day===today;
   const fullSlots=Math.max(0,Math.floor((height-42)/23)),slots=count>fullSlots?Math.max(0,Math.floor((height-60)/23)):fullSlots,shownEvents=Math.min(ev.length,slots),shownTodos=Math.min(1,tasks.length,slots-shownEvents),remaining=count-shownEvents-shownTodos;
   const weekday=new Date(day+'T12:00:00Z').getUTCDay();
   return <CalendarDropDate key={day} day={day} enabled={interactive} style={{width:size.width/7,height:gridView?height:52,flexShrink:0}}><Pressable testID={'calendar-day-'+day} accessibilityRole="button" accessibilityLabel={`${day.slice(0,4)}년 ${Number(day.slice(5,7))}월 ${Number(day.slice(8))}일, 일정과 할 일 ${ev.length+ts.length}개${isToday?', 오늘':''}`} accessibilityState={{selected:chosen}} aria-selected={chosen} onPress={()=>{if(!swipeConsumed.current&&!calendarDrag.session.current)choose(day);}} delayLongPress={500} accessibilityHint="길게 누르면 이 날짜에 일정 또는 할 일을 추가해요." accessibilityActions={[{name:'longpress',label:'이 날짜에 일정 또는 할 일 추가'}]} onAccessibilityAction={e=>{if(e.nativeEvent.actionName==='longpress')beginEvent(day);}} onLongPress={()=>{if(!swipeConsumed.current&&!calendarDrag.session.current){choose(day,false);beginEvent(day);}}} style={[StyleSheet.absoluteFill,s.day,{...(gridView?{height}:{minHeight:52}),width:'100%',flexShrink:0,borderTopWidth:0},isToday&&s.todayCell]}>
    <Text maxFontSizeMultiplier={gridView?1.15:0} style={[s.number,gridView&&s.gridNumber,gridView&&height<44&&{fontSize:Math.max(10,(height-12)/fontScale),lineHeight:Math.max(12,(height-10)/fontScale),minWidth:Math.max(18,height-6),minHeight:0,paddingVertical:1,paddingHorizontal:2},{color:weekday===0?colors.danger:weekday===6?colors.blueText:colors.secondary},day.slice(0,7)!==periodMonth&&{opacity:.48},isToday&&{fontWeight:'800',color:weekday===0?colors.danger:colors.blueText},chosen&&s.chosenNumber]}>{Number(day.slice(8))}</Text></Pressable>
    <View pointerEvents="box-none" style={{marginTop:37,alignItems:'center',paddingHorizontal:2}}>
    {gridView&&count>0&&height>=Math.max(36,26*fontScale+10)+22&&(compact?<Text pointerEvents="none" style={s.count}>{ev.length?'일정 '+ev.length:''}{tasks.length?' · 할 일 '+tasks.length:''}</Text>:<View pointerEvents="box-none" style={{width:'100%',gap:3}}>
     {ev.slice(0,shownEvents).map(e=><CalendarDraggableEvent dragEnabled={interactive} event={e} day={day} key={e.id} accessibilityRole="button" accessibilityLabel={e.title+' 일정 상세'} onPress={press=>{press.stopPropagation();if(!swipeConsumed.current)openEvent(e);}} accessibilityHint={eventTime(e,zone)} contentStyle={[s.eventPill,{borderLeftWidth:2,borderLeftColor:sourceColor(e),backgroundColor:/^#[a-f0-9]{6}$/i.test(sourceColor(e))?sourceColor(e)+'25':colors.pale}]}><Ionicons name="calendar-outline" size={10} color={sourceColor(e)}/><Text numberOfLines={1} ellipsizeMode="tail" style={s.eventChip}>{e.title}</Text></CalendarDraggableEvent>)}
     {tasks.slice(0,shownTodos).map(t=><CalendarDraggableEvent todo={t} day={day} dragEnabled={interactive} key={t.id} accessibilityRole="button" accessibilityLabel={t.title+' 할 일 수정'} onPress={press=>{press.stopPropagation();if(!swipeConsumed.current)onEdit(t);}} contentStyle={s.todoPill}><Ionicons name="square-outline" size={10} color={t.source?.color??colors.secondary}/><Text numberOfLines={1} ellipsizeMode="tail" style={s.todoChip}>{t.title}</Text></CalendarDraggableEvent>)}{remaining>0&&<Text pointerEvents="none" style={s.count}>+{remaining}</Text>}
    </View>)}
   </View></CalendarDropDate>;
  })}</View>)}</View>;
 }
 function adjacentGrid(direction:number){if(!gridView&&view!=='day')return null;const next=periodShift(month,selected,view,direction),nextDays=visibleDays(next.month,next.selected,view,startDay),known=data.cachedEvents().filter(isVisible);return view==='day'?<>{dateGrid(nextDays,next.month,next.selected,known,false)}{agenda(next.selected,known,false)}</>:dateGrid(nextDays,next.month,next.selected,known,false);}
 const currentScope=useRef(navigationScope);currentScope.current=navigationScope;
 const latestData=useRef(data);latestData.current=data;
 function moveEventDate(original:CalendarEvent,anchor:string,target:string){
  original=data.editingOriginal(original);
  if(anchor===target)return;
  if(original.saveState||!original.eventId||!original.etag||!original.canWrite||!store.isCurrentSession())return;
  try{
   const draft=eventDraftForDateMove(original,anchor,target,zone),args=calendarWriteArgs(draft,original);
   if(!args)return;
   if(data.enqueueEdit){
    void data.enqueueEdit(draft,original).catch(error=>{if(store.isCurrentSession())store.setNotice(error instanceof Error?error.message:'일정을 기기에 저장하지 못했어요.');});
    return;
   }
   const patch=confirmedCalendarPatch(draft,original);
   const optimistic:CalendarEvent={...original,...patch,saveState:'saving',canWrite:false};
   if(original.provider==='docen'){backgroundSave({optimistic,run:()=>saveDocenEvent(store,original.eventId!,draft,original)},original,false);return;}
   if(original.provider==='apple-calendar'){
    backgroundSave({optimistic,run:()=>data.saveApple(draft,original)},original,false);
    return;
   }
   let actionId:string|undefined;
   const read=async ()=>{
    if(!actionId)throw Error('저장할 일정을 확인하지 못했어요.');
    return store.featureRequest('/api/assistant/actions/'+actionId) as Promise<CalendarPending>;
   };
   const confirmed=(result:CalendarPending)=>{
    if(result.status==='succeeded')return {...patch,canWrite:original.canWrite,etag:result.result?.etag??null};
    throw Object.assign(Error('일정의 저장 결과를 확인해주세요.'),{writeState:['failed','cancelled','expired'].includes(result.status)?'failed':'unknown'});
   };
   backgroundSave({optimistic,run:async()=>{
    try{
     const action=await store.featureRequest('/api/assistant/actions','POST',{operation:'calendar.update',args:{...args,connectionId:original.connectionId??undefined}}) as CalendarPending;
     actionId=action.id;
    }catch{throw Object.assign(Error('일정의 원본을 확인하지 못했어요.'),{writeState:'failed'});}
    let result:CalendarPending;
    try{result=await store.featureRequest('/api/assistant/actions/'+actionId+'/confirm','POST',{confirmation:true}) as CalendarPending;}
    catch{result=await read();}
    return confirmed(result);
   },check:async()=>confirmed(await read())},original,false);
  }catch{store.setNotice('이 날짜로 일정을 옮기지 못했어요. 시작과 종료 시간을 확인해주세요.');}
 }
 function backgroundSave(job:{optimistic:CalendarEvent;run:()=>Promise<Partial<CalendarEvent>>;check?:()=>Promise<Partial<CalendarEvent>>},original=event,dismissEditor=true){
  const owner=navigationScope,key='calendar:'+job.optimistic.id;
  const valid=()=>currentScope.current===owner&&store.isCurrentSession();
  if(original)removeCalendarEventWrites(owner,original);
  putCalendarWrite(owner,key,job.optimistic,original?.id);
  if(dismissEditor){revealSavedEvent(job.optimistic);setOverlay(null);setEvent(undefined);setEditorBusy(false);clearEditorAction(editorKey);discardDraft(editorKey);}
  const settle=async(check=false)=>{
   try{const patch=await(check&&job.check?job.check():job.run());if(!valid())return;
    putCalendarWrite(owner,key,{...job.optimistic,...patch,saveState:undefined},original?.id,true);
    store.writeResolved(key);void latestData.current.load();
   }catch(error){if(!valid())return;const unknown=(error as {writeState?:string})?.writeState==='unknown';
    const failed=(error as {writeState?:string})?.writeState==='failed'||!job.check&&!unknown;
    if(failed||!job.check){removeCalendarWrite(owner,key);if(!failed)void latestData.current.load();}else putCalendarWrite(owner,key,{...job.optimistic,saveState:'checking'},original?.id);
    const text=failed?`‘${job.optimistic.title}’ 일정을 저장하지 못해 이전 화면으로 되돌렸어요. 연결과 원본 수정 권한을 확인하고 다시 저장해주세요.`:`‘${job.optimistic.title}’ 일정의 저장 결과를 아직 확인하지 못했어요. 같은 일정을 다시 만들지 말고 저장 결과를 확인해주세요.`;
    store.reportWrite(key,text,failed||!job.check?undefined:()=>settle(true));store.setNotice(text);
    void store.featureRequest('/api/assistant/notices','POST',{code:failed?'calendar-failed':'calendar-unknown',provider:original?.provider==='apple-calendar'?'apple-calendar':'google',title:job.optimistic.title}).catch(()=>{});
   }
  };
  void settle();
 }
 const creation=overlay==='editor'&&!event;
 const creationTabs=<View accessibilityRole="tablist" accessibilityLabel="추가할 종류" testID="calendar-create-tabs" style={[s.segments,s.creationSegments]}>{(['event','todo'] as const).map(kind=><Pressable key={kind} accessibilityRole="tab" accessibilityLabel={kind==='event'?'일정':'할 일'} accessibilityState={{selected:addKind===kind,disabled:editorBusy||!!editorActions[editorKey]}} disabled={editorBusy||!!editorActions[editorKey]} onPress={()=>setAddKind(kind)} style={[s.segment,s.creationSegment,addKind===kind&&s.creationSelected]}><Text style={{color:addKind===kind?colors.blueText:colors.secondary,fontWeight:'600'}}>{kind==='event'?'일정':'할 일'}</Text></Pressable>)}</View>;
 const showConnectionIssue=(__DEV__||process.env.EXPO_PUBLIC_CALENDAR_DIAGNOSTICS==='1')&&!!store.user&&(data.phase==='error'||data.phase==='unconnected'||!!data.error||!!data.sourceError);
 const connectionIssue=showConnectionIssue?<Pressable testID="calendar-sync-notice" accessibilityRole="button" accessibilityLabel="캘린더 연결 오류 원인 보기" onPress={()=>setOverlay('connection')} style={{minHeight:44,minWidth:44,alignItems:'center',justifyContent:'center'}}>
   <View style={{width:24,height:24,borderRadius:12,backgroundColor:colors.danger,alignItems:'center',justifyContent:'center'}}><Ionicons name="close" size={16} color={colors.white}/></View>
 </Pressable>:null;
 const visibility=<Pressable testID="calendar-visibility-button" accessibilityRole="button" accessibilityLabel="표시할 캘린더 선택"
  accessibilityState={{expanded:overlay==='sources'}} aria-expanded={overlay==='sources'} onPress={openVisibility} style={s.visibilityControl}>
  <View style={s.visibilityPill}>
   <Ionicons name="filter-outline" color={colors.blueText} size={18}/>
   <Text numberOfLines={1} style={s.visibilityLabel}>{desktop?'캘린더 목록':'목록'}</Text>
  </View>
 </Pressable>;
 const title=overlay==='connection'?'캘린더 연결 상태':overlay==='views'?'캘린더 보기':overlay==='day'?'선택일 일정과 할 일':overlay==='event'?'일정 상세':overlay==='editor'?(event?'일정 수정':'일정 또는 할 일 추가'):overlay==='picker'?(calendarFeatures.yearOverview?'캘린더 더보기':'이동할 년·월'):overlay==='sources'?'표시할 캘린더':overlay==='settings'?'캘린더 보기 설정':'현재 기간 검색';
 const monthControl=<NativePressable ref={yearButton} testID="calendar-year-trigger" accessibilityRole="button" accessibilityLabel={yearOpen?'월간 보기로 돌아가기':'년월 선택'} accessibilityState={{expanded:yearOpen}} accessibilityHint="길게 누르면 캘린더 메뉴를 열어요." accessibilityActions={[{name:'longpress',label:'캘린더 메뉴 열기'}]} onAccessibilityAction={e=>{if(e.nativeEvent.actionName==='longpress')setOverlay('picker');}} style={s.control} onLongPress={()=>setOverlay('picker')} onPress={()=>{if(calendarFeatures.yearOverview){if(yearOpen)setYearCloseRequest(v=>v+1);else setYearOpen(true);}else{setPickedMonth(month);setOverlay('picker');}}}><View style={{flexDirection:'row',alignItems:'center',gap:4}}><Text style={[s.month,!desktop&&{fontSize:16}]}>{yearOpen?'월간 보기':month.slice(0,4)+'년 '+Number(month.slice(5))+'월'}</Text><Ionicons name={yearOpen?'chevron-up':'chevron-down'} size={15} color={colors.secondary}/></View></NativePressable>;
 return <CalendarDragSurface drag={calendarDrag} testID="calendar-workspace" style={[s.root,extension>0&&{marginBottom:-extension}]} onLayout={e=>{const {width,height}=e.nativeEvent.layout;if(width>0&&height>0)setSize(old=>old.width===width&&old.height===height?old:{width,height});}}>
  <View accessibilityElementsHidden={!!overlay} importantForAccessibility={overlay?'no-hide-descendants':'auto'} aria-hidden={!!overlay} onLayout={e=>setHeadHeight(e.nativeEvent.layout.height)}><ScreenHeading title="캘린더">{desktop?<View style={{flexDirection:'row',alignItems:'center',gap:8}}>{monthControl}<Pressable testID="calendar-view-toggle" accessibilityRole="button" accessibilityLabel={nextViewLabel+' 보기로 전환'} onPress={cycleView} style={s.control}><Text style={s.link}>{viewLabel}</Text></Pressable>{connectionIssue}{visibility}</View>:visibility}</ScreenHeading>
   {!desktop&&<View testID="calendar-date-controls" style={{marginHorizontal:layout.pageInset,minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><Text numberOfLines={1} style={{fontSize:10,lineHeight:16,color:colors.muted,flex:1}}>{view==='week'?days[0].slice(5).replace('-','월 ')+'일 — '+days[6].slice(5).replace('-','월 ')+'일':view==='day'?selected.slice(5).replace('-','월 ')+'일':''}</Text>{connectionIssue}{monthControl}</View>}
  </View>
  <CalendarYearNavigator enabled={calendarFeatures.yearOverview} visible={yearOpen} active={active} blocked={!!overlay} closeRequest={yearCloseRequest} scope={navigationScope} month={month} today={today} startDay={startDay} bottomInset={bottom} onClose={()=>{setYearOpen(false);requestAnimationFrame(()=>{yearButton.current?.focus();if(Platform.OS!=='web'){const node=findNodeHandle(yearButton.current);if(node)AccessibilityInfo.setAccessibilityFocus(node);}});}} onChoose={key=>{setMonth(key);setSelected(key+'-01');setView('month');savedScroll.current=0;scroll.current?.scrollTo({y:0,animated:false});void feedback();}}>
  <CalendarPeriodGesture reduced={reduced} width={size.width} showPreview={gridView||view==='day'} enabled={active&&!overlay&&!yearOpen} onDrag={dx=>periodMotion.current?.drag(dx)} onEnd={dx=>{if(Math.abs(dx)>55&&!calendarDrag.session.current)move(dx<0?1:-1);else periodMotion.current?.cancel();}}><View ref={viewport} collapsable={false} style={{flex:1,minHeight:0}}><CalendarViewTransition view={view}>
  {view==='week'?<View accessibilityElementsHidden={!!overlay} importantForAccessibility={overlay?'no-hide-descendants':'auto'} aria-hidden={!!overlay} testID="calendar-week-swipe-surface" style={[{flex:1,minHeight:0},webCalendarSwipe]}><CalendarWeekMotion identity={days[0]} enabled={active&&!overlay&&!yearOpen&&!reduced}><CalendarWeekWorkspace days={days} events={events} todos={store.todos} selected={selected} zone={zone} active={active&&!overlay&&!yearOpen} resetRequest={weekScrollReset} focusMinute={focusMinute} bottomInset={duo?8:bottom} color={sourceColor} onDay={day=>{if(!calendarDrag.session.current)choose(day);}} onAdd={day=>{if(!calendarDrag.session.current)beginEvent(day);}} onEvent={openEvent} onTodo={onEdit} onCreate={(day,time)=>{setSelected(day);beginEvent(day,time,undefined,true);}}/></CalendarWeekMotion></View>:<View testID="calendar-period-swipe-surface" style={[{flex:1,minHeight:0},webCalendarSwipe]}><TodoGestureScroll><ScrollView directionalLockEnabled showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} ref={scroll} accessibilityElementsHidden={!!overlay} importantForAccessibility={overlay?'no-hide-descendants':'auto'} aria-hidden={!!overlay} testID="calendar-scroll" scrollEnabled={view!=='month'} bounces={false} alwaysBounceVertical={false} overScrollMode="never" style={{flex:1,minHeight:0}} onScroll={e=>{savedScroll.current=e.nativeEvent.contentOffset.y;}} scrollEventThrottle={32} nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:gridView&&duo?0:bottom,...(view==='month'?{height:'100%'}:{})}}>
   {view!=='list'&&<View testID="calendar-weekdays" onLayout={e=>setWeekdaysHeight(e.nativeEvent.layout.height)} style={[s.weekdays,{borderBottomWidth:gridView?0:StyleSheet.hairlineWidth}]}>{(view==='day'?weekDays(selected,startDay):days.slice(0,7)).map(day=><Text key={day} style={[s.weekday,{color:new Date(day+'T12:00:00Z').getUTCDay()===0?colors.danger:new Date(day+'T12:00:00Z').getUTCDay()===6?colors.blueText:colors.muted}]}>{['일','월','화','수','목','금','토'][new Date(day+'T12:00:00Z').getUTCDay()]}</Text>)}</View>}
   <CalendarPeriodMotion presentation={()=>view==='day'?<>{dateGrid(days,month,selected,events,false)}{agenda(selected,events,false)}</>:dateGrid(days,month,selected,events,false)} preview={adjacentGrid} ref={periodMotion} identity={JSON.stringify([view,days[0],days.length,zone])} sequence={periodSequence} direction={gridView||view==='day'?periodDirection:0} width={size.width} enabled={active&&!overlay&&!yearOpen}>
   {view!=='list'&&<View>
    {dateGrid()}
   </View>}
   {view==='list'?<View style={s.agenda}>{days.filter(day=>dayEvents(day).length||dayTasks(day).length).map(day=><View key={day}><CalendarDropDate day={day}><Pressable style={[s.control,{alignItems:'flex-start',marginTop:16}]} accessibilityRole="button" accessibilityLabel={day+' 일정과 할 일 보기'} onPress={()=>choose(day)}><Text style={s.section}>{day}</Text></Pressable></CalendarDropDate>{dayEvents(day).map(e=>eventRow(e,day))}{dayTasks(day).filter(t=>!t.done).map(t=><Pressable key={t.id} style={[s.control,{alignItems:'flex-start'}]} accessibilityRole="button" onPress={()=>onEdit(t)}><Text style={s.eventTitle}>□ {t.title}</Text></Pressable>)}</View>)}{!events.length&&!store.todos.some(t=>days.includes(t.dueDate??''))&&<Text style={s.empty}>{data.phase==='error'?'일정 조회가 완료되지 않았어요.':'표시할 일정과 할 일이 없어요.'}</Text>}</View>:!gridView?agenda():null}
   </CalendarPeriodMotion>
  </ScrollView></TodoGestureScroll></View>}
  </CalendarViewTransition></View></CalendarPeriodGesture>
  </CalendarYearNavigator>
  {!!overlay&&active&&<CalendarSheet stableContent={overlay==='day'||overlay==='event'} fill={overlay==='editor'} bottomInset={bottom} title={title} headerContent={creation?creationTabs:undefined} expanded={overlay==='event'} headerAction={overlay==='event'&&event&&!event.saveState&&((event.canWrite&&event.etag)||event.provider!=='docen'&&data.detailsSupported)?<Pressable style={s.editButton} accessibilityRole="button" accessibilityLabel={event.canWrite?'이 일정 수정':'docen 정보 편집'} onPress={()=>beginEvent(selected,'09:00',event)}><Text style={s.eventTitle}>편집</Text></Pressable>:undefined} animateDismiss={overlay!=='editor'&&!(overlay==='event'&&eventParent.current==='day')} onClose={()=>void close()} busy={editorBusy}>
   {!!localError&&<Text accessibilityRole="alert" style={s.error}>{localError}</Text>}

   {overlay==='day'&&<TodoGestureScroll><ScrollView key={'day:'+selected} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} testID="calendar-day-detail" keyboardShouldPersistTaps="handled">{agenda()}<Button title="이 날에 일정 추가" onPress={()=>beginEvent()}/></ScrollView></TodoGestureScroll>}
   {overlay==='event'&&event&&<ScrollView key={'event:'+event.id} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} testID="calendar-event-detail" contentContainerStyle={{gap:16,paddingBottom:12}}>
    <View style={s.detailHeading}><View style={[s.accent,{backgroundColor:sourceColor(event)}]}/><View style={{flex:1,gap:10}}><Text style={s.detailTitle}>{event.title}</Text><Text style={s.eventTitle}>{new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(new Date((event.dueDate??selected)+'T12:00:00'))}</Text><Text style={s.eventTitle}>{event.allDay?'하루 종일':eventTime(event,zone)}{event.allDay&&event.endDate&&shiftDay(event.endDate,-1)!==event.dueDate?' · '+shiftDay(event.endDate,-1)+'까지':''}</Text></View></View>
    <View style={{gap:12}}><Text style={s.detailLabel}>옵션</Text><View style={s.optionRow}><Ionicons name="calendar-outline" size={23} color={colors.muted}/><Text numberOfLines={1} style={[s.eventTitle,{flexShrink:0}]}>캘린더</Text><View style={[s.sourceDot,{backgroundColor:sourceColor(event)}]}/><Text testID="calendar-source-name" numberOfLines={1} style={[s.eventTitle,{flex:1,textAlign:'right',minWidth:0}]}>{event.mirror?.name||data.sources.find(source=>source.id===event.mirror?.calendarId)?.name||event.calendarName||'Google 캘린더'}</Text></View><View style={s.optionRow}><Ionicons name="notifications-outline" size={23} color={colors.muted}/><Text style={[s.eventTitle,{flexShrink:0}]}>알림</Text><Text style={[s.meta,{flex:1,textAlign:'right'}]}>{reminderOffsetLabel(event.duckDetails?.fields.reminderMinutes??null)}</Text></View>{event.duckDetails?.fields.reminderMinutes!=null&&<Text testID="event-reminder-preview" style={s.meta}>{(()=>{try{const at=calendarReminderInstant(event.allDay?event.dueDate!:zonedDay(event.startAt!,event.timeZone??zone),event.allDay?'09:00':localTime(event.startAt!,event.timeZone??zone),!!event.allDay,event.timeZone??zone,event.duckDetails!.fields.reminderMinutes!,event.startAt);return reminderDateLabel(at!,zone)+' · '+zone;}catch{return '알림 날짜와 시간을 확인해주세요.';}})()}</Text>}</View>
    <CalendarEventDelete onCheck={target=>latestData.current.checkEvent(target)} onMissing={()=>{
     removeCalendarEventWrites(navigationScope,event);data.removeEvent(event.id);
     setEditorBusy(false);setEvent(undefined);setOverlay(eventParent.current);void latestData.current.load(false,true);
    }} onDiscard={data.devicePending(event)?()=>data.cancelDeviceCreate(event.eventId!):undefined} onDeleteNative={data.deleteApple} event={event} store={store} onBusy={setEditorBusy} onRefresh={()=>latestData.current.load(false,true)} onDeleted={()=>{if(event.provider!=='docen'&&event.provider!=='apple-calendar'){removeCalendarEventWrites(navigationScope,event);data.removeEvent(event.id);void data.load();}setEditorBusy(false);setEvent(undefined);setOverlay(null);}}/>
    {event.recurring&&<Text style={s.meta}>반복 일정의 이 한 건입니다.</Text>}{!!event.location&&<View style={{gap:6}}><Text style={s.detailLabel}>위치</Text><Text style={s.eventTitle}>{event.location}</Text></View>}{!!event.notes&&<View style={{gap:6}}><Text style={s.detailLabel}>메모</Text><Text selectable style={s.eventTitle}>{event.notes}{event.notesPartial?'\n원본에 메모가 더 있어요.':''}</Text></View>}
    {!!(event.duckDetails?.fields.localNotes||event.duckDetails?.fields.url||event.duckDetails?.fields.attachments?.length)&&<><Button title="이전 메모·링크" quiet expanded={legacyDetailsOpen} onPress={()=>setLegacyDetailsOpen(v=>!v)}/>{legacyDetailsOpen&&<View style={{gap:8}}>{!!event.duckDetails?.fields.localNotes&&<Text selectable style={s.eventTitle}>{event.duckDetails.fields.localNotes}</Text>}{!!safeCalendarLink(event.duckDetails?.fields.url)&&<Button title="링크 열기" quiet onPress={()=>void external(event.duckDetails?.fields.url)}/ >}{event.duckDetails?.fields.attachments?.map((a,i)=><Button key={i} title={'첨부 링크: '+a.name} quiet onPress={()=>void external(a.url)}/ >)}</View>}</>}
    {!!safeCalendarLink(event.meetingUrl)&&<Button title="회의 링크 열기" quiet onPress={()=>void external(event.meetingUrl)}/ >}
   </ScrollView>}
   {creation&&<CalendarTodoCreator key={editorKey} dueDate={selected} store={store} visible={addKind==='todo'} onBusy={setEditorBusy} onClose={()=>{discardDraft(editorKey);setEditorBusy(false);setOverlay(null);}}/>}
   {overlay==='editor'&&drafts.current[editorKey]&&<View style={{flex:1,minHeight:0,...(creation&&addKind==='todo'?{display:'none'}:{})}}><RetainedCalendarEditor onDeviceEdit={data.enqueueEdit?async(draft,original)=>{
    await data.enqueueEdit!(draft,original);
    if(!store.isCurrentSession())return;
    revealSavedEvent({...original,...confirmedCalendarPatch(draft,original)});
    discardDraft(editorKey);setOverlay(null);void feedback();
   }:undefined} onDeviceCreate={data.enqueueCreate?async job=>{
    try{await data.enqueueCreate!(job);}catch{throw Error('아이폰에 일정을 저장하지 못했어요. 기기 저장 공간을 확인해주세요.');}
    if(!store.isCurrentSession())return;
    revealSavedEvent(job.event);discardDraft(editorKey);setOverlay(null);void feedback();
   }:undefined} onSaveNative={data.saveApple} onBackgroundSave={backgroundSave} onRefreshPermission={()=>{void data.load();void data.loadSources();}} key={editorKey} sourceCursor={data.sourceCursor} onMoreSources={()=>void data.loadSources(true)} sourceError={data.sourceError} metadataAvailable={data.detailsSupported} createOptionsAvailable={data.createOptionsSupported} localFirst={data.localFirst} sourceLoading={data.sourceLoading||data.version===2&&!data.sourceLoaded} store={store} draft={drafts.current[editorKey]} onDraft={d=>setDrafts(old=>({...old,[editorKey]:d}))} event={event} sources={data.sources} onBusy={setEditorBusy} actionState={editorActions[editorKey]} onActionState={value=>value?setEditorActions(old=>({...old,[editorKey]:value})):clearEditorAction(editorKey)} onSaved={patch=>{if(patch&&(patch.id||event)){const saved={...event,...patch,...(patch.mirror?{color:patch.mirror.color??patch.color}:{})} as CalendarEvent;revealSavedEvent(saved);if(event)removeCalendarEventWrites(navigationScope,event);putCalendarWrite(navigationScope,'calendar:'+saved.id,saved,event?.id,true);}clearEditorAction(editorKey);discardDraft(editorKey);setOverlay(null);void data.load();void feedback();}}/></View>}
   {overlay==='picker'&&<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:16,paddingBottom:20}}><View testID="calendar-commands" style={s.toolbarRow}><Pressable style={s.control} accessibilityRole="button" accessibilityLabel={view==='week'?'이전 주':view==='day'?'이전 날':'이전 달'} onPress={()=>{setYearOpen(false);move(-1);setOverlay(null);}}><Ionicons name="chevron-back" size={22} color={colors.blueText}/></Pressable><Pressable style={s.control} accessibilityRole="button" accessibilityLabel={view==='week'?'다음 주':view==='day'?'다음 날':'다음 달'} onPress={()=>{setYearOpen(false);move(1);setOverlay(null);}}><Ionicons name="chevron-forward" size={22} color={colors.blueText}/></Pressable><Button title="오늘" quiet onPress={()=>{setYearOpen(false);now();setOverlay(null);}}/><Pressable style={s.control} accessibilityRole="button" accessibilityLabel="캘린더 보기 전환" onPress={()=>setOverlay('views')}><Ionicons name="albums-outline" size={22} color={colors.blueText}/></Pressable><Pressable style={s.control} accessibilityRole="button" accessibilityLabel="캘린더 검색" onPress={()=>setOverlay('search')}><Ionicons name="search-outline" size={22} color={colors.blueText}/></Pressable><Pressable style={s.control} accessibilityRole="button" accessibilityLabel="캘린더 항목 추가" onPress={()=>beginEvent()}><Ionicons name="add" size={24} color={colors.blueText}/></Pressable></View><Button title="캘린더 상태·새로고침" quiet onPress={()=>setOverlay('connection')}/>
{!calendarFeatures.yearOverview&&<>{Platform.OS==='web'?<View style={{flexDirection:'row',gap:12}}>{[true,false].map(year=>React.createElement('select',{key:String(year),'aria-label':year?'이동할 년':'이동할 월',value:year?+pickedMonth.slice(0,4):+pickedMonth.slice(5)-1,onChange:(e:React.ChangeEvent<HTMLSelectElement>)=>setPickedMonth(year?e.target.value+'-'+pickedMonth.slice(5):pickedMonth.slice(0,4)+'-'+String(+e.target.value+1).padStart(2,'0')),style:{padding:12,minHeight:44,fontSize:17}},...Array.from({length:year?201:12},(_,i)=>React.createElement('option',{key:i,value:year?1900+i:i},String(year?1900+i:i+1)+(year?'년':'월')))))}</View>:<View><View style={s.toolbarRow}><Pressable style={s.control} accessibilityRole="button" accessibilityLabel="이전 년" onPress={()=>setPickedMonth(String(Math.max(1900,+pickedMonth.slice(0,4)-1))+pickedMonth.slice(4))}><Text style={s.chevron}>‹</Text></Pressable><Text style={s.section}>{pickedMonth.slice(0,4)}년</Text><Pressable style={s.control} accessibilityRole="button" accessibilityLabel="다음 년" onPress={()=>setPickedMonth(String(Math.min(2100,+pickedMonth.slice(0,4)+1))+pickedMonth.slice(4))}><Text style={s.chevron}>›</Text></Pressable></View><View style={{flexDirection:'row',flexWrap:'wrap'}}>{Array.from({length:12},(_,i)=><Pressable key={i} style={[s.control,{width:'25%'}]} accessibilityRole="radio" accessibilityState={{checked:+pickedMonth.slice(5)===i+1}} onPress={()=>setPickedMonth(pickedMonth.slice(0,4)+'-'+String(i+1).padStart(2,'0'))}><Text style={s.link}>{i+1}월</Text></Pressable>)}</View></View>}<Button title="선택한 년월로 이동" onPress={()=>{setMonth(pickedMonth);setSelected(pickedMonth+'-01');setOverlay(null);}}/><Button title="년월 선택 닫기" quiet onPress={()=>setOverlay(null)}/></>}</ScrollView>}
   {overlay==='sources'&&<CalendarVisibilityList sources={data.sources} selected={shownSources} showDocen={selection.showDocen} ready={selection.ready} busy={data.sourceLoading} more={!!data.sourceCursor} onToggle={toggleSource} onMore={()=>void data.loadSources(true)}/>}
   {overlay==='connection'&&<View testID="calendar-connection-status" style={{gap:12}}><Text accessibilityRole={data.phase==='error'?'alert':'text'} style={s.meta}>{statusText}</Text>{[...new Set([data.error,data.sourceError].filter(Boolean))].map(reason=><Text key={reason} style={s.meta}>{reason}</Text>)}{!!store.error&&<Text style={s.meta}>{store.error}</Text>}{data.appleAvailable&&<Button title="아이폰 캘린더 전체 접근 허용" quiet onPress={()=>{void data.allowApple().then(granted=>{if(!granted)setLocalError('iPhone 설정에서 캘린더 전체 접근을 허용할 수 있어요.');}).catch(()=>setLocalError('아이폰 캘린더 권한을 확인하지 못했어요.'));}}/>}<Button title="일정 새로고침" quiet disabled={data.phase==='loading'} onPress={()=>void data.load()}/>{!!store.error&&<Button title="데이터 다시 불러오기" quiet onPress={()=>void store.refresh()}/ >}{hasCursor&&<Button title="일정 더 불러오기" quiet onPress={()=>void data.load(true)}/>}{onManageConnections&&<Button title="ME에서 연결 관리" quiet onPress={()=>{setOverlay(null);onManageConnections();}}/>}</View>}
   {overlay==='views'&&<View style={{gap:16}}><View accessibilityRole="tablist" accessibilityLabel="캘린더 보기" style={s.segments}>{(['month','week','day','list'] as const).map(v=><Pressable key={v} accessibilityRole="tab" accessibilityLabel={{month:'월 보기',week:'주간 보기',day:'일 보기',list:'목록 보기'}[v]} accessibilityState={{selected:view===v}} aria-selected={view===v} onPress={()=>{setYearOpen(false);setView(v);setOverlay(null);animatePeriod();}} style={[s.segment,view===v&&s.segmentSelected]}><Text style={{color:view===v?colors.blueText:colors.secondary,fontWeight:view===v?'600':'400'}}>{{month:'월',week:'주',day:'일',list:'목록'}[v]}</Text></Pressable>)}</View><Button title="캘린더 보기 설정" quiet onPress={()=>{setZoneDraft(zone);setStartDayDraft(startDay);setDensityDraft(density);setOverlay('settings');}}/></View>}
   {overlay==='settings' &&<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12,paddingBottom:24}}><Button title="표시할 캘린더 선택" quiet disabled={!store.user||data.version!==2} onPress={openVisibility}/>{data.version===1&&<Text style={s.meta}>추가 캘린더와 일정 작성은 새 서버 기능 반영 후 사용할 수 있어요.</Text>}<Text style={s.section}>월 정보량</Text><View style={s.toolbarRow}>{(['details','compact'] as const).map(d=><Pressable key={d} style={s.control} accessibilityRole="radio" accessibilityState={{checked:densityDraft===d}} onPress={()=>setDensityDraft(d)}><Text style={s.link}>{d==='details'?'제목 표시':'개수만 표시'} {densityDraft===d?'✓':''}</Text></Pressable>)}</View><Text style={s.meta}>화면 공간이나 글자가 커지면 제목 대신 개수로 표시해요.</Text><Text style={s.section}>주 시작</Text><View style={s.toolbarRow}>{[0,1].map(d=><Pressable key={d} style={s.control} accessibilityRole="radio" accessibilityState={{checked:startDayDraft===d}} onPress={()=>setStartDayDraft(d)}><Text style={s.link}>{d===0?'일요일':'월요일'} {startDayDraft===d?'✓':''}</Text></Pressable>)}</View><Text style={s.section}>표시 시간대</Text>{[...new Set([deviceZone(),'Asia/Seoul','UTC','America/New_York','Europe/London','Asia/Tokyo'])].map(z=><Pressable key={z} style={s.control} accessibilityRole="radio" accessibilityState={{checked:zoneDraft===z}} onPress={()=>setZoneDraft(z)}><Text style={s.link}>{zoneDraft===z?'● ':'○ '}{z}</Text></Pressable>)}<TextInput accessibilityLabel="캘린더 시간대" style={s.input} value={zoneDraft} onChangeText={setZoneDraft} autoCapitalize="none"/><Button title="보기 설정 적용" onPress={()=>{if(!validZone(zoneDraft)){setLocalError('시간대를 확인해주세요.');return;}setZone(zoneDraft);setStartDay(startDayDraft);setDensity(densityDraft);setOverlay(null);}}/><Text style={s.meta}>밝게·어둡게는 시스템 설정을 따릅니다. 투명도/동작 줄이기와 큰 글자는 기기 설정을 따릅니다.</Text></ScrollView>}
   {overlay==='search'&&<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12,paddingBottom:24}}><Text style={s.meta}>현재 표시 기간 · {days[0]} ~ {days.at(-1)} · {zone}{data.phase==='partial'?' · 일부 자료만 불러옴':''}</Text><TextInput accessibilityLabel="캘린더 일정과 할 일 검색" placeholder="제목·장소·메모 찾기" value={query} onChangeText={setQuery} style={s.input}/>{query.trim()&&events.filter(e=>[e.title,e.location,e.notes].join(' ').normalize('NFKC').toLocaleLowerCase().includes(query.trim().normalize('NFKC').toLocaleLowerCase())).map(e=>eventRow(e,selected,false))}{query.trim()&&store.todos.filter(t=>days.includes(t.dueDate??'')&&[t.title,t.notes].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map(t=><Pressable key={t.id} style={s.control} accessibilityRole="button" onPress={()=>{setOverlay(null);onEdit(t);}}><Text style={s.eventTitle}>□ {t.title} · {t.dueDate}</Text></Pressable>)}{query.trim()&&!events.some(e=>[e.title,e.location,e.notes].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))&&!store.todos.some(t=>days.includes(t.dueDate??'')&&[t.title,t.notes].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))&&<Text style={s.empty}>현재 기간에 일치하는 항목이 없어요.</Text>}{(data.phase==='error'||data.phase==='partial')&&<Text style={s.error}>일정을 모두 읽지 못했어요. 결과가 전체 자료를 뜻하지 않아요.</Text>}</ScrollView>}
  </CalendarSheet>}
 </CalendarDragSurface>;
}
const s=StyleSheet.create({
 visibilityControl:{minHeight:44,minWidth:65,alignItems:'center',justifyContent:'center'},
 visibilityPill:{minWidth:65,minHeight:34,borderRadius:10,paddingHorizontal:9,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,backgroundColor:colors.pale},
 visibilityLabel:{color:colors.blueText,fontSize:13,lineHeight:18,fontWeight:'600'},
 startTime:{fontSize:11,lineHeight:16,color:colors.secondary},eventPill:{flexDirection:'row',alignItems:'center',gap:2,backgroundColor:colors.pale,borderRadius:5,paddingHorizontal:3,minHeight:20},todoPill:{flexDirection:'row',alignItems:'center',gap:2,backgroundColor:colors.grouped,borderRadius:5,paddingHorizontal:3,minHeight:20},errorDetail:{...typography.caption,color:colors.muted,paddingHorizontal:16,paddingBottom:6},editButton:{minWidth:64,minHeight:44,borderRadius:24,backgroundColor:colors.grouped,alignItems:'center',justifyContent:'center',paddingHorizontal:16},detailHeading:{flexDirection:'row',gap:12,marginVertical:0},accent:{width:5,borderRadius:3,backgroundColor:colors.action},detailTitle:{fontSize:28,lineHeight:36,fontWeight:'700',color:colors.text},detailLabel:{...typography.body,color:colors.muted,paddingLeft:16},optionRow:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:12,minHeight:52,borderRadius:20,backgroundColor:colors.grouped},sourceDot:{width:10,height:10,borderRadius:5,backgroundColor:colors.action},root:{flex:1,minHeight:0,backgroundColor:colors.bg},toolbar:{marginHorizontal:16,paddingBottom:4},toolbarRow:{flexDirection:'row',alignItems:'center',gap:2,flexWrap:'wrap'},control:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:6,paddingVertical:6},chevron:{fontSize:24,lineHeight:30,color:colors.secondary},month:{fontSize:18,lineHeight:26,fontWeight:'700',color:colors.text},link:{...typography.detail,color:colors.blueText,fontWeight:'600'},segments:{flexDirection:'row',flex:1,backgroundColor:'rgba(120,120,128,0.1)',borderRadius:18,minWidth:176},segment:{flex:1,minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:4,borderRadius:16},segmentSelected:{backgroundColor:colors.bg},creationSegments:{padding:3,backgroundColor:colors.grouped,minWidth:0},creationSegment:{minHeight:40},creationSelected:{backgroundColor:colors.pale,borderColor:colors.blueText,borderWidth:StyleSheet.hairlineWidth},status:{marginHorizontal:16,flexDirection:'row',alignItems:'center',gap:4,minHeight:28},statusText:{fontSize:12,lineHeight:18,color:colors.muted,flex:1},error:{...typography.caption,color:colors.danger,padding:8},weekdays:{flexDirection:'row',paddingTop:0,paddingBottom:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},weekday:{flex:1,textAlign:'center',...typography.caption},day:{overflow:'hidden',paddingHorizontal:2,paddingTop:3,paddingBottom:3,alignItems:'center',borderColor:colors.line},chosen:{backgroundColor:colors.pale,borderRadius:12,borderWidth:1,borderColor:colors.action},number:{fontSize:20,lineHeight:26,minWidth:36,minHeight:36,paddingHorizontal:4,paddingVertical:5,textAlign:'center',borderRadius:20,color:colors.secondary},todayCell:{backgroundColor:colors.pale,borderRadius:12},today:{fontWeight:'800',color:colors.blueText},gridNumber:{fontSize:18,lineHeight:24,minWidth:30,minHeight:30,paddingVertical:3,borderRadius:15},chosenNumber:{backgroundColor:colors.action,color:colors.white},count:{fontSize:11,lineHeight:16,color:colors.secondary},eventChip:{fontSize:12,lineHeight:18,color:colors.text,flexShrink:1},todoChip:{fontSize:12,lineHeight:18,color:colors.secondary,flexShrink:1},span:{position:'absolute',bottom:2,paddingHorizontal:2},spanText:{fontSize:11,lineHeight:16,color:colors.secondary,backgroundColor:colors.grouped,borderRadius:4,paddingHorizontal:3},summary:{minHeight:44,paddingHorizontal:12,justifyContent:'center',borderTopWidth:StyleSheet.hairlineWidth,borderColor:colors.line},agenda:{paddingHorizontal:4,paddingTop:0},dayAgenda:{paddingHorizontal:layout.pageInset,paddingTop:16},agendaHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'},section:{...typography.body,fontWeight:'600',color:colors.text},eventRow:{flexDirection:'row',gap:10,paddingVertical:12,minHeight:64,alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderColor:colors.line},timeColumn:{width:54,gap:4},eventTime:{fontSize:13,lineHeight:20,color:colors.secondary,fontWeight:'600'},eventTitle:{...typography.body,color:colors.text},meta:{...typography.caption,color:colors.muted},empty:{...typography.detail,color:colors.muted,paddingVertical:16},input:{minHeight:48,...typography.body,color:colors.text,backgroundColor:colors.surface,borderRadius:12,padding:12},source:{minHeight:52,paddingVertical:10,gap:5}});

function RetainedCalendarEditor({draft,onDraft,...props}:React.ComponentProps<typeof CalendarEventEditor>){const [local,setLocal]=useState(draft),[initialEvent]=useState(props.event);return <CalendarEventEditor {...props} event={initialEvent?.provider==='apple-calendar'?initialEvent:props.event} draft={local} onDraft={value=>{setLocal(value);onDraft(value);}}/>;}

function CalendarTodoCreator({visible,...props}:Omit<React.ComponentProps<typeof TodoEditorForm>,'presentation'>&{visible:boolean}){const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null),field=useFocusedField(scroll);return <ScrollRevealContext.Provider value={field.show}><ScrollView ref={scroll} testID="calendar-create-todo" style={{flex:1,minHeight:0,...(!visible?{display:'none'}:{})}} onLayout={field.reveal} onScroll={field.onScroll} onContentSizeChange={field.reveal} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:24}}><TodoEditorForm {...props} visible={visible} presentation="inline"/></ScrollView></ScrollRevealContext.Provider>;}

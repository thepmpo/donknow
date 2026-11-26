import {TodoDestinationPicker} from './TodoDestinationPicker';
import type {PointerEvent,ViewStyle} from 'react-native';
import {TodoGestureRow,TodoGestureScroll} from './todo-gestures';
import type {RowPoint} from './todo-gesture-types';
import {ScreenHeading} from './ScreenHeading';
import {useRefreshIndicator} from './useRefreshIndicator';
import {BrandLoading} from './BrandLoading';
import {useDesktopPresentation} from './DesktopPresentation';
import {Ionicons} from '@expo/vector-icons';
import {todoSource} from './todo-organization';
import {KeyboardDismiss,useKeyboardUX} from './KeyboardUX';
import {ScrollRevealContext,useFocusedField,useKeyboardInset} from './useFocusedField';
import {ScrollArea as ScrollView} from './ScrollArea';
import { useDuoTrailingNavigation } from './DuoLayout';
import {useDuoBackAction} from './DuoBackNavigation';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NotesField} from './NotesField';
import { DraggableSheet, MotionView, useReducedMotion, useModalDismiss, motion } from './motion';
import { MotionPressable as Pressable, MotionModal as Modal } from './motion';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {Animated, Easing, PanResponder, Platform,  StyleSheet, Text, TextInput, View, Switch, Keyboard, KeyboardAvoidingView, Share} from 'react-native';
import {DateTimeField} from './DateTimeField';
import {todoReminderInstant} from './calendar-display';
import {deviceZone} from './calendar-model';
import { COMPLETION_DELAY, COMPLETION_FADE_DURATION, dateKey, validateDraft, formatDueDate } from './domain';
import type { Draft, Todo } from './domain';
import type { TodoStore } from './useTodos';
import { colors, typography, spacing, radius, layout } from './theme';
export { colors } from './theme';
export function Label({ children }: { children: React.ReactNode }) { return <Text style={s.label}>{children}</Text>; }
export function Button({ title, onPress, disabled = false, quiet = false, loading = false, accessibilityLabel, expanded }: { title: string; onPress: () => void; disabled?: boolean; quiet?: boolean; loading?: boolean; accessibilityLabel?: string; expanded?:boolean }) {
  const reduced = useReducedMotion();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: disabled || loading, busy: loading, ...(expanded===undefined?{}:{expanded}) }} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [s.button, quiet && s.quietButton, { opacity: disabled ? .4 : pressed ? .75 : 1 }]}>{loading && <BrandLoading size={28}/>}<Text style={[s.buttonText, quiet && { color: colors.blueText }]}>{title}</Text></Pressable>;
}
export function CloseButton({onPress,disabled=false}:{onPress:()=>void;disabled?:boolean}) {
  const duo=useDuoBackAction(onPress,disabled,'close');
  if(duo)return <View pointerEvents="none" accessible={false} style={{width:44,minHeight:44}}/>;
  return <Pressable accessibilityRole="button" accessibilityLabel="닫기" disabled={disabled} onPress={onPress} style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center',opacity:disabled ? 0.4 : 1}}><Text style={{fontSize:24,lineHeight:28,color:colors.muted}}>×</Text></Pressable>;
}
export function BackButton({onPress,disabled=false}:{onPress:()=>void;disabled?:boolean}){
  const duo=useDuoBackAction(onPress,disabled);
  return duo?null:<Button title="돌아가기" quiet disabled={disabled} onPress={onPress}/>;
}
/** Page-owned secondary controls stay below the title while only the body scrolls. */
export function PagePinned({children,testID}:{children:React.ReactNode;testID?:string}){return <View testID={testID}>{children}</View>;}
export function Page({ children, refreshControl, compact = false, scrollRef,onScroll,testID,scrollEnabled,bottomSpace=0,todoGestures=false }: { todoGestures?:boolean;bottomSpace?:number;scrollEnabled?:boolean;scrollRef?: React.RefObject<React.ComponentRef<typeof ScrollView>|null>; children: React.ReactNode; refreshControl?: React.ReactElement; compact?: boolean;onScroll?:React.ComponentProps<typeof ScrollView>['onScroll'];testID?:string }) {
  const desktop=useDesktopPresentation();
  const insets=useSafeAreaInsets();
  const duo=useDuoTrailingNavigation();
  const [pullVisible,setPullVisible]=useState(false),[chromeHeight,setChromeHeight]=useState(0);
  const refresh=refreshControl as React.ReactElement<import('react-native').RefreshControlProps>|undefined;
  const refreshing=!!refresh?.props.refreshing;
  const indicator=useRefreshIndicator(refreshing);
  const parts=React.Children.toArray(children),heading=!desktop?parts.find(child=>React.isValidElement(child)&&child.type===ScreenHeading):undefined;
  const pinned=!desktop?parts.filter(child=>React.isValidElement(child)&&child.type===PagePinned):[];
  const chrome=!!heading||pinned.length>0;
  const body=chrome?parts.filter(child=>child!==heading&&!pinned.includes(child)):children;
  const nativeRefresh=refresh?React.cloneElement(refresh,{refreshing:indicator.visible,onRefresh:()=>{indicator.begin();refresh.props.onRefresh?.();},tintColor:'transparent',colors:['transparent'],progressBackgroundColor:'transparent'}):undefined;
  const pageScroll=<ScrollView directionalLockEnabled={todoGestures} style={{flex:1,minHeight:0}} ref={scrollRef} testID={testID} scrollEnabled={scrollEnabled} scrollEventThrottle={16} onScroll={event=>{if(refresh)setPullVisible(event.nativeEvent.contentOffset.y < -28);onScroll?.(event);}} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={nativeRefresh} contentContainerStyle={[s.page,{paddingTop:chrome?4:layout.pageTop,paddingBottom:(duo ? 0 : layout.navigationHeight+insets.bottom)+layout.sectionGap+bottomSpace},desktop&&{padding:30,paddingTop:28,paddingBottom:30}]}>{body}</ScrollView>;
  return <MotionView style={{flex:1,minHeight:0}} distance={0}>{chrome&&<View testID="fixed-page-heading" onLayout={event=>setChromeHeight(event.nativeEvent.layout.height)} style={{paddingHorizontal:layout.pageInset,paddingTop:layout.pageTop,backgroundColor:colors.bg,zIndex:1}}>{heading}{pinned}</View>}{todoGestures?<TodoGestureScroll>{pageScroll}</TodoGestureScroll>:pageScroll}{!!refresh&&!indicator.expired&&(indicator.visible||pullVisible)&&<View testID="brand-pull-refresh" pointerEvents="none" style={{position:'absolute',left:0,right:0,top:chromeHeight,height:52,alignItems:'center',justifyContent:'center'}}><BrandLoading size={48} label={refreshing?'새로고침 중':'당겨서 새로고침'}/></View>}</MotionView>;
}
export function TodoRow({ todo, pending = false, pendingUntil, busy = false, canToggleWhileBusy = false, canSelectWhileBusy = false, onToggle, onEdit, log = false,compact=false,selected,onSelect,onOpenSource,onLift,onDrag,onDrop,onSelectAccessible }: { onLift?:(point:RowPoint)=>void;onDrag?:(point:RowPoint)=>void;onDrop?:(completed:boolean)=>void;onSelectAccessible?:()=>void;selected?:boolean;onSelect?:()=>void;onOpenSource?:()=>void;todo: Todo; pending?: boolean; pendingUntil?: number; busy?: boolean; canToggleWhileBusy?: boolean; canSelectWhileBusy?:boolean; onToggle: () => void; onEdit?: () => void; log?: boolean;compact?:boolean }) {
  const desktop=useDesktopPresentation();
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced); reducedRef.current = reduced;
  const exit = useRef(new Animated.Value(1)).current;
  const rowHeight = useRef(60);
  const [collapsing, setCollapsing] = useState(false);
  const [countdown, setCountdown] = useState(COMPLETION_DELAY / 1000);
  useEffect(() => {
    if (!pending || !pendingUntil) return;
    const tick = () => setCountdown(Math.max(0, Math.min(COMPLETION_DELAY / 1000, Math.ceil((pendingUntil - COMPLETION_FADE_DURATION - Date.now()) / 1000))));
    tick();
    const timer = setInterval(tick, 50);
    return () => clearInterval(timer);
  }, [pending, pendingUntil]);
  useEffect(() => {
    exit.stopAnimation(); exit.setValue(1); setCollapsing(false);
    if (!pending || !pendingUntil || reduced) return;
    const remaining = Math.max(0, pendingUntil - Date.now());
    const duration = Math.min(COMPLETION_FADE_DURATION, remaining);
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
  const selectionBlocked=useRef(busy&&!canSelectWhileBusy);
  selectionBlocked.current=busy&&!canSelectWhileBusy;
  const toggleBlocked = useRef(busy && !canToggleWhileBusy); toggleBlocked.current = busy && !canToggleWhileBusy;
  const suppressUntil = useRef(0);
  const swiping = useRef(false);
  function press(action?:()=>void,kind:'edit'|'toggle'|'select'='edit') {
    const blocked=kind==='toggle'?toggleBlocked.current:kind==='select'?selectionBlocked.current:busyRef.current;
    if(!swiping.current&&!held.current&&Date.now()>=suppressUntil.current&&!blocked)action?.();
  }
  const beginPress=()=>{if(!swiping.current&&!held.current)suppressUntil.current=0;};
  const reset = () => {
    if(Platform.OS!=='web')return;
    offset.stopAnimation();
    if(reducedRef.current)offset.setValue(0);
    else Animated.timing(offset,{toValue:0,duration:175,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();
  };
  useEffect(() => () => offset.stopAnimation(), [offset]);
  const swipeSelect = useRef(onSelect);
  swipeSelect.current = onSelect;
  const swipeOrigin = useRef(0);
  const held = useRef(false);
  const webGesture = useRef<'swipe'|'drag'|null>(null);
  const mouse=useRef<{id:number;start:RowPoint;kind:'swipe'|'drag'|null;distance:number}|null>(null);
  const drag = useRef({onLift,onDrag,onDrop});
  drag.current={onLift,onDrag,onDrop};
  function startSwipe() {
    offset.stopAnimation();
    swiping.current=true;
  }
  function moveSwipe(distance:number) {
    const sign=Math.sign(distance),length=Math.abs(distance);
    offset.setValue(sign*Math.min(104,length<=72?length:72+(length-72)*0.32));
  }
  function finishSwipe(distance:number,completed:boolean) {
    swiping.current=false;
    suppressUntil.current=Date.now()+250;
    reset();
    if(!completed||Math.abs(distance)<48)return;
    if(distance>0){if(!selectionBlocked.current)swipeSelect.current?.();}
    else if(!toggleBlocked.current)onToggleRef.current();
  }
  function lift(point:RowPoint) {
    if(busyRef.current||!drag.current.onLift)return;
    held.current=true;suppressUntil.current=Date.now()+400;
    drag.current.onLift(point);
  }
  function drop(completed:boolean) {
    if(!held.current)return;
    held.current=false;suppressUntil.current=Date.now()+250;
    drag.current.onDrop?.(completed);
  }
  function mouseStart(event:PointerEvent){
    const e=event.nativeEvent;
    if(e.pointerType!=='mouse'||e.button!==0)return;
    mouse.current={id:e.pointerId,start:{x:e.pageX,y:e.pageY},kind:null,distance:0};
  }
  function mouseMove(event:PointerEvent){
    const e=event.nativeEvent,active=mouse.current;
    if(!active||e.pointerId!==active.id||!(e.buttons&1))return;
    const distance=e.pageX-active.start.x,vertical=e.pageY-active.start.y;
    if(!active.kind){
      if(held.current)active.kind='drag';
      else if(Math.abs(distance)>=10&&Math.abs(distance)>=Math.abs(vertical)*0.85&&
        (distance>0?!!swipeSelect.current&&!selectionBlocked.current:!toggleBlocked.current)){
        active.kind='swipe';startSwipe();
      }else return;
      (event.currentTarget as unknown as HTMLElement)?.setPointerCapture?.(e.pointerId);
    }
    event.preventDefault();
    active.distance=distance;
    if(active.kind==='drag')drag.current.onDrag?.({x:e.pageX,y:e.pageY});
    else moveSwipe(distance);
  }
  function mouseEnd(event:PointerEvent,completed:boolean){
    const e=event.nativeEvent,active=mouse.current;
    if(!active||e.pointerId!==active.id)return;
    mouse.current=null;
    const element=event.currentTarget as unknown as HTMLElement;
    if(element?.hasPointerCapture?.(e.pointerId))element.releasePointerCapture(e.pointerId);
    if(held.current)drop(completed);
    else if(active.kind==='swipe')finishSwipe(active.distance,completed);
  }
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_,g)=>{
      if(mouse.current)return false;
      if(held.current)return true;
      if(g.numberActiveTouches!==1||Math.abs(g.dx)<10||Math.abs(g.dx)<Math.abs(g.dy)*0.85)return false;
      if(g.dx>0?selectionBlocked.current||!swipeSelect.current:toggleBlocked.current)return false;
      swipeOrigin.current=g.dx;
      return true;
    },
    onPanResponderGrant:()=>{
      webGesture.current=held.current?'drag':'swipe';
      if(!held.current){startSwipe();moveSwipe(swipeOrigin.current);}
    },
    onPanResponderMove:(event,g)=>{
      if(webGesture.current==='drag'){if(held.current)drag.current.onDrag?.({x:event.nativeEvent.pageX,y:event.nativeEvent.pageY});}
      else if(webGesture.current==='swipe')moveSwipe(g.dx+swipeOrigin.current);
    },
    onPanResponderRelease:(_,g)=>{
      if(webGesture.current==='drag')drop(true);
      else if(webGesture.current==='swipe')finishSwipe(g.dx+swipeOrigin.current,true);
      webGesture.current=null;
      swipeOrigin.current=0;
    },
    onPanResponderTerminate:()=>{
      if(webGesture.current==='drag')drop(false);
      else if(webGesture.current==='swipe')finishSwipe(0,false);
      webGesture.current=null;
      swipeOrigin.current=0;
    },
    onPanResponderTerminationRequest:()=>!held.current&&!swiping.current,
  }), [offset]);
  const canLift=!!onLift&&!busy;
  const date = log && todo.completedAt ? new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(todo.completedAt)) : todo.dueDate ? todo.dueDate.slice(5).replace('-', ' / ') : '';
  const provenance=todoSource(todo);
  const membership=todo.source?.listTitle;
  return <Animated.View testID={`completion-motion-${todo.id}`} style={[s.swipeWrap, {opacity:exit}, collapsing && {height:exit.interpolate({inputRange:[0,1],outputRange:[0,rowHeight.current]})}]}>
    <View pointerEvents="none" aria-hidden style={s.swipeBack}><Text style={s.swipeBackText}>{onSelect ? selected ? '선택 취소' : '선택' : ''}</Text><Text style={s.swipeBackText}>{log ? '' : todo.done ? '되돌리기' : '완료'}</Text></View>
    <TodoGestureRow canSwipeLeft={!busy||canToggleWhileBusy} canSwipeRight={!!onSelect&&!selectionBlocked.current} canLift={canLift} reduced={reduced}
      onSwipeStart={startSwipe} onSwipeEnd={finishSwipe} onLift={lift} onDrag={point=>drag.current.onDrag?.(point)} onDrop={drop}>
    <Animated.View collapsable={false} onLayout={event=>{if(!collapsing)rowHeight.current=event.nativeEvent.layout.height;}}
      {...(Platform.OS==='web'?{...responder.panHandlers,onPointerDown:mouseStart,onPointerMove:mouseMove,onPointerUp:(event:PointerEvent)=>mouseEnd(event,true),onPointerCancel:(event:PointerEvent)=>mouseEnd(event,false),onTouchEnd:()=>drop(true),onTouchCancel:()=>drop(false)}:{})} style={[s.todoRow,compact&&{borderBottomWidth:0,minHeight:56,paddingVertical:6,gap:10}, selected&&s.selectedTodoRow,Platform.OS==='web'&&({userSelect:'none'} as ViewStyle),Platform.OS==='web'&&{transform:[{translateX:offset}]}]} testID={`todo-${todo.id}`}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{checked:todo.done,disabled:busy&&!canToggleWhileBusy}} accessibilityLabel={`${todo.title} ${todo.done?'미완료로 변경':'완료하기'}`} disabled={busy&&!canToggleWhileBusy} onPressIn={beginPress} onPress={()=>press(onToggle,'toggle')} hitSlop={compact?10:9} style={[s.checkbox,compact&&{width:24,height:24,borderRadius:7,borderWidth:1.5},desktop&&{width:19,height:19,borderRadius:5,borderWidth:1.5},todo.done&&s.checked]}>
        <Animated.Text style={[s.checkText,{opacity:checked,transform:[{scale:checked.interpolate({inputRange:[0,1],outputRange:[0.7,1]})}]}]}>✓</Animated.Text>
      </Pressable>
      <Pressable disabled={selected!==undefined?selectionBlocked.current:!onEdit||busy} onPressIn={beginPress} onPress={() => selected!==undefined?press(onSelect,'select'):press(onEdit)} onLongPress={canLift&&Platform.OS==='web'?event=>lift({x:event.nativeEvent.pageX,y:event.nativeEvent.pageY}):undefined} delayLongPress={320} accessibilityRole={onEdit ? 'button' : undefined} accessibilityLabel={onEdit ? `${todo.title} 수정` : undefined} accessibilityHint={canLift?'길게 눌러 끌면 옮길 수 있어요.':undefined} accessibilityActions={onSelectAccessible?[{name:'longpress',label:'할 일 선택 및 이동 메뉴'}]:undefined} onAccessibilityAction={event=>{if(event.nativeEvent.actionName==='longpress')onSelectAccessible?.();}} style={s.todoBody}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[s.todoTitle,desktop&&{fontSize:13,lineHeight:21,fontWeight:'500'}, todo.done && !log && s.doneText]}>{todo.title}</Text>
        {pending&&!log ? <Text testID={`completion-countdown-${todo.id}`} style={s.pendingText}>{countdown > 0 ? `완료 · ${countdown}초 후 log로 이동` : '완료 · log로 이동'}</Text> : (date||membership||!compact)?<Text numberOfLines={1} style={[s.todoDate,desktop&&s.desktopTodoDate]}>{[date,membership].filter(Boolean).join(' · ')}</Text>:null}
        {!!todo.saveState&&<Text accessibilityLiveRegion="polite" style={s.todoDate}>{todo.saveState==='saving'?'저장 중':'저장 결과 확인 중'}</Text>}
      </Pressable>
      {todo.source&&<View testID={`todo-source-${todo.id}`} style={s.todoProvenance}>
        {todo.source.color?<View testID={`todo-source-color-${todo.id}`} style={{width:9,height:9,borderRadius:5,backgroundColor:todo.source.color}}/>:<Ionicons name={provenance.icon} size={13} color={provenance.color}/>}
        <Text numberOfLines={1} style={[s.todoDate,{flexShrink:1,textAlign:'right',marginTop:0},desktop&&s.desktopTodoDate]}>{provenance.label}</Text>
      </View>}
      {selected!==undefined?<Pressable accessibilityRole="checkbox" accessibilityLabel={`${todo.title} 선택`} accessibilityState={{checked:selected,disabled:selectionBlocked.current}} disabled={selectionBlocked.current} onPressIn={beginPress} onPress={()=>press(onSelect,'select')} style={s.rowAccessory}>
        <Ionicons name={selected?'checkmark-circle':'ellipse-outline'} size={21} color={selected?colors.blueText:colors.muted}/>
      </Pressable>:pending&&!log ? <Pressable onPress={() => press(onToggle,'toggle')} disabled={busy && !canToggleWhileBusy} onPressIn={beginPress} accessibilityRole="button" accessibilityLabel={`${todo.title} 되돌리기`} style={s.rowAccessory}><Text style={s.restore}>되돌리기</Text></Pressable> : onOpenSource ? <Pressable accessibilityRole="link" accessibilityLabel={`${todo.title} 원본 열기`} onPress={()=>press(onOpenSource)} disabled={busy} style={s.rowAccessory}><Ionicons name="open-outline" size={21} color={colors.blueText}/></Pressable> : onEdit&&!compact ? <Pressable accessibilityRole="button" accessibilityLabel={`${todo.title} 수정 메뉴`} onPress={() => press(onEdit)} disabled={busy} style={s.more}><Text style={s.moreText}>···</Text></Pressable> : null}
    </Animated.View>
    </TodoGestureRow>
  </Animated.View>;
}
export function DateField({value,onChange,disabled=false,activePicker,onPickerChange}:{value:string|null;onChange:(date:string|null)=>void;disabled?:boolean;activePicker?:string|null;onPickerChange?:(value:string|null)=>void}){return <DateTimeField label="예정일" inputLabel="예정일 선택" value={value} onChange={onChange} clearable disabled={disabled} activePicker={activePicker} onPickerChange={onPickerChange}/>;}
type TodoEditorProps={todo?:Todo;dueDate:string|null;store:TodoStore;onClose:()=>void};
export function TodoEditor(props:TodoEditorProps){
 const {visible,close}=useModalDismiss(props.onClose),[busy,setBusy]=useState(false);
 return <Modal visible={visible} transparent animationType="slide" onRequestClose={()=>{if(!busy)close();}}><TodoEditorForm {...props} visible={visible} onClose={close} onBusy={setBusy}/></Modal>;
}
/** Same form in the native modal's own safe surface or a geometry fixture. */
export function TodoEditorForm({todo,dueDate,store,onClose,visible=true,onBusy,presentation='sheet'}:{todo?:Todo;dueDate:string|null;store:TodoStore;onClose:()=>void;visible?:boolean;onBusy?:(busy:boolean)=>void;presentation?:'sheet'|'inline'}){
  const parentReveal=useContext(ScrollRevealContext),inline=presentation==='inline',focusedInline=useRef<React.ComponentRef<typeof TextInput>|null>(null);
  const [tools,setTools]=useState<'date'|'alarm'|'more'|null>(null);
  const [destination,setDestination]=useState<React.ComponentProps<typeof TodoDestinationPicker>['value']>(null);
  function focusInput(input:React.ComponentRef<typeof TextInput>|null){focusedInline.current=input;if(inline)parentReveal(input);else field.focus(input);}
  function revealInput(){if(inline){if(focusedInline.current)parentReveal(focusedInline.current);}else field.reveal();}
  const keyboard=useKeyboardUX(),scroll=useRef<React.ComponentRef<typeof ScrollView>>(null),titleRef=useRef<React.ComponentRef<typeof TextInput>>(null),field=useFocusedField(scroll),surface=useRef<React.ComponentRef<typeof View>>(null),keyboardInset=useKeyboardInset(surface);
  const [title, setTitle] = useState(todo?.title ?? '');
  const [date, setDate] = useState(todo?.dueDate ?? dueDate);
  const [notes,setNotes] = useState(todo?.notes ?? '');
  const sourceTimeEditable=destination?.target.provider==='apple-reminders'||todo?.source?.provider==='apple-reminders'||todo?.source?.provider==='google'&&todo.source.externalId.includes(':calendar');
  const [dueTime,setDueTime]=useState<string|null>(todo?.dueTime??null);
  const [alarm, setAlarm] = useState(!!todo?.reminderAt),[alarmConfigured,setAlarmConfigured]=useState(!!todo?.reminderAt);
  const originalTime = todo?.reminderAt ? new Date(todo.reminderAt) : null;
  const [alarmDay,setAlarmDay]=useState(originalTime?dateKey(originalTime):(todo?.dueDate??dueDate??dateKey(new Date())));
  const [alarmTime, setAlarmTime] = useState(originalTime ? `${String(originalTime.getHours()).padStart(2, '0')}:${String(originalTime.getMinutes()).padStart(2, '0')}` : '09:00');
  const [saving, setSaving] = useState(false),[activePicker,setActivePicker]=useState<string|null>(null);
  const [error, setError] = useState('');
  useEffect(()=>{onBusy?.(saving);},[saving,onBusy]);
  async function save() {
    setSaving(true); setError('');
    try {
      let reminderAt: string | null = null;
      if (alarm) { if (!alarmDay || !/^([01]\d|2[0-3]):[0-5]\d$/.test(alarmTime)) throw new Error('예정일과 알림 시간을 확인해주세요.'); reminderAt = todoReminderInstant(alarmDay,alarmTime,deviceZone(),todo?.reminderAt); if (Date.parse(reminderAt) <= Date.now() && reminderAt !== todo?.reminderAt) throw new Error('알림은 미래 시간으로 정해주세요.'); }
      const draft: Draft = validateDraft({ title, notes, dueDate: date,...(sourceTimeEditable?{dueTime:date?dueTime:null}:{}), reminderAt, category: todo?.category ?? '일상',...(!todo&&destination?{deliveryTarget:destination.target}:{}) });
      if(draft.notes&&(todo||!store.deviceCreatesEnabled))await store.prepareSave(draft);
      const ok = await store.beginSave(draft,todo?.id);
      if (ok) onClose(); else setError('저장하지 못했어요. 연결을 확인하고 다시 시도해주세요.');
    } catch (e) { setError(e instanceof Error ? e.message : '입력 내용을 확인해주세요.'); }
    finally { setSaving(false); }
  }
  const [shareStatus, setShareStatus] = useState('');
  async function shareTodo() {
    if (!todo) return;
    const message = `docen\n${todo.title}${todo.dueDate ? `\n예정일: ${todo.dueDate}` : ''}`;
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
  const delivery=todo?.delivery;
  const destinationControl=!todo?<TodoDestinationPicker store={store} value={destination} onChange={setDestination} disabled={saving}/>:
   delivery?.state==='blocked'?<Button title="선택한 목록에 다시 보내기" quiet disabled={saving}
    onPress={()=>void store.retryDelivery(todo.id).catch(e=>setError(e instanceof Error?e.message:'다시 보내지 못했어요.'))}/>:
   delivery?.state==='checking'?<Text style={s.muted}>선택한 목록에서 저장 결과를 확인해주세요.</Text>:
   delivery?.state==='queued'&&delivery.provider==='apple-reminders'?<Text style={s.muted}>아이폰 미리알림 전송 대기</Text>:null;
  const footer=<View style={{flexDirection:'row',alignItems:'center',gap:8}}>
    {!!todo&&<Pressable accessibilityRole="button" accessibilityLabel="할 일 삭제" disabled={saving} onPress={()=>void remove()} style={[s.more,{paddingHorizontal:8}]}><Text style={s.deleteText}>삭제</Text></Pressable>}
    <View style={{flex:1}}/>
    <Pressable accessibilityRole="button" accessibilityLabel="할 일 편집 취소" disabled={saving} onPress={onClose} style={[s.more,{paddingHorizontal:12}]}><Text style={s.subtitle}>취소</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="저장" accessibilityState={{busy:saving,disabled:saving||!title.trim()}} disabled={saving||!title.trim()} onPress={()=>void save()} style={[s.more,{paddingHorizontal:16,borderRadius:14,backgroundColor:colors.pale,opacity:(saving||!title.trim()) ? .4 : 1}]}><Text style={{...typography.body,color:colors.blueText,fontWeight:'600'}}>{saving?'저장 중…':'저장'}</Text></Pressable>
  </View>;
  if(inline)return <View testID="todo-inline-editor" style={{backgroundColor:colors.surface,borderRadius:20,padding:16,gap:8,marginVertical:6}}>
    <TextInput ref={titleRef} autoFocus={visible&&!todo} accessibilityLabel="할 일 제목" value={title} onChangeText={setTitle} maxLength={120} editable={!saving} placeholder="새 할 일" placeholderTextColor={colors.muted} onFocus={()=>{setActivePicker(null);focusInput(titleRef.current);}} style={[s.editorInput,{backgroundColor:'transparent',padding:0,minHeight:44}]}/>
    {destinationControl}
    <NotesField compact value={notes} onChange={setNotes} disabled={saving} onFocus={input=>{setActivePicker(null);focusInput(input);}} onResize={revealInput}/>
    <View style={{flexDirection:'row',alignItems:'center',gap:4,flexWrap:'wrap'}}>
     <Pressable accessibilityRole="button" accessibilityLabel="예정일 편집" accessibilityState={{expanded:tools==='date'}} disabled={saving} onPress={()=>{Keyboard.dismiss();setActivePicker(null);setTools(v=>v==='date'?null:'date');}} style={[s.more,{flexDirection:'row',gap:6,paddingHorizontal:8}]}><Ionicons name="calendar-outline" size={20} color={colors.blueText}/><Text style={s.subtitle}>{date?formatDueDate(date):'날짜 없음'}</Text></Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel="알림 편집" accessibilityState={{expanded:tools==='alarm'}} disabled={saving} onPress={()=>{Keyboard.dismiss();setActivePicker(null);setTools(v=>v==='alarm'?null:'alarm');}} style={s.more}><Ionicons name={alarm?'notifications':'notifications-outline'} size={21} color={alarm?colors.blueText:colors.muted}/></Pressable>
     {!!todo&&<Pressable accessibilityRole="button" accessibilityLabel="할 일 더보기" accessibilityState={{expanded:tools==='more'}} disabled={saving} onPress={()=>{Keyboard.dismiss();setActivePicker(null);setTools(v=>v==='more'?null:'more');}} style={s.more}><Ionicons name="ellipsis-horizontal" size={22} color={colors.muted}/></Pressable>}
    </View>
    {tools==='date'&&<><DateField value={date} onChange={setDate} disabled={saving} activePicker={activePicker} onPickerChange={setActivePicker}/>{sourceTimeEditable&&<DateTimeField label="예정 시간" inputLabel="예정 시간" mode="time" value={date?dueTime:null} onChange={setDueTime} disabled={saving||!date} clearable activePicker={activePicker} onPickerChange={setActivePicker}/>}</>}
    {tools==='alarm'&&<><View style={s.dateField}><Label>알림</Label><View style={{flex:1}}/><Switch accessibilityLabel="할 일 알림" value={alarm} disabled={saving} onValueChange={value=>{if(value&&!alarmConfigured){setAlarmDay(date??dateKey(new Date()));setAlarmConfigured(true);}setAlarm(value);}} trackColor={{true:colors.blue}}/></View>{alarm&&<><DateTimeField label="알림 날짜" value={alarmDay} onChange={v=>v&&setAlarmDay(v)} disabled={saving} activePicker={activePicker} onPickerChange={setActivePicker}/><DateTimeField label="알림 시간" mode="time" value={alarmTime} onChange={v=>v&&setAlarmTime(v)} disabled={saving} activePicker={activePicker} onPickerChange={setActivePicker}/></>}</>}
    {tools==='more'&&<><Button title="카카오톡 등으로 공유" quiet disabled={saving} onPress={()=>void shareTodo()}/>{!!shareStatus&&<Text accessibilityLiveRegion="polite" style={s.muted}>{shareStatus}</Text>}</>}
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!keyboard.occluding&&!activePicker&&footer}
  </View>;
  return <ScrollRevealContext.Provider value={field.show}><View ref={surface} onLayout={keyboardInset.measure} style={s.modalBackdrop}>
      <DraggableSheet testID="todo-editor-surface" visible={visible} presentation="none" style={[s.sheet,{height:'90%',maxHeight:'90%',paddingBottom:16,overflow:'hidden'}]} onDismiss={()=>{if(!saving)onClose();}} disabled={saving}><View style={s.sheetHeader}><Text style={s.sectionTitle}>{todo ? '할 일 수정' : '새로운 할 일'}</Text><View style={{flexDirection:'row',alignItems:'center'}}><KeyboardDismiss/><CloseButton disabled={saving} onPress={onClose}/></View></View><View style={{flex:1,minHeight:0,paddingBottom:Math.max(0,keyboardInset.inset-16)}}><ScrollView ref={scroll} onLayout={field.reveal} onContentSizeChange={field.reveal} onScroll={field.onScroll} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" testID="editor-scroll" style={{flex:1,minHeight:0}} automaticallyAdjustKeyboardInsets={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={{gap:layout.actionGap,paddingBottom:layout.sectionGap}}>
        <TextInput ref={titleRef} onFocus={()=>{setActivePicker(null);focusInput(titleRef.current);}} accessibilityLabel="할 일 제목" placeholder="어떤 일을 해볼까요?" value={title} onChangeText={setTitle} maxLength={120} editable={!saving} style={s.editorInput} />
        {destinationControl}
        <DateField value={date} onChange={setDate} disabled={saving} activePicker={activePicker} onPickerChange={setActivePicker}/>{sourceTimeEditable&&<DateTimeField label="예정 시간" inputLabel="예정 시간" mode="time" value={date?dueTime:null} onChange={setDueTime} disabled={saving||!date} clearable activePicker={activePicker} onPickerChange={setActivePicker}/>}<NotesField value={notes} onChange={setNotes} disabled={saving} onFocus={input=>{setActivePicker(null);focusInput(input);}} onResize={field.reveal}/>
        <View style={s.dateField}><Label>알림</Label><View style={{ flex: 1 }} /><Switch accessibilityLabel="할 일 알림" value={alarm} onValueChange={value=>{if(value&&!alarmConfigured){setAlarmDay(date??dateKey(new Date()));setAlarmConfigured(true);}setAlarm(value);}} disabled={saving} trackColor={{ true: colors.blue }} /></View>
        {alarm&&<View style={{gap:12,backgroundColor:colors.grouped,padding:12,borderRadius:18}}><DateTimeField activePicker={activePicker} onPickerChange={setActivePicker} label="알림 날짜" value={alarmDay} disabled={saving} onChange={value=>value&&setAlarmDay(value)}/><DateTimeField activePicker={activePicker} onPickerChange={setActivePicker} label="알림 시간" value={alarmTime} mode="time" disabled={saving} onChange={value=>value&&setAlarmTime(value)}/></View>}
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        {!!todo && <View><Button title="카카오톡 등으로 공유" quiet disabled={saving} onPress={() => { void shareTodo(); }} />{!!shareStatus && <Text accessibilityLiveRegion="polite" style={s.muted}>{shareStatus}</Text>}</View>}
      </ScrollView>{!keyboard.occluding&&!activePicker&&<View testID="todo-editor-save" style={{paddingTop:layout.actionGap,flexShrink:0}}>{footer}</View>}</View></DraggableSheet>
    </View></ScrollRevealContext.Provider>;
}
export const s = StyleSheet.create({
  page: { padding: spacing.xl, paddingTop: spacing.xxl, paddingBottom: 40, flexGrow: 1 },
  label: { ...typography.caption, color: colors.muted }, muted: { ...typography.caption, color: colors.muted },
  h1: { ...typography.heading, color: colors.text, marginBottom: spacing.md },
  subtitle: { ...typography.detail, color: colors.muted },
  sectionTitle: { ...typography.section, color: colors.text },
  button: { backgroundColor: colors.action, paddingHorizontal: 20, paddingVertical: 14, minHeight: 56, borderRadius: radius.button, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...typography.body, color: colors.white, fontWeight: '600', textAlign: 'center', flexShrink: 1 }, quietButton: { backgroundColor: colors.pale, minHeight: 48 },
  todoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, paddingVertical: 6, gap: spacing.md, minHeight: 60, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  selectedTodoRow: {backgroundColor:colors.todoSelection,borderRadius:14},
  swipeWrap: { overflow: 'hidden',borderRadius:14 }, swipeBack: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.pale, padding: 20 }, swipeBackText: { ...typography.detail, color: colors.blueText, fontWeight: '600' },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: colors.subtle, alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: colors.blue, borderColor: colors.blue }, checkText: { color: colors.white, fontSize: 18 },
  rowAccessory: {minWidth:32,minHeight:44,alignItems:'flex-end',justifyContent:'center'},
  todoProvenance: {flexDirection:'row',alignItems:'center',justifyContent:'flex-end',flexShrink:1,maxWidth:'33%',gap:5},
  desktopTodoDate: {fontSize:10,lineHeight:17},
  todoBody: { flex: 1, minWidth:0, minHeight: 44, justifyContent: 'center' }, todoTitle: { ...typography.list, color: colors.text }, doneText: { color: colors.subtle, textDecorationLine: 'line-through' }, todoDate: { ...typography.caption, color: colors.muted, marginTop: 2 }, pendingText: { ...typography.caption, color: colors.blueText, marginTop: 2 },
  more: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' }, moreText: { fontSize: 23, color: colors.muted }, restore: { ...typography.caption, color: colors.blueText },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, flexWrap: 'wrap' }, dateInput: { flex: 1, minHeight: 48, padding: spacing.md, borderRadius: radius.small, backgroundColor: colors.grouped, color: colors.text, ...typography.detail }, datePick: { flex: 1, minHeight: 44, padding: spacing.md, alignItems: 'flex-end', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' }, sheet: { maxHeight:'90%', backgroundColor: colors.sheet, padding: spacing.xl, paddingBottom: 38, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, width: '100%', maxWidth: 600, alignSelf: 'center' }, sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.xl },
  editorInput: { ...typography.body, color: colors.text, backgroundColor: colors.grouped, padding: spacing.lg, borderRadius: radius.button, minHeight: 60 }, error: { ...typography.caption, color: colors.danger, marginVertical: spacing.md }, deleteText: { ...typography.detail, color: colors.danger },
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 56, gap: spacing.md }, emptyText: { ...typography.detail, color: colors.muted, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.xl, marginTop: spacing.xl },
});

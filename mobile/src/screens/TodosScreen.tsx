import {TodoLiftPreview,TodoLiftScope} from '../todo-gestures';
import type {LiftPreviewProps} from '../todo-gesture-types';
import type {RowPoint} from '../todo-gesture-types';
import {useDesktopPresentation} from '../DesktopPresentation';
import {ScreenHeading} from '../ScreenHeading';
import {MotionPressable as Pressable,MotionView,ReorderItem,useReducedMotion} from '../motion';
import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Keyboard,Linking,Platform,RefreshControl,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {dateKey} from '../domain';
import type {Todo} from '../domain';
import type {TodoStore} from '../useTodos';
import {typography} from '../theme';
import {Button,colors,Page,PagePinned,TodoEditor,TodoRow} from '../ui';
import {useFocusedField,useKeyboardInset} from '../useFocusedField';
import {deviceZone,shiftDay} from '../calendar-model';
import {calendarStartLabel} from '../calendar-display';
import {useCalendarData} from '../useCalendarData';
import {useCalendarSelection} from '../useCalendarSelection';
import {upcomingTicketAgenda} from '../todo-agenda';
import {moveTodoIds,todoSource} from '../todo-organization';
import {safeCalendarLink} from '../calendar-model';
import {CalendarSheet} from '../CalendarSheet';
import {CalendarMonthPickerGrid} from '../CalendarMonthPickerGrid';
import {TodoSelectionToolbar,useTodoSelectionInset} from '../TodoSelectionToolbar';
type Editor={id:number;todo?:Todo;date:string|null};
type Target={key:string;before:string|null;day:string;group:string;y:number;height:number};
type Drag={ids:string[];todo:Todo;group:string;x:number;y:number;width:number;height:number;geometry:LiftPreviewProps['geometry']};
type DragSession={ids:string[];origin:RowPoint;pointer:RowPoint;grip:RowPoint;card:Drag|null;scrollStart:number;targets:Target[];measuredCount:number};
type TodosScreenProps={store:TodoStore;active?:boolean;scrollToTopRequest?:number};
export function TodosScreen(props:TodosScreenProps){
 return <TodoLiftScope><TodosContent {...props}/></TodoLiftScope>;
}
function TodosContent({store,active=true,scrollToTopRequest=0}:TodosScreenProps){
 const desktop=useDesktopPresentation();
 const toolbarInset=useTodoSelectionInset(),today=dateKey(new Date()),zone=deviceZone(),selection=useCalendarSelection(store);
 const [undatedOpen,setUndatedOpen]=useState(true),[pulling,setPulling]=useState(false);
 const reduced=useReducedMotion();
 const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null),focus=useFocusedField(scroll),surface=useRef<React.ComponentRef<typeof View>>(null),keyboardInset=useKeyboardInset(surface);
 const [editor,setEditor]=useState<Editor|null>(null),sequence=useRef(0);
 const [selecting,setSelecting]=useState(false),[selected,setSelected]=useState<string[]>([]),[batchBusy,setBatchBusy]=useState(false),[batchPanel,setBatchPanel]=useState<'date'|'delete'|null>(null),[batchMonth,setBatchMonth]=useState(today.slice(0,7)),[batchMessage,setBatchMessage]=useState('');
 const [drag,setDrag]=useState<Drag|null>(null),[hover,setHover]=useState<Target|null>(null),dragRef=useRef<DragSession|null>(null),hoverRef=useRef<Target|null>(null);
 const scrollY=useRef(0),pane=useRef({x:0,y:0,width:0,height:0}),scrollBox=useRef({y:0,height:0});
 const liftScale=useRef(new Animated.Value(1)).current;
 const liftPosition=useRef(new Animated.ValueXY()).current;
 const nodes=useRef(new Map<string,{node:React.ComponentRef<typeof View>;before:string|null;day:string;group:string}>()),rects=useRef(new Map<string,Target>());
 const owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo',ownerRef=useRef(owner);ownerRef.current=owner;
 const busy=batchBusy||store.busyIds.includes('order');
 function cancelDrag(){dragRef.current=null;hoverRef.current=null;setDrag(null);setHover(null);}
 useEffect(()=>{setEditor(null);setSelected([]);setSelecting(false);setBatchPanel(null);setBatchBusy(false);setBatchMessage('');setUndatedOpen(true);cancelDrag();},[owner]);
 useEffect(()=>{if(!active){cancelDrag();setBatchPanel(null);setEditor(null);}},[active]);
 const handledTop=useRef(0);
 useEffect(()=>{if(!scrollToTopRequest||handledTop.current===scrollToTopRequest)return;handledTop.current=scrollToTopRequest;if(active&&!editor&&!drag)scroll.current?.scrollTo({y:0,animated:!reduced});},[scrollToTopRequest,active]);
 useEffect(()=>{setSelected(old=>[...new Set(old.map(id=>store.findTodo(id)?.id??id))].filter(id=>store.visible.some(t=>t.id===id&&!t.done)));},[store.visible.map(t=>t.id+':'+t.done).join('|')]);
 useEffect(()=>{
  if(!selected.length&&!drag){setSelecting(false);setBatchPanel(null);}
 },[selected.length,drag]);
 const calendar=useCalendarData(store,{start:today,end:shiftDay(today,14),month:today.slice(0,7),timeZone:zone,selected:selection.ids,active,selectionReady:selection.ready});
 useEffect(()=>{if(active)store.refreshSources?.();},[active,store.refreshSources]);
 async function pull(){if(pulling)return;store.refreshSources?.();setPulling(true);try{await Promise.allSettled([store.refresh(),calendar.load()]);}finally{setPulling(false);}}
 const groups=upcomingTicketAgenda(store.visible,calendar.events,today,zone);
 function closeEditor(){Keyboard.dismiss();setEditor(null);}
 function edit(date:string|null,todo?:Todo){if(editor||busy)return;Keyboard.dismiss();setBatchMessage('');setEditor({id:++sequence.current,date,todo});}
 function select(id:string){setSelecting(true);setSelected(old=>old.includes(id)?old.filter(v=>v!==id):[...old,id]);}
 async function applyBatch(operation:(id:string)=>Promise<boolean>){
  if(!selected.length||busy)return;
  const captured=owner,failed:string[]=[];
  setBatchBusy(true);setBatchMessage('');
  try{
   for(const id of selected){
    if(ownerRef.current!==captured||!store.isCurrentSession())return;
    try{if(!await operation(id))failed.push(id);}catch{failed.push(id);}
   }
   if(ownerRef.current!==captured)return;
   setSelected(failed);setBatchPanel(null);setSelecting(!!failed.length);
   if(failed.length)setBatchMessage(`${failed.length}개를 처리하지 못했어요. 다시 시도해주세요.`);
  }finally{if(ownerRef.current===captured)setBatchBusy(false);}
 }
 async function openSource(todo:Todo){const captured=owner;try{const result=await store.featureRequest('/api/todos/'+encodeURIComponent(todo.id)+'/source-link') as {url:string};if(ownerRef.current!==captured)return;const url=safeCalendarLink(result.url);if(!url)throw Error('원본 링크를 확인하지 못했어요.');await Linking.openURL(url);}catch(e){if(ownerRef.current===captured)setBatchMessage(e instanceof Error?e.message:'원본 앱에서 이 Ticket을 확인해주세요.');}}
 async function drop(ids:string[],target:Target){
  if(busy||editor)return;const captured=owner;setBatchBusy(true);setBatchMessage('');const failed:string[]=[];
  try{
   for(const id of ids){if(ownerRef.current!==captured||!store.isCurrentSession())return;const t=store.findTodo(id),date=target.day||null;if(t&&(target.day||target.group==='undated')&&t.dueDate!==date){if(!await store.update(id,{dueDate:date}))failed.push(id);}}
   if(ownerRef.current!==captured||!store.isCurrentSession())return;
   const movable=ids.filter(id=>!failed.includes(id)),items=store.visible.filter(t=>!t.done),order=moveTodoIds(items,movable,target.before);
   const reordered=movable.length?await store.reorder(order):true;
   if(ownerRef.current!==captured)return;
   if(!reordered){setBatchMessage('순서를 저장하지 못했어요. 날짜 변경 결과는 항목에서 확인해주세요.');setSelected(ids);return;}
   setSelected(failed);setSelecting(!!failed.length);setBatchPanel(null);
   if(failed.length)setBatchMessage(`${failed.length}개는 옮기지 못했어요. 선택한 항목을 확인해주세요.`);
  }finally{if(ownerRef.current===captured)setBatchBusy(false);}
 }
 function selectForAccessibility(id:string){
  if(busy||editor||store.pending[id])return;
  setSelecting(true);
  setSelected(ids=>ids.includes(id)?ids:[...ids,id]);
 }
 function moveDrag(point:RowPoint){
  const session=dragRef.current;
  if(!session)return;
  session.pointer=point;
  const card=session.card;
  if(!card)return;
  const delta=scrollY.current-session.scrollStart;
  const moved=Math.hypot(point.x-session.origin.x,point.y-session.origin.y)>6||Math.abs(delta)>6;
  if(session.measuredCount!==rects.current.size){
   session.targets=[...rects.current.values()].filter(target=>!session.ids.includes(target.before??'')).sort((a,b)=>a.y-b.y);
   session.measuredCount=rects.current.size;
  }
  const candidates=session.targets;
  const priorIndex=candidates.findIndex(row=>row.key===hoverRef.current?.key);
  const mid=(row:Target)=>row.y-delta+row.height/2;
  const prior=priorIndex>=0&&point.y>=(priorIndex>0?mid(candidates[priorIndex-1])-7:-Infinity)
    &&(priorIndex===candidates.length-1||point.y<mid(candidates[priorIndex])+7)?candidates[priorIndex]:null;
  const target=moved?(prior??candidates.find(row=>point.y<mid(row))??candidates.at(-1)??null):null;
  if(hoverRef.current?.key!==target?.key){hoverRef.current=target;setHover(target);}
  if(Platform.OS==='web')liftPosition.setValue({
   x:Math.max(4,Math.min(pane.current.width-card.width-4,point.x-pane.current.x-session.grip.x)),
   y:Math.max(4,Math.min(pane.current.height-card.height-4,point.y-pane.current.y-session.grip.y)),
  });
 }
 function beginDrag(todo:Todo,group:string,point:RowPoint){
  if(dragRef.current||busy||editor||store.pending[todo.id]||store.busyIds.length||todo.done)return;
  const node=nodes.current.get(todo.id)?.node;
  if(!node||!surface.current)return;
  const ids=selected.includes(todo.id)?selected:[todo.id];

  Keyboard.dismiss();setBatchPanel(null);
  const session:DragSession={ids,origin:point,pointer:point,grip:{x:0,y:0},card:null,scrollStart:scrollY.current,targets:[],measuredCount:0};
  dragRef.current=session;hoverRef.current=null;rects.current.clear();
  surface.current.measureInWindow((x,y,width,height)=>{
   if(dragRef.current!==session)return;
   pane.current={x,y,width,height};
   node.measureInWindow((rx,ry,rw,rh)=>{
    if(dragRef.current!==session||rw<=0||rh<=0)return;
    session.grip={x:point.x-rx,y:point.y-ry};
    session.card={ids,todo,group,x:rx-x,y:ry-y,width:rw,height:rh,geometry:{x:x+session.grip.x,y:y+session.grip.y,maxX:width-rw-4,maxY:height-rh-4,initial:point}};
    if(Platform.OS==='web')liftPosition.setValue({x:session.card.x,y:session.card.y});
    setDrag(session.card);
    liftScale.stopAnimation();
    liftScale.setValue(1);
    if(!reduced&&Platform.OS==='web')Animated.timing(liftScale,{toValue:1.035,duration:115,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();
    moveDrag(session.pointer);
   });
  });
  scroll.current?.measureInWindow((_x,y,_w,height)=>{if(dragRef.current===session)scrollBox.current={y,height};});
  for(const [key,target]of nodes.current){
   target.node.measureInWindow((_x,y,_width,height)=>{
    if(dragRef.current===session)rects.current.set(key,{key,before:target.before,day:target.day,group:target.group,y,height});
   });
  }
 }
 function finishDrag(completed:boolean){
  const session=dragRef.current,target=hoverRef.current;
  cancelDrag();
  if(completed&&session&&target)void drop(session.ids,target);
 }
 const live=useRef(moveDrag);live.current=moveDrag;
 useEffect(()=>{
  if(!drag)return;
  const timer=setInterval(()=>{
   const session=dragRef.current;
   if(!session||!scrollBox.current.height)return;
   if(Math.hypot(session.pointer.x-session.origin.x,session.pointer.y-session.origin.y)<=6)return;
   const {y}=session.pointer,top=scrollBox.current.y+40,bottom=scrollBox.current.y+scrollBox.current.height-40;
   const amount=y<top?-12:y>bottom?12:0;
   if(amount){scroll.current?.scrollTo({y:Math.max(0,scrollY.current+amount),animated:false});live.current(session.pointer);}
  },50);
  return()=>clearInterval(timer);
 },[!!drag]);
 function previewShift(id:string){
  if(!drag||!hover||drag.ids.length!==1||hover.group!==drag.group)return 0;
  const origin=rects.current.get(drag.todo.id);
  const row=rects.current.get(id);
  if(!origin||!row||row.group!==origin.group)return 0;
  if(hover.y>origin.y&&row.y>origin.y&&row.y<hover.y)return -origin.height;
  if(hover.y<origin.y&&row.y>=hover.y&&row.y<origin.y)return origin.height;
  return 0;
 }
 function register(key:string,node:React.ComponentRef<typeof View>|null,before:string|null,day:string,group:string){if(node)nodes.current.set(key,{node,before,day,group});else nodes.current.delete(key);}
 const selectedDates=new Set(selected.map(id=>store.findTodo(id)?.dueDate??null));
 return <View ref={surface} collapsable={false} onLayout={keyboardInset.measure} style={{flex:1,minHeight:0}}><View onLayout={focus.reveal} style={{flex:1,minHeight:0,marginBottom:keyboardInset.inset}}>
 <Page todoGestures testID="todos-list-scroll" scrollRef={scroll} scrollEnabled={!drag} bottomSpace={selecting?112:0} onScroll={e=>{scrollY.current=e.nativeEvent.contentOffset.y;focus.onScroll(e);}} compact refreshControl={<RefreshControl refreshing={pulling} onRefresh={()=>void pull()} enabled={!drag} tintColor={colors.blue}/>}>
  <ScreenHeading embedded title="Ticket">{selecting&&!drag&&<Pressable accessibilityRole="button" accessibilityLabel="Ticket 선택 마치기" disabled={busy} onPress={()=>{cancelDrag();setSelecting(false);setSelected([]);setBatchPanel(null);}} style={styles.headingAction}><Text style={styles.count}>완료</Text></Pressable>}</ScreenHeading>
  <PagePinned testID="todos-pinned-controls"><View style={[styles.viewBar,{justifyContent:'flex-end'}]}>{!selecting&&<Pressable accessibilityRole="button" accessibilityLabel="Ticket 추가" disabled={!!editor} onPress={()=>edit(today)} style={styles.add}><Ionicons name="add" size={19} color={colors.blueText}/><Text style={styles.addText}>Ticket 추가</Text></Pressable>}</View></PagePinned>
  {!store.visible.length&&!calendar.events.length&&<Text style={styles.hint}>필요한 일을 하나씩 적어보세요.</Text>}
  {groups.map(group=>{
   const undated=group.key==='undated',expanded=!undated||undatedOpen;
   return <View key={group.key} testID={'agenda-'+group.key} style={styles.group}>
    {undated?<Pressable accessibilityRole="button" accessibilityLabel="날짜 없음" accessibilityState={{expanded}} onPress={()=>setUndatedOpen(current=>!current)} style={styles.heading}>
     <Ionicons name="list-outline" size={27} color={colors.muted}/><Text style={styles.day}>{group.title}</Text><Text style={styles.hint}>{group.todos.length}</Text><View style={styles.line}/><Ionicons name={expanded?'chevron-up':'chevron-down'} size={18} color={colors.secondary}/>
    </Pressable>:<View style={styles.heading}>{group.day?<Text style={[styles.number,desktop&&{fontSize:27,lineHeight:35}]}>{Number(group.day.slice(8))}</Text>:group.key==='overdue'?<Ionicons name="alert-circle-outline" size={27} color={colors.muted}/>:null}<Text style={[styles.day,group.key==='overdue'&&{color:colors.danger}]}>{group.day&&group.day.slice(0,7)!==today.slice(0,7)?Number(group.day.slice(5,7))+'월 · ':''}{group.title}</Text><View style={styles.line}/></View>}
   {expanded&&<>
   {!!group.events.length&&<View style={styles.events}>{group.events.map(event=><View key={event.id} style={styles.event}><Text numberOfLines={1} style={styles.time}>{event.allDay?'종일':calendarStartLabel(event,group.day||event.dueDate||today,zone)}</Text><Text numberOfLines={2} style={styles.eventTitle}>{event.title}</Text></View>)}</View>}
   {group.todos.map(todo=><ReorderItem previewing={!!drag} previewShift={previewShift(todo.id)} key={todo.id} collapsable={false} ref={node=>register(todo.id,node,todo.id,group.day||todo.dueDate||'',group.key)} style={drag?.ids.includes(todo.id)&&{opacity:0}}>
    {hover?.key===todo.id&&<View pointerEvents="none" testID="todo-drop-line" style={styles.dropLine}/>}
    <TodoRow compact todo={todo} selected={selecting?selected.includes(todo.id):undefined} onSelect={()=>select(todo.id)} onLift={store.pending[todo.id]||todo.done?undefined:point=>beginDrag(todo,group.key,point)}
      onDrag={moveDrag} onDrop={finishDrag} onSelectAccessible={()=>selectForAccessibility(todo.id)} onOpenSource={todo.source&&['google','slack','notion'].includes(todo.source.provider)&&store.connection?.mode==='cloud'?()=>void openSource(todo):undefined} pending={!!store.pending[todo.id]} pendingUntil={store.pending[todo.id]} busy={busy||!!editor||store.busyIds.includes(todo.id)} canToggleWhileBusy={!busy&&!editor&&store.completionIds.includes(todo.id)} canSelectWhileBusy={!busy&&!editor&&store.completionIds.includes(todo.id)} onToggle={()=>void store.update(todo.id,{done:!todo.done})} onEdit={()=>edit(todo.dueDate,todo)}/>
   </ReorderItem>)}
   <View collapsable={false} ref={node=>register('end:'+group.key,node,null,group.day,group.key)} style={[styles.dropEnd,!!group.day&&{minHeight:44}]}>
    {hover?.key==='end:'+group.key&&<View pointerEvents="none" testID="todo-drop-line" style={styles.dropLine}/>}
    {group.day&&!selecting?<Pressable accessibilityRole="button" accessibilityLabel={group.day+' 새 Ticket 추가'} disabled={!!editor} onPress={()=>edit(group.day)} style={styles.inlineAdd}><Ionicons name="add" size={18} color={colors.blueText}/><Text style={styles.addText}>Ticket 추가</Text></Pressable>:null}</View>
   </>}
  </View>;})}
  {calendar.phase==='error'&&<View style={styles.refresh}><Text style={styles.hint}>Event를 새로 확인하지 못했어요. 저장된 내용은 유지해요.</Text><Pressable accessibilityRole="button" accessibilityLabel="Ticket 화면 Event 다시 확인" onPress={()=>void calendar.load()} style={styles.headingAction}><Text style={{color:colors.blueText}}>다시 확인</Text></Pressable></View>}
  {!!Object.keys(calendar.cursors).length&&<Pressable accessibilityRole="button" accessibilityLabel="Event 더 불러오기" onPress={()=>void calendar.load(true)} style={styles.inlineAdd}><Text style={{color:colors.blueText}}>Event 더 불러오기</Text></Pressable>}
 </Page>
 {active&&editor&&<TodoEditor key={editor.id} todo={editor.todo} dueDate={editor.date} store={store} onClose={closeEditor}/>}
 {!!batchMessage&&!drag&&<View pointerEvents="none" style={[styles.batchNotice,{bottom:toolbarInset+(selecting?100:12)}]}><Text accessibilityLiveRegion="polite" style={styles.hint}>{batchMessage}</Text></View>}
 {selecting&&!drag&&<TodoSelectionToolbar count={selected.length} inset={toolbarInset} busy={!selected.length||busy||!!batchPanel} testID="todo-selection-toolbar" actions={[
  {icon:'calendar-outline',label:'날짜 변경',description:'선택한 Ticket 예정일 변경',onPress:()=>{setBatchMonth((store.findTodo(selected[0])?.dueDate??today).slice(0,7));setBatchPanel('date');}},
  {icon:'trash-outline',label:'삭제',description:'선택한 Ticket 삭제',destructive:true,onPress:()=>setBatchPanel('delete')},
 ]}/>}
 {!!batchPanel&&active&&<CalendarSheet centered bottomInset={toolbarInset} closeInCalendarSlot title={batchPanel==='date'?'날짜 변경':'Ticket 삭제'} onClose={()=>setBatchPanel(null)} busy={busy}>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.batchPanel}>
   {batchPanel==='date'&&<>
    <View style={styles.batchActions}><Button title="오늘" quiet disabled={busy} onPress={()=>void applyBatch(id=>store.update(id,{dueDate:today}))}/><Button title="내일" quiet disabled={busy} onPress={()=>void applyBatch(id=>store.update(id,{dueDate:shiftDay(today,1)}))}/></View>
    <CalendarMonthPickerGrid month={batchMonth} onMonth={setBatchMonth} today={today} selected={selectedDates} disabled={busy} onDay={day=>void applyBatch(id=>store.update(id,{dueDate:day}))}/>
    <Button title="날짜 없음" quiet disabled={busy} onPress={()=>void applyBatch(id=>store.update(id,{dueDate:null}))}/>
   </>}
   {batchPanel==='delete'&&<>
    <Text style={styles.monthLabel}>선택한 Ticket {selected.length}개를 도슨에서 삭제할까요?</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="도슨에서 선택한 Ticket 삭제 확인" disabled={busy} onPress={()=>void applyBatch(store.remove)} style={styles.confirmDelete}><Text style={[styles.addText,styles.destructive]}>삭제</Text></Pressable>
   </>}
  </ScrollView>
 </CalendarSheet>}
 {drag&&<TodoLiftPreview geometry={drag.geometry} fallbackPosition={liftPosition} fallbackScale={liftScale} reduced={reduced}
   style={[styles.dragPreview,{top:0,left:0,width:drag.width,minHeight:drag.height},selected.includes(drag.todo.id)&&{backgroundColor:colors.todoSelection}]}>
   <View style={styles.dragCheckbox}/>
   <View style={styles.dragBody}>
    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.dragTitle}>{drag.todo.title}</Text>
    <View style={styles.dragMeta}>
     <Text numberOfLines={1} style={styles.hint}>{drag.todo.dueDate?.slice(5).replace('-',' / ')}</Text>
     <Text numberOfLines={1} style={styles.hint}>{drag.todo.source?todoSource(drag.todo).label:null}</Text>
    </View>
   </View>
   {drag.ids.length>1&&<Text style={styles.dragCount}>{drag.ids.length}</Text>}
 </TodoLiftPreview>}
 </View></View>;
}
const styles=StyleSheet.create({headingAction:{minHeight:44,minWidth:44,justifyContent:'center',alignItems:'center'},count:{...typography.detail,color:colors.blueText,fontWeight:'600'},hint:{...typography.caption,color:colors.muted},viewBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:4},group:{marginTop:20,marginBottom:4},heading:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:10,minHeight:44},number:{fontSize:34,lineHeight:42,fontWeight:'700',letterSpacing:-1,color:colors.text,minWidth:38},day:{fontSize:17,lineHeight:25,fontWeight:'600',color:colors.muted},line:{height:StyleSheet.hairlineWidth,backgroundColor:colors.line,flex:1,marginLeft:6},events:{gap:1,marginBottom:8},event:{flexDirection:'row',gap:8,minHeight:24},time:{fontSize:15,lineHeight:24,color:colors.blueText,minWidth:47},eventTitle:{fontSize:16,lineHeight:24,color:colors.secondary,flex:1},inlineAdd:{flexDirection:'row',alignItems:'center',gap:6,minHeight:44,paddingVertical:6},refresh:{gap:4,marginVertical:8},add:{flexDirection:'row',alignItems:'center',gap:3,minHeight:44,paddingVertical:8},addText:{...typography.detail,color:colors.blueText,fontWeight:'600'},batchActions:{flexDirection:'row',gap:4,flexWrap:'wrap'},batchPanel:{gap:8},monthLabel:{...typography.detail,color:colors.text,fontWeight:'600'},destructive:{color:colors.danger},confirmDelete:{minHeight:48,alignItems:'center',justifyContent:'center',backgroundColor:colors.grouped,borderRadius:14},dropLine:{position:'absolute',top:0,left:0,right:0,height:2,backgroundColor:colors.blueText,zIndex:1},batchNotice:{position:'absolute',alignSelf:'center',maxWidth:'88%',paddingHorizontal:12,paddingVertical:8,borderRadius:12,backgroundColor:colors.surface,zIndex:12},dropEnd:{minHeight:12},dragPreview:{position:'absolute',paddingHorizontal:10,paddingVertical:6,borderRadius:11,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',gap:10,shadowColor:'#101828',shadowOpacity:.19,shadowRadius:13,shadowOffset:{width:0,height:6},elevation:9,zIndex:20},dragCheckbox:{width:24,height:24,borderRadius:7,borderWidth:1.5,borderColor:colors.subtle},dragBody:{flex:1,minWidth:0},dragMeta:{flexDirection:'row',gap:8,justifyContent:'space-between'},dragTitle:{...typography.list,color:colors.text},dragCount:{...typography.caption,color:colors.blueText,padding:5}});

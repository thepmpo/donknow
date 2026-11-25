import type {RowPoint} from '../todo-gesture-types';
import {useDesktopPresentation} from '../DesktopPresentation';
import {ScreenHeading} from '../ScreenHeading';
import {MotionPressable as Pressable,ReorderItem,useReducedMotion} from '../motion';
import React,{useEffect,useRef,useState} from 'react';
import {Animated,Keyboard,Linking,Platform,RefreshControl,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {dateKey} from '../domain';
import type {Todo} from '../domain';
import type {TodoStore} from '../useTodos';
import {typography,layout} from '../theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useDuoTrailingNavigation} from '../DuoLayout';
import {Button,colors,Page,PagePinned,TodoEditorForm,TodoRow,DateField} from '../ui';
import {ScrollRevealContext,ScrollRevealRegion,useFocusedField,useKeyboardInset} from '../useFocusedField';
import {useDuoBackAction} from '../DuoBackNavigation';
import {deviceZone,shiftDay} from '../calendar-model';
import {calendarStartLabel} from '../calendar-display';
import {useCalendarData} from '../useCalendarData';
import {useCalendarSelection} from '../useCalendarSelection';
import {todoAgenda} from '../todo-agenda';
import {compareTodoOrder,moveTodoIds,sourceAgenda,todoSource} from '../todo-organization';
import type {TodoView} from '../todo-organization';
import {safeCalendarLink} from '../calendar-model';
type Editor={id:number;todo?:Todo;date:string|null;group:string};
type Target={key:string;before:string|null;day:string;group:string;y:number;height:number};
type Drag={ids:string[];todo:Todo;group:string;x:number;y:number;width:number;height:number};
type DragSession={ids:string[];origin:RowPoint;pointer:RowPoint;grip:RowPoint;card:Drag|null;scrollStart:number};
function EditorBack({onClose,busy}:{onClose:()=>void;busy:boolean}){useDuoBackAction(onClose,busy,'close');return null;}
export function TodosScreen({store,active=true,scrollToTopRequest=0}:{store:TodoStore;active?:boolean;scrollToTopRequest?:number}){
 const desktop=useDesktopPresentation();
 const insets=useSafeAreaInsets(),duo=useDuoTrailingNavigation(),today=dateKey(new Date()),zone=deviceZone(),selection=useCalendarSelection(store);
 const [view,setView]=useState<TodoView>('date'),[pulling,setPulling]=useState(false);
 const reduced=useReducedMotion();
 const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null),focus=useFocusedField(scroll),surface=useRef<React.ComponentRef<typeof View>>(null),keyboardInset=useKeyboardInset(surface);
 const [editor,setEditor]=useState<Editor|null>(null),sequence=useRef(0),[editingBusy,setEditingBusy]=useState(false);
 const [selecting,setSelecting]=useState(false),[selected,setSelected]=useState<string[]>([]),[batchBusy,setBatchBusy]=useState(false),[batchMode,setBatchMode]=useState(false),[moveMenu,setMoveMenu]=useState(false),[batchDate,setBatchDate]=useState<string|null>(today),[batchPicker,setBatchPicker]=useState<string|null>(null),[batchMessage,setBatchMessage]=useState('');
 const [drag,setDrag]=useState<Drag|null>(null),[hover,setHover]=useState<Target|null>(null),dragRef=useRef<DragSession|null>(null),hoverRef=useRef<Target|null>(null);
 const scrollY=useRef(0),pane=useRef({x:0,y:0,width:0,height:0}),scrollBox=useRef({y:0,height:0});
 const liftScale=useRef(new Animated.Value(1)).current;
 const liftPosition=useRef(new Animated.ValueXY()).current;
 const nodes=useRef(new Map<string,{node:React.ComponentRef<typeof View>;before:string|null;day:string;group:string}>()),rects=useRef<Target[]>([]);
 const owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo',ownerRef=useRef(owner);ownerRef.current=owner;
 const busy=batchBusy||editingBusy||store.busyIds.includes('order');
 function cancelDrag(){dragRef.current=null;hoverRef.current=null;setDrag(null);setHover(null);}
 useEffect(()=>{setEditor(null);setSelected([]);setSelecting(false);setBatchMode(false);setMoveMenu(false);setBatchBusy(false);setEditingBusy(false);setBatchMessage('');setView('date');cancelDrag();},[owner]);
 useEffect(()=>{if(!active)cancelDrag();},[active]);
 const handledTop=useRef(0);
 useEffect(()=>{if(!scrollToTopRequest||handledTop.current===scrollToTopRequest)return;handledTop.current=scrollToTopRequest;if(active&&!editor&&!drag)scroll.current?.scrollTo({y:0,animated:!reduced});},[scrollToTopRequest,active]);
 useEffect(()=>{setSelected(old=>old.filter(id=>store.visible.some(t=>t.id===id&&!t.done)));},[store.visible.map(t=>t.id+':'+t.done).join('|')]);
 useEffect(()=>{
  if(!selected.length&&!drag){setSelecting(false);setBatchMode(false);setMoveMenu(false);}
 },[selected.length,drag]);
 const calendar=useCalendarData(store,{start:today,end:shiftDay(today,14),month:today.slice(0,7),timeZone:zone,selected:selection.ids,active:active&&view==='date',selectionReady:selection.ready});
 async function pull(){if(pulling)return;setPulling(true);try{await Promise.allSettled([store.refresh(),...(view==='date'?[calendar.load()]:[])]);}finally{setPulling(false);}}
 const stableTodos=editor?.todo?store.visible.map(t=>t.id===editor.todo!.id?editor.todo!:t):[...store.visible];
 if(editor?.todo&&!stableTodos.some(t=>t.id===editor.todo!.id))stableTodos.push(editor.todo);
 const draft:Todo={id:'inline-draft',title:'',done:false,dueDate:editor?.date??null,category:'일상'};
 const input=editor&&!editor.todo?[...stableTodos,draft]:stableTodos;
 const groups=(view==='date'?todoAgenda(input,calendar.events,today,zone):sourceAgenda(input)).map(g=>({...g,todos:g.todos.filter(t=>t.id!=='inline-draft')}));
 function closeEditor(){Keyboard.dismiss();focus.show(null);setEditingBusy(false);setEditor(null);}
 function edit(group:string,date:string|null,todo?:Todo){if(editor||busy)return;if(todo)Keyboard.dismiss();setBatchMessage('');setEditor({id:++sequence.current,group,date,todo});}
 function select(id:string){setSelecting(true);setSelected(old=>old.includes(id)?old.filter(v=>v!==id):[...old,id]);}
 async function applyBatch(patch:{done?:boolean;dueDate?:string|null}){
  if(!selected.length||batchBusy)return;const captured=owner;setBatchBusy(true);setBatchMessage('');const failed:string[]=[];let sourcePending=0;
  try{for(const id of selected){if(ownerRef.current!==captured||!store.isCurrentSession())return;try{if(!await store.update(id,patch))failed.push(id);else if(patch.dueDate!==undefined&&store.findTodo(id)?.sourceSync&&store.findTodo(id)?.sourceSync?.state!=='succeeded')sourcePending++;}catch{failed.push(id);}}if(ownerRef.current!==captured)return;setSelected(failed);setBatchMode(false);setMoveMenu(false);setBatchPicker(null);setBatchMessage(failed.length?`${failed.length}개를 저장하지 못했어요. 선택한 항목을 다시 확인해주세요.`:sourcePending?`docen에 반영했어요. ${sourcePending}개는 원본 저장을 확인해주세요.`:'선택한 할 일을 반영했어요.');if(!failed.length)setSelecting(false);}finally{if(ownerRef.current===captured)setBatchBusy(false);}
 }
 async function openSource(todo:Todo){const captured=owner;try{const result=await store.featureRequest('/api/todos/'+encodeURIComponent(todo.id)+'/source-link') as {url:string};if(ownerRef.current!==captured)return;const url=safeCalendarLink(result.url);if(!url)throw Error('원본 링크를 확인하지 못했어요.');await Linking.openURL(url);}catch(e){if(ownerRef.current===captured)setBatchMessage(e instanceof Error?e.message:'원본 앱에서 이 할 일을 확인해주세요.');}}
 async function drop(ids:string[],target:Target,reorderOnly=false){
  if(busy||editor)return;const captured=owner;setBatchBusy(true);setBatchMessage('');const failed:string[]=[];let sourcePending=0;
  try{
   if(view==='date'&&!reorderOnly)for(const id of ids){if(ownerRef.current!==captured||!store.isCurrentSession())return;const t=store.findTodo(id),date=target.day||null;if(t&&target.group!=='overdue'&&t.dueDate!==date){if(!await store.update(id,{dueDate:date}))failed.push(id);else if(store.findTodo(id)?.sourceSync&&store.findTodo(id)?.sourceSync?.state!=='succeeded')sourcePending++;}}
   if(ownerRef.current!==captured||!store.isCurrentSession())return;
   const movable=ids.filter(id=>!failed.includes(id)),items=store.visible.filter(t=>!t.done),order=moveTodoIds(items,movable,target.before);
   const reordered=movable.length?await store.reorder(order):true;
   if(ownerRef.current!==captured)return;
   if(!reordered){setBatchMessage('순서를 저장하지 못했어요. 날짜 변경 결과는 항목에서 확인해주세요.');setSelected(ids);return;}
   setSelected(failed);setSelecting(!!failed.length);setMoveMenu(false);
   setBatchMessage(failed.length?`${failed.length}개는 옮기지 못했어요. 선택한 항목을 확인해주세요.`:sourcePending?`옮겼어요. ${sourcePending}개는 원본 저장 확인이 필요해요.`:'할 일을 옮겼어요.');
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
  const candidates=rects.current.filter(target=>!session.ids.includes(target.before??'')&&(view==='date'||target.group===card.group)).sort((a,b)=>a.y-b.y);
  const target=moved?(candidates.find(row=>point.y<row.y-delta+row.height/2)??candidates.at(-1)??null):null;
  hoverRef.current=target;
  setHover(previous=>previous?.key===target?.key?previous:target);
  liftPosition.setValue({
   x:Math.max(4,Math.min(pane.current.width-card.width-4,point.x-pane.current.x-session.grip.x)),
   y:Math.max(4,Math.min(pane.current.height-card.height-4,point.y-pane.current.y-session.grip.y)),
  });
 }
 function beginDrag(todo:Todo,group:string,point:RowPoint){
  if(dragRef.current||busy||editor||store.pending[todo.id]||store.busyIds.length||todo.done)return;
  const node=nodes.current.get(todo.id)?.node;
  if(!node||!surface.current)return;
  const ids=selected.includes(todo.id)?selected:[todo.id];
  if(view==='source'&&ids.some(id=>{const item=store.findTodo(id);return !item||todoSource(item).key!==todoSource(todo).key;})){
   setBatchMessage('같은 출처의 할 일을 선택해 옮겨주세요.');return;
  }
  Keyboard.dismiss();setMoveMenu(false);setBatchMode(false);setBatchPicker(null);
  const session:DragSession={ids,origin:point,pointer:point,grip:{x:0,y:0},card:null,scrollStart:scrollY.current};
  dragRef.current=session;hoverRef.current=null;rects.current=[];
  surface.current.measureInWindow((x,y,width,height)=>{
   if(dragRef.current!==session)return;
   pane.current={x,y,width,height};
   node.measureInWindow((rx,ry,rw,rh)=>{
    if(dragRef.current!==session||rw<=0||rh<=0)return;
    session.grip={x:point.x-rx,y:point.y-ry};
    session.card={ids,todo,group,x:rx-x,y:ry-y,width:rw,height:rh};
    liftPosition.setValue({x:session.card.x,y:session.card.y});
    setDrag(session.card);
    liftScale.stopAnimation();
    liftScale.setValue(1);
    if(!reduced)Animated.spring(liftScale,{toValue:1.045,stiffness:360,damping:24,mass:.7,useNativeDriver:Platform.OS!=='web'}).start();
    moveDrag(session.pointer);
   });
  });
  scroll.current?.measureInWindow((_x,y,_w,height)=>{if(dragRef.current===session)scrollBox.current={y,height};});
  for(const [key,target]of nodes.current){
   target.node.measureInWindow((_x,y,_width,height)=>{
    if(dragRef.current===session)rects.current.push({key,before:target.before,day:target.day,group:target.group,y,height});
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
  const origin=rects.current.find(row=>row.key===drag.todo.id);
  const row=rects.current.find(item=>item.key===id);
  if(!origin||!row||row.group!==origin.group)return 0;
  if(hover.y>origin.y&&row.y>origin.y&&row.y<hover.y)return -origin.height;
  if(hover.y<origin.y&&row.y>=hover.y&&row.y<origin.y)return origin.height;
  return 0;
 }
 function register(key:string,node:React.ComponentRef<typeof View>|null,before:string|null,day:string,group:string){if(node)nodes.current.set(key,{node,before,day,group});else nodes.current.delete(key);}
 async function step(direction:-1|1){const first=selected[0],group=groups.find(g=>g.todos.some(t=>t.id===first));if(!group)return;const picked=new Set(selected),rest=group.todos.filter(t=>!picked.has(t.id)),ordered=group.todos;const at=ordered.findIndex(t=>t.id===first),next=direction<0?[...ordered.slice(0,at)].reverse().find(t=>!picked.has(t.id)):ordered.slice(at+1).find(t=>!picked.has(t.id));if(!next)return;const before=direction<0?next.id:rest[rest.findIndex(t=>t.id===next.id)+1]?.id??null;await drop(selected,{key:'step',before,day:store.findTodo(first)?.dueDate??'',group:group.key,y:0,height:0},true);}
 const inline=(group:string)=>editor?.group===group?<ScrollRevealRegion key={editor.id} testID="todo-inline-region">{active&&<EditorBack onClose={closeEditor} busy={editingBusy}/>}<TodoEditorForm presentation="inline" todo={editor.todo} dueDate={editor.date} store={store} onClose={closeEditor} onBusy={setEditingBusy}/></ScrollRevealRegion>:null;
 return <ScrollRevealContext.Provider value={focus.show}><View ref={surface} collapsable={false} onLayout={keyboardInset.measure} style={{flex:1,minHeight:0}}><View onLayout={focus.reveal} style={{flex:1,minHeight:0,marginBottom:keyboardInset.inset}}>
 <Page todoGestures testID="todos-list-scroll" scrollRef={scroll} scrollEnabled={!drag} bottomSpace={selecting?112:0} onScroll={e=>{scrollY.current=e.nativeEvent.contentOffset.y;focus.onScroll(e);}} compact refreshControl={<RefreshControl refreshing={pulling} onRefresh={()=>void pull()} enabled={!drag} tintColor={colors.blue}/>}>
  <ScreenHeading embedded title="할 일">{selecting&&!drag&&<Pressable accessibilityRole="button" accessibilityLabel="할 일 선택 마치기" disabled={busy} onPress={()=>{cancelDrag();setSelecting(false);setSelected([]);setBatchMode(false);setMoveMenu(false);}} style={styles.headingAction}><Text style={styles.count}>완료</Text></Pressable>}</ScreenHeading>
  <PagePinned testID="todos-pinned-controls"><View style={styles.viewBar}><View accessibilityRole="tablist" style={styles.tabs}>{(['date','source'] as const).map(mode=><Pressable key={mode} testID={'todos-view-'+mode} accessibilityRole="tab" accessibilityLabel={mode==='date'?'날짜별 할 일':'출처별 할 일'} accessibilityState={{selected:view===mode,disabled:!!editor||busy||!!drag}} disabled={!!editor||busy||!!drag} onPress={()=>{setView(mode);setMoveMenu(false);setBatchMessage('');}} style={[styles.viewTab,view===mode&&styles.activeTab]}><Text style={[styles.tabText,view===mode&&{color:colors.blueText}]}>{mode==='date'?'날짜별':'출처별'}</Text></Pressable>)}</View>{!selecting&&<Pressable accessibilityRole="button" accessibilityLabel="할 일 추가" disabled={!!editor} onPress={()=>edit(view==='date'?today:'source:local',today)} style={styles.add}><Ionicons name="add" size={19} color={colors.blueText}/><Text style={styles.addText}>할 일 추가</Text></Pressable>}</View></PagePinned>
  {!store.visible.length&&!calendar.events.length&&<Text style={styles.hint}>필요한 일을 하나씩 적어보세요.</Text>}
  {!!batchMessage&&<Text accessibilityLiveRegion="polite" style={styles.hint}>{batchMessage}</Text>}
  {selecting&&moveMenu&&<ScrollRevealRegion testID="todo-move-menu"><View style={styles.movePanel}><Text style={styles.hint}>출처는 유지하고 순서만 바꿔요.</Text><Button title="선택한 할 일 위로 이동" quiet disabled={busy} onPress={()=>void step(-1)}/><Button title="선택한 할 일 아래로 이동" quiet disabled={busy} onPress={()=>void step(1)}/></View></ScrollRevealRegion>}
  {selecting&&batchMode&&<ScrollRevealRegion testID="todo-batch-date"><View style={styles.movePanel}><DateField value={batchDate} onChange={setBatchDate} disabled={busy} activePicker={batchPicker} onPickerChange={setBatchPicker}/>{!batchPicker&&<Button title="선택한 할 일 예정일 저장" loading={batchBusy} disabled={!selected.length||busy} onPress={()=>void applyBatch({dueDate:batchDate})}/>}<Button title="예정일 변경 취소" quiet disabled={busy} onPress={()=>{setBatchMode(false);setBatchPicker(null);}}/></View></ScrollRevealRegion>}
  {groups.map(group=><View key={group.key} testID={'agenda-'+group.key} style={styles.group}>
   <View style={styles.heading}>{view==='source'?<Ionicons name={todoSource(group.todos[0]??draft).icon} size={28} color={todoSource(group.todos[0]??draft).color}/>:group.day?<Text style={[styles.number,desktop&&{fontSize:27,lineHeight:35}]}>{Number(group.day.slice(8))}</Text>:<Ionicons name={group.key==='overdue'?'alert-circle-outline':'list-outline'} size={27} color={colors.muted}/>}<Text style={[styles.day,desktop&&{fontSize:13,lineHeight:22},view==='source'&&styles.sourceTitle,group.key==='overdue'&&{color:colors.danger}]}>{group.day&&group.day.slice(0,7)!==today.slice(0,7)?Number(group.day.slice(5,7))+'월 · ':''}{group.title}</Text><View style={styles.line}/></View>
   {!!group.events.length&&<View style={styles.events}>{group.events.map(event=><View key={event.id} style={styles.event}><Text numberOfLines={1} style={styles.time}>{event.allDay?'종일':calendarStartLabel(event,group.day,zone)}</Text><Text numberOfLines={2} style={styles.eventTitle}>{event.title}</Text></View>)}</View>}
   {editor?.group===group.key&&!editor.todo&&inline(group.key)}
   {group.todos.map(todo=>editor?.todo?.id===todo.id?inline(group.key):<ReorderItem previewShift={previewShift(todo.id)} position={todo.order} moving={selecting||!!drag||!!editor} key={todo.id} testID={hover?.key===todo.id?"todo-drop-line":undefined} collapsable={false} ref={node=>register(todo.id,node,todo.id,group.day,group.key)} style={[hover?.key===todo.id&&styles.dropLine,drag?.ids.includes(todo.id)&&{opacity:0}]}>
    <TodoRow compact todo={todo} selected={selecting?selected.includes(todo.id):undefined} onSelect={()=>select(todo.id)} onLift={store.pending[todo.id]||todo.done?undefined:point=>beginDrag(todo,group.key,point)}
      onDrag={moveDrag} onDrop={finishDrag} onSelectAccessible={()=>selectForAccessibility(todo.id)} onOpenSource={todo.source&&['google','slack','notion'].includes(todo.source.provider)&&store.connection?.mode==='cloud'?()=>void openSource(todo):undefined} pending={!!store.pending[todo.id]} pendingUntil={store.pending[todo.id]} busy={busy||!!editor||!!todo.saveState||store.busyIds.includes(todo.id)} canToggleWhileBusy={!batchBusy&&!editor&&store.completionIds.includes(todo.id)} onToggle={()=>void store.update(todo.id,{done:!todo.done})} onEdit={()=>edit(group.key,todo.dueDate,todo)}/>
   </ReorderItem>)}
   <View testID={hover?.key==='end:'+group.key?'todo-drop-line':undefined} collapsable={false} ref={node=>register('end:'+group.key,node,null,group.day,group.key)} style={[styles.dropEnd,!!group.day&&{minHeight:44},hover?.key==='end:'+group.key&&styles.dropLine]}>{drag&&hover?.key==='end:'+group.key?<Text style={styles.hint}>{view==='date'?(group.day===today?'오늘로':group.day===shiftDay(today,1)?'내일로':group.day?'이 날짜로':'날짜 없이')+' 이동':'이 위치로 이동'}</Text>:group.day&&!selecting&&!(editor?.group===group.key&&!editor.todo)?<Pressable accessibilityRole="button" accessibilityLabel={group.day+' 새 할 일 추가'} disabled={!!editor} onPress={()=>edit(group.key,group.day)} style={styles.inlineAdd}><Ionicons name="add" size={18} color={colors.blueText}/><Text style={styles.addText}>할 일 추가</Text></Pressable>:null}</View>
  </View>)}
  {view==='date'&&calendar.phase==='error'&&<View style={styles.refresh}><Text style={styles.hint}>일정을 새로 확인하지 못했어요. 저장된 내용은 유지해요.</Text><Pressable accessibilityRole="button" accessibilityLabel="할 일 화면 일정 다시 확인" onPress={()=>void calendar.load()} style={styles.headingAction}><Text style={{color:colors.blueText}}>다시 확인</Text></Pressable></View>}
  {view==='date'&&!!Object.keys(calendar.cursors).length&&<Pressable accessibilityRole="button" accessibilityLabel="일정 더 불러오기" onPress={()=>void calendar.load(true)} style={styles.inlineAdd}><Text style={{color:colors.blueText}}>일정 더 불러오기</Text></Pressable>}
 </Page>
 {selecting&&!drag&&<View testID="todo-selection-toolbar" style={[styles.selectionToolbar,{marginBottom:(duo||desktop?0:layout.navigationHeight+insets.bottom)+12}]}><Text accessibilityLiveRegion="polite" style={styles.hint}>{selected.length}개 선택</Text><View style={{flexDirection:'row',gap:4,flexWrap:'wrap'}}><Pressable accessibilityRole="button" accessibilityLabel="선택한 할 일 예정일 변경" disabled={!selected.length||busy||!!drag} onPress={()=>{setBatchMode(true);setMoveMenu(false);}} style={[styles.batchAction,(!selected.length||busy)&&{opacity:.4}]}><Ionicons name="calendar-outline" size={19} color={colors.blueText}/><Text style={styles.addText}>날짜 변경</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="선택한 할 일 이동" disabled={!selected.length||busy||!!drag} onPress={()=>{setMoveMenu(v=>!v);setBatchMode(false);}} style={[styles.batchAction,(!selected.length||busy)&&{opacity:.4}]}><Ionicons name="move-outline" size={19} color={colors.blueText}/><Text style={styles.addText}>이동</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="선택한 할 일 완료" disabled={!selected.length||busy||!!drag} onPress={()=>void applyBatch({done:true})} style={[styles.batchAction,(!selected.length||busy)&&{opacity:.4}]}><Ionicons name="checkmark" size={20} color={colors.blueText}/><Text style={styles.addText}>완료</Text></Pressable></View></View>}
 {drag&&<Animated.View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants" testID="todo-drag-preview"
   style={[styles.dragPreview,{top:0,left:0,width:drag.width,minHeight:drag.height,transform:[{translateX:liftPosition.x},{translateY:liftPosition.y},{scale:liftScale}]}]}>
   <View style={styles.dragCheckbox}/>
   <View style={styles.dragBody}>
    <Text numberOfLines={2} style={styles.dragTitle}>{drag.todo.title}</Text>
    <View style={styles.dragMeta}>
     <Text numberOfLines={1} style={styles.hint}>{drag.todo.dueDate?.slice(5).replace('-',' / ')}</Text>
     <Text numberOfLines={1} style={styles.hint}>{todoSource(drag.todo).label}</Text>
    </View>
   </View>
   {drag.ids.length>1&&<Text style={styles.dragCount}>{drag.ids.length}</Text>}
 </Animated.View>}
 </View></View></ScrollRevealContext.Provider>;
}
const styles=StyleSheet.create({headingAction:{minHeight:44,minWidth:44,justifyContent:'center',alignItems:'center'},count:{...typography.detail,color:colors.blueText,fontWeight:'600'},hint:{...typography.caption,color:colors.muted},viewBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:4},tabs:{flexDirection:'row',gap:18},viewTab:{minHeight:44,justifyContent:'center',borderBottomWidth:2,borderBottomColor:'transparent'},activeTab:{borderBottomColor:colors.blueText},tabText:{...typography.detail,color:colors.muted,fontWeight:'600'},group:{marginTop:20,marginBottom:4},heading:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:10,minHeight:44},number:{fontSize:34,lineHeight:42,fontWeight:'700',letterSpacing:-1,color:colors.text,minWidth:38},day:{fontSize:17,lineHeight:25,fontWeight:'600',color:colors.muted},sourceTitle:{fontSize:21,lineHeight:29,color:colors.text},line:{height:StyleSheet.hairlineWidth,backgroundColor:colors.line,flex:1,marginLeft:6},events:{gap:1,marginBottom:8},event:{flexDirection:'row',gap:8,minHeight:24},time:{fontSize:15,lineHeight:24,color:colors.blueText,minWidth:47},eventTitle:{fontSize:16,lineHeight:24,color:colors.secondary,flex:1},inlineAdd:{flexDirection:'row',alignItems:'center',gap:6,minHeight:44,paddingVertical:6},refresh:{gap:4,marginVertical:8},add:{flexDirection:'row',alignItems:'center',gap:3,minHeight:44,paddingVertical:8},addText:{...typography.detail,color:colors.blueText,fontWeight:'600'},selectionToolbar:{position:'absolute',bottom:0,alignSelf:'center',maxWidth:'94%',zIndex:10,backgroundColor:colors.surface,borderRadius:22,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,paddingHorizontal:10,paddingTop:6,alignItems:'center',gap:2},batchAction:{minHeight:44,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:5},movePanel:{gap:8,padding:12,backgroundColor:colors.surface,borderRadius:16},dropLine:{borderTopWidth:2,borderTopColor:colors.blueText},dropEnd:{minHeight:12},dragPreview:{position:'absolute',paddingHorizontal:10,paddingVertical:6,borderRadius:11,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',gap:10,shadowColor:'#101828',shadowOpacity:.19,shadowRadius:13,shadowOffset:{width:0,height:6},elevation:9,zIndex:20},dragCheckbox:{width:24,height:24,borderRadius:7,borderWidth:1.5,borderColor:colors.subtle},dragBody:{flex:1,minWidth:0},dragMeta:{flexDirection:'row',gap:8,justifyContent:'space-between'},dragTitle:{...typography.list,color:colors.text},dragCount:{...typography.caption,color:colors.blueText,padding:5}});

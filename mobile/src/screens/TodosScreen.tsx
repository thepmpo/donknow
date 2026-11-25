import {useDesktopPresentation} from '../DesktopPresentation';
import {ScreenHeading} from '../ScreenHeading';
import {MotionPressable as Pressable,ReorderItem,useReducedMotion} from '../motion';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Keyboard,Linking,PanResponder,RefreshControl,ScrollView,StyleSheet,Text,View} from 'react-native';
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
type Drag={ids:string[];title:string;source:string;group:string;y:number};
function EditorBack({onClose,busy}:{onClose:()=>void;busy:boolean}){useDuoBackAction(onClose,busy,'close');return null;}
export function TodosScreen({store,active=true,scrollToTopRequest=0}:{store:TodoStore;active?:boolean;scrollToTopRequest?:number}){
 const desktop=useDesktopPresentation();
 const insets=useSafeAreaInsets(),duo=useDuoTrailingNavigation(),today=dateKey(new Date()),zone=deviceZone(),selection=useCalendarSelection(store);
 const [view,setView]=useState<TodoView>('date'),[pulling,setPulling]=useState(false);
 const reduced=useReducedMotion();
 const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null),focus=useFocusedField(scroll),surface=useRef<React.ComponentRef<typeof View>>(null),keyboardInset=useKeyboardInset(surface);
 const [editor,setEditor]=useState<Editor|null>(null),sequence=useRef(0),[editingBusy,setEditingBusy]=useState(false);
 const [selecting,setSelecting]=useState(false),[selected,setSelected]=useState<string[]>([]),[batchBusy,setBatchBusy]=useState(false),[batchMode,setBatchMode]=useState(false),[moveMenu,setMoveMenu]=useState(false),[batchDate,setBatchDate]=useState<string|null>(today),[batchPicker,setBatchPicker]=useState<string|null>(null),[batchMessage,setBatchMessage]=useState('');
 const [drag,setDrag]=useState<Drag|null>(null),[hover,setHover]=useState<Target|null>(null),dragRef=useRef<Drag|null>(null),hoverRef=useRef<Target|null>(null);
 const dragCandidate=useRef<{id:string;group:string}|null>(null);
 const scrollY=useRef(0),dragScroll=useRef(0),pane=useRef({y:0,height:0}),scrollBox=useRef({y:0,height:0}),lastPointer=useRef(0),dragGrip=useRef(30);
 const nodes=useRef(new Map<string,{node:React.ComponentRef<typeof View>;before:string|null;day:string;group:string}>()),rects=useRef<Target[]>([]);
 const owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo',ownerRef=useRef(owner);ownerRef.current=owner;
 const busy=batchBusy||editingBusy||store.busyIds.includes('order');
 function cancelDrag(){dragCandidate.current=null;dragRef.current=null;hoverRef.current=null;setDrag(null);setHover(null);}
 useEffect(()=>{setEditor(null);setSelected([]);setSelecting(false);setBatchMode(false);setMoveMenu(false);setBatchBusy(false);setEditingBusy(false);setBatchMessage('');setView('date');cancelDrag();},[owner]);
 useEffect(()=>{if(!active)cancelDrag();},[active]);
 const handledTop=useRef(0);
 useEffect(()=>{if(!scrollToTopRequest||handledTop.current===scrollToTopRequest)return;handledTop.current=scrollToTopRequest;if(active&&!editor&&!drag)scroll.current?.scrollTo({y:0,animated:!reduced});},[scrollToTopRequest,active]);
 useEffect(()=>{setSelected(old=>old.filter(id=>store.visible.some(t=>t.id===id&&!t.done)));},[store.visible.map(t=>t.id+':'+t.done).join('|')]);
 useEffect(()=>{
  if(!selected.length&&!drag&&!dragCandidate.current){setSelecting(false);setBatchMode(false);setMoveMenu(false);}
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
 function beginSelection(id:string,group:string){
  if(busy||editor||store.pending[id]||store.busyIds.length)return;
  setSelecting(true);setSelected(old=>old.includes(id)?old:[id]);setMoveMenu(false);dragCandidate.current={id,group};
 }
 function beginDrag(id:string,group:string,pointerY:number){
  if(busy||editor||store.pending[id]||store.busyIds.length)return;
  const todo=store.findTodo(id);if(!todo||todo.done)return;
  const ids=(selecting&&selected.includes(id)?selected:[id]).filter(key=>!store.findTodo(key)?.done&&!store.pending[key]);
  if(view==='source'&&ids.some(key=>todoSource(store.findTodo(key)!).key!==todoSource(todo).key)){setBatchMessage('같은 출처의 항목을 선택해 순서를 옮겨주세요. 날짜는 날짜 변경에서 바꿀 수 있어요.');return;}
  Keyboard.dismiss();lastPointer.current=pointerY;dragGrip.current=30;setSelecting(true);setSelected(ids);setMoveMenu(false);dragScroll.current=scrollY.current;rects.current=[];
  surface.current?.measureInWindow((_x,y,_w,height)=>{pane.current={y,height};});scroll.current?.measureInWindow((_x,y,_w,height)=>{scrollBox.current={y,height};});
  for(const [key,t]of nodes.current)t.node.measureInWindow((_x,y,_width,height)=>{rects.current.push({key,before:t.before,day:t.day,group:t.group,y,height});});
  const value={ids,title:todo.title,source:todoSource(todo).label,group,y:0};dragRef.current=value;hoverRef.current=null;setHover(null);nodes.current.get(id)?.node.measureInWindow((_x,y)=>{if(dragRef.current!==value)return;dragGrip.current=Math.max(12,Math.min(50,pointerY-y));const positioned={...value,y:Math.max(0,y-pane.current.y)};dragRef.current=positioned;setDrag(positioned);});
 }
 function moveDrag(y:number){
  const current=dragRef.current;if(!current)return;lastPointer.current=y;
  const delta=scrollY.current-dragScroll.current,valid=rects.current.filter(t=>!current.ids.includes(t.before??'')&&(view==='date'||t.group===current.group)).sort((a,b)=>a.y-b.y);
  const target=valid.find(t=>y<t.y-delta+t.height/2)??valid.at(-1)??null;
  const previewY=y-pane.current.y-dragGrip.current;
  hoverRef.current=target;setHover(target);setDrag({...current,y:Math.max(0,Math.min(pane.current.height-80,previewY))});
 }
 const live=useRef({moveDrag,drop,beginDrag});live.current={moveDrag,drop,beginDrag};
 const responder=useMemo(()=>PanResponder.create({
  onMoveShouldSetPanResponderCapture:(_e,g)=>!!dragCandidate.current&&Math.hypot(g.dx,g.dy)>6,
  onPanResponderGrant:(event,g)=>{const candidate=dragCandidate.current;if(candidate)live.current.beginDrag(candidate.id,candidate.group,g.moveY||event.nativeEvent.pageY);},
  onPanResponderMove:(_e,g)=>live.current.moveDrag(g.moveY),
  onPanResponderRelease:()=>{const d=dragRef.current,t=hoverRef.current;cancelDrag();if(d&&t)void live.current.drop(d.ids,t);},
  onPanResponderTerminate:cancelDrag,
  onPanResponderTerminationRequest:()=>false,
 }),[]);
 useEffect(()=>{if(!drag)return;const timer=setInterval(()=>{if(!dragRef.current)return;const y=lastPointer.current,top=scrollBox.current.y+48,bottom=scrollBox.current.y+scrollBox.current.height-48;const amount=y&&y<top?-12:y>bottom?12:0;if(amount){scroll.current?.scrollTo({y:Math.max(0,scrollY.current+amount),animated:false});live.current.moveDrag(y);}},50);return()=>clearInterval(timer);},[!!drag]);
 function register(key:string,node:React.ComponentRef<typeof View>|null,before:string|null,day:string,group:string){if(node)nodes.current.set(key,{node,before,day,group});else nodes.current.delete(key);}
 async function step(direction:-1|1){const first=selected[0],group=groups.find(g=>g.todos.some(t=>t.id===first));if(!group)return;const picked=new Set(selected),rest=group.todos.filter(t=>!picked.has(t.id)),ordered=group.todos;const at=ordered.findIndex(t=>t.id===first),next=direction<0?[...ordered.slice(0,at)].reverse().find(t=>!picked.has(t.id)):ordered.slice(at+1).find(t=>!picked.has(t.id));if(!next)return;const before=direction<0?next.id:rest[rest.findIndex(t=>t.id===next.id)+1]?.id??null;await drop(selected,{key:'step',before,day:store.findTodo(first)?.dueDate??'',group:group.key,y:0,height:0},true);}
 const inline=(group:string)=>editor?.group===group?<ScrollRevealRegion key={editor.id} testID="todo-inline-region">{active&&<EditorBack onClose={closeEditor} busy={editingBusy}/>}<TodoEditorForm presentation="inline" todo={editor.todo} dueDate={editor.date} store={store} onClose={closeEditor} onBusy={setEditingBusy}/></ScrollRevealRegion>:null;
 return <ScrollRevealContext.Provider value={focus.show}><View ref={surface} onPointerUp={()=>{dragCandidate.current=null;}} onTouchEnd={()=>{dragCandidate.current=null;}} {...responder.panHandlers} collapsable={false} onLayout={keyboardInset.measure} style={{flex:1,minHeight:0}}><View onLayout={focus.reveal} style={{flex:1,minHeight:0,marginBottom:keyboardInset.inset}}>
 <Page testID="todos-list-scroll" scrollRef={scroll} scrollEnabled={!drag} bottomSpace={selecting?112:0} onScroll={e=>{scrollY.current=e.nativeEvent.contentOffset.y;focus.onScroll(e);}} compact refreshControl={<RefreshControl refreshing={pulling} onRefresh={()=>void pull()} enabled={!drag} tintColor={colors.blue}/>}>
  <ScreenHeading embedded title="할 일">{selecting&&<Pressable accessibilityRole="button" accessibilityLabel="할 일 선택 마치기" disabled={busy} onPress={()=>{cancelDrag();setSelecting(false);setSelected([]);setBatchMode(false);setMoveMenu(false);}} style={styles.headingAction}><Text style={styles.count}>완료</Text></Pressable>}</ScreenHeading>
  <PagePinned testID="todos-pinned-controls"><View style={styles.viewBar}><View accessibilityRole="tablist" style={styles.tabs}>{(['date','source'] as const).map(mode=><Pressable key={mode} testID={'todos-view-'+mode} accessibilityRole="tab" accessibilityLabel={mode==='date'?'날짜별 할 일':'출처별 할 일'} accessibilityState={{selected:view===mode,disabled:!!editor||busy||!!drag}} disabled={!!editor||busy||!!drag} onPress={()=>{setView(mode);setMoveMenu(false);setBatchMessage('');}} style={[styles.viewTab,view===mode&&styles.activeTab]}><Text style={[styles.tabText,view===mode&&{color:colors.blueText}]}>{mode==='date'?'날짜별':'출처별'}</Text></Pressable>)}</View>{!selecting&&<Pressable accessibilityRole="button" accessibilityLabel="할 일 추가" disabled={!!editor} onPress={()=>edit(view==='date'?today:'source:local',today)} style={styles.add}><Ionicons name="add" size={19} color={colors.blueText}/><Text style={styles.addText}>할 일 추가</Text></Pressable>}</View></PagePinned>
  {!store.visible.length&&!calendar.events.length&&<Text style={styles.hint}>필요한 일을 하나씩 적어보세요.</Text>}
  {!!batchMessage&&<Text accessibilityLiveRegion="polite" style={styles.hint}>{batchMessage}</Text>}
  {selecting&&moveMenu&&<ScrollRevealRegion testID="todo-move-menu"><View style={styles.movePanel}><Text style={styles.hint}>출처는 유지하고 순서만 바꿔요.</Text><Button title="선택한 할 일 위로 이동" quiet disabled={busy} onPress={()=>void step(-1)}/><Button title="선택한 할 일 아래로 이동" quiet disabled={busy} onPress={()=>void step(1)}/></View></ScrollRevealRegion>}
  {selecting&&batchMode&&<ScrollRevealRegion testID="todo-batch-date"><View style={styles.movePanel}><DateField value={batchDate} onChange={setBatchDate} disabled={busy} activePicker={batchPicker} onPickerChange={setBatchPicker}/>{!batchPicker&&<Button title="선택한 할 일 예정일 저장" loading={batchBusy} disabled={!selected.length||busy} onPress={()=>void applyBatch({dueDate:batchDate})}/>}<Button title="예정일 변경 취소" quiet disabled={busy} onPress={()=>{setBatchMode(false);setBatchPicker(null);}}/></View></ScrollRevealRegion>}
  {groups.map(group=><View key={group.key} testID={'agenda-'+group.key} style={styles.group}>
   <View style={styles.heading}>{view==='source'?<Ionicons name={todoSource(group.todos[0]??draft).icon} size={28} color={todoSource(group.todos[0]??draft).color}/>:group.day?<Text style={[styles.number,desktop&&{fontSize:27,lineHeight:35}]}>{Number(group.day.slice(8))}</Text>:<Ionicons name={group.key==='overdue'?'alert-circle-outline':'list-outline'} size={27} color={colors.muted}/>}<Text style={[styles.day,desktop&&{fontSize:13,lineHeight:22},view==='source'&&styles.sourceTitle,group.key==='overdue'&&{color:colors.danger}]}>{group.day&&group.day.slice(0,7)!==today.slice(0,7)?Number(group.day.slice(5,7))+'월 · ':''}{group.title}</Text><View style={styles.line}/></View>
   {!!group.events.length&&<View style={styles.events}>{group.events.map(event=><View key={event.id} style={styles.event}><Text numberOfLines={1} style={styles.time}>{event.allDay?'종일':calendarStartLabel(event,group.day,zone)}</Text><Text numberOfLines={2} style={styles.eventTitle}>{event.title}</Text></View>)}</View>}
   {editor?.group===group.key&&!editor.todo&&inline(group.key)}
   {group.todos.map(todo=>editor?.todo?.id===todo.id?inline(group.key):<ReorderItem position={todo.order} moving={selecting||!!drag||!!editor} key={todo.id} testID={hover?.key===todo.id?"todo-drop-line":undefined} collapsable={false} ref={node=>register(todo.id,node,todo.id,group.day,group.key)} style={[hover?.key===todo.id&&styles.dropLine,drag?.ids.includes(todo.id)&&{opacity:.25}]}>
    <TodoRow compact todo={todo} selected={selecting?selected.includes(todo.id):undefined} onSelect={()=>select(todo.id)} onLongPress={()=>beginSelection(todo.id,group.key)} onOpenSource={todo.source&&['google','slack','notion'].includes(todo.source.provider)&&store.connection?.mode==='cloud'?()=>void openSource(todo):undefined} pending={!!store.pending[todo.id]} pendingUntil={store.pending[todo.id]} busy={busy||!!editor||!!todo.saveState||store.busyIds.includes(todo.id)} canToggleWhileBusy={!batchBusy&&!editor&&store.completionIds.includes(todo.id)} onToggle={()=>void store.update(todo.id,{done:!todo.done})} onEdit={()=>edit(group.key,todo.dueDate,todo)}/>
   </ReorderItem>)}
   <View testID={hover?.key==='end:'+group.key?'todo-drop-line':undefined} collapsable={false} ref={node=>register('end:'+group.key,node,null,group.day,group.key)} style={[styles.dropEnd,!!group.day&&{minHeight:44},hover?.key==='end:'+group.key&&styles.dropLine]}>{drag&&hover?.key==='end:'+group.key?<Text style={styles.hint}>{view==='date'?(group.day===today?'오늘로':group.day===shiftDay(today,1)?'내일로':group.day?'이 날짜로':'날짜 없이')+' 이동':'이 위치로 이동'}</Text>:group.day&&!selecting&&!(editor?.group===group.key&&!editor.todo)?<Pressable accessibilityRole="button" accessibilityLabel={group.day+' 새 할 일 추가'} disabled={!!editor} onPress={()=>edit(group.key,group.day)} style={styles.inlineAdd}><Ionicons name="add" size={18} color={colors.blueText}/><Text style={styles.addText}>할 일 추가</Text></Pressable>:null}</View>
  </View>)}
  {view==='date'&&calendar.phase==='error'&&<View style={styles.refresh}><Text style={styles.hint}>일정을 새로 확인하지 못했어요. 저장된 내용은 유지해요.</Text><Pressable accessibilityRole="button" accessibilityLabel="할 일 화면 일정 다시 확인" onPress={()=>void calendar.load()} style={styles.headingAction}><Text style={{color:colors.blueText}}>다시 확인</Text></Pressable></View>}
  {view==='date'&&!!Object.keys(calendar.cursors).length&&<Pressable accessibilityRole="button" accessibilityLabel="일정 더 불러오기" onPress={()=>void calendar.load(true)} style={styles.inlineAdd}><Text style={{color:colors.blueText}}>일정 더 불러오기</Text></Pressable>}
 </Page>
 {selecting&&<View testID="todo-selection-toolbar" style={[styles.selectionToolbar,{marginBottom:(duo||desktop?0:layout.navigationHeight+insets.bottom)+12}]}><Text accessibilityLiveRegion="polite" style={styles.hint}>{selected.length}개 선택</Text><View style={{flexDirection:'row',gap:4,flexWrap:'wrap'}}><Pressable accessibilityRole="button" accessibilityLabel="선택한 할 일 예정일 변경" disabled={!selected.length||busy||!!drag} onPress={()=>{setBatchMode(true);setMoveMenu(false);}} style={[styles.batchAction,(!selected.length||busy)&&{opacity:.4}]}><Ionicons name="calendar-outline" size={19} color={colors.blueText}/><Text style={styles.addText}>날짜 변경</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="선택한 할 일 이동" disabled={!selected.length||busy||!!drag} onPress={()=>{setMoveMenu(v=>!v);setBatchMode(false);}} style={[styles.batchAction,(!selected.length||busy)&&{opacity:.4}]}><Ionicons name="move-outline" size={19} color={colors.blueText}/><Text style={styles.addText}>이동</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="선택한 할 일 완료" disabled={!selected.length||busy||!!drag} onPress={()=>void applyBatch({done:true})} style={[styles.batchAction,(!selected.length||busy)&&{opacity:.4}]}><Ionicons name="checkmark" size={20} color={colors.blueText}/><Text style={styles.addText}>완료</Text></Pressable></View></View>}
 {drag&&<View pointerEvents="none" testID="todo-drag-preview" style={[styles.dragPreview,{top:drag.y}]}><View style={{flex:1,gap:4}}><Text numberOfLines={1} style={styles.dragTitle}>{drag.title}</Text><Text style={styles.hint}>{drag.source}</Text></View><Text style={styles.dragCount}>{drag.ids.length}</Text></View>}
 </View></View></ScrollRevealContext.Provider>;
}
const styles=StyleSheet.create({headingAction:{minHeight:44,minWidth:44,justifyContent:'center',alignItems:'center'},count:{...typography.detail,color:colors.blueText,fontWeight:'600'},hint:{...typography.caption,color:colors.muted},viewBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:4},tabs:{flexDirection:'row',gap:18},viewTab:{minHeight:44,justifyContent:'center',borderBottomWidth:2,borderBottomColor:'transparent'},activeTab:{borderBottomColor:colors.blueText},tabText:{...typography.detail,color:colors.muted,fontWeight:'600'},group:{marginTop:20,marginBottom:4},heading:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:10,minHeight:44},number:{fontSize:34,lineHeight:42,fontWeight:'700',letterSpacing:-1,color:colors.text,minWidth:38},day:{fontSize:17,lineHeight:25,fontWeight:'600',color:colors.muted},sourceTitle:{fontSize:21,lineHeight:29,color:colors.text},line:{height:StyleSheet.hairlineWidth,backgroundColor:colors.line,flex:1,marginLeft:6},events:{gap:1,marginBottom:8},event:{flexDirection:'row',gap:8,minHeight:24},time:{fontSize:15,lineHeight:24,color:colors.blueText,minWidth:47},eventTitle:{fontSize:16,lineHeight:24,color:colors.secondary,flex:1},inlineAdd:{flexDirection:'row',alignItems:'center',gap:6,minHeight:44,paddingVertical:6},refresh:{gap:4,marginVertical:8},add:{flexDirection:'row',alignItems:'center',gap:3,minHeight:44,paddingVertical:8},addText:{...typography.detail,color:colors.blueText,fontWeight:'600'},selectionToolbar:{position:'absolute',bottom:0,alignSelf:'center',maxWidth:'94%',zIndex:10,backgroundColor:colors.surface,borderRadius:22,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,paddingHorizontal:10,paddingTop:6,alignItems:'center',gap:2},batchAction:{minHeight:44,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:5},movePanel:{gap:8,padding:12,backgroundColor:colors.surface,borderRadius:16},dropLine:{borderTopWidth:2,borderTopColor:colors.blueText},dropEnd:{minHeight:12},dragPreview:{position:'absolute',left:24,right:24,padding:14,borderRadius:14,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.muted,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',gap:10,elevation:5,zIndex:20},dragTitle:{fontSize:17,lineHeight:24,fontWeight:'600',color:colors.text},dragCount:{fontSize:18,fontWeight:'700',color:colors.blueText,padding:8}});

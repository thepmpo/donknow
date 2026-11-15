import {ScreenHeading} from '../ScreenHeading';
import {MotionPressable as Pressable} from '../motion';
import React,{useEffect,useRef,useState} from 'react';
import {Keyboard,RefreshControl,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {dateKey} from '../domain';
import type {Todo} from '../domain';
import type {TodoStore} from '../useTodos';
import {typography,layout} from '../theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useDuoTrailingNavigation} from '../DuoLayout';
import {Button,colors,Page,TodoEditorForm,TodoRow} from '../ui';
import {DateField} from '../ui';
import {ScrollRevealContext,ScrollRevealRegion,useFocusedField,useKeyboardInset} from '../useFocusedField';
import {useDuoBackAction} from '../DuoBackNavigation';
import {deviceZone,shiftDay} from '../calendar-model';
import {calendarStartLabel} from '../calendar-display';
import {useCalendarData} from '../useCalendarData';
import {useCalendarSelection} from '../useCalendarSelection';
import {todoAgenda} from '../todo-agenda';
type Editor={id:number;todo?:Todo;date:string|null;group:string};
function EditorBack({onClose,busy}:{onClose:()=>void;busy:boolean}){useDuoBackAction(onClose,busy,'close');return null;}
export function TodosScreen({store,active=true}:{store:TodoStore;active?:boolean}){
 const insets=useSafeAreaInsets(),duo=useDuoTrailingNavigation();
 const [pulling,setPulling]=useState(false),today=dateKey(new Date()),zone=deviceZone(),selection=useCalendarSelection(store);
 const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null),focus=useFocusedField(scroll),surface=useRef<React.ComponentRef<typeof View>>(null),keyboardInset=useKeyboardInset(surface);
 const [editor,setEditor]=useState<Editor|null>(null),sequence=useRef(0),[editingBusy,setEditingBusy]=useState(false);
 const [selecting,setSelecting]=useState(false),[selected,setSelected]=useState<string[]>([]),[batchBusy,setBatchBusy]=useState(false),[batchMode,setBatchMode]=useState(false),[batchDate,setBatchDate]=useState<string|null>(today),[batchPicker,setBatchPicker]=useState<string|null>(null),[batchMessage,setBatchMessage]=useState('');
 const owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo',ownerRef=useRef(owner);ownerRef.current=owner;
 useEffect(()=>{setEditor(null);setSelected([]);setSelecting(false);setBatchMode(false);setBatchBusy(false);setEditingBusy(false);setBatchMessage('');},[owner]);
 useEffect(()=>{setSelected(old=>old.filter(id=>store.visible.some(t=>t.id===id)));},[store.visible.map(t=>t.id).join('|')]);
 const calendar=useCalendarData(store,{start:today,end:shiftDay(today,14),month:today.slice(0,7),timeZone:zone,selected:selection.ids,active,selectionReady:selection.ready});
 async function pull(){setPulling(true);try{await Promise.allSettled([store.refresh(),calendar.load()]);}finally{setPulling(false);}}
 const stableTodos=editor?.todo?store.visible.map(t=>t.id===editor.todo!.id?editor.todo!:t):store.visible;
 if(editor?.todo&&!stableTodos.some(t=>t.id===editor.todo!.id))stableTodos.push(editor.todo);
 const groups=todoAgenda(editor&&!editor.todo?[...stableTodos,{id:'inline-draft',title:'',done:false,dueDate:editor.date,category:'일상'}]:stableTodos,calendar.events,today,zone).map(g=>({...g,todos:g.todos.filter(t=>t.id!=='inline-draft')}));
 function closeEditor(){Keyboard.dismiss();focus.show(null);setEditingBusy(false);setEditor(null);}
 function edit(group:string,date:string|null,todo?:Todo){if(editor)return;setBatchMessage('');setEditor({id:++sequence.current,group,date,todo});}
 function select(id:string){setSelected(old=>old.includes(id)?old.filter(v=>v!==id):[...old,id]);}
 async function applyBatch(patch:{done?:boolean;dueDate?:string|null}){
  if(!selected.length||batchBusy)return;const captured=owner;setBatchBusy(true);setBatchMessage('');const failed:string[]=[];
  try{for(const id of selected){if(ownerRef.current!==captured||!store.isCurrentSession())return;try{if(!await store.update(id,patch))failed.push(id);}catch{failed.push(id);}}if(ownerRef.current!==captured)return;setSelected(failed);setBatchMode(false);setBatchPicker(null);setBatchMessage(failed.length?`${failed.length}개를 저장하지 못했어요. 선택한 항목을 다시 확인해주세요.`:'선택한 할 일을 반영했어요.');if(!failed.length)setSelecting(false);}finally{if(ownerRef.current===captured)setBatchBusy(false);}
 }
 const inline=(group:string)=>editor?.group===group?<ScrollRevealRegion key={editor.id} testID="todo-inline-region">{active&&<EditorBack onClose={closeEditor} busy={editingBusy}/>}<TodoEditorForm presentation="inline" todo={editor.todo} dueDate={editor.date} store={store} onClose={closeEditor} onBusy={setEditingBusy}/></ScrollRevealRegion>:null;
 return <ScrollRevealContext.Provider value={focus.show}><View ref={surface} collapsable={false} onLayout={keyboardInset.measure} style={{flex:1,minHeight:0}}><View onLayout={focus.reveal} style={{flex:1,minHeight:0,marginBottom:keyboardInset.inset}}>
 <Page testID="todos-list-scroll" scrollRef={scroll} onScroll={focus.onScroll} compact refreshControl={<RefreshControl refreshing={pulling} onRefresh={()=>void pull()} tintColor={colors.blue}/>}>
  <ScreenHeading embedded title="할 일"><Pressable accessibilityRole="button" accessibilityLabel={selecting?'할 일 선택 마치기':'할 일 여러 개 선택'} disabled={!!editor||batchBusy} onPress={()=>{setSelecting(v=>!v);setSelected([]);setBatchMode(false);setBatchMessage('');}} style={styles.headingAction}><Text style={styles.count}>{selecting?'완료':'선택'}</Text></Pressable></ScreenHeading>
  {!store.visible.length&&!calendar.events.length&&<Text style={styles.hint}>오늘의 일정을 보고, 필요한 일을 하나씩 적어보세요.</Text>}
  {!!batchMessage&&<Text accessibilityLiveRegion="polite" style={styles.hint}>{batchMessage}</Text>}
  {selecting&&batchMode&&<ScrollRevealRegion testID="todo-batch-date"><View style={{gap:8,padding:12,backgroundColor:colors.surface,borderRadius:16}}><DateField value={batchDate} onChange={setBatchDate} disabled={batchBusy} activePicker={batchPicker} onPickerChange={setBatchPicker}/>{!batchPicker&&<Button title="선택한 할 일 예정일 저장" loading={batchBusy} disabled={!selected.length||batchBusy} onPress={()=>void applyBatch({dueDate:batchDate})}/>}<Button title="예정일 변경 취소" quiet disabled={batchBusy} onPress={()=>{setBatchMode(false);setBatchPicker(null);}}/></View></ScrollRevealRegion>}
  {groups.map(group=><View key={group.key} testID={'agenda-'+group.key} style={styles.group}>
   <View style={styles.heading}>{group.day?<Text style={styles.number}>{Number(group.day.slice(8))}</Text>:<Ionicons name={group.key==='overdue'?'alert-circle-outline':'list-outline'} size={29} color={group.key==='overdue'?colors.danger:colors.muted}/>}<View style={{flex:1,gap:3}}><View style={styles.line}/><Text style={[styles.day,group.key==='overdue'&&{color:colors.danger}]}>{group.day&&group.day.slice(0,7)!==today.slice(0,7)?Number(group.day.slice(5,7))+'월 · ':''}{group.title}</Text></View></View>
   {!!group.events.length&&<View style={styles.events}>{group.events.map(event=><View key={event.id} style={styles.event}><Text numberOfLines={1} style={styles.time}>{event.allDay?'종일':calendarStartLabel(event,group.day,zone)}</Text><Text numberOfLines={2} style={styles.eventTitle}>{event.title}</Text></View>)}</View>}
   {group.day&&!selecting&&!(editor?.group===group.key&&!editor.todo)&&<Pressable accessibilityRole="button" accessibilityLabel={group.day+' 새 할 일 추가'} disabled={!!editor} onPress={()=>edit(group.key,group.day)} style={styles.inlineAdd}><Ionicons name="square-outline" size={22} color={colors.muted}/><Text style={styles.placeholder}>새 할 일</Text></Pressable>}
   {editor?.group===group.key&&!editor.todo&&inline(group.key)}
   {group.todos.map(todo=>editor?.todo?.id===todo.id?inline(group.key):<TodoRow key={todo.id} compact todo={todo} selected={selecting?selected.includes(todo.id):undefined} onSelect={()=>select(todo.id)} pending={!!store.pending[todo.id]} pendingUntil={store.pending[todo.id]} busy={batchBusy||!!editor||store.busyIds.includes(todo.id)} canToggleWhileBusy={!batchBusy&&!editor&&store.completionIds.includes(todo.id)} onToggle={()=>void store.update(todo.id,{done:!todo.done})} onEdit={()=>edit(group.key,todo.dueDate,todo)}/>)}
  </View>)}
  {calendar.phase==='error'&&<View style={styles.refresh}><Text style={styles.hint}>일정을 새로 확인하지 못했어요. 저장된 내용은 유지해요.</Text><Pressable accessibilityRole="button" accessibilityLabel="할 일 화면 일정 다시 확인" onPress={()=>void calendar.load()} style={styles.headingAction}><Text style={{color:colors.blueText}}>다시 확인</Text></Pressable></View>}
  {!!Object.keys(calendar.cursors).length&&<Pressable accessibilityRole="button" accessibilityLabel="일정 더 불러오기" onPress={()=>void calendar.load(true)} style={styles.inlineAdd}><Text style={{color:colors.blueText}}>일정 더 불러오기</Text></Pressable>}
  {!selecting&&<Pressable accessibilityRole="button" accessibilityLabel="할 일 추가" disabled={!!editor} onPress={()=>edit(today,today)} style={styles.add}><Ionicons name="add" size={23} color={colors.blueText}/><Text style={styles.addText}>할 일 추가</Text></Pressable>}
 </Page>
 {selecting&&<View testID="todo-selection-toolbar" style={[styles.selectionToolbar,{marginBottom:(duo?0:layout.navigationHeight+insets.bottom)+12}]}><Text accessibilityLiveRegion="polite" style={styles.hint}>{selected.length}개 선택</Text><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><Pressable accessibilityRole="button" accessibilityLabel="선택한 할 일 예정일 변경" disabled={!selected.length||batchBusy} onPress={()=>setBatchMode(true)} style={styles.batchAction}><Ionicons name="calendar-outline" size={20} color={colors.blueText}/><Text style={styles.addText}>날짜 변경</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="선택한 할 일 완료" disabled={!selected.length||batchBusy} onPress={()=>void applyBatch({done:true})} style={styles.batchAction}><Ionicons name="checkmark" size={21} color={colors.blueText}/><Text style={styles.addText}>{batchBusy?'저장 중…':'완료하기'}</Text></Pressable></View></View>}

 </View></View></ScrollRevealContext.Provider>;
}
const styles=StyleSheet.create({headingAction:{minHeight:44,minWidth:44,justifyContent:'center',alignItems:'center'},count:{...typography.detail,color:colors.blueText,fontWeight:'600'},hint:{...typography.caption,color:colors.muted},group:{marginTop:20,marginBottom:12},heading:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12,minHeight:44},number:{fontSize:34,lineHeight:42,fontWeight:'700',letterSpacing:-1,color:colors.text,minWidth:38},day:{fontSize:17,lineHeight:25,fontWeight:'600',color:colors.muted},line:{height:StyleSheet.hairlineWidth,backgroundColor:colors.line},events:{gap:1,marginBottom:8},event:{flexDirection:'row',gap:8,minHeight:24},time:{fontSize:15,lineHeight:24,color:colors.blueText,minWidth:47},eventTitle:{fontSize:16,lineHeight:24,color:colors.secondary,flex:1},inlineAdd:{flexDirection:'row',alignItems:'center',gap:10,minHeight:44,paddingVertical:6},placeholder:{fontSize:16,lineHeight:24,color:colors.muted},refresh:{gap:4,marginVertical:8},add:{flexDirection:'row',alignItems:'center',gap:10,minHeight:44,paddingVertical:8,marginTop:4},addText:{...typography.detail,color:colors.blueText,fontWeight:'600'},selectionToolbar:{backgroundColor:colors.surface,borderRadius:20,marginHorizontal:16,marginBottom:12,padding:12,gap:6},batchAction:{minHeight:44,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:8}});

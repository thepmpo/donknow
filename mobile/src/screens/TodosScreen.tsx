import {ScreenHeading} from '../ScreenHeading';
import { MotionPressable as Pressable } from '../motion';
import React,{useState} from 'react';
import {RefreshControl,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {dateKey} from '../domain';
import type {Todo} from '../domain';
import type {TodoStore} from '../useTodos';
import {typography} from '../theme';
import {colors,Page,s,TodoRow} from '../ui';
import {deviceZone,shiftDay} from '../calendar-model';
import {calendarStartLabel} from '../calendar-display';
import {useCalendarData} from '../useCalendarData';
import {useCalendarSelection} from '../useCalendarSelection';
import {todoAgenda} from '../todo-agenda';
export function TodosScreen({store,onEdit,onAdd}:{store:TodoStore;onEdit:(todo:Todo)=>void;onAdd:(date:string|null)=>void}){
 const [pulling,setPulling]=useState(false),today=dateKey(new Date()),zone=deviceZone(),selection=useCalendarSelection(store);
 const calendar=useCalendarData(store,{start:today,end:shiftDay(today,14),month:today.slice(0,7),timeZone:zone,selected:selection.ids,active:true,selectionReady:selection.ready});
 async function pull(){setPulling(true);try{await Promise.allSettled([store.refresh(),calendar.load()]);}finally{setPulling(false);}}
 const groups=todoAgenda(store.visible,calendar.events,today,zone);
 return <Page testID="todos-list-scroll" compact refreshControl={<RefreshControl refreshing={pulling} onRefresh={()=>void pull()} tintColor={colors.blue}/>}>
  <ScreenHeading embedded title="할 일"><Text style={styles.count}>{store.visible.length}</Text></ScreenHeading>
  {!store.visible.length&&!calendar.events.length&&<Text style={styles.hint}>오늘의 일정을 보고, 필요한 일을 하나씩 적어보세요.</Text>}
  {groups.map(group=><View key={group.key} testID={'agenda-'+group.key} style={styles.group}>
   <View style={styles.heading}>{group.day?<Text style={styles.number}>{Number(group.day.slice(8))}</Text>:<Ionicons name={group.key==='overdue'?'alert-circle-outline':'list-outline'} size={29} color={group.key==='overdue'?colors.danger:colors.muted}/>}<View style={{flex:1,gap:3}}><View style={styles.line}/><Text style={[styles.day,group.key==='overdue'&&{color:colors.danger}]}>{group.day&&group.day.slice(0,7)!==today.slice(0,7)?Number(group.day.slice(5,7))+'월 · ':''}{group.title}</Text></View></View>
   {!!group.events.length&&<View style={styles.events}>{group.events.map(event=><View key={event.id} style={styles.event}><Text numberOfLines={1} style={styles.time}>{event.allDay?'종일':calendarStartLabel(event,group.day,zone)}</Text><Text numberOfLines={2} style={styles.eventTitle}>{event.title}</Text></View>)}</View>}
   {group.day&&<Pressable accessibilityRole="button" accessibilityLabel={group.day+' 새 할 일 추가'} onPress={()=>onAdd(group.day)} style={styles.inlineAdd}><Ionicons name="square-outline" size={24} color={colors.muted}/><Text style={styles.placeholder}>새 할 일</Text></Pressable>}
   {group.todos.map(todo=><TodoRow key={todo.id} compact todo={todo} pending={!!store.pending[todo.id]} pendingUntil={store.pending[todo.id]} busy={store.busyIds.includes(todo.id)} canToggleWhileBusy={store.completionIds.includes(todo.id)} onToggle={()=>void store.update(todo.id,{done:!todo.done})} onEdit={()=>onEdit(todo)}/>)}
  </View>)}
  {calendar.phase==='error'&&<View style={styles.refresh}><Text style={styles.hint}>일정을 새로 확인하지 못했어요. 저장된 내용은 유지해요.</Text><Pressable accessibilityRole="button" accessibilityLabel="할 일 화면 일정 다시 확인" onPress={()=>void calendar.load()} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.blueText}}>다시 확인</Text></Pressable></View>}
  {!!Object.keys(calendar.cursors).length&&<Pressable accessibilityRole="button" accessibilityLabel="일정 더 불러오기" onPress={()=>void calendar.load(true)} style={styles.inlineAdd}><Text style={{color:colors.blueText}}>일정 더 불러오기</Text></Pressable>}
  <Pressable accessibilityRole="button" accessibilityLabel="할 일 추가" onPress={()=>onAdd(today)} style={styles.add}><Ionicons name="add" size={23} color={colors.blueText}/><Text style={styles.addText}>할 일 추가</Text></Pressable>
 </Page>;
}
const styles=StyleSheet.create({count:{...typography.body,color:colors.muted,fontWeight:'600'},hint:{...typography.caption,color:colors.muted},group:{marginTop:26,marginBottom:18},heading:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:14,minHeight:44},number:{fontSize:34,lineHeight:42,fontWeight:'700',letterSpacing:-1,color:colors.text,minWidth:38},day:{fontSize:17,lineHeight:25,fontWeight:'600',color:colors.muted},line:{height:StyleSheet.hairlineWidth,backgroundColor:colors.line},events:{gap:4,marginBottom:12},event:{flexDirection:'row',gap:8,minHeight:25},time:{fontSize:15,lineHeight:24,color:colors.blueText,minWidth:47},eventTitle:{fontSize:16,lineHeight:24,color:colors.secondary,flex:1},inlineAdd:{flexDirection:'row',alignItems:'center',gap:12,minHeight:48,paddingVertical:9},placeholder:{fontSize:17,lineHeight:25,color:colors.muted},refresh:{gap:4,marginVertical:8},add:{flexDirection:'row',alignItems:'center',gap:10,minHeight:48,paddingVertical:10,marginTop:4},addText:{...typography.detail,color:colors.blueText,fontWeight:'600'}});

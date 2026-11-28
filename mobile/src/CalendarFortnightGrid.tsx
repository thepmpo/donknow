import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {MotionPressable as Pressable} from './motion';
import {colors} from './theme';
import {calendarStartLabel} from './calendar-display';
import {eventOccurs} from './calendar-model';
import type {CalendarEvent} from './calendar-model';
import type {Todo} from './domain';

/** Rows grow to their busiest date. The containing calendar scrolls; no items
 * are dropped, nested scroll regions or hidden-count substitutions are needed. */
export function CalendarFortnightGrid({days,events,todos,selected,today,zone,minRowHeight,color,onDay,onAdd,onEvent,onTodo}: {
 days:string[];events:CalendarEvent[];todos:Todo[];selected:string;today:string;zone:string;minRowHeight:number;
 color:(event:CalendarEvent)=>string;onDay:(day:string)=>void;onAdd:(day:string)=>void;onEvent:(event:CalendarEvent)=>void;onTodo:(todo:Todo)=>void;
}) {
 return <View testID="calendar-date-grid">{Array.from({length:days.length/7},(_,index)=><View key={days[index*7]} testID={'calendar-week-row-'+index} style={[s.week,{minHeight:minRowHeight}]}>
  {days.slice(index*7,index*7+7).map((day,dayIndex)=>{
   const entries=events.filter(event=>eventOccurs(event,day,zone)).sort((a,b)=>Number(!!b.allDay)-Number(!!a.allDay)||(a.startAt??'').localeCompare(b.startAt??''));
   const tasks=todos.filter(todo=>todo.dueDate===day&&!todo.done),weekday=new Date(day+'T12:00:00Z').getUTCDay();
   return <View key={day} testID={'calendar-day-'+day} style={[s.day,dayIndex<6&&{borderRightWidth:StyleSheet.hairlineWidth},day===today&&s.today]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${day} Event와 Ticket ${entries.length+tasks.length}개${day===today?', 오늘':''}`} accessibilityState={{selected:day===selected}} onPress={()=>onDay(day)} onLongPress={()=>onAdd(day)} style={s.dateTarget}><Text style={[s.date,{color:weekday===0?colors.danger:weekday===6?colors.blueText:colors.secondary},day===selected&&s.selected]}>{Number(day.slice(8))}</Text></Pressable>
    {entries.map(event=><Pressable key={event.id} testID={'fortnight-event-'+event.id+'-'+day} accessibilityRole="button" accessibilityLabel={event.title+' Event 상세'} accessibilityHint={calendarStartLabel(event,day,zone)} onPress={()=>onEvent(event)} style={[s.item,{borderLeftColor:color(event),backgroundColor:/^#[a-f0-9]{6}$/i.test(color(event))?color(event)+'25':colors.pale}]}><Text numberOfLines={2} style={s.title}>{event.title}</Text>{calendarStartLabel(event,day,zone)!==''&&<Text testID={'calendar-event-start-'+event.id+'-'+day} style={s.time}>{calendarStartLabel(event,day,zone)}</Text>}</Pressable>)}
    {tasks.map(todo=><Pressable key={todo.id} accessibilityRole="button" accessibilityLabel={todo.title+' Ticket 수정'} onPress={()=>onTodo(todo)} style={[s.item,s.task]}><Ionicons name="square-outline" size={11} color={colors.secondary}/><Text numberOfLines={2} style={s.title}>{todo.title}</Text></Pressable>)}
   </View>;
  })}
 </View>)}</View>;
}
const s=StyleSheet.create({
 week:{flexDirection:'row',borderTopWidth:StyleSheet.hairlineWidth,borderColor:colors.line,alignItems:'stretch'},
 day:{flex:1,minWidth:0,paddingHorizontal:2,paddingBottom:8,gap:3,borderColor:colors.line},today:{backgroundColor:colors.pale,borderRadius:12},
 dateTarget:{minHeight:44,alignItems:'center',justifyContent:'center'},date:{fontSize:20,lineHeight:28,minWidth:36,textAlign:'center',paddingVertical:4,borderRadius:20},selected:{backgroundColor:colors.action,color:colors.white,fontWeight:'700'},
 item:{minHeight:44,gap:1,paddingVertical:2,paddingHorizontal:3,borderLeftWidth:2,borderRadius:5},title:{fontSize:12,lineHeight:15,color:colors.text,flexShrink:1},time:{fontSize:10,lineHeight:13,color:colors.secondary},task:{flexDirection:'row',alignItems:'center',backgroundColor:colors.grouped,borderLeftColor:colors.muted}
});

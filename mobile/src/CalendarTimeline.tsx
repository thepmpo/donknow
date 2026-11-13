import React,{useEffect,useRef,useState} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {MotionPressable as Pressable} from './motion';
import {colors} from './theme';
import {eventOccurs,eventTime,timedLayout} from './calendar-model';
import type {CalendarEvent} from './calendar-model';
export function CalendarTimeline({days,events,zone,width,selected,onEvent,onCreate}:{days:string[];events:CalendarEvent[];zone:string;width:number;selected:string;onEvent:(e:CalendarEvent)=>void;onCreate:(day:string,time:string)=>void}){
 const hour=64,minDuration=44/hour*60;
 const maxLanes=Math.max(1,...days.map(day=>Math.max(1,...timedLayout(events,day,zone,minDuration).map(e=>e.lanes))));
 const dayWidth=days.length===1?Math.max(180,width-44,maxLanes*64):Math.max(88,(width-44)/7,maxLanes*64);
 const header=useRef<React.ComponentRef<typeof ScrollView>>(null),body=useRef<React.ComponentRef<typeof ScrollView>>(null),vertical=useRef<React.ComponentRef<typeof ScrollView>>(null),offset=useRef(0);
 const [measured,setMeasured]=useState(false),period=days.join(',');
 function align(x:number,source:'header'|'body'){
  if(Math.abs(x-offset.current)<1)return;offset.current=x;
  (source==='header'?body:header).current?.scrollTo({x,animated:false});
 }
 useEffect(()=>{
  if(!measured)return;
  const x=Math.min(Math.max(0,(days.indexOf(selected)-1)*dayWidth),Math.max(0,dayWidth*days.length-(width-44)));
  offset.current=x;header.current?.scrollTo({x,animated:false});body.current?.scrollTo({x,animated:false});vertical.current?.scrollTo({y:8*hour,animated:false});
 },[period,selected,dayWidth,width,measured]);
 return <View testID="calendar-time-workspace">
  <View style={s.row}><View style={{width:44,justifyContent:'center'}}><Text style={s.hourLabel}>종일</Text></View><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} ref={header} horizontal onScroll={e=>align(e.nativeEvent.contentOffset.x,'header')} scrollEventThrottle={16} contentContainerStyle={{width:dayWidth*days.length}}>{days.map(day=><View key={day} style={{width:dayWidth,padding:4}}><Text style={s.day}>{day.slice(5)}</Text>{events.filter(e=>e.allDay&&eventOccurs(e,day,zone)).map(e=><Pressable key={e.id} accessibilityRole="button" accessibilityLabel={e.title+' 종일 일정 상세'} onPress={()=>onEvent(e)} style={s.allDay}><Text numberOfLines={2} style={s.label}>{e.title}</Text></Pressable>)}</View>)}</ScrollView></View>
  <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} ref={vertical} testID="calendar-timeline" style={{maxHeight:480}} nestedScrollEnabled onLayout={()=>setMeasured(true)} contentContainerStyle={{height:24*hour}}>
   <View style={[s.row,{height:24*hour}]}>
    <View style={{width:44}}>{Array.from({length:24},(_,h)=><Text key={h} style={[s.hourLabel,{position:'absolute',top:h*hour,left:2}]}>{String(h).padStart(2,'0')}:00</Text>)}</View>
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} ref={body} horizontal testID="calendar-timeline-horizontal" nestedScrollEnabled onScroll={e=>align(e.nativeEvent.contentOffset.x,'body')} scrollEventThrottle={16} contentContainerStyle={{width:dayWidth*days.length,height:24*hour}}>
     {days.map(day=><View key={day} style={{width:dayWidth,borderLeftWidth:StyleSheet.hairlineWidth,borderColor:colors.line}}>
      {Array.from({length:24},(_,h)=><Pressable key={h} accessibilityRole="button" accessibilityLabel={day+' '+String(h).padStart(2,'0')+'시 일정 추가'} onLongPress={()=>onCreate(day,String(h).padStart(2,'0')+':00')} onPress={()=>onCreate(day,String(h).padStart(2,'0')+':00')} style={{position:'absolute',top:h*hour,height:hour,width:'100%',borderTopWidth:StyleSheet.hairlineWidth,borderColor:colors.line}}/>)}
      {timedLayout(events,day,zone,minDuration).map(({event,start,end,lane,lanes})=><Pressable key={event.id} testID={'timeline-event-'+event.id} accessibilityRole="button" accessibilityLabel={event.title+' '+eventTime(event,zone)+' 일정 상세'} onPress={()=>onEvent(event)} onLongPress={()=>onEvent(event)} style={[s.event,{top:start/60*hour,height:Math.max(44,(end-start)/60*hour-2),left:lane*dayWidth/lanes,width:Math.max(44,dayWidth/lanes-2)}]}><Text numberOfLines={2} style={s.label}>{event.title}</Text><Text numberOfLines={1} style={s.time}>{eventTime(event,zone)}</Text>{lanes>1&&<Text style={s.time}>시간 겹침</Text>}</Pressable>)}
     </View>)}
    </ScrollView>
   </View>
  </ScrollView>
 </View>;
}
const s=StyleSheet.create({row:{flexDirection:'row'},day:{fontSize:13,lineHeight:20,fontWeight:'600',color:colors.text,textAlign:'center'},allDay:{minHeight:44,borderRadius:6,padding:5,backgroundColor:colors.grouped,marginTop:4},event:{position:'absolute',backgroundColor:colors.pale,borderLeftWidth:3,borderColor:colors.action,borderRadius:6,padding:4,overflow:'hidden'},label:{fontSize:13,lineHeight:18,color:colors.blueText},time:{fontSize:11,lineHeight:16,color:colors.secondary},hourLabel:{fontSize:11,color:colors.muted}});

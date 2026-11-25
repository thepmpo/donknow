import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {periodShift,visibleDays} from './calendar-model';
import {MotionPressable as Pressable} from './motion';
import {colors,typography} from './theme';

export function CalendarMonthPickerGrid({month,onMonth,today,selected,onDay,disabled=false,compact=false}:{month:string;onMonth:(value:string)=>void;today:string;selected:ReadonlySet<string|null>;onDay:(day:string)=>void;disabled?:boolean;compact?:boolean}){
 const dates=visibleDays(month,month+'-01','month');
 function shift(amount:number){onMonth(periodShift(month,month+'-01','month',amount).month);}
 return <View testID="month-picker-grid" style={styles.root}>
  <View style={styles.monthRow}>
   <Pressable accessibilityRole="button" accessibilityLabel="이전 달" disabled={disabled} onPress={()=>shift(-1)} style={styles.arrow}><Ionicons name="chevron-back" size={20} color={colors.blueText}/></Pressable>
   <Text numberOfLines={1} style={styles.monthLabel}>{Number(month.slice(0,4))}년 {Number(month.slice(5))}월</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="다음 달" disabled={disabled} onPress={()=>shift(1)} style={styles.arrow}><Ionicons name="chevron-forward" size={20} color={colors.blueText}/></Pressable>
  </View>
  <View style={styles.week}>{[...'일월화수목금토'].map(day=><Text key={day} style={styles.weekday}>{day}</Text>)}</View>
  {Array.from({length:dates.length/7},(_,week)=><View key={dates[week*7]} style={styles.week}>
   {dates.slice(week*7,week*7+7).map(day=><Pressable key={day} accessibilityRole="button" accessibilityLabel={day+'로 변경'} accessibilityState={{selected:selected.has(day)}} disabled={disabled} onPress={()=>onDay(day)} style={[styles.cell,compact&&styles.compactCell]}>
    <Text numberOfLines={1} style={[styles.date,!day.startsWith(month)&&{color:colors.muted},day===today&&styles.today,selected.has(day)&&styles.selected]}>{Number(day.slice(8))}</Text>
   </Pressable>)}
  </View>)}
 </View>;
}
const styles=StyleSheet.create({
 root:{minWidth:0},
 monthRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 monthLabel:{...typography.detail,color:colors.text,fontWeight:'600',flexShrink:1,textAlign:'center'},
 arrow:{width:44,minHeight:44,alignItems:'center',justifyContent:'center'},
 week:{flexDirection:'row'},
 weekday:{flex:1,textAlign:'center',...typography.caption,color:colors.muted},
 cell:{flex:1,minWidth:0,minHeight:40,alignItems:'center',justifyContent:'center'},
 compactCell:{minHeight:36},
 date:{...typography.detail,color:colors.text,textAlign:'center',alignSelf:'stretch',marginHorizontal:2,borderRadius:14},
 today:{backgroundColor:colors.pale,color:colors.blueText,fontWeight:'700'},
 selected:{color:colors.white,backgroundColor:colors.action,fontWeight:'700'},
});

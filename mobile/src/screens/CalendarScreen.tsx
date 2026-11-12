import {useSafeAreaInsets} from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {ScreenHeading} from '../ScreenHeading';
import {layout} from '../theme';
import { MotionPressable as Pressable, MotionModal as Modal } from '../motion';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, PanResponder, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { dateKey, monthDays } from '../domain';
import type { Todo } from '../domain';
import type { TodoStore } from '../useTodos';
import { typography } from '../theme';
import { colors, TodoRow } from '../ui';
export function CalendarScreen({ store, onAdd, onEdit }: { store: TodoStore; onAdd: (date: string) => void; onEdit: (todo: Todo) => void }) {
  const insets=useSafeAreaInsets();
  const [monthPicker,setMonthPicker]=useState(false);
  const [pickerDate,setPickerDate]=useState(new Date());
  const [view,setView]=useState<'month'|'week'>('month');
  const [selected, setSelected] = useState(dateKey(new Date()));
  const [month, setMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const { height } = useWindowDimensions();
  const rowHeight = Math.max(88, Math.min(120, (height - 280) / 6));
  const [external, setExternal] = useState<{id:string;title:string;dueDate:string|null;startAt?:string;endAt?:string;endDate?:string;allDay?:boolean}[]>([]), [integrationError,setIntegrationError] = useState(''), [importing,setImporting] = useState<string|null>(null);
  const requestVersion=useRef(0);const [nextCursor,setNextCursor]=useState<string|null>(null),[loadingExternal,setLoadingExternal]=useState(false);
  const monthKey=dateKey(month).slice(0,7);
  async function loadExternal(more=false){
    const run=++requestVersion.current;if(!store.user){setExternal([]);return;}setLoadingExternal(true);
    try{const query=new URLSearchParams({month:monthKey,...(more&&nextCursor?{cursor:nextCursor}:{})});const response=await store.featureRequest('/api/calendar/events?'+query) as {items:typeof external;nextCursor:string|null};if(run!==requestVersion.current)return;setExternal(previous=>more?[...new Map([...previous,...response.items].map(item=>[item.id,item])).values()]:response.items);setNextCursor(response.nextCursor);setIntegrationError('');}
    catch(e){if(run===requestVersion.current)setIntegrationError(e instanceof Error?e.message:'Google 일정을 불러오지 못했어요.');}
    finally{if(run===requestVersion.current)setLoadingExternal(false);}
  }
  useEffect(()=>{setExternal([]);setNextCursor(null);void loadExternal();return()=>{requestVersion.current++;};},[monthKey,store.user?.id]);
  const imported=new Set(store.todos.filter(todo=>todo.source?.provider==='google').map(todo=>todo.source!.externalId));
  const externalOnly=external;
  async function importEvent(id:string){setImporting(id);try{await store.featureRequest('/api/integrations/google/import','POST',{ids:[id]});await store.refresh();}catch(e){setIntegrationError(e instanceof Error?e.message:'추가하지 못했어요.');}finally{setImporting(null);}}
  const tasks = store.todos.filter(todo => todo.dueDate === selected);
  function shift(offset: number) { const next = new Date(month.getFullYear(), month.getMonth() + offset, 1); setMonth(next); setSelected(dateKey(next)); }
  const monthRef=useRef(month);monthRef.current=month;
  const swipe=useMemo(()=>PanResponder.create({onMoveShouldSetPanResponderCapture:(_,g)=>Math.abs(g.dx)>20&&Math.abs(g.dx)>Math.abs(g.dy)*1.6,onPanResponderRelease:(_,g)=>{if(Math.abs(g.dx)>55){const current=monthRef.current;const next=new Date(current.getFullYear(),current.getMonth()+(g.dx<0?1:-1),1);setMonth(next);setSelected(dateKey(next));}}}),[]);
  const weekStart=new Date(selected+'T12:00:00');weekStart.setDate(weekStart.getDate()-weekStart.getDay());
  const days=view==='month'?monthDays(month):Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d;});
  const occurs=(event:typeof external[number],day:string)=>event.dueDate===day||!!(event.dueDate&&event.endDate&&event.dueDate<day&&(event.endDate>day||(!event.allDay&&event.endDate===day&&!!event.endAt&&Date.parse(event.endAt)>Date.parse(day+'T00:00:00+09:00'))));
  const dailyEvents=externalOnly.filter(e=>occurs(e,selected));
  function today() { const date = new Date(); setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); setSelected(dateKey(date)); }
  return <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: layout.navigationHeight+insets.bottom+layout.sectionGap }} keyboardShouldPersistTaps="handled">
    <ScreenHeading title="캘린더"/>
    <View style={styles.toolbar}><Pressable style={styles.nav} onPress={() => shift(-1)} accessibilityRole="button" accessibilityLabel="이전 달"><Text style={styles.chevron}>‹</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="년월 선택" style={{flex:1,minHeight:44,justifyContent:'center'}} onPress={()=>{setPickerDate(month);setMonthPicker(true);}}><Text style={styles.month}>{new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(month)}⌄</Text></Pressable><Pressable style={styles.nav} onPress={() => shift(1)} accessibilityRole="button" accessibilityLabel="다음 달"><Text style={styles.chevron}>›</Text></Pressable><Pressable onPress={today} accessibilityRole="button" style={styles.nav}><Text style={styles.today}>오늘</Text></Pressable></View>
    <Modal visible={monthPicker} transparent animationType="slide" onRequestClose={()=>setMonthPicker(false)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#00000055'}}><View style={{backgroundColor:colors.white,padding:layout.sheetInset,borderTopLeftRadius:24,borderTopRightRadius:24,gap:16}}><Text style={styles.agendaTitle}>이동할 년·월</Text>{Platform.OS==='web'?<View style={{flexDirection:'row',gap:12}}>{[true,false].map(year=>React.createElement('select',{key:String(year),'aria-label':year?'이동할 년':'이동할 월',value:year?pickerDate.getFullYear():pickerDate.getMonth(),onChange:(e:React.ChangeEvent<HTMLSelectElement>)=>setPickerDate(new Date(year?Number(e.target.value):pickerDate.getFullYear(),year?pickerDate.getMonth():Number(e.target.value),1)),style:{padding:12,fontSize:18}},...Array.from({length:year?201:12},(_,i)=>{const v=year?1900+i:i;return React.createElement('option',{key:v,value:v},String(year?v:v+1)+(year?'년':'월'));})))}</View>:<DateTimePicker value={pickerDate} mode="date" display="spinner" locale="ko-KR" minimumDate={new Date(1900,0,1)} maximumDate={new Date(2100,11,31)} onChange={(_,date)=>{if(date)setPickerDate(date);}}/>}<Pressable accessibilityRole="button" accessibilityLabel="선택한 년월로 이동" onPress={()=>{const next=new Date(pickerDate.getFullYear(),pickerDate.getMonth(),1);setMonth(next);setSelected(dateKey(next));setMonthPicker(false);}} style={{padding:16,backgroundColor:colors.pale,borderRadius:16}}><Text style={styles.today}>이동</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="년월 선택 닫기" style={{padding:12}} onPress={()=>setMonthPicker(false)}><Text style={styles.today}>취소</Text></Pressable></View></View></Modal>
    <View style={{flexDirection:'row',paddingHorizontal:20,gap:12}}>{(['month','week'] as const).map(v=><Pressable key={v} accessibilityRole="button" accessibilityLabel={v==='month'?'월 보기':'주 보기'} onPress={()=>setView(v)} style={{padding:12}}><Text style={{color:view===v?colors.blue:colors.muted}}>{v==='month'?'월':'주'}</Text></Pressable>)}</View>
    <View style={styles.weekdays}>{['일', '월', '화', '수', '목', '금', '토'].map((day, index) => <Text key={day} style={[styles.weekday, { color: index === 0 ? colors.danger : index === 6 ? colors.blueText : colors.muted }]}>{day}</Text>)}</View>
    <View testID="calendar-date-grid" {...swipe.panHandlers} style={styles.grid}>{days.map(date => {
      const key = dateKey(date), items = [...externalOnly.filter(event=>occurs(event,key)).map(e=>({...e,done:false})),...store.todos.filter(todo=>todo.dueDate===key)], chosen = key === selected;
      return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일, 일정과 할 일 ${items.length}개`} accessibilityState={{ selected: chosen }} onPress={() => { setSelected(key); if (date.getMonth() !== month.getMonth()) setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }} style={[styles.day, { height: rowHeight }, chosen && styles.selected]}>
        <Text style={[styles.number, date.getMonth() !== month.getMonth() && styles.other, key === dateKey(new Date()) && { color: colors.blue, fontWeight: '700' }, chosen && styles.selectedNumber]}>{date.getDate()}</Text>
        {items.slice(0, 2).map(todo => <Text key={todo.id} numberOfLines={1} style={[styles.event, todo.done && styles.doneEvent]}>{todo.title}</Text>)}
        {items.length > 2 && <Text style={styles.more}>+{items.length - 2}</Text>}
      </Pressable>;
    })}</View>
    <View style={styles.agenda}><View {...swipe.panHandlers} style={styles.agendaHeading}><Text style={styles.agendaTitle}>{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(selected + 'T12:00:00'))}</Text><Pressable accessibilityRole="button" onPress={() => onAdd(selected)} style={{ padding: 12 }}><Text style={styles.today}>할 일 추가 ＋</Text></Pressable></View>
      {!tasks.length && !dailyEvents.length && <Text style={styles.empty}>이날은 일정과 할 일이 없어요.</Text>}
      <Text style={styles.agendaTitle}>일정</Text>
      {loadingExternal&&<Text style={styles.more}>일정을 불러오고 있어요.</Text>}
      {!loadingExternal&&!dailyEvents.length&&<Text style={styles.empty}>{store.user?'연결한 기본 캘린더에 표시할 일정이 없어요. 연결 권한과 날짜를 확인해주세요.':'Google 캘린더를 연결하면 일정을 표시해요.'}</Text>}

      {dailyEvents.map(event=><View key={event.id} style={{flexDirection:'row',alignItems:'center',paddingVertical:14,gap:10}}><View style={{flex:1}}><Text style={{color:colors.text,fontSize:17}}>{event.title}</Text><Text style={[styles.more,{marginTop:5}]}>{event.allDay?'종일':event.startAt?new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit'}).format(new Date(event.startAt))+(event.endAt?' – '+new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit'}).format(new Date(event.endAt)):''):'Google 캘린더'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={event.title+' 할 일로 추가'} disabled={!!importing||imported.has(event.id)} onPress={()=>{void importEvent(event.id);}} style={{padding:10}}><Text style={styles.today}>{imported.has(event.id)?'추가됨':'Todo로 추가'}</Text></Pressable></View>)}
      <Text style={[styles.agendaTitle,{marginTop:20}]}>할 일</Text>
      {tasks.map(todo => <TodoRow key={todo.id} todo={todo} busy={store.busyIds.includes(todo.id)} canToggleWhileBusy={store.completionIds.includes(todo.id)} onToggle={() => { void store.update(todo.id, { done: !todo.done }); }} onEdit={() => onEdit(todo)} />)}
      {nextCursor&&<Pressable accessibilityRole="button" disabled={loadingExternal} onPress={()=>{void loadExternal(true);}} style={{paddingVertical:14}}><Text style={styles.today}>이 달의 Google 일정 더 보기</Text></Pressable>}
      {!!integrationError&&<><Text accessibilityRole="alert" style={{color:colors.danger,fontSize:13,lineHeight:20}}>{integrationError}</Text><Pressable accessibilityRole="button" onPress={()=>{void loadExternal();}} style={{paddingVertical:12}}><Text style={styles.today}>Google 일정 새로고침</Text></Pressable></>}
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: layout.pageInset, paddingVertical: 4, gap: 4 }, nav: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  chevron: { color: colors.secondary, fontSize: 28 }, month: { ...typography.section, flex: 1, color: colors.text, fontWeight: '700' }, today: { ...typography.caption, color: colors.blueText, fontWeight: '600' },
  weekdays: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, weekday: { width: '14.285714%', ...typography.caption, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' }, day: { width: '14.285714%', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line, alignItems: 'center', paddingTop: 8, paddingHorizontal: 3, gap: 4, overflow: 'hidden' }, selected: { backgroundColor: colors.pale, borderRadius: 12 },
  number: { color: colors.secondary, minWidth: 30, minHeight: 30, lineHeight: 30, textAlign: 'center', borderRadius: 15, overflow: 'hidden', fontSize: 15 }, selectedNumber: { color: colors.white, backgroundColor: colors.blue }, other: { color: colors.muted },
  event: { fontSize: 11, lineHeight: 16, color: colors.blueText, backgroundColor: colors.pale, width: '100%', borderRadius: 4, paddingHorizontal: 3, overflow: 'hidden' }, doneEvent: { color: colors.subtle, backgroundColor: colors.grouped, textDecorationLine: 'line-through' },
  more: { color: colors.muted, fontSize: 11, lineHeight: 16, alignSelf: 'flex-start', marginLeft: 3 },
  agenda: { paddingHorizontal: 24, paddingTop: 24 }, agendaHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, agendaTitle: { ...typography.body, fontWeight: '600', color: colors.text }, empty: { ...typography.detail, color: colors.muted, paddingVertical: 24 },
});

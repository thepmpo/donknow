import React,{useState} from 'react';
import {Keyboard,Platform,StyleSheet,Text,View,useColorScheme} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {MotionPressable as Pressable} from './motion';
import {colors,typography} from './theme';
import {dateKey} from './domain';
type Mode='date'|'time';
export function DateTimePickerPanel({label,value,mode,onChange,onDone,onCancel,disabled=false}:{label:string;value:string;mode:Mode;onChange:(value:string)=>void;onDone:(value:string)=>void;onCancel:()=>void;disabled?:boolean}){
 const dark=useColorScheme()==='dark',nativeValue=mode==='date'?new Date(value+'T12:00:00'):new Date(2000,0,1,Number(value.slice(0,2)),Number(value.slice(3)));
 return <View style={s.picker} testID={'date-time-picker-'+label}>
  <View style={s.toolbar}><Text numberOfLines={1} style={[s.label,{flex:1}]}>{label} 선택</Text><Pressable accessibilityRole="button" accessibilityLabel={label+' 완료'} disabled={disabled} onPress={()=>onDone(value)} style={s.control}><Text style={[s.link,{fontWeight:'600'}]}>완료</Text></Pressable></View>
  {Platform.OS!=='web'&&<DateTimePicker accessibilityLabel={label+' 조절'} value={nativeValue} mode={mode} display={Platform.OS==='ios'?'spinner':'default'} locale="ko-KR" themeVariant={dark?'dark':'light'} textColor={dark?'#f5f5f7':'#191f28'} onChange={(event,date)=>{if(event.type==='dismissed'){onCancel();return;}if(!date)return;const next=mode==='date'?dateKey(date):`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;onChange(next);if(Platform.OS!=='ios')onDone(next);}} style={{alignSelf:'stretch',height:Platform.OS==='ios'?216:undefined}}/>}
 </View>;
}
/** Wheel changes edit the form draft; Done closes the picker without saving the form. */
export function DateTimeField({label,value,onChange,mode='date',disabled=false,clearable=false,stacked=false,inputLabel=label,activePicker,onPickerChange}:{label:string;value:string|null;onChange:(value:string|null)=>void;mode?:Mode;disabled?:boolean;clearable?:boolean;stacked?:boolean;inputLabel?:string;activePicker?:string|null;onPickerChange?:(value:string|null)=>void}){
 const [localOpen,setLocalOpen]=useState(false),[pending,setPending]=useState(''),dark=useColorScheme()==='dark';
 const open=onPickerChange?activePicker===inputLabel:localOpen;
 function setOpen(value:boolean){if(onPickerChange)onPickerChange(value?inputLabel:null);else setLocalOpen(value);}
 const initial=()=>value??(mode==='date'?dateKey(new Date()):'09:00');
 function begin(){if(disabled)return;Keyboard.dismiss();setPending(initial());setOpen(true);}
 function finish(next:string){if(!disabled)onChange(next);setOpen(false);}
 return <View style={s.root} testID={'date-time-field-'+inputLabel}>
  <View style={[s.row,stacked&&s.stacked]}><Text style={s.label}>{label}</Text>
   {Platform.OS==='web'?React.createElement('input',{type:mode,'aria-label':inputLabel,value:value??'',disabled,onFocus:()=>{setPending(initial());setOpen(true);},onChange:(event:React.ChangeEvent<HTMLInputElement>)=>{setPending(event.target.value);onChange(event.target.value||null);},style:{flex:1,minWidth:0,width:stacked?'100%':undefined,minHeight:44,boxSizing:'border-box',padding:10,fontSize:16,fontFamily:'inherit',border:0,borderRadius:12,color:colors.text,background:colors.grouped,colorScheme:dark?'dark':'light'}}):<Pressable accessibilityRole="button" accessibilityLabel={inputLabel} accessibilityState={{expanded:open,disabled}} disabled={disabled} onPress={()=>open?finish(pending||initial()):begin()} style={s.value}><Text style={s.valueText}>{value?(mode==='date'?value.replaceAll('-','.'):value):'날짜 선택'}</Text></Pressable>}
   {clearable&&!!value&&<Pressable accessibilityRole="button" accessibilityLabel={label==='예정일'?'날짜 해제':label+' 해제'} disabled={disabled} onPress={()=>{onChange(null);setOpen(false);}} style={s.control}><Text style={s.link}>해제</Text></Pressable>}
  </View>
  {open&&<DateTimePickerPanel label={inputLabel} value={pending||initial()} mode={mode} onChange={next=>{setPending(next);onChange(next);}} onDone={finish} onCancel={()=>setOpen(false)} disabled={disabled}/>}
 </View>;
}
/** Full-width expansion underneath a compact Apple-style start/end row. */
export function CalendarDateTimeRow({kind,day,time,allDay,disabled,open,onOpen,onDay,onTime}:{kind:'시작'|'종료';day:string;time:string;allDay:boolean;disabled:boolean;open:Mode|null;onOpen:(mode:Mode|null)=>void;onDay:(value:string)=>void;onTime:(value:string)=>void}){
 const [pending,setPending]=useState(''),dark=useColorScheme()==='dark';
 function begin(mode:Mode){Keyboard.dismiss();setPending(mode==='date'?day:time);onOpen(mode);}
 function finish(value:string){if(!disabled){if(open==='date')onDay(value);else onTime(value);}onOpen(null);}
 return <View style={{gap:6}}><View style={[s.row,{flexWrap:'wrap'}]}><Text style={[s.label,{flex:1,color:colors.text}]}>{kind}</Text>{(['date','time'] as const).filter(mode=>!allDay||mode==='date').map(mode=>{const label='일정 '+kind+(mode==='date'?'일':' 시간'),value=mode==='date'?day:time;return Platform.OS==='web'?React.createElement('input',{key:mode,type:mode,'aria-label':label,value,disabled,onChange:(event:React.ChangeEvent<HTMLInputElement>)=>(mode==='date'?onDay:onTime)(event.target.value),style:{flex:mode==='date'?1.25:1,width:0,minWidth:mode==='date'?136:112,maxWidth:'100%',minHeight:44,fontSize:15,border:0,borderRadius:12,padding:8,fontFamily:'inherit',color:colors.text,background:colors.grouped,colorScheme:dark?'dark':'light'}}):<Pressable key={mode} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{expanded:open===mode,disabled}} onPress={()=>open===mode?finish(pending||value):begin(mode)} style={[s.value,{flex:0,flexShrink:1}]}><Text style={s.valueText}>{mode==='date'?day.slice(2).replaceAll('-','.'):time}</Text></Pressable>;})}</View>
  {open&&<DateTimePickerPanel label={'일정 '+kind+(open==='date'?'일':' 시간')} value={pending||(open==='date'?day:time)} mode={open} disabled={disabled} onChange={next=>{setPending(next);if(open==='date')onDay(next);else onTime(next);}} onDone={finish} onCancel={()=>onOpen(null)}/>}
 </View>;
}
const s=StyleSheet.create({root:{minWidth:0,gap:6},row:{flexDirection:'row',alignItems:'center',gap:8,minHeight:44},stacked:{alignItems:'stretch',flexDirection:'column',gap:4},label:{...typography.caption,color:colors.muted},value:{minHeight:44,paddingHorizontal:12,paddingVertical:10,borderRadius:12,backgroundColor:colors.grouped,flex:1,minWidth:0,alignItems:'flex-end',justifyContent:'center'},valueText:{...typography.detail,color:colors.blueText},control:{minWidth:44,minHeight:44,paddingHorizontal:10,alignItems:'center',justifyContent:'center'},link:{...typography.detail,color:colors.blueText},picker:{backgroundColor:colors.popup,borderRadius:16,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.popupLine,overflow:'hidden'},toolbar:{minHeight:44,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:8}});

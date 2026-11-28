import {BrandLoading} from './BrandLoading';
import {useDesktopPresentation} from './DesktopPresentation';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Animated,PanResponder,Platform,StyleSheet,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {MotionPressable as Pressable,useReducedMotion} from './motion';
import {DateField} from './ui';
import {NotesField} from './NotesField';
import {colors,typography} from './theme';
import type {AssistantProposal} from './useAssistant';
import type {ChecklistEntry} from './assistant-checklist';
import {dateKey,type Todo} from './domain';
export function AssistantChecklist({proposal,number,busy,entry,todo,onAction,onExclude,onOpenTodos,onOpenLog,onCalendar,compact=false,sourceLabels=[],sourceLinks}:{sourceLinks?:React.ReactNode;onCalendar?:()=>void;compact?:boolean;sourceLabels?:string[];proposal:AssistantProposal;number:number;busy:boolean;entry:ChecklistEntry;todo?:Todo;onAction:(value:AssistantProposal,done:boolean)=>Promise<void>;onExclude:(excluded:boolean)=>void;onOpenTodos:()=>void;onOpenLog:()=>void}){
 const desktop=useDesktopPresentation();
 const [menu,setMenu]=useState(false),[expanded,setExpanded]=useState(false);
 const [editing,setEditing]=useState(false),[notesOpen,setNotesOpen]=useState(false),[value,setValue]=useState(proposal);
 const reduced=useReducedMotion(),offset=useRef(new Animated.Value(0)).current;
 const suppressUntil=useRef(0),swiping=useRef(false),lastIntent=useRef(false),captureDx=useRef(0);
 const locked=!!entry.action&&!['failed','cancelled','expired','restored-cancelled'].includes(entry.action.status);
 const linked=todo??entry.action?.result?.todo,done=!!linked?.done,excluded=!!entry.excluded,disabled=busy||!!entry.busy;
 const set=(key:string,v:unknown)=>setValue(old=>({...old,args:{...old.args,[key]:v}}));
 const current=useRef({disabled,editing,reduced,value,onAction,onExclude,onCalendar});current.current={disabled,editing,reduced,value,onAction,onExclude,onCalendar};
 function act(complete:boolean){if(current.current.disabled)return;lastIntent.current=complete;setEditing(false);void current.current.onAction(current.current.value,complete);}
 function exclude(){if(!current.current.disabled){setEditing(false);current.current.onExclude(true);}}
 function press(action:()=>void){if(!swiping.current&&Date.now()>=suppressUntil.current)action();}
 const reset=()=>{offset.stopAnimation();if(current.current.reduced)offset.setValue(0);else Animated.timing(offset,{toValue:0,duration:180,useNativeDriver:Platform.OS!=='web'}).start();};
 const responder=useMemo(()=>PanResponder.create({
  onMoveShouldSetPanResponderCapture:(_,g)=>{const capture=!current.current.disabled&&!current.current.editing&&Math.abs(g.dx)>12&&Math.abs(g.dx)>Math.abs(g.dy)*1.4;if(capture)captureDx.current=g.dx;return capture;},
  onPanResponderTerminationRequest:()=>false,
  onPanResponderGrant:()=>{offset.stopAnimation();swiping.current=true;},
  onPanResponderMove:(_,g)=>offset.setValue(Math.max(-88,Math.min(88,g.dx+captureDx.current))),
  onPanResponderRelease:(_,g)=>{const dx=g.dx+captureDx.current;captureDx.current=0;swiping.current=false;suppressUntil.current=Date.now()+300;reset();if(Math.abs(dx)>=64&&Math.abs(dx)>Math.abs(g.dy)*1.4&&!current.current.disabled){if(dx<0){if(current.current.onCalendar)current.current.onCalendar();else exclude();}else act(false);}},
  onPanResponderTerminate:()=>{captureDx.current=0;swiping.current=false;suppressUntil.current=Date.now()+300;reset();},
 }),[offset]);
 useEffect(()=>()=>offset.stopAnimation(),[offset]);
 const label='Ticket 후보 '+number;
 if(desktop&&compact)return <View testID={'assistant-checklist-'+number} style={web.card}>
  <View style={web.row}>
   <Pressable accessibilityRole="checkbox" accessibilityLabel={label+(excluded?' 제외 취소':done?' 완료 취소':' 완료 표시')} accessibilityState={{checked:done&&!excluded,disabled}} disabled={disabled} onPress={()=>press(()=>excluded?onExclude(false):act(!done))} style={web.check}>
    {entry.busy?<BrandLoading size={28}/>:<Ionicons name={excluded?'close-circle-outline':done?'checkbox-outline':'square-outline'} size={22} color={done?colors.blueText:colors.subtle}/>}
   </Pressable>
   <View style={web.body}>
    <View style={web.titleRow}><Text style={[web.title,(done||excluded)&&s.mutedTitle]}>{String(linked?.title??entry.action?.args.title??value.args.title??'')}</Text><Pressable accessibilityRole="button" accessibilityLabel={label+' 더보기'} accessibilityState={{expanded:menu}} disabled={disabled} onPress={()=>setMenu(v=>!v)} style={web.more}><Ionicons name="ellipsis-horizontal" size={16} color={colors.subtle}/></Pressable></View>
    <View style={web.metadata}>{sourceLinks??<Text style={web.meta}>{sourceLabels.join(' · ')||'docen에서 정리한 일'}</Text>}{!!value.args.dueDate&&<Text style={web.meta}> · {value.args.dueDate===dateKey(new Date())?'오늘까지':String(value.args.dueDate)}</Text>}</View>
    {!!value.args.notes&&!excluded&&<Text selectable style={web.note}>{expanded?String(value.args.notes):String(value.args.notes).slice(0,160)}{!expanded&&String(value.args.notes).length>160?'…':''}</Text>}
    {String(value.args.notes??'').length>160&&<Pressable accessibilityRole="button" accessibilityLabel={label+' 내용 '+(expanded?'접기':'더 보기')} onPress={()=>setExpanded(v=>!v)} style={s.control}><Text style={web.meta}>{expanded?'내용 접기':'내용 더 보기'}</Text></Pressable>}
    {editing&&!linked&&!excluded&&!locked&&<View style={{gap:8}}><TextInput accessibilityLabel={label+' 제목'} value={String(value.args.title??'')} onChangeText={v=>set('title',v)} editable={!disabled} maxLength={120} multiline style={s.input}/><DateField value={typeof value.args.dueDate==='string'?value.args.dueDate:null} onChange={v=>set('dueDate',v)}/><NotesField label={label+' 메모'} value={String(value.args.notes??'')} onChange={v=>set('notes',v)}/></View>}
    <View style={web.actions}>
     {excluded?<><Text style={web.meta}>채팅에서 제외됨</Text><Pressable accessibilityRole="button" accessibilityLabel={label+' 다시 포함'} disabled={disabled} onPress={()=>onExclude(false)} style={web.action}><Text style={web.actionText}>되돌리기</Text></Pressable></>:<>
      {linked?<Pressable accessibilityRole="button" accessibilityLabel={label+(done?' log 보기':' Ticket 보기')} disabled={disabled} onPress={done?onOpenLog:onOpenTodos} style={web.action}><Text style={web.actionText}>{done?'완료됨 · log 보기':'Ticket에 추가됨 · 보기'}</Text></Pressable>:<Pressable accessibilityRole="button" accessibilityLabel={label+' Ticket에 추가'} disabled={disabled||!String(value.args.title??'').trim()} onPress={()=>press(()=>act(false))} style={web.action}><Ionicons name="add" size={14} color={colors.blueText}/><Text style={web.actionText}>Ticket으로</Text></Pressable>}
      {onCalendar&&!done&&(entry.calendarAdded?<Text style={web.meta}>캘린더에 추가됨</Text>:<Pressable accessibilityRole="button" accessibilityLabel={label+' 캘린더로 이동'} disabled={disabled} onPress={()=>press(onCalendar)} style={web.action}><Ionicons name="calendar-outline" size={14} color={colors.blueText}/><Text style={web.actionText}>Event로</Text></Pressable>)}
      {!done&&!linked&&<Pressable accessibilityRole="button" accessibilityLabel={label+' 대화에서 마치기'} disabled={disabled} onPress={()=>press(()=>act(true))} style={web.finish}><Text style={web.meta}>대화에서 마치기</Text></Pressable>}
     </>}
    </View>
    {menu&&!linked&&!excluded&&!locked&&<View style={web.actions}><Pressable accessibilityRole="button" accessibilityLabel={label+' 수정'} disabled={disabled} onPress={()=>setEditing(v=>!v)} style={web.action}><Text style={web.actionText}>수정</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={label+' Ticket 아님'} disabled={disabled} onPress={()=>press(exclude)} style={web.action}><Text style={web.meta}>제외</Text></Pressable></View>}
    {!!entry.error&&<View><Text accessibilityRole="alert" style={s.error}>{entry.error}</Text><Pressable accessibilityRole="button" accessibilityLabel={label+' 저장 상태 다시 확인'} disabled={disabled} onPress={()=>press(()=>act(lastIntent.current))} style={web.action}><Text style={web.actionText}>다시 확인</Text></Pressable></View>}
   </View>
  </View>
 </View>;
 return <View testID={'assistant-checklist-'+number} style={[s.wrap,compact&&{borderRadius:0,backgroundColor:'transparent'}]}>
  <View style={s.behind} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Text style={s.swipeLabel}>Ticket에 추가</Text><Text style={s.swipeLabel}>{onCalendar?'캘린더':'제외 ×'}</Text></View>
  <Animated.View testID={'assistant-checklist-row-'+number} {...responder.panHandlers} style={[s.card,desktop&&{backgroundColor:colors.bg},compact&&{borderRadius:0,padding:0,paddingBottom:8},{transform:[{translateX:offset}]}]}>
   <View style={s.row}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label+(excluded?' 제외 취소':done?' 완료 취소':' 완료 표시')} accessibilityHint={excluded?'채팅 후보로 되돌려요.':done?'기존 항목을 미완료로 바꿔 Ticket로 옮겨요.':'완료한 Ticket으로 저장하고 log에 남겨요.'} accessibilityState={{checked:done&&!excluded,disabled}} disabled={disabled} onPress={()=>press(()=>excluded?onExclude(false):act(!done))} style={s.control}>
     {entry.busy?<BrandLoading size={28}/>:excluded?<View style={s.cancelBox}><Ionicons name="close" size={17} color={colors.muted}/></View>:<Ionicons name={done?'checkbox':'square-outline'} size={23} color={done?colors.action:colors.muted}/>}
    </Pressable>
    <Text selectable={false} numberOfLines={3} style={[s.title,compact&&{fontSize:16,lineHeight:24,fontWeight:'600'},(done||excluded)&&s.mutedTitle]}>{String(linked?.title??entry.action?.args.title??value.args.title??'')}</Text>
    {!linked&&!excluded&&!locked&&<Pressable accessibilityRole="button" accessibilityLabel={label+(compact?' 더보기':' 수정')} accessibilityState={{expanded:compact?menu:editing}} disabled={disabled} onPress={()=>press(()=>compact?setMenu(v=>!v):setEditing(v=>!v))} style={s.control}><Ionicons name="ellipsis-horizontal" size={20} color={colors.muted}/></Pressable>}
   </View>
   {compact&&!excluded&&<View style={{paddingLeft:44,gap:5}}>{!!value.args.notes&&<Text selectable style={{fontSize:14,lineHeight:22,color:colors.secondary}}>{expanded?String(value.args.notes):String(value.args.notes).slice(0,120)}{!expanded&&String(value.args.notes).length>120?'…':''}</Text>}{String(value.args.notes??'').length>120&&<Pressable accessibilityRole="button" accessibilityLabel={label+' 내용 '+(expanded?'접기':'더 보기')} onPress={()=>setExpanded(v=>!v)} style={{minHeight:44,justifyContent:'center'}}><Text style={s.link}>{expanded?'내용 접기':'내용 더 보기'}</Text></Pressable>}<View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8}}>{(!!value.args.dueDate||sourceLabels.length>0)&&<Text style={s.meta}>{[value.args.dueDate,...sourceLabels].filter(Boolean).join(' · ')}</Text>}{sourceLinks}</View></View>}
   {editing&&!linked&&!excluded&&!locked&&<View style={{gap:8}}><TextInput accessibilityLabel={label+' 제목'} value={String(value.args.title??'')} onChangeText={v=>set('title',v)} editable={!disabled} maxLength={120} multiline style={s.input}/><DateField value={typeof value.args.dueDate==='string'?value.args.dueDate:null} onChange={v=>set('dueDate',v)}/><Pressable accessibilityRole="button" accessibilityLabel={`${label} 메모 ${notesOpen?'접기':'열기'}`} onPress={()=>setNotesOpen(v=>!v)} style={s.control}><Text style={s.link}>메모 {notesOpen?'접기':'편집'}</Text></Pressable>{notesOpen&&<NotesField label={label+' 메모'} value={String(value.args.notes??'')} onChange={v=>set('notes',v)}/>}</View>}
   {(!compact||desktop||menu||!!linked||excluded||entry.calendarAdded)&&<View style={[s.actions,desktop&&{paddingLeft:44,justifyContent:'flex-start'}]}>
    {excluded?<><Text style={[s.meta,{flex:1}]}>채팅에서 제외됨</Text><Pressable accessibilityRole="button" accessibilityLabel={label+' 다시 포함'} disabled={disabled} onPress={()=>press(()=>onExclude(false))} style={s.control}><Text style={s.link}>되돌리기</Text></Pressable></>:<>
     {compact&&menu&&!linked&&<Pressable accessibilityRole="button" accessibilityLabel={label+' 수정'} disabled={disabled} onPress={()=>setEditing(v=>!v)} style={s.control}><Text style={s.link}>수정</Text></Pressable>}
     {onCalendar&&!done&&(entry.calendarAdded?<Text style={s.meta}>캘린더에 추가됨</Text>:<Pressable accessibilityRole="button" accessibilityLabel={label+' 캘린더로 이동'} disabled={disabled} onPress={()=>press(onCalendar)} style={s.control}><Ionicons name="calendar-outline" size={17} color={colors.blueText}/><Text style={s.link}>캘린더</Text></Pressable>)}
     {(!desktop||menu)&&<Pressable accessibilityRole="button" accessibilityLabel={label+' Ticket 아님'} disabled={disabled} onPress={()=>press(exclude)} style={s.control}><Text style={s.meta}>제외</Text></Pressable>}
     {linked?<Pressable accessibilityRole="button" accessibilityLabel={label+(done?' log 보기':' Ticket 보기')} disabled={disabled} onPress={()=>press(done?onOpenLog:onOpenTodos)} style={s.control}><Text style={s.link}>{done?'완료됨 · log 보기':'Ticket에 추가됨 · 보기'}</Text></Pressable>:<Pressable accessibilityRole="button" accessibilityLabel={label+' Ticket에 추가'} disabled={disabled||!String(value.args.title??'').trim()} onPress={()=>press(()=>act(false))} style={s.control}><Text style={s.link}>Ticket에 추가</Text><Ionicons name="add" size={17} color={colors.blueText}/></Pressable>}
    </>}
   </View>}
   {!!entry.error&&<View style={{gap:4}}><Text accessibilityRole="alert" style={s.error}>{entry.error}</Text><Pressable accessibilityRole="button" accessibilityLabel={label+' 저장 상태 다시 확인'} disabled={disabled} onPress={()=>press(()=>act(lastIntent.current))} style={s.control}><Text style={s.link}>다시 확인</Text></Pressable></View>}
  </Animated.View>
 </View>;
}
const s=StyleSheet.create({wrap:{borderRadius:20,overflow:'hidden',backgroundColor:colors.grouped},behind:{position:'absolute',top:0,bottom:0,left:0,right:0,flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:12},swipeLabel:{...typography.caption,color:colors.muted},card:{backgroundColor:colors.surface,borderRadius:20,padding:8,gap:2},row:{flexDirection:'row',alignItems:'center',gap:4},title:{...typography.body,color:colors.text,flex:1},mutedTitle:{textDecorationLine:'line-through',color:colors.muted},cancelBox:{width:20,height:20,borderRadius:3,borderWidth:1.5,borderColor:colors.muted,alignItems:'center',justifyContent:'center'},control:{minWidth:44,minHeight:44,paddingHorizontal:8,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4},actions:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:4,flexWrap:'wrap'},meta:{...typography.caption,color:colors.muted},link:{...typography.detail,color:colors.blueText,fontWeight:'500'},input:{minHeight:44,...typography.body,color:colors.text,padding:8,borderBottomWidth:1,borderColor:colors.line},error:{...typography.caption,color:colors.danger}});

const web=StyleSheet.create({card:{paddingTop:13,paddingBottom:14,borderBottomWidth:1,borderColor:colors.line},row:{flexDirection:'row',gap:0,alignItems:'flex-start'},check:{width:32,minHeight:44,marginTop:-10,marginLeft:-7,marginRight:7,alignItems:'center',justifyContent:'center'},body:{flex:1,minWidth:0,gap:4},titleRow:{flexDirection:'row',gap:8,alignItems:'flex-start'},title:{flex:1,fontSize:13,lineHeight:21,fontWeight:'600',color:colors.text},more:{minHeight:44,minWidth:44,marginTop:-11,marginBottom:-11,alignItems:'center',justifyContent:'center'},metadata:{minHeight:18,flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:0},meta:{fontSize:10,lineHeight:17,color:colors.subtle},note:{fontSize:11,lineHeight:20,color:colors.muted,marginTop:2},actions:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:6,marginTop:5},action:{minHeight:44,paddingHorizontal:9,flexDirection:'row',alignItems:'center',gap:4,borderRadius:5,backgroundColor:colors.surface},actionText:{fontSize:11,color:colors.blueText},finish:{minHeight:44,paddingHorizontal:8,justifyContent:'center'}});

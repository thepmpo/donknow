import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Animated,PanResponder,Platform,StyleSheet,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {MotionPressable as Pressable,useReducedMotion} from './motion';
import {DateField} from './ui';
import {NotesField} from './NotesField';
import {colors,typography} from './theme';
import type {AssistantProposal} from './useAssistant';
import type {ChecklistEntry} from './assistant-checklist';
import type {Todo} from './domain';
export function AssistantChecklist({proposal,number,busy,entry,todo,onAction,onExclude,onOpenTodos,onOpenLog}:{proposal:AssistantProposal;number:number;busy:boolean;entry:ChecklistEntry;todo?:Todo;onAction:(value:AssistantProposal,done:boolean)=>Promise<void>;onExclude:(excluded:boolean)=>void;onOpenTodos:()=>void;onOpenLog:()=>void}){
 const [editing,setEditing]=useState(false),[notesOpen,setNotesOpen]=useState(false),[value,setValue]=useState(proposal);
 const reduced=useReducedMotion(),offset=useRef(new Animated.Value(0)).current;
 const suppressUntil=useRef(0),swiping=useRef(false),lastIntent=useRef(false),captureDx=useRef(0);
 const locked=!!entry.action&&!['failed','cancelled','expired','restored-cancelled'].includes(entry.action.status);
 const linked=todo??entry.action?.result?.todo,done=!!linked?.done,excluded=!!entry.excluded,disabled=busy||!!entry.busy;
 const set=(key:string,v:unknown)=>setValue(old=>({...old,args:{...old.args,[key]:v}}));
 const current=useRef({disabled,editing,reduced,value,onAction,onExclude});current.current={disabled,editing,reduced,value,onAction,onExclude};
 function act(complete:boolean){if(current.current.disabled)return;lastIntent.current=complete;setEditing(false);void current.current.onAction(current.current.value,complete);}
 function exclude(){if(!current.current.disabled){setEditing(false);current.current.onExclude(true);}}
 function press(action:()=>void){if(!swiping.current&&Date.now()>=suppressUntil.current)action();}
 const reset=()=>{offset.stopAnimation();if(current.current.reduced)offset.setValue(0);else Animated.timing(offset,{toValue:0,duration:180,useNativeDriver:Platform.OS!=='web'}).start();};
 const responder=useMemo(()=>PanResponder.create({
  onMoveShouldSetPanResponderCapture:(_,g)=>{const capture=!current.current.disabled&&!current.current.editing&&Math.abs(g.dx)>12&&Math.abs(g.dx)>Math.abs(g.dy)*1.4;if(capture)captureDx.current=g.dx;return capture;},
  onPanResponderTerminationRequest:()=>false,
  onPanResponderGrant:()=>{offset.stopAnimation();swiping.current=true;},
  onPanResponderMove:(_,g)=>offset.setValue(Math.max(-88,Math.min(88,g.dx+captureDx.current))),
  onPanResponderRelease:(_,g)=>{const dx=g.dx+captureDx.current;captureDx.current=0;swiping.current=false;suppressUntil.current=Date.now()+300;reset();if(Math.abs(dx)>=64&&Math.abs(dx)>Math.abs(g.dy)*1.4&&!current.current.disabled){if(dx<0)exclude();else act(false);}},
  onPanResponderTerminate:()=>{captureDx.current=0;swiping.current=false;suppressUntil.current=Date.now()+300;reset();},
 }),[offset]);
 useEffect(()=>()=>offset.stopAnimation(),[offset]);
 const label='할 일 후보 '+number;
 return <View testID={'assistant-checklist-'+number} style={s.wrap}>
  <View style={s.behind} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Text style={s.swipeLabel}>Todo에 추가</Text><Text style={s.swipeLabel}>제외 ×</Text></View>
  <Animated.View testID={'assistant-checklist-row-'+number} {...responder.panHandlers} style={[s.card,{transform:[{translateX:offset}]}]}>
   <View style={s.row}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label+(excluded?' 제외 취소':done?' 완료 취소':' 완료 표시')} accessibilityHint={excluded?'채팅 후보로 되돌려요.':done?'기존 항목을 미완료로 바꿔 Todo로 옮겨요.':'완료한 할 일로 저장하고 log에 남겨요.'} accessibilityState={{checked:done&&!excluded,disabled}} disabled={disabled} onPress={()=>press(()=>excluded?onExclude(false):act(!done))} style={s.control}>
     {entry.busy?<ActivityIndicator size="small" color={colors.blueText}/>:excluded?<View style={s.cancelBox}><Ionicons name="close" size={17} color={colors.muted}/></View>:<Ionicons name={done?'checkbox':'square-outline'} size={23} color={done?colors.action:colors.muted}/>}
    </Pressable>
    <Text selectable={false} numberOfLines={3} style={[s.title,(done||excluded)&&s.mutedTitle]}>{String(linked?.title??entry.action?.args.title??value.args.title??'')}</Text>
    {!linked&&!excluded&&!locked&&<Pressable accessibilityRole="button" accessibilityLabel={label+' 수정'} accessibilityState={{expanded:editing}} disabled={disabled} onPress={()=>press(()=>setEditing(v=>!v))} style={s.control}><Ionicons name="ellipsis-horizontal" size={20} color={colors.muted}/></Pressable>}
   </View>
   {editing&&!linked&&!excluded&&!locked&&<View style={{gap:8}}><TextInput accessibilityLabel={label+' 제목'} value={String(value.args.title??'')} onChangeText={v=>set('title',v)} editable={!disabled} maxLength={120} multiline style={s.input}/><DateField value={typeof value.args.dueDate==='string'?value.args.dueDate:null} onChange={v=>set('dueDate',v)}/><Pressable accessibilityRole="button" accessibilityLabel={`${label} 메모 ${notesOpen?'접기':'열기'}`} onPress={()=>setNotesOpen(v=>!v)} style={s.control}><Text style={s.link}>메모 {notesOpen?'접기':'편집'}</Text></Pressable>{notesOpen&&<NotesField label={label+' 메모'} value={String(value.args.notes??'')} onChange={v=>set('notes',v)}/>}</View>}
   <View style={s.actions}>
    {excluded?<><Text style={[s.meta,{flex:1}]}>채팅에서 제외됨</Text><Pressable accessibilityRole="button" accessibilityLabel={label+' 다시 포함'} disabled={disabled} onPress={()=>press(()=>onExclude(false))} style={s.control}><Text style={s.link}>되돌리기</Text></Pressable></>:<>
     <Pressable accessibilityRole="button" accessibilityLabel={label+' 할 일 아님'} disabled={disabled} onPress={()=>press(exclude)} style={s.control}><Text style={s.meta}>제외</Text></Pressable>
     {linked?<Pressable accessibilityRole="button" accessibilityLabel={label+(done?' log 보기':' Todo 보기')} disabled={disabled} onPress={()=>press(done?onOpenLog:onOpenTodos)} style={s.control}><Text style={s.link}>{done?'완료됨 · log 보기':'Todo에 추가됨 · 보기'}</Text></Pressable>:<Pressable accessibilityRole="button" accessibilityLabel={label+' Todo에 추가'} disabled={disabled||!String(value.args.title??'').trim()} onPress={()=>press(()=>act(false))} style={s.control}><Text style={s.link}>Todo에 추가</Text><Ionicons name="add" size={17} color={colors.blueText}/></Pressable>}
    </>}
   </View>
   {!!entry.error&&<View style={{gap:4}}><Text accessibilityRole="alert" style={s.error}>{entry.error}</Text><Pressable accessibilityRole="button" accessibilityLabel={label+' 저장 상태 다시 확인'} disabled={disabled} onPress={()=>press(()=>act(lastIntent.current))} style={s.control}><Text style={s.link}>다시 확인</Text></Pressable></View>}
  </Animated.View>
 </View>;
}
const s=StyleSheet.create({wrap:{borderRadius:20,overflow:'hidden',backgroundColor:colors.grouped},behind:{position:'absolute',top:0,bottom:0,left:0,right:0,flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:12},swipeLabel:{...typography.caption,color:colors.muted},card:{backgroundColor:colors.surface,borderRadius:20,padding:8,gap:2},row:{flexDirection:'row',alignItems:'center',gap:4},title:{...typography.body,color:colors.text,flex:1},mutedTitle:{textDecorationLine:'line-through',color:colors.muted},cancelBox:{width:20,height:20,borderRadius:3,borderWidth:1.5,borderColor:colors.muted,alignItems:'center',justifyContent:'center'},control:{minWidth:44,minHeight:44,paddingHorizontal:8,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4},actions:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:4,flexWrap:'wrap'},meta:{...typography.caption,color:colors.muted},link:{...typography.detail,color:colors.blueText,fontWeight:'500'},input:{minHeight:44,...typography.body,color:colors.text,padding:8,borderBottomWidth:1,borderColor:colors.line},error:{...typography.caption,color:colors.danger}});

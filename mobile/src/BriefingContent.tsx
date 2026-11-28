import {useDesktopPresentation} from './DesktopPresentation';
import React,{useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {BriefingChecklist} from './BriefingChecklist';
import {MotionPressable as Pressable} from './motion';
import {colors} from './theme';
import type {TodoStore} from './useTodos';
import type {ScheduledMessage} from './useAutomations';
export function BriefingContent({store,message,conversation=false,onOpenTodos,onOpenLog,onReveal}:{store:TodoStore;message:ScheduledMessage;conversation?:boolean;onOpenTodos:()=>void;onOpenLog:()=>void;onReveal?:()=>void}){
 const desktop=useDesktopPresentation();
 const [full,setFull]=useState(false),items=message.items??[],groups=new Map<string,{label:string;sections:Map<string,typeof items>}>();
 const labels:Record<string,string>={urgent:'지금 확인',new:'새로 확인한 일',open:'이어서 확인할 Ticket',due:'기한·회신 확인'};
 for(const item of items){const group=item.group&&labels[item.group]?item.group:conversation?'new':'open',section=item.section?.trim()??'';if(!groups.has(group))groups.set(group,{label:labels[group],sections:new Map()});const list=groups.get(group)!.sections;if(!list.has(section))list.set(section,[]);list.get(section)!.push(item);}
 const sorted=[...groups].sort((a,b)=>['urgent','new','open','due'].indexOf(a[0])-['urgent','new','open','due'].indexOf(b[0]));
 const summary=conversation||['agent','urgent','weather'].includes(message.kind)?message.text:message.summary??(items.length?'확인할 Ticket을 '+items.length+'개로 정리했어요.':message.text);
 return <View testID="briefing-content" style={{gap:desktop?0:8}}>{!conversation&&!desktop&&<View style={{gap:5}}><Text accessibilityRole="header" style={s.title}>{message.title}</Text><Text style={s.time}>{new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(message.createdAt)}</Text></View>}{(!desktop||!items.length)&&<Text selectable style={s.summary}>{summary}</Text>}{items.length>0&&!desktop&&<Text style={s.hint}>체크하면 완료 · 오른쪽은 Todo · 왼쪽은 캘린더</Text>}
  {sorted.map(([key,group])=><View key={key} style={{gap:desktop?0:8,marginTop:desktop?0:10}}>{!desktop&&<Text accessibilityRole="header" style={s.group}>{group.label}</Text>}{[...group.sections].map(([section,rows],sectionIndex)=><View key={section} style={{gap:desktop?0:4}}>{!!section&&(!desktop||items.length>3)&&<Text accessibilityRole="header" style={s.section}>{sectionIndex+1}. {section}</Text>}{rows.map(item=><BriefingChecklist key={item.key} store={store} messageId={message.id} conversation={conversation} item={item} number={items.indexOf(item)+1} sources={message.sources} onReveal={onReveal} onOpenTodos={onOpenTodos} onOpenLog={onOpenLog}/>)}</View>)}</View>)}
  {items.length>0&&message.text&&(message.text!==summary||desktop)&&<><Pressable accessibilityRole="button" accessibilityLabel="브리핑 전체 내용 보기" accessibilityState={{expanded:full}} onPress={()=>setFull(v=>!v)} style={{minHeight:44,justifyContent:'center'}}><Text style={[s.link,desktop&&{fontSize:10,color:colors.subtle}]}>{full?'전체 내용 접기':'전체 내용 보기'}</Text></Pressable>{full&&<Text selectable style={s.summary}>{message.text}</Text>}</>}
 </View>;
}
const s=StyleSheet.create({title:{fontSize:20,lineHeight:28,fontWeight:'700',color:colors.text},time:{fontSize:12,lineHeight:18,color:colors.muted},summary:{fontSize:15,lineHeight:23,color:colors.secondary},hint:{fontSize:12,lineHeight:19,color:colors.muted},group:{fontSize:14,lineHeight:22,fontWeight:'600',color:colors.muted},section:{fontSize:17,lineHeight:25,fontWeight:'700',color:colors.text,marginTop:8},link:{fontSize:13,color:colors.blueText}});

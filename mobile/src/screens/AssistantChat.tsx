import {ChatArrival,ChatFeedback} from '../ChatFeedback';
import {AssistantChecklist} from '../AssistantChecklist';
import {ScrollArea as ScrollView} from '../ScrollArea';
import type {ScheduledMessage} from '../useAutomations';
import React,{useEffect,useRef,useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import type {LayoutChangeEvent} from 'react-native';
import {MotionPressable as Pressable,useReducedMotion} from '../motion';
import {Button,colors,DateField} from '../ui';
import {NotesField} from '../NotesField';
import {typography} from '../theme';
import type {TodoStore} from '../useTodos';
import type {AssistantDraft} from '../useAssistant';
import {useAssistant,assistantNames,assistantLabels,assistantStatusLabels,assistantTargetKeys,assistantValue} from '../useAssistant';

export type AssistantChatRequest={id:number;message:string;pastedText?:string};
/** The main Duck conversation. Opening or typing never runs the model or an action. */
export function AssistantChat({store,onOpenTodos,request,children,shortcuts,onBusyChange,refreshVersion,scheduledMessages=[],active=true}:{scheduledMessages?:ScheduledMessage[];active?:boolean;store:TodoStore;onOpenTodos:()=>void;request:AssistantChatRequest|null;children?:React.ReactNode;shortcuts:React.ReactNode;onBusyChange:(busy:boolean)=>void;refreshVersion:number}){
 const assistant=useAssistant(store);
 const reduced=useReducedMotion();
 const [inputHeight,setInputHeight]=useState(44),[pasteConsent,setPasteConsent]=useState(false);const inputRef=useRef('');
 const [input,setInput]=useState(''),[pastedText,setPastedText]=useState(''),[settingsOpen,setSettingsOpen]=useState(false),[detailsOpen,setDetailsOpen]=useState(false),[toolsOpen,setToolsOpen]=useState(false),[proposalNotes,setProposalNotes]=useState<Record<number,boolean>>({}),[expandedDrafts,setExpandedDrafts]=useState<Record<string,boolean>>({});
 const [prepared,setPrepared]=useState<Record<string,string>>({}),[notice,setNotice]=useState(''),[historyOpen,setHistoryOpen]=useState(false);
 const isHistory=(status:string)=>['succeeded','cancelled','restored-cancelled'].includes(status);
 const history=assistant.drafts.filter(draft=>isHistory(draft.status)),needsAttention=assistant.drafts.filter(draft=>!isHistory(draft.status));
 const lastRequest=useRef<number|null>(null),scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
 const [scrollRequest,setScrollRequest]=useState({target:'',sequence:0});
 const anchorPositions=useRef<Record<string,number>>({});
 const pendingScroll=useRef(''),lastScheduled=useRef('');
 function reveal(target:string){if(target.startsWith('draft:'))setHistoryOpen(true);pendingScroll.current=target;setScrollRequest(previous=>({target,sequence:previous.sequence+1}));}
 function anchorKey(target:string){return target===scrollRequest.target?`${target}:${scrollRequest.sequence}`:target;}
 function anchorLayout(target:string,event:LayoutChangeEvent){anchorPositions.current[target]=event.nativeEvent.layout.y;if(pendingScroll.current===target)scroll.current?.scrollTo({y:Math.max(0,event.nativeEvent.layout.y-8),animated:!reduced});}
 useEffect(()=>{const target=scrollRequest.target;if(!target)return;const timer=setTimeout(()=>{const y=anchorPositions.current[target];if(pendingScroll.current===target&&y!==undefined){scroll.current?.scrollTo({y:Math.max(0,y-8),animated:!reduced});pendingScroll.current='';}},50);return()=>clearTimeout(timer);},[scrollRequest,reduced]);
 useEffect(()=>{const id=scheduledMessages.at(-1)?.id;if(active&&id&&lastScheduled.current!==id){lastScheduled.current=id;reveal('scheduled:'+id);}},[active,scheduledMessages]);
 useEffect(()=>{if(refreshVersion>0)void assistant.load();},[refreshVersion]);
 useEffect(()=>{onBusyChange(assistant.busy);return()=>onBusyChange(false);},[assistant.busy,onBusyChange]);
 const owner=`${store.connection?.mode==='cloud'?store.connection.baseUrl:'demo'}:${store.user?.id??''}`;
 useEffect(()=>{setInput('');inputRef.current='';setPastedText('');setPasteConsent(false);lastScheduled.current='';setPrepared({});setNotice('');setHistoryOpen(false);setSettingsOpen(false);setDetailsOpen(false);setToolsOpen(false);setProposalNotes({});setExpandedDrafts({});pendingScroll.current='';lastRequest.current=null;},[owner]);
 useEffect(()=>{if(request&&lastRequest.current!==request.id){lastRequest.current=request.id;setInput(request.message);inputRef.current=request.message;setPastedText(request.pastedText??'');setPasteConsent(false);setNotice('');}},[request?.id]);
 async function send(){
  if(!input.trim()||!assistant.consent||assistant.busy||(!!pastedText&&!pasteConsent))return;
  const text=input.trim();reveal('pending');
  if(await assistant.chat(text,pastedText)){if(inputRef.current.trim()===text){setInput('');inputRef.current='';}setPastedText('');setPasteConsent(false);setProposalNotes({});setNotice('');setToolsOpen(false);setSettingsOpen(false);reveal('reply');}
 }
 function editProposal(index:number,key:string,value:unknown){assistant.setProposals(old=>old.map((proposal,i)=>i===index?{...proposal,args:{...proposal.args,[key]:value}}:proposal));}
 const consentNeeded=(!!input.trim()||!!pastedText)&&(!assistant.consent||!!pastedText&&!pasteConsent);
 const verificationNeeded=assistant.error.includes('이메일 인증');
 const feedback=verificationNeeded?`${assistant.error} ME → 내 계정 → 이메일 인증에서 완료해주세요.`:assistant.error;
 function renderDraft(draft:AssistantDraft){const terminal=isHistory(draft.status),folded=terminal&&!expandedDrafts[draft.id];return <View key={anchorKey(`draft:${draft.id}`)} testID={`duck-action-${draft.id}`} onLayout={event=>anchorLayout(`draft:${draft.id}`,event)} style={folded?styles.historyRow:styles.card}>
    {folded?<Pressable accessibilityRole="button" accessibilityLabel={`${draft.label} 실행 내용 보기 ${draft.id}`} accessibilityState={{expanded:false}} onPress={()=>setExpandedDrafts(old=>({...old,[draft.id]:true}))} style={styles.historySummary}><View style={{flex:1,minWidth:0,gap:4}}><Text numberOfLines={1} style={styles.secondary}>{draft.label} · {assistantStatusLabels[draft.status]??draft.status}</Text><Text numberOfLines={1} style={styles.body}>{String(draft.args.title??draft.args.subject??draft.targetTitle??'처리한 내용')}</Text></View><Text style={styles.secondary}>›</Text></Pressable>:<>
    <Text style={styles.cardTitle}>{draft.label} · {assistantStatusLabels[draft.status]??draft.status}</Text>
    {!!draft.accountLabel&&<Text style={styles.body}>연결 계정: {draft.accountLabel}</Text>}
    {!!draft.targetTitle&&<Text style={styles.body}>대상: {draft.targetTitle}</Text>}
    {!!draft.recipient&&<Text style={styles.body}>받는 사람: {draft.recipient}</Text>}
    {Object.entries(draft.args).filter(([key,value])=>!assistantTargetKeys.includes(key)&&!(key==='notes'&&!value)).map(([key,value])=><Text key={key} selectable style={styles.body}>{assistantLabels[key]??key}: {assistantValue(key,value)}</Text>)}
    {!!draft.result?.message&&<Text style={styles.secondary}>{draft.result.message}</Text>}
    {draft.status==='unknown'&&<Text style={styles.error}>처리됐는지 확인하지 못했어요. 원본 서비스에서 확인한 뒤 다음 작업을 진행해주세요.</Text>}
    {draft.status==='pending'&&<>
     <Text style={styles.secondary}>내용과 대상을 확인한 뒤 실행해주세요. 확인 전에는 저장하거나 보내지 않아요.</Text>
     <Button title={`${draft.label} 확인하고 실행`} disabled={assistant.busy||draft.expiresAt<=Date.now()} onPress={()=>{void (async()=>{await assistant.confirm(draft);reveal(`draft:${draft.id}`);})();}}/>
     <Button title="작업 취소" quiet disabled={assistant.busy} onPress={()=>{void (async()=>{await assistant.cancel(draft);reveal(`draft:${draft.id}`);})();}}/>
    </>}
    </>}
    {terminal&&!folded&&<Button title="실행 내용 접기" accessibilityLabel={`${draft.label} 실행 내용 접기 ${draft.id}`} expanded quiet onPress={()=>setExpandedDrafts(old=>({...old,[draft.id]:false}))}/>}
    {!folded&&draft.status==='succeeded'&&draft.operation.startsWith('todo.')&&<Button title="Todo 보기 →" quiet onPress={onOpenTodos}/>}
   </View>;}
 return <View style={styles.screen}>
  <ScrollView ref={scroll} testID="duck-chat-scroll" style={styles.scroll} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
   {!assistant.turns.length&&!assistant.drafts.length&&!scheduledMessages.length&&<View style={styles.welcome}><Text style={styles.duck}>🦆</Text><Text style={styles.greeting}>무엇을 도와드릴까요?</Text><Text style={styles.secondary}>떠오른 일을 편하게 적어주세요.</Text></View>}
   {assistant.turns.map((turn,index)=>{const latest=index===assistant.turns.length-1,offset=assistant.turns.slice(0,index).reduce((n,t)=>n+(t.proposals?.filter(p=>p.operation==='todo.create').length??0),0);return <View key={turn.id??index} testID={latest?'duck-latest-reply':undefined} onLayout={latest?event=>anchorLayout('reply',event):undefined} style={{gap:8}}>
   <ChatArrival><View style={[styles.bubble,turn.role==='user'?styles.userBubble:styles.duckBubble]}><Text style={styles.speaker}>{turn.role==='user'?'나':'덕'}</Text><Text selectable style={styles.body}>{turn.text}</Text>{turn.state==='failed'&&<Text style={styles.error}>전송하지 못했어요.</Text>}</View></ChatArrival>
   {turn.proposals?.map((proposal,i)=>{const id=(turn.id??String(index))+':'+i,draft=assistant.drafts.find(d=>d.id===prepared[id]);return proposal.operation==='todo.create'?<AssistantChecklist key={id} proposal={proposal} number={offset+turn.proposals!.slice(0,i).filter(p=>p.operation==='todo.create').length+1} busy={assistant.busy} draft={draft} onOpenTodos={onOpenTodos} onPrepare={async value=>{const d=await assistant.prepare(value.operation,value.args);if(d){setPrepared(old=>({...old,[id]:d.id}));reveal('draft:'+d.id);}}}/>:<View key={id} style={styles.card}><Text style={styles.cardTitle}>{proposal.label}</Text>{Object.entries(proposal.args).filter(([k])=>!assistantTargetKeys.includes(k)).map(([k,v])=><Text key={k} style={styles.body}>{assistantLabels[k]??k}: {assistantValue(k,v)}</Text>)}<Button title={proposal.label+' 초안 확인'} quiet disabled={assistant.busy||!!draft} onPress={()=>void(async()=>{const d=await assistant.prepare(proposal.operation,proposal.args);if(d){setPrepared(old=>({...old,[id]:d.id}));reveal('draft:'+d.id);}})()}/></View>;})}
   </View>;})}
   {(assistant.busy||!assistant.status&&!feedback)&&<View key={anchorKey('pending')} onLayout={event=>anchorLayout('pending',event)}><ChatFeedback label={assistant.busyKind==='chat'?'덕이 답변을 준비하고 있어요':assistant.busyKind==='context'?'자료를 확인하고 있어요':assistant.busy?'변경 내용을 처리하고 있어요':'AI 연결을 확인하고 있어요'}/></View>}
   {scheduledMessages.slice(-20).map(message=><View key={anchorKey('scheduled:'+message.id)} testID={'scheduled-message-'+message.id} onLayout={event=>anchorLayout('scheduled:'+message.id,event)} style={[styles.bubble,styles.duckBubble]}><Text style={styles.speaker}>덕 · {message.title} · {new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(message.createdAt)}</Text><Text selectable style={styles.body}>{message.text}</Text>{message.warnings.map((warning,index)=><Text key={index} style={styles.secondary}>{warning}</Text>)}</View>)}
   {children}
   {needsAttention.length>0&&<Text style={styles.cardTitle}>확인할 작업</Text>}
   {needsAttention.map(renderDraft)}
   {history.length>0&&<Pressable testID="duck-history-toggle" accessibilityRole="button" accessibilityLabel={`최근 실행 기록 ${history.length}개 ${historyOpen?'접기':'보기'}`} accessibilityState={{expanded:historyOpen}} onPress={()=>setHistoryOpen(value=>!value)} style={styles.historyToggle}><Text style={styles.secondary}>최근 실행 기록 · {history.length}개</Text><Text style={styles.secondary}>{historyOpen?'접기 ⌃':'보기 ⌄'}</Text></Pressable>}
   {historyOpen&&history.map(renderDraft)}
   {(assistant.sources.length>0||assistant.warnings.length>0)&&<>
    <Pressable accessibilityRole="button" accessibilityLabel="답변 근거 보기" accessibilityState={{expanded:detailsOpen}} style={styles.historyToggle} onPress={()=>setDetailsOpen(value=>!value)}><Text style={styles.secondary}>자료 {assistant.sources.length}개{assistant.warnings.length?' · 일부 자료만 확인':''}</Text><Text style={styles.secondary}>{detailsOpen?'접기':'근거 보기'}</Text></Pressable>
    {detailsOpen&&<View style={styles.card}>{assistant.warnings.map((warning,index)=><Text key={index} style={styles.secondary}>{warning}</Text>)}{assistant.sources.slice(0,15).map(source=><View key={source.ref}><Text style={styles.secondary}>{assistantNames[source.provider]??source.provider} · {source.title}{source.completed?' · 완료 참고':''}</Text>{!!source.text&&<Text numberOfLines={3} style={styles.secondary}>{source.text}</Text>}</View>)}<Text style={styles.secondary}>연결한 자료 전체가 아닌 최근 일부를 확인해요.</Text></View>}
   </>}
   {!!notice&&<Text accessibilityLiveRegion="polite" style={styles.secondary}>{notice}</Text>}
   {settingsOpen&&<View key={anchorKey('providers')} testID="duck-chat-providers" onLayout={event=>anchorLayout('providers',event)} style={styles.card}><Text style={styles.cardTitle}>이번 대화에서 사용할 자료</Text><Text style={styles.secondary}>내 Todo와 아래에서 선택한 서비스의 자료만 분석해요.</Text><View style={styles.providers}>{Object.entries(assistantNames).filter(([key])=>key!=='todo').map(([provider,name])=><Pressable key={provider} accessibilityRole="checkbox" accessibilityLabel={`${name} 자료 사용`} accessibilityState={{checked:assistant.providers.includes(provider)}} disabled={assistant.busy||!assistant.consentReady} onPress={()=>{assistant.toggleProvider(provider);}} style={styles.provider}><Text style={styles.secondary}>{assistant.providers.includes(provider)?'☑':'□'} {name}</Text></Pressable>)}</View><Pressable accessibilityRole="checkbox" accessibilityLabel="AI 자료 사용 동의 관리" accessibilityState={{checked:assistant.consent}} disabled={assistant.busy} onPress={()=>assistant.setConsent(v=>!v)} style={styles.consent}><Text style={styles.secondary}>{assistant.consent?'선택한 자료 사용에 동의했어요 · 해제':'선택한 자료 사용에 동의'}</Text></Pressable></View>}
   {toolsOpen&&<View key={anchorKey('tools')} onLayout={event=>anchorLayout('tools',event)} testID="duck-chat-tools" style={styles.card}><Text style={styles.cardTitle}>대화 도구</Text><Button title="AI에 보낼 자료 선택" quiet onPress={()=>{setSettingsOpen(value=>!value);if(!settingsOpen)reveal('providers');}}/>{shortcuts}</View>}
  </ScrollView>
  {!!pastedText&&<View style={styles.attachment}><Text style={[styles.secondary,{flex:1}]}>붙여넣은 내용 {pastedText.length}자 · 아직 보내지 않았어요</Text><Pressable accessibilityRole="button" accessibilityLabel="붙여넣은 내용 제외" disabled={assistant.busy} onPress={()=>{setPastedText('');setPasteConsent(false);}} style={styles.remove}><Text style={styles.secondary}>제외</Text></Pressable></View>}
  {consentNeeded&&<Pressable accessibilityRole="checkbox" accessibilityLabel="선택한 자료와 내 Todo를 AI에 보내 분석하기 동의" accessibilityState={{checked:assistant.consent&&(!pastedText||pasteConsent)}} disabled={assistant.busy||!assistant.consentReady} onPress={()=>{assistant.setConsent(true);setPasteConsent(v=>!v);}} style={styles.consent}><Text style={[styles.secondary,{color:colors.secondary}]}>□ {pastedText?'붙여넣은 내용도':'선택한 자료와 내 Todo를'} AI에 보내기{pastedText?' · 붙여넣기 포함':''}</Text></Pressable>}
  {!!feedback&&<View testID="duck-chat-feedback" style={styles.feedback}>
   <Text accessibilityRole="alert" style={styles.error}>{feedback}</Text>
   {assistant.errorKind==='chat'&&!!input.trim()&&!verificationNeeded&&<View style={styles.retryRow}><Text style={[styles.secondary,{flex:1}]}>입력은 그대로예요.</Text><Pressable accessibilityRole="button" accessibilityLabel="AI 요청 다시 보내기" disabled={!assistant.consent||!assistant.status?.enabled} onPress={()=>{void send();}} style={styles.retry}><Text style={styles.retryText}>다시 보내기</Text></Pressable></View>}
   {assistant.errorKind==='load'&&<Button title="AI 연결 다시 확인" quiet onPress={()=>{void assistant.run(()=>assistant.load());}}/>}
  </View>}
  <View testID="duck-composer" style={styles.composer}><Pressable accessibilityRole="button" accessibilityLabel="대화 도구 열기" accessibilityState={{expanded:toolsOpen||settingsOpen}} disabled={assistant.busy} onPress={()=>{const opened=toolsOpen||settingsOpen;setToolsOpen(!opened);if(opened)setSettingsOpen(false);else reveal('tools');}} style={styles.composerTools}><Text style={styles.secondary}>＋</Text></Pressable><TextInput accessibilityLabel="덕에게 이야기하기" value={input} onChangeText={value=>{setInput(value);inputRef.current=value;}} maxLength={2000} multiline numberOfLines={1} onContentSizeChange={e=>setInputHeight(input?Math.max(44,Math.min(108,e.nativeEvent.contentSize.height)):44)} placeholder="덕에게 말하기" placeholderTextColor={colors.muted} style={[styles.input,{height:input?inputHeight:44}]}/><Pressable accessibilityRole="button" accessibilityLabel="덕에게 보내기" disabled={assistant.busy||!assistant.status?.enabled||!assistant.consent||!!pastedText&&!pasteConsent||!input.trim()} onPress={()=>{void send();}} style={[styles.send,(!assistant.consent||!!pastedText&&!pasteConsent||!input.trim()||assistant.busy||!assistant.status?.enabled)&&styles.disabled]}><Text style={styles.sendText}>{assistant.busy?'…':'↑'}</Text></Pressable></View>
  {assistant.status&&!assistant.status.enabled&&<Text accessibilityLiveRegion="polite" style={styles.note}>{assistant.status.message}</Text>}
 </View>;
}
const styles=StyleSheet.create({
 historyToggle:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingHorizontal:4},historyRow:{borderBottomWidth:StyleSheet.hairlineWidth,borderColor:colors.line},historySummary:{minHeight:60,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,paddingHorizontal:4},
 composerTools:{width:44,height:44,alignItems:'center',justifyContent:'center'},screen:{flex:1,minHeight:0},scroll:{flex:1},messages:{gap:14,paddingVertical:16,paddingBottom:24},welcome:{alignItems:'center',justifyContent:'center',paddingVertical:32,gap:12},duck:{fontSize:56},greeting:{...typography.heading,color:colors.text,textAlign:'center'},
 bubble:{padding:16,borderRadius:20,gap:8,maxWidth:'100%'},userBubble:{backgroundColor:colors.pale,alignSelf:'flex-end'},duckBubble:{backgroundColor:colors.surface,alignSelf:'stretch'},speaker:{...typography.caption,color:colors.muted},body:{...typography.body,color:colors.text},secondary:{...typography.caption,color:colors.muted},
 card:{padding:20,borderRadius:24,backgroundColor:colors.surface,gap:12},cardTitle:{...typography.body,fontWeight:'600',color:colors.text},draftInput:{...typography.body,color:colors.text,minHeight:48,borderBottomWidth:1,borderColor:colors.line,paddingVertical:8},error:{...typography.caption,color:colors.danger},providers:{flexDirection:'row',flexWrap:'wrap',gap:8},provider:{minHeight:44,justifyContent:'center',paddingHorizontal:10,borderRadius:12,backgroundColor:colors.bg},
 toolbar:{flexDirection:'row',justifyContent:'space-between',gap:12},settings:{minWidth:44,minHeight:44,justifyContent:'center',paddingVertical:8},attachment:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,backgroundColor:colors.surface,borderRadius:12},remove:{minHeight:44,justifyContent:'center',paddingHorizontal:8},consent:{minHeight:44,justifyContent:'center',paddingVertical:8},
 pending:{minHeight:44,flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8},feedback:{gap:4,paddingVertical:8},retryRow:{flexDirection:'row',alignItems:'center',gap:8},retry:{minHeight:44,justifyContent:'center',paddingHorizontal:12},retryText:{...typography.caption,color:colors.blueText,fontWeight:'600'},
 composer:{backgroundColor:colors.grouped,borderRadius:24,padding:4,paddingLeft:4,flexDirection:'row',alignItems:'center',gap:8},input:{...typography.body,flex:1,minWidth:0,color:colors.text,paddingVertical:8,paddingHorizontal:4,minHeight:44,maxHeight:108},send:{width:44,height:44,backgroundColor:colors.blue,borderRadius:22,alignItems:'center',justifyContent:'center'},sendText:{color:colors.white,fontSize:26},disabled:{opacity:.4},note:{...typography.caption,color:colors.muted,textAlign:'center',marginTop:8}
});

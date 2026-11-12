import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {LayoutChangeEvent} from 'react-native';
import {MotionPressable as Pressable,useReducedMotion} from '../motion';
import {Button,colors,DateField} from '../ui';
import {NotesField} from '../NotesField';
import {typography} from '../theme';
import type {TodoStore} from '../useTodos';
import {useAssistant,assistantNames,assistantLabels,assistantStatusLabels,assistantTargetKeys,assistantValue} from '../useAssistant';

export type AssistantChatRequest={id:number;message:string;pastedText?:string};
/** The main Duck conversation. Opening or typing never runs the model or an action. */
export function AssistantChat({store,onOpenTodos,request,children,shortcuts,onBusyChange,refreshVersion}:{store:TodoStore;onOpenTodos:()=>void;request:AssistantChatRequest|null;children?:React.ReactNode;shortcuts:React.ReactNode;onBusyChange:(busy:boolean)=>void;refreshVersion:number}){
 const assistant=useAssistant(store);
 const [input,setInput]=useState(''),[pastedText,setPastedText]=useState(''),[settingsOpen,setSettingsOpen]=useState(false),[detailsOpen,setDetailsOpen]=useState(false),[toolsOpen,setToolsOpen]=useState(false),[proposalNotes,setProposalNotes]=useState<Record<number,boolean>>({}),[expandedDrafts,setExpandedDrafts]=useState<Record<string,boolean>>({});
 const [prepared,setPrepared]=useState<Record<number,string>>({}),[notice,setNotice]=useState('');
 const lastRequest=useRef<number|null>(null),scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
 const [scrollRequest,setScrollRequest]=useState({target:'',sequence:0});
 const pendingScroll=useRef('');
 function reveal(target:string){pendingScroll.current=target;setScrollRequest(previous=>({target,sequence:previous.sequence+1}));}
 function anchorKey(target:string){return target===scrollRequest.target?`${target}:${scrollRequest.sequence}`:target;}
 function anchorLayout(target:string,event:LayoutChangeEvent){if(pendingScroll.current!==target)return;pendingScroll.current='';scroll.current?.scrollTo({y:Math.max(0,event.nativeEvent.layout.y-8),animated:!reduced});}
 const reduced=useReducedMotion();
 useEffect(()=>{if(refreshVersion>0)void assistant.load();},[refreshVersion]);
 useEffect(()=>{onBusyChange(assistant.busy);return()=>onBusyChange(false);},[assistant.busy,onBusyChange]);
 const owner=`${store.connection?.mode==='cloud'?store.connection.baseUrl:'demo'}:${store.user?.id??''}`;
 useEffect(()=>{setInput('');setPastedText('');setPrepared({});setNotice('');setSettingsOpen(false);setDetailsOpen(false);setToolsOpen(false);setProposalNotes({});setExpandedDrafts({});pendingScroll.current='';lastRequest.current=null;},[owner]);
 useEffect(()=>{if(request&&lastRequest.current!==request.id){lastRequest.current=request.id;setInput(request.message);setPastedText(request.pastedText??'');assistant.setConsent(false);setNotice('내용을 확인하고 AI 전송에 동의한 뒤 보내주세요.');}},[request?.id]);
 async function send(){
  if(!input.trim()||!assistant.consent||assistant.busy)return;
  const text=input.trim();
  if(await assistant.chat(text,pastedText)){setInput('');setPastedText('');setPrepared({});setProposalNotes({});setNotice('');setToolsOpen(false);setSettingsOpen(false);reveal('reply');}
 }
 function editProposal(index:number,key:string,value:unknown){assistant.setProposals(old=>old.map((proposal,i)=>i===index?{...proposal,args:{...proposal.args,[key]:value}}:proposal));}
 const consentNeeded=!!input.trim()||!!pastedText;
 const verificationNeeded=assistant.error.includes('이메일 인증');
 const feedback=verificationNeeded?`${assistant.error} 내정보 → 내 계정 → 이메일 인증에서 완료해주세요.`:assistant.error;
 return <View style={styles.screen}>
  <ScrollView ref={scroll} testID="duck-chat-scroll" style={styles.scroll} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
   {!assistant.turns.length&&!assistant.drafts.length&&<View style={styles.welcome}><Text style={styles.duck}>🦆</Text><Text style={styles.greeting}>무엇을 도와드릴까요?</Text><Text style={styles.secondary}>떠오른 일을 편하게 적어주세요.</Text></View>}
   {assistant.turns.map((turn,index)=><View key={index===assistant.turns.length-1?anchorKey('reply'):`turn:${index}`} testID={index===assistant.turns.length-1?'duck-latest-reply':undefined} onLayout={index===assistant.turns.length-1?event=>anchorLayout('reply',event):undefined} style={[styles.bubble,turn.role==='user'?styles.userBubble:styles.duckBubble]}><Text style={styles.speaker}>{turn.role==='user'?'나':'덕'}</Text><Text selectable style={styles.body}>{turn.text}</Text></View>)}
   {assistant.proposals.length>0&&<Text style={styles.secondary}>할 일 후보예요. 내용을 고친 뒤 초안을 확인해주세요.</Text>}
   {assistant.proposals.map((proposal,index)=><View key={index} style={styles.card}>
    <Text style={styles.cardTitle}>{proposal.label}</Text>
    {proposal.operation==='todo.create'?<>
     <TextInput accessibilityLabel={`할 일 후보 ${index+1} 제목`} value={String(proposal.args.title??'')} editable={!assistant.busy&&!prepared[index]} maxLength={120} multiline onChangeText={value=>editProposal(index,'title',value)} style={styles.draftInput}/>
     {prepared[index]||assistant.busy?<Text style={styles.body}>예정일: {assistantValue('dueDate',proposal.args.dueDate)}</Text>:<DateField value={typeof proposal.args.dueDate==='string'?proposal.args.dueDate:null} onChange={value=>editProposal(index,'dueDate',value)}/>}
    </>:Object.entries(proposal.args).filter(([key,value])=>!assistantTargetKeys.includes(key)&&!(key==='notes'&&!value)).map(([key,value])=><Text key={key} selectable style={styles.body}>{assistantLabels[key]??key}: {assistantValue(key,value)}</Text>)}
    {proposal.sourceRefs.map(ref=><Text key={ref} style={styles.secondary}>근거: {assistant.sources.find(source=>source.ref===ref)?.title??'선택한 자료'}</Text>)}
    <Button title={prepared[index]?'확인할 초안이 준비됐어요':`${proposal.label} 초안 확인`} quiet disabled={assistant.busy||!!prepared[index]||(proposal.operation==='todo.create'&&!String(proposal.args.title??'').trim())} onPress={()=>{void (async()=>{const draft=await assistant.prepare(proposal.operation,proposal.args);if(draft){setPrepared(old=>({...old,[index]:draft.id}));reveal(`draft:${draft.id}`);}})();}}/>
    {proposal.operation==='todo.create'&&<>
     <Button title={proposalNotes[index]?'메모 접기':proposal.args.notes?'메모 편집':'메모 추가'} accessibilityLabel={`할 일 후보 ${index+1} 메모 ${proposalNotes[index]?'접기':'열기'}`} expanded={!!proposalNotes[index]} quiet disabled={assistant.busy||!!prepared[index]} onPress={()=>setProposalNotes(old=>({...old,[index]:!old[index]}))}/>
     {proposalNotes[index]?<NotesField label={`할 일 후보 ${index+1} 메모`} value={String(proposal.args.notes??'')} onChange={value=>editProposal(index,'notes',value)} disabled={assistant.busy||!!prepared[index]}/>:!!proposal.args.notes&&<Text numberOfLines={2} style={styles.secondary}>{String(proposal.args.notes)}</Text>}
    </>}
   </View>)}
   {children}
   {assistant.drafts.length>0&&<Text style={styles.cardTitle}>실행 확인과 최근 기록</Text>}
   {assistant.drafts.slice(0,5).map(draft=>{const folded=['succeeded','cancelled','restored-cancelled'].includes(draft.status)&&!expandedDrafts[draft.id];return <View key={anchorKey(`draft:${draft.id}`)} testID={`duck-action-${draft.id}`} onLayout={event=>anchorLayout(`draft:${draft.id}`,event)} style={styles.card}>
    <Text style={styles.cardTitle}>{draft.label} · {assistantStatusLabels[draft.status]??draft.status}</Text>
    {folded?<Text numberOfLines={2} style={styles.body}>{String(draft.args.title??draft.args.subject??draft.targetTitle??'처리한 내용을 다시 확인할 수 있어요.')}</Text>:<>
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
    {['succeeded','cancelled','restored-cancelled'].includes(draft.status)&&<Button title={folded?'실행 내용 보기':'실행 내용 접기'} accessibilityLabel={`${draft.label} 실행 내용 ${folded?'보기':'접기'} ${draft.id}`} expanded={!folded} quiet onPress={()=>setExpandedDrafts(old=>({...old,[draft.id]:!old[draft.id]}))}/>}
    {draft.status==='succeeded'&&draft.operation.startsWith('todo.')&&<Button title="Todo 보기 →" quiet onPress={onOpenTodos}/>}
   </View>;})}
   {(assistant.sources.length>0||assistant.warnings.length>0)&&<>
    <Button title={detailsOpen?'근거 접기':'확인한 자료와 안내 보기'} quiet onPress={()=>setDetailsOpen(value=>!value)}/>
    {detailsOpen&&<View style={styles.card}>{assistant.warnings.map((warning,index)=><Text key={index} style={styles.secondary}>{warning}</Text>)}{assistant.sources.slice(0,15).map(source=><View key={source.ref}><Text style={styles.secondary}>{assistantNames[source.provider]??source.provider} · {source.title}{source.completed?' · 완료 참고':''}</Text>{!!source.text&&<Text numberOfLines={3} style={styles.secondary}>{source.text}</Text>}</View>)}<Text style={styles.secondary}>연결한 자료 전체가 아닌 최근 일부를 확인해요.</Text></View>}
   </>}
   {!!notice&&<Text accessibilityLiveRegion="polite" style={styles.secondary}>{notice}</Text>}
   {settingsOpen&&<View key={anchorKey('providers')} testID="duck-chat-providers" onLayout={event=>anchorLayout('providers',event)} style={styles.card}><Text style={styles.cardTitle}>이번 대화에서 사용할 자료</Text><Text style={styles.secondary}>내 Todo와 아래에서 선택한 서비스의 자료만 분석해요.</Text><View style={styles.providers}>{Object.entries(assistantNames).filter(([key])=>key!=='todo').map(([provider,name])=><Pressable key={provider} accessibilityRole="checkbox" accessibilityLabel={`${name} 자료 사용`} accessibilityState={{checked:assistant.providers.includes(provider)}} disabled={assistant.busy} onPress={()=>{assistant.toggleProvider(provider);setPrepared({});}} style={styles.provider}><Text style={styles.secondary}>{assistant.providers.includes(provider)?'☑':'□'} {name}</Text></Pressable>)}</View></View>}
   {toolsOpen&&<View key={anchorKey('tools')} onLayout={event=>anchorLayout('tools',event)} testID="duck-chat-tools" style={styles.card}><Text style={styles.cardTitle}>대화 도구</Text>{shortcuts}</View>}
  </ScrollView>
  <View style={styles.toolbar}><Pressable accessibilityRole="button" accessibilityLabel="대화 도구 열기" accessibilityState={{expanded:toolsOpen}} disabled={assistant.busy} onPress={()=>{setToolsOpen(value=>!value);if(!toolsOpen)reveal('tools');}} style={styles.settings}><Text style={styles.secondary}>도구 {toolsOpen?'⌃':'⌄'}</Text></Pressable>
  <Pressable accessibilityRole="button" accessibilityLabel="AI에 보낼 자료 선택" disabled={assistant.busy} onPress={()=>{setSettingsOpen(value=>!value);if(!settingsOpen)reveal('providers');}} style={styles.settings}><Text style={styles.secondary}>자료 · 내 Todo{assistant.providers.length?` + ${assistant.providers.length}개`:''} {settingsOpen?'⌃':'⌄'}</Text></Pressable></View>
  {!!pastedText&&<View style={styles.attachment}><Text style={[styles.secondary,{flex:1}]}>붙여넣은 내용 {pastedText.length}자 · 아직 보내지 않았어요</Text><Pressable accessibilityRole="button" accessibilityLabel="붙여넣은 내용 제외" disabled={assistant.busy} onPress={()=>{setPastedText('');assistant.setConsent(false);}} style={styles.remove}><Text style={styles.secondary}>제외</Text></Pressable></View>}
  {consentNeeded&&<Pressable accessibilityRole="checkbox" accessibilityLabel="선택한 자료와 내 Todo를 AI에 보내 분석하기 동의" accessibilityState={{checked:assistant.consent}} disabled={assistant.busy} onPress={()=>assistant.setConsent(value=>!value)} style={styles.consent}><Text style={[styles.secondary,{color:colors.secondary}]}>{assistant.consent?'☑':'□'} 선택한 자료와 내 Todo를 AI에 보내기{pastedText?' · 붙여넣기 포함':''}</Text></Pressable>}
  {assistant.busy||(!assistant.status&&!feedback)?<View testID="duck-chat-pending" style={styles.pending}><ActivityIndicator color={colors.blue} accessibilityLabel={assistant.busy?'AI 응답 기다리는 중':'AI 연결 확인 중'}/><Text accessibilityLiveRegion="polite" style={[styles.secondary,{flex:1}]}>{assistant.busy?'덕이 처리하고 있어요. 잠시만 기다려주세요.':'AI 연결을 확인하고 있어요.'}</Text></View>:!!feedback&&<View testID="duck-chat-feedback" style={styles.feedback}>
   <Text accessibilityRole="alert" style={styles.error}>{feedback}</Text>
   {assistant.errorKind==='chat'&&!!input.trim()&&!verificationNeeded&&<View style={styles.retryRow}><Text style={[styles.secondary,{flex:1}]}>입력은 그대로예요.</Text><Pressable accessibilityRole="button" accessibilityLabel="AI 요청 다시 보내기" disabled={!assistant.consent||!assistant.status?.enabled} onPress={()=>{void send();}} style={styles.retry}><Text style={styles.retryText}>다시 보내기</Text></Pressable></View>}
   {assistant.errorKind==='load'&&<Button title="AI 연결 다시 확인" quiet onPress={()=>{void assistant.run(()=>assistant.load());}}/>}
  </View>}
  <View style={styles.composer}><TextInput accessibilityLabel="덕에게 이야기하기" value={input} onChangeText={setInput} editable={!assistant.busy} maxLength={2000} multiline placeholder="덕에게 이야기하기" placeholderTextColor={colors.muted} style={styles.input}/><Pressable accessibilityRole="button" accessibilityLabel="덕에게 보내기" disabled={assistant.busy||!assistant.status?.enabled||!assistant.consent||!input.trim()} onPress={()=>{void send();}} style={[styles.send,(!assistant.consent||!input.trim()||assistant.busy||!assistant.status?.enabled)&&styles.disabled]}><Text style={styles.sendText}>{assistant.busy?'…':'↑'}</Text></Pressable></View>
  <Text accessibilityLiveRegion="polite" style={[styles.note,consentNeeded&&!assistant.consent&&{color:colors.blueText}]}>{assistant.status&&!assistant.status.enabled?assistant.status.message:consentNeeded&&!assistant.consent?'자료 사용에 동의하면 보낼 수 있어요.':'AI는 후보를 제안하고, 확인한 내용만 실행해요.'}</Text>
 </View>;
}
const styles=StyleSheet.create({
 screen:{flex:1,minHeight:0},scroll:{flex:1},messages:{gap:14,paddingVertical:16,paddingBottom:24},welcome:{alignItems:'center',justifyContent:'center',paddingVertical:32,gap:12},duck:{fontSize:56},greeting:{...typography.heading,color:colors.text,textAlign:'center'},
 bubble:{padding:16,borderRadius:20,gap:8,maxWidth:'100%'},userBubble:{backgroundColor:colors.pale,alignSelf:'flex-end'},duckBubble:{backgroundColor:colors.surface,alignSelf:'stretch'},speaker:{...typography.caption,color:colors.muted},body:{...typography.body,color:colors.text},secondary:{...typography.caption,color:colors.muted},
 card:{padding:20,borderRadius:24,backgroundColor:colors.surface,gap:12},cardTitle:{...typography.body,fontWeight:'600',color:colors.text},draftInput:{...typography.body,color:colors.text,minHeight:48,borderBottomWidth:1,borderColor:colors.line,paddingVertical:8},error:{...typography.caption,color:colors.danger},providers:{flexDirection:'row',flexWrap:'wrap',gap:8},provider:{minHeight:44,justifyContent:'center',paddingHorizontal:10,borderRadius:12,backgroundColor:colors.white},
 toolbar:{flexDirection:'row',justifyContent:'space-between',gap:12},settings:{minWidth:44,minHeight:44,justifyContent:'center',paddingVertical:8},attachment:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,backgroundColor:colors.surface,borderRadius:12},remove:{minHeight:44,justifyContent:'center',paddingHorizontal:8},consent:{minHeight:44,justifyContent:'center',paddingVertical:8},
 pending:{minHeight:44,flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8},feedback:{gap:4,paddingVertical:8},retryRow:{flexDirection:'row',alignItems:'center',gap:8},retry:{minHeight:44,justifyContent:'center',paddingHorizontal:12},retryText:{...typography.caption,color:colors.blueText,fontWeight:'600'},
 composer:{backgroundColor:colors.grouped,borderRadius:24,padding:8,paddingLeft:16,flexDirection:'row',alignItems:'center',gap:8},input:{...typography.body,flex:1,color:colors.text,paddingVertical:12,paddingHorizontal:4,minHeight:48,maxHeight:144},send:{width:44,height:44,backgroundColor:colors.blue,borderRadius:22,alignItems:'center',justifyContent:'center'},sendText:{color:colors.white,fontSize:26},disabled:{opacity:.4},note:{...typography.caption,color:colors.muted,textAlign:'center',marginTop:8}
});

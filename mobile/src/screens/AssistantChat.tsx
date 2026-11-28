import {ChatWelcome} from '../ChatWelcome';
import {AI_NAME,BrandWordmark} from '../BrandWordmark';
import {BrandMark} from '../BrandMark';
import {BriefingContent} from '../BriefingContent';
import {ScrollRevealContext,useFocusedField} from '../useFocusedField';
import {useDuoTrailingNavigation} from '../DuoLayout';
import {AgentAvatar} from '../AgentAvatar';
import {Ionicons} from '@expo/vector-icons';
import {ScreenHeading} from '../ScreenHeading';
import {AgentCall} from './AgentCall';
import {AgentWorkspace} from './AgentWorkspace';
import {downloadAgentFile,pickAgentFiles,pickAgentPhotos,jobLabels} from '../agent';
import type {AgentFile,AgentJob} from '../agent';
import {KeyboardDismiss,useKeyboardUX} from '../KeyboardUX';
import {ChatArrival,ChatFeedback} from '../ChatFeedback';
import {BriefingChecklist} from '../BriefingChecklist';
import {AssistantChecklist} from '../AssistantChecklist';
import {ScrollArea as ScrollView} from '../ScrollArea';
import type {ScheduledMessage} from '../useAutomations';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Linking,StyleSheet,Text,TextInput,View} from 'react-native';
import type {LayoutChangeEvent} from 'react-native';
import {MotionPressable as Pressable,MotionModal as Modal,useReducedMotion} from '../motion';
import {Button,colors} from '../ui';
import {typography} from '../theme';
import type {TodoStore} from '../useTodos';
import type {AssistantDraft,AssistantTurn} from '../useAssistant';
import {useAssistant,assistantNames,assistantLabels,assistantStatusLabels,assistantTargetKeys,assistantValue} from '../useAssistant';

export type AssistantChatRequest={id:number;message:string;pastedText?:string;autoSend?:boolean;files?:AgentFile[]};
/** The main Duck conversation. Opening or typing never runs the model or an action. */
export function AssistantChat({store,onOpenTodos,onOpenLog=onOpenTodos,request,children,onBusyChange,refreshVersion,scheduledMessages=[],active=true}:{scheduledMessages?:ScheduledMessage[];active?:boolean;store:TodoStore;onOpenTodos:()=>void;onOpenLog?:()=>void;request:AssistantChatRequest|null;children?:React.ReactNode;onBusyChange:(busy:boolean)=>void;refreshVersion:number}){
 const assistant=useAssistant(store,scheduledMessages),duo=useDuoTrailingNavigation();
 const canChat=assistant.status?.access?.chat??assistant.status?.usage?.funded!==false,hasBudget=assistant.status?.usage===undefined||assistant.status.usage.remainingKrw>0;
 const [workspace,setWorkspace]=useState<string|null>(null),[attachments,setAttachments]=useState<AgentFile[]>([]),[uploading,setUploading]=useState(false),[fileError,setFileError]=useState(''),[calling,setCalling]=useState(false),[attachmentMenu,setAttachmentMenu]=useState(false),[liveJobs,setLiveJobs]=useState<AgentJob[]>([]);
 const reduced=useReducedMotion(),keyboard=useKeyboardUX();
 useEffect(()=>{if(workspace!==null||calling)keyboard.dismiss();},[workspace,calling]);
 const followTail=useRef(true),inputFocused=useRef(false),userScrolling=useRef(false);
 function tail(){if(active&&followTail.current)requestAnimationFrame(()=>scroll.current?.scrollToEnd({animated:false}));}
 const failedSend=useRef<{text:string;paste:string;files:AgentFile[]}|null>(null),inputRevision=useRef(0),ownerRef=useRef('');
 const [inputHeight,setInputHeight]=useState(44),[pasteConsent,setPasteConsent]=useState(false);const inputRef=useRef('');
 const [input,setInput]=useState(''),[pastedText,setPastedText]=useState(''),[expandedDrafts,setExpandedDrafts]=useState<Record<string,boolean>>({}),[sendHint,setSendHint]=useState('');
 const [prepared,setPrepared]=useState<Record<string,string>>({});
 const isHistory=(status:string)=>['succeeded','cancelled','restored-cancelled'].includes(status);
 const history=assistant.drafts.filter(draft=>isHistory(draft.status)),needsAttention=assistant.drafts.filter(draft=>!isHistory(draft.status));
 const timeline:({kind:'turn';turn:AssistantTurn;index:number;at:number}|{kind:'scheduled';message:ScheduledMessage;at:number})[]=[...assistant.turns.map((turn,index)=>({kind:'turn' as const,turn,index,at:turn.createdAt??0})),...scheduledMessages.slice(-20).map(message=>({kind:'scheduled' as const,message,at:message.createdAt}))].sort((a,b)=>a.at-b.at);
 const lastRequest=useRef<number|null>(null),scroll=useRef<React.ComponentRef<typeof ScrollView>>(null),focus=useFocusedField(scroll);
 const stopFollowing=()=>{followTail.current=false;pendingScroll.current='';};
 const [scrollRequest,setScrollRequest]=useState({target:'',sequence:0});
 const anchorPositions=useRef<Record<string,number>>({}),anchorParents=useRef<Record<string,string>>({});
 function anchorY(target:string){const y=anchorPositions.current[target],parent=anchorParents.current[target];return y===undefined||(parent&&anchorPositions.current[parent]===undefined)?undefined:y+(anchorPositions.current[parent]??0);}
 const pendingScroll=useRef(''),lastScheduled=useRef('');
 function reveal(target:string){followTail.current=false;pendingScroll.current=target;setScrollRequest(previous=>({target,sequence:previous.sequence+1}));}
 function anchorKey(target:string){return target===scrollRequest.target?`${target}:${scrollRequest.sequence}`:target;}
 function anchorLayout(target:string,event:LayoutChangeEvent){anchorPositions.current[target]=event.nativeEvent.layout.y;const y=anchorY(target);if(pendingScroll.current===target&&y!==undefined)scroll.current?.scrollTo({y:Math.max(0,y-8),animated:!reduced});}
 useEffect(()=>{const target=scrollRequest.target;if(!target)return;const timer=setTimeout(()=>{const y=anchorY(target);if(pendingScroll.current===target&&y!==undefined){scroll.current?.scrollTo({y:Math.max(0,y-8),animated:!reduced});pendingScroll.current='';}},50);return()=>clearTimeout(timer);},[scrollRequest,reduced]);
 useEffect(()=>{const id=scheduledMessages.at(-1)?.id;if(active&&id&&lastScheduled.current!==id){lastScheduled.current=id;reveal('scheduled:'+id);}},[active,scheduledMessages]);
 useEffect(()=>{if(refreshVersion>0)void assistant.load();},[refreshVersion]);
 useEffect(()=>{onBusyChange(assistant.busy);return()=>onBusyChange(false);},[assistant.busy,onBusyChange]);
 const owner=`${store.connection?.mode==='cloud'?store.connection.baseUrl:'demo'}:${store.user?.id??''}`;ownerRef.current=owner;
 useEffect(()=>{if(!active||!assistant.status?.agent?.persistentJobs)return;let current=true;async function refresh(){try{const r=await store.featureRequest('/api/agent/jobs') as {jobs:AgentJob[]};if(current)setLiveJobs(r.jobs);}catch{}}void refresh();const timer=setInterval(()=>void refresh(),3000);return()=>{current=false;clearInterval(timer);};},[owner,active,assistant.status?.agent?.persistentJobs]);
 useEffect(()=>{if(active){void assistant.reloadPreferences();void assistant.load();}},[active]);
 useEffect(()=>{setInput('');setSendHint('');inputRef.current='';inputRevision.current++;failedSend.current=null;setPastedText('');setPasteConsent(false);lastScheduled.current='';setPrepared({});setExpandedDrafts({});setAttachments([]);setWorkspace(null);pendingScroll.current='';lastRequest.current=null;},[owner]);
 useEffect(()=>{if(request&&lastRequest.current!==request.id){lastRequest.current=request.id;inputRevision.current++;setInput(request.message);inputRef.current=request.message;setPastedText(request.pastedText??'');setPasteConsent(false);if(request.files)setAttachments(request.files);}},[request?.id]);
 useEffect(()=>{if(request?.autoSend&&lastRequest.current===request.id&&assistant.consent&&input===request.message&&!assistant.busy){lastRequest.current=-request.id;void send();}},[request?.id,assistant.consent,assistant.busy,input]);
 async function send(retry=false){
  const text=retry&&failedSend.current?failedSend.current.text:input.trim(),paste=retry&&failedSend.current?failedSend.current.paste:pastedText,files=retry&&failedSend.current?failedSend.current.files:attachments;
  if(!text||assistant.busy)return;
  if(!canChat){setSendHint('이 계정의 대화 권한을 확인하지 못했어요. docen.t ai 연결 다시 확인을 눌러주세요.');return;}
  if(!assistant.status?.enabled){setSendHint(assistant.status?'AI 서비스를 아직 사용할 수 없어요. 작성한 글은 유지했어요.':'AI 연결을 아직 확인하지 못했어요. 작성한 글은 유지했어요.');return;}
  if(!hasBudget){setSendHint(assistant.status?.usage?.funded?'이번 달 AI 사용량을 모두 사용했어요. 입력한 글은 그대로 유지했어요.':'프로 권한은 있지만 AI 사용 준비가 끝나지 않았어요. 현재 전송할 수 없으며 입력한 글은 유지했어요.');return;}
  if(!assistant.consent||(!retry&&!!paste&&!pasteConsent)){setSendHint('입력창 위에서 AI에 보낼 자료 사용에 동의한 뒤 보내주세요.');return;}
  setSendHint('');
  const captured=owner,revision=++inputRevision.current;
  if(!retry||inputRef.current.trim()===text){setInput('');inputRef.current='';setInputHeight(44);setPastedText('');setPasteConsent(false);}
  failedSend.current={text,paste,files};setAttachments([]);pendingScroll.current='';followTail.current=true;tail();
  const success=await assistant.chat(text,paste,files,retry);if(ownerRef.current!==captured)return;
  if(success){failedSend.current=null;tail();}
  else if(inputRevision.current===revision&&!inputRef.current){setInput(text);inputRef.current=text;setPastedText(paste);setAttachments(old=>old.length?old:files);setPasteConsent(false);}
 }

 useEffect(()=>{if(keyboard.visible&&inputFocused.current){followTail.current=true;tail();}},[keyboard.visible,keyboard.screenY,active]);
 const consentNeeded=(!!input.trim()||!!pastedText||!!failedSend.current)&&(!assistant.consent||!!pastedText&&!pasteConsent);
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
    {!folded&&draft.status==='succeeded'&&draft.operation.startsWith('todo.')&&<Button title="Ticket 보기 →" quiet onPress={onOpenTodos}/>}
   </View>;}
 const renderedTimeline=useMemo(()=>timeline.map(entry=>{if(entry.kind==='scheduled'){const message=entry.message;return <View key={anchorKey('scheduled:'+message.id)} testID={'scheduled-message-'+message.id} onLayout={event=>anchorLayout('scheduled:'+message.id,event)} style={[styles.bubble,styles.duckBubble,{width:'100%',maxWidth:'100%',alignSelf:'stretch'}]}><BriefingContent store={store} message={message} onReveal={stopFollowing} onOpenTodos={onOpenTodos} onOpenLog={onOpenLog}/>{message.jobId&&<Button title="작업 자세히 보기" quiet onPress={()=>setWorkspace(message.jobId!)}/>} {message.files?.map(file=><Button key={file.id} title={file.name+' 열기'} quiet onPress={()=>void downloadAgentFile(store,file.id).catch(e=>setFileError(e.message))}/>)}{message.warnings.map((warning,index)=><Text key={index} style={styles.secondary}>{warning}</Text>)}</View>;}const {turn,index}=entry;const latest=index===assistant.turns.length-1,offset=assistant.turns.slice(0,index).reduce((n,t)=>n+(t.proposals?.filter(p=>p.operation==='todo.create').length??0),0);return <View key={turn.id??index} testID={latest?'duck-latest-reply':undefined} onLayout={event=>{anchorLayout('turn:'+(turn.id??String(index)),event);if(latest)anchorLayout('reply',event);}} style={{gap:8}}>
   <ChatArrival><View style={[styles.messageRow,turn.role==='user'&&{justifyContent:'flex-end'}]}>{turn.role==='user'&&turn.createdAt!==undefined&&<Text testID={'chat-time-'+turn.id} style={styles.time}>{new Intl.DateTimeFormat('ko-KR',{hour:'numeric',minute:'2-digit'}).format(turn.createdAt)}</Text>}<View style={[styles.bubble,turn.role==='user'?styles.userBubble:styles.duckBubble,turn.items?.length?{maxWidth:'100%',width:'100%'}:undefined]}>{turn.role==='assistant'&&<View style={{flexDirection:'row',alignItems:'center',gap:8}}><AgentAvatar appearance={assistant.status?.agent?.persona?.appearance}/>{!assistant.status?.agent?.persona?.name||['docen','덕','Duck','duckduck'].includes(assistant.status.agent.persona.name)?<BrandWordmark ai style={styles.speaker}/>:<Text style={styles.speaker}>{assistant.status.agent.persona.name}</Text>}</View>}<>{turn.role==='assistant'&&!!turn.items?.length?<BriefingContent conversation store={store} message={{id:turn.id!,kind:'conversation',title:'',text:turn.text,items:turn.items,createdAt:turn.createdAt??Date.now(),readAt:null,warnings:[]}} onReveal={stopFollowing} onOpenTodos={onOpenTodos} onOpenLog={onOpenLog}/>:<Text selectable style={styles.body}>{turn.text}</Text>}</>{turn.state==='failed'&&<Text style={styles.error}>전송하지 못했어요.</Text>}</View>{turn.role==='assistant'&&turn.createdAt!==undefined&&<Text testID={'chat-time-'+turn.id} style={styles.time}>{new Intl.DateTimeFormat('ko-KR',{hour:'numeric',minute:'2-digit'}).format(turn.createdAt)}</Text>}</View></ChatArrival>
   {turn.jobs?.map(saved=>{const j=liveJobs.find(j=>j.id===saved.id)??saved;return <Pressable key={j.id} accessibilityRole="button" accessibilityLabel={j.title+' 작업 보기'} onPress={()=>setWorkspace(j.id)} style={styles.historySummary}><Text style={[styles.secondary,{flex:1}]}>{j.title} · {jobLabels[j.status]??j.status}</Text><Text style={styles.secondary}>›</Text></Pressable>;})}
   {turn.files?.map(f=><Button key={f.id} title={f.name+' 열기'} quiet onPress={()=>void downloadAgentFile(store,f.id).catch(e=>setFileError(e.message))}/>)}
   {!!turn.citations?.length&&<View testID={'chat-sources-'+turn.id} style={styles.sources}><Text style={styles.secondary}>출처</Text>{turn.citations.map(c=><Pressable key={c.url} accessibilityRole="link" accessibilityLabel={c.title} onPress={()=>void Linking.openURL(c.url).catch(()=>setFileError('출처를 열지 못했어요.'))} style={styles.source}><Text numberOfLines={2} style={[styles.secondary,{color:colors.blueText,flexShrink:1}]}>{c.title}</Text><Ionicons name="open-outline" size={16} color={colors.blueText}/></Pressable>)}</View>}
   {turn.proposals?.map((proposal,i)=>{if(turn.items?.some(item=>item.proposalIndex===i))return null;const id=(turn.id??String(index))+':'+i,draft=assistant.drafts.find(d=>d.id===prepared[id]);if(proposal.operation==='todo.create')anchorParents.current['checklist:'+id]='turn:'+(turn.id??String(index));return proposal.operation==='todo.create'?<View key={id} onLayout={event=>anchorLayout('checklist:'+id,event)}>{turn.items?.find(item=>item.proposalIndex===i)?<BriefingChecklist canTransfer={canChat} conversation store={store} messageId={turn.id!} item={turn.items.find(item=>item.proposalIndex===i)!} number={offset+turn.proposals!.slice(0,i).filter(p=>p.operation==='todo.create').length+1} onOpenTodos={onOpenTodos} onOpenLog={onOpenLog}/>:<AssistantChecklist key={id} proposal={proposal} number={offset+turn.proposals!.slice(0,i).filter(p=>p.operation==='todo.create').length+1} busy={assistant.busy} entry={assistant.checklistEntry(id)} todo={store.todos.find(t=>t.id===assistant.checklistEntry(id).todoId)} onOpenTodos={onOpenTodos} onOpenLog={onOpenLog} onExclude={excluded=>assistant.excludeChecklist(id,excluded)} onAction={async(value,done)=>{const captured=owner;await assistant.commitChecklist(id,value,done);if(ownerRef.current===captured)reveal('checklist:'+id);}}/>}</View>:<View key={id} style={styles.card}><Text style={styles.cardTitle}>{proposal.label}</Text>{Object.entries(proposal.args).filter(([k])=>!assistantTargetKeys.includes(k)).map(([k,v])=><Text key={k} style={styles.body}>{assistantLabels[k]??k}: {assistantValue(k,v)}</Text>)}<Button title={proposal.label+' 초안 확인'} quiet disabled={assistant.busy||!!draft} onPress={()=>void(async()=>{const d=await assistant.prepare(proposal.operation,proposal.args);if(d){setPrepared(old=>({...old,[id]:d.id}));reveal('draft:'+d.id);}})()}/></View>;})}
   </View>;}),[assistant.turns,scheduledMessages,assistant.drafts,assistant.busy,assistant.checklistRevision,store.todos,prepared,scrollRequest.sequence,owner,reduced,liveJobs,canChat]);
 const emptyConversation=!assistant.turns.length&&!assistant.drafts.length&&!scheduledMessages.length&&!store.writeReports?.length;
 const panePage=duo&&(workspace!==null||calling);
 return <View style={{flex:1,minHeight:0}}><View pointerEvents={panePage?'none':'auto'} accessibilityElementsHidden={panePage} importantForAccessibility={panePage?'no-hide-descendants':'auto'} aria-hidden={panePage} style={[styles.screen,panePage&&{opacity:0}]}>
  <ScreenHeading embedded title={AI_NAME}><View style={{flexDirection:'row',alignItems:'center'}}><Pressable accessibilityRole="button" accessibilityLabel="docen.t ai 작업 보기" onPress={()=>setWorkspace('')} style={styles.settings}><Ionicons name="layers-outline" size={22} color={colors.secondary}/></Pressable>{false&&<Pressable accessibilityRole="button" accessibilityLabel="docen과 음성 대화" disabled={!assistant.consent} onPress={()=>setCalling(true)} style={styles.settings}><Ionicons name="call-outline" size={22} color={colors.secondary}/></Pressable>}</View></ScreenHeading>
  <ScrollRevealContext.Provider value={focus.show}><ScrollView ref={scroll} testID="duck-chat-scroll" style={styles.scroll} contentContainerStyle={[styles.messages,emptyConversation&&{flexGrow:1,paddingTop:16,paddingBottom:16}]} onLayout={tail} onContentSizeChange={tail} onScrollBeginDrag={()=>{userScrolling.current=true;followTail.current=false;}} onScrollEndDrag={()=>{userScrolling.current=false;}} onScroll={e=>{focus.onScroll(e);if(!userScrolling.current)return;const n=e.nativeEvent;followTail.current=n.contentSize.height-n.layoutMeasurement.height-n.contentOffset.y<40;}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
   {emptyConversation&&<ChatWelcome canChat={canChat}/>}
   {renderedTimeline}
   {store.writeReports?.map(report=><View key={report.id} testID="duck-write-report" style={[styles.bubble,styles.duckBubble]}><BrandWordmark ai style={styles.speaker}/><Text selectable style={styles.body}>{report.text}</Text>{report.canCheck&&<Button title="저장 결과 확인" quiet onPress={()=>void store.checkWrite(report.id)}/>}</View>)}
   {(assistant.busy||!!store.user&&!assistant.status&&!feedback)&&<View key={anchorKey('pending')} onLayout={event=>anchorLayout('pending',event)}><ChatFeedback label={assistant.busyKind==='chat'?'docen.t ai가 답변을 준비하고 있어요':assistant.busyKind==='context'?'자료를 확인하고 있어요':assistant.busy?'변경 내용을 처리하고 있어요':'AI 연결을 확인하고 있어요'}/></View>}

   {children}
   {needsAttention.length>0&&<Text style={styles.cardTitle}>확인할 작업</Text>}
   {needsAttention.map(renderDraft)}
   {history.filter(draft=>scrollRequest.target==='draft:'+draft.id).map(renderDraft)}
  </ScrollView></ScrollRevealContext.Provider>
  {attachmentMenu&&<View style={{flexDirection:'row',gap:8}}>{[['photo','사진 선택'],['file','파일 선택']].map(([kind,label])=><Button key={kind} title={label} quiet disabled={uploading} onPress={()=>{setAttachmentMenu(false);setUploading(true);void (kind==='photo'?pickAgentPhotos:pickAgentFiles)(store,()=>assistant.alive.current).then(files=>{if(assistant.alive.current)setAttachments(old=>[...old,...files].slice(0,12));}).catch(e=>setFileError(e.message)).finally(()=>setUploading(false));}}/>)}</View>}
  {!!fileError&&<Text accessibilityRole="alert" style={styles.error}>{fileError}</Text>}
  {!!attachments.length&&<View style={styles.attachment}><Text numberOfLines={1} style={[styles.secondary,{flex:1}]}>{attachments.map(f=>f.name).join(' · ')}</Text><Button title="제외" quiet onPress={()=>setAttachments([])}/></View>}
  {!!pastedText&&<View style={styles.attachment}><Text style={[styles.secondary,{flex:1}]}>붙여넣은 내용 {pastedText.length}자 · 아직 보내지 않았어요</Text><Pressable accessibilityRole="button" accessibilityLabel="붙여넣은 내용 제외" disabled={assistant.busy} onPress={()=>{setPastedText('');setPasteConsent(false);}} style={styles.remove}><Text style={styles.secondary}>제외</Text></Pressable></View>}
  {consentNeeded&&<Pressable accessibilityRole="checkbox" accessibilityLabel="선택한 자료와 내 Ticket을 AI에 보내 분석하기 동의" accessibilityState={{checked:assistant.consent&&(!pastedText||pasteConsent)}} disabled={assistant.busy||!assistant.consentReady} onPress={()=>{assistant.setConsent(true);setPasteConsent(v=>!v);}} style={styles.consent}><Text style={[styles.secondary,{color:colors.secondary}]}>□ {pastedText?'붙여넣은 내용도':'선택한 자료와 내 Ticket을'} AI에 보내기{pastedText?' · 붙여넣기 포함':''}</Text></Pressable>}
  {!!sendHint&&<View testID="duck-send-blocked" style={styles.feedback}><Text accessibilityRole="alert" style={styles.error}>{sendHint}</Text>{(!assistant.status?.enabled||!hasBudget||!canChat)&&<Button title="docen.t ai 연결 다시 확인" quiet disabled={assistant.busy} onPress={()=>{setSendHint('');void assistant.load();}}/>}</View>}
  {!!feedback&&<View testID="duck-chat-feedback" style={styles.feedback}>
   <Text accessibilityRole="alert" style={styles.error}>{feedback}</Text>
   {assistant.errorKind==='chat'&&!!failedSend.current&&!verificationNeeded&&<View style={styles.retryRow}><Text style={[styles.secondary,{flex:1}]}>보내지 못한 요청을 다시 시도할 수 있어요.</Text><Pressable accessibilityRole="button" accessibilityLabel="AI 요청 다시 보내기" disabled={!assistant.consent||!assistant.status?.enabled} onPress={()=>{void send(true);}} style={styles.retry}><Text style={styles.retryText}>다시 보내기</Text></Pressable></View>}
   {assistant.errorKind==='load'&&<Button title="docen.t ai 연결 다시 확인" quiet onPress={()=>{void assistant.run(()=>assistant.load());}}/>}
  </View>}
  {canChat?<View testID="duck-composer" style={styles.composer}><Pressable accessibilityRole="button" accessibilityLabel="채팅에 파일 첨부" accessibilityState={{expanded:attachmentMenu}} disabled={uploading} onPress={()=>setAttachmentMenu(v=>!v)} style={styles.composerTools}><Ionicons name={uploading?'hourglass-outline':'add'} size={25} color={colors.secondary}/></Pressable><TextInput accessibilityLabel="docen.t ai에 이야기하기" value={input} onFocus={()=>{inputFocused.current=true;pendingScroll.current='';followTail.current=true;tail();}} onBlur={()=>{inputFocused.current=false;}} onChangeText={value=>{followTail.current=true;tail();inputRevision.current++;setInput(value);inputRef.current=value;}} maxLength={2000} multiline numberOfLines={1} onContentSizeChange={e=>setInputHeight(input?Math.max(44,Math.min(108,e.nativeEvent.contentSize.height)):44)} placeholder="docen에게 말하기" placeholderTextColor={colors.muted} style={[styles.input,{height:input?inputHeight:44}]}/><KeyboardDismiss/><Pressable accessibilityRole="button" accessibilityLabel="docen.t ai에 보내기" disabled={assistant.busy||!input.trim()} onPress={()=>{void send();}} style={[styles.send,(!input.trim()||assistant.busy)&&styles.disabled]}><Ionicons name={assistant.busy?'hourglass-outline':'arrow-up'} size={25} color={colors.white}/></Pressable></View>:<Text testID="duck-receive-only" style={styles.note}>연결한 자료의 알림과 요약을 여기서 확인할 수 있어요. 직접 대화는 프로에서 제공해요.</Text>}
  {calling&&!duo&&<Modal visible transparent animationType="slide" onRequestClose={()=>setCalling(false)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#00000066'}}><View style={{height:'94%',backgroundColor:colors.bg,borderTopLeftRadius:28,borderTopRightRadius:28,overflow:'hidden'}}><AgentCall store={store} providers={assistant.providers} consent={assistant.consent} onClose={()=>setCalling(false)}/></View></View></Modal>}
  {workspace!==null&&!duo&&<Modal visible transparent animationType="slide" onRequestClose={()=>setWorkspace(null)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#00000066'}}><View style={{height:'94%',backgroundColor:colors.bg,borderTopLeftRadius:28,borderTopRightRadius:28,overflow:'hidden'}}><AgentWorkspace store={store} initialJob={workspace||undefined} onClose={()=>setWorkspace(null)}/></View></View></Modal>}
  {!store.user&&<Text style={styles.note}>ME에서 로그인하면 docen.t ai와 대화할 수 있어요.</Text>}
  {assistant.status&&!assistant.status.enabled&&<Text accessibilityLiveRegion="polite" style={styles.note}>{assistant.status.message}</Text>}
 </View>{panePage&&<View testID="agent-pane-page" style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:colors.bg}}>{calling?<AgentCall store={store} providers={assistant.providers} consent={assistant.consent} onClose={()=>setCalling(false)}/>:active&&<AgentWorkspace store={store} initialJob={workspace||undefined} onClose={()=>setWorkspace(null)}/>}</View>}</View>;
}
const styles=StyleSheet.create({
 historyToggle:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingHorizontal:4},historyRow:{borderBottomWidth:StyleSheet.hairlineWidth,borderColor:colors.line},historySummary:{minHeight:60,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,paddingHorizontal:4},
 sources:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8},source:{minHeight:44,maxWidth:'100%',paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:6,borderRadius:12,backgroundColor:colors.surface},composerTools:{width:36,height:44,alignItems:'center',justifyContent:'center'},screen:{flex:1,minHeight:0},scroll:{flex:1,minHeight:0},messages:{gap:14,paddingVertical:16,paddingBottom:24},welcome:{alignItems:'center',justifyContent:'center',paddingVertical:32,gap:12},duck:{fontSize:56},greeting:{...typography.heading,color:colors.text,textAlign:'center'},
 messageRow:{flexDirection:'row',alignItems:'flex-end',gap:6},time:{fontSize:10,lineHeight:15,color:colors.muted,paddingBottom:3,flexShrink:0},bubble:{flexShrink:1,padding:16,borderRadius:20,gap:8,maxWidth:'84%'},userBubble:{backgroundColor:colors.pale,alignSelf:'flex-end'},duckBubble:{backgroundColor:colors.surface,flex:1},speaker:{...typography.caption,color:colors.muted},body:{...typography.body,color:colors.text},secondary:{...typography.caption,color:colors.muted},
 card:{padding:20,borderRadius:24,backgroundColor:colors.surface,gap:12},cardTitle:{...typography.body,fontWeight:'600',color:colors.text},draftInput:{...typography.body,color:colors.text,minHeight:48,borderBottomWidth:1,borderColor:colors.line,paddingVertical:8},error:{...typography.caption,color:colors.danger},providers:{flexDirection:'row',flexWrap:'wrap',gap:8},provider:{minHeight:44,justifyContent:'center',paddingHorizontal:10,borderRadius:12,backgroundColor:colors.bg},
 toolbar:{flexDirection:'row',justifyContent:'space-between',gap:12},settings:{width:44,minHeight:44,justifyContent:'center',alignItems:'center'},attachment:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,backgroundColor:colors.surface,borderRadius:12},remove:{minHeight:44,justifyContent:'center',paddingHorizontal:8},consent:{minHeight:44,justifyContent:'center',paddingVertical:8},
 pending:{minHeight:44,flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8},feedback:{gap:4,paddingVertical:8},retryRow:{flexDirection:'row',alignItems:'center',gap:8},retry:{minHeight:44,justifyContent:'center',paddingHorizontal:12},retryText:{...typography.caption,color:colors.blueText,fontWeight:'600'},
 composer:{backgroundColor:colors.grouped,borderRadius:24,padding:4,paddingLeft:4,flexDirection:'row',alignItems:'center',gap:4},input:{...typography.body,flex:1,minWidth:0,color:colors.text,paddingVertical:8,paddingHorizontal:4,minHeight:44,maxHeight:108},send:{width:44,height:44,backgroundColor:colors.blue,borderRadius:22,alignItems:'center',justifyContent:'center'},sendText:{color:colors.white,fontSize:26},disabled:{opacity:.4},note:{...typography.caption,color:colors.muted,textAlign:'center',marginTop:8}
});

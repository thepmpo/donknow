import type {AgentFile,AgentJob} from './agent';
import {refreshCalendarSnapshots} from './calendar-snapshot-cache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {consentPreferences,consentScope,durableConsentScope} from './assistant-consent';
import {formatDueDate} from './domain';
import {useEffect,useRef,useState} from 'react';
import type {TodoStore} from './useTodos';
import {saveChecklist} from './assistant-checklist';
import type {ChecklistEntry} from './assistant-checklist';
import type {Todo} from './domain';
import {onAssistantUpdated} from './assistant-updates';
import type {BriefingItem} from './useAutomations';

export type AssistantSource={ref:string;provider:string;kind:string;title:string;text:string;completed?:boolean;locator?:Record<string,string>};
export type AssistantDefinition={operation:string;provider:string;label:string;fields:string[];required:string[]};
export type AssistantDraft={id:string;operation:string;label:string;args:Record<string,unknown>;targetTitle?:string;accountLabel?:string;recipient?:string;status:string;result?:{id?:string|null;message?:string;todo?:Todo};expiresAt:number};
export type AssistantProposal={operation:string;label:string;args:Record<string,unknown>;sourceRefs:string[];section?:string};
export type AssistantStatus={access?:{plan:'pro';mode:'complimentary';chat:boolean;createFromSources:boolean};usage?:{funded:boolean;remainingKrw:number;proPriceKrw:number};connections?:{provider:string;connected:boolean}[];googleAccounts?:{connectionId:string;label:string}[];enabled:boolean;message:string;agent?:{backgroundChat?:boolean;persistentJobs?:boolean;voice?:boolean;persona?:{name:string;appearance:{color:string;eyes:string;glasses:boolean;accessory:string}}};memory?:{enabled:boolean;revision:number;count:number;turnCount:number};actions:AssistantDefinition[];consentScopes?:Record<string,string>};
export type AssistantTurn={id?:string;createdAt?:number;role:'user'|'assistant';text:string;state?:'sending'|'sent'|'failed';proposals?:AssistantProposal[];items?:BriefingItem[];jobs?:AgentJob[];files?:AgentFile[];citations?:{url:string;title:string}[];responsibilities?:{id:string;title:string}[]};
export const assistantNames:Record<string,string>={google:'Google',slack:'Slack',notion:'Notion',naver:'네이버 메일',todo:'docen Todo'};
export const assistantLabels:Record<string,string>={recurrence:'반복 규칙',attendees:'초대 메일을 받을 사람',title:'제목',notes:'메모',dueDate:'예정일',text:'내용',to:'받는 이메일',subject:'메일 제목',start:'시작',end:'종료',done:'완료 상태',read:'읽음 상태'};
export const assistantStatusLabels:Record<string,string>={pending:'확인 대기',running:'처리 중',succeeded:'완료',failed:'실패 · 새 초안에서 다시 확인',unknown:'결과 불확실 · 원본 확인 필요',cancelled:'취소','restored-cancelled':'복원 시 취소'};
export const assistantTargetKeys=['id','list','channel','parent','ts','thread','connectionId'];
export const assistantValue=(key:string,value:unknown)=>key==='done'?(value?'완료':'미완료'):key==='read'?(value?'읽음':'읽지 않음'):key==='dueDate'?formatDueDate(typeof value==='string'?value:null):String(value??'없음');

/** The inline chat and advanced sheet use the same consent/preview/confirm API path. */
export function useAssistant(store:TodoStore,scheduledMessages:{title:string;text:string}[]=[]){
 const [status,setStatus]=useState<AssistantStatus|null>(null),[providers,setProviders]=useState<string[]>([]),[consent,setConsentState]=useState(false),[answer,setAnswer]=useState(''),[sources,setSources]=useState<AssistantSource[]>([]),[warnings,setWarnings]=useState<string[]>([]),[proposals,setProposals]=useState<AssistantProposal[]>([]),[drafts,setDrafts]=useState<AssistantDraft[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[turns,setTurns]=useState<AssistantTurn[]>([]);
 const [busyKind,setBusyKind]=useState<'chat'|'action'|'context'|null>(null),[grants,setGrants]=useState<string[]>([]),[consentReady,setConsentReady]=useState(false);
 const [errorKind,setErrorKind]=useState<'load'|'chat'|'action'|'context'|null>(null);
 const defaultsPending=useRef(false);const [defaultVersion,defaultChanged]=useState(0);
 const turnSequence=useRef(0),pendingRequest=useRef<{signature:string;id:string}|null>(null);
 const checklist=useRef<Record<string,ChecklistEntry>>({}),storeRef=useRef(store);storeRef.current=store;
 const [checklistRevision,checklistChanged]=useState(0);
 const alive=useRef(true),working=useRef(false),generation=useRef(0),draftRevision=useRef(0),readSequence=useRef(0),errorRevision=useRef(0);
 const owner=`${store.connection?.mode==='cloud'?store.connection.baseUrl:'demo'}:${store.user?.id??''}`;
 useEffect(()=>{
  alive.current=true;const version=++generation.current;draftRevision.current++;readSequence.current++;errorRevision.current++;
  pendingRequest.current=null;setStatus(null);setProviders([]);setConsentState(false);setGrants([]);setConsentReady(false);setBusyKind(null);checklist.current={};
  AsyncStorage.getItem('duckduck.ai-consent.v1.'+owner).then(raw=>{if(current(version)){defaultsPending.current=raw===null;defaultChanged(v=>v+1);const saved=consentPreferences(raw?JSON.parse(raw):null);setProviders(saved.providers);setGrants(saved.grants);setConsentReady(true);}}).catch(()=>{if(current(version))setConsentReady(true);});setAnswer('');setSources([]);setWarnings([]);setProposals([]);setDrafts([]);setTurns([]);setError('');setErrorKind(null);working.current=false;setBusy(false);setBusyKind(null);
  if(store.user&&store.connection?.mode==='cloud')void load(version);
  if(store.user&&store.connection?.mode==='cloud')void recover(version);
  return()=>{alive.current=false;generation.current++;};
 },[owner]);
 useEffect(()=>onAssistantUpdated(change=>{if(change.owner!==owner)return;if(change.clear){setTurns([]);setAnswer('');setProposals([]);checklist.current={};}void load();}),[owner]);
 useEffect(()=>{if(!defaultsPending.current||!consentReady||!status?.consentScopes)return;const next=(status.connections??[]).filter(c=>c.connected).map(c=>c.provider).filter(p=>['google','slack','notion','naver'].includes(p)),key=consentScope(next,status.consentScopes);if(!durableConsentScope(key))return;defaultsPending.current=false;setProviders(next);setGrants([key]);setConsentState(true);saveConsent(next,[key]);},[status,consentReady,defaultVersion]);
 const scope=consentScope(providers,status?.consentScopes);
 useEffect(()=>{setConsentState(!!status&&consentReady&&grants.includes(scope));},[scope,consentReady,!!status,grants]);
 function saveConsent(nextProviders:string[],nextGrants:string[]){void AsyncStorage.setItem('duckduck.ai-consent.v1.'+owner,JSON.stringify({providers:nextProviders,grants:nextGrants.filter(durableConsentScope)})).catch(()=>{});}
 function setConsent(value:boolean|((old:boolean)=>boolean)){const allow=typeof value==='function'?value(consent):value;if(!consentReady)return;const next=allow?[...new Set([...grants,scope])].slice(-16):grants.filter(g=>g!==scope);setGrants(next);setConsentState(allow);saveConsent(providers,next);}
 async function reloadPreferences(){if(working.current)return;const version=generation.current;try{const raw=await AsyncStorage.getItem('duckduck.ai-consent.v1.'+owner);if(current(version)&&!working.current){const saved=consentPreferences(raw?JSON.parse(raw):null);setProviders(saved.providers);setGrants(saved.grants);}}catch{}}
 function current(version:number){return alive.current&&version===generation.current;}
 async function load(version=generation.current){
  const revision=draftRevision.current,sequence=++readSequence.current,errorVersion=errorRevision.current;
  const latest=()=>current(version)&&sequence===readSequence.current;
  // A failed or slow history read must not prevent a successful status read
  // from enabling chat. Each rejection is still surfaced and can be retried.
  const results=await Promise.allSettled([
   store.featureRequest('/api/assistant/status').catch(error=>{if(latest())setStatus(null);throw error;}).then(async value=>{if(!latest())return;const next=value as AssistantStatus;setStatus(next);if(next.memory?.enabled){const history=await store.featureRequest('/api/assistant/conversation') as {turns:AssistantTurn[]};if(latest()&&!working.current)setTurns(history.turns.slice(-40));}}),
   store.featureRequest('/api/assistant/actions').then(value=>{const actions=(value as {actions?:AssistantDraft[]}|null)?.actions;if(!Array.isArray(actions))throw new Error('비서 작업 응답을 확인하지 못했어요. 이전 내용은 유지했어요.');if(latest()&&revision===draftRevision.current)setDrafts(actions);}),
  ]);
  if(!latest()||revision!==draftRevision.current||errorVersion!==errorRevision.current)return;
  const failed=results.find(result=>result.status==='rejected');
  if(failed?.status==='rejected'){setError(failed.reason instanceof Error?failed.reason.message:'비서 기능을 불러오지 못했어요.');setErrorKind('load');}else if(errorKind==='load'){setError('');setErrorKind(null);}
 }
 async function run<T>(fn:()=>Promise<T>,kind:'chat'|'action'|'context'='action'):Promise<T|undefined>{
  if(working.current)return;const version=generation.current;working.current=true;errorRevision.current++;setBusy(true);setBusyKind(kind);setError('');setErrorKind(null);
  try{const result=await fn();return current(version)?result:undefined;}
  catch(e){if(current(version)){setError(e instanceof Error?e.message:'처리하지 못했어요.');setErrorKind(kind);}return undefined;}
  finally{if(current(version)){working.current=false;setBusy(false);setBusyKind(null);}}
 }
 async function recover(version:number){try{const id=await AsyncStorage.getItem('duckduck.ai-pending.'+owner);if(!id||!current(version))return;for(;;){const receipt=await store.featureRequest('/api/agent/chat/'+id) as {status:string;message:string;response?:{answer:string;proposals:AssistantProposal[];items?:BriefingItem[];jobs?:AgentJob[];files?:AgentFile[];citations?:{url:string;title:string}[];conversation?:{userTurn:AssistantTurn;assistantTurn:AssistantTurn}};error?:{message:string}};if(!current(version))return;if(receipt.status==='succeeded'&&receipt.response){const r=receipt.response;readSequence.current++;setTurns(old=>{const saved=r.conversation;if(saved)return [...old.filter(t=>t.id!==saved.userTurn.id&&t.id!==saved.assistantTurn.id),saved.userTurn,saved.assistantTurn].sort((a,b)=>(a.createdAt??0)-(b.createdAt??0)).slice(-40);return [...old.filter(t=>t.id!=='recovered:'+id&&t.id!=='recovered-user:'+id),{id:'recovered-user:'+id,role:'user' as const,text:receipt.message,createdAt:Date.now()-1},{id:'recovered:'+id,role:'assistant' as const,text:r.answer,createdAt:Date.now(),proposals:r.proposals,jobs:r.jobs,files:r.files,citations:r.citations}].slice(-40);});await AsyncStorage.removeItem('duckduck.ai-pending.'+owner);return;}if(receipt.status==='failed'){await AsyncStorage.removeItem('duckduck.ai-pending.'+owner);setError(receipt.error?.message??'이전 답변을 준비하지 못했어요.');setErrorKind('chat');return;}await new Promise(resolve=>setTimeout(resolve,1500));if(!current(version))return;}}catch(e){if(current(version)){if((e as {status?:number})?.status===404){await AsyncStorage.removeItem('duckduck.ai-pending.'+owner);return;}setError(e instanceof Error?e.message:'이전 답변을 확인하지 못했어요.');setErrorKind('load');}}}
 async function read(){const version=generation.current;await run(async()=>{const r=await store.featureRequest('/api/assistant/context','POST',{providers}) as {sources:AssistantSource[];warnings:string[]};if(current(version)){setSources(r.sources);setWarnings(r.warnings);}},'context');}
 async function chat(message:string,pastedText='',attachments:AgentFile[]=[],retry=false){
  if(working.current||!status?.enabled||!consent||!message.trim()||message.length>2000||pastedText.length>10000)return false;
  const version=generation.current;
  const turnId=String(++turnSequence.current)+':'+generation.current;const signature=JSON.stringify([message,pastedText,attachments.map(f=>f.id),providers,status.consentScopes]);if(pendingRequest.current?.signature!==signature)pendingRequest.current={signature,id:'msg-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2)};const requestId=pendingRequest.current.id;
  setTurns(old=>{const failed=old.at(-1);return failed?.role==='user'&&failed.state==='failed'&&failed.text===message?old.map((turn,i)=>i===old.length-1?{...turn,id:turnId,state:'sending' as const}:turn):[...old,{id:turnId,createdAt:Date.now(),role:'user' as const,text:message,files:attachments,state:'sending' as const}].slice(-40);});
  const success=await run(async()=>{
   let r=await store.featureRequest('/api/assistant/chat','POST',{message,providers,consent,requestId,background:status.agent?.backgroundChat===true,retry,attachments:attachments.map(f=>f.id),consentScopes:status.consentScopes,pastedText:pastedText||undefined,history:[...scheduledMessages.slice(-1).map(m=>({role:'assistant' as const,text:(m.title+'\n'+m.text).slice(0,2000)})),...turns.filter(turn=>turn.state!=='failed'&&turn.state!=='sending').slice(-5).map(turn=>({role:turn.role,text:turn.text.slice(0,2000)}))].slice(-6)}).catch(async e=>{if(current(version)&&e&&typeof e==='object'&&'status' in e&&e.status===409&&e instanceof Error&&e.message.includes('자료')){await load(version);setConsentState(false);}throw e;}) as {answer:string;sources:AssistantSource[];warnings:string[];proposals:AssistantProposal[];items?:BriefingItem[];conversation?:{userTurn:AssistantTurn;assistantTurn:AssistantTurn};jobs?:AgentJob[];files?:AgentFile[];citations?:{url:string;title:string}[];queued?:boolean;id?:string};
   if(r.queued&&r.id){const id=r.id;await AsyncStorage.setItem('duckduck.ai-pending.'+owner,id);setTurns(old=>old.map(t=>t.id===turnId?{...t,state:'sent'}:t));for(;;){if(!current(version))return false;const receipt=await store.featureRequest('/api/agent/chat/'+id) as {status:string;response:typeof r;error?:{message:string}};if(receipt.status==='succeeded'){r=receipt.response;await AsyncStorage.removeItem('duckduck.ai-pending.'+owner);break;}if(receipt.status==='failed'){await AsyncStorage.removeItem('duckduck.ai-pending.'+owner);throw new Error(receipt.error?.message??'답변을 준비하지 못했어요.');}await new Promise(resolve=>setTimeout(resolve,900));}}
   if(!current(version))return false;
   pendingRequest.current=null;setAnswer(r.answer);if(r.conversation){const saved=r.conversation;setTurns(old=>[...old.filter(turn=>turn.id!==saved.assistantTurn.id).map(turn=>turn.id===turnId?saved.userTurn:turn),saved.assistantTurn].slice(-40));}else setTurns(old=>[...old.map(turn=>turn.id===turnId?{...turn,state:'sent' as const}:turn),{id:turnId+':reply',createdAt:Date.now(),role:'assistant' as const,text:r.answer,proposals:r.proposals,items:r.items,jobs:r.jobs,files:r.files,citations:r.citations}].slice(-40));setSources(r.sources);setWarnings(r.warnings);setProposals(r.proposals);return true;
  },'chat')??false;
  if(!success&&current(version))setTurns(old=>old.map(turn=>turn.id===turnId?{...turn,state:'failed'}:turn));return success;
 }
 async function prepare(operation:string,args:Record<string,unknown>){const version=generation.current;return run(async()=>{draftRevision.current++;const d=await store.featureRequest('/api/assistant/actions','POST',{operation,args}) as AssistantDraft;if(current(version))setDrafts(old=>[d,...old.filter(x=>x.id!==d.id)]);return d;});}
 function checklistEntry(id:string){return checklist.current[id]??(checklist.current[id]={});}
 function excludeChecklist(id:string,excluded:boolean){if(working.current)return;checklistEntry(id).excluded=excluded;checklistEntry(id).error='';checklistChanged(v=>v+1);}
 async function commitChecklist(id:string,proposal:AssistantProposal,done:boolean){
  const version=generation.current,entry=checklistEntry(id);
  await run(async()=>{draftRevision.current++;await saveChecklist(entry,proposal,done,{request:store.featureRequest,current:()=>current(version),refresh:()=>storeRef.current.refresh(),todo:id=>storeRef.current.findTodo(id),update:(id,patch)=>storeRef.current.update(id,patch),changed:()=>checklistChanged(v=>v+1)});if(current(version))await load(version);});
 }
 async function confirm(draft:AssistantDraft){
  if(draft.status!=='pending'||draft.expiresAt<=Date.now())return;
  const version=generation.current;
  await run(async()=>{draftRevision.current++;try{const result=await store.featureRequest(`/api/assistant/actions/${draft.id}/confirm`,'POST',{confirmation:true}) as {status:string};if(current(version)){if(result.status==='succeeded'&&draft.operation.startsWith('calendar.'))refreshCalendarSnapshots(owner);await store.refresh();}}finally{if(current(version))await load(version);}});
 }
 async function cancel(draft:AssistantDraft){const version=generation.current;await run(async()=>{draftRevision.current++;await store.featureRequest(`/api/assistant/actions/${draft.id}`,'DELETE');if(current(version))await load(version);});}
 function toggleProvider(provider:string){if(working.current||!consentReady)return;pendingRequest.current=null;const next=providers.includes(provider)?providers.filter(x=>x!==provider):[...providers,provider];setProviders(next);setConsentState(false);saveConsent(next,grants);setSources([]);setProposals([]);setAnswer('');setTurns([]);}
 return {checklistRevision,status,providers,consent,setConsent,answer,sources,setSources,warnings,proposals,setProposals,drafts,busy,busyKind,error,errorKind,turns,setTurns,consentReady,alive,load,reloadPreferences,run,read,chat,prepare,confirm,cancel,toggleProvider,checklistEntry,excludeChecklist,commitChecklist};
}

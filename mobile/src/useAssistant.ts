import {useEffect,useRef,useState} from 'react';
import type {TodoStore} from './useTodos';

export type AssistantSource={ref:string;provider:string;kind:string;title:string;text:string;completed?:boolean;locator?:Record<string,string>};
export type AssistantDefinition={operation:string;provider:string;label:string;fields:string[];required:string[]};
export type AssistantDraft={id:string;operation:string;label:string;args:Record<string,unknown>;targetTitle?:string;accountLabel?:string;recipient?:string;status:string;result?:{message?:string};expiresAt:number};
export type AssistantProposal={operation:string;label:string;args:Record<string,unknown>;sourceRefs:string[]};
export type AssistantStatus={enabled:boolean;message:string;actions:AssistantDefinition[]};
export type AssistantTurn={role:'user'|'assistant';text:string};
export const assistantNames:Record<string,string>={google:'Google',slack:'Slack',notion:'Notion',naver:'네이버 메일',todo:'덕 Todo'};
export const assistantLabels:Record<string,string>={title:'제목',notes:'메모',dueDate:'예정일 (YYYY-MM-DD)',text:'내용',to:'받는 이메일',subject:'메일 제목',start:'시작',end:'종료',done:'완료 상태',read:'읽음 상태'};
export const assistantStatusLabels:Record<string,string>={pending:'확인 대기',running:'처리 중',succeeded:'완료',failed:'실패 · 새 초안에서 다시 확인',unknown:'결과 불확실 · 원본 확인 필요',cancelled:'취소','restored-cancelled':'복원 시 취소'};
export const assistantTargetKeys=['id','list','channel','parent','ts','thread'];
export const assistantValue=(key:string,value:unknown)=>key==='done'?(value?'완료':'미완료'):key==='read'?(value?'읽음':'읽지 않음'):String(value??'없음');

/** The inline chat and advanced sheet use the same consent/preview/confirm API path. */
export function useAssistant(store:TodoStore){
 const [status,setStatus]=useState<AssistantStatus|null>(null),[providers,setProviders]=useState<string[]>([]),[consent,setConsent]=useState(false),[answer,setAnswer]=useState(''),[sources,setSources]=useState<AssistantSource[]>([]),[warnings,setWarnings]=useState<string[]>([]),[proposals,setProposals]=useState<AssistantProposal[]>([]),[drafts,setDrafts]=useState<AssistantDraft[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[turns,setTurns]=useState<AssistantTurn[]>([]);
 const alive=useRef(true),working=useRef(false),generation=useRef(0),draftRevision=useRef(0),readSequence=useRef(0);
 const owner=`${store.connection?.mode==='cloud'?store.connection.baseUrl:'demo'}:${store.user?.id??''}`;
 useEffect(()=>{
  alive.current=true;const version=++generation.current;draftRevision.current++;readSequence.current++;
  setStatus(null);setProviders([]);setConsent(false);setAnswer('');setSources([]);setWarnings([]);setProposals([]);setDrafts([]);setTurns([]);setError('');working.current=false;setBusy(false);
  if(store.user&&store.connection?.mode==='cloud')void load(version);
  return()=>{alive.current=false;generation.current++;};
 },[owner]);
 function current(version:number){return alive.current&&version===generation.current;}
 async function load(version=generation.current){
  const revision=draftRevision.current,sequence=++readSequence.current;
  try{const [st,list]=await Promise.all([store.featureRequest('/api/assistant/status'),store.featureRequest('/api/assistant/actions')]);if(current(version)&&sequence===readSequence.current){setStatus(st as AssistantStatus);if(revision===draftRevision.current)setDrafts((list as {actions:AssistantDraft[]}).actions);}}
  catch(e){if(current(version)&&sequence===readSequence.current&&revision===draftRevision.current)setError(e instanceof Error?e.message:'비서 기능을 불러오지 못했어요.');}
 }
 async function run<T>(fn:()=>Promise<T>):Promise<T|undefined>{
  if(working.current)return;const version=generation.current;working.current=true;setBusy(true);setError('');
  try{const result=await fn();return current(version)?result:undefined;}
  catch(e){if(current(version))setError(e instanceof Error?e.message:'처리하지 못했어요.');return undefined;}
  finally{if(current(version)){working.current=false;setBusy(false);}}
 }
 async function read(){const version=generation.current;await run(async()=>{const r=await store.featureRequest('/api/assistant/context','POST',{providers}) as {sources:AssistantSource[];warnings:string[]};if(current(version)){setSources(r.sources);setWarnings(r.warnings);}});}
 async function chat(message:string,pastedText=''){
  if(!status?.enabled||!consent||!message.trim()||message.length>2000||pastedText.length>10000)return false;
  const version=generation.current;
  return await run(async()=>{
   const r=await store.featureRequest('/api/assistant/chat','POST',{message,providers,consent,pastedText:pastedText||undefined,history:turns.slice(-6).map(turn=>({...turn,text:turn.text.slice(0,2000)}))}) as {answer:string;sources:AssistantSource[];warnings:string[];proposals:AssistantProposal[]};
   if(!current(version))return false;
   setAnswer(r.answer);setTurns(old=>[...old,{role:'user' as const,text:message.slice(0,2000)},{role:'assistant' as const,text:r.answer}].slice(-40));setSources(r.sources);setWarnings(r.warnings);setProposals(r.proposals);return true;
  })??false;
 }
 async function prepare(operation:string,args:Record<string,unknown>){const version=generation.current;return run(async()=>{draftRevision.current++;const d=await store.featureRequest('/api/assistant/actions','POST',{operation,args}) as AssistantDraft;if(current(version))setDrafts(old=>[d,...old.filter(x=>x.id!==d.id)]);return d;});}
 async function confirm(draft:AssistantDraft){
  if(draft.status!=='pending'||draft.expiresAt<=Date.now())return;
  const version=generation.current;
  await run(async()=>{draftRevision.current++;try{await store.featureRequest(`/api/assistant/actions/${draft.id}/confirm`,'POST',{confirmation:true});if(current(version))await store.refresh();}finally{if(current(version))await load(version);}});
 }
 async function cancel(draft:AssistantDraft){const version=generation.current;await run(async()=>{draftRevision.current++;await store.featureRequest(`/api/assistant/actions/${draft.id}`,'DELETE');if(current(version))await load(version);});}
 function toggleProvider(provider:string){if(working.current)return;setProviders(old=>old.includes(provider)?old.filter(x=>x!==provider):[...old,provider]);setConsent(false);setSources([]);setProposals([]);setAnswer('');setTurns([]);}
 return {status,providers,consent,setConsent,answer,sources,setSources,warnings,proposals,setProposals,drafts,busy,error,turns,alive,load,run,read,chat,prepare,confirm,cancel,toggleProvider};
}

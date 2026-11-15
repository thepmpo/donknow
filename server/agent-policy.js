import {fail} from './secrets.js';
const external=new Set(['gmail.markRead','gmail.reply','gmail.send','naver.markRead','naver.reply','naver.send','slack.send','slack.update','notion.create','notion.append','notion.rename','drive.rename','drive.createText','drive.updateText','calendar.create','calendar.update','calendar.delete','tasks.create','tasks.update']);
export function reviewAgentAction({operation,args,job,rules,available,now=Date.now()}){
 if(!available.some(a=>a.operation===operation))return {decision:'handoff',reason:'연결한 서비스의 이 작업 권한이 없어요.'};
 if(job.mode==='research')return {decision:'handoff',reason:'백그라운드 자료 조사는 읽기만 할 수 있어요.'};
 if(!external.has(operation)&&!operation.startsWith('todo.'))return {decision:'handoff',reason:'이 작업은 직접 처리해주세요.'};
 const provider=/^(?:gmail|calendar|tasks|drive)\./.test(operation)?'google':operation.split('.')[0];const matches=rules.filter(rule=>(!rule.consentScopes||rule.consentScopes[provider]===job.consentScopes?.[provider])&&rule.expiresAt>now&&rule.operation===operation&&Object.entries(rule.target).every(([key,value])=>key==='pathPrefix'?typeof args.path==='string'&&(args.path===value||args.path.startsWith(value.replace(/\/$/,'')+'/')):String(args[key]??(key==='calendarId'?'primary':''))===value));
 const restricted=matches.find(r=>r.mode==='handoff')??matches.find(r=>r.mode==='ask');
 if(restricted)return {decision:restricted.mode==='handoff'?'handoff':'ask',reason:restricted.mode==='handoff'?'직접 처리하도록 정한 작업이에요.':'내용을 확인한 뒤 실행해주세요.',ruleId:restricted.id};
 const explicit=matches.find(r=>r.mode==='explicit'),patterns={'calendar.create':/(?:일정|캘린더).{0,40}(?:추가해|등록해|생성해|넣어)/i,'calendar.update':/(?:일정|캘린더).{0,40}(?:바꿔|수정해|변경해)/i,'calendar.delete':/(?:일정|캘린더).{0,40}(?:삭제해|지워)/i,'gmail.send':/(?:메일|이메일).{0,40}(?:보내|전송)/i,'gmail.reply':/(?:답장|회신).{0,40}(?:보내|전송)/i,'slack.send':/(?:슬랙|메시지).{0,40}(?:보내|전송)/i,'todo.create':/(?:할 일|투두|todo).{0,40}(?:추가해|저장해|등록해)/i,'todo.update':/(?:할 일|투두|todo).{0,40}(?:완료해|수정해|바꿔)/i};
 if(explicit&&(!patterns[operation]?.test(job.userRequest??'')||external.has(operation)&&!Object.keys(explicit.target).length))return {decision:'ask',reason:'지금 명확하게 요청한 작업인지 먼저 확인해주세요.',ruleId:explicit.id};
 const allowed=explicit??matches.find(r=>r.mode==='allow'&&(!external.has(operation)||Object.keys(r.target).length));
 if(allowed){if(external.has(operation)&&job.privateContextUsed&&allowed.sharePrivateContext!==true)return {decision:'ask',reason:'개인 자료를 포함한 외부 변경·발송은 내용을 먼저 확인해주세요.',ruleId:allowed.id};if(job.channel?.audience!=='owner'&&job.allowPrivateContext)return {decision:'ask',reason:'개인 대화의 내용을 다른 사람에게 공유하기 전에 확인해주세요.'};return {decision:'allow',ruleId:allowed.id,reason:'직접 정한 작업·대상·기간 안의 실행이에요.'};}
 return {decision:'ask',reason:'외부 변경과 할 일 저장은 내용을 먼저 확인해주세요.'};
}
export function guardAgentScope(store,assistant,run){
 if(store.agentProfile(run.userId).paused||!store.guardAgentJob(run)||!store.account(run.userId)?.emailVerified)throw fail(409,'작업이 중지되거나 계정이 바뀌었어요.');
 const current=assistant.status(run.userId).consentScopes;if((run.providers??[]).filter(p=>['google','slack','notion','naver'].includes(p)).some(p=>current[p]!==run.consentScopes[p]))throw fail(409,'자료 연결이나 권한이 바뀌었어요. 작업에서 다시 확인해주세요.');
 if(run.allowPrivateContext&&(store.memorySettings(run.userId).revision!==run.memoryRevision))throw fail(409,'기억 설정이 바뀌었어요. 새 지시로 작업을 이어가세요.');
 if(run.responsibilityId){const duty=store.agentResponsibilities(run.userId).find(d=>d.id===run.responsibilityId);if(!duty?.enabled||duty.endAt&&duty.endAt<Date.now())throw fail(409,'지속 업무가 종료되거나 중지됐어요.');}
}
export function safeCitation(url){try{const u=new URL(url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.hostname==='localhost'||/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)||u.hostname.includes(':')||u.hostname.endsWith('.local'))return null;return u.href;}catch{return null;}}

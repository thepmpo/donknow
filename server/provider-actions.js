import {calendarAccount} from './google-accounts.js';
import {calendarIdentifier,calendarZone} from './calendar-time.js';
import { fail } from './secrets.js';
import { validDate, validNotes, validTitle } from './store.js';
const str = (value, max = 4000) => typeof value === 'string' && value.length <= max;
const identifier = value => str(value, 512) && !!value && !/[\r\n\x00]/.test(value);
const email = value => str(value, 254) && /^[A-Za-z0-9.!#$%&'*+\/=\?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
const uuid = value => str(value, 36) && /^[a-f\d]{8}-?[a-f\d]{4}-?[a-f\d]{4}-?[a-f\d]{4}-?[a-f\d]{12}$/i.test(value);
const calendarId=value=>{try{return calendarIdentifier(value)===value;}catch{return false;}};
const timeZone=value=>{try{calendarZone(value);return true;}catch{return false;}};
const calendarEventId=value=>str(value,1024)&&!!value&&!/[\x00-\x1f\x7f]/.test(value);
const calendarFields={calendarId,allDay:v=>typeof v==='boolean',startDate:v=>typeof v==='string'&&validDate(v),endDate:v=>typeof v==='string'&&validDate(v),timeZone,location:v=>str(v,1000),expectedETag:v=>str(v,200)&&!!v&&!/[\r\n]/.test(v)};
const instant = value => str(value, 40) && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const text = value => str(value) && !!value.trim();
export const actionDefinitions = {
 'todo.create': { provider:'todo', label:'Todo 추가', fields:{title:validTitle,notes:validNotes,dueDate:validDate}, required:['title'] },
 'todo.update': { provider:'todo', label:'Todo 수정', fields:{id:identifier,title:validTitle,notes:validNotes,dueDate:validDate,done:v=>typeof v==='boolean'},required:['id'] },
 'naver.markRead': {provider:'naver',feature:'mailWrite',label:'네이버 메일 읽음 처리',fields:{id:identifier,read:v=>typeof v==='boolean'},required:['id','read']},
 'naver.reply': {provider:'naver',feature:'mailWrite',label:'네이버 메일 답장 발송',fields:{id:identifier,text},required:['id','text']},
 'naver.send': {provider:'naver',feature:'mailWrite',label:'네이버 메일 발송',fields:{to:email,subject:v=>str(v,200)&&!!v.trim()&&!/[\r\n]/.test(v),text},required:['to','subject','text']},
 'gmail.markRead': {provider:'google',feature:'gmailModify',label:'메일 읽음 처리',fields:{id:identifier,read:v=>typeof v==='boolean'},required:['id','read']},
 'gmail.reply': {provider:'google',feature:'gmailSend',label:'메일 답장 발송',fields:{id:identifier,text},required:['id','text']},
 'gmail.send': {provider:'google',feature:'gmailSend',label:'새 메일 발송',fields:{to:email,subject:v=>str(v,200)&&!!v.trim()&&!/[\r\n]/.test(v),text},required:['to','subject','text']},
 'slack.send': {provider:'slack',feature:'messagesWrite',label:'Slack 메시지 보내기',fields:{channel:v=>str(v,32)&&/^[CG][A-Z0-9]{8,30}$/.test(v),text,thread:v=>str(v,40)&&/^\d+\.\d+$/.test(v)},required:['channel','text']},
 'slack.update': {provider:'slack',feature:'messagesWrite',label:'덕이 보낸 Slack 메시지 수정',fields:{channel:v=>str(v,32)&&/^[CG][A-Z0-9]{8,30}$/.test(v),ts:v=>str(v,40)&&/^\d+\.\d+$/.test(v),text},required:['channel','ts','text']},
 'notion.create': {provider:'notion',feature:'pagesWrite',label:'Notion 하위 페이지 만들기',fields:{parent:uuid,title:validTitle,text},required:['parent','title','text']},
 'notion.append': {provider:'notion',feature:'pagesWrite',label:'Notion에 내용 추가',fields:{id:uuid,text},required:['id','text']},
 'notion.rename': {provider:'notion',feature:'pagesWrite',label:'Notion 페이지 제목 수정',fields:{id:uuid,title:validTitle},required:['id','title']},
 'tasks.create': {provider:'google',feature:'tasksWrite',label:'Google Tasks 할 일 추가',fields:{list:identifier,title:validTitle,notes:validNotes,dueDate:validDate},required:['list','title']},
 'tasks.update': {provider:'google',feature:'tasksWrite',label:'Google Tasks 할 일 수정',fields:{list:identifier,id:identifier,title:validTitle,notes:validNotes,dueDate:validDate,done:v=>typeof v==='boolean'},required:['list','id']},
 'calendar.create': {provider:'google',feature:'calendarWrite',label:'캘린더 일정 추가',fields:{title:validTitle,start:instant,end:instant,notes:validNotes,...calendarFields},required:['title']},
 'calendar.update': {provider:'google',feature:'calendarWrite',label:'캘린더 일정 수정',fields:{id:calendarEventId,title:validTitle,start:instant,end:instant,notes:validNotes,destinationCalendarId:calendarId,...calendarFields},required:['id']},
 'calendar.delete': {provider:'google',feature:'calendarWrite',label:'캘린더 일정 삭제',fields:{id:calendarEventId,calendarId,expectedETag:calendarFields.expectedETag},required:['id','calendarId','expectedETag']},
 'drive.create': {provider:'google',feature:'driveWrite',label:'Drive 텍스트 파일 만들기',fields:{title:validTitle,text},required:['title','text']},
 'drive.rename': {provider:'google',feature:'driveWrite',label:'Drive 파일 이름 수정',fields:{id:identifier,title:validTitle},required:['id','title']},
 'drive.updateText': {provider:'google',feature:'driveWrite',label:'Drive 텍스트 파일 내용 교체',fields:{id:identifier,text},required:['id','text']},
};
for(const def of Object.values(actionDefinitions))if(def.provider==='google')def.fields.connectionId=identifier;
export function validateAction(operation, input) {
 const def=actionDefinitions[operation];
 if(!def||!input||typeof input!=='object'||Array.isArray(input))throw fail(400,'실행할 작업을 확인해주세요.');
 if(Object.keys(input).some(k=>!Object.hasOwn(def.fields,k))||def.required.some(k=>!Object.hasOwn(input,k))||Object.entries(input).some(([k,v])=>!def.fields[k](v)))throw fail(400,'작업의 대상과 내용을 확인해주세요.');
 if(operation.endsWith('.update')&&Object.keys(input).every(k=>['id','list','connectionId'].includes(k)))throw fail(400,'수정할 내용을 적어주세요.');
 if(operation==='calendar.update'&&input.destinationCalendarId!==undefined&&input.destinationCalendarId===input.calendarId)throw fail(400,'이동할 캘린더를 다르게 선택해주세요.');
 if(operation==='calendar.update'&&!Object.keys(input).some(k=>!['id','calendarId','expectedETag','connectionId'].includes(k)))throw fail(400,'수정할 내용을 적어주세요.');
 if(operation.startsWith('calendar.')&&(operation==='calendar.create'||['allDay','start','end','startDate','endDate','timeZone'].some(k=>Object.hasOwn(input,k)))){
  if(input.allDay){if(!input.startDate||!input.endDate||input.endDate<=input.startDate||input.start!==undefined||input.end!==undefined)throw fail(400,'종일 일정의 시작일과 종료일을 확인해주세요.');}
  else if(!instant(input.start)||!instant(input.end)||Date.parse(input.end)<=Date.parse(input.start)||input.startDate!==undefined||input.endDate!==undefined)throw fail(400,'일정 종료는 시작 이후로 정해주세요.');
 }
 return structuredClone(input);
}
const encode=encodeURIComponent;
const rich=text=>[{type:'text',text:{content:text}}];
const blocks=text=>text.match(/[\s\S]{1,1800}/g).map(line=>({object:'block',type:'paragraph',paragraph:{rich_text:rich(line)}}));
const header=(value,name)=>value.payload?.headers?.find(h=>h.name.toLowerCase()===name.toLowerCase())?.value??'';
export function mailText(value) {
 const collect=part=>{if(part.mimeType==='text/plain'&&part.body?.data)return Buffer.from(part.body.data,'base64url').toString('utf8');return (part.parts??[]).map(collect).join('\n');};
 return (collect(value.payload??{})||value.snippet||'').slice(0,8000);
}
function rawMail(to,subject,text,reply) {
 const lines=[`To: ${to}`,`Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,`MIME-Version: 1.0`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64'];
 if(reply){if(!/^<[^<>\r\n]{1,250}>$/.test(reply))throw fail(409,'답장 원본의 Message-ID를 확인할 수 없어요.');lines.push(`In-Reply-To: ${reply}`,`References: ${reply}`);}
 return Buffer.from([...lines,'',Buffer.from(text).toString('base64').match(/.{1,76}/g).join('\r\n')].join('\r\n')).toString('base64url');
}
export function createProviderActions({store,token,request}) {
 async function access(user,operation,args) {
  const def=actionDefinitions[operation];if(!def||def.provider==='todo')return null;
  const record=await token(user,def.provider,args?.connectionId);if(!record.features.includes(def.feature))throw fail(403,'이 작업의 수정·발송 권한을 먼저 연결 화면에서 승인해주세요.');return record;
 }
 function opts(record,method,body,etag,notion=false){return {method,headers:{Authorization:'Bearer '+record.accessToken,'Content-Type':'application/json',...(etag?{'If-Match':etag}:{}),...(notion?{'Notion-Version':'2025-09-03'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})};}
 function selectedArgs(user,operation,args){if(!operation.startsWith('calendar.'))return args;const selected=calendarAccount(store,user,args.calendarId??'primary',args.connectionId);let destination;if(args.destinationCalendarId){destination=calendarAccount(store,user,args.destinationCalendarId);if(destination.connectionId!==selected.connectionId)throw fail(400,'이 일정은 같은 Google 계정 안의 캘린더로 이동해주세요.');}return {...args,...(args.calendarId?{calendarId:selected.calendarId}:{}),connectionId:selected.connectionId,...(destination?{destinationCalendarId:destination.calendarId}:{})};}
 async function inspect(user,operation,args){
  args=selectedArgs(user,operation,args);
  const def=actionDefinitions[operation],record=await access(user,operation,args);let target=null,version=null,extra={};
  const read=async url=>request(url,opts(record,'GET'),def.provider==='slack');
  if(operation==='todo.update'){target=store.get(user,args.id);if(!target)throw fail(404,'내 할 일을 찾지 못했어요.');version=JSON.stringify(target);}
  if(operation==='gmail.markRead'||operation==='gmail.reply'){
   target=await read('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encode(args.id)+'?format=full');version=JSON.stringify([target.historyId,target.threadId]);
   if(operation==='gmail.reply'){const recipient=header(target,'Reply-To')||header(target,'From');const to=/<([^<>]+)>/.exec(recipient)?.[1]??recipient.trim();if(!email(to))throw fail(409,'답장 받는 주소를 확인할 수 없어요.');extra={to,subject:('Re: '+header(target,'Subject').replace(/^Re:\s*/i,'')).slice(0,200),replyId:header(target,'Message-ID'),threadId:target.threadId};rawMail(extra.to,extra.subject,args.text,extra.replyId);}
  }
  if(operation.startsWith('calendar.')&&args.calendarId){const cal=await read('https://www.googleapis.com/calendar/v3/users/me/calendarList/'+encode(args.calendarId));if(!['owner','writer'].includes(cal.accessRole))throw fail(403,'이 캘린더는 읽기 전용이에요.');extra={calendarName:cal.summary??'선택한 캘린더'};}
  if(args.destinationCalendarId){const destination=await read('https://www.googleapis.com/calendar/v3/users/me/calendarList/'+encode(args.destinationCalendarId));if(!['owner','writer'].includes(destination.accessRole))throw fail(403,'이동할 캘린더는 읽기 전용이에요.');extra.destinationCalendarName=destination.summary??'선택한 캘린더';}
  if(['calendar.update','calendar.delete'].includes(operation)){target=await read('https://www.googleapis.com/calendar/v3/calendars/'+encode(args.calendarId??'primary')+'/events/'+encode(args.id));version=target.etag;if(!version||target.locked||target.status==='cancelled')throw fail(409,'일정 버전을 확인할 수 없어요.');if(args.expectedETag&&args.expectedETag!==version)throw fail(409,'열어둔 뒤 원본 일정이 바뀌었어요. 새로고침 후 다시 편집해주세요.');}
  if(args.destinationCalendarId&&(target?.eventType&&target.eventType!=='default'||target?.organizer?.self===false))throw fail(400,'이 일정은 다른 캘린더로 이동할 수 없어요.');
  if(operation==='tasks.create'){target=await read('https://www.googleapis.com/tasks/v1/users/@me/lists/'+encode(args.list));}
  if(operation==='tasks.update'){target=await read(`https://www.googleapis.com/tasks/v1/lists/${encode(args.list)}/tasks/${encode(args.id)}`);version=target.etag;if(!version||target.deleted)throw fail(409,'할 일의 원본 버전을 확인할 수 없어요.');}
  if(operation.startsWith('notion.')){target=await request('https://api.notion.com/v1/pages/'+encode(args.parent??args.id),opts(record,'GET',undefined,null,true));version=target.last_edited_time;if(target.archived||target.in_trash)throw fail(409,'보관되거나 삭제된 페이지예요.');}
  if(operation==='slack.send'||operation==='slack.update'){target=await read('https://slack.com/api/conversations.info?channel='+encode(args.channel));if(operation==='slack.update'){const item=await read(`https://slack.com/api/conversations.history?channel=${encode(args.channel)}&oldest=${encode(args.ts)}&latest=${encode(args.ts)}&inclusive=true&limit=1`);const own=await request('https://slack.com/api/auth.test',opts(record,'POST',{}),true);if(!item.messages?.[0]||item.messages[0].user!==own.user_id)throw fail(403,'연결한 덕 앱이 작성한 메시지만 수정할 수 있어요.');version=JSON.stringify(item.messages[0]);}}
  if(operation==='drive.rename'||operation==='drive.updateText'){target=await read('https://www.googleapis.com/drive/v3/files/'+encode(args.id)+'?fields=id,name,mimeType,version,modifiedTime,capabilities');if(!target.capabilities?.canEdit)throw fail(403,'이 파일을 수정할 권한이 없어요.');if(operation==='drive.updateText'&&target.mimeType!=='text/plain')throw fail(400,'일반 텍스트 파일만 내용을 교체할 수 있어요.');version=target.__etag;if(!version)throw fail(409,'파일 버전을 확인할 수 없어 수정을 멈췄어요.');}
  const notionTitle=def.provider==='notion'?Object.values(target?.properties??{}).find(p=>p.type==='title')?.title?.map(t=>t.plain_text??t.text?.content??'').join(''):null;
  return {connectionId:record?.connectionId??null,accountLabel:record?.label??null,version,extra,targetTitle:target?.title??target?.summary??target?.name??target?.channel?.name??notionTitle??(target?.payload?header(target,'Subject'):operation==='calendar.create'?'기본 캘린더':null)};
 }
 return {
  inspect,
  async execute(user,operation,args,preview,actionId){
   const current=await inspect(user,operation,args);
   if(current.connectionId!==preview.connectionId||current.version!==preview.version||current.extra?.destinationCalendarName!==preview.extra?.destinationCalendarName)throw fail(409,'연결 또는 원본이 바뀌었어요. 내용을 다시 확인해주세요.');
   if(operation==='todo.create')return {todo:store.create(user,{title:args.title.trim(),notes:args.notes??'',dueDate:args.dueDate??null,category:'업무'})};
   if(operation==='todo.update')return {todo:store.update(user,args.id,Object.fromEntries(Object.entries(args).filter(([k])=>k!=='id')))};
   args=selectedArgs(user,operation,args);const record=await access(user,operation,args);let url,method='POST',body,notion=false;
   if(operation==='gmail.markRead'){url=`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encode(args.id)}/modify`;body={addLabelIds:args.read?[]:['UNREAD'],removeLabelIds:args.read?['UNREAD']:[]};}
   if(operation==='gmail.reply'||operation==='gmail.send'){url='https://gmail.googleapis.com/gmail/v1/users/me/messages/send';const e=current.extra;body={raw:rawMail(e.to??args.to,e.subject??args.subject,args.text,e.replyId),...(e.threadId?{threadId:e.threadId}:{})};}
   if(operation==='slack.send'||operation==='slack.update'){url='https://slack.com/api/'+(operation==='slack.send'?'chat.postMessage':'chat.update');body={channel:args.channel,text:args.text,parse:'none',link_names:false,unfurl_links:false,unfurl_media:false,...(args.thread?{thread_ts:args.thread}:{}),...(args.ts?{ts:args.ts}:{}),...(operation==='slack.send'?{client_msg_id:actionId}:{})};}
   if(operation.startsWith('notion.')){notion=true;if(operation==='notion.create'){url='https://api.notion.com/v1/pages';body={parent:{page_id:args.parent},properties:{title:{type:'title',title:rich(args.title)}},children:blocks(args.text)};}else if(operation==='notion.append'){url=`https://api.notion.com/v1/blocks/${encode(args.id)}/children`;method='PATCH';body={children:blocks(args.text)};}else{url='https://api.notion.com/v1/pages/'+encode(args.id);method='PATCH';const page=await request(url,opts(record,'GET',undefined,null,true));const prop=Object.entries(page.properties??{}).find(([,v])=>v.type==='title')?.[0];if(!prop)throw fail(409,'제목 속성을 찾지 못했어요.');body={properties:{[prop]:{title:rich(args.title)}}};}}
   if(operation.startsWith('tasks.')){url=`https://www.googleapis.com/tasks/v1/lists/${encode(args.list)}/tasks`+(args.id?'/'+encode(args.id):'');method=operation==='tasks.update'?'PATCH':'POST';body={...(args.title!==undefined?{title:args.title}:{}),...(args.notes!==undefined?{notes:args.notes}:{}),...(args.dueDate!==undefined?{due:args.dueDate?args.dueDate+'T00:00:00.000Z':null}:{}),...(args.done!==undefined?{status:args.done?'completed':'needsAction',...(!args.done?{completed:null}:{})}:{})};}
   if(operation==='calendar.delete'){url='https://www.googleapis.com/calendar/v3/calendars/'+encode(args.calendarId)+'/events/'+encode(args.id)+'?sendUpdates=none';method='DELETE';}
   else if(operation.startsWith('calendar.')){url='https://www.googleapis.com/calendar/v3/calendars/'+encode(args.calendarId??'primary')+'/events'+(args.id?'/'+encode(args.id):'')+'?sendUpdates=none';method=args.id?'PATCH':'POST';body={...(args.title!==undefined?{summary:args.title}:{}),...((args.start||args.startDate)?{start:args.allDay?{date:args.startDate,...(args.id?{dateTime:null,timeZone:null}:{})}:{dateTime:args.start,...(args.id?{date:null}:{}),...(args.timeZone?{timeZone:args.timeZone}:{})},end:args.allDay?{date:args.endDate,...(args.id?{dateTime:null,timeZone:null}:{})}:{dateTime:args.end,...(args.id?{date:null}:{}),...(args.timeZone?{timeZone:args.timeZone}:{})}}:{}),...(args.location!==undefined?{location:args.location}:{}),...(args.notes!==undefined?{description:args.notes}:{}),...(!args.id?{id:actionId.replace(/-/g,'')}: {})};}
   if(operation==='drive.create'){const file=await request('https://www.googleapis.com/drive/v3/files',opts(record,'POST',{name:args.title,mimeType:'text/plain',appProperties:{duckduckAction:actionId}}));url='https://www.googleapis.com/upload/drive/v3/files/'+encode(file.id)+'?uploadType=media';method='PATCH';body=args.text;const result=await request(url,{method,headers:{Authorization:'Bearer '+record.accessToken,'Content-Type':'text/plain; charset=utf-8'},body});return {id:result.id??file.id};}
   if(operation==='drive.rename'){url='https://www.googleapis.com/drive/v3/files/'+encode(args.id);method='PATCH';body={name:args.title};}
   if(operation==='drive.updateText'){url='https://www.googleapis.com/upload/drive/v3/files/'+encode(args.id)+'?uploadType=media';const result=await request(url,{method:'PATCH',headers:{Authorization:'Bearer '+record.accessToken,'Content-Type':'text/plain; charset=utf-8','If-Match':current.version},body:args.text});return {id:result.id??args.id};}
   if(operation==='calendar.update'&&args.destinationCalendarId){
    // Move once; a later PATCH failure is a partial write, never a retryable failure.
    const moved=await request('https://www.googleapis.com/calendar/v3/calendars/'+encode(args.calendarId??'primary')+'/events/'+encode(args.id)+'/move?'+new URLSearchParams({destination:args.destinationCalendarId,sendUpdates:'none'}),opts(record,'POST',undefined,current.version));
    try{if(Object.keys(body).length){if(!moved.etag)throw fail(502,'이동한 일정 버전을 확인하지 못했어요.');await request('https://www.googleapis.com/calendar/v3/calendars/'+encode(args.destinationCalendarId)+'/events/'+encode(moved.id??args.id)+'?sendUpdates=none',opts(record,'PATCH',body,moved.etag));}}
    catch{throw fail(502,'캘린더는 이동했지만 일부 변경을 확인하지 못했어요. 다시 실행하지 말고 일정을 새로고침해주세요.');}
    return {id:moved.id??args.id,calendarId:args.destinationCalendarId};
   }
   const result=await request(url,opts(record,method,body,['calendar.update','calendar.delete','tasks.update','drive.rename'].includes(operation)?current.version:null,notion),operation.startsWith('slack.'));
   return {id:result.id??result.ts??(operation==='calendar.delete'?args.id:null)};
  },
 };
}

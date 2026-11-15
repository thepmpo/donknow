import type {Todo} from './domain.ts';
export type TodoView='date'|'source';
export function todoSource(todo:Todo){
 const s=todo.source;
 if(!s)return {key:'local',label:'직접 작성',icon:'create-outline' as const,color:'#788391'};
 if(s.provider==='google')return s.externalId.includes(':tasks:')?{key:'google-tasks',label:'Google Tasks',icon:'checkmark-circle-outline' as const,color:'#4285F4'}:s.externalId.includes(':calendar')?{key:'google-calendar',label:'Google Calendar',icon:'calendar-outline' as const,color:'#4285F4'}:s.externalId.includes(':gmail:')?{key:'gmail',label:'Gmail',icon:'mail-outline' as const,color:'#D64B40'}:{key:'google',label:'Google',icon:'logo-google' as const,color:'#4285F4'};
 const values:Record<string,{key:string;label:string;icon:'logo-slack'|'checkbox-outline'|'document-text-outline'|'mail-outline';color:string}>={slack:{key:'slack',label:'Slack',icon:'logo-slack',color:'#B96ED8'},'apple-reminders':{key:'apple-reminders',label:'미리알림',icon:'checkbox-outline',color:'#E59337'},notion:{key:'notion',label:'Notion',icon:'document-text-outline',color:'#788391'},naver:{key:'naver',label:'네이버 메일',icon:'mail-outline',color:'#19A363'}};
 return values[s.provider]??{key:s.provider,label:'연결된 자료',icon:'document-text-outline' as const,color:'#788391'};
}
export const compareTodoOrder=(a:Todo,b:Todo)=> (a.order??Number.MAX_SAFE_INTEGER)-(b.order??Number.MAX_SAFE_INTEGER)||(a.dueTime??'99:99').localeCompare(b.dueTime??'99:99');
export function sourceAgenda(todos:Todo[]){
 const groups=new Map<string,{key:string;day:string;title:string;source:ReturnType<typeof todoSource>;todos:Todo[];events:never[]}>();
 for(const todo of todos){const source=todoSource(todo);if(!groups.has(source.key))groups.set(source.key,{key:'source:'+source.key,day:'',title:source.label,source,todos:[],events:[]});groups.get(source.key)!.todos.push(todo);}
 const priority=['slack','google-tasks','google-calendar','gmail','google','apple-reminders','notion','naver','local'];
 return [...groups.values()].sort((a,b)=>priority.indexOf(a.source.key)-priority.indexOf(b.source.key)||a.title.localeCompare(b.title)).map(g=>({...g,todos:g.todos.sort(compareTodoOrder)}));
}
/** One shared item order, while retaining the relative order of a selected group. */
export function moveTodoIds(items:Todo[],moving:string[],before:string|null){
 const ids=new Set(moving),ordered=[...items].sort(compareTodoOrder),picked=ordered.filter(t=>ids.has(t.id)),rest=ordered.filter(t=>!ids.has(t.id));
 if(!picked.length||before&&ids.has(before))return ordered.map(t=>t.id);
 const at=before?rest.findIndex(t=>t.id===before):rest.length;
 if(at<0)return ordered.map(t=>t.id);
 rest.splice(at,0,...picked);return rest.map(t=>t.id);
}

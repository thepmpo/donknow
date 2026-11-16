import {fail} from './secrets.js';
const hosts={google:['calendar.google.com','tasks.google.com','mail.google.com','drive.google.com','docs.google.com'],slack:['slack.com','app.slack.com'],notion:['notion.so','www.notion.so','notion.site']};
export function safeTodoSourceLink(value,provider){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!(provider==='google'&&u.hostname==='www.google.com'&&/^\/calendar\/(event|render)$/.test(u.pathname)||hosts[provider]?.some(h=>u.hostname===h||h==='slack.com'&&u.hostname.endsWith('.slack.com')||h==='notion.site'&&u.hostname.endsWith('.notion.site'))))return null;return u.href;}catch{return null;}
}
export async function originalTodoLink(store,integrations,user,id){
 const todo=store.get(user,id);if(!todo?.source)throw fail(404,'이 할 일에 연결된 원본이 없어요.');
 const known=safeTodoSourceLink(todo.source.url,todo.source.provider);
 const url=known??safeTodoSourceLink(await integrations.originalLink(user,todo),todo.source.provider);
 if(!url)throw fail(404,'이 항목의 원본 링크를 확인하지 못했어요. 원본 앱에서 제목으로 찾아주세요.');
 return {url};
}

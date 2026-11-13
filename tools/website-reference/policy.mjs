export const SOURCE='https://pickle.com/ko';
const hosts=new Set(['pickle.com','www.pickle.com','d3h202kifjtcwm.cloudfront.net','fonts.googleapis.com','fonts.gstatic.com']);
export function publicAsset(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&hosts.has(u.hostname)&&![...u.searchParams.keys()].some(k=>/^(token|access_token|authorization|password|secret)$/i.test(k));}catch{return false;}}
export function realLanding(text){return typeof text==='string'&&text.length>350&&!/Something went wrong|Access Denied|Checking your browser/i.test(text)&&/피클|Pickle/.test(text)&&/AI|에이전트/.test(text);}
export function downloadable({status,type,length,total}){return status===200&&/^(image\/|font\/|video\/|text\/css|application\/(font|octet-stream))/.test(type)&&length>0&&length<=25*1024*1024&&total+length<=120*1024*1024;}

export type Provider='google'|'slack'|'notion';
export type IntegrationStatus={provider:Provider;name?:string;configured:boolean;connected:boolean;label?:string|null;features:string[];availableFeatures?:string[]};
export const providerNames:Record<Provider,string>={google:'Google',slack:'Slack',notion:'Notion'};
const permissions:Record<string,string>={calendar:'일정 읽기',calendarWrite:'일정 작성·수정',gmail:'메일 읽기',gmailModify:'메일 상태 수정',gmailSend:'메일 발송',drive:'Drive 목록 읽기',driveContent:'Drive 내용 읽기',driveWrite:'허용한 Drive 파일 수정',tasks:'할 일 읽기',tasksWrite:'할 일 완료 상태 수정',channels:'채널 목록 읽기',messages:'메시지 읽기',messagesWrite:'Slack 메시지 작성·수정',pages:'페이지 읽기',pagesWrite:'Notion 페이지 작성·수정'};
export function permissionSummary(features:string[]=[]){const labels=[...new Set(features.map(key=>permissions[key]).filter(Boolean))];return labels.length?labels.join(' · '):'허용한 기능은 연결 관리에서 확인할 수 있어요.';}
export function integrationState(status:IntegrationStatus|undefined,failed=false){if(failed)return status?.connected?'연결됨 · 상태 재확인 필요':'상태 확인 필요';if(!status)return '확인 중';return status.connected?'연결됨':status.configured?'연결하기':'준비 중';}
export function readIntegrationStatuses(value:unknown):IntegrationStatus[]{
 if(!Array.isArray(value)||!value.length||value.some(v=>!v||!Object.hasOwn(providerNames,v.provider)||typeof v.connected!=='boolean'||typeof v.configured!=='boolean'||!Array.isArray(v.features)||v.features.some((f:unknown)=>typeof f!=='string')||(v.label!=null&&typeof v.label!=='string')))throw Error('연결 상태를 확인하지 못했어요. 기존 연결은 유지돼요.');
 return value;
}
export type TaskSyncStatus={enabled:boolean;canEnable:boolean;jobs:{todoId:string;status:string;error?:string|null}[]};
export function readTaskSyncStatus(value:unknown):TaskSyncStatus{const v=value as TaskSyncStatus;if(!v||typeof v.enabled!=='boolean'||typeof v.canEnable!=='boolean'||!Array.isArray(v.jobs)||v.jobs.some(j=>!j||typeof j.todoId!=='string'||typeof j.status!=='string'||(j.error!=null&&typeof j.error!=='string')))throw Error('동기화 상태를 확인하지 못했어요. 다시 확인해주세요.');return v;}

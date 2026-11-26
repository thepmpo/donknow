/** No response body, token, or URL is included in transport diagnostics. */
export class InvalidJsonResponseError extends Error {
 status:number;
 constructor(status:number){super(status===502||status===503||status===504?'서버가 준비 중이에요. 잠시 뒤 다시 시도해주세요.':'서버에서 올바른 응답을 받지 못했어요. 다시 확인해주세요.');this.status=status;}
}
export class TransportResponseError extends Error {}
export class HttpResponseError extends Error {
 status:number;
 readonly code?:string;
 constructor(status:number,message:string,code?:string){super(message);this.status=status;this.code=code;}
}
export async function readJsonResponse(response:Response):Promise<unknown>{
 let value:unknown;
 try{value=await response.json();}catch(error){
  // A body read can time out after the HTTP headers arrive. Preserve that cause.
  if(error instanceof Error&&error.name==='AbortError')throw error;
  throw new InvalidJsonResponseError(response.status);
 }
 if(!response.ok){
  const body=value&&typeof value==='object'?value as {error?:unknown;code?:unknown}:null;
  throw new HttpResponseError(response.status,typeof body?.error==='string'?body.error:'서버 요청에 실패했어요. 다시 시도해주세요.',
   typeof body?.code==='string'?body.code:undefined);
 }
 return value;
}
export function calendarReadTimeout(path:string,method:string){return method==='GET'&&/^\/api\/calendar\/(events|calendars)(?:\?|$)/.test(path);}
export function validCalendarPage(value:unknown):boolean{
 if(!value||typeof value!=='object'||!('items' in value)||!Array.isArray(value.items))return false;
 return value.items.every(item=>!!item&&typeof item==='object'&&typeof item.id==='string'&&typeof item.title==='string')&&(!('nextCursor' in value)||value.nextCursor===null||typeof value.nextCursor==='string');
}

/** Cold-start reads may wait for Render; never replay a write or consent. */
export function connectionRead(path:string,method:string){return method==='GET'&&(/^\/api\/(todos|capabilities)(?:\?|$)/.test(path)||/^\/api\/integrations(?:\?|$|\/(?:google|notion|slack)\/(?:resources|task-sync|diagnose)(?:\?|$))/.test(path)||/^\/api\/assistant\/(?:status|actions|conversation|memory(?:\/settings)?)(?:\?|$)/.test(path)||/^\/api\/(?:automations|agent\/(?:profile|jobs|files|responsibilities|computers|rules|notes|contacts|chat\/[a-f0-9-]{36}))(?:\?|$)/.test(path)||calendarReadTimeout(path,method)||/^\/api\/calendar\/docen\/event-[a-z0-9-]+$/.test(path));}
export function cancelledTransport(error:unknown){return error instanceof Error&&(/fetch request has been cancel[le]+d|network request.*cancel[le]+d/i.test(error.message));}

/** Warm only before explicitly requested app writes, never replay OAuth or imports. */
export function connectionWrite(path:string,method:string){return method!=='GET'&&(/^\/api\/calendar\/docen\/event-[a-z0-9-]+(?:\/(?:apple-delivery|reconcile))?$/.test(path)||/^\/api\/todos(?:\/[a-f0-9-]{36}(?:\/source-(?:retry|result))?)?(?:\?|$)/.test(path)||/^\/api\/integrations\/(?:google|slack|notion)\/(?:authorize|import|diagnose|task-sync(?:\/(?:pull|retry))?)(?:\?|$)/.test(path)||/^\/api\/integrations\/(?:apple-reminders\/import|naver)(?:\?|$)/.test(path)||method==='DELETE'&&/^\/api\/integrations\/(?:google|slack|notion)(?:\?|$)/.test(path));}

/** The create endpoint deduplicates the same event ID and unchanged request body. */
export function retryableDocenCalendarCreate(error:unknown){
 if(error instanceof InvalidJsonResponseError)return error.status===200||error.status>=500;
 if(error instanceof HttpResponseError)return error.status===408||error.status===429||error.status>=500;
 return error instanceof TransportResponseError;
}

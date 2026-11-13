/** No response body, token, or URL is included in transport diagnostics. */
export class InvalidJsonResponseError extends Error {
 status:number;
 constructor(status:number){super(status===502||status===503||status===504?'서버가 준비 중이에요. 잠시 뒤 다시 시도해주세요.':'서버에서 올바른 응답을 받지 못했어요. 다시 확인해주세요.');this.status=status;}
}
export async function readJsonResponse(response:Response):Promise<unknown>{
 let value:unknown;
 try{value=await response.json();}catch(error){
  // A body read can time out after the HTTP headers arrive. Preserve that cause.
  if(error instanceof Error&&error.name==='AbortError')throw error;
  throw new InvalidJsonResponseError(response.status);
 }
 if(!response.ok){const error=value&&typeof value==='object'&&'error' in value?value.error:null;throw new Error(typeof error==='string'?error:'서버 요청에 실패했어요. 다시 시도해주세요.');}
 return value;
}
export function calendarReadTimeout(path:string,method:string){return method==='GET'&&/^\/api\/calendar\/(events|calendars)(?:\?|$)/.test(path);}
export function validCalendarPage(value:unknown):boolean{
 if(!value||typeof value!=='object'||!('items' in value)||!Array.isArray(value.items))return false;
 return value.items.every(item=>!!item&&typeof item==='object'&&typeof item.id==='string'&&typeof item.title==='string')&&(!('nextCursor' in value)||value.nextCursor===null||typeof value.nextCursor==='string');
}

/** Cold-start reads may wait for Render; never replay a write or consent. */
export function connectionRead(path:string,method:string){return method==='GET'&&(/^\/api\/(todos|integrations|capabilities)(?:[/?]|$)/.test(path)||calendarReadTimeout(path,method));}
export function cancelledTransport(error:unknown){return error instanceof Error&&(/fetch request has been cancel[le]+d|network request.*cancel[le]+d/i.test(error.message));}

import {randomUUID} from 'node:crypto';
import {fail} from './secrets.js';
import {aiFetch} from './ai-transport.js';
const positive=(v,max)=>Number.isSafeInteger(v)&&v>0&&v<=max;
const exhausted=()=>Object.assign(fail(402,'AI 처리 예산이 없거나 이번 달 한도에 도달했어요. 기본 할 일·캘린더와 원본 자료는 계속 확인할 수 있어요.'),{code:'AI_BUDGET_LIMIT'});
const period=now=>new Date(now).toISOString().slice(0,7);
/** No client endpoint can grant funds. Deposits represent an operator-verified, settled allocation. */
export function aiBudgetStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS ai_funding(reference TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,period TEXT NOT NULL,net_krw INTEGER NOT NULL,credit_milli INTEGER NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS ai_costs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,period TEXT NOT NULL,amount_milli INTEGER NOT NULL,state TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS ai_costs_user_period ON ai_costs(user_id,period);
 CREATE INDEX IF NOT EXISTS ai_funding_user_period ON ai_funding(user_id,period);`);
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}};
 function usage(user,now){const month=period(now),row=db.prepare('SELECT (SELECT COALESCE(SUM(credit_milli),0) FROM ai_funding WHERE user_id=? AND period=?) AS funded,(SELECT COALESCE(SUM(amount_milli),0) FROM ai_costs WHERE user_id=? AND period=?) AS cost').get(user,month,user,month);return {period:month,fundedMilli:row.funded,usedMilli:row.cost,remainingMilli:Math.max(0,row.funded-row.cost)};}
 return {
  fundAiAllowance(user,{reference,netProceedsKrw},now=Date.now()){
   if(typeof reference!=='string'||!/^[\w:.-]{8,160}$/.test(reference)||!positive(netProceedsKrw,10000000))throw fail(400,'확인한 정산 금액과 고유 결제 참조를 입력해주세요.');
   return tx(()=>{const old=db.prepare('SELECT * FROM ai_funding WHERE reference=?').get(reference);if(old){if(old.user_id!==user||old.net_krw!==netProceedsKrw)throw fail(409,'이미 다른 정산에 사용한 참조예요.');return this.aiBudget(user,now);}
    const before=usage(user,now),credit=Math.max(0,Math.min(4000000-before.fundedMilli,Math.floor(netProceedsKrw*.25)*1000));
    db.prepare('INSERT INTO ai_funding VALUES (?,?,?,?,?,?)').run(reference,user,period(now),netProceedsKrw,credit,now);return this.aiBudget(user,now);
   });
  },
  aiBudget(user,now=Date.now()){const v=usage(user,now);return {period:v.period,limitKrw:v.fundedMilli/1000,usedKrw:v.usedMilli/1000,remainingKrw:v.remainingMilli/1000,funded:v.fundedMilli>0,proPriceKrw:27900,automaticBilling:false};},
  reserveAiCost(user,amountKrw,now=Date.now()){
   const amount=Math.ceil(amountKrw*1000);if(!positive(amount,100000000))throw exhausted();
   return tx(()=>{const u=usage(user,now);if(amount>u.remainingMilli)throw exhausted();const id=randomUUID();db.prepare("INSERT INTO ai_costs VALUES (?,?,?,?, 'reserved',?)").run(id,user,u.period,amount,now);return {id,user,amountMilli:amount};});
  },
  settleAiCost(reservation,actualKrw){
   if(!Number.isFinite(actualKrw)||actualKrw<0)return;
   const actual=Math.ceil(actualKrw*1000);
   // A transport failure or missing usage keeps the full reservation. No timeout refund.
   db.prepare("UPDATE ai_costs SET amount_milli=?,state='settled' WHERE id=? AND user_id=? AND state='reserved'").run(actual,reservation.id,reservation.user);
  },
 };
}
const rates={
 'gpt-5.4-mini':[.75,4.5],'gpt-5.4-nano':[.2,1.25],
 'gpt-6-luna':[.1,.5],'gpt-6.1-terra':[1,5],'gpt-6.1-sol':[2,10],'gpt-6-astra':[10,50],
 'gpt-4.1-mini':[.4,1.6],'gpt-4.1-nano':[.1,.4],'gpt-4.1':[2,8],
 'gpt-4o-mini':[.15,.6],'gpt-4o':[2.5,10],'text-embedding-3-small':[.02,0],
};
export function aiCostReservation(body,env={}){
 const model=String(body.model??'').replace(/-\d{4}-\d{2}-\d{2}$/,''),rate=rates[model];
 if(!rate)throw Object.assign(fail(409,'이 모델의 비용 한도를 먼저 확인해야 해요. 확인 전에는 유료 AI 요청을 보내지 않아요.'),{code:'AI_COST_UNVERIFIED'});
 if(body.tools?.some(t=>!['function'].includes(t.type))||JSON.stringify(body.input??'').includes('"input_image"')||JSON.stringify(body.input??'').includes('"input_file"'))throw Object.assign(fail(409,'웹 검색·이미지·PDF·실행 분석은 별도 비용 확인이 필요해요. 연결 자료 검색이나 문서의 텍스트로 대신할 수 있어요.'),{code:'AI_COST_UNVERIFIED'});
 const bytes=Buffer.byteLength(JSON.stringify(body)),maxOutput=body.max_output_tokens??0;
 if(bytes>2000000||!Number.isSafeInteger(maxOutput)||maxOutput<0||maxOutput>8000)throw Object.assign(fail(413,'한 번에 처리할 자료가 많아요. 문서나 질문을 나눠주세요.'),{code:'AI_COST_UNVERIFIED'});
 const fx=Number(env.AI_COST_FX_KRW)||1600;
 if(fx<1000||fx>10000)throw fail(503,'AI 비용 환율 설정을 확인해주세요.');
 const inputBound=bytes*2+8192;
 return {rate,fx,reserveKrw:(inputBound*rate[0]+maxOutput*rate[1])/1000000*fx*1.2};
}
export const isAiFixture=(env,fetcher)=>(env.NODE_ENV==='test'||!!process.env.NODE_TEST_CONTEXT&&fetcher!==globalThis.fetch)&&env.AI_COST_PROTECTION!=='true';
export function createBudgetedAiFetch(store,{env=process.env,fetcher=fetch}={}){
 // Only explicit fake-provider unit fixtures bypass accounting. Production fetch never does.
 const fixture=isAiFixture(env,fetcher),transport=aiFetch(fetcher,env.NODE_ENV==='test'?()=>{}:console.warn);
 return async(user,url,options)=>{
  if(fixture)return transport(url,options);
  if(!['https://api.openai.com/v1/responses','https://api.openai.com/v1/embeddings'].includes(String(url)))throw Object.assign(fail(409,'음성·파일 실행의 별도 예산을 확인해야 해요. 텍스트 대화로 대신할 수 있어요.'),{code:'AI_COST_UNVERIFIED'});
  if(!store.aiBudget?.(user).funded)throw exhausted();
  const body=JSON.parse(options.body);
  if(String(url).endsWith('/responses')&&!positive(body.max_output_tokens,8000))throw Object.assign(fail(409,'응답 길이 한도를 먼저 확인해야 해요.'),{code:'AI_COST_UNVERIFIED'});
  const quote=aiCostReservation(body,env),reservation=store.reserveAiCost(user,quote.reserveKrw);
  const response=await transport(url,options);
  if(response.ok){try{const value=await response.clone().json(),u=value.usage,input=u?.input_tokens??u?.prompt_tokens??u?.total_tokens,output=u?.output_tokens??u?.completion_tokens??0;if(Number.isSafeInteger(input)&&input>=0&&Number.isSafeInteger(output)&&output>=0){const actual=(input*quote.rate[0]+output*quote.rate[1])/1000000*quote.fx*1.2;store.settleAiCost(reservation,actual);}}catch{}}
  return response;
 };
}

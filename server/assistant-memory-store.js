import {randomUUID,createHash} from 'node:crypto';
import {fail} from './secrets.js';
import {briefingKey} from './briefing-store.js';
const text=(v,max)=>typeof v==='string'&&!!v.trim()&&v.length<=max;
export function assistantMemoryStore(db,box){
 db.exec(`CREATE TABLE IF NOT EXISTS assistant_memory_settings(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,enabled INTEGER NOT NULL,revision INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS assistant_memories(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,payload TEXT NOT NULL,updated_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS assistant_memory_owner ON assistant_memories(user_id,updated_at);
 CREATE TABLE IF NOT EXISTS assistant_conversations(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,request_id TEXT NOT NULL,role TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(user_id,request_id,role));
 CREATE INDEX IF NOT EXISTS assistant_conversation_owner ON assistant_conversations(user_id,created_at,id);
 CREATE TABLE IF NOT EXISTS assistant_conversation_runs(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,request_id TEXT NOT NULL,digest TEXT NOT NULL,lease TEXT NOT NULL,expires_at INTEGER NOT NULL,revision INTEGER NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(user_id,request_id));`);
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(error){db.exec('ROLLBACK');throw error;}};
 const settings=user=>{const row=db.prepare('SELECT enabled,revision FROM assistant_memory_settings WHERE user_id=?').get(user);return {enabled:!!row?.enabled,revision:row?.revision??0};};
 const turn=row=>({id:row.id,...box.open(row.payload),role:row.role,createdAt:row.created_at});
 function validateNote(value){if(!text(value,1000))throw fail(400,'기억할 내용은1,000자 이내로 적어주세요.');return value.trim();}
 return {
  memorySettings(user){return {...settings(user),count:db.prepare('SELECT count(*) AS n FROM assistant_memories WHERE user_id=?').get(user).n,turnCount:db.prepare('SELECT count(*) AS n FROM assistant_conversations WHERE user_id=?').get(user).n};},
  configureMemory(user,enabled){if(typeof enabled!=='boolean')throw fail(400,'기억 사용 여부를 확인해주세요.');db.prepare('INSERT INTO assistant_memory_settings VALUES (?,?,1) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,revision=assistant_memory_settings.revision+1').run(user,enabled?1:0);return this.memorySettings(user);},
  memories(user){return db.prepare('SELECT * FROM assistant_memories WHERE user_id=? ORDER BY updated_at DESC,id').all(user).map(row=>({id:row.id,...box.open(row.payload),updatedAt:row.updated_at}));},
  saveMemory(user,value,{id,quote,sourceTurnId,automatic=false}={}){
   const content=validateNote(value);if(automatic&&!settings(user).enabled)throw fail(409,'기억 사용이 꺼졌어요.');
   if(id&&!db.prepare('SELECT 1 FROM assistant_memories WHERE user_id=? AND id=?').get(user,id))throw fail(404,'내 기억을 찾을 수 없어요.');
   if(automatic){if(!text(quote,2000)||!sourceTurnId)throw fail(400,'사용자가 말한 근거를 확인해주세요.');const row=db.prepare("SELECT * FROM assistant_conversations WHERE id=? AND user_id=? AND role='user'").get(sourceTurnId,user);if(!row||!box.open(row.payload).text.includes(quote))throw fail(400,'사용자의 실제 말에서 확인한 내용만 기억할 수 있어요.');}
   const existing=this.memories(user).find(note=>note.text.normalize('NFKC')===content.normalize('NFKC'));if(!id&&existing)return existing;
   if(!id&&this.memories(user).length>=500)throw fail(409,'저장된 기억이500개예요. ME에서 오래된 기억을 정리해주세요.');
   id??=randomUUID();const now=Date.now();db.prepare('INSERT INTO assistant_memories VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at WHERE user_id=excluded.user_id').run(id,user,box.seal({text:content,source:automatic?'conversation':'user',sourceTurnId:sourceTurnId??null,quote:quote??null}),now);return this.memories(user).find(note=>note.id===id);
  },
  forgetMemory(user,id){if(!db.prepare('DELETE FROM assistant_memories WHERE user_id=? AND id=?').run(user,id).changes)throw fail(404,'내 기억을 찾을 수 없어요.');db.prepare('UPDATE assistant_memory_settings SET revision=revision+1 WHERE user_id=?').run(user);return {ok:true};},
  clearAssistantMemory(user,{conversations=false}={}){return tx(()=>{db.prepare('DELETE FROM assistant_memories WHERE user_id=?').run(user);if(conversations){db.prepare('DELETE FROM push_outbox WHERE user_id=?').run(user);db.prepare('DELETE FROM assistant_messages WHERE user_id=?').run(user);db.prepare('DELETE FROM assistant_conversations WHERE user_id=?').run(user);db.prepare('DELETE FROM assistant_conversation_runs WHERE user_id=?').run(user);}db.prepare('UPDATE assistant_memory_settings SET revision=revision+1 WHERE user_id=?').run(user);return {ok:true};});},
  conversation(user,{before=null,limit=40}={}){
   const anchor=before?db.prepare('SELECT created_at,id FROM assistant_conversations WHERE id=? AND user_id=?').get(before,user):null;if(before&&!anchor)throw fail(404,'내 대화 위치를 찾을 수 없어요.');
   const rows=db.prepare('SELECT * FROM assistant_conversations WHERE user_id=?'+(anchor?' AND (created_at<? OR (created_at=? AND id<?))':'')+' ORDER BY created_at DESC,id DESC LIMIT ?').all(user,...(anchor?[anchor.created_at,anchor.created_at,anchor.id]:[]),Math.min(2000,limit)+1);
   const hasMore=rows.length>limit,page=rows.slice(0,limit).reverse().map(row=>{const value=turn(row);if(value.role==='user'&&value.state==='sending'){const run=db.prepare('SELECT status,expires_at FROM assistant_conversation_runs WHERE user_id=? AND request_id=?').get(user,row.request_id);if(!run||run.status!=='running'||run.expires_at<=Date.now())value.state='failed';}return value;});return {turns:this.decorateBriefings(user,page),before:hasMore?page[0]?.id??null:null};
  },
  searchConversation(user,query,before=null){if(!text(query,120))throw fail(400,'찾을 내용을120자 이내로 적어주세요.');const page=this.conversation(user,{before,limit:2000}),terms=[...new Set(query.normalize('NFKC').toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>1))].slice(0,12);if(!terms.length)return {turns:[],partial:!!page.before,before:page.before};const scored=page.turns.map(t=>({turn:t,score:terms.reduce((n,w)=>n+(t.text.normalize('NFKC').toLocaleLowerCase().includes(w)?1:0),0)})).filter(t=>t.score).sort((a,b)=>b.score-a.score||b.turn.createdAt-a.turn.createdAt);return {turns:scored.slice(0,8).map(({turn:{id,role,text,createdAt}})=>({id,role,text:text.slice(0,2500),createdAt})),partial:!!page.before,before:page.before};},
  claimConversation(user,requestId,input,now=Date.now()){
   if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{8,120}$/.test(requestId))throw fail(400,'대화 요청 번호를 확인해주세요.');
   const digest=createHash('sha256').update(JSON.stringify(input)).digest('hex');return tx(()=>{const pref=settings(user);if(!pref.enabled)throw fail(409,'기억 설정이 바뀌었어요. 다시 보내주세요.');const row=db.prepare('SELECT * FROM assistant_conversation_runs WHERE user_id=? AND request_id=?').get(user,requestId);
    if(row&&row.digest!==digest)throw fail(409,'같은 요청 번호의 내용이 바뀌었어요.');if(row?.status==='succeeded'){const response=box.open(row.payload);if(response.conversation?.assistantTurn)response.conversation.assistantTurn=this.decorateBriefings(user,[response.conversation.assistantTurn])[0];return {response};}if(row?.status==='running'&&row.expires_at>now)throw fail(409,'앞선 답변을 준비 중이에요. 잠시 뒤 대화 기록에서 확인해주세요.');
    const lease=randomUUID(),userTurnId=db.prepare("SELECT id FROM assistant_conversations WHERE user_id=? AND request_id=? AND role='user'").get(user,requestId)?.id??randomUUID();
    db.prepare("INSERT INTO assistant_conversation_runs VALUES (?,?,?,?,?,?,'running',?) ON CONFLICT(user_id,request_id) DO UPDATE SET lease=excluded.lease,expires_at=excluded.expires_at,revision=excluded.revision,status='running',payload=excluded.payload").run(user,requestId,digest,lease,now+300000,pref.revision,box.seal({}));
    db.prepare("INSERT INTO assistant_conversations VALUES (?,?,?,'user',?,?) ON CONFLICT(user_id,request_id,role) DO UPDATE SET payload=excluded.payload").run(userTurnId,user,requestId,box.seal({text:input.message,state:'sending'}),now);
    return {userId:user,requestId,lease,revision:pref.revision,userTurnId};
   });
  },
  completeConversation(run,result,now=Date.now()){return tx(()=>{
   const row=db.prepare("SELECT * FROM assistant_conversation_runs WHERE user_id=? AND request_id=? AND lease=? AND status='running'").get(run.userId,run.requestId,run.lease),pref=settings(run.userId);if(!row||!pref.enabled||pref.revision!==run.revision)throw fail(409,'대화·기억 설정이 바뀌어 답변을 저장하지 않았어요.');
   const userRow=db.prepare('SELECT payload,created_at FROM assistant_conversations WHERE id=? AND user_id=?').get(run.userTurnId,run.userId);now=Math.max(now,userRow.created_at+1);
   const id=randomUUID(),items=result.proposals.flatMap((p,i)=>p.operation==='todo.create'?[{key:briefingKey('chat:'+id+':'+i),proposalIndex:i,title:p.args.title,notes:p.args.notes??'',dueDate:p.args.dueDate??null,sourceRefs:p.sourceRefs}]:[]),assistantTurn={id,role:'assistant',text:result.answer,proposals:result.proposals,items,createdAt:now};
   db.prepare("INSERT INTO assistant_conversations VALUES (?,?,?,'assistant',?,?)").run(id,run.userId,run.requestId,box.seal({text:result.answer,proposals:result.proposals,items}),now);
   const userTurn={id:run.userTurnId,...box.open(userRow.payload),role:'user',state:'sent',createdAt:userRow.created_at};
   db.prepare('UPDATE assistant_conversations SET payload=? WHERE id=? AND user_id=?').run(box.seal({text:userTurn.text,state:'sent'}),run.userTurnId,run.userId);
   const response={...result,sources:(result.sources??[]).map(source=>({ref:source.ref,provider:source.provider,kind:source.kind,title:source.title,text:'',completed:source.completed,partial:source.partial,locator:source.locator})),conversation:{requestId:run.requestId,userTurn,assistantTurn}};db.prepare("UPDATE assistant_conversation_runs SET status='succeeded',payload=? WHERE user_id=? AND request_id=? AND lease=?").run(box.seal(response),run.userId,run.requestId,run.lease);return response;
  });},
  failConversation(run){const row=db.prepare("SELECT * FROM assistant_conversation_runs WHERE user_id=? AND request_id=? AND lease=? AND status='running'").get(run.userId,run.requestId,run.lease);if(!row)return;db.prepare("UPDATE assistant_conversation_runs SET status='failed' WHERE user_id=? AND request_id=? AND lease=?").run(run.userId,run.requestId,run.lease);const original=db.prepare('SELECT payload FROM assistant_conversations WHERE id=? AND user_id=?').get(run.userTurnId,run.userId);if(original)db.prepare('UPDATE assistant_conversations SET payload=? WHERE id=? AND user_id=?').run(box.seal({...box.open(original.payload),state:'failed'}),run.userTurnId,run.userId);},
  exportAssistantMemory(user){return {settings:this.memorySettings(user),memories:this.memories(user),turns:db.prepare('SELECT * FROM assistant_conversations WHERE user_id=? ORDER BY created_at,id').all(user).map(turn)};},
 };
}

/** Called only on a new, isolated restore target. Never replay captured agent work. */
export function suspendRestoredAssistant(db){
 const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));
 if(tables.has('assistant_event_queue'))db.exec('DELETE FROM assistant_event_queue');
 if(tables.has('assistant_watches'))db.exec("UPDATE assistant_watches SET status='cancelled',expires_at=0");
 if(tables.has('assistant_conversation_runs'))db.exec("UPDATE assistant_conversation_runs SET status='failed',expires_at=0 WHERE status='running'");
}

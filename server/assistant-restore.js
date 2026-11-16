/** Called only on a new, isolated restore target. Never replay captured agent work. */
export function suspendRestoredAssistant(db){
 const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));
 if(tables.has('assistant_event_queue'))db.exec('DELETE FROM assistant_event_queue');
 if(tables.has('source_edit_outbox')){
  db.exec("UPDATE source_edit_outbox SET status='cancelled',lease=NULL,lease_until=0 WHERE status IN ('queued','running')");
  db.exec("UPDATE todos SET data=json_set(data,'$.sourceSync.state','unknown') WHERE json_extract(data,'$.sourceSync.state')='queued'");
 }
 if(tables.has('assistant_watches'))db.exec("UPDATE assistant_watches SET status='cancelled',expires_at=0");
 if(tables.has('agent_profiles')){db.exec('CREATE TABLE IF NOT EXISTS agent_restore_stops(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE)');db.exec('INSERT OR IGNORE INTO agent_restore_stops SELECT user_id FROM agent_profiles');}
 if(tables.has('agent_contacts'))db.exec('UPDATE agent_contacts SET enabled=0');
 for(const name of ['agent_contact_codes','agent_contact_messages'])if(tables.has(name))db.exec('DELETE FROM '+name);
 if(tables.has('agent_events'))db.exec('DELETE FROM agent_events');
 if(tables.has('agent_calls'))db.exec("UPDATE agent_calls SET status='closed',expires_at=0");
 if(tables.has('agent_jobs'))db.exec("UPDATE agent_jobs SET status='paused',lease=NULL,revision=revision+1 WHERE status NOT IN ('succeeded','cancelled','failed')");
 if(tables.has('agent_responsibilities'))db.exec('UPDATE agent_responsibilities SET enabled=0,revision=revision+1');
 if(tables.has('agent_chat_requests'))db.exec('DELETE FROM agent_chat_requests');
 if(tables.has('agent_computers'))db.exec("UPDATE agent_computers SET status='revoked',secret_hash=NULL,pair_hash=NULL");
 if(tables.has('agent_computer_commands'))db.exec("UPDATE agent_computer_commands SET status='cancelled',lease=NULL WHERE status IN ('queued','approval','running')");
 if(tables.has('assistant_conversation_runs'))db.exec("UPDATE assistant_conversation_runs SET status='failed',expires_at=0 WHERE status='running'");
}

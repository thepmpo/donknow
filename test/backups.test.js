import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../server/store.js';
import { createBackup, restoreBackup, s3Uploader } from '../server/backups.js';
test('online backup restores account and todos; checksum, key and target safety are enforced', async () => {
 const root = await mkdtemp(join(tmpdir(), 'duckduck-backup-test-')); let source, restored;
 try {
  source = await openStore(join(root, 'data')); const account = await source.register('backup@example.test', 'fixture-password-123'); source.create(account.user.id, { title: '보존할 할 일', dueDate: null, category: '일상' });
  source.configureAutomation(account.user.id,'briefing',{enabled:true,time:'09:00',timezone:'Asia/Seoul',providers:['google'],aiConsent:true,urgentAlerts:true});
  source.configureMemory(account.user.id,true);source.saveMemory(account.user.id,'복구 뒤에도 보관할 기억');source.claimConversation(account.user.id,'backup-pending',{message:'진행 중인 대화',providers:[]});source.prepareAssistantWatch(account.user.id,'calendar','fixture-connection','primary',{},'fixture-token');source.enqueueAssistantEvent(account.user.id,'google','fixture-event','fixture-connection',{receivedAt:Date.now()});
  source.configureAgent(account.user.id,{name:'복구한 덕',proactive:true,voice:true,providers:['notion']});const contact=source.saveAgentContact(account.user.id,'teams','fixture-owner',{label:'복구 전 연락',providers:[],consentScopes:{}});source.enqueueContactMessage(contact,'before-restore',{text:'복원 뒤 실행하면 안 되는 요청'});const agentJob=source.createAgentJob(account.user.id,{goal:'복원 전 작업',requestKey:'restore-job',providers:[],consent:true});
  const result = await createBackup({ dataDirectory: join(root, 'data'), backupDirectory: join(root, 'backups') }); assert.equal(result.uploadFailed, false);
  source.create(account.user.id, { title: '백업 뒤에 추가한 일', dueDate: null, category: '일상' });
  const target = join(root, 'restored'); await restoreBackup({ file: result.path, targetDirectory: target, tokenKeyFile: join(root, 'data', '.token-key') });
  restored = await openStore(target); const login = await restored.login('backup@example.test', 'fixture-password-123'); assert.equal(restored.list(login.user.id).length, 1); assert.equal(restored.list(login.user.id)[0].title, '보존할 할 일');assert.equal(restored.automationSettings(login.user.id).find(v=>v.kind==='briefing').enabled,false,'restoring data must not restart recurring AI or urgent monitoring');
  assert.equal(restored.memories(login.user.id)[0].text,'복구 뒤에도 보관할 기억');assert.equal(restored.conversation(login.user.id).turns[0].state,'failed');assert.equal(restored.claimAssistantEvent(),null);assert.deepEqual(restored.assistantWatches(login.user.id),[]);
  assert.equal(restored.agentProfile(login.user.id).paused,true);assert.equal(restored.agentProfile(login.user.id).proactive,false);assert.equal(restored.agentProfile(login.user.id).voice,false);assert.equal(restored.agentProfile(login.user.id).name,'복구한 덕');assert.equal(restored.agentJob(login.user.id,agentJob.id).status,'paused');assert.equal(restored.agentContacts(login.user.id)[0].enabled,false);assert.deepEqual(restored.contactMessages(),[]);restored.configureAgent(login.user.id,{name:'이름 수정'});assert.equal(restored.agentProfile(login.user.id).paused,true,'cosmetic edits cannot resume restored work');restored.configureAgent(login.user.id,{paused:false});assert.equal(restored.agentProfile(login.user.id).paused,false);assert.equal(restored.agentProfile(login.user.id).proactive,false,'resume requires a separate proactive opt-in');
  await assert.rejects(restoreBackup({ file: result.path, targetDirectory: target, tokenKeyFile: join(root, 'data', '.token-key') }));
  await writeFile(join(root, 'wrong-key'), Buffer.alloc(32, 1)); await assert.rejects(restoreBackup({ file: result.path, targetDirectory: join(root, 'wrong-key-target'), tokenKeyFile: join(root, 'wrong-key') }));
  const original = await readFile(result.path); const tampered = Buffer.from(original); tampered[tampered.length - 1] ^= 1; await writeFile(result.path, tampered);
  await assert.rejects(restoreBackup({ file: result.path, targetDirectory: join(root, 'tampered-target'), tokenKeyFile: join(root, 'data', '.token-key') }));
 } finally { source?.close(); restored?.close(); await rm(root, { recursive: true, force: true }); }
});
test('offsite upload uses SSE and checksums; failed upload retains the verified local copy', async () => {
 const root = await mkdtemp(join(tmpdir(), 'duckduck-s3-test-')); let store;
 try {
  store = await openStore(join(root, 'data')); await store.register('offsite@example.test', 'fixture-password-123');
  const sent = [];
  const upload = s3Uploader({ BACKUP_S3_BUCKET: 'fixture-backups', BACKUP_S3_REGION: 'ap-northeast-2' }, { send: async command => { const value = command.input; if(command.constructor.name==='ListObjectsV2Command')return {Contents:[]}; if (typeof value.Body !== 'string') { let size = 0; for await (const chunk of value.Body) size += chunk.length; assert.equal(size, value.ContentLength); assert.ok(value.ChecksumSHA256); } assert.equal(value.ServerSideEncryption, 'AES256'); sent.push(value.Key); } });
  await createBackup({ dataDirectory: join(root, 'data'), backupDirectory: join(root, 'backups'), upload }); assert.equal(sent.length, 2);
  const failed = await createBackup({ dataDirectory: join(root, 'data'), backupDirectory: join(root, 'backups'), upload: async () => { throw new Error('fixture outage'); } }); assert.equal(failed.uploadFailed, true); assert.ok((await readFile(failed.path)).length > 0); assert.ok((await readFile(failed.path + '.json')).length > 0);
 } finally { store?.close(); await rm(root, { recursive: true, force: true }); }
});

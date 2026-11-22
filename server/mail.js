import {mailFailure,mailRejection,mailErrorBody} from './mail-diagnostics.js';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
export function createMailer(env = process.env, fetcher = fetch, log=console.warn) {
  env={...env,MAIL_API_KEY:env.MAIL_API_KEY?.trim(),MAIL_FROM:env.MAIL_FROM?.trim()};
  const testing = env.NODE_ENV === 'test' && env.MAIL_TRANSPORT === 'test-outbox';
  const configured = testing || !!(env.MAIL_API_KEY && env.MAIL_FROM && /^[^\r\n]+@[^\r\n]+$/.test(env.MAIL_FROM));
  return {
    configured,
    async deliver(id, message) {
      if (testing) { const directory = env.TEST_MAIL_DIR; if (!directory) throw new Error('Test mailbox directory is required'); await mkdir(directory, { recursive: true, mode: 0o700 }); await writeFile(join(directory, id + '.tmp'), JSON.stringify(message), { mode: 0o600 }); await rename(join(directory,id+'.tmp'),join(directory,id+'.json'));  return; }
      if (!configured) throw new Error('Mail delivery is not configured');
      let response;try{response = await fetcher('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.MAIL_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': id }, body: JSON.stringify({ from: env.MAIL_FROM, to: [message.to], subject: message.subject, text: message.text }), signal: AbortSignal.timeout(10000),redirect:'error' });}catch(error){const kind=mailFailure(error);log(JSON.stringify({event:'mail-delivery-failure',kind}));throw Object.assign(new Error('Mail delivery failed'),{mailKind:kind});}
      if (!response.ok){const kind=mailRejection(response.status,await mailErrorBody(response));log(JSON.stringify({event:'mail-delivery-failure',status:response.status,kind}));throw Object.assign(new Error('Mail provider rejected delivery'),{mailKind:kind});}
      if(response.body&&!response.body.locked)void response.body.cancel().catch(()=>{});
    },
  };
}
export function startMailWorker(store, mailer, interval = 2000) {
  let running = false, stopped = false;
  async function tick() {
    if (running || stopped || !mailer.configured) return;
    running = true;
    try { for (let count = 0; count < 10 && !stopped; count++) { const job = store.claimMail(); if (!job) break; try { if (store.account(job.user_id)) await mailer.deliver(job.id, job.message); store.mailSucceeded(job.id); } catch { store.mailFailed(job.id, job.attempts + 1); } } }
    finally { running = false; }
  }
  const timer = interval===null?null:setInterval(() => { void tick().catch(() => undefined); }, interval); timer?.unref();
  return { tick, stop: () => { stopped = true; clearInterval(timer); } };
}

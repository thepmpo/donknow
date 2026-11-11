import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomBytes, randomUUID, createCipheriv, createDecipheriv} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const MAX_REPORT_PDF_BYTES = 8 * 1024 * 1024;
const MAX_BASE64_LENGTH = 4 * Math.ceil(MAX_REPORT_PDF_BYTES / 3);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AAD = Buffer.from('ai-office-report-mail-v1');
const hash = value => createHash('sha256').update(value).digest('hex');
function fail(code, status = 409) { throw Object.assign(new Error(code), {code, status}); }
function address(value) {
  if (typeof value !== 'string' || value.length > 254 || !/^[a-z0-9][a-z0-9._+%-]*@(gmail\.com|googlemail\.com)$/i.test(value)) fail('office_report_mail_gmail_address_required', 400);
  return value.toLowerCase();
}
function confirmation(input) { if (!input || input.confirmation !== true) fail('office_report_mail_confirmation_required', 400); }
function exists(file) { try { fs.lstatSync(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; fail('office_report_mail_storage_unavailable'); } }
function assertFile(file, maxBytes) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o077) || stat.size > maxBytes) fail('office_report_mail_private_file_required');
  return stat;
}
function privateRead(file, maxBytes) {
  assertFile(file, maxBytes);
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o077) || stat.size > maxBytes) fail('office_report_mail_private_file_required');
    return fs.readFileSync(fd);
  } finally { fs.closeSync(fd); }
}
function syncDirectory(dir) {
  const fd = fs.openSync(dir, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function exclusiveWrite(file, value) {
  const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
  try { fs.writeFileSync(fd, value); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  syncDirectory(path.dirname(file));
}
function atomicWrite(file, value) {
  if (exists(file) || fs.lstatSync(path.dirname(file)).isSymbolicLink()) {
    if (exists(file)) assertFile(file, 16384);
    else fail('office_report_mail_private_directory_required');
  }
  const temp = file + '.' + randomUUID();
  const fd = fs.openSync(temp, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
  try { fs.writeFileSync(fd, value); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  try { fs.renameSync(temp, file); syncDirectory(path.dirname(file)); } catch (error) { try { fs.unlinkSync(temp); } catch {} throw error; }
}
function parseRecord(bytes) { try { return JSON.parse(bytes); } catch { fail('office_report_mail_record_unreadable'); } }
function publicAttempt(record, duplicate = false) {
  // A process may have exited after SMTP accepted the message but before the receipt was saved.
  const state = record.state === 'sending' ? 'unknown' : record.state;
  return {id: record.id, state, sender: record.sender, recipient: record.sender, reportTitle: record.reportTitle,
    accepted: state === 'accepted', deliveryConfirmed: false, automaticRetry: false,
    duplicate, createdAt: record.createdAt, completedAt: record.completedAt ?? null,
    errorCode: record.errorCode ?? (state === 'unknown' ? 'office_report_mail_result_unknown' : null)};
}
async function gmailTransport(credentials, message) {
  let nodemailer;
  try { nodemailer = (await import(pathToFileURL('/workspace/donknow/node_modules/nodemailer/lib/nodemailer.js').href)).default; }
  catch { fail('office_report_mail_dependency_missing'); }
  const transport = nodemailer.createTransport({host: 'smtp.gmail.com', port: 465, secure: true,
    auth: {user: credentials.sender, pass: credentials.appPassword},
    tls: {rejectUnauthorized: true, minVersion: 'TLSv1.2'},
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true});
  try { return await transport.sendMail(message); } finally { transport.close(); }
}

/** Owner-only Gmail self-delivery. HTTP caller must enforce session/CSRF; configure is local-computer only. */
export function createReportMail({stateDir, sendMail = gmailTransport} = {}) {
  const state = path.resolve(stateDir), root = path.join(state, 'report-mail');
  const keyFile = path.join(root, 'key.bin'), configFile = path.join(root, 'config.json'), ledger = path.join(root, 'attempts');
  let queue = Promise.resolve();
  const serial = fn => { const next = queue.then(fn); queue = next.catch(() => {}); return next; };
  function directory(dir, create = false) {
    if (fs.realpathSync(state) !== state || !fs.statSync(state).isDirectory()) fail('office_report_mail_private_directory_required');
    if (create && !exists(dir)) fs.mkdirSync(dir, {mode: 0o700});
    if (!exists(dir)) return false;
    const stat = fs.lstatSync(dir);
    if (!stat.isDirectory() || stat.isSymbolicLink() || fs.realpathSync(dir) !== dir || (stat.mode & 0o077)) fail('office_report_mail_private_directory_required');
    return true;
  }
  function loadConfig() {
    if (!directory(root)) return null;
    if (!exists(configFile)) return null;
    try {
      const key = privateRead(keyFile, 32); if (key.length !== 32) throw Error();
      const stored = parseRecord(privateRead(configFile, 4096));
      if (stored.version !== 1 || !/^[a-f0-9]{24}$/.test(stored.iv ?? '') || !/^[a-f0-9]{32}$/.test(stored.tag ?? '') || typeof stored.ciphertext !== 'string') throw Error();
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(stored.iv, 'hex'));
      decipher.setAAD(AAD); decipher.setAuthTag(Buffer.from(stored.tag, 'hex'));
      const value = JSON.parse(Buffer.concat([decipher.update(Buffer.from(stored.ciphertext, 'base64')), decipher.final()]));
      if (address(value.sender) !== value.sender || !/^[a-z]{16}$/.test(value.appPassword ?? '') || typeof value.savedAt !== 'number') throw Error();
      return value;
    } catch { fail('office_report_mail_configuration_unreadable'); }
  }
  function readAttempt(id) {
    if (!UUID.test(id ?? '')) fail('office_report_mail_request_id_required', 400);
    if (!directory(root) || !directory(ledger)) return null;
    const file = path.join(ledger, id + '.json');
    if (!exists(file)) return null;
    const record = parseRecord(privateRead(file, 8192));
    if (record.id !== id || !['sending', 'accepted', 'rejected', 'unknown'].includes(record.state) || !/^[a-f0-9]{64}$/.test(record.digest ?? '') || typeof record.createdAt !== 'number') fail('office_report_mail_record_unreadable');
    address(record.sender);
    return record;
  }
  return {
    status() {
      try {
        const config = loadConfig();
        return {configured: !!config, sender: config?.sender ?? null, recipient: config?.sender ?? null,
          provider: 'gmail', authenticationVerified: false, automaticDelivery: false, deliveryConfirmed: false,
          maxPdfBytes: MAX_REPORT_PDF_BYTES, localSetupRequired: true};
      } catch (error) { return {configured: false, sender: null, recipient: null, provider: 'gmail', authenticationVerified: false,
        automaticDelivery: false, deliveryConfirmed: false, maxPdfBytes: MAX_REPORT_PDF_BYTES, localSetupRequired: true,
        errorCode: error.code || 'office_report_mail_configuration_unreadable'}; }
    },
    delivery(id) { const record = readAttempt(id); if (!record) fail('office_report_mail_attempt_not_found', 404); return publicAttempt(record); },
    configure: input => serial(async () => {
      confirmation(input);
      const sender = address(input.sender), appPassword = typeof input.appPassword === 'string' ? input.appPassword.replace(/ /g, '') : '';
      if (!/^[a-z]{16}$/.test(appPassword)) fail('office_report_mail_google_app_password_required', 400);
      // Never replace unreadable existing configuration or silently recreate its key.
      const old = loadConfig();
      if (old?.sender === sender && old.appPassword === appPassword) return {configured: true, sender, recipient: sender, alreadyConfigured: true, authenticationVerified: false};
      directory(root, true);
      let key;
      if (exists(keyFile)) { key = privateRead(keyFile, 32); if (key.length !== 32) fail('office_report_mail_configuration_unreadable'); }
      else { key = randomBytes(32); exclusiveWrite(keyFile, key); }
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv); cipher.setAAD(AAD);
      const plaintext = Buffer.from(JSON.stringify({sender, appPassword, savedAt: Date.now()}));
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      plaintext.fill(0);
      atomicWrite(configFile, JSON.stringify({version: 1, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), ciphertext: ciphertext.toString('base64')}) + '\n');
      return {configured: true, sender, recipient: sender, authenticationVerified: false, automaticDelivery: false};
    }),
    send: input => serial(async () => {
      confirmation(input);
      const id = input.id;
      if (!UUID.test(id ?? '')) fail('office_report_mail_request_id_required', 400);
      if (input.to !== undefined || input.cc !== undefined || input.bcc !== undefined || input.recipient !== undefined) fail('office_report_mail_self_only', 400);
      const reportTitle = typeof input.reportTitle === 'string' ? input.reportTitle.trim() : '';
      if (!reportTitle || reportTitle.length > 160 || /[\u0000-\u001f\u007f]/.test(reportTitle)) fail('office_report_mail_title_required', 400);
      const encoded = input.pdfBase64;
      if (typeof encoded !== 'string' || !encoded || encoded.length > MAX_BASE64_LENGTH || encoded.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) fail('office_report_mail_pdf_required_max_8mb', 400);
      const pdf = Buffer.from(encoded, 'base64');
      if (pdf.length > MAX_REPORT_PDF_BYTES || pdf.toString('base64') !== encoded || pdf.subarray(0, 5).toString('ascii') !== '%PDF-' || !/%%EOF\s*$/.test(pdf.subarray(-1024).toString('latin1'))) fail('office_report_mail_pdf_required_max_8mb', 400);
      const config = loadConfig(); if (!config) fail('office_report_mail_setup_required');
      const digest = hash(JSON.stringify([config.sender, reportTitle, hash(pdf)]));
      const old = readAttempt(id);
      if (old) { if (old.digest !== digest) fail('office_report_mail_request_changed'); return publicAttempt(old, true); }
      directory(ledger, true);
      const record = {version: 1, id, sender: config.sender, reportTitle, digest, state: 'sending', createdAt: Date.now()};
      const target = path.join(ledger, id + '.json');
      try { exclusiveWrite(target, JSON.stringify(record) + '\n'); }
      catch (error) { if (error.code !== 'EEXIST') fail('office_report_mail_reservation_failed'); const concurrent = readAttempt(id); if (concurrent?.digest !== digest) fail('office_report_mail_request_changed'); return publicAttempt(concurrent, true); }
      try {
        const result = await sendMail(config, {from: config.sender, to: config.sender, envelope: {from: config.sender, to: [config.sender]},
          subject: '[AI 사무실 보고서] ' + reportTitle,
          text: '선택한 AI 사무실 보고서 PDF입니다. 첨부 파일에서 전체 내용을 확인해주세요.\n\n이 메일은 사무실에서 직접 확인하고 보낸 요청입니다.',
          attachments: [{filename: 'AI-office-report.pdf', content: pdf, contentType: 'application/pdf'}],
          disableFileAccess: true, disableUrlAccess: true, messageId: '<office-report-' + id + '@ai-office.local>'});
        const accepted = (result?.accepted ?? []).some(value => (typeof value === 'string' ? value : value?.address)?.toLowerCase() === config.sender);
        record.state = accepted ? 'accepted' : 'rejected';
        if (!accepted) record.errorCode = 'office_report_mail_not_accepted';
      } catch (error) {
        // Do not retain upstream errors: they can contain auth credentials or message content.
        record.state = 'unknown';
        record.errorCode = error?.code === 'EAUTH' ? 'office_report_mail_authentication_failed'
          : error?.code === 'office_report_mail_dependency_missing' ? 'office_report_mail_dependency_missing' : 'office_report_mail_result_unknown';
      }
      record.completedAt = Date.now();
      try { atomicWrite(target, JSON.stringify(record) + '\n'); }
      catch { fail('office_report_mail_result_unknown'); }
      return publicAttempt(record);
    }),
  };
}

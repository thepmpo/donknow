// Real app regression with isolated in-memory accounts. No production login or writes.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const root = resolve(new URL('..', import.meta.url).pathname, 'dist-web');
const server = http.createServer(async (req, res) => {
  try {
    let file = resolve(root, '.' + new URL(req.url, 'http://local').pathname);
    if (!file.startsWith(root + '/')) file = resolve(root, 'index.html');
    let body; try { body = await readFile(file); } catch { file = resolve(root, 'index.html'); body = await readFile(file); }
    res.writeHead(200, { 'Content-Type': ({ '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.ttf': 'font/ttf' })[extname(file)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(500); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const alice = { id: 'alice', email: 'alice@example.test', emailVerified: false };
const bob = { id: 'bob', email: 'bob@example.test', emailVerified: true };
const todo = user => ({ id: user.id + '-todo', title: user.id + ' 전용 할 일', category: '일상', dueDate: null, done: false });
async function scenario(kind) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('duckduck.mobile.connection.v1', JSON.stringify({ mode: 'cloud', baseUrl: 'https://duckduck-api.test' })));
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  let account = alice, holdSession = kind === 'startup', holdFeature = false;
  let release, signalHeld; const held = new Promise(resolve => { signalHeld = resolve; });
  await page.route('https://duckduck-api.test/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (!path.startsWith('/api/')) {
      const file=resolve(root,'.'+(path==='/'?'/index.html':path));assert.ok(file.startsWith(root+'/'));
      await route.fulfill({status:200,contentType:({'.js':'text/javascript','.html':'text/html; charset=utf-8','.ttf':'font/ttf'})[extname(file)]||'application/octet-stream',body:await readFile(file)});return;
    }
    const json = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (path === '/api/auth/login') { account = bob; return json({ user: bob }); }
    if (path === '/api/auth/logout') { account = null; return json({ ok: true }); }
    if (path === '/api/auth/session') {
      const snapshot = account;
      if (holdSession) { holdSession = false; signalHeld(); await new Promise(resolve => { release = resolve; }); }
      return snapshot ? json({ user: snapshot }) : json({ error: 'fixture unauthenticated' }, 401);
    }
    if (path === '/api/todos') return json(account ? [todo(account)] : [], account ? 200 : 401);
    if (path === '/api/capabilities') return json({ mail: true, todoNotes: true });
    if (path === '/api/account/verification/confirm') return json({ ok: true });
    if (path === '/api/integrations') {
      if (holdFeature) { holdFeature = false; signalHeld(); await new Promise(resolve => { release = resolve; }); return json({ error: 'fixture old session expired' }, 401); }
      return json([]);
    }
    if (path === '/api/operations/backup') return json({ storageDriver: 'turso', enabled: false });
    if (path === '/api/account') return json({ user: account });
    if (path === '/api/assistant/status') return json({ enabled: false, model: null, catalog: [] });
    return json({ ok: true });
  });
  try {
    await page.goto('https://duckduck-api.test/');
    if (kind !== 'startup') {
      await page.getByText('alice 전용 할 일', { exact: true }).waitFor();
      holdFeature = kind === 'late-401';
      await page.getByRole('tab', { name: 'ME', exact: true }).click();
      if (kind === 'late-profile') {
        await page.getByRole('button', { name: '이메일 인증', exact: true }).click();
        await page.getByRole('textbox', { name: '6자리 인증번호', exact: true }).fill('123456');
        holdSession = true;
        await page.getByRole('button', { name: '인증 완료', exact: true }).click();
      }
      await held;
      // Navigation stays available while the old background read is pending.
      await page.getByRole('tab', { name: 'Todo 리스트', exact: true }).click();
      await page.getByRole('tab', { name: 'ME', exact: true }).click();
      await page.getByRole('button', { name: '로그아웃', exact: true }).click();
    } else await held;
    await page.getByRole('textbox', { name: '이메일', exact: true }).fill(bob.email);
    await page.getByRole('textbox', { name: '비밀번호', exact: true }).fill('fixture-password-only');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.getByText('bob 전용 할 일', { exact: true }).waitFor();
    release();
    // Allow the actual state transition/effect and rendering to finish.
    await page.waitForTimeout(150);
    await page.getByRole('tab', { name: 'ME', exact: true }).click();
    await page.getByText(bob.email, { exact: true }).waitFor();
    assert.equal(await page.getByText(alice.email, { exact: true }).count(), 0);
    await page.getByRole('tab', { name: 'Todo 리스트', exact: true }).click();
    assert.equal(await page.getByText('bob 전용 할 일', { exact: true }).count(), 1);
    assert.equal(await page.getByText('alice 전용 할 일', { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    console.log(`PASS: ${kind} keeps the new account and its Todo data`);
  } finally { if (release) release(); await context.close(); }
}
try { for (const kind of ['startup', 'late-401', 'late-profile']) await scenario(kind); }
finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }

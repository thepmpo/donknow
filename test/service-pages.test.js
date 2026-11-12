import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiHarness } from '../test-support/api.js';
import { renderServicePages } from '../scripts/build-service-pages.mjs';

test('service pages require verified contact, escape metadata and keep privacy draft explicit', () => {
  assert.throws(() => renderServicePages({ schemaVersion: 1, operatorName: 'TODO', supportEmail: null }));
  const pages = renderServicePages({ schemaVersion: 1, operatorName: 'Kim & Team', supportEmail: "help&support@duckduck-fixture.dev", reviewedForPublication: true });
  assert.match(pages.support, /Kim &amp; Team/); assert.match(pages.support, /help&amp;support@duckduck-fixture\.dev/);
  assert.match(pages.support, /mailto:help%26support%40duckduck-fixture\.dev/);
  assert.match(pages.privacy, /아직 시행된 개인정보처리방침이 아닙니다/);
  assert.throws(() => renderServicePages({ schemaVersion: 1, operatorName: '<script>bad</script>', supportEmail: 'help@duckduck-fixture.dev' }));
  assert.ok(!pages.privacy.includes('<script'));
});

test('public support and privacy routes are anonymous read-only fixed documents with restrictive CSP', async () => {
  const h = await apiHarness();
  try {
    for (const path of ['/support', '/support/', '/privacy', '/privacy/']) {
      const response = await fetch(h.baseUrl + path); const html = await response.text();
      assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/html/);
      assert.equal(response.headers.get('cache-control'), 'no-cache');
      assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
      assert.match(response.headers.get('content-security-policy'), /form-action 'none'/);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.match(html, /Kim Sanghyun/); assert.match(html, /thepmpo\.official@gmail\.com/);
      assert.ok(!html.includes('<script')); assert.ok(!response.headers.has('set-cookie'));
      if (path.startsWith('/privacy')) assert.match(html, /검토 중인 안내/);
      const head = await fetch(h.baseUrl + path, { method: 'HEAD' });
      assert.equal(head.status, 200); assert.equal(await head.text(), ''); assert.equal(head.headers.get('content-length'), String(Buffer.byteLength(html)));
      const mutation = await fetch(h.baseUrl + path, { method: 'POST', body: '<script>bad</script>' });
      assert.equal(mutation.status, 405); assert.equal(mutation.headers.get('allow'), 'GET, HEAD');
      assert.ok(!(await mutation.text()).includes('<script>bad</script>'));
    }
    for (const path of ['/privacy%2F..%2Fdocs%2Fapp-store-metadata.json', '/support%00', '/docs/app-store-metadata.json', '/privacy.html']) assert.equal((await fetch(h.baseUrl + path)).status, 404);
    const echoed = await fetch(h.baseUrl + '/support?name=%3Cscript%3Ebad%3C/script%3E'); assert.ok(!(await echoed.text()).includes('<script>bad</script>'));
    assert.equal((await h.request('/api/todos')).status, 401);
  } finally { await h.close(); }
});

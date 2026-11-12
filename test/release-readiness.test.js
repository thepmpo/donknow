import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectPublicationMetadata, inspectPublicReadiness, readinessReport, summarizeCapabilities } from '../scripts/check-release-readiness.mjs';

const complete = { schemaVersion: 1, operatorName: 'Fixture operator', supportEmail: 'support@duckduck-fixture.dev', privacyPolicyUrl: 'https://duckduck-fixture.dev/privacy', supportUrl: 'https://duckduck-fixture.dev/support', privacyEffectiveDate: '2026-11-12', reviewedForPublication: true };
const capabilities = { mail: true, todoNotes: true, assistant: false, externalActions: true, integrations: [{ provider: 'google', configured: true }, { provider: 'slack', configured: false }, { provider: 'notion', configured: true }] };

test('release metadata rejects unfinished contact, private URLs, invalid dates and unreviewed text', () => {
  assert.equal(inspectPublicationMetadata(complete).ready, true);
  for (const patch of [{ operatorName: 'TODO' }, { supportEmail: 'support' }, { supportEmail: 'support@example.com' }, { privacyPolicyUrl: 'https://example.com/privacy' }, { privacyPolicyUrl: 'http://example.test/privacy' }, { supportUrl: 'https://localhost/support' }, { supportUrl: 'https://user:secret@example.test/support' }, { privacyEffectiveDate: '2026-02-31' }, { reviewedForPublication: false }]) assert.equal(inspectPublicationMetadata({ ...complete, ...patch }).ready, false);
  assert.equal(inspectPublicationMetadata({}).ready, false);
});
test('public capability flags identify actual blockers without claiming real calls or release completion', () => {
  const publicStatus = summarizeCapabilities({ ok: true }, capabilities);
  const report = readinessReport(complete, publicStatus);
  assert.deepEqual(report.blockers, ['ai_server_not_configured', 'slack_server_not_configured']);
  assert.equal(report.publicService.authenticatedAiCallVerified, false);
  assert.equal(report.publicService.externalWriteVerified, false);
  assert.equal(report.appStoreReleaseVerified, false);
  const allReady = readinessReport(complete, summarizeCapabilities({ ok: true }, { ...capabilities, assistant: true, integrations: capabilities.integrations.map(item => ({ ...item, configured: true })) }));
  assert.equal(allReady.prerequisitesReady, true); assert.equal(allReady.appStoreReleaseVerified, false); assert.ok(allReady.remainingEvidence.length);
  assert.equal(summarizeCapabilities({ ok: true }, { ...capabilities, assistant: 'true' }).state, 'unverified');
  assert.equal(summarizeCapabilities({ ok: true }, { ...capabilities, integrations: [...capabilities.integrations, capabilities.integrations[0]] }).state, 'unverified');
});
test('public inspector only sends anonymous GET requests and never exposes returned unrelated fields', async () => {
  const requests = [];
  const status = await inspectPublicReadiness('https://fixture.example.test', async (url, options) => {
    requests.push([url, options]);
    return Response.json(url.endsWith('/api/health') ? { ok: true } : { ...capabilities, secret: 'must-not-be-reported' });
  });
  assert.equal(status.state, 'observed'); assert.equal(requests.length, 2);
  assert.deepEqual(requests.map(([url]) => new URL(url).pathname).sort(), ['/api/capabilities', '/api/health']);
  for (const [, options] of requests) { assert.equal(options.method, 'GET'); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error'); assert.deepEqual(options.headers, { Accept: 'application/json' }); }
  assert.ok(!JSON.stringify(status).includes('must-not-be-reported'));
  for (const origin of ['https://u:secret@example.test', 'https://example.test/path', 'https://example.test?token=secret']) await assert.rejects(() => inspectPublicReadiness(origin, () => { throw Error('must not call'); }));
});
test('network, authentication, oversized and malformed responses remain unverified without mutation or secret errors', async () => {
  for (const response of [new Response('Unauthorized', { status: 401 }), new Response('x'.repeat(65537)), new Response('<html>not JSON</html>')]) {
    const result = await inspectPublicReadiness('https://fixture.example.test', async () => response.clone());
    assert.equal(result.state, 'unverified');
  }
  const result = await inspectPublicReadiness('https://fixture.example.test', async () => { throw Error('sensitive internal detail'); });
  assert.equal(result.state, 'unverified'); assert.ok(!JSON.stringify(result).includes('sensitive'));
});

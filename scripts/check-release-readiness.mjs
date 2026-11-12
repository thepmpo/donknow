import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const defaults = new URL('../docs/app-store-metadata.json', import.meta.url);
const providers = ['google', 'slack', 'notion'];
const validText = value => typeof value === 'string' && !!value.trim() && !/[\r\n<>]/.test(value) && !/TODO|TBD|미정|확인 필요|placeholder/i.test(value);
const placeholderHost = value => /(?:^|\.)(?:localhost|example\.(?:com|net|org))$/.test(value) || /\.(?:invalid|example|test)$/.test(value);
function publicUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash && !url.search && !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) && !placeholderHost(url.hostname);
  } catch { return false; }
}

export function inspectPublicationMetadata(metadata) {
  const checks = {
    schema: metadata?.schemaVersion === 1,
    operatorName: validText(metadata?.operatorName),
    supportEmail: validText(metadata?.supportEmail) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(metadata.supportEmail) && !placeholderHost(metadata.supportEmail.split('@')[1].toLowerCase()),
    privacyPolicyUrl: publicUrl(metadata?.privacyPolicyUrl),
    supportUrl: publicUrl(metadata?.supportUrl),
    privacyEffectiveDate: typeof metadata?.privacyEffectiveDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(metadata.privacyEffectiveDate) && Number.isFinite(Date.parse(metadata.privacyEffectiveDate)) && new Date(metadata.privacyEffectiveDate).toISOString().slice(0, 10) === metadata.privacyEffectiveDate,
    reviewedForPublication: metadata?.reviewedForPublication === true,
  };
  return { ready: Object.values(checks).every(Boolean), missing: Object.entries(checks).filter(([, valid]) => !valid).map(([name]) => name) };
}

export function summarizeCapabilities(health, capabilities) {
  if (health?.ok !== true || capabilities?.todoNotes !== true || capabilities?.externalActions !== true || typeof capabilities?.assistant !== 'boolean' || typeof capabilities?.mail !== 'boolean' || !Array.isArray(capabilities?.integrations)) return { state: 'unverified', reason: 'unexpected_public_response' };
  const configured = {};
  for (const provider of providers) {
    const matches = capabilities.integrations.filter(item => item?.provider === provider);
    if (matches.length !== 1 || typeof matches[0].configured !== 'boolean') return { state: 'unverified', reason: 'unexpected_public_response' };
    configured[provider] = matches[0].configured;
  }
  return { state: 'observed', healthy: true, aiConfigured: capabilities.assistant, mailConfigured: capabilities.mail, providerConfigured: configured, authenticatedAiCallVerified: false, externalWriteVerified: false };
}

export async function inspectPublicReadiness(origin = 'https://duckduck-test.onrender.com', fetcher = fetch) {
  let url;
  try { url = new URL(origin); } catch { throw new Error('Expected an HTTPS origin without credentials, path, query, or fragment'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Expected an HTTPS origin without credentials, path, query, or fragment');
  async function get(path) {
    try {
      const response = await fetcher(url.origin + path, { method: 'GET', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json' } });
      if (!response.ok) return { error: 'http_error', httpStatus: response.status };
      const reader = response.body?.getReader();
      if (!reader) return { error: 'unexpected_public_response' };
      const chunks = []; let bytes = 0;
      try {
        while (true) {
          const part = await reader.read(); if (part.done) break;
          bytes += part.value.byteLength; if (bytes > 65536) return { error: 'public_response_too_large' };
          chunks.push(Buffer.from(part.value));
        }
      } finally { void reader.cancel().catch(() => {}); }
      return { data: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
    } catch { return { error: 'public_request_failed' }; }
  }
  const [health, capabilities] = await Promise.all([get('/api/health'), get('/api/capabilities')]);
  if (health.error || capabilities.error) return { state: 'unverified', reason: 'public_request_failed', checks: { health: health.error ? { reason: health.error, httpStatus: health.httpStatus ?? null } : { received: true }, capabilities: capabilities.error ? { reason: capabilities.error, httpStatus: capabilities.httpStatus ?? null } : { received: true } } };
  return summarizeCapabilities(health.data, capabilities.data);
}

export function readinessReport(metadata, publicStatus) {
  const publication = inspectPublicationMetadata(metadata);
  const blockers = publication.missing.map(key => 'publication_' + key);
  if (publicStatus.state !== 'observed') blockers.push('public_service_unverified');
  else {
    if (!publicStatus.aiConfigured) blockers.push('ai_server_not_configured');
    if (!publicStatus.mailConfigured) blockers.push('account_mail_not_configured');
    for (const [name, configured] of Object.entries(publicStatus.providerConfigured)) if (!configured) blockers.push(name + '_server_not_configured');
  }
  return { checkedAt: new Date().toISOString(), readOnly: true, publication, publicService: publicStatus, blockers, prerequisitesReady: blockers.length === 0, appStoreReleaseVerified: false, remainingEvidence: ['operator_and_support_contact_ownership', 'published_policy_and_support_content', 'authenticated_ai_response_and_confirmed_todo', 'provider_write_permissions_and_selected_test_targets', 'iphone_login_notifications_and_reminders', 'signed_build_apple_processing_and_review'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--offline')) { console.error('Usage: node scripts/check-release-readiness.mjs [--offline]'); process.exitCode = 1; }
  else {
    try {
      const metadata = JSON.parse(await readFile(defaults, 'utf8'));
      const status = args.includes('--offline') ? { state: 'unverified', reason: 'offline_requested' } : await inspectPublicReadiness();
      const report = readinessReport(metadata, status);
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = report.prerequisitesReady ? 0 : 2;
    } catch { console.error('Release readiness inspection failed; no settings or credentials were changed.'); process.exitCode = 1; }
  }
}

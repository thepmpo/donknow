import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

// Never load office .env/auth. The pinned runtime smoke uses an in-memory DB,
// temporary fixture credentials and a local network canary, without AI calls.
const runtime='/workspace/ai-office-runtime';
const metadata=JSON.parse(fs.readFileSync('/workspace/donknow/tools/ai-office/runtime-policy.json','utf8'));
const runner=metadata.linuxRunners?.[process.arch];
if(!runner)throw Error('office_unsupported_architecture');
const provider='/workspace/ai-office/provider';
const bundle=path.join(provider,'official-codex/node_modules/@openai',`codex-linux-${process.arch}`,'vendor',runner.triple);
if(createHash('sha256').update(fs.readFileSync(path.join(bundle,'bin/codex'))).digest('hex')!==runner.sha256)throw Error('office_runner_hash_mismatch');
const result=spawnSync(process.execPath,['--import','tsx','scripts/office-sandbox-smoke.ts','--native-codex','--product-only'],{
 cwd:runtime,stdio:'inherit',timeout:60000,
 env:{...process.env,AI_OFFICE_PROVIDER_BIN_ROOT:provider,AI_OFFICE_CODEX_BUNDLE_DIR:bundle,AI_OFFICE_CODEX_SHA256:runner.sha256},
});
if(result.error||result.status!==0){console.error('실제 AI 실행 격리 검사를 통과하지 못했습니다. 로그인이나 업무를 실행하지 않고 중단합니다.');process.exit(1);}
console.log('읽기 허용·쓰기 차단·네트워크 차단 확인 완료. 실제 AI 호출은 하지 않았습니다.');

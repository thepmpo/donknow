import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createSchedulerAuth} from '../server/scheduler-auth.js';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048}),key={...publicKey.export({format:'jwk'}),kid:'test-signing-key',alg:'RS256',use:'sig'};
const clock=Date.parse('2026-11-13T00:00:00Z'),origin='https://duckduck-test.onrender.com',repository='thepmpo/donknow';
const claims={iss:'https://token.actions.githubusercontent.com',aud:origin+'/api/automations/tick',repository,repository_id:'1430767404',ref:'refs/heads/main',workflow_ref:repository+'/.github/workflows/briefing-delivery.yml@refs/heads/main',event_name:'schedule',iat:clock/1000-1,nbf:clock/1000-1,exp:clock/1000+299};
function token(patch={},header={}){const encoded=[{alg:'RS256',kid:key.kid,...header},{...claims,...patch}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url'));return 'Bearer '+encoded.join('.')+'.'+sign('RSA-SHA256',Buffer.from(encoded.join('.')),privateKey).toString('base64url');}
test('scheduler accepts only verified short-lived identity from the exact main workflow',async()=>{
 let fetches=0;const auth=createSchedulerAuth({origin,repository,now:()=>clock,fetcher:async url=>{fetches++;assert.equal(url,'https://token.actions.githubusercontent.com/.well-known/jwks');return {ok:true,json:async()=>({keys:[key]})};}});
 assert.equal(await auth(token()),true);assert.equal(await auth(token({event_name:'workflow_dispatch'})),true);assert.equal(await auth(token({event_name:'push'})),true);assert.equal(fetches,1);
 for(const patch of [{aud:'https://evil.test'},{repository:'other/repo'},{repository_id:'wrong'},{ref:'refs/heads/feature'},{workflow_ref:repository+'/.github/workflows/other.yml@refs/heads/main'},{iss:'https://evil.test'},{event_name:'pull_request'},{exp:clock/1000-1},{iat:clock/1000-1000},{nbf:clock/1000+60}])await assert.rejects(auth(token(patch)),{status:403});
 await assert.rejects(auth(token({}, {alg:'none'})),{status:403});await assert.rejects(auth('Bearer not-a-token'),{status:401});
 const valid=token();await assert.rejects(auth(valid.slice(0,-20)+'A'.repeat(20)),{status:403});
});
test('scheduler fails closed when the official key service cannot be reached',async()=>{const auth=createSchedulerAuth({origin,now:()=>clock,fetcher:async()=>{throw Error('offline');}});await assert.rejects(auth(token()),{status:503});});

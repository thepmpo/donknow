// No user documents, credentials, API keys or OIDC tokens are logged.
const origin='https://duckduck-test.onrender.com';
try{
 const address=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL||'');
 if(address.protocol!=='https:'||!address.hostname.endsWith('.actions.githubusercontent.com')||!process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN)throw Error();
 address.searchParams.set('audience',origin+'/api/automations/tick');
 const r=await fetch(address,{headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();const {value}=await r.json();if(typeof value!=='string')throw Error();
 // A cold free service may need one wake-up request before accepting delivery.
 for(let attempt=0;attempt<3;attempt++){
  const response=await fetch(origin+'/api/automations/tick',{method:'POST',headers:{Authorization:'Bearer '+value,'Content-Type':'application/json','X-Duckduck-Client':'web'},body:'{}',redirect:'error',signal:AbortSignal.timeout(150000)});
  if(response.ok){const output=await response.json();console.log(JSON.stringify({ok:true,processed:output.processed}));process.exit(0);}
  if(![502,503,504].includes(response.status)||attempt===2)throw Error();
  await new Promise(resolve=>setTimeout(resolve,10000));
 }
}catch{console.error('Scheduled delivery could not be verified. No credentials or user content were logged.');process.exitCode=1;}

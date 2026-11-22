// Isolated test process only. Never contact an actual recipient/provider.
if(process.env.NODE_ENV!=='test')throw Error('Mail fixture is test-only');
const original=globalThis.fetch;
globalThis.fetch=(url,options)=>String(url)==='https://api.resend.com/emails'?Promise.resolve(new Response(JSON.stringify({name:'validation_error',message:'You can only send testing emails to your own email address.'}),{status:403})):original(url,options);

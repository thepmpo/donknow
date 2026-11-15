import {openStore} from '../server/store.js';
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];
if(!args.includes('--verified-settlement')||!args.includes('--email')||!args.includes('--reference')||!args.includes('--net-krw'))throw Error('사용법: node scripts/fund-ai-budget.mjs --verified-settlement --email 계정 --reference 고유정산참조 --net-krw 실제정산금액');
const store=await openStore(process.env.DATA_DIR||'data');
try{const user=store.findAccountId(get('--email'));if(!user)throw Error('등록된 계정을 확인해주세요.');const result=store.fundAiAllowance(user,{reference:get('--reference'),netProceedsKrw:Number(get('--net-krw'))});console.log(JSON.stringify(result));}finally{store.close();}

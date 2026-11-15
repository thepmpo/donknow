import {parentPort} from 'node:worker_threads';
import {buildAgentFile} from './agent-files.js';
parentPort.on('message',async({id,args})=>{try{parentPort.postMessage({id,result:await buildAgentFile(args)});}catch(error){parentPort.postMessage({id,error:{status:error.status??502,message:error.status?error.message:'파일을 만들지 못했어요.'}});}});

import {Worker} from 'node:worker_threads';
import {randomUUID} from 'node:crypto';
import {fail} from './secrets.js';
let worker=null,current=null;const queue=[];
function next(){if(current||!queue.length)return;current=queue.shift();if(!worker){const instance=worker=new Worker(new URL('./agent-file-worker.js',import.meta.url),{resourceLimits:{maxOldGenerationSizeMb:192}});worker.on('message',message=>{if(worker!==instance)return;if(message.id!==current?.id)return;clearTimeout(current.timer);const task=current;current=null;if(message.error)task.reject(fail(message.error.status,message.error.message));else task.resolve(message.result);worker.unref();next();});worker.on('error',()=>{if(worker===instance)failWorker();});worker.on('exit',code=>{if(worker===instance&&code!==0)failWorker();});}worker.ref();current.timer=setTimeout(()=>failWorker(),30000);worker.postMessage({id:current.id,args:current.args});}
function failWorker(){const old=worker;worker=null;void old?.terminate();if(current){clearTimeout(current.timer);current.reject(fail(502,'파일 생성 시간이 길어졌어요. 보관된 작업에서 다시 이어갈 수 있어요.'));current=null;}next();}
export function buildAgentFileAsync(args){if(queue.length>=20)return Promise.reject(fail(429,'앞선 파일을 만들고 있어요. 잠시 뒤 이어갈게요.'));return new Promise((resolve,reject)=>{queue.push({id:randomUUID(),args,resolve,reject});next();});}

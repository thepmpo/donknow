// An actual synchronous libSQL HTTP client in each worker. All traffic stays
// inside the isolated local protocol fixture; no production credentials exist.
import {parentPort,workerData} from 'node:worker_threads';
import http from 'node:http';
import Database from 'libsql';
const db=new Database(process.env.FIXTURE_REMOTE_URL,{authToken:'fixture-token'});
db.exec('CREATE TABLE IF NOT EXISTS lane_tasks(id INTEGER PRIMARY KEY,title TEXT)');
const server=http.createServer((req,res)=>{
 if(workerData.role==='integration'){
  parentPort.postMessage({type:'reading'});
  for(let i=0;i<8;i++)db.prepare('SELECT COUNT(*) AS count FROM lane_tasks').get();
 }else db.prepare('INSERT INTO lane_tasks(title) VALUES(?)').run('local fixture task');
 res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true}));
});
server.listen(0,'127.0.0.1',()=>parentPort.postMessage({type:'ready',port:server.address().port}));
parentPort.on('message',message=>{if(message.type==='close')server.close(()=>{db.close();process.exit(0);});});

if(!process.env.PUBLIC_ORIGIN&&process.env.RENDER_EXTERNAL_URL)process.env.PUBLIC_ORIGIN=process.env.RENDER_EXTERNAL_URL;
if(process.env.NODE_ENV==='production'){try{const origin=new URL(process.env.PUBLIC_ORIGIN);if(origin.protocol!=='https:'||origin.origin!==process.env.PUBLIC_ORIGIN||origin.username||origin.password)throw new Error();}catch{throw new Error('Production requires PUBLIC_ORIGIN as an exact HTTPS origin');}}
import {startRequestLanes} from './server/request-lanes.js';
if(process.env.REQUEST_LANES==='1'||process.env.NODE_ENV==='production'&&process.env.REQUEST_LANES!=='0')await startRequestLanes();
else await import('./server-runtime.js');

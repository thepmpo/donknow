import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWeather} from '../server/weather.js';
const fixture={current:{temperature_2m:17,weather_code:1,time:'2026-11-09T12:00'},daily:{temperature_2m_max:[19],temperature_2m_min:[8],precipitation_probability_max:[20]}};
test('weather uses fixed destination and city coordinates, caches/coalesces without personal data',async()=>{
 let calls=0,time=1000000;
 const weather=createWeather(async(url,options)=>{calls++;assert.equal(url.origin,'https://api.open-meteo.com');assert.equal(url.searchParams.get('latitude'),'37.57');assert.equal(options.redirect,'error');return Response.json(fixture);},()=>time);
 await assert.rejects(weather('https://other.test'),e=>e.status===400);
 const [a,b]=await Promise.all([weather('seoul'),weather('seoul')]);assert.deepEqual(a,b);assert.equal(a.city,'서울');assert.equal(calls,1);
 await weather('seoul');assert.equal(calls,1);time+=600001;await weather('seoul');assert.equal(calls,2);
});
test('weather failure and malformed payload are safe and never cached as success',async()=>{
 let calls=0;const weather=createWeather(async()=>{calls++;if(calls===1)throw Error('secret');return Response.json({current:{temperature_2m:null}});});
 for(let i=0;i<2;i++)await assert.rejects(weather('busan'),e=>e.status===502&&!e.message.includes('secret'));
 assert.equal(calls,2);
});

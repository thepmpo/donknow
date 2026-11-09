import {fail} from './secrets.js';
export const weatherCities = {seoul:{name:'서울',latitude:37.57,longitude:126.98},busan:{name:'부산',latitude:35.18,longitude:129.08},incheon:{name:'인천',latitude:37.46,longitude:126.71},daegu:{name:'대구',latitude:35.87,longitude:128.60},daejeon:{name:'대전',latitude:36.35,longitude:127.38},gwangju:{name:'광주',latitude:35.16,longitude:126.85},jeju:{name:'제주',latitude:33.50,longitude:126.53}};
export function createWeather(fetcher=fetch,now=Date.now){
 const cache=new Map(),pending=new Map();
 return async function weather(city){
  if(!Object.hasOwn(weatherCities,city))throw fail(400,'지원하는 도시를 선택해주세요.');
  if(cache.get(city)?.expires>now())return cache.get(city).value;
  if(pending.has(city))return pending.get(city);
  const task=(async()=>{try{
   const place=weatherCities[city],url=new URL('https://api.open-meteo.com/v1/forecast');
   for(const [k,v] of Object.entries({latitude:place.latitude,longitude:place.longitude,current:'temperature_2m,weather_code',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max',timezone:'Asia/Seoul',forecast_days:1}))url.searchParams.set(k,String(v));
   const response=await fetcher(url,{signal:AbortSignal.timeout(8000),redirect:'error'});
   if(!response.ok)throw Error();
   const data=await response.json(),c=data.current,d=data.daily;
   const values=[c?.temperature_2m,c?.weather_code,d?.temperature_2m_max?.[0],d?.temperature_2m_min?.[0],d?.precipitation_probability_max?.[0]];
   if(values.some(v=>typeof v!=='number'||!Number.isFinite(v))||typeof c?.time!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(c.time))throw Error();
   const value={city:place.name,temperature:values[0],code:values[1],high:values[2],low:values[3],rain:values[4],observedAt:c.time,readAt:new Date(now()).toISOString(),source:'Open-Meteo',sourceUrl:'https://open-meteo.com/'};
   cache.set(city,{value,expires:now()+600000});return value;
  }catch{throw fail(502,'날씨를 불러오지 못했어요. 잠시 후 다시 확인해주세요.');}finally{pending.delete(city);}})();
  pending.set(city,task);return task;
 };
}

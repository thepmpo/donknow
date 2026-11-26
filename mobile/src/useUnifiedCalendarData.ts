import {overlayCalendarWrites} from './calendar-write-overlay';
import {useCalendarData} from './useCalendarData';
import {useAppleCalendarData} from './useAppleCalendarData';
import {isAppleCalendar} from './apple-calendar-model';
import type {AppleCalendarDevice} from './apple-calendar-model';
import {docenCalendarId} from './calendar-model';
import type {CalendarEvent,CalendarSource} from './calendar-model';
import type {TodoStore} from './useTodos';
const docenSource:CalendarSource={id:docenCalendarId,name:'도슨 캘린더',provider:'docen',accountLabel:'도슨',canWrite:true,color:'#2366e8'};
export function useUnifiedCalendarData(store:TodoStore,options:Parameters<typeof useCalendarData>[1],device?:AppleCalendarDevice){
 const google=useCalendarData(store,{...options,selected:options.selected.filter(id=>!isAppleCalendar(id))}),owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo',apple=useAppleCalendarData({owner,...options,enabled:!!store.user,device});
 return {...google,phase:apple.error?'partial':google.phase==='unconnected'&&(apple.sources.length||google.docenSupported)?'ready':google.phase,readAt:[google.readAt,apple.readAt].filter((v):v is string=>!!v).sort().at(-1)??null,error:[google.error,apple.error].filter(Boolean).join(' '),sources:[...google.sources,...apple.sources,...(google.docenSupported?[docenSource]:[])],events:overlayCalendarWrites(owner,[...google.baseEvents,...apple.events],options.start,options.end,options.timeZone,[...options.selected,...(google.docenSupported?[docenCalendarId]:[])]),appleAvailable:apple.available,saveApple:apple.save,deleteApple:apple.remove,cachedEvents:()=>[...google.cachedEvents(),...apple.cached],load:async(more=false)=>{await Promise.allSettled([google.load(more),apple.load()]);},loadSources:async(more=false)=>{await Promise.allSettled([google.loadSources(more),apple.load()]);},upsertEvent:(e:CalendarEvent)=>{if(e.provider!=='apple-calendar')google.upsertEvent(e);},nativeError:apple.error};
}

import {overlayCalendarWrites} from './calendar-write-overlay';
import {useCalendarData} from './useCalendarData';
import {useAppleCalendarData} from './useAppleCalendarData';
import {isAppleCalendar} from './apple-calendar-model';
import type {AppleCalendarDevice} from './apple-calendar-model';
import type {CalendarEvent} from './calendar-model';
import type {TodoStore} from './useTodos';
export function useUnifiedCalendarData(store:TodoStore,options:Parameters<typeof useCalendarData>[1],device?:AppleCalendarDevice){
 const google=useCalendarData(store,{...options,selected:options.selected.filter(id=>!isAppleCalendar(id))}),owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo',apple=useAppleCalendarData({owner,...options,enabled:!!store.user,device});
 return {...google,phase:apple.error?'partial':google.phase==='unconnected'&&apple.sources.length?'ready':google.phase,readAt:[google.readAt,apple.readAt].filter((v):v is string=>!!v).sort().at(-1)??null,error:[google.error,apple.error].filter(Boolean).join(' '),sources:[...google.sources,...apple.sources],events:overlayCalendarWrites(owner,[...google.baseEvents,...apple.events],options.start,options.end,options.timeZone,options.selected),appleAvailable:apple.available,saveApple:apple.save,deleteApple:apple.remove,cachedEvents:()=>[...google.cachedEvents(),...apple.cached],load:async(more=false)=>{await Promise.allSettled([google.load(more),apple.load()]);},loadSources:async(more=false)=>{await Promise.allSettled([google.loadSources(more),apple.load()]);},upsertEvent:(e:CalendarEvent)=>{if(e.provider!=='apple-calendar')google.upsertEvent(e);},nativeError:apple.error};
}

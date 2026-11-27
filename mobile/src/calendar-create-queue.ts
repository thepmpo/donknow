import type {CalendarEvent,CalendarMirrorTarget} from './calendar-model.ts';
export type CalendarCreatePayload={revision:0;args:Record<string,unknown>;fields:NonNullable<CalendarEvent['duckDetails']>['fields'];target?:CalendarMirrorTarget};
export type QueuedCalendarCreate={id:string;event:CalendarEvent;payload:CalendarCreatePayload;blocked?:boolean;failure?:string;cancelled?:boolean};
import {createDeviceCreateQueue} from './device-create-queue.ts';

export function createCalendarCreateQueue(disk:Parameters<typeof createDeviceCreateQueue<QueuedCalendarCreate>>[0]){
 return createDeviceCreateQueue(disk,(entry):entry is QueuedCalendarCreate=>{
  const job=entry as Partial<QueuedCalendarCreate>|null;
  return typeof job?.id==='string'&&!!job.id&&job.event?.id==='docen:'+job.id&&job.payload?.revision===0;
 });
}

export type CalendarCreateQueue=ReturnType<typeof createCalendarCreateQueue>;

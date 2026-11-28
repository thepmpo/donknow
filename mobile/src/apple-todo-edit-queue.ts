import type {Todo} from './domain';
import type {Patch} from './repository';
import type {QueuedTodoEdit} from './todo-device-queue';

export function waitingForAppleTodoDelivery(todo:Todo){
 return todo.delivery?.provider==='apple-reminders'&&['sending','checking'].includes(todo.delivery.state)&&!todo.source;
}

export function queuedTodoEditBase(job:QueuedTodoEdit,saved:Todo){
 const fields=Object.fromEntries(Object.keys(job.patch).map(key=>[key,job.before[key as keyof Todo]??null])) as Patch;
 const delivered=!job.before.source&&saved.source?.provider===job.before.delivery?.provider&&
  saved.source?.listId===job.before.delivery?.listId&&saved.delivery?.state==='synced';
 return {fields,sourceId:(delivered?saved.source:job.before.source)?.externalId??null,editedAt:job.editedAt};
}

export function pendingAppleTodoEdit(todo:Todo){
 return todo.source?.provider==='apple-reminders'&&!!todo.sourceSync?.patch&&todo.sourceSync.state!=='succeeded';
}

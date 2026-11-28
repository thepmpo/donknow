import type {ListedReminder} from './apple-reminder-read.ts';
import type {Todo} from './domain.ts';

const prefix='apple-reminder-preview:';
export const appleReminderPreviewId=(id:string)=>prefix+id;
export const isAppleReminderPreview=(id:string)=>id.startsWith(prefix);

export function showAppleReminders(
 todos:Todo[],lists:ReadonlyMap<string,ListedReminder[]>,suppressed:ReadonlySet<string>,pending:ReadonlySet<string>,
):Todo[]{
 const native=new Map([...lists.values()].flat().map(item=>[item.id,item]));
 const rows=todos.map(todo=>{
  if(todo.source?.provider!=='apple-reminders')return todo;
  const original=native.get(todo.source.externalId);
  native.delete(todo.source.externalId);
  if(!original||pending.has(todo.id)||todo.saveState||todo.sourceSync?.patch)return todo;
  if(todo.source.modifiedAt&&(!original.modifiedAt||Date.parse(original.modifiedAt)<Date.parse(todo.source.modifiedAt)))return todo;
  const {title,notes,dueDate,dueTime,completed,listId,listTitle,color}=original;
  return {...todo,title,notes,dueDate,dueTime,done:completed,
   completedAt:completed?todo.completedAt??original.modifiedAt??null:null,
   source:{...todo.source,listId,listTitle,color:color??todo.source.color}};
 });
 // Native rows remain selectable while Docen allocates their persistent IDs.
 for(const item of native.values()){
  if(item.completed||suppressed.has(item.id)||todos.some(todo=>
   todo.delivery?.provider==='apple-reminders'&&todo.delivery.state!=='synced'&&todo.delivery.listId===item.listId&&
   todo.title===item.title&&todo.dueDate===item.dueDate&&(todo.dueTime??null)===item.dueTime))continue;
  rows.push({id:appleReminderPreviewId(item.id),category:'업무',done:false,title:item.title,notes:item.notes,dueDate:item.dueDate,
   dueTime:item.dueTime,source:{provider:'apple-reminders',externalId:item.id,
    listId:item.listId,listTitle:item.listTitle,color:item.color,modifiedAt:item.modifiedAt}});
 }
 return rows;
}

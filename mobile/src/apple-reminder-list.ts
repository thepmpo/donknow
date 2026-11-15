/** Resolve the REMINDER-scoped shared object; never use event-only getCalendarById. */
export async function reminderList<T extends {id:string}>(known:T[],id:string,readReminderLists:()=>Promise<T[]>){
 const existing=known.find(list=>list.id===id);
 if(existing)return {list:existing,lists:known};
 const lists=await readReminderLists(),list=lists.find(value=>value.id===id);
 if(!list)throw Error('이 미리 알림 목록을 찾지 못했어요. 목록을 다시 확인해주세요.');
 return {list,lists};
}

import {requireOptionalNativeModule} from 'expo';
import {Platform} from 'react-native';
import type {Category,Todo} from './domain';

export type Destination={id:string;title:string;current:boolean};
export type MembershipPage={kind:'local'|'apple'|'google';items:Destination[];connectionId?:string;nextCursor?:string|null};
export type AppleMoveReceipt={originalId:string;id:string;title:string;modifiedAt:string};

export function localMembership(todos:Todo[]):MembershipPage{
 return {kind:'local',items:(['일상','업무','건강'] as Category[]).map(id=>({id,title:id,current:todos.every(todo=>todo.category===id)}))};
}

async function appleReminderMove(){
 const module=Platform.OS==='ios'?requireOptionalNativeModule<{
  destinations:(ids:string[])=>Promise<{id:string;title:string;current:string}[]>;
  move:(id:string,destination:string)=>Promise<AppleMoveReceipt>;
 }>('DuckduckReminderMove'):null;
 if(!module)throw Error('미리 알림 목록 이동은 최신 아이폰 앱에서 할 수 있어요.');
 const calendar=await import('expo-calendar');
 if(!(await calendar.getRemindersPermissions()).granted)throw Error('ME에서 아이폰 미리 알림 접근을 허용해주세요.');
 return module;
}

export async function appleMembership(todos:Todo[]):Promise<MembershipPage>{
 const module=await appleReminderMove();
 const lists=await module.destinations(todos.map(todo=>todo.source!.externalId));
 return {kind:'apple',items:lists.map(list=>({...list,current:list.current==='yes'}))};
}

export async function moveAppleReminder(todo:Todo,destination:string,current:()=>boolean){
 const module=await appleReminderMove();
 if(!current())throw Error('로그인이 바뀌었어요.');
 return module.move(todo.source!.externalId,destination);
}

import type {Todo} from './domain.ts';
import {appleSourcePlan} from './apple-source-plan.ts';
type NativeSource=Parameters<typeof appleSourcePlan>[1]&{update:(fields:ReturnType<typeof appleSourcePlan>['fields'])=>Promise<unknown>};
export async function applyAppleSource(todo:Todo,device:{authorize:()=>Promise<boolean>;read:(id:string)=>Promise<NativeSource>},current:()=>boolean){
 let attempted=false;
 try{if(!await device.authorize()){if(!current())return null;throw Error('permission');}if(!current())return null;const source=await device.read(todo.source!.externalId);if(!current())return null;const {fields,same}=appleSourcePlan(todo,source);
  if(!same){attempted=true;await source.update(fields);}if(!current())return null;const latest=await device.read(todo.source!.externalId);if(!current())return null;if(!appleSourcePlan(todo,latest).same)throw Error('원본 저장 결과를 확인하지 못했어요.');
  return {state:'succeeded' as const,modifiedAt:latest.lastModifiedDate?new Date(latest.lastModifiedDate).toISOString():undefined};
 }catch{if(!current())return null;return {state:attempted?'unknown' as const:'failed' as const};}
}

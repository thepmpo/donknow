import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import {CONNECTION_KEY} from './repository';
import {serverUrl} from './domain';
import {AuthRequiredError,bindDeviceRequests} from './auth';
import type {User} from './auth';

const taskName='docen.sync.v1';
let running=false;
async function runSync(allowed:()=>boolean){
 if(running||!allowed())return;
 running=true;
 try{
  const value=await AsyncStorage.getItem(CONNECTION_KEY);
  if(!value||!allowed())return;
  const connection=JSON.parse(value);
  if(connection.mode!=='cloud')return;
  const base=serverUrl(connection.baseUrl,__DEV__),request=await bindDeviceRequests(base,allowed);
  const {user}=await request('/api/auth/session') as {user?:User};
  if(!user?.emailVerified||!allowed())return;
  const {syncInBackground}=await import('./background-sync-work');
  await syncInBackground(base+':'+user.id,request,allowed);
 }finally{running=false;}
}

TaskManager.defineTask(taskName,async ({error})=>{
 if(error)return BackgroundTask.BackgroundTaskResult.Failed;
 let expired=false;
 const expiration=BackgroundTask.addExpirationListener(()=>{expired=true;});
 const until=Date.now()+22000;
 try{
  await runSync(()=>!expired&&Date.now()<until&&AppState.currentState!=='active');
  return expired?BackgroundTask.BackgroundTaskResult.Failed:BackgroundTask.BackgroundTaskResult.Success;
 }catch(error){
  return error instanceof AuthRequiredError?BackgroundTask.BackgroundTaskResult.Success:BackgroundTask.BackgroundTaskResult.Failed;
 }finally{expiration.remove();}
});

async function register(){
 if(!await TaskManager.isAvailableAsync())return;
 await BackgroundTask.registerTaskAsync(taskName,{minimumInterval:15});
}
void register().catch(()=>{});
AppState.addEventListener('change',state=>{
 if(state!=='background')return;
 const until=Date.now()+15000;
 void runSync(()=>Date.now()<until&&AppState.currentState==='background').catch(()=>{});
});

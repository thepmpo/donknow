import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import app from '../app.json';
import type {TodoStore} from './useTodos';
const key='duckduck.push-device-id';
export async function connectPush(store:TodoStore){
 if(Platform.OS!=='ios')throw new Error('아이폰에 설치한 덕에서 알림을 연결해주세요. 웹에서는 덕 채팅으로 확인할 수 있어요.');
 const original=store.user?.id,notifications=await import('expo-notifications');
 const permission=await notifications.requestPermissionsAsync();if(!(permission.granted||permission.ios?.status===notifications.IosAuthorizationStatus.PROVISIONAL))throw new Error('아이폰 설정에서 덕 알림을 허용해주세요.');
 const token=await notifications.getExpoPushTokenAsync({projectId:app.expo.extra.eas.projectId});
 if(original!==store.user?.id)throw new Error('계정이 바뀌었어요. 다시 연결해주세요.');
 const result=await store.featureRequest('/api/notifications/device','POST',{deviceId:await SecureStore.getItemAsync(key),token:token.data}) as {enabled:boolean;deviceId:string};
 await SecureStore.setItemAsync(key,result.deviceId);return result;
}
export async function disconnectPush(store:TodoStore){if(Platform.OS!=='ios')return;const id=await SecureStore.getItemAsync(key);if(id)await store.featureRequest('/api/notifications/device','DELETE',{deviceId:id});}
export function listenForDuckNotification(onOpen:()=>void){
 let disposed=false,remove:(()=>void)|undefined;if(Platform.OS==='ios')void import('expo-notifications').then(async n=>{if(disposed)return;function open(response:Awaited<ReturnType<typeof n.getLastNotificationResponseAsync>>){if(!disposed&&response?.notification.request.content.data?.screen==='duck')onOpen();}const subscription=n.addNotificationResponseReceivedListener(open);remove=()=>subscription.remove();open(await n.getLastNotificationResponseAsync());await n.clearLastNotificationResponseAsync();}).catch(()=>undefined);
 return()=>{disposed=true;remove?.();};
}

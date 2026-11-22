import React,{useEffect,useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import {Button,colors,Page,s} from '../ui';
import type {TodoStore} from '../useTodos';
type Delivery={status:string;createdAt:number;error?:string};
export function VerificationScreen({store}:{store:TodoStore}){
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[delivery,setDelivery]=useState<Delivery|null>(null),[configured,setConfigured]=useState<boolean|null>(null),[now,setNow]=useState(Date.now());
 useEffect(()=>{let active=true;async function check(){try{const value=await store.featureRequest('/api/account') as {user:{emailVerified:boolean};mailConfigured:boolean;mailStatus:Delivery|null};if(!active)return;setConfigured(value.mailConfigured);setDelivery(value.mailStatus);if(value.user.emailVerified)await store.refreshAccount();}catch(e){if(active)setError(e instanceof Error?e.message:'인증 상태를 확인하지 못했어요.');}}void check();const timer=setInterval(()=>{setNow(Date.now());void check();},3000);return()=>{active=false;clearInterval(timer);};},[]);
 const remaining=delivery?Math.max(0,Math.ceil((delivery.createdAt+60000-now)/1000)):0;
 const expired=!!delivery&&now>delivery.createdAt+15*60000;
 async function resend(){setBusy(true);setError('');try{await store.featureRequest('/api/account/verification/send','POST',{});setCode('');setDelivery({status:'pending',createdAt:Date.now()});setNow(Date.now());}catch(e){setError(e instanceof Error?e.message:'인증메일을 요청하지 못했어요.');}finally{setBusy(false);}}
 async function confirm(){if(code.length!==6||busy)return;setBusy(true);setError('');try{await store.featureRequest('/api/account/verification/confirm','POST',{code});await store.refreshAccount();}catch(e){setError(e instanceof Error?e.message:'인증번호를 확인해주세요.');}finally{setBusy(false);}}
 return <Page><View testID="email-verification-gate" style={{width:'100%',maxWidth:440,alignSelf:'center',paddingVertical:40,gap:20}}><Text style={{fontSize:42}}>🦆</Text><Text style={s.h1}>이메일 인증을 부탁드려요</Text><Text style={s.subtitle}>본인의 이메일인지 확인하면 docen을 이용할 수 있어요.</Text><Text style={{color:colors.text,fontSize:17}}>{store.user?.email}</Text>
 <Text accessibilityLiveRegion="polite" style={s.subtitle}>{configured===false?'현재 인증메일 발송이 준비되지 않았어요. 운영자의 메일 설정이 필요해요. 인증이 완료되기 전에는 내부로 들어갈 수 없어요.':delivery?.status==='sent'?'인증메일을 보냈어요. 받은편지함과 스팸함을 확인해주세요.':delivery?.status==='failed'?'인증메일을 보내지 못했어요.':delivery?.status==='expired'||expired?'인증번호가 만료됐어요. 다시 요청해주세요.':'인증메일을 보내고 있어요. 잠시만 기다려주세요.'}</Text>
 {!!delivery?.error&&delivery.status!=='sent'&&<Text accessibilityRole="alert" style={s.error}>{delivery.error}</Text>}
 <TextInput accessibilityLabel="6자리 인증번호" placeholder="6자리 인증번호" value={code} onChangeText={v=>setCode(v.replace(/\D/g,'').slice(0,6))} editable={!busy} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} onSubmitEditing={()=>void confirm()} style={{color:colors.text,backgroundColor:colors.grouped,borderRadius:14,padding:16,fontSize:20,letterSpacing:6}}/>
 <Text style={s.subtitle}>인증번호는 15분 동안 유효해요.</Text>{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
 <Button title={busy?'확인 중…':'인증하고 시작하기'} disabled={busy||code.length!==6} onPress={()=>void confirm()}/><Button quiet title={remaining?`${remaining}초 후 다시 보내기`:'인증메일 다시 보내기'} disabled={busy||configured!==true||remaining>0} onPress={()=>void resend()}/><Button quiet title="다른 이메일로 로그인" disabled={busy} onPress={()=>void store.logout()}/></View></Page>;
}

import React,{useEffect,useRef,useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import {MePage,MeSection,MeCopy} from '../MeSettings';
import {Button} from '../ui';
import {colors,typography} from '../theme';
import type {TodoStore} from '../useTodos';
export function NaverMailScreen({store,onClose}:{store:TodoStore;onClose:()=>void}){
 const [status,setStatus]=useState<{configured:boolean;connected:boolean;label?:string;readOnly?:boolean}>(),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),alive=useRef(true);
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;};},[]);
 async function load(){try{const value=await store.featureRequest('/api/integrations/naver') as NonNullable<typeof status>;if(alive.current)setStatus(value);}catch(e){if(alive.current)setError(e instanceof Error?e.message:'연결을 확인하지 못했어요.');}}
 async function connect(){if(busy)return;setBusy(true);setError('');try{await store.featureRequest('/api/integrations/naver','POST',{email:email.trim(),password,permissions:{modify:false,send:false}});if(alive.current){setPassword('');await load();}}catch(e){if(alive.current)setError(e instanceof Error?e.message:'연결하지 못했어요.');}finally{if(alive.current){setPassword('');setBusy(false);}}}
 return <MePage title="네이버 메일" onClose={onClose} disabled={busy}><MeSection compact><MeCopy title={status?.connected?'연결 설정됨':'메일 연결'}>{status?.label??'네이버에서 IMAP을 켜고 앱 비밀번호로 연결해요.'}</MeCopy></MeSection><View style={{gap:12,marginTop:16}}><TextInput accessibilityLabel="네이버 메일 주소" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="아이디@naver.com" placeholderTextColor={colors.muted} style={input}/><TextInput accessibilityLabel="네이버 앱 비밀번호" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="앱 비밀번호" placeholderTextColor={colors.muted} style={input}/><Button title="네이버 메일 연결" loading={busy} disabled={!status?.configured||!email.trim()||!password} onPress={()=>void connect()}/>{status?.connected&&<Button title="연결 해제" quiet disabled={busy} onPress={()=>void store.featureRequest('/api/integrations/naver','DELETE').then(()=>load()).catch(()=>setError('연결을 해제하지 못했어요.'))}/>}<Button title="상태 다시 확인" quiet disabled={busy} onPress={()=>void load()}/>{!!error&&<Text accessibilityRole="alert" style={{...typography.detail,color:colors.danger}}>{error}</Text>}</View></MePage>;
}
const input={minHeight:48,padding:12,borderRadius:12,backgroundColor:colors.grouped,color:colors.text,...typography.body};

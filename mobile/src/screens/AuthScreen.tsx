import {BrandMark} from '../BrandMark';
import {SignupAgreements} from '../SignupAgreements';
import type {SignupAgreements as Acceptance} from '../auth';
import {PasswordFields} from '../PasswordFields';
import {passwordGuidance,validNewPassword} from '../password-policy';
import {AccountScreen} from './AccountScreen';
import React,{useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import type {TodoStore} from '../useTodos';
import {Button,colors,Page,s} from '../ui';
export function AuthScreen({store,onSettings}:{store:TodoStore;onSettings:()=>void}){
 const [accepted,setAccepted]=useState<Acceptance|undefined>(),[register,setRegister]=useState(false),[reset,setReset]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
 async function submit(){
  if(register&&!validNewPassword(password)){store.setError(passwordGuidance);return;}
  if(register&&password!==confirmation){store.setError('비밀번호가 일치하지 않습니다.');return;}
  if(register&&!accepted){store.setError('가입 전에 필수 동의 항목을 확인해주세요.');return;}
  if(!password)return;
  if(await store.authenticate(email.trim(),password,register,accepted,confirmation)){setPassword('');setConfirmation('');}
 }
 if(reset)return <AccountScreen store={store} kind="reset" onClose={()=>setReset(false)}/>;
 return <Page><View style={styles.welcome}><BrandMark size={64} style={{alignSelf:'center',marginBottom:20}}/><Text style={s.h1}>{register?'docen과 함께 시작해요':'다시 만나 반가워요'}</Text><Text style={s.subtitle}>나의 Ticket과 기록을 계정에 저장해요.</Text></View>
 <View style={s.card}><Text style={s.sectionTitle}>{register?'회원가입':'로그인'}</Text><Text style={[s.label,{marginTop:24}]}>이메일</Text><TextInput accessibilityLabel="이메일" placeholder="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" autoCapitalize="none" autoCorrect={false} maxLength={254} editable={!store.connecting} style={styles.input}/>
 {register?<PasswordFields password={password} confirmation={confirmation} onPassword={setPassword} onConfirmation={setConfirmation} disabled={store.connecting} onSubmit={()=>void submit()} id="signup-password"/>:<><Text style={s.label}>비밀번호</Text><TextInput accessibilityLabel="비밀번호" placeholder="비밀번호" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" autoComplete="current-password" maxLength={128} editable={!store.connecting} onSubmitEditing={()=>void submit()} style={styles.input}/></>}
 {register&&<SignupAgreements store={store} onChange={setAccepted}/>}
 <Button title={store.connecting?'확인 중…':register?'계정 만들기':'로그인'} loading={store.connecting} onPress={()=>void submit()} disabled={store.connecting||!email.trim()||!password||register&&(!validNewPassword(password)||password!==confirmation||!accepted)}/><View style={{height:12}}/>
 <Button title={register?'이미 계정이 있어요':'처음이에요 · 회원가입'} quiet disabled={store.connecting} onPress={()=>{store.setError('');setPassword('');setConfirmation('');setAccepted(undefined);setRegister(!register);}}/></View>
 <View style={{marginVertical:16}}><Button title="비밀번호를 잊었어요" quiet disabled={store.connecting} onPress={()=>setReset(true)}/></View><Button title="서버 변경 · 체험 모드" quiet disabled={store.connecting} onPress={onSettings}/></Page>;
}
const styles=StyleSheet.create({welcome:{alignItems:'center',paddingVertical:30,gap:12},duck:{fontSize:48,marginBottom:10},input:{marginVertical:12,padding:16,borderRadius:16,fontSize:17,backgroundColor:colors.grouped,color:colors.text}});

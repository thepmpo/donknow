import React,{useRef,useState} from 'react';
import {Platform,StyleSheet,Text,TextInput,View} from 'react-native';
import {colors,s} from './ui';
import {passwordGuidance,validNewPassword} from './password-policy';
export function PasswordFields({password,confirmation,onPassword,onConfirmation,disabled=false,onSubmit,id='new-password',passwordLabel='비밀번호',confirmationLabel='비밀번호 확인'}:{password:string;confirmation:string;onPassword:(value:string)=>void;onConfirmation:(value:string)=>void;disabled?:boolean;onSubmit:()=>void;id?:string;passwordLabel?:string;confirmationLabel?:string}){
 const [passwordBlurred,setPasswordBlurred]=useState(false),[confirmBlurred,setConfirmBlurred]=useState(false),confirmRef=useRef<React.ComponentRef<typeof TextInput>>(null);
 const invalid=(password.length>0||passwordBlurred)&&!validNewPassword(password),mismatch=(confirmation.length>0||confirmBlurred)&&confirmation!==password;
 return <View style={styles.fields}>
 <Text style={s.label}>{passwordLabel}</Text><TextInput accessibilityLabel={passwordLabel} accessibilityHint={passwordGuidance} value={password} onChangeText={onPassword} onBlur={()=>setPasswordBlurred(true)} placeholder="비밀번호" secureTextEntry textContentType="newPassword" autoComplete="new-password" autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!disabled} returnKeyType="next" onSubmitEditing={()=>confirmRef.current?.focus()} style={[styles.input,invalid&&styles.invalid]} {...(Platform.OS==='web'?{'aria-invalid':invalid,'aria-describedby':id+'-rule'}:{})}/>
 <Text nativeID={id+'-rule'} accessibilityLiveRegion="polite" style={[styles.hint,invalid&&styles.error]}>{passwordGuidance}</Text>
 <Text style={[s.label,{marginTop:18}]}>{confirmationLabel}</Text><TextInput ref={confirmRef} accessibilityLabel={confirmationLabel} value={confirmation} onChangeText={onConfirmation} onBlur={()=>setConfirmBlurred(true)} placeholder="비밀번호를 한 번 더 입력해주세요" secureTextEntry textContentType="newPassword" autoComplete="new-password" autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!disabled} returnKeyType="done" onSubmitEditing={onSubmit} style={[styles.input,mismatch&&styles.invalid]} {...(Platform.OS==='web'?{'aria-invalid':mismatch,'aria-describedby':mismatch?id+'-mismatch':undefined}:{})}/>
 {mismatch&&<Text nativeID={id+'-mismatch'} accessibilityRole="alert" style={[styles.hint,styles.error]}>비밀번호가 일치하지 않습니다.</Text>}
 </View>;
}
const styles=StyleSheet.create({fields:{marginTop:12},input:{marginTop:10,marginBottom:8,padding:16,borderRadius:16,borderWidth:1,borderColor:'transparent',backgroundColor:colors.grouped,fontSize:17,color:colors.text},invalid:{borderColor:colors.danger,...(Platform.OS==='web'?{outlineColor:colors.danger,outlineStyle:'solid' as const,outlineWidth:1}: {})},hint:{fontSize:13,lineHeight:20,color:colors.secondary},error:{color:colors.danger}});

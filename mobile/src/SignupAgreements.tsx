import React,{useEffect,useState} from 'react';
import {Linking,StyleSheet,Text,View} from 'react-native';
import {MotionPressable as Pressable} from './motion';
import {colors} from './ui';
import type {TodoStore} from './useTodos';
import type {SignupAgreements as Acceptance} from './auth';
type Document={version:string;title:string;url:string;archiveUrl:string};
type Legal={minimumAge:number;serviceName:string;documents:{terms:Document;privacy:Document}};
export function SignupAgreements({store,onChange}:{store:TodoStore;onChange:(value:Acceptance|undefined)=>void}){
 const [legal,setLegal]=useState<Legal|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[terms,setTerms]=useState(false),[privacy,setPrivacy]=useState(false),[age,setAge]=useState(false);
 useEffect(()=>{let active=true;setError('');setLegal(null);setTerms(false);setPrivacy(false);setAge(false);onChange(undefined);store.featureRequest('/api/legal').then(raw=>{const data=raw as Legal;if(!data.documents?.terms?.version||!data.documents?.privacy?.version||data.minimumAge!==14)throw Error('가입 안내를 확인하지 못했어요.');if(active)setLegal(data);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'가입 안내를 확인하지 못했어요.');});return()=>{active=false;};},[retry]);
 useEffect(()=>{onChange(legal&&terms&&privacy&&age?{termsVersion:legal.documents.terms.version,privacyVersion:legal.documents.privacy.version,age14:true}:undefined);},[legal,terms,privacy,age]);
 const open=(path:string)=>{if(store.connection?.mode==='cloud')void Linking.openURL(store.connection.baseUrl+path).catch(()=>setError('문서를 열지 못했어요. 잠시 후 다시 확인해주세요.'));};
 return <View style={styles.container} testID="signup-agreements"><Text style={styles.heading}>가입 전 확인해주세요</Text>{error?<><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={()=>setRetry(v=>v+1)} style={styles.link}><Text style={{color:colors.blue}}>가입 안내 다시 확인</Text></Pressable></>:!legal?<Text accessibilityLiveRegion="polite" style={styles.note}>가입 안내를 불러오고 있어요.</Text>:<>
 <Row label="[필수] 이용약관 동의" checked={terms} onPress={()=>setTerms(v=>!v)} linkLabel="이용약관 보기" onLink={()=>open(legal.documents.terms.archiveUrl)}/>
 <Row label="[필수] 개인정보 수집 및 이용 동의" checked={privacy} onPress={()=>setPrivacy(v=>!v)} linkLabel="개인정보 수집 안내 보기" onLink={()=>open(legal.documents.privacy.archiveUrl+'#collection-consent')}/>
 <Row label="[필수] 만 14세 이상입니다" checked={age} onPress={()=>setAge(v=>!v)}/>
 <Text style={styles.note}>가입에는 이메일과 비밀번호를 사용해요. 이름·생년월일·휴대폰번호는 필수로 받지 않아요. 필수 동의를 거부하면 가입할 수 없어요. AI 자료 사용·외부 연결·알림은 해당 기능에서 따로 선택해요.</Text>
 <Pressable accessibilityRole="button" accessibilityLabel="가입 안내 새로고침" onPress={()=>setRetry(v=>v+1)} style={styles.link}><Text style={{color:colors.blue,fontSize:12}}>가입 안내 새로고침</Text></Pressable></>}</View>;
}
function Row({label,checked,onPress,linkLabel,onLink}:{label:string;checked:boolean;onPress:()=>void;linkLabel?:string;onLink?:()=>void}){return <View style={styles.row}><Pressable accessibilityRole="checkbox" accessibilityState={{checked}} accessibilityLabel={label} onPress={onPress} style={styles.check}><Text style={[styles.box,{color:checked?colors.blue:colors.muted}]}>{checked?'☑':'☐'}</Text><Text style={styles.label}>{label}</Text></Pressable>{linkLabel&&onLink?<Pressable accessibilityRole="link" accessibilityLabel={linkLabel} onPress={onLink} style={styles.link}><Text style={{color:colors.blue,fontSize:13}}>보기</Text></Pressable>:null}</View>;}
const styles=StyleSheet.create({container:{marginTop:20,paddingTop:18,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.line,gap:8},heading:{fontSize:15,fontWeight:'600',color:colors.text},row:{flexDirection:'row',alignItems:'center',gap:6},check:{minHeight:48,flex:1,flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8},box:{fontSize:24},label:{fontSize:14,lineHeight:21,color:colors.text,flex:1},link:{minWidth:44,minHeight:44,justifyContent:'center',alignItems:'center'},note:{fontSize:12,lineHeight:19,color:colors.secondary},error:{fontSize:13,color:colors.danger}});

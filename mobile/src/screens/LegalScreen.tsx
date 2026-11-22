import React,{useEffect,useState} from 'react';
import {Linking,Text} from 'react-native';
import {MePage,MeSection,MeCopy,MeRow} from '../MeSettings';
import {Button,s} from '../ui';
import type {TodoStore} from '../useTodos';
type LegalRecord={termsVersion:string;privacyVersion:string;acceptedAt:string};
type Documents=Record<string,{title:string;url:string;archiveUrl:string;version:string}>;
export function LegalScreen({store,onClose}:{store:TodoStore;onClose:()=>void}){
 const [data,setData]=useState<{accepted:LegalRecord|null;current:{documents:Documents}}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setError('');store.featureRequest('/api/account/agreements').then(raw=>{if(active)setData(raw as NonNullable<typeof data>);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'가입 동의를 확인하지 못했어요.');});return()=>{active=false;};},[retry]);
 const open=(url:string)=>{if(store.connection?.mode==='cloud')void Linking.openURL(store.connection.baseUrl+url).catch(()=>setError('문서를 열지 못했어요.'));};
 return <MePage title="약관과 가입 동의" onClose={onClose}>{error?<><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="다시 확인" onPress={()=>setRetry(v=>v+1)}/></>:!data?<Text style={s.subtitle}>가입 동의를 확인하고 있어요.</Text>:<>
 <MeSection title="내 가입 동의">{data.accepted?<><MeCopy title="동의 시각">{new Date(data.accepted.acceptedAt).toLocaleString('ko-KR')}</MeCopy><MeRow title="가입 때 동의한 이용약관" detail={data.accepted.termsVersion} onPress={()=>open('/legal/'+data.accepted!.termsVersion+'/terms')}/><MeRow title="가입 때 동의한 개인정보 안내" detail={data.accepted.privacyVersion} onPress={()=>open('/legal/'+data.accepted!.privacyVersion+'/privacy')}/></>:<MeCopy title="기존 가입 계정">가입 동의 기록을 별도로 수집하기 전에 만든 계정입니다. 과거에 동의했다고 임의로 표시하지 않아요.</MeCopy>}</MeSection>
 <MeSection title="현재 서비스 안내">{Object.values(data.current.documents).map(doc=><MeRow key={doc.url} title={doc.title} detail={doc.version} onPress={()=>open(doc.url)}/>)}</MeSection><MeCopy title="서비스 이름이 바뀌면">변경된 이름과 적용일을 문서에서 안내해요. 중요한 조건이나 개인정보 처리 내용이 바뀌면 필요한 안내와 동의를 따로 제공합니다.</MeCopy>
 </>}</MePage>;
}

import React,{useEffect,useState} from 'react';
import {Linking,Platform,Text,View} from 'react-native';
import {WebView} from 'react-native-webview';
import {MePage} from '../MeSettings';
import {Button,s} from '../ui';
import type {TodoStore} from '../useTodos';
export function AgentCall({store,providers,consent,onClose}:{store:TodoStore;providers:string[];consent:boolean;onClose:()=>void}){
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[started,setStarted]=useState(false);
 async function start(){const popup=Platform.OS==='web'?window.open('about:blank','_blank'):null;if(popup)popup.opener=null;setBusy(true);setError('');try{await store.featureRequest('/api/agent/profile','PATCH',{voice:true});const call=await store.featureRequest('/api/agent/calls','POST',{providers,consent}) as {id:string;token:string};if(store.connection?.mode!=='cloud')throw Error('계정으로 로그인해주세요.');const next=store.connection.baseUrl+'/agent-call#'+new URLSearchParams(call);setUrl(next);setStarted(true);if(Platform.OS==='web'){if(popup)popup.location.replace(next);else throw Error('브라우저에서 통화 창 열기를 허용해주세요.');}}catch(e){popup?.close();setError(e instanceof Error?e.message:'음성 연결을 시작하지 못했어요.');}finally{setBusy(false);}}
 return <MePage title="docen과 통화" onClose={onClose}>{!!error&&<Text style={s.error} accessibilityRole="alert">{error}</Text>}{url&&Platform.OS!=='web'?<View style={{height:560,minHeight:320}}><WebView source={{uri:url}} originWhitelist={['https://*']} mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback mediaCapturePermissionGrantType="prompt" javaScriptEnabled onShouldStartLoadWithRequest={r=>r.url===url||r.url.split('#')[0]===url.split('#')[0]} onMessage={e=>{try{if(JSON.parse(e.nativeEvent.data).type==='ended')onClose();}catch{}}}/></View>:<View style={s.card}><Text style={s.subtitle}>{started?'새 통화 창에서 이야기해주세요. 이 화면에서 채팅을 계속할 수 있어요.':'음성과 선택한 자료를 AI에 보내 docen.t ai와 대화해요. 통화 시작 후 마이크를 허용해주세요. 음성으로 맡긴 일도 작업 화면에서 이어서 확인할 수 있어요.'}</Text><Button title={started?'새 통화 시작':'통화 시작'} disabled={busy||!consent} onPress={()=>void start()}/></View>}</MePage>;
}

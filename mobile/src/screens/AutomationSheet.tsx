import {connectPush,disconnectPush} from '../push';
import React,{useEffect,useRef,useState} from 'react';
import {Platform,ScrollView,Switch,Text,TextInput,View} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {MotionModal as Modal,DraggableSheet,MotionPressable as Pressable} from '../motion';
import {Button,CloseButton,colors,s} from '../ui';
import type {TodoStore} from '../useTodos';
type Schedule={kind:'briefing'|'weather';enabled:boolean;time:string;timezone:string;city:string|null;providers:string[];aiConsent:boolean;revision:number;nextAt:number|null};
const cities=[['seoul','서울'],['busan','부산'],['incheon','인천'],['daegu','대구'],['daejeon','대전'],['gwangju','광주'],['jeju','제주']];
export function AutomationSheet({store,onClose}:{store:TodoStore;onClose:()=>void}){
 const [schedules,setSchedules]=useState<Schedule[]>([]),[kind,setKind]=useState<'briefing'|'weather'>('briefing'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[advanced,setAdvanced]=useState(false);
 const alive=useRef(true),working=useRef(false);const current=schedules.find(v=>v.kind===kind);
 useEffect(()=>{alive.current=true;void store.featureRequest('/api/automations').then(r=>{if(alive.current)setSchedules((r as {schedules:Schedule[]}).schedules);}).catch(e=>{if(alive.current)setError(e instanceof Error?e.message:'예약을 불러오지 못했어요.');});return()=>{alive.current=false;};},[]);
 function change(patch:Partial<Schedule>){setSchedules(old=>old.map(v=>v.kind===kind?{...v,...patch}:v));setMessage('');}
 async function save(){if(!current||working.current)return;working.current=true;setBusy(true);setError('');try{const {enabled,time,timezone,city,providers,aiConsent}=current;const result=await store.featureRequest('/api/automations/'+kind,'POST',{enabled,time,timezone,city,providers,aiConsent}) as Schedule;if(alive.current){setSchedules(old=>old.map(v=>v.kind===kind?result:v));setMessage(result.enabled?'예약했어요. 정한 시간에 덕 채팅으로 보내드릴게요.':'예약을 껐어요. 이미 받은 메시지는 그대로예요.');}}catch(e){if(alive.current)setError(e instanceof Error?e.message:'예약을 저장하지 못했어요.');}finally{working.current=false;if(alive.current)setBusy(false);}}
 return <Modal visible transparent animationType="slide" onRequestClose={()=>{if(!busy)onClose();}}><View style={s.modalBackdrop}><DraggableSheet style={s.sheet} disabled={busy} onDismiss={onClose}>
  <View style={s.sheetHeader}><Text style={s.sectionTitle}>브리핑·날씨 예약</Text><CloseButton onPress={onClose} disabled={busy}/></View>
  <ScrollView style={{flexShrink:1}} contentContainerStyle={{gap:16,paddingBottom:24}} keyboardShouldPersistTaps="handled">
   <Text style={s.subtitle}>덕이 먼저 채팅으로 보내드려요. 앱을 닫아도 예약 메시지는 계정에 저장돼요.</Text>
   <View style={{flexDirection:'row',gap:8}}>{(['briefing','weather'] as const).map(value=><Button key={value} title={value==='briefing'?'오늘 브리핑':'도시 날씨'} quiet disabled={busy} onPress={()=>{setKind(value);setError('');setMessage('');}}/>)}</View>
   {current&&<><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={s.sectionTitle}>{kind==='briefing'?'매일 브리핑 받기':'매일 날씨 받기'}</Text><Switch accessibilityLabel={kind==='briefing'?'브리핑 예약 사용':'날씨 예약 사용'} value={current.enabled} disabled={busy} onValueChange={value=>change({enabled:value})}/></View>
    <Text style={s.muted}>{kind==='briefing'?'오늘 할 일과 선택한 연결 자료를 쉽게 요약해요. 원본을 수정하거나 메일을 발송하지 않아요.':'선택한 도시의 기온과 강수 확률을 보내드려요. 기기 위치는 사용하지 않아요.'}</Text>
    <Text style={s.label}>받을 시간</Text>
    {Platform.OS==='web'?React.createElement('input',{type:'time','aria-label':'예약 시간',value:current.time,disabled:busy,onChange:(e:React.ChangeEvent<HTMLInputElement>)=>change({time:e.target.value}),style:{fontSize:20,padding:12,minHeight:48,borderRadius:12,border:'1px solid #d1d6db',background:'#f2f4f6'}}):<DateTimePicker accessibilityLabel="예약 시간" value={new Date(2000,0,1,Number(current.time.slice(0,2)),Number(current.time.slice(3)))} mode="time" display="spinner" locale="ko-KR" onChange={(_,date)=>{if(date)change({time:`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`});}}/>}
    <Text style={s.muted}>시간대: {current.timezone==='Asia/Seoul'?'한국 시간':current.timezone}</Text>
    <Button title={advanced?'시간대 설정 접기':'시간대 변경'} quiet disabled={busy} onPress={()=>setAdvanced(v=>!v)}/>
    {advanced&&<TextInput accessibilityLabel="예약 시간대" value={current.timezone} editable={!busy} autoCapitalize="none" onChangeText={timezone=>change({timezone})} style={s.editorInput}/>}
    <Text style={s.label}>{kind==='briefing'?'함께 받을 날씨':'도시 선택'}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(kind==='briefing'?[['','날씨 제외'],...cities]:cities).map(([id,name])=><Button key={id} title={(current.city===(id||null)?'✓ ':'')+name} accessibilityLabel={name+' 날씨 선택'} quiet disabled={busy} onPress={()=>change({city:id||null})}/>)}</View>
    {kind==='briefing'&&<><Text style={s.sectionTitle}>브리핑에 쓸 자료</Text><Text style={s.muted}>내 미완료 Todo는 기본으로 사용해요. 연결하고 선택한 서비스의 최근 일부 자료만 읽어요.</Text>
    <View style={{gap:8}}>{[['google','Google'],['notion','Notion'],['slack','Slack'],['naver','네이버 메일']].map(([id,name])=><Pressable key={id} accessibilityRole="checkbox" accessibilityLabel={name+' 예약 자료 사용'} accessibilityState={{checked:current.providers.includes(id)}} disabled={busy} onPress={()=>change({providers:current.providers.includes(id)?current.providers.filter(p=>p!==id):[...current.providers,id],aiConsent:false})} style={{minHeight:44,justifyContent:'center'}}><Text style={s.subtitle}>{current.providers.includes(id)?'☑':'□'} {name}</Text></Pressable>)}</View>
    <Pressable accessibilityRole="checkbox" accessibilityLabel="예약한 자료를 매일 AI에 보내 분석하기 동의" accessibilityState={{checked:current.aiConsent}} disabled={busy} onPress={()=>change({aiConsent:!current.aiConsent})} style={{minHeight:44,justifyContent:'center'}}><Text style={s.subtitle}>{current.aiConsent?'☑':'□'} 선택한 자료와 내 Todo를 매일 AI에 보내기</Text></Pressable><Text style={s.muted}>켜둔 동안 하루 한 번 AI를 사용해요. 기존 API 사용 한도에 포함돼요. 언제든 예약을 끌 수 있어요.</Text></>}
    {!!current.nextAt&&<Text style={s.muted}>다음 예약: {new Intl.DateTimeFormat('ko-KR',{timeZone:current.timezone,month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(current.nextAt)}</Text>}
    <Text style={s.muted}>서버와 예약 실행 상황에 따라 몇 분 늦어질 수 있어요. 기기 알림은 아이폰 알림 권한과 연결 상태가 필요해요.</Text>
   </>}
   <Text style={s.sectionTitle}>도착 알림</Text><Text style={s.muted}>아이폰에서도 알림을 받으려면 이 기기를 연결하세요. 잠금 화면에는 메시지 본문을 표시하지 않아요.</Text>
   <Button title="이 아이폰에 도착 알림 연결" quiet disabled={busy} onPress={()=>{setBusy(true);setError('');void connectPush(store).then(()=>{if(alive.current)setMessage('이 아이폰에 도착 알림을 연결했어요. 실제 수신은 기기와 서버 연결 상태에 따라 달라요.');}).catch(e=>{if(alive.current)setError(e instanceof Error?e.message:'알림을 연결하지 못했어요.');}).finally(()=>{if(alive.current)setBusy(false);});}}/>
   {Platform.OS==='ios'&&<Button title="이 아이폰의 도착 알림 끄기" quiet disabled={busy} onPress={()=>{setBusy(true);void disconnectPush(store).then(()=>{if(alive.current)setMessage('이 아이폰의 도착 알림을 껐어요. 채팅 메시지는 계속 저장돼요.');}).catch(()=>{if(alive.current)setError('알림 연결을 해제하지 못했어요.');}).finally(()=>{if(alive.current)setBusy(false);});}}/>}
   {!!message&&<Text accessibilityLiveRegion="polite" style={s.subtitle}>{message}</Text>}{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </ScrollView><View style={{paddingTop:16}}><Button title="예약 저장" loading={busy} disabled={busy||!current||(current.kind==='briefing'&&current.enabled&&!current.aiConsent)} onPress={()=>{void save();}}/></View>
 </DraggableSheet></View></Modal>;
}

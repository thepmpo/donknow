import {ScrollArea as ScrollView} from '../ScrollArea';
import React,{useRef,useState,useEffect} from 'react';
import {Text,View,Linking} from 'react-native';
import {MotionModal as Modal,DraggableSheet} from '../motion';
import {Button,CloseButton,s,colors} from '../ui';
import {dateKey} from '../domain';
import type {TodoStore} from '../useTodos';
type Source={ref:string;provider:string;title:string;text?:string;dueDate?:string|null;completed?:boolean;kind:string};
type Weather={city:string;temperature:number;high:number;low:number;rain:number;observedAt:string;sourceUrl:string};
export function TodaySheet({store,onClose,onSchedule}:{store:TodoStore;onClose:()=>void;onSchedule?:()=>void}){
 const [sources,setSources]=useState<Source[]>([]),[warnings,setWarnings]=useState<string[]>([]),[providers,setProviders]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[readAt,setReadAt]=useState('');
 const [weather,setWeather]=useState<Weather|null>(null),[weatherError,setWeatherError]=useState(''),[weatherBusy,setWeatherBusy]=useState(false);
 const alive=useRef(true),reading=useRef(false),weatherReading=useRef(false);useEffect(()=>()=>{alive.current=false;},[]);
 const today=dateKey(new Date());
 const local=store.todos.filter(t=>!t.done);
 const due=local.filter(t=>t.dueDate&&t.dueDate<=today),later=local.length-due.length;
 async function read(){if(reading.current)return;reading.current=true;setBusy(true);setError('');setSources([]);setWarnings([]);try{const r=await store.featureRequest('/api/assistant/context','POST',{providers}) as {sources:Source[];warnings:string[];readAt:string};if(alive.current){setSources(r.sources);setWarnings(r.warnings);setReadAt(r.readAt);}}catch(e){if(alive.current)setError(e instanceof Error?e.message:'자료를 읽지 못했어요.');}finally{reading.current=false;if(alive.current)setBusy(false);}}
 async function readWeather(city:string){if(weatherReading.current)return;weatherReading.current=true;setWeatherBusy(true);setWeather(null);setWeatherError('');try{const r=await store.featureRequest('/api/weather?city='+city) as Weather;if(alive.current)setWeather(r);}catch(e){if(alive.current)setWeatherError(e instanceof Error?e.message:'날씨를 불러오지 못했어요.');}finally{weatherReading.current=false;if(alive.current)setWeatherBusy(false);}}
 return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#00000066'}}><DraggableSheet onDismiss={onClose} style={{maxHeight:'92%',backgroundColor:colors.bg,borderTopLeftRadius:28,borderTopRightRadius:28,padding:24}}><ScrollView contentContainerStyle={{gap:14,paddingBottom:24}}>
 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={s.h1}>오늘의 브리핑</Text><CloseButton onPress={onClose}/></View>
 {onSchedule&&<><Button title="브리핑·날씨 예약 설정" quiet onPress={onSchedule}/><Text style={s.muted}>매일 채팅으로 받으려면 예약을 켜주세요. 아래는 지금 직접 조회하는 내용이에요.</Text></>}
 <Text style={s.subtitle}>{today} · 내 Todo {local.length}개 중 오늘까지 {due.length}개</Text>
 {due.map(t=><Text key={t.id} style={s.subtitle}>{t.dueDate!<today?'지난 할 일':'오늘'} · {t.title}</Text>)}
 {!due.length&&<Text style={s.muted}>오늘까지 예정된 미완료 Todo가 없어요.</Text>}<Text style={s.muted}>이후 예정 또는 날짜 없는 할 일 {later}개. 완료 기록은 새 할 일에 포함하지 않아요.</Text>
 {store.user&&<><Text style={s.sectionTitle}>연결 자료 함께 보기</Text><Text style={s.muted}>선택한 서비스의 최근 일부를 읽어 보여줘요. AI 전송이나 원본 변경은 없어요.</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[['google','Google'],['notion','Notion'],['slack','Slack'],['naver','네이버 메일']].map(([id,name])=><Button key={id} title={(providers.includes(id)?'✓ ':'')+name} quiet disabled={busy} onPress={()=>{setProviders(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);setSources([]);setWarnings([]);setReadAt('');}}/>)}</View><Button title="선택한 자료로 브리핑 새로고침" loading={busy} disabled={busy} onPress={()=>{void read();}}/>
 {!!readAt&&<Text style={s.muted}>조회 {new Date(readAt).toLocaleTimeString('ko-KR')} · 최근 일부 자료</Text>}
 {['google','notion','slack','naver'].map(provider=>{const items=sources.filter(x=>x.provider===provider&&!x.completed);return items.length?<View key={provider} style={s.card}><Text style={s.sectionTitle}>{({google:'Google · 일정/할 일/메일/파일',notion:'Notion',slack:'Slack',naver:'네이버 메일'})[provider]}</Text>{items.map(item=><View key={item.ref}><Text style={s.subtitle}>{item.title}{item.dueDate?' · '+item.dueDate:''}</Text>{!!item.text&&<Text numberOfLines={3} style={s.muted}>{item.text}</Text>}</View>)}</View>:null;})}
 {warnings.map((w,i)=><Text key={i} style={s.muted}>{w}</Text>)}{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
 <Text style={s.sectionTitle}>날씨</Text><Text style={s.muted}>도시를 누르면 해당 도시 좌표로 날씨를 조회해요. 기기 위치는 사용하지 않아요.</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[['seoul','서울'],['busan','부산'],['incheon','인천'],['daegu','대구'],['daejeon','대전'],['gwangju','광주'],['jeju','제주']].map(([id,name])=><Button key={id} title={name} quiet disabled={weatherBusy} onPress={()=>{void readWeather(id);}}/>)}</View>
 {weatherBusy&&<Text style={s.muted}>날씨 확인 중…</Text>}{weather&&<View style={s.card}><Text style={s.subtitle}>{weather.city} {weather.temperature}°C · 최저 {weather.low}° / 최고 {weather.high}° · 강수 확률 {weather.rain}%</Text><Text style={s.muted}>{weather.observedAt.replace('T',' ')} 한국 시간 · 최대 10분 캐시</Text><Button title="날씨 출처 Open-Meteo" quiet onPress={()=>{void Linking.openURL('https://open-meteo.com/');}}/></View>}{!!weatherError&&<Text accessibilityRole="alert" style={s.error}>{weatherError}</Text>}</>}
 {!store.user&&<Text style={s.muted}>클라우드 로그인 후 연결 자료와 도시별 날씨를 함께 확인할 수 있어요.</Text>}
 </ScrollView></DraggableSheet></View></Modal>;
}

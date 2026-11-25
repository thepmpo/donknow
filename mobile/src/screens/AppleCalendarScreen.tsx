import React,{useEffect,useRef,useState} from 'react';
import {Linking,Text,View} from 'react-native';
import {MePage,MeRow,MeSection} from '../MeSettings';
import {DateTimeField} from '../DateTimeField';
import {dateKey} from '../domain';
import {shiftDay} from '../calendar-model';
import {appleCalendarDocument,utf8Base64} from '../apple-calendar-export';
import {publishAssistantEntry} from '../assistant-entry';
import {Button} from '../ui';
import {colors,typography} from '../theme';
import {appleCalendarDevice} from '../apple-calendar-device';
import {appleCalendarSource,isAppleCalendar} from '../apple-calendar-model';
import type {AppleCalendarDevice,DeviceCalendar} from '../apple-calendar-model';
import {useCalendarSelection} from '../useCalendarSelection';
import {refreshAppleCalendar} from '../useAppleCalendarData';
import type {TodoStore} from '../useTodos';
export function AppleCalendarScreen({store,onClose,naver=false,device=appleCalendarDevice}:{store:TodoStore;onClose:()=>void;naver?:boolean;device?:AppleCalendarDevice}){
 const [start,setStart]=useState(dateKey(new Date())),[end,setEnd]=useState(shiftDay(dateKey(new Date()),90));
 const [calendars,setCalendars]=useState<DeviceCalendar[]>([]),[granted,setGranted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),active=useRef(true),selection=useCalendarSelection(store),owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo';
 useEffect(()=>{active.current=true;void read(false);return()=>{active.current=false;};},[owner]);
 async function read(ask:boolean){if(!device.available||busy)return;setBusy(true);setError('');try{const allowed=ask?await device.authorize():await device.granted();if(!active.current)return;setGranted(allowed);if(!allowed){setCalendars([]);if(ask)setError('아이폰 설정에서 캘린더 전체 접근을 허용해주세요.');return;}const rows=await device.calendars();if(!active.current)return;setCalendars(rows);if(ask){const existing=selection.ids.filter(id=>!isAppleCalendar(id)),ids=rows.map(c=>appleCalendarSource(c).id);selection.setIds([...new Set([...existing,...ids])].slice(0,10));refreshAppleCalendar(owner);}}catch(e){if(active.current)setError(e instanceof Error?e.message:'캘린더를 확인하지 못했어요.');}finally{if(active.current)setBusy(false);}}
 async function sendToAI(){if(busy||!store.user)return;setBusy(true);setError('');try{const chosen=calendars.filter(c=>selection.ids.includes(appleCalendarSource(c).id));if(!chosen.length)throw Error('읽을 캘린더를 선택해주세요.');const events=await device.events(chosen.map(c=>c.id),start,end),text=appleCalendarDocument(chosen,events,start,end);if(!active.current)return;if(!publishAssistantEntry({message:'첨부한 아이폰 캘린더의 실제 일정과 메모를 읽고 정리해줘.',autoSend:false,files:[{name:'아이폰-캘린더-'+start+'-'+end+'.json',mime:'application/json',data:utf8Base64(text)}]}))throw Error('채팅 화면을 다시 열고 시도해주세요.');}catch(e){if(active.current)setError(e instanceof Error?e.message:'자료를 전달하지 못했어요.');}finally{if(active.current)setBusy(false);}}
 return <MePage title={naver?'네이버 캘린더':'아이폰 캘린더'} onClose={onClose} disabled={busy}>
 {!device.available?<Text style={{...typography.detail,color:colors.muted}}>아이폰 앱에서 연결할 수 있어요.</Text>:<View style={{gap:16}}>
 {naver&&<><Text style={{...typography.detail,color:colors.secondary}}>아이폰에 등록한 네이버 CalDAV 캘린더를 연결해요.</Text><Button title="네이버 공식 설정 안내" quiet onPress={()=>void Linking.openURL('https://help.naver.com/service/5620/contents/2426?lang=ko')}/></>}
 <MeSection compact><MeRow title="캘린더 접근" status={granted?'연결됨':'연결 필요'} icon="calendar-outline" onPress={()=>void read(true)}/></MeSection>
 {granted&&<MeSection title="표시할 캘린더" compact>{calendars.map(c=>{const id=appleCalendarSource(c).id,selected=selection.ids.includes(id);return <MeRow key={id} title={c.title} detail={c.account} status={selected?'선택됨':undefined} icon={selected?'checkmark-circle':'ellipse-outline'} label={'아이폰 캘린더 '+c.title+' 표시'} onPress={()=>{selection.setIds(selected?selection.ids.filter(v=>v!==id):[...selection.ids,id].slice(0,10));refreshAppleCalendar(owner);}}/>;})}</MeSection>}
 {granted&&<MeSection title="AI에 전달할 일정" compact><View style={{padding:12,gap:8}}><DateTimeField label="시작 날짜" value={start} onChange={v=>v&&setStart(v)}/><DateTimeField label="종료 날짜" value={end} onChange={v=>v&&setEnd(v)}/><Button title="선택한 일정·메모를 AI 채팅에 전달" disabled={busy||!store.user} onPress={()=>void sendToAI()}/></View></MeSection>}
 <Button title={granted?'다시 확인':'아이폰 캘린더 연결'} loading={busy} onPress={()=>void read(!granted)}/>
 {!!error&&<Text accessibilityRole="alert" style={{...typography.detail,color:colors.danger}}>{error}</Text>}
 </View>}
 </MePage>;
}

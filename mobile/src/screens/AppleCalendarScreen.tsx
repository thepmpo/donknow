import React,{useEffect,useRef,useState} from 'react';
import {Linking,Platform,Text,View} from 'react-native';
import {MePage,MeRow,MeSection} from '../MeSettings';
import {DateTimeField} from '../DateTimeField';
import {dateKey} from '../domain';
import {groupCalendarSources,shiftDay} from '../calendar-model';
import {appleCalendarDocument,utf8Base64} from '../apple-calendar-export';
import {publishAssistantEntry} from '../assistant-entry';
import {Button} from '../ui';
import {colors,typography} from '../theme';
import {appleCalendarDevice} from '../apple-calendar-device';
import {appleCalendarSource} from '../apple-calendar-model';
import type {AppleCalendarDevice,DeviceCalendar} from '../apple-calendar-model';
import {useCalendarSelection} from '../useCalendarSelection';
import {refreshAppleCalendar} from '../useAppleCalendarData';
import type {TodoStore} from '../useTodos';
type CalendarCheck={kind:'checking'}|{kind:'result';count:number}|{kind:'permission';settingsFailed?:boolean}|{kind:'failed'};

export function AppleCalendarScreen({store,onClose,naver=false,device=appleCalendarDevice}:{store:TodoStore;onClose:()=>void;naver?:boolean;device?:AppleCalendarDevice}){
 const [start,setStart]=useState(dateKey(new Date())),[end,setEnd]=useState(shiftDay(dateKey(new Date()),90));
 const [calendars,setCalendars]=useState<DeviceCalendar[]>([]),[granted,setGranted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),active=useRef(true),selection=useCalendarSelection(store),owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo';
 const [check,setCheck]=useState<CalendarCheck|null>(null);
 const checking=check?.kind==='checking',checkRequest=useRef<{manual:boolean}|null>(null);
 useEffect(()=>{
  active.current=true;
  setCheck(null);
  void read(false,false);
  return()=>{active.current=false;checkRequest.current=null;};
 },[owner,device]);
 useEffect(()=>{if(granted&&selection.ready)selection.reconcileApple(calendars.map(c=>appleCalendarSource(c).id));},[granted,calendars,selection.ready]);
 async function read(ask:boolean,manual=true){
  if(!device.available||busy||(manual&&checkRequest.current?.manual))return;
  const request={manual};
  checkRequest.current=request;
  if(manual)setCheck({kind:'checking'});
  try{
   const allowed=await device.granted()||(ask&&await device.authorize());
   if(checkRequest.current!==request)return;
   setGranted(allowed);
   if(!allowed){
    setCalendars([]);
    if(manual){
     setCheck({kind:'permission'});
     refreshAppleCalendar(owner);
    }
    return;
   }
   const rows=await device.calendars();
   if(checkRequest.current!==request)return;
   setCalendars(rows);
   if(manual){
    setCheck({kind:'result',count:rows.length});
    refreshAppleCalendar(owner);
   }
  }catch{
   if(checkRequest.current===request&&manual)setCheck({kind:'failed'});
  }finally{
   if(checkRequest.current===request)checkRequest.current=null;
  }
 }
 const checkMessage=check?.kind==='result'
  ? check.count ? `캘린더 목록 ${check.count}개를 확인했어요.` : '접근할 수 있는 캘린더가 없어요.'
  : check?.kind==='permission' ? (check.settingsFailed?'설정을 열지 못했어요. 아이폰 설정에서 도슨의 캘린더 접근을 확인해주세요.':'아이폰 설정에서 캘린더 전체 접근을 허용해주세요.')
  : check?.kind==='failed' ? '캘린더 목록을 불러오지 못했어요. 다시 시도해주세요.' : null;
 const checkFailed=check?.kind==='permission'||check?.kind==='failed';
 async function sendToAI(){if(busy||!store.user)return;setBusy(true);setError('');try{const chosen=calendars.filter(c=>selection.ids.includes(appleCalendarSource(c).id));if(!chosen.length)throw Error('읽을 캘린더를 선택해주세요.');const events=await device.events(chosen.map(c=>c.id),start,end),text=appleCalendarDocument(chosen,events,start,end);if(!active.current)return;if(!publishAssistantEntry({message:'첨부한 아이폰 캘린더의 실제 일정과 메모를 읽고 정리해줘.',autoSend:false,files:[{name:'아이폰-캘린더-'+start+'-'+end+'.json',mime:'application/json',data:utf8Base64(text)}]}))throw Error('채팅 화면을 다시 열고 시도해주세요.');}catch(e){if(active.current)setError(e instanceof Error?e.message:'자료를 전달하지 못했어요.');}finally{if(active.current)setBusy(false);}}
 return <MePage title={naver?'네이버 캘린더':'아이폰 캘린더'} onClose={onClose} disabled={busy}>
 {!device.available?<Text style={{...typography.detail,color:colors.muted}}>아이폰 앱에서 연결할 수 있어요.</Text>:<View style={{gap:16}}>
 {naver&&<><Text style={{...typography.detail,color:colors.secondary}}>아이폰에 등록한 네이버 CalDAV 캘린더를 연결해요.</Text><Button title="네이버 공식 설정 안내" quiet onPress={()=>void Linking.openURL('https://help.naver.com/service/5620/contents/2426?lang=ko')}/></>}
 <MeSection compact><MeRow title="캘린더 접근" status={checking?'확인 중':checkFailed?'상태 확인 필요':granted?'연결됨':'연결 필요'} icon="calendar-outline" onPress={()=>void read(true)}/></MeSection>
 {granted&&groupCalendarSources(calendars.map(appleCalendarSource)).map(group=><MeSection key={group.id} title={group.label} compact>{group.items.map(c=>{const selected=selection.ids.includes(c.id);return <MeRow key={c.id} title={c.name} status={selected?'선택됨':undefined} icon={selected?'checkmark-circle':'ellipse-outline'} label={'아이폰 캘린더 '+c.name+' 표시'} onPress={()=>{selection.setIds(selected?selection.ids.filter(v=>v!==c.id):[...selection.ids,c.id]);refreshAppleCalendar(owner);}}/>;})}</MeSection>)}
 {granted&&<MeSection title="AI에 전달할 일정" compact><View style={{padding:12,gap:8}}><DateTimeField label="시작 날짜" value={start} onChange={v=>v&&setStart(v)}/><DateTimeField label="종료 날짜" value={end} onChange={v=>v&&setEnd(v)}/><Button title="선택한 일정·메모를 AI 채팅에 전달" disabled={busy||checking||!store.user} onPress={()=>void sendToAI()}/></View></MeSection>}
 <View style={{gap:8}}>
  {!!checkMessage&&<Text accessibilityRole={checkFailed?'alert':undefined} accessibilityLiveRegion="polite" style={{...typography.detail,color:checkFailed?colors.danger:colors.secondary}}>{checkMessage}</Text>}
  {check?.kind==='permission'&&Platform.OS==='ios'&&<Button title="아이폰 설정 열기" quiet onPress={()=>{void Linking.openSettings().catch(()=>setCheck({kind:'permission',settingsFailed:true}));}}/>}
  <Button title={checking?'확인 중…':granted?'다시 확인':'아이폰 캘린더 연결'} loading={checking} disabled={busy} onPress={()=>void read(!granted)}/>
 </View>
 {!!error&&<Text accessibilityRole="alert" style={{...typography.detail,color:colors.danger}}>{error}</Text>}
 </View>}
 </MePage>;
}

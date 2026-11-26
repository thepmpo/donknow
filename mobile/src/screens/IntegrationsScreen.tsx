import {Ionicons} from '@expo/vector-icons';
import {MeCopy,MePage,MeRow,MeSection,MeServiceIntro} from '../MeSettings';
import {integrationState,permissionSummary,readIntegrationStatuses} from '../integration-settings';
import type {GoogleAccount,IntegrationStatus} from '../integration-settings';
import { MotionPressable as Pressable } from '../motion';
import { TaskSyncPanel } from './TaskSyncPanel';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Button, colors, s } from '../ui';
import type { TodoStore } from '../useTodos';
import {calendarConnectionChanged} from '../calendar-snapshot-cache';
export type Provider = 'google' | 'slack' | 'notion';
type Status=IntegrationStatus;
type Item = { id: string; title: string; dueDate?: string | null; kind: string; completed?: boolean; completedAt?: string | null };
const names: Record<string, string> = { gmailModify:'메일 읽음·상태 수정',gmailSend:'메일 발송',calendarWrite:'일정 작성·수정',driveContent:'Drive 파일 내용 읽기',driveWrite:'docen이 만들거나 허용한 Drive 파일 수정',assistantContact:'Slack에서 docen과 대화',messagesWrite:'Slack 메시지 보내기·docen 메시지 수정',pagesWrite:'Notion 페이지 작성·수정', google: 'Google', slack: 'Slack', notion: 'Notion', calendar: '기본 캘린더', gmail: '메일', drive: '드라이브', tasks: 'Google Tasks', channels: '채널', messages: '메시지', pages: '페이지' };
export function IntegrationsScreen({ store, initialProvider, initialConnectionId, initialPage, onClose }: { store: TodoStore; initialProvider: Provider; initialConnectionId?:string; initialPage?:'overview'|'permissions'; onClose: () => void }) {
  const [accountId,setAccountId]=useState<string|null>(initialConnectionId??null),[addingAccount,setAddingAccount]=useState(false);
  const [page,setPage]=useState<'overview'|'accounts'|'permissions'|'resources'|'sync'|'help'>(initialPage??'overview');
  const [writeOptionsOpen,setWriteOptionsOpen]=useState(false),[statusStale,setStatusStale]=useState(false),[statusError,setStatusError]=useState(''),[readAttempted,setReadAttempted]=useState(false);
  const [statuses,setStatuses]=useState<Status[]>([]),provider=initialProvider,[feature,setFeature]=useState(initialProvider==='google'?'calendar':initialProvider==='slack'?'channels':'pages');
  const [features, setFeatures] = useState<string[]>(initialProvider==='google'?['calendar','calendarWrite','gmail','drive','driveContent','tasks','tasksWrite']:initialProvider==='slack'?['channels','messages']:['pages']), [items, setItems] = useState<Item[]>([]), [selected, setSelected] = useState<string[]>([]), [channel, setChannel] = useState<string | null>(null), [next, setNext] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [disconnecting, setDisconnecting] = useState(false);
  const [taskStatus, setTaskStatus] = useState<'incomplete' | 'completed'>('incomplete');
  const initialScopesLoaded=useRef(false);
  const googleCalendarStatus=useRef<string|null>(null);
  const [statusRevision,setStatusRevision]=useState(0),[providerReadError,setProviderReadError]=useState('');
  const stopWebAuthorization=useRef<(()=>void)|null>(null);
  const active = useRef(true), version = useRef(0), statusRead = useRef(0);
  const rootStatus=statuses.find(item=>item.provider===provider),account=rootStatus?.accounts?.find(a=>a.connectionId===accountId)??rootStatus?.accounts?.[0];const current=rootStatus&&account?{...rootStatus,label:account.label,features:account.features}:rootStatus;const connectionId=provider==='google'?account?.connectionId:undefined;
  function chooseAccount(value:GoogleAccount){version.current++;setProviderReadError('');setAccountId(value.connectionId);setFeatures(value.features);setItems([]);setSelected([]);setChannel(null);setNext(null);setDisconnecting(false);setReadAttempted(false);setError('');setMessage('');setAddingAccount(false);setPage('overview');}
  useEffect(()=>{if(account&&!addingAccount)setFeatures(account.features);},[connectionId,addingAccount]);
  async function loadStatus() { if (!store.user) return; const run=++statusRead.current; try { const result=readIntegrationStatuses(await store.featureRequest('/api/integrations')); if (active.current&&run===statusRead.current) {const google=result.find(item=>item.provider==='google'),signature=JSON.stringify([google?.connected,google?.features,google?.accounts?.map(a=>[a.connectionId,a.features])]);if(googleCalendarStatus.current!==null&&googleCalendarStatus.current!==signature&&store.connection?.mode==='cloud')calendarConnectionChanged(store.connection.baseUrl+':'+store.user?.id);googleCalendarStatus.current=signature;setStatuses(result);setStatusStale(false);setStatusError('');setStatusRevision(value=>value+1);const selected=result.find(item=>item.provider===provider);if(!initialScopesLoaded.current){initialScopesLoaded.current=true;if(selected?.connected&&selected.features.length)setFeatures(selected.features);}} } catch (e) { if(active.current&&run===statusRead.current){setStatusStale(true);setStatusError(e instanceof Error?e.message:'연결 상태를 확인하지 못했어요.');} } }
  useEffect(() => { active.current = true; void loadStatus(); const listener = AppState.addEventListener('change', state => { if (state === 'active') void loadStatus(); }); return () => { active.current = false;stopWebAuthorization.current?.();stopWebAuthorization.current=null; version.current++;statusRead.current++; listener.remove(); }; }, []);

  async function authorize(requestedFeatures = features,mode=addingAccount||!current?.connected?'add':'reauthorize') {
    if(provider==='slack')requestedFeatures=['channels','messages',...(features.includes('messagesWrite')?['messagesWrite']:[]),...(features.includes('assistantContact')?['assistantContact']:[])];
    if(provider==='notion')requestedFeatures=['pages',...(features.includes('pagesWrite')?['pagesWrite']:[])];
    statusRead.current++;setBusy(true); setError(''); setMessage(''); let popup: Window | null = null;
    if (Platform.OS === 'web') { popup = window.open('about:blank', '_blank'); if (popup) popup.opener = null; }
    try {
      const value = await store.featureRequest(`/api/integrations/${provider}/authorize`, 'POST', { features: requestedFeatures,...(provider==='google'?{mode,...(mode==='reauthorize'&&connectionId?{connectionId}: {})}: {}) }) as { url: string };
      const url = new URL(value.url); if (url.protocol !== 'https:' || !['accounts.google.com', 'slack.com', 'api.notion.com'].includes(url.hostname)) throw new Error('연결 주소를 확인하지 못했어요.');
      if (Platform.OS === 'web') { if (!popup) throw new Error('브라우저에서 팝업을 허용한 뒤 다시 눌러주세요.'); popup.location.href = value.url;stopWebAuthorization.current?.();
        const authWindow=popup;let stopped=false,observedClosed=false;
        const stop=()=>{if(stopped)return;stopped=true;clearInterval(timer);clearTimeout(expiry);window.removeEventListener('focus',returned);document.removeEventListener('visibilitychange',visible);};
        const returned=()=>{if(!active.current||stopped)return;void loadStatus();if(provider==='google'&&store.connection?.mode==='cloud'&&store.user)calendarConnectionChanged(store.connection.baseUrl+':'+store.user.id);};
        const visible=()=>{if(document.visibilityState==='visible')returned();};
        const timer=setInterval(()=>{if(authWindow.closed&&!observedClosed){observedClosed=true;returned();}},500),expiry=setTimeout(stop,10*60*1000);
        window.addEventListener('focus',returned);document.addEventListener('visibilitychange',visible);stopWebAuthorization.current=stop;
        setMessage('승인 후 돌아오면 연결 상태를 다시 확인해요. 반영이 늦으면 연결 상태 새로고침을 눌러주세요.'); }
      else { const result = await WebBrowser.openAuthSessionAsync(value.url, 'duckduck://integrations/complete'); if (result.type !== 'success') setMessage('연결 창을 닫았어요. 다시 연결할 수 있어요.');else if(provider==='google'&&store.connection?.mode==='cloud'&&store.user)calendarConnectionChanged(store.connection.baseUrl+':'+store.user.id); }
      setAddingAccount(false);await loadStatus();
    } catch (e) { popup?.close(); setError(e instanceof Error ? e.message : '연결을 시작하지 못했어요.'); }
    finally { if (active.current) setBusy(false); }
  }
  async function loadResources(selectedFeature = feature, selectedChannel = channel, more = false, status = taskStatus) {
    const run = ++version.current; setBusy(true); setError('');
    try {
      const query = new URLSearchParams({ feature: selectedFeature, status,...(connectionId?{connectionId}:{}), ...(selectedChannel ? { channel: selectedChannel } : {}), ...(more && next ? { cursor: next } : {}) });
      const value = await store.featureRequest(`/api/integrations/${provider}/resources?${query}`) as { items: Item[]; nextCursor: string | null };
      if (!active.current || run !== version.current) return;
      if(!Array.isArray(value.items)||value.items.some(item=>!item||typeof item.id!=='string'||typeof item.title!=='string'||typeof item.kind!=='string'))throw Error('자료를 확인하지 못했어요. 다시 조회해주세요.');setProviderReadError('');setReadAttempted(true);setTaskStatus(status); setFeature(selectedFeature); setChannel(selectedChannel); setNext(value.nextCursor ?? null);
      setItems(previous => more ? [...new Map([...previous, ...value.items].map(item => [item.id, item])).values()] : value.items); if (!more) setSelected([]);
    } catch (e) { if (active.current&&run === version.current){const message=e instanceof Error?e.message:'자료를 가져오지 못했어요.';setError(message);setProviderReadError(message);} }
    finally { if (active.current && run === version.current) setBusy(false); }
  }
  function select(item: Item) { if (item.completed) return; if (item.kind === 'tasklist') { void loadResources('tasks', item.id); return; } if (item.kind === 'channel') { void loadResources('messages', item.id); return; } setSelected(previous => previous.includes(item.id) ? previous.filter(id => id !== item.id) : previous.length >= 20 ? previous : [...previous, item.id]); }
  async function importSelected() {
    setBusy(true); setError('');
    try { const value = await store.featureRequest(`/api/integrations/${provider}/import`, 'POST', { ids: selected }) as { results: { created: boolean }[] }; await store.refresh(); const added = value.results.filter(result => result.created).length; setMessage(`${added}개를 Todo에 추가했어요.${value.results.length > added ? ' 이미 가져온 자료는 중복 추가하지 않았어요.' : ''}`); setSelected([]); }
    catch (e) { setError(e instanceof Error ? e.message : '추가하지 못했어요.'); } finally { setBusy(false); }
  }
  async function disconnect() {
    setBusy(true); setError('');
    try { const result = await store.featureRequest(`/api/integrations/${provider}`+(connectionId?'?connectionId='+encodeURIComponent(connectionId):''), 'DELETE') as { revoked: boolean }; setItems([]);setPage('overview');setSelected([]);setNext(null);setDisconnecting(false);await loadStatus(); setMessage(result.revoked ? '연결을 해제했어요. 가져온 할 일은 유지돼요.' : '앱 연결을 해제했어요. 서비스 설정에서도 접근 권한 해제를 확인해주세요.'); }
    catch (e) { setError(e instanceof Error ? e.message : '연결을 해제하지 못했어요.'); } finally { setBusy(false); }
  }
  async function diagnose(){const run=++version.current;setBusy(true);setError('');try{await store.featureRequest(`/api/integrations/${provider}/diagnose`,'POST',{connectionId});if(active.current&&run===version.current){setProviderReadError('');setMessage('연결된 계정의 읽기 접근을 확인했어요.');}}catch(e){if(active.current&&run===version.current){const message=e instanceof Error?e.message:'연결을 점검하지 못했어요.';setError(message);setProviderReadError(message);}}finally{if(active.current&&run===version.current)setBusy(false);}}
  const permissionControls=<>
    <Text style={s.subtitle}>사용할 자료를 선택하세요. 원본 변경 권한은 필요할 때만 추가해요.</Text>
    {provider==='google'&&['calendar','gmail','drive','tasks'].map(value=><Pressable key={value} accessibilityRole="checkbox" accessibilityState={{checked:features.includes(value)}} accessibilityLabel={`${names[value]} 읽기 권한`} disabled={busy} onPress={()=>setFeatures(previous=>previous.includes(value)?previous.filter(item=>item!==value&&!(value==='tasks'&&item==='tasksWrite')):[...previous,value])} style={styles.scope}><Ionicons name={features.includes(value)?'checkbox':'square-outline'} size={23} color={features.includes(value)?colors.blueText:colors.muted}/><Text style={[s.subtitle,{flex:1}]}>{names[value]} 읽기</Text></Pressable>)}
    {provider==='google'&&<><Pressable accessibilityRole="checkbox" accessibilityLabel="Google Tasks 완료 상태 수정 권한" accessibilityState={{checked:features.includes('tasksWrite')}} disabled={busy} onPress={()=>setFeatures(previous=>previous.includes('tasksWrite')?previous.filter(value=>value!=='tasksWrite'):[...new Set([...previous,'tasks','tasksWrite'])])} style={styles.scope}><Ionicons name={features.includes('tasksWrite')?'checkbox':'square-outline'} size={23} color={features.includes('tasksWrite')?colors.blueText:colors.muted}/><Text style={[s.subtitle,{flex:1}]}>Google Tasks 수정 권한 (선택)</Text></Pressable>{features.includes('tasksWrite')&&<Text style={s.muted}>Google의 수정 권한은 할 일 생성·수정·삭제를 포함해요. 완료 동기화는 따로 켜야 하고, 비서의 원본 변경은 초안을 확인한 뒤 실행해요.</Text>}</>}
    <Button title={writeOptionsOpen?'추가 권한 접기':`추가 읽기·쓰기 권한${features.some(v=>['gmailModify','gmailSend','calendarWrite','driveContent','driveWrite','messagesWrite','pagesWrite'].includes(v))?' · 선택됨':' (선택)'}`} accessibilityLabel="추가 권한 선택" expanded={writeOptionsOpen} quiet disabled={busy} onPress={()=>setWriteOptionsOpen(v=>!v)}/>
    {writeOptionsOpen&&<View style={{gap:8}}>{(provider==='google'?['gmailModify','gmailSend','calendarWrite','driveContent','driveWrite']:provider==='slack'?['assistantContact','messagesWrite']:['pagesWrite']).map(value=><Pressable key={value} accessibilityRole="checkbox" accessibilityLabel={names[value]+' 권한'} accessibilityState={{checked:features.includes(value)}} disabled={busy} onPress={()=>setFeatures(old=>old.includes(value)?old.filter(x=>x!==value):[...old,value])} style={styles.scope}><Ionicons name={features.includes(value)?'checkbox':'square-outline'} size={23} color={features.includes(value)?colors.blueText:colors.muted}/><Text style={[s.subtitle,{flex:1}]}>{names[value]}</Text></Pressable>)}<Text style={s.muted}>선택 후 연결 버튼을 눌러 승인해주세요. Notion은 연결 관리에서 콘텐츠 추가·수정도 허용해야 해요.</Text></View>}
    {!store.user?.emailVerified&&<Text style={s.muted}>ME의 내 계정에서 이메일 인증을 먼저 완료해주세요.</Text>}
    <Button title={addingAccount?'Google 계정 추가':current?.connected?'연결 권한 다시 선택':`${names[provider]} 연결`} disabled={busy||!current?.configured||!store.user?.emailVerified||(provider==='google'&&!features.length)} onPress={()=>{void authorize();}}/>
  </>;
  const back=()=>{if(page==='overview')onClose();else{setDisconnecting(false);setPage('overview');if(addingAccount){setAddingAccount(false);setFeatures(current?.features??['calendar']);}}};
  const titles={overview:names[provider],accounts:'연결 계정',permissions:addingAccount?'Google 계정 추가':'연결 권한',resources:'자료 가져오기',sync:'완료 동기화',help:'연결 문제 해결'};
  const descriptions={google:'캘린더와 할 일, 메일과 파일을 연결해 필요한 자료를 찾아보세요.',slack:'승인한 채널의 대화를 확인하고 필요한 내용을 할 일로 정리해요.',notion:'공유한 페이지를 찾아보고 필요한 내용을 정리해요.'};
  return <MePage key={page} title={titles[page]} onClose={back} disabled={busy}>
    {page==='overview'&&<MeServiceIntro title={names[provider]} icon={provider==='google'?'logo-google':provider==='slack'?'logo-slack':'document-text-outline'} description={descriptions[provider]}/>}
    {!store.user?<MeCopy title="로그인이 필요해요">클라우드 계정으로 로그인하면 외부 서비스를 연결할 수 있어요.</MeCopy>:<>
      {page==='overview'&&<>
       <MeSection compact><MeCopy title={integrationState(current,statusStale||!!providerReadError)}>{current?.connected?(current.label||'승인한 계정이 연결되어 있어요.'):!current?'연결 상태를 확인하고 있어요.':current.configured?'사용할 자료와 권한을 먼저 확인한 뒤 연결해요.':'아직 연결이 준비되지 않았어요. 준비되면 여기에서 연결할 수 있어요.'}</MeCopy></MeSection>
       {current?.connected?<MeSection compact>
        {provider==='google'&&<MeRow title="연결 계정" status={rootStatus?.accounts?.length?rootStatus.accounts.length+'개':'1개'} icon="person-circle-outline" onPress={()=>setPage('accounts')}/>}
        <MeRow title="자료 가져오기" icon="download-outline" onPress={()=>setPage('resources')}/>
        <MeRow title="연결 권한 관리" icon="key-outline" onPress={()=>setPage('permissions')}/>
        {provider==='google'&&<MeRow title="완료 동기화" icon="sync-outline" onPress={()=>setPage('sync')}/>}
        <MeRow title="연결 문제 해결" icon="help-circle-outline" onPress={()=>setPage('help')}/>
       </MeSection>:<><MeSection compact><MeCopy title="사용할 수 있는 기능">{provider==='google'?'일정·할 일 조회와 선택 가져오기, 허용한 파일 내용 확인을 지원해요.':provider==='slack'?'승인한 채널의 메시지 조회와 선택 가져오기를 지원해요.':'연결에 공유한 페이지 조회와 선택 가져오기를 지원해요.'}</MeCopy><MeCopy title="변경은 확인한 뒤에">읽기와 쓰기 권한은 구분해요. 원본을 바꾸거나 메시지를 보내기 전에는 실행 내용을 확인해요.</MeCopy></MeSection><View style={{marginTop:16,gap:8}}><Button title="연결할 자료 선택" disabled={!current?.configured} onPress={()=>setPage('permissions')}/><Button title="연결 상태 새로고침" quiet disabled={busy} onPress={()=>void loadStatus()}/></View></>}
      </>}
      {page==='accounts'&&<><MeSection compact>{!rootStatus?.accounts?.length&&<MeCopy title={current?.label||'연결한 계정'}>{permissionSummary(current?.features)}</MeCopy>}{rootStatus?.accounts?.map(value=><MeRow key={value.connectionId} title={value.label} status={value.connectionId===connectionId?'선택됨':undefined} icon={value.connectionId===connectionId?'checkmark-circle-outline':'person-circle-outline'} label={'Google 계정 '+value.label+' 선택'} disabled={busy} onPress={()=>chooseAccount(value)}/>)}<MeRow title="Google 계정 추가" icon="add-circle-outline" disabled={busy||(rootStatus?.accounts?.length??0)>=10} onPress={()=>{setFeatures(['calendar','calendarWrite','gmail','drive','driveContent','tasks','tasksWrite']);setAddingAccount(true);setPage('permissions');}}/></MeSection><MeCopy title="계정별로 관리해요">자료 가져오기와 연결 권한은 선택한 계정을 기준으로 표시해요. 다른 계정의 연결은 유지해요.</MeCopy></>}
      {page==='permissions'&&<><MeSection compact><MeCopy title={addingAccount?'추가할 계정':current?.label||names[provider]}>{current?.connected&&!addingAccount?permissionSummary(current.features):'승인한 자료만 사용하며, 연결은 언제든 해제할 수 있어요.'}</MeCopy></MeSection><View style={{gap:12,marginTop:16}}>{permissionControls}</View>{current?.connected&&!addingAccount&&<MeSection compact><MeRow title="연결 해제" danger icon="unlink-outline" disabled={busy} onPress={()=>setDisconnecting(true)}/>{disconnecting&&<View style={{padding:16,gap:12}}><Text style={s.subtitle}>연결을 해제해도 이미 가져온 할 일은 남아 있어요.</Text><Button title="연결 해제 확인" disabled={busy} onPress={()=>void disconnect()}/><Button title="계속 연결" quiet onPress={()=>setDisconnecting(false)}/></View>}</MeSection>}</>}
      {page==='resources'&&current?.connected&&<View style={{gap:12,marginTop:16}}>
          <View style={styles.tabs}>{current.features.filter(v=>['calendar','gmail','drive','tasks','channels','pages'].includes(v)).map(value=><Button key={value} title={names[value]} quiet disabled={busy} onPress={()=>{void loadResources(value,null);}}/>)}</View>
          <Text style={s.muted}>{provider==='google'&&feature==='calendar'?'기본 캘린더의 오늘부터 30일 일정을 표시해요.':provider==='google'&&feature==='gmail'?'최근 30일 받은편지함 제목을 표시해요.':provider==='slack'?'메시지를 가져올 채널을 선택해주세요.':'공유를 승인한 자료만 표시해요.'}</Text>
          {feature==='tasks'&&<><Text style={s.muted}>미완료 할 일만 가져올 수 있어요. 완료 기록은 참고용이에요.</Text>{channel&&<><Button title={taskStatus==='incomplete'?'완료 기록 보기':'미완료 할 일 보기'} quiet disabled={busy} onPress={()=>{void loadResources('tasks',channel,false,taskStatus==='incomplete'?'completed':'incomplete');}}/><Button title="Tasks 목록 다시 선택" quiet disabled={busy} onPress={()=>{void loadResources('tasks',null);}}/></>}</>}
          {feature==='messages'&&<Button title="채널 다시 선택" quiet disabled={busy} onPress={()=>{void loadResources('channels',null);}}/>}
          {items.map(item=><Pressable key={item.id} accessibilityRole={item.completed?undefined:['channel','tasklist'].includes(item.kind)?'button':'checkbox'} accessibilityState={{checked:selected.includes(item.id)}} accessibilityLabel={item.title} disabled={busy||!!item.completed} onPress={()=>select(item)} style={styles.item}><Ionicons name={item.completed?'checkmark-circle-outline':['channel','tasklist'].includes(item.kind)?'folder-outline':selected.includes(item.id)?'checkbox':'square-outline'} size={23} color={selected.includes(item.id)?colors.blueText:colors.muted}/><View style={{flex:1,minWidth:0}}><Text style={styles.itemTitle}>{item.title}</Text>{item.completed&&<Text style={s.muted}>완료 기록 · 참고용</Text>}{item.dueDate&&<Text style={s.muted}>{item.dueDate}</Text>}</View></Pressable>)}
          {readAttempted&&!items.length&&!busy&&<Text style={s.subtitle}>가져올 자료가 없어요.</Text>}
          {next&&<Button title="자료 더 보기" quiet disabled={busy} onPress={()=>{void loadResources(feature,channel,true);}}/>}
          {!!items.length&&<><Button title={`선택한 ${selected.length}개를 Todo에 추가`} disabled={busy||!selected.length} onPress={()=>{void importSelected();}}/><Text style={s.muted}>한 번에 최대 20개를 추가해요. 이미 가져온 자료는 중복 추가하지 않아요.</Text></>}
      </View>}
      {page==='sync'&&current?.connected&&<View style={{marginTop:16}}><TaskSyncPanel key={(connectionId??'default')+current.features.join(',')} connectionId={connectionId} store={store} refreshKey={statusRevision} onRequestPermission={()=>{const requested=[...new Set([...current.features,'tasks','tasksWrite'])];setFeatures(requested);void authorize(requested);}}/></View>}
      {page==='help'&&<View style={{marginTop:16,gap:12}}><MeCopy title={integrationState(current,statusStale||!!providerReadError)}>{current?.label||'승인한 연결 상태를 확인해요.'}</MeCopy><MeCopy title="먼저 연결 상태를 확인해요">기존 자료는 유지돼요. 연결을 점검한 뒤 권한이 부족하면 다시 승인해주세요.</MeCopy><Button title="연결 상태 새로고침" quiet disabled={busy} onPress={()=>void loadStatus()}/><Button title="연결 점검" quiet disabled={busy||!current?.connected} onPress={()=>void diagnose()}/></View>}
    </>}
    {!!statusError&&<Text accessibilityRole="alert" style={s.error}>{statusError}</Text>}{!!message&&<Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </MePage>;
}
const styles=StyleSheet.create({tabs:{flexDirection:'row',flexWrap:'wrap',gap:8},scope:{minHeight:44,flexDirection:'row',alignItems:'center',gap:12},item:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:colors.line},itemTitle:{color:colors.text,fontSize:16,lineHeight:24},message:{color:colors.secondary,fontSize:15,lineHeight:22.5,marginTop:16}});

import {MeCopy,MeDisclosure,MePage,MeRow,MeSection} from '../MeSettings';
import {integrationState,permissionSummary,readIntegrationStatuses} from '../integration-settings';
import type {GoogleAccount,IntegrationStatus} from '../integration-settings';
import { MotionPressable as Pressable } from '../motion';
import { TaskSyncPanel } from './TaskSyncPanel';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Button, colors, s } from '../ui';
import type { TodoStore } from '../useTodos';
export type Provider = 'google' | 'slack' | 'notion';
type Status=IntegrationStatus;
type Item = { id: string; title: string; dueDate?: string | null; kind: string; completed?: boolean; completedAt?: string | null };
const names: Record<string, string> = { gmailModify:'메일 읽음·상태 수정',gmailSend:'메일 발송',calendarWrite:'일정 작성·수정',driveContent:'Drive 파일 내용 읽기',driveWrite:'덕이 만들거나 허용한 Drive 파일 수정',messagesWrite:'Slack 메시지 보내기·덕 메시지 수정',pagesWrite:'Notion 페이지 작성·수정', google: 'Google', slack: 'Slack', notion: 'Notion', calendar: '기본 캘린더', gmail: '메일', drive: '드라이브', tasks: 'Google Tasks', channels: '채널', messages: '메시지', pages: '페이지' };
export function IntegrationsScreen({ store, initialProvider, onClose }: { store: TodoStore; initialProvider: Provider; onClose: () => void }) {
  const [accountId,setAccountId]=useState<string|null>(null),[addingAccount,setAddingAccount]=useState(false);
  const [writeOptionsOpen,setWriteOptionsOpen]=useState(false),[manageOpen,setManageOpen]=useState(false),[resourcesOpen,setResourcesOpen]=useState(false),[syncOpen,setSyncOpen]=useState(false),[helpOpen,setHelpOpen]=useState(false),[statusStale,setStatusStale]=useState(false),[statusError,setStatusError]=useState(''),[readAttempted,setReadAttempted]=useState(false);
  const [statuses,setStatuses]=useState<Status[]>([]),provider=initialProvider,[feature,setFeature]=useState(initialProvider==='google'?'calendar':initialProvider==='slack'?'channels':'pages');
  const [features, setFeatures] = useState<string[]>(initialProvider==='google'?['calendar']:initialProvider==='slack'?['channels','messages']:['pages']), [items, setItems] = useState<Item[]>([]), [selected, setSelected] = useState<string[]>([]), [channel, setChannel] = useState<string | null>(null), [next, setNext] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [disconnecting, setDisconnecting] = useState(false);
  const [taskStatus, setTaskStatus] = useState<'incomplete' | 'completed'>('incomplete');
  const initialScopesLoaded=useRef(false);
  const [statusRevision,setStatusRevision]=useState(0);
  const active = useRef(true), version = useRef(0), statusRead = useRef(0);
  const rootStatus=statuses.find(item=>item.provider===provider),account=rootStatus?.accounts?.find(a=>a.connectionId===accountId)??rootStatus?.accounts?.[0];const current=rootStatus&&account?{...rootStatus,label:account.label,features:account.features}:rootStatus;const connectionId=provider==='google'?account?.connectionId:undefined;
  function chooseAccount(value:GoogleAccount){version.current++;setAccountId(value.connectionId);setFeatures(value.features);setItems([]);setSelected([]);setChannel(null);setNext(null);setDisconnecting(false);setReadAttempted(false);setError('');setMessage('');setAddingAccount(false);}
  useEffect(()=>{if(account&&!addingAccount)setFeatures(account.features);},[connectionId,addingAccount]);
  async function loadStatus() { if (!store.user) return; const run=++statusRead.current; try { const result=readIntegrationStatuses(await store.featureRequest('/api/integrations')); if (active.current&&run===statusRead.current) {setStatuses(result);setStatusStale(false);setStatusError('');setStatusRevision(value=>value+1);const selected=result.find(item=>item.provider===provider);if(!initialScopesLoaded.current){initialScopesLoaded.current=true;if(selected?.connected&&selected.features.length)setFeatures(selected.features);}} } catch (e) { if(active.current&&run===statusRead.current){setStatusStale(true);setStatusError(e instanceof Error?e.message:'연결 상태를 확인하지 못했어요.');} } }
  useEffect(() => { active.current = true; void loadStatus(); const listener = AppState.addEventListener('change', state => { if (state === 'active') void loadStatus(); }); return () => { active.current = false; version.current++;statusRead.current++; listener.remove(); }; }, []);

  async function authorize(requestedFeatures = features,mode=addingAccount||!current?.connected?'add':'reauthorize') {
    if(provider==='slack')requestedFeatures=['channels','messages',...(features.includes('messagesWrite')?['messagesWrite']:[])];
    if(provider==='notion')requestedFeatures=['pages',...(features.includes('pagesWrite')?['pagesWrite']:[])];
    statusRead.current++;setBusy(true); setError(''); setMessage(''); let popup: Window | null = null;
    if (Platform.OS === 'web') { popup = window.open('about:blank', '_blank'); if (popup) popup.opener = null; }
    try {
      const value = await store.featureRequest(`/api/integrations/${provider}/authorize`, 'POST', { features: requestedFeatures,...(provider==='google'?{mode,...(mode==='reauthorize'&&connectionId?{connectionId}: {})}: {}) }) as { url: string };
      const url = new URL(value.url); if (url.protocol !== 'https:' || !['accounts.google.com', 'slack.com', 'api.notion.com'].includes(url.hostname)) throw new Error('연결 주소를 확인하지 못했어요.');
      if (Platform.OS === 'web') { if (!popup) throw new Error('브라우저에서 팝업을 허용한 뒤 다시 눌러주세요.'); popup.location.href = value.url; setMessage('연결을 승인한 뒤 이 화면에서 새로고침을 눌러주세요.'); }
      else { const result = await WebBrowser.openAuthSessionAsync(value.url, 'duckduck://integrations/complete'); if (result.type !== 'success') setMessage('연결 창을 닫았어요. 다시 연결할 수 있어요.'); }
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
      if(!Array.isArray(value.items)||value.items.some(item=>!item||typeof item.id!=='string'||typeof item.title!=='string'||typeof item.kind!=='string'))throw Error('자료를 확인하지 못했어요. 다시 조회해주세요.');setReadAttempted(true);setTaskStatus(status); setFeature(selectedFeature); setChannel(selectedChannel); setNext(value.nextCursor ?? null);
      setItems(previous => more ? [...new Map([...previous, ...value.items].map(item => [item.id, item])).values()] : value.items); if (!more) setSelected([]);
    } catch (e) { if (run === version.current) setError(e instanceof Error ? e.message : '자료를 가져오지 못했어요.'); }
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
    try { const result = await store.featureRequest(`/api/integrations/${provider}`+(connectionId?'?connectionId='+encodeURIComponent(connectionId):''), 'DELETE') as { revoked: boolean }; setItems([]);setResourcesOpen(false);setSyncOpen(false);setSelected([]);setNext(null);setDisconnecting(false);await loadStatus(); setMessage(result.revoked ? '연결을 해제했어요. 가져온 할 일은 유지돼요.' : '앱 연결을 해제했어요. 서비스 설정에서도 접근 권한 해제를 확인해주세요.'); }
    catch (e) { setError(e instanceof Error ? e.message : '연결을 해제하지 못했어요.'); } finally { setBusy(false); }
  }
  async function diagnose(){setBusy(true);setError('');try{await store.featureRequest(`/api/integrations/${provider}/diagnose`,'POST',{connectionId});setMessage('연결된 계정의 읽기 접근을 확인했어요.');}catch(e){setError(e instanceof Error?e.message:'연결을 점검하지 못했어요.');}finally{setBusy(false);}}
  const permissionControls=<>
    <Text style={s.subtitle}>사용할 자료를 선택하세요. 원본 변경 권한은 필요할 때만 추가해요.</Text>
    {provider==='google'&&['calendar','gmail','drive','tasks'].map(value=><Pressable key={value} accessibilityRole="checkbox" accessibilityState={{checked:features.includes(value)}} accessibilityLabel={`${names[value]} 읽기 권한`} disabled={busy} onPress={()=>setFeatures(previous=>previous.includes(value)?previous.filter(item=>item!==value&&!(value==='tasks'&&item==='tasksWrite')):[...previous,value])} style={styles.scope}><Text style={{color:features.includes(value)?colors.blueText:colors.muted}}>{features.includes(value)?'☑':'□'}</Text><Text style={[s.subtitle,{flex:1}]}>{names[value]} 읽기</Text></Pressable>)}
    {provider==='google'&&<><Pressable accessibilityRole="checkbox" accessibilityLabel="Google Tasks 완료 상태 수정 권한" accessibilityState={{checked:features.includes('tasksWrite')}} disabled={busy} onPress={()=>setFeatures(previous=>previous.includes('tasksWrite')?previous.filter(value=>value!=='tasksWrite'):[...new Set([...previous,'tasks','tasksWrite'])])} style={styles.scope}><Text>{features.includes('tasksWrite')?'☑':'□'}</Text><Text style={[s.subtitle,{flex:1}]}>Google Tasks 수정 권한 (선택)</Text></Pressable>{features.includes('tasksWrite')&&<Text style={s.muted}>Google의 수정 권한은 할 일 생성·수정·삭제를 포함해요. 완료 동기화는 따로 켜야 하고, 비서의 원본 변경은 초안을 확인한 뒤 실행해요.</Text>}</>}
    <Button title={writeOptionsOpen?'추가 권한 접기':`추가 읽기·쓰기 권한${features.some(v=>['gmailModify','gmailSend','calendarWrite','driveContent','driveWrite','messagesWrite','pagesWrite'].includes(v))?' · 선택됨':' (선택)'}`} accessibilityLabel="추가 권한 선택" expanded={writeOptionsOpen} quiet disabled={busy} onPress={()=>setWriteOptionsOpen(v=>!v)}/>
    {writeOptionsOpen&&<View style={{gap:8}}>{(provider==='google'?['gmailModify','gmailSend','calendarWrite','driveContent','driveWrite']:provider==='slack'?['messagesWrite']:['pagesWrite']).map(value=><Pressable key={value} accessibilityRole="checkbox" accessibilityLabel={names[value]+' 권한'} accessibilityState={{checked:features.includes(value)}} disabled={busy} onPress={()=>setFeatures(old=>old.includes(value)?old.filter(x=>x!==value):[...old,value])} style={styles.scope}><Text>{features.includes(value)?'☑':'□'}</Text><Text style={[s.subtitle,{flex:1}]}>{names[value]}</Text></Pressable>)}<Text style={s.muted}>선택 후 연결 버튼을 눌러 승인해주세요. Notion은 연결 관리에서 콘텐츠 추가·수정도 허용해야 해요.</Text></View>}
    {!store.user?.emailVerified&&<Text style={s.muted}>ME의 내 계정에서 이메일 인증을 먼저 완료해주세요.</Text>}
    <Button title={addingAccount?'Google 계정 추가':current?.connected?'연결 권한 다시 선택':`${names[provider]} 연결`} disabled={busy||!current?.configured||!store.user?.emailVerified||(provider==='google'&&!features.length)} onPress={()=>{void authorize();}}/>
  </>;
  return <MePage title={names[provider]} onClose={onClose} disabled={busy}>
    {!store.user?<MeCopy title="로그인이 필요해요">클라우드 계정으로 로그인하면 외부 서비스를 연결할 수 있어요.</MeCopy>:<>
      {provider==='google'&&rootStatus?.accounts&&<MeSection title="연결된 Google 계정">{rootStatus.accounts.map(value=><MeRow key={value.connectionId} title={value.label} detail={value.connectionId===connectionId?'선택됨':permissionSummary(value.features)} icon={value.connectionId===connectionId?'checkmark-circle-outline':'person-circle-outline'} label={'Google 계정 '+value.label+' 선택'} disabled={busy} onPress={()=>chooseAccount(value)}/>)}<MeRow title="Google 계정 추가" detail="기존 계정을 유지하고 다른 계정을 연결해요." icon="add-circle-outline" label="Google 계정 추가" disabled={busy||rootStatus.accounts.length>=10} onPress={()=>{setFeatures(['calendar']);setAddingAccount(true);setManageOpen(false);}}/></MeSection>}
      {addingAccount&&<MeSection title="추가할 계정의 자료"><View style={{padding:16,gap:12}}>{permissionControls}<Button title="계정 추가 취소" quiet disabled={busy} onPress={()=>{setAddingAccount(false);setFeatures(current?.features??['calendar']);}}/></View></MeSection>}
      <MeSection title="연결 상태"><MeCopy title={integrationState(current,statusStale)}>{current?.connected?(current.label||'승인한 계정이 연결되어 있어요.'):!current?'연결 상태를 확인하고 있어요.':current.configured?'필요한 자료를 선택해 연결하세요.':'이 서비스는 아직 연결할 수 없어요.'}</MeCopy>{current?.connected&&<MeCopy title="사용 중인 기능">{permissionSummary(current.features)}</MeCopy>}</MeSection>
      {!addingAccount&&current?.configured&&!current.connected&&<MeSection title="연결할 자료"><View style={{padding:16,gap:12}}>{permissionControls}</View></MeSection>}
      {!current?.connected&&<Button title="연결 상태 새로고침" quiet disabled={busy} onPress={()=>{void loadStatus();}}/>}
      {current?.connected&&<>
        <MeDisclosure title="연결 권한 관리" icon="key-outline" open={manageOpen} disabled={busy} onToggle={()=>setManageOpen(v=>!v)}>{permissionControls}<MeRow title="연결 해제" icon="unlink-outline" label="연결 해제" danger disabled={busy} onPress={()=>setDisconnecting(true)}/>{disconnecting&&<><Text style={s.subtitle}>연결을 해제해도 이미 가져온 할 일은 남아 있어요.</Text><Button title="연결 해제 확인" disabled={busy} onPress={()=>{void disconnect();}}/><Button title="계속 연결" quiet disabled={busy} onPress={()=>setDisconnecting(false)}/></>}</MeDisclosure>
        <MeDisclosure title="자료 가져오기" icon="download-outline" open={resourcesOpen} disabled={busy} onToggle={()=>setResourcesOpen(v=>!v)}>
          <View style={styles.tabs}>{current.features.filter(v=>['calendar','gmail','drive','tasks','channels','pages'].includes(v)).map(value=><Button key={value} title={names[value]} quiet disabled={busy} onPress={()=>{void loadResources(value,null);}}/>)}</View>
          <Text style={s.muted}>{provider==='google'&&feature==='calendar'?'기본 캘린더의 오늘부터 30일 일정을 표시해요.':provider==='google'&&feature==='gmail'?'최근 30일 받은편지함 제목을 표시해요.':provider==='slack'?'메시지를 가져올 채널을 선택해주세요.':'공유를 승인한 자료만 표시해요.'}</Text>
          {feature==='tasks'&&<><Text style={s.muted}>미완료 할 일만 가져올 수 있어요. 완료 기록은 참고용이에요.</Text>{channel&&<><Button title={taskStatus==='incomplete'?'완료 기록 보기':'미완료 할 일 보기'} quiet disabled={busy} onPress={()=>{void loadResources('tasks',channel,false,taskStatus==='incomplete'?'completed':'incomplete');}}/><Button title="Tasks 목록 다시 선택" quiet disabled={busy} onPress={()=>{void loadResources('tasks',null);}}/></>}</>}
          {feature==='messages'&&<Button title="채널 다시 선택" quiet disabled={busy} onPress={()=>{void loadResources('channels',null);}}/>}
          {items.map(item=><Pressable key={item.id} accessibilityRole={item.completed?undefined:['channel','tasklist'].includes(item.kind)?'button':'checkbox'} accessibilityState={{checked:selected.includes(item.id)}} accessibilityLabel={item.title} disabled={busy||!!item.completed} onPress={()=>select(item)} style={styles.item}><Text style={{color:selected.includes(item.id)?colors.blueText:colors.muted}}>{item.completed?'✓':['channel','tasklist'].includes(item.kind)?'#':selected.includes(item.id)?'☑':'□'}</Text><View style={{flex:1,minWidth:0}}><Text style={styles.itemTitle}>{item.title}</Text>{item.completed&&<Text style={s.muted}>완료 기록 · 참고용</Text>}{item.dueDate&&<Text style={s.muted}>{item.dueDate}</Text>}</View></Pressable>)}
          {readAttempted&&!items.length&&!busy&&<Text style={s.subtitle}>가져올 자료가 없어요.</Text>}
          {next&&<Button title="자료 더 보기" quiet disabled={busy} onPress={()=>{void loadResources(feature,channel,true);}}/>}
          {!!items.length&&<><Button title={`선택한 ${selected.length}개를 Todo에 추가`} disabled={busy||!selected.length} onPress={()=>{void importSelected();}}/><Text style={s.muted}>한 번에 최대 20개를 추가해요. 이미 가져온 자료는 중복 추가하지 않아요.</Text></>}
        </MeDisclosure>
        {provider==='google'&&<MeDisclosure title="완료 동기화" icon="sync-outline" open={syncOpen} disabled={busy} onToggle={()=>setSyncOpen(v=>!v)}><TaskSyncPanel key={(connectionId??'default')+current.features.join(',')} connectionId={connectionId} store={store} refreshKey={statusRevision} onRequestPermission={()=>{const requested=[...new Set([...current.features,'tasks','tasksWrite'])];setFeatures(requested);void authorize(requested);}}/></MeDisclosure>}
        <MeDisclosure title="연결 문제 해결" icon="help-circle-outline" open={helpOpen} disabled={busy} onToggle={()=>setHelpOpen(v=>!v)}><Button title="연결 상태 새로고침" quiet disabled={busy} onPress={()=>{void loadStatus();}}/><Button title="연결 점검" quiet disabled={busy} onPress={()=>{void diagnose();}}/></MeDisclosure>
      </>}
    </>}
    {!!statusError&&<Text accessibilityRole="alert" style={s.error}>{statusError}</Text>}{!!message&&<Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </MePage>;
}
const styles=StyleSheet.create({tabs:{flexDirection:'row',flexWrap:'wrap',gap:8},scope:{minHeight:44,flexDirection:'row',alignItems:'center',gap:12},item:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:colors.line},itemTitle:{color:colors.text,fontSize:16,lineHeight:24},message:{color:colors.secondary,fontSize:15,lineHeight:22.5,marginTop:16}});

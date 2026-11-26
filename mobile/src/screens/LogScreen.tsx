import {Ionicons} from '@expo/vector-icons';
import React, {useEffect, useState} from 'react';
import {Pressable, RefreshControl, Text, View} from 'react-native';
import {ScreenHeading} from '../ScreenHeading';
import type {TodoStore} from '../useTodos';
import {Button, colors, Page, PagePinned, s, TodoRow} from '../ui';
import {CalendarSheet} from '../CalendarSheet';
import {useDuoBackAction} from '../DuoBackNavigation';
import {TodoSelectionToolbar,useTodoSelectionInset} from '../TodoSelectionToolbar';

function LogDeleteBack({close,busy}:{close:()=>void;busy:boolean}){useDuoBackAction(close,busy,'close');return null;}

export function LogScreen({store}: {store: TodoStore}) {
  const [pulling, setPulling] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete,setConfirmDelete]=useState(false),[working,setWorking]=useState(false),[failure,setFailure]=useState('');
  const inset=useTodoSelectionInset();
  const {logged: completed} = store;
  const owner = store.user?.id;
  const completedIds = JSON.stringify(completed.map(todo => todo.id));
  useEffect(() => {setSelected([]);setConfirmDelete(false);setFailure('');setWorking(false);}, [owner]);

  useEffect(() => {
    const visible = new Set<string>(JSON.parse(completedIds));
    setSelected(ids => ids.filter(id => visible.has(id)));
  }, [completedIds]);

  function toggleSelection(id: string) {
    setSelected(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
  }

  async function pull() {
    if (pulling) return;
    setPulling(true);
    try { await store.refresh(); }
    finally { setPulling(false); }
  }

  async function deleteSelected(){
    if(working)return;
    setWorking(true);setFailure('');
    const failed:string[]=[];
    try{
      for(const id of selected){
        if(!store.isCurrentSession())return;
        try{if(!await store.remove(id))failed.push(id);}catch{failed.push(id);}
      }
      if(!store.isCurrentSession())return;
      setSelected(failed);setConfirmDelete(false);
      if(failed.length)setFailure(`${failed.length}개를 처리하지 못했어요. 다시 시도해주세요.`);
    }finally{if(store.isCurrentSession())setWorking(false);}
  }

  return <View style={{flex:1,minHeight:0}}><Page todoGestures bottomSpace={selected.length?112:0} testID="log-list-scroll" refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void pull()} tintColor={colors.blue}/>}>
    <ScreenHeading embedded title="log">
      {selected.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="로그 선택 마치기" disabled={working} onPress={() => {setSelected([]);setFailure('');}} style={{minHeight:44,minWidth:44,justifyContent:'center',alignItems:'center'}}>
        <Ionicons name="checkmark" size={22} color={colors.blueText}/>
      </Pressable>}
    </ScreenHeading>
    <PagePinned testID="log-pinned-description">
      <Text style={s.muted}>전체 {store.todos.length} · 남은 일 {store.visible.length} · 완료 {completed.length}</Text>
      <Text style={[s.subtitle, {marginBottom:22}]}>docen에서 완료한 일을 모아두었어요.</Text>
    </PagePinned>
    {!completed.length && <View style={s.empty}><Text style={s.emptyText}>docen에서 완료한 일이 여기에 쌓여요.</Text></View>}
    {completed.map(todo => <TodoRow key={todo.id} todo={todo} log
      selected={selected.length ? selected.includes(todo.id) : undefined}
      onSelect={() => toggleSelection(todo.id)}
      pending={!!store.pending[todo.id]} pendingUntil={store.pending[todo.id]}
      busy={working||store.busyIds.includes(todo.id)} canToggleWhileBusy={!working&&store.completionIds.includes(todo.id)} canSelectWhileBusy={!working&&store.completionIds.includes(todo.id)}
      onToggle={() => {void store.update(todo.id, {done:!todo.done});}}/>)}
  </Page>
  {selected.length>0&&<TodoSelectionToolbar count={selected.length} inset={inset} busy={working||confirmDelete} testID="log-selection-toolbar" actions={[
    {icon:'trash-outline',label:'삭제',description:'선택한 로그 삭제',destructive:true,onPress:()=>setConfirmDelete(true)},
  ]}/>}
  {!!failure&&<View style={{position:'absolute',alignSelf:'center',bottom:inset+96,zIndex:11}}><Text style={s.error} accessibilityRole="alert">{failure}</Text></View>}
  {confirmDelete&&selected.length>0&&<CalendarSheet centered bottomInset={inset} title="로그 삭제" busy={working} onClose={()=>setConfirmDelete(false)}>
    <LogDeleteBack close={()=>setConfirmDelete(false)} busy={working}/>
    <Text style={s.subtitle}>선택한 기록 {selected.length}개를 도슨에서 삭제할까요?</Text>
    <Button title="도슨에서 선택한 로그 삭제 확인" disabled={working} loading={working} onPress={()=>void deleteSelected()}/>
  </CalendarSheet>}
  </View>;
}

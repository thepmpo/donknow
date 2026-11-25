import {ScreenHeading} from '../ScreenHeading';
import React,{useState} from 'react';
import { RefreshControl, Text, View } from 'react-native';
import type { TodoStore } from '../useTodos';
import { colors, Page, PagePinned, s, TodoRow } from '../ui';
export function LogScreen({ store }: { store: TodoStore }) {
  const [pulling,setPulling]=useState(false);
  async function pull(){if(pulling)return;setPulling(true);try{await store.refresh();}finally{setPulling(false);}}
  const completed = store.logged;
  return <Page testID="log-list-scroll" refreshControl={<RefreshControl refreshing={pulling} onRefresh={()=>void pull()} tintColor={colors.blue} />}><ScreenHeading embedded title="log"/><PagePinned testID="log-pinned-description"><Text style={s.muted}>전체 {store.todos.length} · 남은 일 {store.visible.length} · 완료 {completed.length}</Text><Text style={[s.subtitle, { marginBottom: 22 }]}>docen에서 완료한 일을 모아두었어요.</Text></PagePinned>{!completed.length && <View style={s.empty}><Text style={s.emptyText}>docen에서 완료한 일이 여기에 쌓여요.</Text></View>}{completed.map(todo => <TodoRow key={todo.id} todo={todo} log pending={!!store.pending[todo.id]} pendingUntil={store.pending[todo.id]} busy={store.busyIds.includes(todo.id)} canToggleWhileBusy={store.completionIds.includes(todo.id)} onToggle={() => { void store.update(todo.id, { done: !todo.done }); }} />)}</Page>;
}

import {ScreenHeading} from '../ScreenHeading';
import React from 'react';
import { RefreshControl, Text, View } from 'react-native';
import type { TodoStore } from '../useTodos';
import { colors, Page, s, TodoRow } from '../ui';
export function LogScreen({ store }: { store: TodoStore }) {
  const completed = store.logged;
  return <Page refreshControl={<RefreshControl refreshing={store.loading} onRefresh={store.refresh} tintColor={colors.blue} />}><ScreenHeading embedded title="log"/><Text style={s.muted}>전체 {store.todos.length} · 남은 일 {store.visible.length} · 완료 {completed.length}</Text><Text style={s.label}>완료한 기록</Text><Text style={[s.subtitle, { marginBottom: 22 }]}>덕에서 완료한 일을 모아두었어요.</Text>{!completed.length && <View style={s.empty}><Text style={s.emptyText}>덕에서 완료한 일이 여기에 쌓여요.</Text></View>}{completed.map(todo => <TodoRow key={todo.id} todo={todo} log pending={!!store.pending[todo.id]} pendingUntil={store.pending[todo.id]} busy={store.busyIds.includes(todo.id)} canToggleWhileBusy={store.completionIds.includes(todo.id)} onToggle={() => { void store.update(todo.id, { done: !todo.done }); }} />)}</Page>;
}

import {Ionicons} from '@expo/vector-icons';
import React, {useEffect, useState} from 'react';
import {Pressable, RefreshControl, Text, View} from 'react-native';
import {ScreenHeading} from '../ScreenHeading';
import type {TodoStore} from '../useTodos';
import {colors, Page, PagePinned, s, TodoRow} from '../ui';

export function LogScreen({store}: {store: TodoStore}) {
  const [pulling, setPulling] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const {logged: completed} = store;
  const owner = store.user?.id;
  const completedIds = JSON.stringify(completed.map(todo => todo.id));
  useEffect(() => setSelected([]), [owner]);
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

  return <Page todoGestures testID="log-list-scroll" refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void pull()} tintColor={colors.blue}/>}>
    <ScreenHeading embedded title="log">
      {selected.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="로그 선택 마치기" onPress={() => setSelected([])} style={{minHeight:44,minWidth:44,justifyContent:'center',alignItems:'center'}}>
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
      busy={store.busyIds.includes(todo.id)} canToggleWhileBusy={store.completionIds.includes(todo.id)} canSelectWhileBusy={store.completionIds.includes(todo.id)}
      onToggle={() => {void store.update(todo.id, {done:!todo.done});}}/>)}
  </Page>;
}

import {ScreenHeading} from '../ScreenHeading';
import { MotionPressable as Pressable } from '../motion';
import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { dateKey } from '../domain';
import type { Todo } from '../domain';
import type { TodoStore } from '../useTodos';
import { typography } from '../theme';
import { colors, Page, s, TodoRow } from '../ui';
export function TodosScreen({ store, onEdit, onAdd }: { store: TodoStore; onEdit: (todo: Todo) => void; onAdd: (date: string | null) => void }) {
  return <Page testID="todos-list-scroll" compact refreshControl={<RefreshControl refreshing={store.loading} onRefresh={store.refresh} tintColor={colors.blue} />}>
    <ScreenHeading embedded title="할 일"><Text style={styles.count}>{store.visible.length}</Text></ScreenHeading>
    <Text style={styles.date}>{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())}</Text>
    <Text style={styles.hint}>좌우로 밀어 완료하거나 되돌려요</Text>
    {!store.visible.length && <View style={s.empty}><Text style={s.emptyText}>남은 할 일이 없어요.{ '\n' }가벼운 마음으로 하나씩 시작해요.</Text></View>}
    {store.visible.map(todo => <TodoRow key={todo.id} todo={todo} pending={!!store.pending[todo.id]} pendingUntil={store.pending[todo.id]} busy={store.busyIds.includes(todo.id)} canToggleWhileBusy={store.completionIds.includes(todo.id)} onToggle={() => { void store.update(todo.id, { done: !todo.done }); }} onEdit={() => onEdit(todo)} />)}
    <Pressable onPress={() => onAdd(dateKey(new Date()))} accessibilityRole="button" accessibilityLabel="할 일 추가" style={styles.add}><Text style={styles.plus}>＋</Text><Text style={styles.addText}>할 일 추가</Text><Text style={styles.arrow}>›</Text></Pressable>
  </Page>;
}
const styles = StyleSheet.create({
  date: { ...typography.caption, color: colors.muted, marginBottom: 4 },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: 10 }, title: { ...typography.heading, marginBottom: 0 }, count: { ...typography.body, color: colors.muted, fontWeight: '600' },
  hint: { ...typography.caption, color: colors.muted, marginTop: 4, marginBottom: 8 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  plus: { fontSize: 22, color: colors.blue }, addText: { ...typography.detail, flex: 1, fontWeight: '600', color: colors.blueText }, arrow: { ...typography.caption, color: colors.blueText },
});

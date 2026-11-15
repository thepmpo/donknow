import { request } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseTodos, sampleTodos, validateDraft } from './domain';
import type { Connection, Draft, Todo } from './domain';
export const CONNECTION_KEY = 'duckduck.mobile.connection.v1';
const DEMO_KEY = 'duckduck.mobile.demo.todos.v1';
export type Patch = Partial<Pick<Todo, 'title' | 'done' | 'dueDate' | 'dueTime' | 'reminderAt' | 'notes'>>;
export interface Repository {
  list(): Promise<Todo[]>;
  create(draft: Draft): Promise<Todo>;
  update(id: string, patch: Patch): Promise<Todo>;
  remove(id: string): Promise<void>;
  reorder(ids:string[]):Promise<Todo[]>;
}
export function createRepository(connection: Connection): Repository {
  if (connection.mode === 'cloud') {
    const baseUrl = connection.baseUrl;
    const call = (path = '', method = 'GET', body?: unknown) => request(baseUrl, '/api/todos' + path, method, body);
    let notesSupported = false;
    async function requireNotes() {
      if (notesSupported) return;
      const capabilities = await request(baseUrl, '/api/capabilities') as { todoNotes?: boolean };
      if (!capabilities.todoNotes) throw new Error('메모 저장을 지원하는 최신 서버가 필요해요. 입력한 내용은 그대로 두고 다시 시도해주세요.');
      notesSupported = true;
    }
    return {
      list: async () => parseTodos(await call()),
      create: async draft => { if (draft.notes) await requireNotes(); return parseTodos([await call('', 'POST', validateDraft(draft))])[0]; },
      update: async (id, patch) => { if (patch.notes !== undefined) await requireNotes(); return parseTodos([await call('/' + encodeURIComponent(id), 'PATCH', patch)])[0]; },
      remove: async id => { await call('/' + encodeURIComponent(id), 'DELETE'); },
      reorder:async ids=>{const c=await request(baseUrl,'/api/capabilities') as {todoOrdering?:number};if(!c.todoOrdering)throw Error('순서 저장을 지원하는 최신 서버가 필요해요. 기존 순서는 유지했어요.');return parseTodos(await request(baseUrl,'/api/todo-order','PUT',{ids}));},
    };
  }
  let queue: Promise<unknown> = Promise.resolve();
  async function read(): Promise<Todo[]> {
    const value = await AsyncStorage.getItem(DEMO_KEY);
    if (value) return parseTodos(JSON.parse(value));
    const samples = sampleTodos();
    await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(samples));
    return samples;
  }
  function mutate<T>(operation: (items: Todo[]) => T): Promise<T> {
    const result = queue.then(async () => {
      const items = await read(); const output = operation(items);
      await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(items)); return output;
    });
    queue = result.catch(() => undefined); return result;
  }
  return {
    list: read,
    create: draft => mutate(items => {
      const todo: Todo = { ...validateDraft(draft), id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`, done: false, createdAt: new Date().toISOString() };
      items.push(todo); return todo;
    }),
    update: (id, patch) => mutate(items => {
      const index = items.findIndex(todo => todo.id === id);
      if (index < 0) throw new Error('할 일을 찾을 수 없어요.');
      const previous = items[index];
      const next = { ...previous, ...patch };
      validateDraft(next);
      if (patch.done !== undefined) next.completedAt = patch.done ? (previous.done && previous.completedAt ? previous.completedAt : new Date().toISOString()) : null;
      items[index] = next; return next;
    }),
    remove: id => mutate(items => { const index = items.findIndex(todo => todo.id === id); if (index >= 0) items.splice(index, 1); }),
    reorder:ids=>mutate(items=>{for(const [order,id]of ids.entries()){const todo=items.find(t=>t.id===id);if(todo)todo.order=order;}return items;}),
  };
}

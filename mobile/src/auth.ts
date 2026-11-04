import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
export type User = { id: string; email: string; emailVerified: boolean };
export class AuthRequiredError extends Error { constructor() { super('다시 로그인해주세요.'); } }
const storageKey = (origin: string) => 'duckduck.session.' + Array.from(origin).map(char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
export async function request(baseUrl: string, path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), path==='/api/auth/login'||path==='/api/auth/register'||path==='/api/auth/session'||path==='/api/health'||path==='/api/assistant/chat'?60000:15000);
  try {
    const token = Platform.OS === 'web' ? null : await SecureStore.getItemAsync(storageKey(baseUrl));
    const response = await fetch(baseUrl + path, { method, credentials: 'include', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-Duckduck-Client': Platform.OS === 'web' ? 'web' : 'native', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 401 && path !== '/api/auth/login') throw new AuthRequiredError();
    let value;try{value=await response.json();}catch{throw new Error(response.status===502||response.status===503||response.status===504?'서버가 준비 중이에요. 잠시 뒤 다시 시도해주세요.':'서버 응답을 읽지 못했어요. 다시 시도해주세요.');}
    if (!response.ok) throw new Error(typeof value.error === 'string' ? value.error : '서버 요청에 실패했어요. 다시 시도해주세요.');
    return value;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('서버 응답 시간이 초과됐어요. 무료 서버가 준비 중이거나 네트워크가 불안정할 수 있어요. 잠시 뒤 다시 시도해주세요.');
    if (error instanceof TypeError || (error instanceof Error && /failed to fetch|network request failed|load failed/i.test(error.message))) throw new Error('서버에 연결하지 못했어요. 주소와 네트워크를 확인해주세요.');
    throw error;
  } finally { clearTimeout(timer); }
}
export async function session(baseUrl: string): Promise<User> {
  const result = await request(baseUrl, '/api/auth/session') as { user?: User };
  if (!result.user || typeof result.user.id !== 'string' || typeof result.user.email !== 'string') throw new Error('로그인 정보를 확인할 수 없어요.');
  return result.user;
}
export async function authenticate(baseUrl: string, email: string, password: string, register: boolean): Promise<User> {
  const result = await request(baseUrl, register ? '/api/auth/register' : '/api/auth/login', 'POST', { email, password }) as { user?: User; token?: string };
  if (!result.user || typeof result.user.id !== 'string' || typeof result.user.email !== 'string') throw new Error('로그인 정보를 확인할 수 없어요.');
  if (Platform.OS !== 'web') {
    if (typeof result.token !== 'string') throw new Error('로그인 정보를 저장할 수 없어요.');
    await SecureStore.setItemAsync(storageKey(baseUrl), result.token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  }
  return result.user;
}
export async function logout(baseUrl: string): Promise<void> {
  await request(baseUrl, '/api/auth/logout', 'POST', {});
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(storageKey(baseUrl));
}

export async function forgetSession(baseUrl: string): Promise<void> { if (Platform.OS !== "web") await SecureStore.deleteItemAsync(storageKey(baseUrl)); }

export const product = {name:'새 서비스', locale:'ko-KR'} as const;

export const sections = [
  {id:'items', title:'항목', icon:'list-outline'},
  {id:'history', title:'기록', icon:'time-outline'},
  {id:'settings', title:'설정', icon:'settings-outline'},
] as const;
export type Section = typeof sections[number]['id'];

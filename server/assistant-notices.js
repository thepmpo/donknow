import {createHash} from 'node:crypto';
import {fail} from './secrets.js';
const providers={google:'Google', 'apple-reminders':'아이폰 미리 알림','apple-calendar':'아이폰 캘린더',slack:'Slack',notion:'Notion'};
export function assistantNotice(store,user,input){
 if(!input||!['connection-reauthorization','calendar-failed','calendar-unknown','source-failed','source-limited','source-unsupported','source-unknown','source-completion-limited','device-update-required','device-required','reminders-empty','reminders-import-failed','ai-credit'].includes(input.code)||typeof input.title!=='string'||input.title.length>160||input.todoId&&!store.get(user,input.todoId))throw fail(400,'안내할 항목을 확인해주세요.');
 const name=providers[input.provider]??'원본 서비스',title=input.title||'요청한 항목';
 const texts={
  'connection-reauthorization':`${name}에서 연결 승인을 갱신하지 못했어요. 캘린더 선택의 ‘Google 연결 확인’ 또는 ME → 연결된 서비스에서 해당 계정을 다시 승인해주세요. 기존 자료와 작성 중인 내용은 유지돼요. 다시 연결하기 전에는 원본 앱에서 급한 일정을 확인하거나 docen에 할 일로 기록할 수 있어요.`,
  'calendar-failed':`${title}의 원본 일정 저장을 완료하지 못했어요. 작성 내용은 편집창에 남아 있어요. ME → 연결된 서비스에서 캘린더 수정 권한을 확인하고, 원본을 새로 확인한 뒤 저장해주세요. 급하면 Google 캘린더에서 같은 일정을 수정할 수 있어요.`,
  'calendar-unknown':`${title}의 원본 저장 결과를 확인하지 못했어요. 자동으로 다시 저장하지 않았어요. 일정 편집창의 ‘저장 결과 확인’을 먼저 누르고 ${name} 원본을 확인해주세요. 이미 반영됐다면 다시 저장하지 않아도 돼요.`,
  'source-failed':`${title}의 ${name} 원본 저장을 완료하지 못했어요. 연결된 서비스의 수정 권한과 원본 변경 여부를 확인해주세요. 권한을 연결한 뒤 해당 할 일의 ‘원본 저장 다시 시도’를 누를 수 있어요. 급하면 원본 앱에서 같은 항목을 수정한 뒤 docen에서 새로고침해주세요.`,
  'source-completion-limited':`${title}의 완료 상태는 docen에 저장했어요. ${name}의 이 자료에는 docen이 바꿀 수 있는 완료 상태가 없어 원본 완료를 반영하지 못했어요. 캘린더 일정이나 메시지는 원본 앱에서 확인하고, 할 일로 처리한 기록은 docen의 log에서 관리할 수 있어요. 다른 내용 수정이 남아 있다면 원본 앱에서 같은 항목을 확인해주세요.`,
  'source-limited':`${title}의 변경 내용은 docen에 보관했어요. Google Tasks는 예정 시간을 지원하지 않으며, 캘린더 일정은 예정일이 필요해요. 원본에 맞는 날짜만 저장하거나 원본 앱에서 확인해주세요. 시간 알림은 docen의 알림을 대신 사용할 수 있어요.`,
  'source-unsupported':`${title}의 변경은 docen에 보관했지만 ${name}의 이 자료는 원본 앱에서 수정해야 해요. 원본 앱에서 같은 항목을 수정한 뒤 docen에서 다시 확인해주세요. 필요한 행동은 docen 할 일로 계속 관리할 수 있어요.`,
  'source-unknown':`${title}의 원본 저장 결과를 확인하지 못했어요. 중복 변경을 막기 위해 자동으로 다시 실행하지 않았어요. ${name}에서 변경됐는지 먼저 확인해주세요. 반영되지 않았다면 해당 할 일에서 원본 저장을 다시 시도할 수 있어요.`,
  'device-update-required':`${title}의 docen 완료 상태는 저장했지만, 현재 앱의 응답으로는 아이폰 원본 완료 상태를 확인할 수 없어요. 최신 docen 앱으로 업데이트하고 미리 알림 접근을 허용한 뒤 ‘원본 저장 다시 시도’를 눌러주세요. 급하면 원본 미리 알림 앱에서 같은 항목을 완료하거나 되돌릴 수 있어요. 원본에 반영됐다고 표시하지 않았어요.`,
  'device-required':`${title}은 ${name}에 연결된 항목이에요. 원본을 수정하려면 이 항목을 가져온 아이폰에서 미리 알림 접근을 허용한 뒤 ‘원본 저장 다시 시도’를 눌러주세요. 지금 그 기기를 사용할 수 없다면 원본 미리 알림 앱에서 제목·메모·예정 시간을 직접 수정하고 docen에서 다시 확인해주세요.`,
  'reminders-import-failed':`${title} 중 일부를 가져오지 못했어요. 이미 저장한 항목은 유지되고 아이폰 가져오기 화면에는 남은 항목이 선택되어 있어요. 서버와 네트워크를 확인한 뒤 남은 항목을 다시 가져오세요. 이미 저장된 같은 항목은 중복 추가하지 않아요. 급한 일은 원본 미리 알림 앱에서 계속 확인할 수 있어요.`,
  'reminders-empty':`‘${title}’ 목록에서 미리 알림을 읽지 못했어요. 원본 앱에도 비어 있는지 확인해주세요. 원본에 항목이 있다면 아이폰 설정의 docen → 미리 알림 접근, iCloud/계정 동기화를 확인하고 목록을 다시 읽어주세요. 급하면 원본 앱에서 할 일을 확인하면서 docen에 직접 추가할 수 있어요.`,
  'ai-credit':'AI API 계정의 사용 잔액이 부족해 답변을 만들지 못했어요. API 계정의 잔액·결제 설정을 확인한 뒤 같은 요청을 다시 보내주세요. 그동안 일정·할 일 편집과 원본 앱에서의 직접 처리는 계속할 수 있어요. 요청한 내용을 완료했다고 표시하지 않았어요.'
 };
 const key=createHash('sha256').update(JSON.stringify([input.code,input.provider,input.todoId,title,Math.floor(Date.now()/600000)])).digest('hex');
 return {id:store.publishAgentUpdate(user,'notice:'+key,{kind:'assistant-notice',title:input.code==='ai-credit'?'AI 연결 확인이 필요해요':'원본 자료 확인이 필요해요',text:texts[input.code],items:[],warnings:[],notify:true})};
}

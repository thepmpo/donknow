# 덕 — 대화·장기 기억·변경 수신

사용자는 Dots처럼 일상과 업무를 계속 돕는 비서를 원한다. 이전의 시간별 브리핑만으로 동일하다고 설명하지 않는다. 이번에는 대화/검증한 기억의 영구 저장, 공급자 수신/재시도 큐, Slack 사용자 관점 연결을 추가한다. Dots의 독자적인 모델·컴퓨터·장기 작업 실행 시스템을 그대로 복제한 것은 아니다.

## 대화와 기억

ME → 데이터·개인정보 → 대화와 기억. 계정별 명시적인 켜기로 시작한다. 기본은 꺼짐이며 과거의 저장되지 않은 대화를 복구한다고 설명하지 않는다. 켠 이후의 사용자 문장·답변·확인할 제안·체크/X/Todo 상태를 암호화 저장한다. 원문 자료 전체·붙여넣은 별도 원문을 자동 보관하지 않는다. 답변에 실제 인용된 내용/제안은 남을 수 있다.

사용자가 직접 말한 선호와 계속 맡긴 일을 모델이 근거 문장과 함께 기억할 수 있다. 근거는 해당 계정의 실제 사용자 turn 안에 있어야 한다. 문서나 메시지 안의 명령을 사용자의 새 지시로 저장하지 않는다. 기억은 목록에서 추가·수정·잊기 가능하다. 자동 기억은 모델 판단이므로 항상 완벽하게 추출한다고 하지 않는다. 최대500개, 항목1,000자, 기본 문맥에는 최근24개를 사용한다. 이전 대화 검색은2,000개 단위의 키워드 검색/이어 읽기이고 임베딩 기반 무제한 기억이 아니다. 화면은 최근40개 대화를 복원한다.

대화 요청 ID/내용 digest/lease를 계정별로 고정한다. 응답 유실 뒤 같은 요청을 재시도해도 완료 응답/같은 Todo ID를 복원한다. 실행 중 요청에는409로 중복 모델 실행을 막는다. 완료 저장은 사용자/답변/체크 항목/응답 캐시를 원자적으로 처리한다. 메모리 끄기/잊기/전체 삭제로 revision이 바뀌면 진행 중 생성 결과를 저장하지 않는다. 일반 대화의 체크→log, 왼쪽→X만, 오른쪽→Todo가 서버 재시작 뒤에도 같은 항목에 연결된다. 외부 원본 쓰기는 기존 초안 확인/권한이 필요하다.

‘잊기’는 기억 목록만 지운다. 예전 대화의 같은 내용도 지우려면 전체 삭제를 사용한다. 전체 삭제는 대화·기억·수신함/해당 미발송 push를 지우며 Todo/log·서비스 연결·외부 작업 감사 기록은 보존한다. 이전 Todo 연결 매핑은 중복 생성 방지를 위해 남는다. 화면도 즉시 새로고침한다. 개인 내보내기에 자신의 기억/대화가 포함된다. 계정 삭제는 FK cascade로 제거한다. 기존 백업의 보관·삭제 정책은 별도이며 즉시 모든 백업이 사라진다고 하지 않는다.

## 공급자 수신

고정된 `/api/webhooks/{slack,notion,calendar,gmail}`만 앱 전용 CSRF 헤더 밖에서 받으며 각각 공급자 인증을 필수 검사한다. JSON 최대256KiB, 요청 제한, 먼저 ACK, 암호화 durable queue, lease, 최대5회 지연 재시도, 계정/동의/예약 revision 재확인, 영구 알림 키로 중복 방지한다. 처리/취소/최종 실패 원문은 지우고 일주일 지난 큐 메타데이터를 정리한다. 실시간 변화는 정시 브리핑 시간과 별개다. 사용자 예약/중요 변화 동의를 대신 켜지 않았다.

- Slack: timestamp±5분과 raw-body HMAC. team뿐 아니라 설치한 Slack user authorization이 맞아야 수신한다. 다른 회원의 DM을 team ID만으로 배포하지 않는다. 새 OAuth는 사용자 읽기 토큰과 설치자 ID를 저장하고, 접근 가능한 채널·DM·그룹 DM을 읽는다. 과거 bot 연결은 기존 읽기를 유지하지만 사용자 관점 이벤트에는 재승인이 필요하다. 이벤트에 들어온 메시지를 확인하므로 기존 ‘첫3채널’ 밖의 수신도 처리할 수 있다. 명시적 쓰기 선택 없이 chat:write를 요청하지 않는다. 쓰기 승인 시 연결 계정 명의로 작성하며 수정은 그 계정의 메시지만 허용한다.
- Notion: raw-body HMAC, workspace/연결 일치, 자신의 OAuth로 해당 페이지 속성/중첩 본문 재조회. 페이지 체크 상태를 보존한다. 모델은 지정 요청의 필요도를 판단한다. 글로벌 검증 키 방식 외에 소유자가 만든 비공개 URL로 초기 검증 토큰을 암호화 수신/한 번 고정하는 설정 경로를 제공한다. 초기 코드는 인증된 소유자만 조회하고 Notion 설정에 입력한다. 공개 URL 응답/로그/문서/모델로 코드를 반환하지 않는다.
- Calendar: 중요 변화에 동의한 Google 계정의 **기본 캘린더**에 events.watch를 등록/만료 전 갱신한다. 채널 토큰 해시·resource ID·만료·단조 증가 message number를 확인한다. 변경 알림 뒤 기존 최근 자료 검사기를 바로 깨워 임박 일정/기한/지정 요청을 확인한다. 모든 보조 캘린더·취소/과거 일정 변경 전체를 완전 추적하는 sync-token 엔진은 아니다.
- Gmail: 기존 Google Cloud Pub/Sub topic/구독·IAM/OIDC 설정이 있을 때 INBOX watch를 등록/갱신한다. Google 서명 키/issuer/정확한 audience·서비스 계정·이메일·구독명을 검사하고 해당 계정의 최근 자료를 즉시 다시 읽는다. historyId 전체 증분 복원은 없으며 오래된 메일/목록 제한 밖 요청은 누락될 수 있다. 새 유료 Cloud 리소스를 만들지 않았다.
- Tasks·Naver·그 밖의 자료는 기존 주기 조회를 유지한다. 수신을 지원하지 않는 API에 webhook이 있다고 설명하지 않는다.

등록된 수신이 없거나 읽기 범위가 제한되면60초 주기 조회/기존 예약 실행이 보완한다. iPhone은 foreground push 수신 때 수신함을 다시 읽고, 앱 활성화와30초 조회도 유지한다. 네트워크·공급자·무료 서버 절전/시작 지연 때문에100% 즉시 전달을 보장하지 않는다. push 권한/기기 등록이 실제로 완료되어야 기기 알림이 온다.

복구는 새 빈 대상에만 수행한다. 기억/대화는 보존하되 진행 중 대화 lease·이벤트 큐·공급자 watch는 취소한다. 기존 예약도 꺼진 채 복구하여 이전 일을 자동 재실행하지 않는다.

## 현재 연결과 남은 일

사용자 지시로 기존 ChatGPT Slack 플러그인 연결을 해제했다. 채널·메시지를 변경하지 않았다. 다른 워크스페이스 재연결은 아직 확인되지 않았고, 옛 워크스페이스를 덕의 대상으로 쓰지 않는다. ChatGPT 플러그인 OAuth를 덕 앱으로 이전할 수는 없다. 덕 전용 Slack 앱은 [설정 절차](assistant-provider-setup.md)와 [manifest](../config/slack-app-manifest.json)를 준비했다. 실제 Slack 앱 등록·새 워크스페이스 OAuth·이벤트 수신·실제 모델/push 품질은 별도 확인이 필요하다.

Google/Notion 등의 서버 설정 존재, 공급자 수신 코드 존재, 사용자의 실제 연결/등록 성공을 구분한다. 웹 조사/개인 클라우드 컴퓨터/자율 다단계 문서 편집/무제한 의미 기억은 이번 구현에 포함되지 않는다. 문서 정리는 읽은 근거에 따른 요약·체크 제안과 명시 확인한 Notion 쓰기 등 기존 기능 범위다.

## 근거

[Dots](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot) · [Dots 개인화](https://developers.openai.com/training/walkthroughs/personalize-your-dot) · [Slack Events](https://docs.slack.dev/apis/events-api/) · [Slack 서명](https://docs.slack.dev/authentication/verifying-requests-from-slack/) · [Slack manifest](https://docs.slack.dev/reference/app-manifest/) · [Calendar push](https://developers.google.com/workspace/calendar/api/guides/push) · [Gmail push](https://developers.google.com/workspace/gmail/api/guides/push) · [Notion webhooks](https://developers.notion.com/reference/webhooks).

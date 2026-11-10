# AI 사무실 — 읽기 전용 제품 검토·승인 후 개발 게이트

2026-11-10 · 구현/격리 테스트 완료 · **실제 모델 실행은 잠금 유지**.

[초기 사무실](ai-office-setup.md) · [공식 제품 원칙](reusable-product-design-principles.md) · [재현 패치](../tools/ai-office/README.md) · [운영자 승인 도구](../scripts/ai-office-approval.mjs).

## 1. 실제로 추가한 경계

제품팀이 조사하고 사용자가 확정한 내용을 개발팀으로 넘기는 원칙을 프롬프트가 아닌 서버·실행기에서 검사한다. 현재는 승인된 프로젝트 작업 경로만 지원하며, 자유로운 직원 채팅/회의/자동 위임을 그대로 활성화한 완성형 조직 운영과는 구분한다.

- 권한은 작업ID·프로젝트ID/경로/목표·제목/설명/종류·담당자와 역할/공급자·기준 커밋·인계서 내용 해시에 묶는다. 승인 뒤 이 중 하나가 바뀌면 재승인해야 한다.
- 승인 미리보기/승인은10분 유효하다. 명시적 확인과 정확한 digest를 요구한다. 승인 권한은 일반 사무실 세션과 별도의 운영자 키로 확인한다. 작업 내용에서 “승인됨”이라고 주장해도 권한이 생기지 않는다.
- 실행은 approved→running을 원자적으로 한 번 선점한다. 중복 실행·사용한 승인 재사용을 막고 성공/실패 뒤 consumed/failed로 닫는다. spawn 자체 실패도 실패 상태로 닫는다.
- 제품 검토는 기존 source를 읽기 전용으로 사용하며 Git 초기화·worktree·CLAUDE.md·context cache를 소스에 만들지 않는다. 제품 문맥은 메모리에서 계산한다.
- 개발은 승인된 source HEAD에서 해당 작업의 전용 worktree를 만들고 그 작업 공간만 쓰기 가능하게 한다. 다른 작업의 worktree를 대신 지정할 수 없다.
- 원본 source·공용 Git 메타데이터는 개발 중에도 읽기 전용이다. worker는 코드 편집/테스트 결과를 보고하며 commit·merge·push는 호스트에서 최종 검수 후 별도로 한다.

## 2. 기본 도구에서 발견하고 막은 우회

upstream 기본 경로에는 Codex/Gemini의 yolo 및 Claude 권한 생략 인자가 있고, 회의용 one-shot과 HTTP/API 실행기는 일반 worker spawn을 우회했다. 원본 context/CLAUDE.md 생성, skill 설치, 자동 merge/push·영상 원본 복사도 별도 경계가 필요했다.

정책 모드에서는 다음처럼 동작한다.

| 경로 | 처리 |
|---|---|
| task run | 작업에 묶인 승인과 실행 잠금 검사 |
| 직원 direct spawn | 차단, 승인된 task run 경로만 사용 |
| 자동 위임 시작 | 승인 확인 전에 상태 변경·원본 작업을 시작하지 않음 |
| one-shot 회의/채팅 | 현재 차단. 별도 승인된 제품 검토 경로로 재설계 전 직접 모델 호출 금지 |
| API/OAuth 공급자 | 최종 execute 함수에서 차단. 현재 검증 범위는 Codex 작업 실행기만 |
| generic CLI args | 정책 모드에서는 차단. 전용 Codex 인자만 사용 |
| 자동 merge·push/PR | 개발 실행 승인과 별개로 차단. 읽기 전용 diff 기능은 유지 |
| Git clone·skill 설치·self-update API | 임의 실행 경로 차단. 프로젝트 등록 도구/검토한 운영 절차를 사용 |
| video pack·원본 산출물 복사 | 승인 대상 pack을 제한하고 원본 복사·자동 skill 설치도 차단 |

기존 사무실 worker 환경은 process.env 전체를 전달했지만, 정책 worker는 기본 언어/경로/프록시/CA 등 허용 목록만 전달한다. 사무실 API 토큰·암호화 키·운영자 키·외부 모델키·기존 Codex 설정용 환경을 그대로 넘기지 않는다. 프로젝트의 .codex 설정도 차단해 로컬 MCP 설정을 통한 우회 가능성을 줄인다. 알 수 없는 프로젝트·경로·인증 HOME·공급자·OS 격리 실패는 허용으로 대체하지 않는다.

## 3. 파일·실행 격리

실제 worker 앞에 Linux bubblewrap을 둔다. 필요한 OS 실행 파일/라이브러리/CA와 해당 프로젝트 source만 읽기 전용으로 보이고, 개발일 때 승인된 worktree만 추가로 쓰기 가능하다. 사무실 runtime .env·DB·다른 프로젝트·승인 인계서 파일은 이 파일시스템에 포함하지 않는다.

실제 사용자 HOME을 공유하지 않는다. 새 임시 HOME을 마운트하고 독립 인증 폴더의 auth.json만 읽기 전용으로 넣는다. 캐시/세션은 임시 HOME에 쓸 수 있으나 호스트 인증 파일은 변경할 수 없다. HOME/CODEX_HOME 환경의 기존 값을 새 저장 경로로 바꿔 원래 설정을 덮어쓰지 않는다. 전역 MCP/config를 복사하지 않고 source/worktree/조상의 .codex 설정을 발견하면 거절한다.

Codex에는 read-only/product 또는 workspace-write/development, 도구 네트워크 차단, tmp 예외 제외, multi_agent 비활성화 인자를 지정한다. 모델 통신용 runner 네트워크와 Codex 명령 도구의 네트워크 제한은 서로 다른 층이다. 이번 OS smoke는 고정 셸로 파일 마운트를 확인한 것이며 실제 Codex 도구 네트워크/로그인·모델 실행 전체를 검증한 것은 아니다.

## 4. 현재 실제 구동 상태

- host 내부 `http://127.0.0.1:8790`, health200.
- `enabled:true`, `workersEnabled:false`, `ownerConfigured:true`, `automaticMerge:false`, `unscopedExecution:false`.
- 실제 사무실 업무0·승인0·연결된 직원 모델0 유지. 테스트 승인과 가짜 인증 파일은 임시 fixture에만 만들고 지웠다.
- 독립 사무실 DB의 변경 전 백업은 /workspace/ai-office/state/pre-policy.sqlite에 보존했다. 원래 duckduck DB·암호화 키·인증·복구 bundle은 건드리지 않았다.
- 기본 도구 샌드박스 내부에서는 bwrap uid-map 생성이 read-only 오류로 실패했다. 호스트 권한 경로에서는 기본 namespace 검사와 실제 파일 격리 smoke가 모두 통과했다. 따라서 사무실 서버도 검증된 호스트 경로로 정상 교체했으며 모델 실행 잠금은 그대로 둔다.
- 실제 모델 인증, 표준 Codex 실행의 전체 호환성, 실제 응답·모델 도구 정책은 다음 검증 대상이다. OS smoke 성공만으로 직원이 실제 일한다고 보고하지 않는다.
- Figma·덕 앱 UI·현재 브리핑/날씨·Duo는 이번 작업과 무관하며 변경하지 않았다. DAYWIT/추가 프로젝트는 주소 제공 후 별도 등록한다.

## 5. 사용 순서 — 별도의 승인 기록

일반 업무 화면에서 프로젝트·담당자를 지정하고 문제/목표를 적는다. source와 HANDOFF.md를 먼저 대조하며, 제품 검토와 개발 작업은 별개 작업/승인이다.

```sh
# 실제 값/키는 출력하지 않고 상태만 확인
node scripts/ai-office-approval.mjs status

# 현재 작업 내용을 승인용 digest에 고정
node scripts/ai-office-approval.mjs prepare <task-id> product

# 사용자에게 범위와 인계서 내용을 보여주고 승인받은 뒤에만
node scripts/ai-office-approval.mjs approve <task-id> <exact-digest> --confirm

# 실행 전 승인 철회
node scripts/ai-office-approval.mjs revoke <task-id>
```

개발 작업은 HANDOFF.md에 승인된 목적·변경 범위·정책·화면/토큰·예외·완료 조건·승인 버전/일시를 기록한 다음 `prepare <task-id> development`로 고정한다. 제품 단계 승인으로 개발 작업을 실행할 수 없다. 운영자 키는 로컬 사무실 보안 설정에서만 읽으며 도구 출력·채팅·문서에 값이 나오지 않는다.

**현재 위 승인 명령을 사용해도 workersEnabled:false이면 직원이 시작되지 않는다.** 정상 인증과 작은 격리 작업 검수를 통과하기 전 이 잠금을 해제하지 않는다. 실패한 실행/변경된 인계서에 이전 digest를 반복 사용하지 않는다.

## 6. 장애·회수·재시작

- pending/approved는10분이 지나면 만료된다. 새로 미리보기/확인을 받아야 한다.
- running인 작업은 prepare/revoke로 초기화하지 않는다. 기존 stop 절차로 프로세스를 먼저 중단하고 종료 결과를 확인한다. 승인 철회가 이미 실행된 외부 결과를 되돌린다는 보장은 없다.
- 서버 crash 후 running이 남으면 자동 approved로 복구하지 않고 잠긴 상태를 유지한다. 실제 프로세스 잔존 여부를 확인한 뒤 운영자가 실패 처리해야 한다. 안전한 자동 장애 복구는 추가 검토 대상이다.
- sandbox 생성이 불가능한 환경에서는 실제 실행을 실패로 중단한다. yolo·권한 생략·격리 해제로 우회하지 않는다.
- macOS/Windows 또는 HOME 내부 프로젝트 등 다른 배치에는 현재 Linux 마운트를 그대로 일반화하지 않는다. 별도 검증한 격리 실행기를 준비해야 한다.
- 원본 저장소로의 commit/push·배포는 worker 작업 승인이 아니라 사용자 최종 검수 이후의 별도 단계다.

## 7. 검증·재현 기록

- 사무실 API 테스트237개 통과: 기존203개와 신규 정책/훅/실행 경계34개. 실제 모델 API를 호출하지 않는 모의·격리 테스트다.
- TypeScript/Vite production build 통과. 기존 큰 chunk 경고는 남으며 빌드 실패는 아니다.
- 실제 파일 마운트 smoke 통과(가짜 Git/DB/인증 + 고정 셸): 제품 source 읽기/쓰기 차단, 다른 프로젝트/사무실 .env/DB 비노출, 승인 개발 worktree만 쓰기, 원본·공용 Git 메타데이터 쓰기 차단, 임시 HOME 캐시 허용/인증 파일 쓰기 차단.
- 실제 서버에서도 승인 없는 run·direct spawn·inbox·merge·clone·skill install·운영자 키 없는 승인 요청이 거절됨을 확인했다.
- 검토한 upstream66a24ea 위에 patch가 정확히 적용되고 모든 변경 파일이 일치하는지 별도 clone으로 검증했다. runtime-policy.json에 SHA-256과 로컬 policy commit28baa44를 기록했다. upstream 프로젝트에는 push하지 않았다.

다음 단계는 실제 모델의 안전한 인증과 좁은 검수 작업이다. 이는 아직 수행하지 않았다. 사용자에게 비밀키/비밀번호를 채팅으로 요구하지 않으며 유료 모델/플랜을 자동 활성화하지 않는다.

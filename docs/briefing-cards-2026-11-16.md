# AI 채팅 브리핑·체크·Todo/캘린더 전환 — 2026-11-16

## 현재 구현

사용자 참고의 ‘시간별 브리핑 → 업무 소제목 → 설명과 원본 링크’를 덕 채팅에 적용했다. 큰 작업 카드의 반복을 없애고 한 브리핑 안에 체크 행을 묶었다. 새로 확인한 일/이어서 확인할 일/기한·회신 확인을 나누고, AI가 제공한 짧은 업무 주제로 다시 묶는다. 제목 아래 설명, 날짜와 원본 링크를 함께 표시한다. 긴 설명과 기존 전체 보고서는 명시적으로 펼칠 수 있다. 일반 AI 대화의 Todo/일정 생성 제안도 같은 체크 행을 쓴다. 일반 하단5탭·Duo 카메라 열/반대 캘린더·기존 초안과 세션 경계를 유지한다.

| 조작 | 결과 |
|---|---|
| 체크박스 | 완료로 저장하고 log에 남김. 같은 Todo ID를 재사용 |
| 오른쪽 스와이프 / 더보기의 Todo | Todo로 보관. 이미 보낸 항목은 같은 ID 반환 |
| 왼쪽 스와이프 / 더보기의 캘린더 | 채팅 본문 안 일정 작성 → 날짜·시간·대상 미리보기 → 사용자가 확인한 뒤 한 번 저장 |
| 더보기의 제외 | 채팅 후보에서 제외. 원본 삭제 없음 |
| 날짜·원본 링크 | 근거 확인. 소유자에게 허용된 원본 링크만 열기 |

체크와 Todo 이동은 구분한다. 일정 날짜가 확인되지 않으면 임시 오늘 날짜임을 안내하고 사용자가 고른 뒤 확인한다. 캘린더 권한이 없거나 읽기가 실패하면 ME의 권한 확인 또는 Todo에 먼저 보관하는 대안을 제공한다. 지원 캘린더는 기존 Google 쓰기 경로이며 새로운 Outlook/iCloud 쓰기 연동을 추가한 것은 아니다.

## 같은 일을 다시 추천하지 않기

기존에는 Todo로 보낸 미완료 업무를 다음 브리핑 후보로 다시 모았고, 일반 채팅의 후보 키는 답변마다 달랐다. 이제 소유자별 원본 ref와 정규화한 업무 제목을 기준으로 처리 이력을 저장한다. 완료·Todo 전환·캘린더 저장·제외한 업무는 새 후보에서 제외한다. 기존 원본 연결 Todo도 비교한다. 새 후속 업무는 다른 행동/제목으로 별도 후보가 될 수 있다. 같은 원문에서 나온 여러 독립 업무를 원문 하나라는 이유로 전부 지우지 않는다.

처리된 키를 AI의 현재 허용 자료 범위 안에서 전달하고, 기존 처리 키를 반환한 재표현 제안은 서버에서도 제거한다. 임의의 모든 바꿔 말하기를 영원히 판별한다는 보장은 아니다. 원본 없는 동일 제목의 서로 다른 대화는 무작정 합치지 않는다. 기존 대화에는 역사적 처리 상태를 남기되 다음 브리핑의 새 체크 항목에서는 제외한다. 이미 Todo에 있는 일의 실제 새로운 임박 알림은 중복 체크 후보 없이 안내할 수 있다.

## 저장·복구·개인정보

체크 처리와 첫 Todo 삽입은 같은 트랜잭션이다. 응답 유실·재시작·삭제된 연결 Todo 때문에 같은 일을 자동 재생성하지 않는다. 캘린더는 prepare 잠금과 기존 action ID를 보관하고 unknown/running에서 새 외부 쓰기를 실행하지 않는다. confirm 또는 상태 조회로 성공을 확인한 뒤 처리 완료로 기록한다. 일정 저장 성공은 현재 선택된 해당 캘린더 snapshot에 먼저 반영하고 배경 갱신한다.

대화 기억 OFF에서 체크 기능 때문에 전체 대화를 저장하거나 기억 동의를 대신 켜지 않는다. 30일 만료의 소유자 전용 암호화 제안과, 실제 사용자가 처리한 항목의 최소 제목/ref/상태만 보관한다. 기억 ON의 저장 대화는 기존 owner row로 검증한다. 계정 export에 처리 이력을 포함하고 계정 삭제 cascade를 유지한다. 기존 원가 상한·확인된 정산·이메일 인증·자료 사용 동의와 원본 쓰기 확인은 유지한다. 전체 계정 무료 Pro 제공과 실제 AI 예산은 별개다.

## 직접 조작·검증

실제 Expo UI를 Chromium에서 합성 계정/API와 Duo 기하로 실행했다. 실제 모델·외부 계정 쓰기·UIKit/한글 IME·물리 Duo를 검증한 것으로 표시하지 않는다.

1. 수정 전 [일반형](../artifacts/briefing-cards-2026-11-16/before/01-ordinary-briefing.png): 개별 큰 카드.
2. 수정 후 [밝은 화면](../artifacts/briefing-cards-2026-11-16/after/01-phone-light.png) / [어두운 화면](../artifacts/briefing-cards-2026-11-16/after/02-phone-dark.png): 주제·체크·설명·날짜/출처.
3. [캘린더 저장 전 확인](../artifacts/briefing-cards-2026-11-16/after/03-calendar-preview.png): 미리보기 때 쓰기0, 확인 뒤 쓰기1.
4. [Duo 접힘](../artifacts/briefing-cards-2026-11-16/after/04-folded.png) / [펼침](../artifacts/briefing-cards-2026-11-16/after/05-open.png) / [320px](../artifacts/briefing-cards-2026-11-16/after/06-small.png): 기존 pane/내비게이션과 가로 넘침 검사.
5. [다음 브리핑](../artifacts/briefing-cards-2026-11-16/after/07-next-briefing.png): 처리한 항목 제외, 새 파생 업무와 미처리 업무 유지.
6. [기억 OFF 일반 대화](../artifacts/briefing-cards-2026-11-16/after/08-chat-receipt.png): 체크 행 하나만 표시, 같은 Todo ID 저장.

`mobile/e2e/briefing-cards.mjs`로 위 조작을 통과했다. `test/checklist-transfer.test.js`와 `test/assistant-briefing.test.js`는 실제 인증 API/owner·암호화 제안·큰 본문·반복 요청·재시작·새 파생 업무·캘린더 pending/unknown/성공을 검증한다. 최종 전체 검사 411개 중410통과/실패0/기존 조건부1제외. 타입 검사와 운영 web export를 통과했다. 기존 일정 편집·ME·Todo/원본 실패 복구 흐름26장 검사를 통과했고, 운영 web 번들에서 세션 지연·401·503/재시도·초안 보존·전체 Pro/예산 분리 회귀를 통과했다. 캡처는 ../artifacts/briefing-cards-2026-11-16/regression/ 및 기존 startup-session-2026-11-16에 있다.

## 프로젝트 구성과 빌드 상태

Todo 프로젝트 기능은 [Things·Todoist·TickTick 비교와 제안](todo-project-research-2026-11-16.md)에 정리했다. 이번에는 채팅의 업무 소제목을 적용했으며 Todo 프로젝트/소제목 관리가 출시됐다고 주장하지 않는다. 기존 날짜별/출처별 Todo는 유지한다.

사용자의 ‘빌드하고’는 이번 최신 소스의 새 수동 무료 TestFlight 실행을 승인한다. 기존 공개 GitHub 무료 Mac·workflow_dispatch·동일 서명 고정 정책을 유지한다. paid runner/EAS cloud·push 자동 빌드·옛 run 재실행으로 우회하지 않는다. 소스 병합, CI, Render 실제 deploy, 새 native run/IPA/Apple 제출은 확인된 값만 뒤에 기록한다.

## 캘린더 초안 마지막 검토

원본 calendar.create 제안의 장소·시간대를 초안으로 유지한다. 여러 계정의 같은 primary ID는 connectionId로 구분하고 실제 선택 ID로 매핑하며 모호하면 자동으로 다른 계정을 고르지 않는다. 미리보기를 취소하고 편집으로 돌아와도 장소·로컬 알림/자료 설정을 지우지 않는다. 새 실제 Expo 조작에서 raw primary 제안→계정별 선택 ID→장소 수정→미리보기 취소→다시 확인 뒤 외부 쓰기1회를 통과했다.

## 확인된 게시·빌드 결과

- 구현/이미지 스냅샷: `ee60d065bddd75f6b602263ca2f793f6229f823c`. 인계 생성 `23835c9544801ca173b9376eaee791f7afb696fc`.
- [PR3](https://github.com/thepmpo/donknow/pull/3) 병합: `2ae84a13071fe609e5c0ee911fe1cecf848b48de`.
- [CI43795060119](https://github.com/thepmpo/donknow/actions/runs/43795060119): success. CI411중409통과/실패0/조건부2제외, 사이트 패키징4통과, 타입/native 구성/iOS JS export 성공. 로컬은410통과/조건부1제외로 환경별 제외 수가 다르다.
- 기존 무료 Render의 새 수동 deploy: `dep-dbt727k9v7es73ccsgtg`, 정확한 소스는 위 병합 SHA다. 실제 최종 상태는 아래 추가 기록을 참조한다. 자동 배포 OFF·같은 무료 서비스/설정/데이터 유지.
- 2026-11-16 02:57 UTC의 새 native 요청: `gh workflow run ios-testflight.yml --ref main --repo thepmpo/donknow`가 **`Get https://api.github.com/repos/thepmpo/donknow/actions/workflows/ios-testflight.yml: Forbidden`**으로 거부됐다. POST dispatch 전 워크플로 조회가 거부되어 이번 요청의 새 run/IPA/Apple 제출은 시작되지 않았다. 이는 앱 컴파일 실패와 다르다. 연결 도구에도 dispatch 기능이 없어 자동 native 트리거나 다른 자격 증명으로 우회하지 않았다.
- 빌드를 시작하려면 [수동 빌드 화면](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml)에서 **Run workflow → main → Run workflow**를 실행한다. 실패한 이전 run의 Re-run은 쓰지 않는다. 이 문서의 상태 기록만 추가된 이후 main도 같은 구현 코드를 포함한다.
- 현재 일반형 확인은 [웹앱](https://duckduck-test.onrender.com/app), 소개·요금은 같은 사이트의 `/`다. Linux의 직접 공개 HTTP 검사는 CONNECT tunnel403으로 차단됐으며 이를 운영 앱의403 오류로 단정하지 않는다. Render 공식 최신 deploy/health Markdown·HTML 조회도 같은 이유로 불가했고, 기존 설정/연결 도구의 실제 상태와 startup 로그로 확인한다.
- 운영 AI의 기존 `credit_balance_exhausted`를 이 UI 수정으로 해결하거나 실제 모델 품질/실계정 원본 쓰기를 검증한 것으로 표시하지 않는다. iOS 실제 키보드·제스처·IME·VoiceOver와 실기기 설치 검수는 별도다.


### 최종 보완본·실제 live 확인

- 계정/장소 보완 구현 스냅샷 `60959e8`, 인계 생성 `984ead8d6a3d229c1d89e4dac46e592058cd3a75`.
- [PR4](https://github.com/thepmpo/donknow/pull/4) 병합 소스 **`01bda44b07ab178c28ba01180bca99162cacf807`**. [보완 CI43795817587](https://github.com/thepmpo/donknow/actions/runs/43795817587)와 [최종 main CI43796008462](https://github.com/thepmpo/donknow/actions/runs/43796008462)는 모두 success다.
- 최종 deploy **`dep-dbt760nj5k9c73fauiag`**, 위 병합 소스와 일치, **2026-11-16 03:12:52 UTC / 12:12:52 KST에 live**. 실제 `Donknow listening on port 10000` 로그03:12:44 UTC와 `Your service is live` 로그03:12:53 UTC를 확인했다. 무료 서비스와 수동 배포 정책을 유지한다.
- 최초 deploy는 시작 단계가 길어 포트 탐색 경고가 있었지만03:11:53 UTC에 실제 live가 됐다. 최종 보완본은 그 뒤 순서대로 배포돼 최초 버전을 deactivated로 대체했다. 원인을 확정하지 않고 컴파일 실패로 잘못 보고하지 않는다. 반복 트리거/유료 전환은 하지 않았다.
- native 실행은 위 Forbidden 이후 새로 시작됐다고 주장하지 않는다. 앱 빌드와 운영 web 배포는 다르다. 최신 main의 수동 TestFlight 실행과 실기기 설치가 필요하다.
- 이 마지막 절은 실제 실행 종료 뒤 추가한 저장소 기록이다. 배포된 공개 인계의 구현 스냅샷과 앱 코드는 같고, 상세 결과의 최신 원본은 이 문서다.

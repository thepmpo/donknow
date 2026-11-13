# 덕 기능 검증·빌드 절약·UX/UI 작업 순서 — 2026-11-12

> 2026-11-13 후속: 사용자가 명세 대기를 해제해 [예약 브리핑·날씨](scheduled-messages-2026-11-13.md)를 구현하고 Duo를 상단 오른쪽으로 정정했다. [최신 기능 진행](functional-completion-2026-11-13.md)을 우선한다. 네이버SMTP는 Render Free 차단으로 별도 호스트 결정이 필요하다. 아래의 문서 대기는 당시 기록이다.

사용자는 앞서 안내한 남은 작업을 추천 순서로 진행하고 **출시 준비는 마지막**에 하도록 요청했다. 현재 앱의 UX/UI 부족한 부분도 확인하도록 요청했고, 브라우저 연결 도구가 없는 상태에서 테스트용 Chromium과 모의 자료로 화면을 캡처하는 방법을 명시적으로 승인했다. AI 사무실은 보류한다. 브리핑·날씨의 예약 메시지 명세는 여전히 사용자 후속 문서 대기이며 임의 변경하지 않는다.

## 후속 UX/UI 수정 — 같은 날

사용자 후속 지시로 감사10개와 편집창 저장 가림을 수정했다. [현재 구현·19개 화면·검증](ux-ui-fixes-2026-11-12.md)을 우선한다. 외부 쓰기 권한을 자동 승인하지 않으며 아래 계정별 가동 순서는 유지한다.

## 이번에 완료한 작업

| 항목 | 실제 결과 | 확인하지 않은 범위 |
|---|---|---|
| TestFlight 빌드 절약 | ios-testflight는 workflow_dispatch만 남김. 앱 코드를 push해도 이 workflow가 새 EAS 빌드를 요청하지 않음 | 사용자가 직접 실행하는 빌드는 여전히 한도 사용 |
| 자동 품질 검사 | app-checks가 코드 push/PR에서 문법·단위/API·타입·iOS JS 묶음 검사를 수행. EAS 빌드 명령·Expo 비밀 토큰이 없음 | iOS JS 묶음 검사는 Swift/IPA 빌드가 아님 |
| AI 후보→Todo 저장 | 실제 임시 서버·인증·DB에서 후보→초안→확인 후 저장 검증. 다른 계정 거부·재확인 중복 없음 | 모델 응답은 모의. 운영 사용자 계정에 직접 Todo를 추가하지 않음 |
| 모바일 UX/UI | 최신 코드의15개 화면/단계를 새로 캡처·열람하고 개선10개를 근거와 우선순위로 정리 | 운영 데이터·전체 실기기·스크린리더 검수 아님 |
| 로그인 보호 | 시작/늦은401/늦은프로필의 이전 계정 응답 격리 회귀 통과 | 모든 실제 사용자 기기의 로그인 환경 |
| Duo | 접힘·펼침·책·테이블·일반기기 fallback의 탭·초안·편집·스크롤·컴포넌트 유지 회귀 통과 | Swift 컴파일과 Duo 실기기 |
| 외부 연동 준비 | 실제 코드의 읽기/쓰기 승인 버튼과 공급자 요청 경계를 점검. Slack 등록용 manifest 준비 | 앱 설치·OAuth 동의·메일 발송·실제 외부 쓰기를 대신 실행하지 않음 |
| Figma | 기존 화면 메타데이터를 새 세션에서 재확인 | 후속 요청이 Starter 도구 한도에 막혀69개 교정·Current baseline/Proposed 분리는 미완료 |

## 쉬운 사용 순서

일상 작업은 코드를 저장하고 자동 검사 결과를 확인한다. **아이폰에 설치할 버전이 필요할 때만** [iPhone TestFlight workflow](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml) → **Run workflow** → **main** → **Run workflow**로 한 번 실행한다. 이 작업은 EAS 빌드1회를 요청할 수 있으므로 일반적인 코드 검사 용도로 누르지 않는다. 이번에는 새 TestFlight 빌드를 요청하지 않았다.

[자동 검사](https://github.com/thepmpo/donknow/actions/workflows/app-checks.yml)는 Expo의 원격 iOS 빌드 횟수를 사용하지 않는다. Expo 월 사용량은 [Billing](https://expo.dev/settings/billing) → **Usage**에서 확인한다. 빌드 번호15를 이번 달 사용량15회로 계산하지 않는다.

## 계정·기기에서 사용자 승인이 필요한 항목

비밀 키·앱 비밀번호·OAuth 코드·인증번호는 채팅에 보내지 않는다. 아래의 외부 계정 승인과 OS 권한은 사용자가 해당 공식 화면에서 직접 수행해야 한다.

### Google

[덕](https://duckduck-test.onrender.com/) → **내정보** → **Google** → 기본 읽기 선택 → **추가 읽기·쓰기 권한 (선택)**을 펼쳐 필요한 권한 선택 → **연결 권한 다시 선택**(미연결이면 **Google 연결**) → 공식 Google 동의 → 덕으로 돌아와 **연결 상태 새로고침** → **연결 점검**.

현재 화면의 쓰기 항목은 **메일 읽음·상태 수정**, **메일 발송**, **일정 작성·수정**, **덕이 만들거나 허용한 Drive 파일 수정**, **Google Tasks 수정 권한 (선택)**이다. 필요한 것만 고른다. Google 원본 완료 동기화는 별도로 켜야 하며 쓰기 승인이 자동 발송·자동 동기화 동의가 되지는 않는다.

### Notion

덕 → **내정보** → **Notion** → **추가 읽기·쓰기 권한 (선택)** → **Notion 페이지 작성·수정** 선택 → **연결 권한 다시 선택 / Notion 연결** → 공식 승인 화면에서 대상 페이지 공유 → 덕의 **연결 상태 새로고침**. Notion 앱 관리에서 콘텐츠 추가·수정도 허용해야 한다. [공식 연결 관리](https://www.notion.so/my-integrations). 이 채팅의 Notion 문서 기록 연결은 덕 앱의 쓰기 승인을 대신하지 않는다.

### Slack

공개 상태에서 OAuth 앱 설정이 없던 항목이다. [Slack 앱 관리](https://api.slack.com/apps) → **Create New App** → **From a manifest** → 워크스페이스 선택 → [준비한 JSON](https://github.com/thepmpo/donknow/blob/main/tools/integrations/slack-app-manifest.json)을 입력하고 권한 검토 후 앱 등록/설치를 진행한다. 실제 Slack의 화면 이름이 다르면 그 공식 화면을 기준으로 한다.

이 템플릿은 현재 서버가 요청하는 채널 읽기·기록과 `chat:write`만 포함한다. 관리자·사용자 가장·공개 채널 전체 강제 발송 권한을 추가하지 않는다. 비공개 채널은 bot에 실제 접근 권한이 있어야 한다. Client ID/Client Secret은 [Render 환경 설정](https://dashboard.render.com/web/srv-dbgpc0ff3r2c73abc7e0/env)에 `SLACK_CLIENT_ID`·`SLACK_CLIENT_SECRET`으로 직접 등록하고 보존한 뒤 반영 배포가 필요하다. 기존 DB/OAuth/암호화 키는 재생성하지 않는다. 그 후 덕 **내정보 → Slack → 추가 읽기·쓰기 권한 (선택) → Slack 메시지 보내기·덕 메시지 수정 → Slack 연결**에서 승인한다.

JSON 문법과 서버 요청 scope/redirect 일치는 로컬 검증했다. Slack 실등록·설치·manifest 서버 검증·실계정 쓰기 성공으로 표시하지 않는다. [공식 manifest 필드](https://docs.slack.dev/reference/app-manifest/).

### 네이버 메일

네이버 계정에서 IMAP/SMTP 사용과 앱 비밀번호 발급 조건을 확인한다. 덕의 **duckduck → 도구 → 비서 → 네이버 메일 연결 설정**을 열고 주소와 앱 비밀번호를 앱 안에 직접 입력한다. 서버 `NAVER_MAIL_ENABLED` 설정이 필요하며 실제 활성 여부는 별도 확인이다. 앱 비밀번호를 채팅에 보내지 않는다. [네이버 메일](https://mail.naver.com/) / [네이버 계정 보안](https://nid.naver.com/).

### 아이폰 권한

아이폰 앱에서 **내정보 → 아이폰 미리 알림 가져오기**를 누르고 OS 권한을 허용한다. 알림은 **이 기기의 할 일 알림**을 켜고 OS 허용을 선택한다. 웹 브라우저에서 OS 미리 알림/로컬 알림 권한을 대신 받을 수 없다. 기존 미리 알림을 실제로 변경할 때는 앱의 확인 단계를 따른다.

## 다음 순서와 완료 기준

1. 위 외부 계정/기기 권한을 받은 항목부터 실제 원본과 앱 결과를 대조한다. 원본 변경·메일 발송은 초안을 보고 사용자가 실행한다.
2. [UX/UI 수정](ux-ui-fixes-2026-11-12.md)의 실제 사용을 확인한다. 기존 감사10개와 저장 가림은 구현/격리 검증했으며 iPhone의 키보드·큰 글자·스크린리더는 추가 확인한다.
3. Figma 한도가 풀리면 원본69개를 보존하며 확인한 Current baseline과 Proposed를 분리한다. 미확인 화면을 검증 완료로 표시하지 않는다.
4. iPhone·Duo·키보드·큰 글자·권한·실사용을 한 번에 묶어 설치 버전으로 검수한다.
5. **출시 준비는 마지막**: 개인정보 최종 조건·스토어 정보·심사 자료·실제 심사 제출을 그때 진행한다. 자동 심사 제출이나 공개 출시를 이번에 수행하지 않는다.

이번 작업의 실검사와 GitHub/Render 반영 결과는 Notion 작업 기록과 공개 /project에서 구분한다. 계정 승인 대기·Figma 한도·기기 검수를 코드 구현 완료라는 말로 덮지 않는다.

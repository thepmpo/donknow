# iPhone 첫 출시 준비

2026-10-30 사용자가 iPhone App Store 출시를 요청했다. AI 연결은 계속 보류한다.

## 현재 상태

- Expo 앱 버전 1.0.0, iPhone 전용, 초기 빌드 번호 1.
- Bundle ID 후보: `com.sjfieni.duckduck`. 저장소 소유 이름을 기준으로 한 설정값이며 Apple 등록·사용 가능 여부는 확인 전이다. 실제 개발자 계정에서 소유권을 확인한 후 최초 등록한다.
- EAS production: App Store 배포, 자동 빌드 번호 증가, 기존 HTTPS 서버를 기본 연결로 포함. 서버 키·비밀값은 앱에 넣지 않는다.
- production 빌드가 자동으로 심사 제출되거나 공개되지는 않는다.
- Expo 웹 프로젝트는 사용자가 생성했다: `thepmpo/duckduck-donknow`, Project ID `f7827732-1b41-485f-b3b2-6bcc145f3c44`. 사용자 제공 식별자를 `mobile/app.json`의 owner와 extra.eas.projectId에 반영했다. 원격 계정 접근 권한은 별도 확인이 필요하다.
- 첫 서명 IPA 생성과 App Store Connect 업로드는 사용자 확인까지 완료했다 (아래 2026-11-02 기록). 최신 디자인/모션은 새 빌드가 필요하며, 실제 TestFlight 설치·심사·공개는 아직 미확인이다. 이 작업 환경에서는 Expo API가 403으로 차단돼 직접 계정 작업을 하지 못했다.

## 계정 연결 후 실행

`mobile/`에서 Expo 계정으로 로그인하고 올바른 Apple 개발자 팀을 선택한다. 비밀번호·OTP·서명 파일을 채팅이나 Git에 넣지 않는다. Apple Developer Program 가입은 일반적으로 연 US$99(지역별 가격 상이)가 필요하다. EAS 무료 빌드 할당량·대기열을 확인하며 유료 업그레이드를 자동으로 진행하지 않는다.

```sh
npx eas-cli@latest login
npx eas-cli@latest init --id f7827732-1b41-485f-b3b2-6bcc145f3c44
npx eas-cli@latest build --platform ios --profile production
```

`eas init`으로 연결된 실제 프로젝트 ID·owner를 저장하고 빌드하기 전에 Bundle ID를 확인한다. 기존 팀이나 인증서가 있으면 재사용 여부를 확인하며 임의로 폐기하지 않는다. App Store Connect에 실제 앱 레코드를 만든 뒤 반환된 App Store 앱 ID를 `eas.json`의 `submit.production.ios.ascAppId`에 추가한다. Apple 팀 ID도 확인 후 필요한 위치에 설정한다. 임의 숫자/플레이스홀더 ID를 넣지 않는다.

```sh
npx eas-cli@latest submit --platform ios --profile production --id BUILD_ID
```

실제 성공한 빌드 ID를 지정한다. `--latest`로 다른 빌드를 잘못 제출하지 않는다. 업로드 후 TestFlight 실기기 확인을 먼저 수행하고 App Store Connect에서 심사를 제출한다. 심사 승인 후 공개 시점은 수동으로 관리한다.

## 심사 전 필요한 내용

- 공개 개인정보처리방침 URL, 지원 URL, 실제 지원 연락처와 운영 주체. 현재 `/project`는 개발 문서이며 개인정보처리방침을 대신하지 않는다.
- App Store용 아이콘과 실제 iPhone 스크린샷. 웹/모의 응답 이미지를 실기기 캡처로 표시하지 않는다. 현재 기본 리소스는 최종 브랜드 검토 전이다.
- App Privacy: 이메일/계정 식별자, 사용자 생성 할 일·공개 댓글, 사용자 승인 외부 자료의 수집·목적·사용자 연결 여부를 실제 동작에 맞게 신고한다. 추적/광고 기능은 현재 구현하지 않았다. 수집하지 않는 항목을 선언하지 않으며 실제 Apple 질문에 맞춰 확인한다.
- 암호화 수출 신고, 연령 등급, 콘텐츠 권리, 지원 지역, 앱 이름 사용 가능 여부를 실제 계정에서 확인한다.
- 이메일·비밀번호 로그인과 앱 내 계정 삭제를 제공한다. Google/Notion은 외부 자료 연결이며 앱 로그인으로 쓰지 않는다. 인증 방식을 바꾸면 Apple 로그인 관련 심사 요건을 다시 확인한다.
- 심사용 접근 계정은 별도로 만들고 실제 개인 자료·토큰이 없는 계정을 사용한다. 계정 정보는 App Store Connect 심사 메모의 전용 보안 입력란에만 넣는다.
- AI 미연결 상태를 숨기거나 AI 대화가 동작한다고 소개하지 않는다. Slack 보류 기능도 동작하는 기능처럼 홍보하지 않는다.
- Google OAuth 테스트 모드/테스트 사용자 제한은 일반 사용자 출시와 다르다. 일반 사용자 권한 승인 가능 여부와 민감 범위 검증을 확인하고, 준비가 안 된 연결은 최초 공개 범위에서 제외할지 결정한다. Notion도 다른 사용자 계정 승인을 확인한다.
- Render 무료 서버 휴면 후 첫 응답 지연과 무료 한도는 유지된다. 빌드가 된 것만으로 운영 안정성이 검증됐다고 판단하지 않는다.

## TestFlight 실기기 확인

가입·이메일 인증·재로그인·삭제, Todo 스와이프/4초 되돌리기/log, 전체 캘린더, 앱 재실행, 네트워크 끊김/복구를 확인한다. Google/Notion OAuth 승인 후 `duckduck://` 복귀, 완료 동기화, 미리 알림 거절/허용/가져오기/수동 상태 반영, 기기 알림 및 완료/로그아웃 후 예약 취소, JSON·카카오 공유도 확인한다. 타 계정 로그인 시 이전 데이터가 사라지는지 확인한다.

JavaScript iOS export는 호환성 검증이며 서명 IPA·실기기 검증을 대신하지 않는다.

Expo에서 GitHub 저장소를 연결하는 경우 저장소는 `sjfieni/donknow`, 앱 루트는 `mobile`, 브랜치는 `main`이다. 프로젝트 ID 설정만으로 GitHub 연결·서명 인증·빌드 실행이 완료된 것으로 기록하지 않는다.

## 2026-11-02 사용자 확인 — 첫 빌드와 업로드

사용자가 Codespaces에서 EAS 로그인과 Apple 서명 인증서/프로비저닝 프로필 설정을 진행했다. `production` iOS build `37a454bf-afdf-49aa-ab21-70fec36ba28a` (커밋 `400e9d5`)의 finished 및 IPA 생성을 확인했고, EAS Submit의 App Store Connect 업로드 성공 메시지를 공유했다. App Store 앱 ID는 `6829597261`이다. TestFlight 처리/설치·심사·공개 출시는 아직 확인되지 않았다. 이번 TDS 디자인 적용은 그 빌드 이후 변경이므로 새 iOS 빌드가 필요하다. 이 환경의 Expo API는 403으로 직접 계정 작업이 막혀 있어 사용자 실행 결과와 에이전트 직접 검증을 구분한다.

## 웹 자동 제출 오류 수정

웹 자동 제출은 대화형으로 앱을 고를 수 없어 `submit.production.ios.ascAppId`가 필요하다. 기존 Store 앱 ID `6829597261`을 프로필에 고정했다. 실패한 build `12e5cc38-1cb8-438c-aa9c-1887e2fd6666`의 동일 커밋 Retry 대신 최신 main으로 새 빌드를 시작한다. 이 수정은 제출 설정 보완이며 아직 새 빌드/업로드 성공 증거가 아니다. 기존 CLI 빌드에서 선택한 표준/면제 암호화는 `ios.infoPlist.ITSAppUsesNonExemptEncryption=false`로 기록했다.

## SDK 의존성 검사 로그

build `96d90e45-22aa-41f7-8cd0-9f0c421cd7de`에서 보고한 peer/패치 불일치를 수정했다: expo 58.0.22, 알림 58.1.7, RN 0.88.1, expo-font 직접 선언 58.0.11. 잠금 파일도 함께 갱신했다. expo doctor의 단일 단계 실패 로그를 전체 빌드/업로드 성공 여부와 혼동하지 않는다. 빌드 Finished와 자동 제출 성공은 각각 확인해야 하며, Submission이 없다면 웹 시작 화면의 EAS Submit 체크와 production 제출 프로필을 확인한다. Expo API가 막힌 이 작업 환경에서는 모든 온라인 doctor 항목 통과를 주장하지 않는다.

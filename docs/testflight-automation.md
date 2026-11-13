# iPhone 테스트 수동 빌드·자동 제출

## 최신 실제 확인 — 1.0.0(27) Apple 업로드 성공·이번 viewport/캐시는 이후

사용자가 시작한 [43494093136](https://github.com/thepmpo/donknow/actions/runs/43494093136), 소스a61740efe9e333b8a602eb843ba418556f78c323의 validate132122527370/build-and-submit132123027330 모두success를 연결도구로 확인했다. 로그에서26→27 증가·앱버전1.0.0·buildNumber27, 서명IPA 생성2026-11-13 19:47:29 UTC(11/14 04:47:29 KST), Apple 업로드19:59:32 UTC(11/14 04:59:32 KST) 성공이다. [제출 상세](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/submissions/210e181e-ff6d-44e8-a037-e42cbdb044c2). Apple 처리·TestFlight 표시/설치·기기 검수는 별도다.

27에는e2c853b의 첫 캘린더 정리가 포함되지만 **c4eebbd의이번 스크롤/화면 채우기·Today/보기 순서·먼저 표시 후 갱신은 없다**. 이번 수정은 새main 빌드가 필요하다. 이 채팅에서 새dispatch는 시작하지 않았고 현재권한 Forbidden을 우회하지 않았다. 이전 ‘최신26’은 당시 관찰 이력이다.


## 2026-11-13 후속 — viewport·버튼·캐시도 새 native 빌드 필요

[이번 수정](calendar-viewport-2026-11-13.md)은 기존26과 e2c853b 이후다. 원격maina61740e(일일문서 자동갱신 포함)를 fetch해 보존했다. 사용자의 직전 ‘빌드해’에 기존 플랫폼 인증으로 workflow GET/POST dispatch를 시도했으나 둘 다 `Forbidden`이었고 새 run은 만들어지지 않았다. 연결 도구에도 새 dispatch가 없어 개인토큰 요청/권한 우회/구26 Re-run은 하지 않았다. 이번 단위·웹·iOS JS 검사는 새 IPA/Apple 업로드가 아니다. 최신main에서 사용자가 Run workflow→main→초록 Run workflow로 새 실행하면 이 앱 수정이 포함된다. 이전 실행이 이미 진행 중이면 소스SHA를 먼저 비교하고 중복 요청하지 않는다. 무료 표준Mac·서명freeze·수동정책 유지.


## 2026-11-13 — 26번 이후 새 캘린더 수정·새 빌드 미실행

[코드e2c853b의 현재 계약](calendar-refinement-2026-11-13.md): 본문 도구/status 정리·월별 필요 주·2주 확대·주말 숫자·전체 상단 dim/배경닫기/시트 모션·연동 안정성. 단위/타입·웹/iOS JS·격리 UI/Duo/계정 검사 통과는 실제 IPA/Apple 업로드가 아니다. **현재 TestFlight26에는 이번 수정이 없으며 이 작업에서 새 native 빌드를 시작하지 않았다.** 다음 ‘빌드해’ 요청 때 최신 main의 workflow_dispatch를 한 번만 시작하고 Run SHA/실제 번호/서명/Apple 업로드·처리·설치를 분리한다. 유료/자동 push 빌드/기존 서명·권한 재생성은 하지 않는다. 아래26 성공은 이전 소스의 실제 결과다.

## 2026-11-13 최신 확인 — 1.0.0(26) native·Apple 업로드 성공

사용자가 직접 시작한 [43408230557](https://github.com/thepmpo/donknow/actions/runs/43408230557)·소스2a7aa82d0940d89c594cfebbc5db7cbe3da94dbf를 플랫폼 연결 도구로 확인했다. validate131827799528·build-and-submit131828123539 모두success, 실제 버전 **1.0.0(26)**다. **서명 IPA 생성2026-11-13 10:27:56 UTC/19:27:56 KST**, **Apple 업로드10:28:25 UTC/19:28:25 KST 성공**이다. [EAS 제출 상세](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/submissions/7b09c2b0-f3cd-4d8d-84e6-2aeb5a553b41).

083192e의 Apple 참고 Calendar·시스템 밝게/어둡게·서버 응답 수정이 포함된다.25번에는 없다는 이전 설명은 역사이고26번을 확인한다. Apple 처리 완료/TestFlight26 표시·사용자 설치·실기기/실계정 Google 오류 해소는 별도 미확인이다. 이 사이트 작업 중 새 native 빌드를 요청하거나 자동 push 빌드를 켜지 않았다. 사이트 웹 프로토타입과 iPhone 앱 빌드는 별개다. 아래 ‘새 빌드 없음/권한 차단’은 당시 상태이며 최신 성공을 덮지 않는다.

## 2026-11-13 — 새 캘린더 빌드 요청·실행 권한 차단

사용자가 “오류 확인된 거면 빌드해”라고 요청했다. 서버 응답 처리의 확인된 코드 문제는 수정/검증했고, **실제 사용자 Google 계정의 오류 원인은 아직 재현하지 못했다**고 구분해 안내했다. 원격main43e06a8을 fetch했으며 공개 health의 `ok:true / calendarWorkspace:2 / release:43e06a883eb60b503fe829e138f309839c7ecd52`를 다시 확인했다. 단위246통과·타입/웹/iOS JS·UI 회귀와 실제43e06a8 원격검사43406903820 성공은 이전 검증 영수증이다. 이번에 새 IPA를 만든 것은 아니다.

플랫폼 기존 인증으로 새 main 실행을 시도했다. 정확한 오류는 아래와 같다.

```text
Get "https://api.github.com/repos/thepmpo/donknow/actions/workflows/ios-testflight.yml": Forbidden
Post "https://api.github.com/repos/thepmpo/donknow/actions/workflows/ios-testflight.yml/dispatches": Forbidden
```

읽기 전용 Actions 목록에서 마지막 수동 iPhone 실행은43394742649·1643e0c·완료/success임을 확인했다. 이번 요청으로 새 run/버전/IPA/Apple 업로드는 만들어지지 않았다. 이전25번의 재실행은 새 UI를 포함하지 않으므로 실행하지 않는다. 새 개인 토큰/로그인 비밀번호를 요구하거나 권한을 우회하지 않는다. 자동 push 빌드·유료 runner·Expo cloud fallback도 켜지 않는다.

[새 main 무료 빌드 화면](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml) → **Run workflow → Branch: main → 초록 Run workflow**를 한 번 누르면 기존 무료 GitHub Mac·동일IPA 제출 경로로 시작한다. 사용자PC는 켜둘 필요 없다. 화면 열기는 queued 응답이므로 실제 표시/클릭 성공으로 기록하지 않는다. 실행이 시작되면 새 run의 SHA·validate·native/서명·Apple 제출·처리/설치를 각각 확인한다. 데이터/인증/서명·무료 플랜·원본bundle은 보존했다.

## 2026-11-13 최신 — Apple 참고 Calendar 수정은25번 이후

[083192e의 현재 UI·서버 응답 계약](calendar-apple-reference-2026-11-13.md)을 우선한다. 년·월 본문 우상단·Duo Today 독립·시스템 밝게/어둡게·새 상세와 Calendar 응답 보강은 이전25번 앱에 없다. 웹/iOS JS·회귀 통과와 실제 native 빌드/Apple 처리/아이폰 설치는 구분한다. 이번 수정에서 새 TestFlight를 자동 실행하지 않았으며 실제 계정 오류 원인은 아직 재현하지 못했다. 다음 native는 최신main 새 수동 실행이어야 하고 옛25 job을 Re-run해 새 UI가 생긴다고 하지 않는다.

> **현재 구현 기준:** [전체 이어받기 기준서](continuation-guide.md) → [Liquid Glass 상태·수치·검수](liquid-glass-navigation.md). 아래 날짜별 기록은 당시 이력입니다. 일반 iPhone 하단 capsule·상태별 터치 동작, Duo 카메라 열·64/272/52/28,3초 완료,예약 메시지 문서 대기 해제가 최신이며 이전 설명보다 우선합니다. 구현·웹 검사·native 빌드·실기기 확인은 따로 읽으세요.


## 2026-11-13 최신 성공 — 1.0.0(25)·Apple 업로드 완료

사용자가 추가 약관에 동의했다고 확인한 뒤 연결된 GitHub로 실패job만 다시 실행했다. [43394742649 attempt3](https://github.com/thepmpo/donknow/actions/runs/43394742649/attempts/3)·소스 **1643e0c2b7da2c2e1e34362388dbbd671542b9d0**, [build-and-submit job131801055230](https://github.com/thepmpo/donknow/actions/runs/43394742649/job/131801055230)와 validate 모두 **success**다. 현재main6161372와 앱/서버/ios-testflight workflow 차이가 없는 것을 먼저 비교했다. 성공한validate를 재사용했으며 사용자가 Run workflow를 다시 누를 필요 없이 제가 접수/실행했다.

- 번호24→**25**, 앱 버전 **1.0.0(25)**. **18:29:43 KST(09:29:43 UTC)** 서명 IPA 생성 성공.
- **18:30:18 KST(09:30:18 UTC)** 실제 `Submitted your app to Apple App Store Connect!`를 확인했다. 이전23/24의 Apple 필수약관403 차단은 이번 제출에서 해소됐다. 어떤 약관이 구체적으로 원인이었는지를 새로 추정하지 않는다.
- [EAS 제출 상세](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/submissions/e7429e94-f215-4d07-b2c8-89c1d543903a). 로그의 최종 안내는 **Apple 처리 중**이다. [TestFlight 관리](https://appstoreconnect.apple.com/apps/6829597261/testflight/ios). 실제 TestFlight25 등장/설치·기기 동작은 독립 확인하지 않았다.
- 최신 캘린더20개 개선, 월/주/일/목록·상세/일정 쓰기·소스/검색/시간대, Apple 상태별 Glass/하단 capsule·Duo 배치를 포함한 같은 앱 소스의 native 컴파일/서명/업로드다. 실계정 쓰기·실기기 Glass/햅틱/VoiceOver/Dynamic Type·Figma 완료로 확대하지 않는다.
- 이전 실패23/24는 이력으로 남긴다. 새native 컴파일/서명/Apple 업로드 미확인·필수약관으로 제출 차단이라는 현재 보류는 **25번에 대해 해제**한다. Apple 처리/설치는 별도다. 다시 빌드하거나 제출을 반복하지 않는다.

### 사용자가 할 일

컴퓨터를 꺼도 된다. GitHub 클라우드 Mac의 실제 실행은 이미 끝났고 사용자의 PC와 독립적이다. Apple 처리 후 아이폰의 **TestFlight → duckduck → 업데이트**에서1.0.0(25)을 확인한다. 아직25가 안 보이면 처리를 기다리며 Run workflow를 다시 누르지 않는다. 추가 결제·키/서명 재생성·공개 App Store 출시는 하지 않았다. 기존 앱/데이터/인증·서명·무료플랜·원본 복구bundle을 보존했다.

## 2026-11-13 이전 attempt2 — 약관 동의 후24번 생성 성공·제출 재차 차단

사용자가 Apple 약관에 “동의했어”라고 확인했다. 계정 소유자의 직접 동의는 사용자 확인이며 서버 반영 여부는 실제 새 제출 결과로 판단한다.

GitHub main b9ddf34를 fetch해 이전1643e0c와 mobile/server/ios-testflight workflow 차이가 없음을 확인했다. runner IPA는 삭제됐고 현재 제공 도구에 EAS archive 재시도 기능이 없어, 연결된 GitHub의 **실패 job만 재실행** API로 [43394742649 attempt2](https://github.com/thepmpo/donknow/actions/runs/43394742649/attempts/2)를 요청했다. success:true 접수와 build-and-submit job131792866795 실행을 확인했다. 성공한 validate는 재사용한다. 실제 결과: 번호23→24, **1.0.0(24) native/서명 IPA 생성은18:07:14 KST 성공**했다. 그러나18:07:38 KST Apple Submit가 다시 **필수 약관 미동의/만료403**으로 실패했다. [attempt2 job131792866795](https://github.com/thepmpo/donknow/actions/runs/43394742649/job/131792866795), [24번 제출 상세](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/submissions/9b4f5c8c-9856-401f-83ca-5886c7cab443). 사용자 동의를 부정하는 뜻이 아니라 실제 제출 시 Apple이 반환한 상태다. 계약 반영 지연/다른 필수 약관/팀 선택 문제 중 어느 것인지는 아직 확인되지 않았다. 추가 빌드/제출을 중단하고 계정 소유자가 확인할 때 재개한다. TestFlight24 업로드·설치·기기 검수 완료가 아니다.

이것은 예전 Expo cloud 한도 실패를 재시도하는 경로가 아니다. 실제 앱·서명 처리/무료 Mac·local build workflow가 현재main과 **동일함을 먼저 비교한 이번 복구**다. 앱/워크플로가 바뀐 실패라면 최신main 새 수동 실행이 필요하고, 오래된 cloud 코드의 Re-run 금지는 그대로 유지한다. 무료 플랜·기존 데이터/인증/서명·원본 복구 bundle을 보존하며 불확실한 제출을 자동 반복하지 않는다.

## 2026-11-13 이전 attempt1 — 1.0.0(23) 빌드 성공·Apple 약관으로 제출 실패

[수동 실행43394742649](https://github.com/thepmpo/donknow/actions/runs/43394742649)은 소스 **1643e0c2b7da2c2e1e34362388dbbd671542b9d0**, validate 성공·build-and-submit failure다. 사용자가 ‘취소’로 표현했지만 실제 run/job conclusion은 failure이며 cancel이 아니다. [job131783233106](https://github.com/thepmpo/donknow/actions/runs/43394742649/job/131783233106)에서 **서명 IPA 생성 단계는 성공**, 다음 Submit 단계만 실패했다.

- 원격 buildNumber22→23, 앱 버전1.0.0, **1.0.0(23)**. Xcode27.1에서 native 컴파일·기존 서명/IPA 생성은 **17:48:01 KST**에 성공했다. 로그의 컴파일 결과는0 errors/3 warnings다. ExpoHaptics58.0.8 설치/컴파일/패키징도 확인했다. 실제 기기의 햅틱/Glass/접근성 성공으로 확대하지 않는다.
- 정확한 중단 원인: **`A required Apple agreement is missing or has expired.`** Apple403·필수 약관 미동의/만료이며 **17:48:32 KST** Submit가 exit1로 종료됐다. 새 인증서/API키/비밀번호 문제로 단정하거나 재생성하지 않는다.
- EAS Submit에 archive 업로드와 submission 예약까지는 성공했지만 Apple 업로드 완료는 아니다. [제출 상세](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/submissions/ccd673f4-d5ee-4414-8b5b-533f495ad03d). GitHub runner의 임시 IPA는 기존 always cleanup으로 제거됐다. EAS가 업로드받은 archive의 재사용/재시도 가능 여부는 미확인이다. 사용자가 약관 동의하기 전 새 빌드/제출을 반복하지 않는다.
- Ubuntu26 이전 notice는 이번 실패 원인이 아니다. expo-doctor의19/20·SDK 권장 버전10개 차이는 비차단 유지보수 경고로 기록한다. 실제 native 빌드는 그 뒤 성공했으므로 이번 원인 해결을 위해 잠금 파일/의존성/서명을 임의 변경하지 않는다.

### 사용자가 할 일 — 계정 소유자의 Apple 약관 확인

1. [App Store Connect 계약 화면](https://appstoreconnect.apple.com/business)에 해당 Apple 팀의 **계정 소유자(Account Holder)**로 로그인한다. 검토/동의가 필요한 약관 배너/계약을 확인하고 본인이 읽은 뒤 동의한다. 버튼 표기는 Apple 화면/언어에 따라 달라 미확인 이름을 단정하지 않는다.
2. [Apple Developer 계정](https://developer.apple.com/account/)에도 Program License Agreement 등 새 약관 안내가 있으면 같은 방식으로 확인한다. 자동으로 약관에 동의하거나 권한을 우회하지 않는다.
3. 약관 동의 완료 후 기존 제출의 재시도/보관 archive 재사용 가능 여부를 먼저 확인한다. 불가능할 때만 최신main 새 수동 무료 빌드가 필요하다. 현재 CLI만으로 제출ID의 재시도나 삭제된 runner IPA 재사용을 약속하지 않는다. 새 번호를23으로 고정하거나 TestFlight23이 이미 도착했다고 하지 않는다.

확인한 것: 실제 native 빌드/서명/IPA 성공. 미확인/실패: Apple 업로드 실패, Apple 처리·TestFlight23 등장/설치·실기기 검수 미확인. 기존 앱/데이터/인증·서명·원본 recovery bundle·무료 플랜·수동 빌드 정책을 보존했다. 이 대응에서는 추가 native 빌드/자동 재제출/유료 전환을 수행하지 않는다.

## 2026-11-13 정정 — 파란 선택 음영을 실제 GlassView로 변경

사용자가 “Liquid Glass가 아니라 파란 음영”이라고 보고했다. 소스에서 **움직이는 선택 표시는 rgba(49,130,246,0.16) 색의 일반 Animated.View이고 native GlassView는 바 배경에만 연결돼 있었다**는 것을 확인했다. 따라서 이전 “Glass 연결” 설명을 선택 표시 전체의 실제 유리 검증으로 읽으면 안 된다. 사용자는 **아이폰 TestFlight 앱**에서 본 현상이라고 답했다. 웹 미리보기 차이로 설명하지 않는다. 실제 설치 버전/OS/접근성 모드를 원격으로 읽은 것은 아니다.

구현fdd555f에서 파란 채움을 제거하고 선택 표시 안에도 NavigationGlass의 **selection variant**를 넣었다. 지원 iOS는 실제 GlassView regular·isInteractive=true를 사용하며 글라스가 들어가는 부모/선택 이동 뷰의 opacity를 낮추지 않는다. 바깥 host의 overflow:hidden도 제거해 유리 가장자리/깊이 효과를 자르지 않게 했다. 이동은 기존250ms/1.06배 커스텀 애니메이션이고 Apple이 자동으로 생성하는 tab 동작 전체를 복제했다고 하지 않는다. 선택 아이콘의 기존 파란색·카메라 열·크기·구분선·입력/월/스크롤은 보존한다.

웹/이전OS의 선택 표시는 **중립색 반투명 블러 대체**이며 native Liquid Glass가 아니다. 투명도 줄이기/강제 고대비는 불투명한 대비 선택 표시를 사용한다. 가용성 검사나 사용자 OS 설정을 끄거나 우회하지 않는다. [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials.md)는 clear를 시각적으로 풍부한 배경용으로 안내하므로 흰 표면의 덕은 regular를 유지한다. [Expo Glass 공식 API](https://docs.expo.dev/versions/latest/sdk/glass-effect/)를 따르고 새 native 패키지/인증은 추가하지 않았다.

검증: 문법·전체225개 중224통과/실패0/기존 선택1개 제외·타입·웹/iOS JS export·전체 앱/모션·Duo 회귀에서 파란 선택 배경 없음, 명시적 중립 fallback/불투명 모드, glass host 비클리핑, 선택 이동/연속 전환/동작 줄이기·구분선/기존 상태를 확인했다. 첫 웹 색상 단정은 BlurView가 실제 tint 색으로 덮는 점, 고대비는 OS 팔레트를 쓰는 점을 반영해 **중립/투명·대비·불투명 정책**을 검사하도록 바로잡았다. 공개 문서/디자인 가이드와153개 이미지 해시도 검증했다. native 광학 효과를 웹 캡처로 검증했다고 하지 않는다.

실제 최신 빌드도 확인했다. [43374883126](https://github.com/thepmpo/donknow/actions/runs/43374883126)은 소스57530ac의 **1.0.0(20)**이며 Xcode27.1·ExpoGlassEffect58.0.5 설치/패키징·서명IPA 생성·**15:04:13 KST Apple 업로드 성공**이다. [제출 상세](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/submissions/387bcae4-0749-4feb-b83a-c66fff678447).20번에는 구분선과 Glass 모듈이 있지만 선택 표시는 수정 전 파란색이다. 사용자 설치/Apple 처리 완료까지 독립 확인한 것은 아니다.

**이번 선택 재질 수정은20번에 없다.** 현재 Expo Update를 구성하지 않았으므로 최신 main의 새 무료 빌드·Apple 처리·실제 아이폰 비교가 필요하다. [무료 빌드 화면](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml)의 새 main 실행을 사용하고20번 실행의 재시도는 하지 않는다. 다음 번호를 미리 고정하거나 실제 폰의 Glass 모드를 추정하지 않는다. 기존 데이터·인증·서명·원본 recovery bundle·무료 플랜을 보존했다.

## 2026-11-13 승인·적용 — 펼친 Duo의 연한 좌우 구분선

사용자가 추천 이미지에 **“그렇게 해서 적용하자”**고 승인했다. 구현4d41361에서 펼친 가로 Duo의 실제 pane gutter 중앙에 기존 목록 색 **#E5E8EB**의 **StyleSheet.hairlineWidth** 선을 추가했다. 양 끝은16pt씩 띄우며 흰 배경·카메라 열 내비게이션·왼쪽 캘린더 고정/오른쪽 선택 화면을 유지한다. 이전 이미지 제안의 미승인/미구현 상태는 이 승인으로 해제한다.

선은 스크롤/탭 전환과 독립된 장식이고 터치를 가로채거나 접근성 조작 항목을 만들지 않는다. 세로·접힘·일반 iPhone·분할 비활성 상태에서는 숨긴다. 실제 활성 힌지/가림 영역이 중앙을 차지하면 선을 중복해 그리지 않는다. 화면50%나 기기 모델/폭으로 위치·기기를 추정하지 않고 기존 native-confirmed geometry를 사용한다. 확대 내비게이션·Glass·250ms 선택 이동·초안/월/스크롤·데이터/인증은 보존했다.

검증: 문법·전체225개 중224통과/실패0/기존 선택1개 제외·기하12개·타입·웹/iOS JS export·전체 앱·Duo 선 위치/양끝16pt/색/터치 통과·스크린리더 제외/스크롤·탭 고정/회전·힌지 숨김/기존 상태·Glass 선택 모션 회귀를 통과했다. 공개 문서/디자인 가이드 회귀와148개 이미지 해시도 검증했다. 새 캡처는 **실제 앱 컴포넌트의 기하/체험 데이터 웹 fixture**이며 AI 시안과 구분한다. native Glass·실제 Duo/기기 설치 검수는 새 무료 빌드 후 별도다.

[승인 기준·실제 캡처·공식 근거·남은 검수](https://github.com/thepmpo/donknow/blob/main/docs/duo-pane-divider-proposal-2026-11-13.md) · [무료 빌드](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml). 현재 확인한 설치19번에는 앞선 Glass/확대와 구분선이 없으므로 최신 main을 새로 수동 빌드하면 함께 받는다. 새 빌드 번호나 Apple/실기기 성공을 미리 확정하지 않는다. 기존 인증·서명·데이터·원본 recovery bundle을 보존했고 push 자동 빌드는 계속 꺼져 있다.

## 2026-11-13 승인 반영 — 큰 내비게이션·Liquid Glass·선택 이동

사용자가 제안한 확대/재질/모션을 적용하도록 승인했다. 구현30ea3d9에서 Duo 아이콘24→**28pt**, 탭 터치44→**52pt**, 세로 바48→**64pt**·전체높이**272pt**로 키웠다. 기존 물리 카메라 열과 아래 탭·위 실제 복귀 원형 ‹, 위/아래 안전8pt, 가로 고정 캘린더/오른쪽 선택 화면·세로 현재 화면 규칙을 유지한다. YouTube는 큰 아이콘과 명확한 선택의 참고이며 로고/빨간색/하단 위치를 복제하지 않는다. 일반 iPhone은 하단 위치/기존 아이콘 치수를 유지하며 재질과 선택 표시를 공유한다.

- 실제 native Apple Liquid Glass: Expo SDK58 권장 `expo-glass-effect ~58.0.5`를 잠금 파일과 함께 추가했다. [공식 API](https://docs.expo.dev/versions/latest/sdk/glass-effect/)의 runtime/compiler/API 가용성을 모두 확인하고 iOS26+에서 `GlassView`를 사용한다. Duo 뒤로가기 원에도 같은 재질을 적용한다. GlassView/부모 opacity를 애니메이션하지 않는다.
- 지원하지 않는 OS/웹은 명시적 BlurView 대체이며 native Glass로 보고하지 않는다. 투명도 줄이기/웹 강제 고대비에서는 불투명한 대비 재질을 사용한다. 설정 조회가 실패하면 불투명 상태를 유지하고 이후 OS 변경 이벤트도 반영한다. React Native Web에 없는 reduceTransparency 메서드를 호출하지 않는다.
- 선택 강조판은 실제 측정한 각 탭의 좌표로 **250ms 이동**하고 최대**1.06배**로 짧게 반응한다. 빠른 연속 탭은 이전 이동을 취소하고 최신 탭으로 이어간다. 동작 줄이기에서는 즉시 이동하며 확대하지 않는다. 새 탭 history나 자동 업무 실행은 만들지 않는다.
- `DUO_CHROME`의64/272/52/28이 단일 소스이며, 짧은 높이에서는52pt를 줄이지 않고 스크롤한다. 새 크기로도 카메라 중심선, 본문 밖 위치, 채팅 입력/보내기 비가림·원형 뒤로가기 비활성·현재 탭/초안/월/스크롤 보존을 검사했다.

검증: 문법·전체224개 중223통과/실패0/기존 선택1개 제외·기하11개·타입·웹/iOS JS export·전체 앱·모션·AI 채팅·Duo 실제 선택 이동/연속 입력/동작 줄이기/강제 고대비/52pt 조작·상태 보존 회귀를 통과했다. 공개 문서/디자인 가이드 회귀와142개 이미지 해시도 검증했다. 새 캡처는 **기하/체험 데이터 웹 fixture의 대체 재질**이며 native Apple Glass 실기기 캡처가 아니다. 이전 화면은 이력으로 보존했다.

**현재 설치1.0.0(19)은 이번 확대/Glass 전이다.** native 모듈이 추가돼 최신 main의 새 수동 무료 GitHub Mac 빌드·Apple 처리·실기기 검수가 필요하다. 다음 빌드 번호를 미리 확정하지 않는다. push 자동 빌드는 계속 꺼짐이며 기존 인증·서명·데이터·무료 서버·원본 recovery bundle은 보존한다. [무료 빌드 화면](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml)에서 새 main 실행을 사용한다.

시간 제한 질문:90분은 **한 번의 Mac 빌드 job 제한**이지 월간 빌드 횟수/총시간 한도가 아니다. 현재 공개 저장소·표준 GitHub runner 조건에서 월15회 같은 Expo cloud 횟수 제한을 쓰지 않는다.19번의 Mac job은 약10분에 빌드/제출을 마쳤다. GitHub 사용 정책·대기·동시/작업 시간 제한은 유지한다. 이번 작업에서90분·과금 설정을 변경하지 않았다.

## 2026-11-13 실제 성공 — 무료 GitHub Mac 빌드1.0.0(19)·Apple 업로드

[사용자 수동 실행43365834762](https://github.com/thepmpo/donknow/actions/runs/43365834762)은 **소스224a498**, validate와build-and-submit 두 job 모두 성공이다. [실제 빌드·제출 job131690178721](https://github.com/thepmpo/donknow/actions/runs/43365834762/job/131690178721)의 로그에서 Xcode27.1, 기존 서명 재사용, 원격번호18→19, `Build successful`, 서명된IPA11.4MB, `Submitted your app to Apple App Store Connect!`를 확인했다. 앱 설정 버전1.0.0과 합쳐 **1.0.0(19)**다. Expo cloud build가 아니라 앞서 설정한 공개 저장소의 표준 GitHub Mac에서 `--local`로 실제 빌드했다. 새 유료 가입·과금 설정·인증서 재발급을 하지 않았으며 추가 빌드를 요청하지 않는다.

IPA 생성은 **13:39:30 KST**, Apple 업로드 완료는 **13:40:01 KST**다. [제출 상세](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/submissions/0d6c6741-25ea-4444-9a1e-62c55ec958da). 제출 완료 로그의 마지막 상태는 **Apple 처리 중**이며, 실제 TestFlight 목록 등장·설치·Duo 실기기 동작은 아직 확인하지 않았다. 설치 파일 생성/서명/Apple 업로드 성공을 기기 검수나 App Store 공개 완료로 확대하지 않는다. 이번 로그에서 DuckduckDuo1.0.0 pod 설치·패키징도 확인했지만 실제 카메라/힌지/키보드는 기기에서 검수한다.

사용자는 아이폰의 **TestFlight → duckduck → 업데이트**에서 **1.0.0(19)**를 확인한다. 아직19가 안 보이면 Apple 처리 완료를 기다리고 같은 이유로 다시 빌드하지 않는다. 이 버전은 승인한 카메라 열의 세로 탭·상황별 원형 뒤로가기, 펼친 가로의 왼쪽 캘린더 고정/오른쪽 Todo·선택 탭, 펼친 세로의 현재 화면 하나를 포함한다. 일반 iPhone 하단 탭은 유지한다. [Duo 검수 기준](iphone-duo-support.md) · [Apple TestFlight 관리](https://appstoreconnect.apple.com/apps/6829597261/testflight/ios).

이제 **첫 무료 Mac 빌드/서명/제출 미확인**은 해제한다. 아래 Linux 단계나이전17·18의 미확인/실패 기록은 당시 상태다. 이번 변경은 실제 결과 기록뿐이며 앱 코드·서명·데이터·OAuth·원본 recovery bundle을 바꾸지 않는다.

## 2026-11-13 최신 경로 — Windows에서 GitHub 무료 Mac으로 빌드

사용자는 빌드 비용을 내고 싶지 않고 현재 Windows를 사용한다고 밝혔다. [저장소 API](https://api.github.com/repos/thepmpo/donknow)의 `private:false`/`visibility:public`과 [GitHub 공식 표준 runner 안내](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)를 확인했다. 공개 저장소의 **표준 `xcode-27` Mac runner는 무료**다. 사용자 PC에 Mac/Xcode를 설치할 필요 없이 GitHub가 Xcode를 실행한다. 저장소 공개 범위를 바꾸거나 인증값을 공개하지 않는다.

`.github/workflows/ios-testflight.yml`의 같은 수동 버튼을 **Linux 검사 → 무료 Mac에서 EAS local build → 같은 IPA 제출**로 바꿨다. `workflow_dispatch`·main·공개 저장소 조건을 모두 만족해야 실행한다. push 자동 빌드·별도 유료 runner·Expo cloud build 대체/재시도 경로는 없다. 공개 저장소이므로 추가 빌드 요금이 없는 것이며 다른 비공개 저장소에 그대로 적용하면 무료라고 보장할 수 없다.

### Windows에서 누를 버튼

1. [아이폰 무료 빌드 화면](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml)을 연다.
2. **Run workflow** → **Branch:main** → 초록색 **Run workflow**를 한 번 누른다.
3. 새 실행에서 **validate** 다음 **build-and-submit**을 확인한다. 이전 실패 실행의 Re-run은 예전 Expo cloud 코드를 다시 쓰므로 누르지 않는다.
4. GitHub의 **Build signed IPA on the free GitHub Mac**과 **Submit this IPA** 단계를 각각 확인하고, Apple 처리 후 [TestFlight](https://appstoreconnect.apple.com/apps/6829597261/testflight/ios)를 확인한다. 윈도우는 이 웹 버튼만 사용한다.

### 실제 설정·비용·보존 범위

- [공식 Xcode27 이미지](https://github.com/actions/runner-images/blob/main/images/macos/xcode-27-arm64-Readme.md)에 있는 `/Applications/Xcode_27.1.app`을 직접 선택한다. [표준 label 발표](https://github.com/actions/runner-images/issues/14404)를 확인했으며 `xcode-27-xlarge` 같은 유료 label은 쓰지 않는다. preview 이미지라 대기/이미지 변경 가능성은 남는다. SDK27.1 미만이면 중단하며 Duo 기능을 조용히 빼서 빌드하지 않는다.
- Node24·CocoaPods·Fastlane2.240.1·EAS CLI27.4.1을 사용한다. 공식 [EAS 로컬 빌드](https://docs.expo.dev/build-reference/local-builds/)는 Expo 빌드 서버를 쓰지 않는다. 로컬 빌드에서는 eas.json의 image가 무시되므로 위 Xcode 선택이 실제 기준이다.
- `eas build --platform ios --profile production --local --non-interactive --freeze-credentials`로 기존 EAS 서명을 재사용한다. 기존 `EXPO_TOKEN`만 사용하고 새 시크릿·개인 토큰·인증서 발급을 요구하지 않는다. 원격 buildNumber 자동 증가와 앱 ID는 유지한다. 완성한 IPA 경로를 지정해 `eas submit --wait`로 제출하고 원격 cloud build는 호출하지 않는다.
- IPA/서명 작업 디렉터리는 runner 임시 경로에 두고 종료 시 정리한다. 공개 Actions artifact로 인증·서명·IPA를 업로드하지 않는다. 공개 로그에도 키를 출력하지 않는다. 기존 데이터·운영 서버·OAuth·원본 recovery bundle은 보존한다.
- Expo Starter 결제는 필요 없다. **GitHub 공개 표준 runner의 빌드 비용은0이며 기존 Apple 개발자 계정 비용은 별개**다. 사용자가 이미 가진 Apple 계정/서명을 사용하고 유료 자원을 새로 만들지 않는다. 공개 저장소 사용 정책/동시 실행·대기 제한은 적용된다.

### 검증과 미확인

Actionlint1.7.12(공식 릴리스 SHA256 확인)·모든 셸 단계 문법·수동/main/public 조건·local-only/서명 보존·문법·전체224개 중223통과/선택1개 제외·모바일 타입·iOS JS export를 통과했다. actionlint가 새 preview label을 몰라 `.github/actionlint.yaml`에 **확인한 label 하나만** 추가했다. 이 lint 설정은 self-hosted 서버를 생성하는 설정이 아니다. 첫 lint에서 발견한 job env의 runner context 위치도 단계 env로 수정해 재검증했다.

**Linux 검증이 실제 무료 Mac 컴파일·서명·업로드 성공을 뜻하지 않는다.** 새 workflow의 첫 실제 Mac 빌드·서명·Apple 업로드는43365834762에서 성공했고 Apple 처리·기기 설치는 별도다. 현재 환경의 GitHub dispatch가Forbidden이면 사용자가 위 버튼을 누른 뒤 실제 실행을 확인한다. 이전1.0.0(17)은 이번 Duo 수정 전이며 번호18은 한도 거절 과정에서 할당만 됐다. 새 번호를 임의로 고정하거나18번 재사용을 약속하지 않는다. 아래 Expo cloud 한도/요금 비교는 이전 경로의 이력이며 새 기본 빌드 경로는 이 절을 우선한다.

## 2026-11-13 — 새 iOS 빌드는 Expo 무료 한도 소진으로 차단

[사용자 수동 실행43357992366](https://github.com/thepmpo/donknow/actions/runs/43357992366/job/131664508126)은 최신 main faee581(구현775a561)에서 실패했다. 서버 문법·224개 중223통과/기존 선택1개 제외·타입·iOS JS export는 성공했다. EAS가 인증/기존 서명을 확인하고 업로드한 뒤 **이번 달 Free iOS 빌드 한도를 모두 사용했다**고 거절했다. 실제 중단 원인은 이 계정 한도이며, Node20 action/Ubuntu26 이전 안내나 앱 코드 오류가 아니다.

로그의 핵심: `This account has used its iOS builds from the Free plan this month` / `on Tue Dec 01 2026` / `Error: build command failed.` 원격 buildNumber는17→18로 증가했지만 이 실행에서는 새 빌드 URL·IPA·제출 예약이 확인되지 않았다. **18은 번호 할당이며 설치 가능한 TestFlight18이 만들어졌다는 뜻이 아니다.** 이번 실행은 네이티브 빌드가 가동되기 전 차단됐으므로 Swift/Duo 컴파일은 여전히 미확인이다. 인증·서명 재생성이나 같은 요청 재시도는 하지 않는다. 이번 거절된 요청이 별도 횟수를 차감했는지는 로그만으로 단정하지 않는다.

남은 경로는① 로그에 표시된12월1일 초기화 후 수동 빌드,② 사용자 Mac에서 Xcode와 기존 서명으로 로컬 production 빌드 후 업로드,③ 사용자 선택으로 Expo 유료 플랜이다. [공식 로컬 빌드](https://docs.expo.dev/build-reference/local-builds/)와 [iOS 제출](https://docs.expo.dev/submit/ios/)에서 Mac의 `eas build --platform ios --profile production --local` 또는 Xcode 빌드/업로드를 확인했다. 로컬 빌드는 Expo 클라우드 빌드 서버를 쓰지 않지만 호환 Xcode·로컬 의존성·기존 Expo/Apple 로그인과 서명 확인이 필요하며 아직 사용자 Mac에서 수행하지 않았다. 사무실 Lima Linux VM은 iOS Xcode 빌드 환경이 아니다. [공식 가격](https://expo.dev/pricing)은 Starter 월US$19+사용량으로 표시하며 세금/추가 사용료는 별도다. **유료 가입·결제·한도 초기화 우회·재실행·추가 EAS 요청은 하지 않았다.** 사용자 무료 우선 정책과 push 자동 EAS 금지를 유지한다.

[계정 빌드/요금 확인](https://expo.dev/accounts/thepmpo/settings/billing) · [빌드 실행 화면](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml). 기존 데이터·인증·원본 recovery bundle을 보존했고 이번 변경은 실패 원인과 이어받기 문서뿐이다.

## 2026-11-13 — 빌드17과 현재 카메라 열 수정 구분

[사용자 수동 실행43352316009](https://github.com/thepmpo/donknow/actions/runs/43352316009)의 요청 로그에서 **1.0.0(17)·소스380dde2**를 확인했다. [EAS 빌드17](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/builds/f527087f-c164-4534-912d-7e72b4112e8c)의 실제 네이티브/Apple 처리·사용자 설치는 별도다.17의 탭은 본문 기준이므로 이번 승인한 카메라 열·고정 캘린더/오른쪽 Todo·세로 단일 화면 변경을 포함하지 않는다. 힌지 상태를 읽는 Swift도 바뀌어 새 **네이티브 수동 빌드**가 필요하다. 웹/iOS JS export 성공은 IPA 검증이 아니다. 이번 push에서 EAS를 자동 요청하지 않는다. [최신 화면·기기 검수](iphone-duo-support.md).

## 2026-11-13 — 네이버 읽기 전용 확정·아이폰 빌드16 요청

사용자 결정으로 네이버는 **받은 메일 읽기 전용**을 유지한다. `NAVER_READ_ONLY=true`를 기존 무료 서버에 병합하고 Blueprint에도 같은 비밀 아닌 값을 기록한다. 읽음 상태 변경·발송·답장을 연결 설정·서버 미리보기/실행·AI/수동 카탈로그에서 막는다. 예전에 저장된 `mailWrite` 권한이나 준비한 실행 초안도 제한을 우회할 수 없으며, 기존 인증·메일 계정·자료를 삭제하거나 다시 저장하지 않는다. 최신 UI는 쓰기 선택을 숨긴다. 기존 설치 앱에 선택칸이 보여도 서버에서 차단되므로 꺼두고 읽기만 연결한다.

[사용자 수동 실행43345083809](https://github.com/thepmpo/donknow/actions/runs/43345083809)는 소스57aee29의 검사 후 **아이폰 빌드16** 요청·자동 제출 예약 접수를 완료했다. [EAS 빌드](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/builds/f2dcece3-7540-4407-b02a-5019579976dd), [제출](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/submissions/a92f2559-01cd-4ca5-8b98-165299799d45). 실제 IPA·Apple 처리·설치는 아직 확인 전이다. 공개 EAS URL은 로그인 없이 정상 상태를 확인하지 못했으므로 실패/완료로 단정하지 않는다. 읽기 전용은 서버 정책으로 이 빌드에도 적용하고, 새 UI만을 위해 추가 EAS 빌드를 요청하지 않는다.

웹·서버 변경은 일반 배포로 반영하며, 설치 앱 코드가 바뀌어 새 아이폰 버전을 테스트할 때만 수동 TestFlight 빌드가 필요하다. 지금 사용자가 버튼을 누른 이유는 작업 환경의 GitHub API 요청 제한이며 매 업무마다 빌드할 필요가 없다. push 자동 EAS 빌드는 계속 꺼둔다. Google·Notion은 설치 후 본인 권한 승인→읽기→시험용 항목/페이지 작성·수정까지 최종 테스트에 포함한다.

[공식 Render 가격](https://render.com/pricing)의 최소 유료 웹 서버는월 US$7부터이며 세금·초과 사용료는 별도다. 네이버 발송을 쓰지 않으므로 무료 플랜을 유지하고 결제·마이그레이션을 실행하지 않는다.

검증: 전체221개 중220통과·실패0·기존 선택1개 제외, 문법·모바일 타입·웹/iOS JS 출력·네이버 전용 읽기 UI·기존 채팅을 통과했다. 전용 회귀에서 이전 인증/권한 보존·읽기 가능·원본 변경0·기존 초안 차단·쓰기 선택 제거·앱 비밀번호 초기화를 확인했다. 이 검사는 모의 계정/공급자이며 운영 네이버 계정 접속 성공과 다르다. 실제 공개 정책 적용은 배포 후 확인한다.

2026-11-13 추가: Deliver scheduled Duck messages는 브리핑 due 작업만OIDC로 호출하며 EAS/Expo 빌드·submit을 호출하지 않는다. 앱 검사/예약 전달/TestFlight 수동 workflow는 서로 다르다. 예약 전달 실행기 관련 파일만 바뀔 때의 연결 검사 push도 TestFlight가 아니다. 최신 Duo 상단 탭·예약/도착 알림은 아이폰에 설치할 새 수동 빌드가 있어야 바뀐다.

## 최신 정책 — 필요할 때만 빌드

사용자가 빌드 한도 절약 방식을 승인했다. 이제 앱 코드를 main에 올려도 EAS 빌드를 자동 요청하지 않는다. 코드 검사는 app-checks에서 자동 수행하며, 아이폰 설치가 필요한 시점에만 이 문서의 수동 실행을 사용한다. 출시 준비는 마지막에 진행한다. [전체 기능 작업 순서](functional-workstream-2026-11-12.md).

## 이전 실행 기록

2026-11-12 새 작업: `dd650f0`의 [43130303497 실행](https://github.com/thepmpo/donknow/actions/runs/43130303497)이 검사 후 EAS build number 13 요청에 성공했다. [빌드 진행](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/builds/1830483a-8fb8-4dc3-a36e-b150f799d29e). `--no-wait`이므로 Swift·IPA·Apple 처리·설치는 별도이며, [실패 재현과 복구·전체 증거](release-readiness-2026-11-12.md)를 읽는다.


2026-11-12 확인: 기존 f76172d의 workflow 실행 `42745583353`과 job `129596764087`은 성공이며, 이는 새로 작성하는 채팅·Duo 코드의 iOS 빌드 성공을 뜻하지 않는다. EAS의 빌드 요청 접수, 실제 Xcode 빌드, Apple 업로드·처리, TestFlight 설치를 구분한다. 실제 확인 근거와 운영 가동 상태는 [최신 출시 점검](release-readiness-2026-11-12.md)을 따른다. 기존 인증·서명·앱 ID는 재생성하지 않는다.

2026-11-10 사용자 확인: f76172d 기준 iPhone workflow 성공, 현재 TestFlight 1.0.0 (12). 에이전트의 EAS/Apple 독립 검증과 구분한다. 아래 초기 등록/미확인 설명은 당시 상태이며 이미 등록된 인증 설정을 재생성하지 않는다. 이번 톤 분석은 문서 변경뿐이므로 새 iOS 빌드를 요청하지 않는다.

`.github/workflows/ios-testflight.yml`은 수동 workflow_dispatch에만 반응한다. 코드 push/PR의 자동 검사는 `.github/workflows/app-checks.yml`이 담당하며 EAS 빌드·제출 명령과 EXPO_TOKEN이 없다. 루트/모바일 잠금 파일로 의존성을 설치하고 서버 문법·단위/API 테스트·모바일 타입 검사·iOS JS export를 통과한 후 표준 GitHub Mac에서 production 로컬 IPA를 생성하고 그 파일을 App Store Connect에 제출한다. Expo cloud build를 요청하지 않는다. App Store 공개 배포는 하지 않는다.

## 한 번만 등록

1. https://expo.dev/settings/access-tokens 에서 thepmpo 계정의 토큰을 만든다.
2. https://github.com/thepmpo/donknow/settings/secrets/actions 에서 `EXPO_TOKEN` 이름의 repository secret으로 등록한다. 토큰을 채팅·Git·문서에 붙이지 않는다.
3. https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml 에서 **Run workflow → main → Run workflow**로 필요할 때 한 번만 실행한다.

이미 EAS에 저장된 배포 인증서·프로비저닝 프로파일·App Store Connect API 키와 ascAppId를 사용한다. production의 autoIncrement와 remote 버전 소스를 유지한다. 토큰/인증서가 유효한 한 반복 로그인·테스터 재초대가 필요하지 않다. 갱신·회수된 자격 증명이나 Apple 약관·권한 변경은 별도 대응이 필요하다.

## 상태의 의미

최신 무료 Mac 경로는 GitHub에서 실제 `--local` 네이티브 빌드와 `submit --wait`를 수행한다. **validate 통과는 코드/JS 검사, Build 단계 통과는 서명된IPA 생성, Submit 단계 통과는 제출 처리 결과**이며 Apple 처리·기기 설치는 별도다. 예전 Expo cloud 경로의 `--no-wait` 초록 체크 의미와 다르다. 새 실행은 GitHub 로그와 제출 링크에서 확인하고 Apple 처리 후 https://appstoreconnect.apple.com/apps/6829597261/testflight/ios 에서 확인한다.

EAS/GitHub의 기존 무료 한도를 사용하며 플랜을 올리지 않는다. 자동 검사는 유지하며 설치용 변경을 모은 뒤 필요한 시점에만 수동 빌드를 요청한다. JS export는 원격 EAS 빌드 횟수를 쓰지 않는다. 제출 실패나 EAS 장애는 Expo 로그를 확인한다. 토큰을 아직 등록하지 않았다면 명확한 오류로 중단한다. 기존 빌드13·14·15 생성/자동 제출 요청 성공을 확인했으며 실제 EAS/Apple 완료 여부는 각 결과를 따로 확인한다.

서버 변경은 서버 배포가 별도로 필요하다. 디자인 가이드는 `/design-guide`, 인계 문서는 `/project`이다.

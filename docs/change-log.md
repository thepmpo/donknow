# 변경 기록

## 2026-11-13 — iPhone23 native 성공·Apple 약관으로 제출 차단

[실제 빌드/제출 기록](testflight-automation.md): 수동43394742649·소스1643e0c는 validate와1.0.0(23) 서명 IPA 생성이 성공했고 Apple Submit만 필수 약관 미동의/만료403으로 실패했다. 취소나 앱/Ubuntu 빌드 실패가 아니다. 새 Calendar·ExpoHaptics 포함 native 컴파일은 확인했지만 Apple 업로드/처리·TestFlight 설치·기기 검수는 미확인이다.

계정 소유자가 [Apple 계약](https://appstoreconnect.apple.com/business)과 필요시 [개발자 계정](https://developer.apple.com/account/)에서 약관을 확인/동의해야 한다. 본인 동의 전 재빌드·재제출을 반복하지 않는다. 기존 제출 archive의 재사용은 미확인이며 임시 runner IPA는 기존 cleanup으로 제거됐다. 코드/의존성/서명/데이터/인증·무료 플랜을 변경하지 않고 실제 성공/실패와 다음 행동을 기록한다.

## 캘린더 개선 전체 구현 — 2026-11-13

사용자가 “지금 그거 전체 수정해”라고 요청해 [감사 CA-01~20](calendar-ux-audit-2026-11-13.md)의 구현을 승인했다. [재현 가능한 구현 계약](calendar-workspace-2026-11-13.md)에 흐름·수치·원본 파일·권한·상태·검증·기기 체크리스트를 연결했다. 감사 당시 제안/미구현은 현재 상태가 아닌 이력이다.

실제 pane 높이의42칸, 선택일/일정 상세 시트, 월·주·일·목록과 올바른 이동 단위, 일반폰 탭 복귀/초안 보존, 일정/할 일/완료 구분, 여러 날/겹침 시간표, Google 일정 작성/수정, source/권한 선택, 기간 내 검색, native 년월 선택, IANA 시간대/주 시작을 연결했다. 상단 상태·실패/부분/재시도·큰 글자/최소44pt·regular Glass 도구와160ms/8pt·지원 iOS 햅틱을 적용했다.

Google 원본 쓰기는 미리보기→사용자 확인→한 번 실행, 역할·연결·ETag 재검사다. 결과 불확실일 때 닫았다 열어도 다시 저장하지 않고 결과만 확인한다. 기존 읽기 권한을 자동 확대하지 않고 데이터·인증·Duo 카메라 열/좌Calendar/우선택·무료 플랜을 보존한다. 앱은 기존light 선언 유지, 전체dark UI 추가는 아니다.

새 증거는 calendar-workspace-2026-11-13 폴더의 실제 Expo 웹/격리 API다. native Glass 광학 효과·Dynamic Type/VoiceOver·실제 Duo·Google 실계정 쓰기·Figma 교정은 별도 검수다. **이번 작업은 새 TestFlight를 자동 요청하지 않는다.** 아이폰 설치 앱은 최신main 수동 빌드/Apple 처리/업데이트 후 바뀐다.


검증 완료: 구현00bf57f·전체241개 중240통과/실패0/기존선택1개 제외·문법46·타입·웹/iOS JS·Calendar/전체 앱/로그인/모션/예약/채팅/오류/Duo 회귀를 통과했다. 새 캡처27개·운영 Google 쓰기0·fixture 저장시도3(불확실 후재발송0)·페이지오류0이다. 실제 커밋/Render 반영은 후속 운영 기록에서 확인하며 새TestFlight는 자동 요청하지 않았다.

실제 공개 반영: [운영 확인](calendar-workspace-deployment-2026-11-13.md).9f838e1의 CI43393598786 success, Render dep-dbrckslg1s2s7383uhr0는17:30:49 KST live. 공개 health/capabilities·프로젝트·디자인 가이드의 새 구현을 확인했다. 이 후속 기록만 추가하며 배포된 코드/공개HTML은 바꾸지 않는다.

## 2026-11-13 — 캘린더 UX/UI · Apple/Fantastical 비교 감사

사용자 요청으로 [보고서](calendar-ux-audit-2026-11-13.md)에 최신20bc8eb 앱의6흐름·16개새캡처·20개문제/기회·HIG16항목·실행순서/수용조건을 기록했다. 작은폰의월행넘침/선택일접근,주모드에서다음달이동,일반폰탭복귀기간초기화,큰글자날짜잘림,40pt보조버튼/선택의미,조회실패/부분/빈상태를구분하고,일정상세/작성/검색·출처/시간표기회를 기존서버계약과연결했다.

관찰32a3d5e: 실제Expo웹·KST고정시각·fixture API,쓰기0/JS오류0. Google실제orderBy=startTime에맞춰fixture를정렬했으며‘시간무조건뒤섞임’은결함으로판정하지않았다. 외부두서비스는공식설명비교이며native조작/픽셀대조아니다. Apple이미지403/보조스킬리소스미열람·공유브라우저미제공은한계로기록했다. 기존승인테스트브라우저를사용했고모든이미지원본을검수했다.

문서·인계·공개가이드에감사보고서와현재확정/제안경계를연결했다. 앱동작/권한/데이터/인증/서명/원본bundle을변경하지않고새TestFlight를요청하지않았다. 월전체/브랜드/5탭/Duo고정배치는유지한다. 제안의구현/시안확정·native/실계정검증은후속이다. 문법/캡처/문서·전체이미지해시검사후main일반push,CI/Render실제상태는운영기록에서구분한다.


## 2026-11-13 — Apple 상태별 Glass·하단 capsule·재현 가능한 전체 기록

사용자 요청: 다른 채팅이 지금까지의 기록만으로 같은 제품을 구현하고 다른 서비스의 공통 부분도 재사용할 수준으로 정리. Apple 공식 재질·탭바·모션 가이드에 따라 실제 UI도 수정.

[전체 이어받기 기준](continuation-guide.md) → [Glass 상태·수치·코드·검수](liquid-glass-navigation.md) → [공통 원칙 v1.1](reusable-product-design-principles.md)을 현재 계약으로 연결했다. AGENTS/README/모바일README/디자인/대조표/기능/가동/빌드 문서에 최신 우선순위를 반영하고, 폐기된 평평한 하단·브리핑 문서대기·자동TestFlight 규칙을 정정했다. 날짜별 원문과 승인 시안은 이력으로 보존한다. 생성기에서 전체 기준/Glass 계약을 전문 포함하고 실제 토큰의 공간/모션을 구분한다.

구현aa55b90: 일반 iPhone 하단은 좌우12pt·bottom=max(safeInset,8)·radius32의 떠 있는 capsule. 바regular, 선택idle중립→press1.08배/100ms·regular→drag포인터추적→release250ms중앙/180ms축소·none. 밖에서 해제/취소하면 실제 탭을 유지한다. 미리보기와 실제 선택을 구분하고, 스크롤overflow·빠른전환·측정세대·화면비활성·다중터치 취소를 처리한다. 숫자는덕의구현값이며App Store의비공개물리동작과동일하다고하지않는다. native opacity는1이며pointerEvents none인장식에isInteractive만넣고완료라고하지않는다.

흰본문·5탭·접근성이름·자료/권한·원본쓰기확인·Duo카메라열·64/272/52/28·좌Calendar/우선택·세로전체·분할선·입력/편집/월/스크롤은유지한다. Reduce Motion은즉시/scale1,투명도줄이기·강제고대비는불투명,웹/미지원OS는블러대체다. 기존data/auth/signing/무료플랜과원본bundle을보존한다.

검증: 문법44개·전체228중227통과/실패0/기존선택1제외·타입·웹/iOS JS·실제웹앱/로그인/모션·Duo/일반폰 제스처/취소/상태·320/390/430·safe bottom34·라벨160%를통과했다. 새웹fixture10개를별도폴더에보관. 웹캡처는native광학효과/실제Duo기기검수가아니다. 공개문서/이미지manifest는문서커밋전에별도검사한다.

실제21번은1f7dc5d/43378603322의무료Mac·Apple업로드15:33:45 KST 성공,사용자가Glass외형확인. 이번터치/하단수정은21이후다. push는검사만,새TestFlight자동요청/유료전환/스토어출시는하지않는다. 최신main새수동빌드·설치·실제굴절/취소/VoiceOver/키보드·OS접근성검수와Figma Current/Proposed정리는남는다. 실제CI/Render완료는해당커밋의운영기록에서확인한다.


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

## 2026-11-13 구분선 추천 이미지 — 구현 전

사용자는 펼친 Duo의 좌우 구분을 연한 선으로 표시하고 다른 서비스의 방식 중 가장 나은 이미지 한 장을 요청했다. Apple/Material/Fluent의 공식 가이드를 읽고 같은 흰 표면 위에 #E5E8EB hairline 하나를 gutter 중앙에 두고 위아래 여백을 주는 시안을 생성했다. 실제 앱 코드는 바꾸지 않았고 사용자 선택 전 제안이다. 공개 문서 회귀/143개 이미지 해시를 검증하며, 앱 코드와 별개로 추가된 제안 이미지의 링크가404가 되지 않도록 assetCommit을 분리해 고정한다. [추천 이미지·공식 출처·치수 제안·검수와 다음 작업](https://github.com/thepmpo/donknow/blob/main/docs/duo-pane-divider-proposal-2026-11-13.md)을 읽는다. native Glass/실기기 검증 이미지로 오해하지 않는다.

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

**Linux 검증이 실제 무료 Mac 컴파일·서명·업로드 성공을 뜻하지 않는다.** 새 workflow의 첫 GitHub 실행과 Apple 처리는 아직 확인 전이다. 현재 환경의 GitHub dispatch가Forbidden이면 사용자가 위 버튼을 누른 뒤 실제 실행을 확인한다. 이전1.0.0(17)은 이번 Duo 수정 전이며 번호18은 한도 거절 과정에서 할당만 됐다. 새 번호를 임의로 고정하거나18번 재사용을 약속하지 않는다. 아래 Expo cloud 한도/요금 비교는 이전 경로의 이력이며 새 기본 빌드 경로는 이 절을 우선한다.

## 2026-11-13 — 새 iOS 빌드는 Expo 무료 한도 소진으로 차단

[사용자 수동 실행43357992366](https://github.com/thepmpo/donknow/actions/runs/43357992366/job/131664508126)은 최신 main faee581(구현775a561)에서 실패했다. 서버 문법·224개 중223통과/기존 선택1개 제외·타입·iOS JS export는 성공했다. EAS가 인증/기존 서명을 확인하고 업로드한 뒤 **이번 달 Free iOS 빌드 한도를 모두 사용했다**고 거절했다. 실제 중단 원인은 이 계정 한도이며, Node20 action/Ubuntu26 이전 안내나 앱 코드 오류가 아니다.

로그의 핵심: `This account has used its iOS builds from the Free plan this month` / `on Tue Dec 01 2026` / `Error: build command failed.` 원격 buildNumber는17→18로 증가했지만 이 실행에서는 새 빌드 URL·IPA·제출 예약이 확인되지 않았다. **18은 번호 할당이며 설치 가능한 TestFlight18이 만들어졌다는 뜻이 아니다.** 이번 실행은 네이티브 빌드가 가동되기 전 차단됐으므로 Swift/Duo 컴파일은 여전히 미확인이다. 인증·서명 재생성이나 같은 요청 재시도는 하지 않는다. 이번 거절된 요청이 별도 횟수를 차감했는지는 로그만으로 단정하지 않는다.

남은 경로는① 로그에 표시된12월1일 초기화 후 수동 빌드,② 사용자 Mac에서 Xcode와 기존 서명으로 로컬 production 빌드 후 업로드,③ 사용자 선택으로 Expo 유료 플랜이다. [공식 로컬 빌드](https://docs.expo.dev/build-reference/local-builds/)와 [iOS 제출](https://docs.expo.dev/submit/ios/)에서 Mac의 `eas build --platform ios --profile production --local` 또는 Xcode 빌드/업로드를 확인했다. 로컬 빌드는 Expo 클라우드 빌드 서버를 쓰지 않지만 호환 Xcode·로컬 의존성·기존 Expo/Apple 로그인과 서명 확인이 필요하며 아직 사용자 Mac에서 수행하지 않았다. 사무실 Lima Linux VM은 iOS Xcode 빌드 환경이 아니다. [공식 가격](https://expo.dev/pricing)은 Starter 월US$19+사용량으로 표시하며 세금/추가 사용료는 별도다. **유료 가입·결제·한도 초기화 우회·재실행·추가 EAS 요청은 하지 않았다.** 사용자 무료 우선 정책과 push 자동 EAS 금지를 유지한다.

[계정 빌드/요금 확인](https://expo.dev/accounts/thepmpo/settings/billing) · [빌드 실행 화면](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml). 기존 데이터·인증·원본 recovery bundle을 보존했고 이번 변경은 실패 원인과 이어받기 문서뿐이다.

## 2026-11-13 승인 시안 반영 — 카메라 열과 두 화면

Duo는 본문 안쪽 오른쪽이 아니라 **물리 카메라가 있는 맨 오른쪽 열**에 내비게이션을 둔다. 접힘·펼침 모두 그 열 아래에 세로5개 탭, 카메라/상태 표시 아래에는 실제 복귀·닫기 경로에서만 원형 ‹를 표시한다. 상·하 안전 여백8pt,48×226pt 묶음·44pt 조작을 유지한다. 펼친 가로 화면은 왼쪽 캘린더 고정·오른쪽 최초 Todo이며 탭 선택은 오른쪽만 바꾼다. 펼친 세로 화면과 접힌 화면은 선택 중인 화면 하나를 본문 전체에 표시한다. 회전·접힘 시 현재 탭·입력·편집·캘린더 월·스크롤을 보존한다. 일반 iPhone은 기존 하단 탭이다.

이 기준이 아래 이전 가로 탭·본문 안쪽 세로 탭·64pt 보호 padding·단일 본문 정책보다 우선한다. 사용자가 승인한 그림에서 파란 열과 검은 카메라 점은 **위치 확인용 안내 표시**이며 앱에 그려 넣지 않는다. [최신 구현·미리보기·검수](https://github.com/thepmpo/donknow/blob/main/docs/iphone-duo-support.md).

검증: 전체224개 중223통과·실패0·기존 선택1개 제외, 기하11개·모바일 타입·웹/iOS JS 출력·Duo 전환 검사를 통과했다. 카메라 중심선과 탭/뒤로가기 중심선 일치, 본문 밖 배치, 왼쪽 고정/오른쪽 전환, 세로 단일 화면, 월·초안·스크롤 유지, 실제 복귀·비활성 보호·짧은 높이·초기 하단 탭 깜박임 방지를 검사했다. 전체 앱·웹 로그인·모션·AI 채팅/오류·세션 격리 회귀도 통과했다. 공개 문서/디자인 가이드 회귀와131개 이미지 manifest를 검증했다. 구현775a561. 웹 모의 기하/체험 데이터 결과이며 Swift 컴파일·Duo 실기기·시스템 키보드는 미검증이다. 기존1.0.0(17)은380dde2로 이번 수정 전이며 새 네이티브 수동 빌드가 필요하다. push 자동 EAS 빌드는 계속 꺼짐이다.

아래는 정정 전의 날짜별 구현 이력이다. 현재 기준은 위의 카메라 열·가로 분할·세로 단일 화면이다.

## 2026-11-13 추가 정정 — 오른쪽 세로 묶음은 아래, 원형 뒤로가기는 위

사용자는 **하단 가로 내비게이션으로 바꾸라는 뜻이 아니라 지금 오른쪽의 세로5개 묶음을 그대로 아래로 내리라**고 정정했다. 접힘·펼침 모두 세로 배열을 유지하며 아래 안전 영역에서8pt를 띄운다. 배터리/상태 표시 아래의 상단8pt에는 **원 안의 ‹ 뒤로가기**를 별도로 두며 실제 돌아갈 화면/시트가 있을 때만 나타난다. 루트 탭을 바꾸기만 했다고 임의의 뒤로가기 기록을 만들지 않는다.

`DuoBackNavigation`이 안전 영역별 실제 돌아가기/닫기 콜백을 등록·해제한다. 상세/연결/계정 화면과 닫기 조작을 연결하고, 돌아오거나 닫히면 버튼이 사라진다. 저장·연결 중 기존 비활성 조건을 보존한다. 각 모달은 자체 안전 좌표와 콜백을 사용한다. 세로 탭은48×226pt·44pt 조작을 유지하고, 짧은 높이에서는 위 원형 버튼과 겹치지 않게 세로 스크롤한다. 본문 조작 보호를 유지하고 채팅 입력의 최소 폭을 풀어 아래 탭이 보내기 버튼을 가리지 않게 했다. 일반 iPhone의 하단/돌아가기/닫기 위치는 유지한다.

소스 `87849a2`. Duo 전환·동일한 위/아래8pt·세로 열·원형 경계·루트 숨김·상세 진입/복귀 시 표시/해제·비활성 보호·짧은 높이 마지막 탭 접근·실제 채팅 보내기 비가림·초안 유지 검사를 통과했다. 전체221개 중220통과·기존 선택1개 제외, 문법·타입·웹/iOS JS·전체 앱·채팅·오류 회귀를 통과했다. 캡처는 격리 웹 미리보기이며 실제 Duo/Swift/키보드 검수는 별도다. 빌드16은 이전57aee29이므로 새 설치 앱에는 최신 main의 수동 빌드가 필요하다. 추가 EAS 빌드를 요청하지 않았다. 이전의 위쪽 세로 배치 설명은 이 정정 이전 기록이다.

## 2026-11-13 최종 정정 — Duo 오른쪽 세로 배열

사용자의 **“세로배열”** 지시가 최종 기준이다. 이전에 ‘배터리 아래’를 헤더 안의 가로 탭으로 해석한 것은 구현자의 오해다. Duo는 **접힘·펼침 모두 화면 오른쪽 가장자리, 시스템 배터리/상태 표시 아래에서 시작하는 세로5개 탭**이다. 일반 iPhone은 하단 가로 탭을 유지한다.

현재 `DuoTrailingNavigation`은48×226pt의 짧은 세로 묶음이며 각 탭은44×44pt다. 오른쪽·위 안전 영역에서8pt를 띄우고, 헤더 행 밖에서 배치한다. 전체 높이의 별도 패널이나76pt 넓은 rail을 만들지 않는다. 본문 표면은 전체 안전 폭을 유지하되 조작부에는64pt 오른쪽 보호 padding을 적용해 버튼·입력·오류 안내를 가리지 않는다. 높이가 부족하면 탭을44pt보다 줄이지 않고 세로 스크롤로 마지막 탭까지 접근한다. 숫자는 UI 치수이며 기기 판별 조건이 아니다.

공유 `layout` 토큰과 실제 AppNavigation/Shell을 수정했다. 접힘·펼침·책·테이블·320px·짧은 높이·일반 기기 전환에서 세로 열·오른쪽 위치·44pt·짧은 묶음·중복 하단 없음, 입력·현재 탭·편집·스크롤·자식 유지와 마지막 탭 접근을 검사했다. 전체221개 중220통과·실패0·기존 선택1개 제외, 문법·타입·웹/iOS JS·전체 앱 회귀를 통과했다. 캡처는 실제 앱 컴포넌트의 격리된 기하/체험 데이터이며 Swift 빌드·실기기 결과는 아니다.

소스 `5c1ae41`. [새 접힘·펼침 미리보기](https://github.com/thepmpo/donknow/blob/main/docs/iphone-duo-support.md). **기존 빌드16은57aee29로 요청돼 이 세로 수정이 들어 있지 않다.** 웹 배포가 기존 TestFlight 바이너리를 바꾸지 않으며, 아이폰 반영에는 최신 main의 새 수동 빌드가 필요하다. 자동 빌드·유료 전환·기존 인증/데이터 변경은 하지 않는다. 아래 이전226×48 가로/기존 헤더 배치 기록은 폐기된 해석으로 읽는다.

## 2026-11-13 — 네이버 읽기 전용 확정·아이폰 빌드16 요청

사용자 결정으로 네이버는 **받은 메일 읽기 전용**을 유지한다. `NAVER_READ_ONLY=true`를 기존 무료 서버에 병합하고 Blueprint에도 같은 비밀 아닌 값을 기록한다. 읽음 상태 변경·발송·답장을 연결 설정·서버 미리보기/실행·AI/수동 카탈로그에서 막는다. 예전에 저장된 `mailWrite` 권한이나 준비한 실행 초안도 제한을 우회할 수 없으며, 기존 인증·메일 계정·자료를 삭제하거나 다시 저장하지 않는다. 최신 UI는 쓰기 선택을 숨긴다. 기존 설치 앱에 선택칸이 보여도 서버에서 차단되므로 꺼두고 읽기만 연결한다.

[사용자 수동 실행43345083809](https://github.com/thepmpo/donknow/actions/runs/43345083809)는 소스57aee29의 검사 후 **아이폰 빌드16** 요청·자동 제출 예약 접수를 완료했다. [EAS 빌드](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/builds/f2dcece3-7540-4407-b02a-5019579976dd), [제출](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/submissions/a92f2559-01cd-4ca5-8b98-165299799d45). 실제 IPA·Apple 처리·설치는 아직 확인 전이다. 공개 EAS URL은 로그인 없이 정상 상태를 확인하지 못했으므로 실패/완료로 단정하지 않는다. 읽기 전용은 서버 정책으로 이 빌드에도 적용하고, 새 UI만을 위해 추가 EAS 빌드를 요청하지 않는다.

웹·서버 변경은 일반 배포로 반영하며, 설치 앱 코드가 바뀌어 새 아이폰 버전을 테스트할 때만 수동 TestFlight 빌드가 필요하다. 지금 사용자가 버튼을 누른 이유는 작업 환경의 GitHub API 요청 제한이며 매 업무마다 빌드할 필요가 없다. push 자동 EAS 빌드는 계속 꺼둔다. Google·Notion은 설치 후 본인 권한 승인→읽기→시험용 항목/페이지 작성·수정까지 최종 테스트에 포함한다.

[공식 Render 가격](https://render.com/pricing)의 최소 유료 웹 서버는월 US$7부터이며 세금·초과 사용료는 별도다. 네이버 발송을 쓰지 않으므로 무료 플랜을 유지하고 결제·마이그레이션을 실행하지 않는다.

검증: 전체221개 중220통과·실패0·기존 선택1개 제외, 문법·모바일 타입·웹/iOS JS 출력·네이버 전용 읽기 UI·기존 채팅을 통과했다. 전용 회귀에서 이전 인증/권한 보존·읽기 가능·원본 변경0·기존 초안 차단·쓰기 선택 제거·앱 비밀번호 초기화를 확인했다. 이 검사는 모의 계정/공급자이며 운영 네이버 계정 접속 성공과 다르다. 실제 공개 정책 적용은 배포 후 확인한다.

## 2026-11-13 — 예약 브리핑·날씨와 Duo 배치 정정

사용자가 별도 명세 대기를 해제해 정한 시간에 덕 채팅으로 오는 브리핑·도시 날씨를 구현했다. 기본 꺼짐·시간대/자료/AI 동의·중복/취소/복원 보호·아이폰 도착 알림 연결을 포함한다. Duo는 접힘·펼침 모두 배터리 아래 기존 헤더 오른쪽으로 모으고 본문76pt 예약 공간과 전체 높이 rail을 제거했다. [현재 기능·서버 제약](functional-completion-2026-11-13.md), [예약 사용·보호·검증](scheduled-messages-2026-11-13.md), [Duo 화면](iphone-duo-support.md)을 우선한다.

네이버 읽기/읽음 변경을SMTP와 분리했다. Render Free의465/587 차단은 실제 공식 제약이므로 발송은 이 호스트에서 막고 이유를 표시한다. 유료 전환·외부 쓰기·기존 데이터/인증 재설정은 하지 않는다. 실제 계정 승인·iPhone 빌드/기기 수신은 별도이며 TestFlight 수동·출시 준비 마지막 정책을 유지한다. 아래 이전 ‘브리핑·날씨 상세 문서 대기’와‘Duo76pt 세로 열’은 당시 기록이다.

공개 검증: main e7e0ea2의 자동 검사43341877783와 Render live(10:06:11 KST), 공개 health·protocol2·새 문서를 확인했다. 예약 실행기43341877727는 첫 배포 대기 시간 초과 후 서버 live에서 재실행해 `ok:true, processed:0`으로 성공했다. 이는 인증 연결 검사이며 사용자 메시지/실모델/기기 수신 성공은 아니다. [상세 증거](functional-completion-2026-11-13.md).

## 2026-11-12 — UX/UI 10개 수정·편집 저장 가림 보완

사용자 요청에 따라 감사10개와 추가로 발견한 할 일 편집창 저장 버튼 가림을 수정했다. 덕 도구 접기·동의 안내·후보 확인 우선·메모/완료 상세 펼치기·권한 선택 후 연결·44pt·버튼 대비·날짜 선택·작은 탭·선택일/계정 바로가기를 적용했다. 기존 동의/확인·데이터·인증과 브리핑/날씨는 유지한다. [19개 화면과 실제 회귀 검증](ux-ui-fixes-2026-11-12.md), [남은 실계정 가동·기기 확인](functional-workstream-2026-11-12.md)을 따른다. TestFlight는 수동이며 이번 EAS 빌드는 없다. GitHub 반영과 Render 실제 공개 반영은 별도 확인 후 기록한다.

## 2026-11-12 — 출시 준비를 마지막으로 두고 기능·UX 점검

사용자가 추천한 빌드 절약 방식을 승인했다. TestFlight는 수동 실행으로 전환하고 코드 push/PR 검사는 app-checks로 분리했다. 새 EAS 빌드는 요청하지 않는다. 실제 임시 서버·인증·DB에서 모의 AI 후보→초안→사용자 확인→Todo1개 저장·다른 계정 거부·중복 방지를 검증했다. 전체208개 중207개 통과·실패0·기존 선택1개 제외, 문법·타입·웹/iOS JS·전체 앱·계정 격리·오류·Duo 회귀를 확인했다. 사용자 승인 테스트 브라우저의 새15개 화면으로 [UX/UI 부족한 점10개](ux-ui-audit-2026-11-12.md)를 정리했다. 앱 디자인을 일괄 변경한 것이 아니다. 실제 외부 계정 승인·기기 검수와 Figma 한도는 [진행표](functional-workstream-2026-11-12.md)를 따른다. 브리핑·날씨는 후속 명세 대기, 스토어 출시 준비는 마지막이다.

## 2026-11-12 — 실제 AI 답변 확인과 자연스러운 인사

사용자가 운영 덕의 실제 인사 응답을 전달해 모델 호출 성공을 사용자 확인으로 기록했다. 인사에도 업무 자료와 부분 조회 안내를 길게 요구하던 서버 지침을 고쳐, 일상 대화는 짧게 답하고 업무 요청일 때만 근거·후보·확인 흐름을 쓰게 한다. 고정 인사로 AI 호출을 대신하지 않으며 기존 동의·이메일 인증·완료/중복 제외·외부 실행 확인을 유지한다. 수정 후 실모델 말투·실제 할 일/외부 쓰기 성공은 별도다. [확인 범위·변경 기준](assistant-chat-feedback-2026-11-12.md).

## 2026-11-12 — AI 요청 제한 사유 분류 보완

사용자는 새 전송 화면에서 HTTP 429의 분류 불가 안내를 확인했다. OpenAI 공식 오류 문서를 읽어 선불 잔액, 조직/프로젝트 사용 금액, 조직 사용 한도, 급격한 요청량 증가의 새 코드 5개를 안전한 고정 문구로 구분했다. 사용자의 이전 오류가 어느 코드인지는 아직 미확인이다. 잔액 확인을 먼저 안내했으며 결제·자동 충전·한도·키를 변경하지 않았다. 관련 14개·문법 39개 파일·전체 207개 중 206개 통과(기존 선택 1개 제외). [정확한 의미·공식 근거·다음 단계](assistant-chat-feedback-2026-11-12.md).

## 2026-11-12 — 덕 전송 무반응처럼 보이는 오류 안내 수정

사용자가 파란 ↑를 눌러도 그대로이고 오류도 보이지 않는다고 보고했다. 모의 403/502에서 요청은 한 번 전송되지만 안내가 대화 스크롤 밖으로 밀리는 문제를 재현했다. 처리·오류 안내를 입력창 위로 옮기고, 입력과 동의를 보존한 **다시 보내기**, **AI 연결 다시 확인**, 서버 오류별 쉬운 안내를 추가했다. 자동 재전송·실행 확인 생략은 없다. 기존 계정·인증·데이터·브리핑·날씨는 보존한다. [진단·수정 전후 화면·버튼별 안내](assistant-chat-feedback-2026-11-12.md).

문법·타입·웹/iOS JS·전체 앱·기존 채팅 및 새 오류 회귀를 통과했다. 루트 207개 중 206개 통과·실패 0개·기존 선택 1개 건너뜀. 서버 AI 설정은 13:36 KST 배포 후 활성화됐지만 실제 사용자 AI 응답·권한/한도 원인은 아직 미확인이다. GitHub 저장과 공개 배포는 [실제 배포 근거](release-readiness-2026-11-12.md)로 구분한다.

후속 확인: `7eeac79`의 Render 배포가 13:52 KST에 live가 됐고 공개 문서·디자인 가이드·로그인 화면·서버 정상과 `assistant:true`를 확인했다. 같은 커밋의 iOS 자동화는 빌드 15 생성·제출 요청까지 성공했다. 실제 AI 답변·Apple 처리·기기 설치는 미확인이다. [배포 근거](release-readiness-2026-11-12.md).

## 2026-11-12 — Product Design 덕 채팅 후속 검토

Product Design 설치 알림 뒤 요청→후보→확인→결과의 네 단계를 실제 웹 번들의 모의 데이터로 캡처·검토했다. 새 후보가 나올 때 메모 아래로 내려가 제목·날짜가 가려지는 문제, 자료 선택을 열어도 보이지 않는 문제, 이미 준비한 후보의 날짜가 수정 가능해 보이는 문제를 고쳤다. 기존 동의·실행 확인·계정 격리·톤과 토큰을 보존했다. 이전 기록 5개가 있어도 새 답변/초안/결과가 화면에 보이는 회귀와 전체 앱 검사를 통과했다. 루트 검사 202개 통과·기존 선택 1개 건너뜀, 문법 39개·타입·웹/iOS JS export 통과. 실제 AI·기기 검증은 별도다. [수정 전후 화면과 상세 결과](product-design-chat-audit-2026-11-12.md). 구현 커밋 [adf396b](https://github.com/thepmpo/donknow/commit/adf396b), Render 공개 반영은 대기였다.

후속 확인: 검증한 `dd1abae`의 Render 배포가 live가 됐고 공개 `/project`·`/design-guide`·지원 연락처·health를 확인했다. 같은 커밋의 iOS 자동화도 성공해 빌드 14 생성·제출 요청을 접수했다. 실제 AI 활성화·Apple 처리·설치는 별도다. [정확한 배포·빌드 근거](release-readiness-2026-11-12.md).

## 2026-11-12 — TestFlight CI의 임시 Git 저장소 설정 격리

덕 변경을 반영한 `06cb1e3`의 [iOS 실행 43129844358](https://github.com/thepmpo/donknow/actions/runs/43129844358)이 npm 검사에서 중단됐다. 원인은 CI 서버의 전역 Git LFS 설정이 기존 사무실 동기화 fixture에 상속돼 의도된 필터 차단이 발생한 것이다. 같은 임시 설정으로 11개 실패를 재현했고, 테스트 프로세스의 Git 설정만 격리했다. 실제 전역 필터를 다시 넣으면 여전히 fetch 전 차단하고 원본/설정을 보존하는 회귀를 추가해 26개 모두 통과했다. 제품 보호 코드·사용자 Git 설정·기존 인증은 변경하지 않았다. TestFlight workflow에도 테스트 단계에만 동일 격리를 명시했다. 사무실 기능 개발 재개가 아니라 덕 출시 검사 복구다. 수정 후 CI와 같은 설정에서 전체 203개 중 202개 통과·기존 선택 검사 1개 제외·실패 0개를 확인했다. 후속 [GitHub 실행 43130303497](https://github.com/thepmpo/donknow/actions/runs/43130303497)도 성공했고 EAS build number 13 요청을 접수했다. 실제 Swift 컴파일·Apple 처리·설치는 별도 미확인이다. 정확한 build/submission 링크는 [출시 기록](release-readiness-2026-11-12.md)에 보존한다.

## 2026-11-12 — 덕 채팅·로그인·Apple Duo·개인 Notion 기록

사용자가 AI 사무실을 보류하고 덕의 남은 기능과 Apple iPhone Duo를 진행하도록 승인했다. 덕 탭 안에서 동의 기반 AI 대화, 자료 선택, Todo 후보 편집, 실행 미리보기와 확인을 연결했다. 자동 발송·자동 외부 쓰기는 없으며, 늦은 기록 조회가 새 초안을 덮지 못한다. 기존 고급 비서와 AI 미설정 시 수동 초안 경로를 유지한다. [비서 실행](assistant-actions.md).

로그인 초기 조회·이전 계정의 401·늦은 프로필 응답이 현재 계정을 덮지 않도록 차단했다. 미리 알림·기기 알림도 계정 전환 이후의 늦은 처리를 점검한다. 저장된 인증 형식·원본 DB·암호화 키는 바꾸지 않는다.

Apple 공식 UIHingeInteraction·reservedRegions에 기반한 로컬 Expo 모듈과 `DuoTrailingNavigation`을 추가했다. 일반 iPhone은 하단을 유지하고, Duo는 오른쪽 내비게이션과 안전한 단일 본문 영역을 사용한다. 힌지·가림 영역·모달 좌표를 처리하고 React 자식·탭·입력·편집·스크롤을 보존한다. 기기 이름/폭으로 Duo를 추정하지 않는다. Xcode 27.1 EAS 이미지를 선택했으나 Swift 실제 컴파일·서명·Duo 실기기는 미확인이다. [구현과 검수](iphone-duo-support.md).

공개 조회에서 서버 정상, AI 비활성, Google·Notion 설정 존재, Slack 미설정을 확인했다. 예약 백업 42924574013의 암호화 snapshot·격리 복원과 기존 iOS Actions 42745583353 요청 성공을 독립 확인했다. 새 빌드나 실제 AI/외부 쓰기 성공을 뜻하지 않는다. 공개 운영자 **Kim Sanghyun**, 문의 **thepmpo.official@gmail.com**을 사용자가 확정했다. `/support`와 검토 중인 `/privacy` 페이지를 준비했으며 시행일·실제 계약/지역/보관 조건·App Privacy·심사 자료는 확정 전이다. [운영·출시 근거](release-readiness-2026-11-12.md).

선택한 개인 Notion에 `duckduck · 제품·개발 기록`, 이번 업무 기록, Notion·Craft·추천 스킬 비교를 실제 저장했다. 매 업무의 변경·검증·미확인·다음 일을 기록하는 지침을 AGENTS.md에 반영했다. 비공개 계정 주소·페이지 내용은 공개 저장소에 복사하지 않는다. Craft의 공식 MCP/API 기능은 확인했으나 동일 조건 토큰 비교는 미실시다. [추천 스킬·공식 전체 ZIP·설치 방법](tooling-and-documentation.md).

Figma의 기존 69개 화면 ID는 다시 읽었고 후속 작업은 Starter 호출 한도로 중단됐다. Current baseline 교정·Proposed 분리는 미완료다. [대조 기록](figma-baseline-review-2026-11-12.md). 예약 브리핑·날씨는 후속 간략 문서 전 변경하지 않았다. 사무실 재개 전 업데이트를 요구하지 않는다.

검증: 루트 자동 검사 **202개 중 201개 통과·0개 실패·기존 사무실 실행기 선택 검사 1개 건너뜀**, 문법 39개·모바일 타입·최종 web/iOS JS export 통과. 새 채팅·계정 전환 3상황·Duo 접힘/펼침/책/테이블/일반기기 모의 브라우저 검사를 통과했다. 기존 웹 로그인·모션 회귀도 통과했다. 공개 페이지 생성·GET/HEAD/405/CSP·390/1280px, 일일 문서 생성 검사와 `/project` 댓글·이미지 전체·320px 회귀도 통과. iOS JS export는 Swift 컴파일이나 실기기 성공이 아니다. 기존 전체 앱 회귀는 새 인라인 채팅과 동의 흐름에 맞춰 갱신한 후 통과했다. 최초 실패는 별도 비서 시트를 기대하던 옛 검사의 차이였으며 동의·미리보기·확인 전 미저장 검증은 유지했다.

구현 커밋: [7644621](https://github.com/thepmpo/donknow/commit/7644621). Render 자동 배포는 꺼져 있고 이번 변경의 공개 반영은 아직 아니다. Google·Notion 쓰기 재승인, Slack 앱/채널, 네이버 IMAP/SMTP·앱 비밀번호, iPhone 권한은 실제 사용자 계정에서 진행해야 한다. 원래 복구용 Git bundle을 그대로 보존했다.

## 2026-11-12 — 추천 스킬·보고서 PDF와 Gmail·업무관리 보관 연결

사용자의 스킬 일괄 준비, 보고서 메일 수신, 업무관리 무반응, 에이전트 협업 질문에 따라 [기능별 쉬운 사용 안내](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-capabilities.md)를 추가했다. 관리형 문서고의 **추천 스킬 한 번에 연결**은 프로젝트에 공통 지침과 직무별 지침을 연결하고 다음 새 업무의 설명에 실제 본문과 버전을 넣는다. 외부 스킬 전체 설치나 모델 재학습은 하지 않으며 이미 준비된 업무는 기존 자료를 유지한다.

보고서는 요약과 원문 전체를 포함한 인쇄 화면에서 PDF로 저장한다. 사용자는 Gmail을 선택했다. Mac에서 본인 Gmail·Google의 16자리 앱 비밀번호를 사무실 설정에 입력하면 로컬 암호화 저장하고, 사용자가 선택한 PDF만 확인 후 본인 Gmail로 보낸다. 연결 설정 저장은 실제 인증 성공이 아니다. 보고서 완료 즉시 자동 생성·발송은 추가하지 않았다. 메일 서버 접수와 실제 수신을 구분하며 결과 미확인·같은 요청은 자동 재발송하지 않는다. 비밀값은 채팅·문서·Git에 요구하거나 기록하지 않는다.

업무관리 실행·삭제는 기본 경로가 거절돼도 콘솔에만 오류를 남기던 문제였다. 실행을 기존 안건 확인창에 연결하고, 삭제는 보고서·메시지·로그를 보존하는 **보관/모두보기에서 복원**으로 바꿨다. 실행 중 업무·남은 승인·미완료 회의는 보관을 거절하고 사유를 표시한다. 기존 네이티브 삭제·임의 실행 차단은 유지한다. 팀장회의는 기존의 최대6명 순차 의견과 종합1회(최대7회 실행)이며 상호 반복 토론·최적안 보장으로 표현하지 않는다.

적용은 진행 중 업무가 끝난 뒤 [Mac 업데이트 ZIP](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-mac-development.zip)의 **11-enable-development.command**, 또는 [Windows 제어 ZIP](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-control.zip)의 **11-enable-development.cmd**를 사용한다. 일상 실행은0번이며 프로젝트 문서는 별도로 **전체 대화 → 코드 수정 → 최신 코드 확인 → 최신 코드 받기**로 동기화한다.

검증: 지침7개·메일 모의10개·쉬운 보고서7개·보관5개·제어14개 통과 기록. TypeScript·Vite 최종 빌드 통과. 문서고·PDF·Gmail은 PC·390px 모바일, 업무관리·전체 대화·팀장회의는 PC 브라우저 검증, 루트187개 통과·선택 격리 검사1개 건너뜀, 문법37개, Python 업데이트·설치30개, 배포 ZIP5개 CRC·내용 해시 검증을 완료했다. 공개 문서를 생성하고 댓글·일일 집계 회귀와 새 문서 링크를 확인했다. 사용자 Mac 적용, Google 앱 비밀번호 실연결, 실제 Gmail 수신, 이번 변경 적용 후 실모델 응답은 아직 확인하지 않았다. Render 자동 배포는 꺼져 있으며 사용자 데이터·인증 초기화나 실제 외부 발송·공개 배포는 수행하지 않았다.

## 2026-11-12 — 사무실 요청 시작 실패 이유와 회의 후 추가 요청 안내

사용자는 새 요청을 실행할 때 팀장회의가 아직 진행 중이었다고 확인했다. 진행 중 업무가 있으면 새 검토를 막는 기존 동작과, 여러 시작 실패를 같은 문구로 보여주던 UI 문제를 코드로 확인했다. 사용자 Mac의 실제 오류 코드는 받지 않았으므로 해당 실패 원인을 확정하지 않는다. 화면은 진행 중 업무, 로그인·실행 준비, 실행 설정, 바뀐 요청·이전 보고서, 실행 결과 확인 필요를 구분해 다음 행동을 안내한다.

기존 서버의 단일 업무·명시적 실행 확인·읽기 전용 검토·권한 검증은 유지한다. 진행 중 업무로 막힌 초안은 보존하며, 회의가 끝나도 자동 대기열이나 자동 재실행은 없다. 회의 수정안을 받아보려면 **종합 보고서 보기 → 이 안건에 추가 요청**으로 실제 보고서를 연결한 뒤 질문한다. 이때 읽기 전용 검토가 적절하며, 문장에 회의를 언급하는 것만으로 보고서가 첨부되지는 않는다.

적용은 회의와 실행 중 업무가 끝난 뒤 [최신 Mac 업데이트 ZIP](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-mac-development.zip)의 **11-enable-development.command**를 실행한다. Windows는 [제어 ZIP](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-control.zip)의 같은 번호 `.cmd`를 사용한다. 프로젝트의 **최신 코드 받기**만으로 설치된 사무실 프로그램은 갱신되지 않는다. [요청·보고서 사용 안내](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-control.md).

검증: 루트 자동 테스트161개 중160개 통과·실제 release 격리 선택 검사1개 건너뜀(이번 실행기 변경 없음), 문법37개 통과. 포함된 제어 회귀12개 통과. 회의 업무로 차단될 때 실행 권한을 준비하지 않고 같은 초안을 유지하며, 회의 종료 후 명시적으로 다시 실행해야 한 번만 시작함을 검증했다. 데스크톱·390px 모바일 브라우저에서 원인별 안내, 초안·입력 보존, 자동 재실행 없음, 같은 요청의 명시적 재시도를 통과했다. TypeScript·Vite 빌드, UI/설치·업데이트 Python 회귀26개, 갱신 ZIP5개의 CRC·UI 소스 해시 검사도 통과했다. 검증 환경에서 최초 전용 updater 명령은 고정 pnpm 경로 부재로 중단됐고 원본을 보존했다. 동일 업데이트 함수에 환경의 pnpm 빌더를 연결해 타입·빌드·백업·교체를 검증했다. 최초 브라우저 대상8810은 이전 입력 화면이어서 iframe 검사가 실패했으며, 네이티브 UI가 제공되는18821에서 PC·모바일 검사를 완료했다. 사용자 Mac 데이터·인증 조회와 실제 모델 실행은 하지 않았다. Render 자동 배포는 꺼져 있으며 이번 수정의 공개 배포·실기기 적용은 별도 확인이다.

## 2026-11-12 — 이 채팅과 AI 사무실의 양방향 이어받기 확정

사용자는 여기서 수정한 뒤 사무실 갱신이 필요하다는 안내를 매번 요구했고, 사무실의 수정도 이 채팅 작업자가 알고 이어가야 한다고 확인했다. [공통 이어받기 기준](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-shared-work.md)과 AGENTS 지침을 추가했다. 작업 전 GitHub 최신 main·실제 diff·변경/검증 기록을 먼저 확인하고, 작업 후 프로젝트 최신 코드 받기와 사무실 프로그램 업데이트를 구분해 안내한다. 현재 자동 감시/실시간 대화 공유를 새로 구현한 것은 아니다.

미게시 작업 사본·채팅·보고서·문서함 자료는 자동 공개되지 않는다. 기본 인계 생성기가 모든 격리 작업 사본의 미커밋 변경을 수집하지 않는 한계와 실제 patch/파일·검증 확인 요구를 명시했다. 문서고(스킬 목록)·문서함(제품 자료)·보고서(업무 결과)도 구분했다.

사용자는 Tailscale Serve 허용 완료 화면과 휴대폰 사무실 접속 성공을 확인했다. 모바일에서 작게 보인다는 피드백을 기록했다. Wi-Fi를 끈 모바일 데이터 접속·다른 컴퓨터 접속·11번 개발 업데이트·12번 GitHub 로그인·실제 코드 게시/배포는 미확인이다. 원격 main은 변경 전 fetch해 로컬 기준과 일치함을 확인했다.

검증: 기존 공개 문서 댓글 회귀1개, 일일 문서 집계 회귀1개 통과. 인계/공개 HTML 생성·새 문서 포함·로컬 링크·diff 검사를 확인한다. 앱/설치 패키지/DB/인증/복구 bundle은 변경하지 않는다. Render 실제 배포는 실행하지 않으며 GitHub 저장과 공개 반영은 구분한다.

## 2026-11-11 — 승인한 코드 수정·검사·GitHub 반영·Render 배포 연결

[개발 연결 파일·사용법·계정 단계·검증](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-development.md)을 추가했다. 전역 잠금은 유지하고 승인한 작업만 전용 사본에서 수정한다. 최신 코드/문서 기준을 확인해 fast-forward로 맞추고, 변경 후 별도 격리 검사와 정확한 변경 확인을 거쳐 일반 push한다. 로컬 소스와 작업 사본을 보존하고 게시된 과거 사본도 영수증과 정확히 일치할 때만 다음 동기화에 허용한다. Render는 별도 승인한 정확한 main SHA와 기존 무료 서비스만 대상으로 하며 비밀이 있는 job에서 프로젝트 코드를 실행하지 않는다. 모바일 main 반영에 따른 기존 TestFlight 자동화 가능성을 확인창에 알린다.

Mac11번·Windows11번 업데이트는 유휴/해시 검사·백업·검증된 서버 재시작·실패 복구를 제공하고 검사 도구를 이어서 준비한다. GitHub 공식 로그인12번, 검사 도구 재개13번을 제공한다. GitHub/Render 계정 연결·실제 모델 수정·사용자 기기/배포는 미확인이다. 이번 작업 자체로 Render/TestFlight를 배포하지 않았다. 공개 `/project` 읽기는 환경 프록시의 `Tunnel connection failed: 403 Forbidden`으로 확인하지 못했다. 생성 소스·공개 HTML 파일은 저장했으며 실제 공개 반영과 구분한다.

검증: runtime API262개·웹76개, Python99개 중98개 통과(선택적 기존 bwrap1개 미실행), 개발 제어25개·업데이트11개·검사 준비8개, 실제 릴리스 격리 별도 통과. 타입/빌드·HTTP/CSRF·데스크톱/390px 모바일·기존 대화/회의·문법 검사 통과. 최종 Node 전체160개 중159개 통과·실제 격리 선택 검사1개는 별도 실행해 통과했다. 배포 ZIP9개의 CRC·내용·Mac 실행 권한과 제어 모듈 해시를 확인했다. 복구 bundle의 SHA-256은 그대로다.

## 2026-11-11 — Mac 사무실 휴대폰 비공개 연결

[휴대폰 연결 파일·사용법](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-phone.md)을 추가했다. 기존 Mac 사무실을 재사용하고 동일 Tailscale 계정으로 HTTPS 접속한다. 개인 소유자 설정과 기존 공유 경로를 검증하며 다른 경로·Funnel·계정 충돌은 덮지 않는다. 설정/호스트 모의15개와 ZIP 검증 통과. 실제 계정 로그인·HTTPS 동의·외부 휴대폰 접속은 사용자 확인 대기다. 코드 수정·배포 연결은 후속 작업이며 이번 휴대폰 파일이 해당 권한을 켜지 않는다. Render 배포는 하지 않았다.

## 2026-11-11 — Mac 사무실 한 번에 열기

- `0-open-office.command` 하나로 기존 Lima VM, 설치된 사무실·문서함·채팅 서버를 시작하거나 재사용하고 브라우저를 여는 경로를 추가한다. [Mac 시작 파일과 안내](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md).
- 기존 로그인·업무·설치 파일을 보존한다. 재설치·화면 업데이트·자동 업무 실행은 하지 않는다. 새로 시작하는 서버는 백그라운드에서 실행하며, 이미 켜진 수동 서버 창은 계속 유지한다.
- 사용자 Mac의 설치 완료·화면 열림·로그인 단계 완료·채팅 설치 로그를 최신 인계에 반영한다. 이번 0번의 실기기 실행·직원 14명 연결 상태·실제 모델 응답은 확인 대기다. Render 공개 배포는 수행하지 않았다.

검증: 새 실행 검사 17개 통과(호스트 모의9·실제 Linux 임시 서버8), Python 전체58개 중57개 통과·선택적 bwrap1개 미실행, 문법37개·공개 문서 회귀1개·ZIP 내용/CRC/실행권한 확인 통과. 실제 사용자 Mac의 0번 실행은 다음 확인이다.

## 2026-11-11 — 사용자 Mac 설치 완료 로그 확인

- 사용자가 수정 재개 파일의 `Installation checked.` 및 첫 검토 대기 준비 완료 로그를 제공했다. [현재 Mac 상태와 다음 단계](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md)를 갱신했다.
- 다음은2-start.command로 화면 열기다. 로그인·실제 AI 응답·Windows/클라우드 이전 성공으로 확대 해석하지 않는다. 코드/보안 설정/인증 변경 없이 문서만 기록했다. Render 공개 배포는 별도 미확인이다.

## 2026-11-11 — Mac 중첩 격리 검사기 결함 수정

- 사용자 설치 재개 실패 후 검사기의 `/proc` 마운트 누락을 실제 bwrap로 재현했다. 실제 실행기와 같은 `--proc /proc`를 적용해 uid_map 쓰기 실패를 고쳤으며 AppArmor 허용 범위는 그대로다.
- 모의 검사 외 실제 중첩/읽기 전용 회귀를 추가하고 실패 단계만 안전한 코드로 표시한다. 설치/복구 검사41개 통과. 별도 브랜치의 Ubuntu24.04 CI는 저장소 DNS 오류로 격리 검사 전에 중단됐고 main에 포함하지 않는다. [최신 설치 재개 안내](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md).
- 사용자 Mac 설치·로그인 성공과 Render 배포는 아직 확인 전이다. 이전 실패를 성공으로 기록하지 않는다.

## 2026-11-11 — Mac 앱별 격리 허용과 설치 재개

- 사용자 진단으로 Ubuntu AppArmor의 userns/bwrap/net_admin 거부를 확인했다. [설치 재개 파일과 검증 범위](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md)를 추가했다.
- 검증한 사무실 전용 Node에만 앱별 namespace 허용을 연결하고 일반 bwrap·전역 보안 설정을 유지한다. 기존/충돌 프로필은 보존하며 실패 시 새로 만든 규칙만 복구한다.
- 기존 VM에 최신 설치기만 임시 전송한다. checkout·인증·DB를 덮지 않고 첫 사무실 구성 전에 실제 Codex의 읽기 허용·쓰기/네트워크 차단을 임시 데이터로 검사한다. 모델 호출은 없다.
- 자동 회귀와 실제 Linux Codex 격리 검사를 통과했다. Mac 적용·설치·로그인 성공 및 Render 공개 반영은 사용자 결과 대기다.

## 2026-11-11 — Mac 설치 bwrap 오류 진단

- 실제 Mac에서 Ubuntu 설치 후 격리 검사 `Failed RTM_NEWADDR`로 중단됨을 확인했다. AppArmor 제한이 유력하며 실제 원인은 사용자 VM 진단 결과를 기다린다.
- [Mac 진단 파일과 후속 기준](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md)을 추가했다. 기존 VM/데이터/인증을 보존하고 일반·중첩 격리를 구분해 검사하며 모델 호출/보안 설정 변경은 없다.
- 진단 모의 검사3개, Mac 실행기2개 및 bash 문법/ZIP 실행 권한 검증. 실제 Mac 진단·수정 성공과 Render 공개 반영은 아직 확인 전이다.

## 2026-11-11 — 업무 입력창·보고서 확인·휴대폰 비공개 설정

- 사용자 요청으로 [추가 제어 패키지](ai-office-control.md)를 구현했다. 프로젝트 선택/요청 입력→초안 확인→명시적 읽기 전용 실행→진행/중지/보고서→확인 완료를 연결했다. 실제 모델/개발 자동 실행은 하지 않았다.
- 기존 ‘미결 의사결정’의 review 결과를 사용자 확인 대기로 표시하며 원래 GET decision-inbox의 의견 취합/알림 경로를 호출하지 않는다. 제품 검토 consumed·맥락·결과 해시 일치 때만 원자적으로 done/감사/로그를 기록한다. 개발/병합/배포 승인이 아니다.
- Windows용9-open-office와10-phone-connect를 준비했다. 본인 계정 pin·Tailscale Serve만 사용하고 Funnel/다른 계정/임의 쓰기를 거부한다. 기존 데이터/인증/런타임을 재설치하지 않는다.
- 격리 HTTP/SQLite/모의 backend와 모바일 UI·PowerShell/모의 Tailscale·실제 로컬 조회를 검증했다. 실제 사용자 PC/휴대폰 로그인·접속·새 모델 응답은 확인 대기다.

## 2026-11-11 — 사무실 글자 가독성·사용 흐름 정리

- 사용자 요청으로 이름을11px·말풍선을12px로 키우고 헤더/좌석/휴게실/말풍선 간격을 조정했다. [사용 안내와 독립 UI 업데이트](ai-office-usage.md). 현재 사용자 PC의 첫 검토가 실행 중이므로 자동 적용/재시작하지 않는다.
- UI 전용 변경/별도 staging 빌드/원본 백업·실패 복구·작업 실행 중 거부를 지원하는8-larger-text.cmd를 준비했다. DB/인증/업무/worker 권한은 변경하지 않는다.
- vendor 웹76개·빌드, 데스크톱/390px 렌더, PowerShell 전송·업데이트 회귀를 검증했다. Windows 실제 적용과 외부 폰 접속은 미확인이다.
- PC 전원만으로 외부 폰 접속이 되는 것은 아니며 비공개 연결/인증이 필요하다. 현재4-first-review는 첫 검토 전용이며 연출 말풍선/실제 결과를 구분하고 범용 요청 입력 UI는 남은 작업으로 기록했다.

## 2026-11-11 — 실제 Windows 로그인 보조 파일 처리 v2

- 사용자 PC의 파일 이름 목록으로 auth.json 외 tmp/log/auth.lock/auth.json.lock이 남는 것을 확인했다. v1은 tmp만 처리해 실패했으므로 [독립 v2 수정 ZIP](ai-office-login-repair.md)을 제공한다.
- 4개 보조 항목만 private 백업하고 인증 바이트·inode·mtime·권한과 DB/설정을 보존한다. 실행 중인 로그인/열린 파일·advisory lock·다른 설정/심볼릭 링크는 거부하고 안전한 reasonCode를 출력한다. Worker auth-only 정책은 그대로다.
- 실제 목록 재현과 잠금/로그 사용 중 거부를 검증했다. 실제 PC의 authReady와 모델 응답은 수정 후 결과 대기다.

## 2026-11-11 — 공식 Codex 로그인 임시 폴더 오판 수정

- Windows 실제 진단의 office_provider_home_not_fresh를 공식 Codex0.167.0/가짜 인증/네트워크 차단으로 재현했다. 공식 CLI가 .codex/tmp를 생성해 사무실 auth-only 검사가 거부한 설치 도구 오류다.
- [수정 ZIP/안내](ai-office-login-repair.md)를 추가했다. 기존33c3587 설치에서도 인증 파일·DB·키·설정·worker 정책은 유지하고 임시 폴더만 private 백업으로 이동한다. 로그인 성공 후 후처리와 진단도 추가했다.
- 실제 CLI 재현 false→true/인증 바이트 보존, JS/Python 회귀와 PowerShell 호출 검증을 수행했다. Windows 실제 인증/AI 검토 성공은 사용자 결과 대기이며 fake-auth 진단으로 대체하지 않는다.

## 2026-11-11 — AI 사무실 주술회전 직원 테마

- 사용자 요청에 따라 직원14명의 외형/한국어 표시 이름을 고죠·이타도리·후시구로·노바라 등으로 변경했다. [매핑/에셋/복원 안내](ai-office-jjk-theme.md). 기존 직원 ID·부서·직급·모델·업무와 실행 잠금을 보존했다.
- 투명 생성 시트와 전면/좌/우70개 PNG·해시를 저장하고 새 번호만 사용했다. 적용 전 원래 외형을 비공개 백업하며 사용자가 이후 선택한 외형/충돌 에셋은 덮지 않는다.
- 현재 사무실에 적용해14명/70개 HTTP PNG·실제 canvas·브라우저 오류 없음과 복원/재적용을 확인했다. Windows ZIP에는6-characters.cmd를 추가했고 새 설치 기본 테마에 연결했다. 실제 Windows/Mac 기기 확인은 미완료다. 앱 UI/인증/실제 AI 업무는 변경하지 않았다.

## 2026-11-11 — Windows 우선 설치·Mac 실행 경로·작업물 인계

- 사용자가 PC에서 먼저 실행한 뒤 클라우드에 인계하는 흐름을 선택했다. [Windows 패키지/Mac 안내](ai-office-local-install.md), 잠금 기본값·독립 키·기존 DB 키 보존 설치 도구를 추가했다. Windows는 WSL2, Mac은 Lima Ubuntu에서 기존 Linux 격리 기능을 유지한다.
- “인수인계서” 요청은 [인계 기준](ai-office-handoff.md)에 따라 문서+실제 Git bundle/소스/변경+검증 결과+작업자 설명을 제공하도록 기록했다. 인증·암호화 DB·실행 승인은 자동 이전하지 않는다.
- 실제 PowerShell 구문/모의 WSL 호출·직접 대화형 로그인 전달, 셸 구문·설정/키 보존·인계 보안 테스트를 검증했다. Windows/macOS 실제 설치와 계정 AI 응답은 아직 미확인이다. 기존 클라우드/앱/UI/키/DB/캐릭터는 변경하지 않았다.
- 직원 편집의 기본 캐릭터 변경과 2×2 스프라이트 업로드 기능을 코드에서 확인했다. 외형과 AI 능력/권한은 별개다. 실제 새 이미지 등록은 하지 않았다.

## 2026-11-10 — 모든 역할의 공통 제품 지식

- 기존 제품 문서를 기본 연결하고 파일/본문 추가 즉시 버전을 발행하는 로컬 문서함을 구현했다. 원본 문서 변경은1초 간격으로 반영한다. 프로젝트 범위와 공통 범위를 구분했다.
- 모든 worker에 목록·원문 읽기 전용 경로를 제공하고, 지식 변경 시 이전 승인 무효화/인덱서 중단 시 신규 실행 거부를 적용했다. 실행 중인 모델에 소급 학습시키지는 않는다.
- 사무실 API252개·빌드, 프로젝트 테스트66개, 공개 문서 회귀 통과.
- [사용 및 인계](ai-office-knowledge.md). 기존 앱/계정/복구 bundle 보존. 브라우저 업로드·작은 화면·CSRF, 지식 격리와 승인 변경을 검증했다. 실제 모델 호출/Render 배포는 미확인이다.

## 2026-11-10 — AI 사무실 승인 게이트·읽기 전용 검토 구현

- 사용자 다음 단계 요청에 따라 별도 Claw-Empire 사무실에 작업/프로젝트/담당자/기준HEAD/인계서 해시를 묶는10분 승인·철회·단일 실행을 구현했다. 읽기 전용 제품 source, 승인된 개발 worktree만 쓰기, 원본/공용 Git 읽기 전용, 회의·API·OAuth·직접 spawn·설치·자동 merge/push 우회를 차단한다.
- 일반 세션과 별도의 운영자 확인을 요구하며 사무실/공급자 비밀값을 worker 환경으로 전달하지 않는다. 새 임시 HOME과 읽기 전용 인증 파일, 프로젝트 로컬 .codex 차단을 추가했다. 실제 모델은 호출하지 않았고 업무/승인/직원 모델 연결은0이다.
- 사무실 API237개(신규 정책/훅/실행 경계34개 포함), production build, 가짜 자료+고정 셸의 실제 OS 마운트 smoke를 통과했다. 도구 샌드박스 내부 uid-map 제한과 호스트 실행 가능 경로를 구분해 서버를 정상 교체했으며 workersEnabled:false를 유지한다. 실제 Codex 인증/모델 전체 실행은 다음 검증 대상이다.
- 재현 패치와 pinned upstream/SHA-256을 tools/ai-office에, 승인·적용 도구를 scripts에, 운영 상태/한계를 ai-office-approval-gate.md에 저장했다. 별도 clone에서 패치 정확한 재현을 검증했다. vendor에는 로컬 policy commit28baa44만 만들고 upstream push는 하지 않았다.
- duckduck 앱/서버·Figma·브리핑·날씨·Duo·운영 데이터/인증·복구 bundle은 보존했다. 변경 전 사무실 DB 백업도 보존한다. GitHub 문서 저장과 Render 공개 반영은 구분한다.


## 2026-11-10 — 여러 프로젝트 AI 사무실 초기 구동

- 사용자 요청에 따라 duckduck과 이후 DAYWIT/다른 프로젝트를 필요에 따라 연결하는 별도 AI 사무실 기반을 준비했다. DAYWIT 주소는 나중에 받으며 다른 프로젝트 추가가 가능한 등록 도구를 보존했다.
- Claw-Empire2.0.4 pinned source를 별도 복제·설치·빌드하고 한국어 실제 화면/health200·브라우저 오류0을 확인했다. duckduck은 원본이 아닌 격리 소스 사본을 수동 배정으로 등록하고 사본의 push를 비활성화했다.
- 직원 모델 연결0·업무0·자동배정false·YOLO false로 시작한다. 실제 AI 작업/과금·승인 게이트 완성은 아직 아니며 제품팀 읽기 전용·승인 후 개발 실행 검증 뒤 활성화해야 한다.
- 앱/서버/Figma/브리핑/날씨/운영 인증·데이터·복구 bundle은 보존했다. 자세한 상태·실행/등록 명령·남은 작업은 ai-office-setup.md에 기록했다.


## 2026-11-10 — 톤앤톤 추천안 공식 확정

- 사용자가 최신 추천안 A + ② + 가를 승인했다. 차분하고 친근한 비서·필요할 때 역할 표시·오리는 인사/완료 순간에 가볍게 표현을 공식 기준으로 확정했다. 초기 초안의 A + ① + 가보다 이번 승인이 우선한다.
- 디자인 가이드·쉬운 설명·상세 분석·재사용 원칙 RP-01~RP-12를 공식 v1.0으로 갱신하고 인수인계/공개 문서 생성 소스에 반영했다. 새 화면/수치/구현을 일괄 승인한 것으로 확대하지 않는다.
- 앱·서버·Figma69개·브리핑·날씨·Duo·인증/데이터·복구 bundle은 보존한다. 이번 작업은 문서 반영이며 Render 공개 반영 여부는 Git 저장과 구분한다.


## 2026-11-10 — AI 사무실 대화 분석과 톤 합의 문서

- 첨부 전체를 읽고 15개 UX 영역·현재 토큰·상태별 기준·승인 인계·기기/Figma/코드 검수를 상세 분석했다. ai-office-ux-analysis.md, ai-office-tone-summary.md, reusable-product-design-principles.md를 새로 작성했다.
- 사용자의 직접 선택과 이전 AI 제안·해석을 구분하고 새 시각 톤은 승인 대기로 유지한다. 원문 전체는 공개 재게시하지 않았다. 이 기록은 서비스 도구의 공식 기능 검증이나 사용자 리서치 수행을 뜻하지 않는다.
- 사용자 확인 운영 기준은 Render f76172d·iPhone Actions 성공·TestFlight1.0.0(12)로 갱신했다. 앱·서버·브리핑·날씨·Figma69개·인증·기존 데이터·복구 bundle은 그대로 보존한다.
- 붙여넣기 채팅 중심 흐름과 예약 브리핑/날씨 방향만 기록했다. 상세 기능 문서 전 구현 보류, Apple iPhone Duo 우측 내비게이션은 “Duo 진행” 전 기록만 유지한다.
- 공개 HTML 생성 소스의 앞쪽에 최신 결정과 문서 링크를 추가하고 상세 문서도 전체 참고 자료에 포함한다. 일일 수동 기록을 별도로 보존한다.
- 검증은 생성기·일일 문서 테스트(1개)·공개 HTML/이미지·링크·댓글·320px 회귀와 문법/누락 검사를 통과했다. 운영 공개 페이지는 프록시403/웹 읽기 실패, workflow CLI 조회도 Forbidden이라 새 문서 반영 확인 전이다. Git 저장을 Render·TestFlight 새 배포로 보고하지 않는다.


## 2026-11-10 — 원격 main과 기능 완료 커밋 병합

- 사용자 요청으로 origin/main을 fetch하고 원격 c1c5d31의 일일 문서·Figma 69개 와이어프레임 자료와 로컬 1c75e51/9bb2e26을 병합했다. 두 기능 커밋의 원래 SHA와 원격 이력을 유지하며 강제 푸시는 사용하지 않는다.
- 충돌한 current-ui-comparison 문서는 양쪽 대조표를 함께 보존하고 각 브랜치 당시 상태와 병합 후 추가된 브리핑/붙여넣기를 구분했다. change-log 양쪽 기록을 보존하고 생성 HTML·인계 문서·이미지 manifest는 통합 원본에서 재생성했다.
- 원격의 와이어프레임 원본/인벤토리/노드 상태·일일 업데이트 파일은 그대로 유지한다. 기능 커밋의 앱·서버·TestFlight workflow 소스는 변경하지 않는다. 운영 데이터·인증 설정은 변경하지 않는다.
- 복구용 duckduck-functional-completion.bundle은 기존 SHA-256 1b73da76ca222cff8a16d6b5a783eeed596d6930d90f05b5a9266990ad7b742d 그대로 보존하며 Git에 추가하지 않는다.
- 검증 결과와 일반 push 성공 여부는 이 작업의 최종 보고 및 Git 이력으로 확인한다. GitHub 저장과 Render 배포·EAS/Apple 처리 성공은 구분한다.


## 2026-11-09 — 남은 기능 구현과 검증 경계 갱신

- 기존 AI 비서/Google·Notion·Slack 확인 후 쓰기/네이버 IMAP·SMTP/Apple 미리 알림/백업 구현을 코드·격리 테스트로 대조했다. 요청한 current-ui-comparison 파일이 없어 새로 작성했다. 운영 `/project`와 날씨 API는 프록시 403, GitHub는 유효하지 않은 GH_TOKEN으로 실제 상태를 확인하지 못했다.
- 범용 붙여넣기 목록을 최대 20개 편집 가능한 초안으로 분리한다. 중복/완료 체크를 제외하고 날짜는 직접 확인한다. AI 활성화 시 원문을 일시 자료로 보내 동의 후 자동 제안을 받을 수 있다. 원문은 DB에 저장하지 않고 확인한 작업만 저장한다.
- 오늘 브리핑에 오늘까지 미완료 Todo/나머지 수와 직접 선택한 외부 서비스의 최근 일부 자료·부분 오류를 함께 표시한다. 도시 선택 날씨(온도/최저·최고/강수 확률/시각/출처)는 로그인 API·고정 목적지·10분 캐시·요청 병합·오류 복구를 적용했다.
- 로그인 설정·쿠키/SecureStore는 보존하며 복합 자료 조회의 클라이언트 제한 시간을 60초로 맞췄다. TestFlight 요청 전 서버 문법·단위/API·모바일 타입·iOS JS export 검증을 추가했다. 기존 무료 구성·계정·인증서·암호화 키·데이터를 변경하지 않았다.
- 유지 조건: 5개 탭·월 이동·3초 완료/350ms 페이드·즉시 체크/되돌리기·계정 격리·AI 동의·외부 원본 미리보기/확인·불명확 발송 재시도 금지·격리 복원 유지.
- 검증: 58개 단위/API 테스트, 서버 문법(27개), TypeScript, Expo 웹/iOS JS export, 실제 웹 전체 회귀(브리핑·날씨 모의 성공/오류 복구·붙여넣기 초안), 별도 웹 로그인·모션 회귀 통과. TestFlight workflow YAML 파싱 확인. 실제 AI/공급자 실계정/날씨 API/아이폰 EventKit/IPA·TestFlight/정기 Actions 성공과 구분한다.
- 실제 배포: 로컬 커밋만 수행한다. Render 수동 배포·운영 AI 활성화·최신 TestFlight 제출/설치는 미확인이다. 외부 계정에서 필요한 권한과 운영 후속 작업은 current-ui-comparison 문서에 모았다.

## 2026-11-09 — 현재 앱 기준 대조 요청

- 문서 설명보다 최신 mobile/ 코드와 현재 TestFlight를 우선한다. origin/main 확인 후 앱 기준 d1be345와 HEAD ede1f9c의 mobile/ diff가 없음을 확인했다. TestFlight 버전1.0.0은 사용자 확인, 빌드 번호·기기 화면은 아직 미확인이다.
- 기존 C01/T01/A01/L01/P01 및 Todo 완료·편집/시트 상태를 코드와 비교했다. 실제 문구·순서·행 높이·safe area·하단 탭·입력/버튼·모달 닫기 차이는 [현재 UI 대조표](https://github.com/thepmpo/donknow/blob/main/docs/current-ui-comparison.md)에 기록했다.
- Figma MCP 호출 한도가 여전히 차단되어 기존69개를 수정·삭제·재생성하지 않았다. `현재 앱과 차이` 메모는 적용 대기, `Current baseline` 표시와 `Proposed` 복제는 아직 수행하지 않았다. 실기기 대조 후 baseline 확정, 그 뒤 해당 화면만 Proposed로 복제한다.
- 앱 기능·코드·원본 화면 구조 HTML은 변경하지 않았다. 문서 생성과 GitHub 저장은 운영 /project 배포와 구분한다.

## 2026-11-09 — Figma 저해상도 와이어프레임 초안

- 연결된 Figma 파일 https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=3-265 에 캘린더 8, Todo 목록 9, 편집 8, 덕 비서 12, 로그 4, 내정보·연결 12, 인증·시스템 10, 공통 6개로 총 69개 프레임을 만들었다. 편집 가능한 텍스트·자동 레이아웃·공통 컴포넌트와 소스 토큰을 사용했다.
- 기존 5개 탭, 3초 완료/350ms 페이드, 원본 변경 전 확인을 유지했다. 일정 작성·수정과 네이버 설정은 비서 안, 연동 기록은 기존 비서/연결 패널에 유지했다. iOS 시스템 한글 글꼴은 Figma 가용성 때문에 Noto Sans KR로 대체한 구조안이다.
- 상세 화면 구조·전체 목록·노드 ID·검증 범위는 docs/figma-wireframes.md, docs/figma-wireframe-inventory.json, docs/figma-wireframe-state.json과 artifacts/duckduck-wireframe-map.html에 저장했다.
- 생성 구조와 캘린더·Todo 목록 스크린샷을 확인했으나 Starter MCP 호출 한도로 추가 편집/전체 검수가 중단됐다. C01 다음 달 선택 강조 중복, C04 년월 시트 하단 위치 수정과 나머지 6개 구역 시각 검수, 빈 화면 구조 페이지 작성이 남았다. 최종 완성 검수로 보고하지 않는다.
- 앱 소스·동작 변경, GitHub push, Render 배포, 새 TestFlight 빌드, 실제 외부 계정 쓰기는 하지 않았다. 공개 HTML은 로컬 생성본만 갱신하며 운영 사이트 반영은 별도다.

### 와이어프레임 보존·후속 검수 — 2026-11-09

기존 **69개 화면은 유지하고 중복 생성하지 않는다.** 후속 작업은 저장된 노드 ID를 대조한 뒤 해당 노드만 수정한다. 앱 기능·소스는 변경하지 않는다.

- [Figma 전체 와이어프레임](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=3-265)
- [저장소 화면 구조 HTML](https://github.com/thepmpo/donknow/blob/main/artifacts/duckduck-wireframe-map.html) — 원본 파일을 보존한다.
- [전체 화면 인벤토리](https://github.com/thepmpo/donknow/blob/main/docs/figma-wireframe-inventory.json)
- [기존 Figma 노드 ID와 작업 상태](https://github.com/thepmpo/donknow/blob/main/docs/figma-wireframe-state.json)

이번 후속 확인에서도 Figma Starter MCP 호출 한도 오류가 반환됐다. 한도 해제 시점은 확인되지 않았고 캔버스 변경은 수행하지 않았다. 한도가 허용되는 후속 작업에서 아래 순서로 진행한다. 예약 실행이나 백그라운드 감시는 설정하지 않았다.

#### 남은 세 가지 수정

- [ ] C01 월간 예시: 다음 달 9일의 선택 강조·예시 이벤트 중복 제거. 기존 C01 프레임 `4:8`을 수정한다.
- [ ] C04 년·월 시트: 행 높이에 맞춰 시트 바닥 위치를 다시 계산하고 취소 버튼 잘림 수정. 기존 C04 프레임 `4:259`를 수정한다.
- [ ] 기존 `00 · Screen inventory` 페이지 `0:1`에 화면 구조와 기존 69개 화면 목록을 작성. 화면 프레임을 새로 만들지 않는다.

#### 전체 검수 항목

- [ ] 기존 69개 화면 ID가 모두 존재하며 중복·삭제가 없는지 확인.
- [ ] 캘린더 수정 후 월 그리드·선택일·년월 시트 스크린샷 재검수.
- [ ] Todo 편집, 덕 비서, 로그, 내정보·연결, 인증·시스템, 공통 상태의 6개 구역 시각 검수.
- [ ] 텍스트 잘림·겹침, 긴 시트 스크롤, 키보드 회피, 하단 탭·safe area 보호 여백 확인.
- [ ] 날짜·시간 스피너, 메모 220pt, 3→2→1초와 350ms 페이드 상태 표현, 동작 줄이기 설명 확인.
- [ ] 기존 5개 탭·연결 권한·원본 변경 전 확인·연동 기록 위치와 소스 일치 여부 확인.
- [ ] 편집 가능한 레이어·컴포넌트·토큰과 Noto Sans KR 대체 글꼴을 확인하고 검수 근거를 기록.

현재는 **69개 생성 완료 / 전체 검수 대기**다. 문서 생성·저장과 GitHub 반영·운영 Render `/project` 배포는 구분하며, 운영 배포 성공을 추정하지 않는다.

#### 기존 69개 화면 목록

| ID | 화면·상태 | 화면군 | 소스 |
| --- | --- | --- | --- |
| [C01](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-8) | 월간 · 일정 표시 | 01 / 캘린더 | CalendarScreen.tsx |
| [C02](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-144) | 주간 보기 | 01 / 캘린더 | CalendarScreen.tsx |
| [C03](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-212) | 선택일 · 아젠다 스크롤 | 01 / 캘린더 | CalendarScreen.tsx |
| [C04](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-259) | 년·월 이동 시트 | 01 / 캘린더 | CalendarScreen.tsx |
| [C05](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-304) | 일정 없음 | 01 / 캘린더 | CalendarScreen.tsx |
| [C06](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-340) | 일정 연결 오류 | 01 / 캘린더 | CalendarScreen.tsx |
| [C07](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-382) | 일정 작성 · 비서 작업 | 01 / 캘린더 | AssistantSheet.tsx · calendar.create |
| [C08](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-432) | 일정 수정 · 대상 선택 | 01 / 캘린더 | AssistantSheet.tsx · calendar.update |
| [T01](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-482) | 기본 목록 | 02 / Todo 리스트 | TodosScreen.tsx · ui.tsx/TodoRow |
| [T02](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-532) | 완료 직후 · 3초 | 02 / Todo 리스트 | TodosScreen.tsx · ui.tsx/TodoRow |
| [T03](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-582) | 카운트다운 · 2초 | 02 / Todo 리스트 | TodosScreen.tsx · ui.tsx/TodoRow |
| [T04](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-632) | 카운트다운 · 1초 | 02 / Todo 리스트 | TodosScreen.tsx · ui.tsx/TodoRow |
| [T05](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-682) | 실행 취소 · 복원 | 02 / Todo 리스트 | TodosScreen.tsx · ui.tsx/TodoRow |
| [T06](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-726) | 페이드 · 350ms | 02 / Todo 리스트 | TodosScreen.tsx · ui.tsx/TodoRow |
| [T07](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-771) | 완료 후 목록 | 02 / Todo 리스트 | TodosScreen.tsx · ui.tsx/TodoRow |
| [T08](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-814) | 빈 목록 | 02 / Todo 리스트 | TodosScreen.tsx · ui.tsx/TodoRow |
| [T09](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-847) | 저장 실패 · 복구 | 02 / Todo 리스트 | App.tsx · useTodos.ts |
| [E01](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-896) | 새 할 일 | 03 / Todo 작성·수정 | ui.tsx/TodoEditor · NotesField.tsx |
| [E02](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-948) | 수정 · 상단 | 03 / Todo 작성·수정 | ui.tsx/TodoEditor · NotesField.tsx |
| [E03](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1000) | 수정 · 하단 액션 | 03 / Todo 작성·수정 | ui.tsx/TodoEditor · NotesField.tsx |
| [E04](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1051) | 날짜 선택 | 03 / Todo 작성·수정 | ui.tsx/TodoEditor · NotesField.tsx |
| [E05](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1099) | 시간 선택 · 스크롤 | 03 / Todo 작성·수정 | ui.tsx/TodoEditor · NotesField.tsx |
| [E06](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1145) | 메모 입력 · 키보드 | 03 / Todo 작성·수정 | ui.tsx/TodoEditor · NotesField.tsx |
| [E07](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1197) | 저장 중 | 03 / Todo 작성·수정 | ui.tsx/TodoEditor · NotesField.tsx |
| [E08](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1244) | 입력·저장 오류 | 03 / Todo 작성·수정 | ui.tsx/TodoEditor · NotesField.tsx |
| [A01](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1297) | 덕 기본 | 04 / 덕·AI 비서 | DuckScreen.tsx · AssistantSheet.tsx |
| [A02](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1335) | 수동 초안 · 확인 | 04 / 덕·AI 비서 | DuckScreen.tsx · AssistantSheet.tsx |
| [A03](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1378) | 연결 서비스·동의 | 04 / 덕·AI 비서 | DuckScreen.tsx · AssistantSheet.tsx |
| [A04](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1430) | 기본 대화 | 04 / 덕·AI 비서 | DuckScreen.tsx · AssistantSheet.tsx |
| [A05](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1481) | 작업 제안 | 04 / 덕·AI 비서 | DuckScreen.tsx · AssistantSheet.tsx |
| [A06](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1529) | 직접 작업 작성 | 04 / 덕·AI 비서 | DuckScreen.tsx · AssistantSheet.tsx |
| [A07](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1585) | 실행 전 확인 | 04 / 덕·AI 비서 | DuckScreen.tsx · AssistantSheet.tsx |
| [A08](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1634) | 분석·실행 중 | 04 / 덕·AI 비서 | DuckScreen.tsx · AssistantSheet.tsx |
| [A09](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1677) | AI 미설정 | 04 / 덕·AI 비서 | DuckScreen.tsx · AssistantSheet.tsx |
| [A10](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1726) | 실패·결과 불확실 | 04 / 덕·AI 비서 | DuckScreen.tsx · AssistantSheet.tsx |
| [A11](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1772) | 대화 붙여넣기 | 04 / 덕·AI 비서 | DuckScreen.tsx · AssistantSheet.tsx |
| [A12](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1821) | 저장·외부 기록 검색 | 04 / 덕·AI 비서 | RecordSearchSheet.tsx |
| [L01](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1878) | 완료 활동 기록 | 05 / 로그 | LogScreen.tsx |
| [L02](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1919) | 완료 기록 없음 | 05 / 로그 | LogScreen.tsx |
| [L03](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1950) | 연동 작업 실행 기록 | 05 / 로그 | AssistantSheet.tsx |
| [L04](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2000) | 동기화 전송 기록 | 05 / 로그 | TaskSyncPanel.tsx |
| [P01](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2045) | 내정보 · 상단 | 06 / 내정보·연결 | ProfileScreen.tsx · IntegrationsScreen.tsx |
| [P02](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2090) | 내정보 · 알림·데이터 | 06 / 내정보·연결 | ProfileScreen.tsx · IntegrationsScreen.tsx |
| [P03](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2132) | 내정보 · 계정 | 06 / 내정보·연결 | ProfileScreen.tsx · IntegrationsScreen.tsx |
| [P04](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2175) | Google 읽기·연결 | 06 / 내정보·연결 | ProfileScreen.tsx · IntegrationsScreen.tsx |
| [P05](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2216) | Google 쓰기·동기화 | 06 / 내정보·연결 | ProfileScreen.tsx · IntegrationsScreen.tsx |
| [P06](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2253) | Google 자료·가져오기 | 06 / 내정보·연결 | ProfileScreen.tsx · IntegrationsScreen.tsx |
| [P07](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2297) | Slack 연결·권한 | 06 / 내정보·연결 | ProfileScreen.tsx · IntegrationsScreen.tsx |
| [P08](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2336) | Notion 연결·권한 | 06 / 내정보·연결 | ProfileScreen.tsx · IntegrationsScreen.tsx |
| [P09](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2378) | 네이버 별도 연결 | 06 / 내정보·연결 | AssistantSheet.tsx |
| [P10](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2431) | 연결 해제 확인 | 06 / 내정보·연결 | ProfileScreen.tsx · IntegrationsScreen.tsx |
| [P11](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2464) | 미리 알림 · 선택 가져오기 | 06 / 내정보·연결 | AppleRemindersScreen.tsx |
| [P12](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2503) | 미리 알림 · 원본 변경 | 06 / 내정보·연결 | AppleRemindersScreen.tsx |
| [R01](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2547) | 로그인 | 07 / 인증·시스템 | AuthScreen.tsx · AccountScreen.tsx |
| [R02](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2576) | 회원가입 | 07 / 인증·시스템 | AuthScreen.tsx · AccountScreen.tsx |
| [R03](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2600) | 서버 연결·체험 | 07 / 인증·시스템 | ConnectionScreen.tsx |
| [R04](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2623) | 초기·서버 기동 로딩 | 07 / 인증·시스템 | App.tsx · useTodos.ts |
| [R05](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2641) | 로그인 오류 | 07 / 인증·시스템 | AuthScreen.tsx · AccountScreen.tsx |
| [R06](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2666) | 로그인 후 목록 오류 | 07 / 인증·시스템 | App.tsx · useTodos.ts |
| [R07](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2700) | 이메일 인증 | 07 / 인증·시스템 | AuthScreen.tsx · AccountScreen.tsx |
| [R08](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2741) | 비밀번호 재설정 | 07 / 인증·시스템 | AuthScreen.tsx · AccountScreen.tsx |
| [R09](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2769) | 계정 삭제 | 07 / 인증·시스템 | AuthScreen.tsx · AccountScreen.tsx |
| [R10](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2809) | 서비스 미연결·오류 | 07 / 인증·시스템 | IntegrationsScreen.tsx |
| [U01](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2850) | 하단 내비게이션 | 08 / 공통 내비게이션·오버레이 | App.tsx · ScreenHeading.tsx · theme.ts |
| [U02](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2891) | 시트 · 닫기·스크롤 | 08 / 공통 내비게이션·오버레이 | motion.tsx/DraggableSheet · ui.tsx |
| [U03](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2938) | 표시 이름 모달 | 08 / 공통 내비게이션·오버레이 | ProfileScreen.tsx |
| [U04](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2981) | 개인정보 안내 모달 | 08 / 공통 내비게이션·오버레이 | ProfileScreen.tsx |
| [U05](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-3021) | 공유창 · 시스템 | 08 / 공통 내비게이션·오버레이 | ui.tsx/shareTodo |
| [U06](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-3067) | 공통 버튼 상태 | 08 / 공통 내비게이션·오버레이 | theme.ts · ui.tsx · motion.tsx |

## 2026-11-05 — Workspace Studio 적합성 검토

- 사용자 요청으로 핵심 개발을 우선하고 Studio는 이후 선택적 통합 후보로 기록했다. 앱 기능과 자동 빌드 동작은 바꾸지 않았다.
- 사용자 제공 공식 도움말, 공개 Chat 요약 가이드, JSON Resume 맞춤 단계의 README·manifest·실행 코드를 읽었다. 실제 외부 HTTPS/OAuth/출력 변수 사례는 확인했지만 계정 설치·실행은 하지 않았다.
- 공식 웹훅·맞춤 단계 문서/발표와 기사 사이트는 네트워크 정책 403으로 미열람이다. 기사를 다수 읽었거나 웹훅 방향·요금제·상용 배포 조건을 확인했다고 주장하지 않는다. AI Studio/Data Studio 자료는 다른 제품이므로 제외했다.
- 결론은 직접 서비스 연결을 유지하고, 수요가 생기면 Studio 결과→덕 초안→사용자 확인→Todo의 작은 실증을 검토하는 것이다. 평가와 출처는 `docs/workspace-studio-evaluation.md`에 정리했다.


## 2026-11-04 — 공통 디자인 계약과 TestFlight 자동화

- 상단 duckduck 텍스트를 오리 마크로 바꾸고 캘린더·할 일·덕·log·내정보를 ScreenHeading에 통합했다. layout 토큰의 여백·제목 기준선을 함께 사용한다. 저장/카카오 공유/삭제 사이에 공통 16 간격을 확보했다.
- 하단 capsule/margin을 제거하고 실제 화면 아래에 고정한다. safe area는 내부 여백이며 스크롤 내용이 바 뒤로 지나가 블러가 보인다. 마지막 항목은 공통 하단 여백으로 보호한다.
- 캘린더 스와이프를 하루에서 월 이동으로 정정하고 년·월 제목 선택과 직접 이동을 추가했다. 아이폰은 네이티브 스피너, 웹은 선택 목록이다.
- 완료를 3→2→1, 이후 350ms 페이드로 정정했다. 즉시 반영·중간 되돌리기·동작 줄이기를 유지한다.
- `/design-guide` HTML을 실제 theme/layout 토큰에서 생성한다. 공통 컴포넌트·수치·표면·메모/버튼·동작·검증 원칙을 시각 예시와 함께 제공한다. 한 페이지에서 독립 값을 늘리기보다 토큰에서 변경하고 전체 화면을 확인한다.
- GitHub Actions가 main의 앱 코드 변경 후 EAS iOS 빌드·자동 제출을 요청한다. EXPO_TOKEN repository secret을 한 번 등록해야 한다. 실제 등록·원격 실행 성공을 추정하지 않는다. 문서/테스트만 바뀌면 요청하지 않는다. GitHub 실행 시간 절약을 위해 EAS 요청 후 종료하며 초록 체크는 Apple 업로드 완료가 아니다.
- 검증: 53개 단위/API 테스트, TypeScript·문법·iOS JS 번들, 실제 웹 전체 흐름, 5개 제목 좌표 일치·화면 끝 내비게이션·월 드래그·년월 직접 선택·3초 카운트다운 검증 통과. 디자인 가이드 공개 경로·320px 표시와 기존 문서 댓글도 검증했다. GitHub 원격 자동 빌드는 토큰 미등록 상태이므로 실행 성공으로 보고하지 않는다.
- 서버 배포·새 iOS 빌드가 필요하고, 현재 환경의 GitHub 쓰기 인증은 별도 문제다. 설정 방법은 `docs/testflight-automation.md`에 기록한다.


## 2026-11-04 — 캘린더·내비게이션·시간 선택·메모·로그인 수정

- 캘린더 날짜 그리드/날짜 제목을 좌우로 끌면 선택일이 하루씩 이동하고 월 경계도 맞춘다. Todo 행의 완료 스와이프와 구분한다. 월 42칸을 유지하고 주 보기 7칸을 추가했다.
- Google 일정을 Todo와 별도 섹션으로 표시하고, Todo로 가져온 원본 일정도 숨기지 않는다. 시작·종료 시간, 종일·여러 날 일정을 전달하고 날짜에 맞춰 표시한다. 주 보기는 날짜 그리드와 시간 아젠다이며 Fantastical 전체 시간축/기능 복제라고 주장하지 않는다. 실제 연결 권한과 원본 일정이 있어야 보인다.
- 하단 내비게이션에 SDK 58용 expo-blur와 반투명 표면·테두리·둥근 형태를 적용한다. 아이폰은 네이티브 블러이며 실제 기기의 대비/투명도·성능 검증은 별도다.
- 알림 시간은 아이폰의 시·분 스크롤 스피너로, 웹은 시·분 선택 목록으로 바꿔 직접 타이핑을 없앴다.
- 메모의 최소 높이를 120에서 220으로 늘리고 내용에 맞게 확장한다. 선택 위치 이벤트가 프로그램의 글머리표 커서를 덮어쓰지 않게 하고 줄 중간 Enter도 처리한다.
- 로그인/세션 확인의 무료 서버 기동 대기 시간을 60초까지 허용하고, 네트워크/비정상 JSON·게이트웨이 응답을 이해할 수 있는 문구로 바꾼다. 로그인 성공 뒤 목록 조회 실패를 로그인 실패와 구분한다. 쓰기·발송은 자동 재시도하지 않는다. 무료 Render cold start는 가능성이지 운영 로그로 확정한 원인은 아니다. 서버가 즉시 응답하게 됐다고 보장하지 않는다.
- 상단에서 현재 탭 이름과 클라우드 기술 표기를 제거하고 공통 브랜드와 화면 내부 제목으로 정리했다. 제공받은 토스 가이드에 따른 중복 제목 정리이며 최신 토스 앱을 직접 열람하거나 동일 복제했다고 하지 않는다.
- 검증: 53개 API/단위 테스트, TypeScript, 서버 문법 검사, 웹 전체 회귀, 실제 좌우 날짜 드래그·7일/42일 전환·Google 일정 표시·기존 모션 검증, iOS JS 번들 생성 통과. 실제 iPhone 스피너·블러·커서·서버 기동 속도 검증과 구분한다.
- 서버 일정 API 배포와 새 네이티브 의존성을 포함한 iOS 빌드가 필요하다. 기존 TestFlight 앱이 자동 변경되지는 않는다.


## 2026-11-04 — AI 비서·메일·Slack·Notion·외부 할 일 실행

- 사용자 요청으로 AI·Slack 구현 보류를 해제했다. 덕은 단순 비서 답변에서 끝나지 않고, 선택한 자료의 근거→오늘 할 일/작업 제안→Todo 카드→확인 후 실행으로 이어진다. 최근 대화는 화면 메모리의 최대 6개 발화만 참고하며 자료 선택을 바꾸면 문맥을 지운다.
- Gmail 본문 일부 읽기·읽음/미읽음·답장/새 메일, Slack 채널 읽기·전송/스레드 답장·자기 메시지 수정, Notion 블록 읽기·하위 페이지 생성/내용 추가/제목 수정, Google Tasks 생성/수정, 기본 Calendar 일정 생성/수정, Drive 일반 텍스트 생성/교체·허용 파일 이름 수정, 덕 Todo 생성/수정을 구현했다. 범용 파일 형식 편집·삭제·공유 권한 변경까지 구현한 것은 아니다.
- 외부 쓰기는 선택적 OAuth 재승인과 별도의 내용 확인이 필요하다. AI가 임의 URL/명령을 실행하지 않으며 대상·본문을 서버에서 검증해 암호화 미리보기에 저장하고 10분 내 사용자가 확인한 작업만 한 번 선점해 실행한다. 원본/연결 변경을 확인하고 불확실한 발송은 자동 재시도하지 않는다. 백업 복원은 옛 미실행 작업을 취소한다.
- 덕의 비서 화면에서 자료 선택·AI 분석 동의·대화·근거·제안·직접 작업·확인·기록을 제공한다. AI 설정이 없는 서버에서도 직접 작업은 사용할 수 있고 기존 수동 Todo 초안은 유지한다. 기존 5개 탭·5→1 카운트다운·즉시 완료/되돌리기·메모·드래그/X·계정 분리를 유지한다.
- 네이버는 고정 TLS IMAP/SMTP와 앱 비밀번호를 쓰는 별도 어댑터/연결 화면을 구현하고 기본 비활성화했다. 실제 네이버 도움말 및 메일 서버 접속은 환경 정책으로 확인하지 못했으므로 범용 연결 성공으로 보고하지 않는다.
- 공식 Google API discovery와 Slack/Notion SDK에서 지원 메서드를 확인해 `docs/references/assistant-provider-research.json`에 근거를 기록했다. 피클 공식 링크 `https://pickle.com/`는 403으로 본문 미열람이다. 피클 구체 기능을 학습했다고 주장하지 않으며 사용자 설명을 제품 방향으로 반영했다.
- 검증: 52개 API/단위 테스트, TypeScript, 26개 서버/도구 문법 검사, 실제 웹 앱 회귀(수동 초안/확인/Todo 저장 및 AI 모의 응답·동의·근거·제안), iOS JS 번들, 기존 카운트다운·시트 모션 검증 통과. 운영 의존성 audit 결과 알려진 취약점 0개. 실계정·실모델·새 IPA 검증과 구분한다.
- AI 키·모델·명시적 활성화, 공급자 쓰기 권한 설정/재승인, 네이버 실제 조건 확인, 서버 배포와 새 TestFlight 빌드가 남아 있다. 실제 모델 과금·실계정 메일 발송·외부 원본 변경은 수행하지 않았다. 문서의 키는 이름만 기록했다. 상세 범위·제한·운영 절차는 `docs/assistant-actions.md`를 따른다.


## 2026-11-04 — 완료 5초 카운트다운과 서서히 사라지기

- 완료 체크는 즉시 반영하고 5→4→3→2→1을 각 1초씩 표시한다. 숫자 1까지 읽을 수 있도록 카운트 중에는 행을 옅게 만들지 않는다.
- 5초가 지난 후 350ms 동안 행 전체가 서서히 옅어지면서 접히고 목록에서 빠진다. 0은 표시하지 않는다. 동작 줄이기 설정에서는 페이드·접힘만 생략하고 같은 대기 시간과 숫자를 유지한다.
- 되돌리기·스와이프·저장 중 즉시 반응·저장 실패 시 서버 확인 상태 복구·계정 전환 보호를 유지한다. 화면 타이머는 서버 응답을 기다리지 않고 누른 시점부터 시작한다.
- 일반 사용자는 Google/Notion 연결 버튼→공식 계정 로그인→권한 승인으로 연결한다. Google 기능과 Notion 공유 페이지를 선택하며 개인 API 키나 개발자 설정은 필요하지 않다. Google 테스트 앱 경고·테스트 사용자 제한은 정식 공개 전 별도 검토 대상이다. Notion은 이메일 제공자가 아니며 승인한 페이지를 읽는다.
- 검증: 43개 단위/API 테스트, TypeScript, 서버/도구 문법 검사, iOS JS export, 웹 앱 전체 회귀, 5→1 가독성·카운트 중 불투명도 유지·페이드/접힘·되돌리기·동작 줄이기 모션 검증 통과. 이는 새 IPA 생성·Apple 제출·실기기 설치 검증과 다르다.
- Git 저장소 이전에 맞춰 작업 환경의 원격 주소를 thepmpo/donknow로 갱신했다. 서버 API 변경은 없으며 기존 TestFlight 앱에는 새 iOS 빌드·제출이 필요하다.


## 2026-11-03 — Git 커밋 이메일 교체

- 사용자 요청에 따라 기존 사용자 커밋 41개의 작성자·커미터 이메일과 이 환경의 Git 기본값을 새로 지정한 주소로 교체했다. 이메일 원문은 공개 문서에 적지 않는다.
- 전체 43개 커밋의 파일 트리·이름·날짜·메시지 보존을 검증했다. 현재 및 과거 추적 파일에서 이전 이메일은 발견되지 않았다.
- 커밋 주소가 변경되어 일일 문서 자동화의 처리 기준도 새 주소에 맞췄다. 다른 체크아웃은 새 main과 맞춘 뒤 작업해야 한다.
- GitHub 잔디 연결은 새 이메일이 해당 계정에서 인증되어 있어야 한다. Render·Expo 등 외부 계정 이메일은 확인·변경하지 않았다. 앱 동작 변경이나 재배포는 없다.


구현 날짜와 배포 상태를 구분한다. 최신 항목을 위에 추가한다. 코드·동작을 바꾸면 이 파일과 공개 HTML을 함께 갱신한다.

## 2026-11-03 — 메모·글머리표·드래그 닫기·작은 X

- **메모:** Todo와 캘린더에서 여는 할 일 상세, 덕 초안에 메모 공간을 추가했다. 저장 버튼으로 제목/날짜와 함께 계정별 Todo에 보관한다. 글자 수는 4,000자이며 기존 데이터는 메모가 없어도 읽을 수 있다. 개인 내보내기·암호화 백업에도 포함된다. Google 원본 메모를 수정하거나 붙여넣기 원문을 자동 저장하지 않는다.
- **간단한 작성:** 별도 툴바 없이 줄 앞 `- `가 `• `로 바뀌고, Enter로 다음 글머리표를 이어 쓴다. 빈 글머리표에서 Enter를 누르면 목록을 끝낸다. 일반 문장 속 하이픈·날짜는 바꾸지 않는다. 긴 메모는 입력란이 늘어나며 외부 시트에서 스크롤한다.
- **시트 조작:** Todo/캘린더 편집·기록 검색·대화 붙여넣기 시트의 손잡이를 아래로 끌어 닫는다. 본문 스크롤은 닫기 제스처로 가로채지 않는다. 저장 중에는 닫기를 막고, 닫자마자 새 시트를 열 때 이전 닫기 콜백이 새 화면을 닫지 않게 했다.
- **X와 스크롤:** ‘닫기’ 글자를 작은 X로 바꿨다. 실제 터치 영역과 접근성 이름은 유지한다. 앱 스크롤 막대만 숨기고 스크롤 자체는 유지한다. 덕 자동 스크롤은 새 초안 추가 시에만 수행해 메모 편집 중 위치를 가로채지 않는다.
- **호환성:** 메모를 무시하는 구버전 서버로 보내 사라지는 일을 막기 위해 저장 지원 여부를 확인한다. 이번에는 Render 서버를 먼저 최신 배포하고 iOS 빌드를 올려야 한다.
- **검증:** 서버/단위 43개, 메모 길이/타입·계정 격리·완료 후 보존·내보내기·암호화 백업 복원·글머리표 실제 입력·캘린더 재조회·스크롤 가능/막대 숨김·드래그/X 닫기·구버전 서버 입력 보존을 확인했다. TypeScript·문법·웹 기능/모션·iOS JS 번들도 통과했다. 실제 기기 설치 검증과 공개 배포는 별도다.

## 2026-11-03 — Things를 참고한 간결한 Todo 목록

- **방향:** 캘린더는 Fantastical의 기본 구성, Todo는 Things의 밀도·조작과 토스의 공통 시각 가이드를 참고한다. 캘린더 전체 재설계는 이번 범위가 아니며 방향을 기록했다.
- **수정:** Todo 행의 기본 최소 높이를 88pt에서 약 60pt로 줄이고 제목을 16/24로 정리했다. 날짜와 출처를 한 줄로 합치고, 값이 없으면 보조 줄을 만들지 않는다. 상단 여백·제목·추가 버튼도 줄였다. 공통 행을 쓰는 log/캘린더 일정 목록도 같은 밀도로 맞췄다.
- **유지:** 체크 터치 영역 약 44pt, 즉시 체크·저장 중 취소·실패 복원·4초 되돌리기·스와이프·모션을 유지했다. 긴 제목은 두 줄까지, 큰 글자에서는 자연스럽게 높아진다. 제목 전체는 편집 화면에서 확인한다.
- **검증:** 기본 글자 크기의 390×844 웹 화면에서 짧은 Todo 8개, 390×667에서 6개가 스크롤 없이 보이는 것을 확인했다. 실제 아이폰 safe area/글자 설정에 따라 개수는 달라질 수 있다. 일반 행 44–64pt 범위, 모션/밀도 테스트와 전체 웹 회귀, TypeScript와 iOS JS 번들 생성을 확인했다. 미리보기 `artifacts/mobile-todo-density-fixture.png`는 체험 데이터로 만든 검증 화면이다.
- **배포:** 웹은 최신 배포, 아이폰은 새 TestFlight 빌드가 필요하며 실제 설치 후 밀도 확인은 아직 남아 있다.

## 2026-11-03 — 체크·되돌리기 즉시 반영

- **사용자 제보:** 실제 테스트에서 체크 반영이 너무 느렸음. Google 연동 여부와 무관하게 앱이 먼저 반응해야 한다는 요청.
- **원인/수정:** 서버 저장 응답 뒤에 화면을 바꾸던 흐름을 수정했다. 체크·미완료 복원과 완료 4초 대기를 누른 시점에 즉시 시작하고 저장은 뒤에서 수행한다. Google 원본 전송은 기존 서버의 권한·전송 큐·충돌 보호를 유지한다.
- **빠른 취소:** 저장 중에도 체크/되돌리기와 스와이프가 가능하다. 같은 항목의 저장은 순서대로 처리하고, 늦은 이전 응답이 최신 선택을 덮어쓰지 않는다. 편집/삭제는 같은 항목 저장 중 중복 실행을 막는다.
- **실패/계정 보호:** 실패하면 마지막 서버 확인 상태로 복원하고 오류를 표시한다. 4초 후 이미 숨겨진 항목도 미완료 저장 실패라면 다시 보인다. 체크 전 시작한 목록 조회는 최신 상태를 덮어쓰지 못한다. 계정 변경/만료 뒤의 이전 응답을 무시하고 로딩/예약 상태를 정리한다. 새 오프라인 영구 저장 큐를 추가한 것은 아니다.
- **접근성:** 공통 모션 컨트롤에서도 체크/선택 상태를 명시적으로 전달해 화면과 접근성 상태를 일치시켰다.
- **검증:** 응답을 보류한 실제 웹 번들로 즉시 체크·저장 중 취소·요청 순서·옛 응답 무시·4초 뒤 지연 실패 복원·오래된 목록 응답 무시를 확인했다. TypeScript, 전체 웹 기능 회귀, 모션 전용 테스트, iOS 번들 생성과 서버 동기화 테스트 3개도 통과했다. 최종 결과와 실제 새 TestFlight 설치는 구분한다.
- **배포:** 최신 main으로 웹 배포/새 iOS 빌드가 필요하다. 기존 TestFlight 바이너리는 변경되지 않는다.

## 2026-11-02 — iOS 빌드 의존성 검사 보완

- **사용자 로그:** build `96d90e45-22aa-41f7-8cd0-9f0c421cd7de`의 expo doctor가 expo-font 직접 의존성 누락과 Expo/알림/React Native 패치 불일치를 보고했다. 이 단계 로그만으로 최종 빌드 상태나 Submission 부재 원인을 확정하지 않는다.
- **수정:** expo `~58.0.22`, expo-notifications `~58.1.7`, react-native `0.88.1`, expo-font `~58.0.11`을 package.json과 잠금 파일에 반영했다. 검사 제외 설정으로 숨기지 않는다.
- **검증:** 설치된 SDK의 bundledNativeModules에 맞는 버전과 직접 peer 선언을 확인했다. 온라인 Expo API 검사는 이 환경의 403/DNS 제한으로 완료하지 못했다. doctor 20개 중 18개가 통과했고 남은 항목은 원래 두 문제와 다른 외부 API/React Native Directory 조회였다. TypeScript, iOS/웹 번들, 웹 기능 회귀와 모션 테스트는 통과했다. 실제 EAS 환경의 doctor 결과는 새 실행에서 확인한다.
- **배포:** 소스 수정은 기존 빌드를 바꾸지 않는다. 최신 main으로 새 빌드하고 EAS Submit을 켠 production 제출을 별도로 확인해야 한다. 현재 수정의 실제 새 IPA·Apple 업로드·TestFlight 설치는 아직 확인 전이다.

## 2026-11-02 — TestFlight 자동 제출 설정 수정

- **원인:** 웹에서 EAS Submit을 켰을 때 production 제출 프로필에 App Store Connect 앱 ID가 없어 `Set ascAppId in the submit profile` 오류로 중단됐다. 실패 실행은 `12e5cc38-1cb8-438c-aa9c-1887e2fd6666`이다.
- **수정:** `mobile/eas.json`의 `submit.production.ios.ascAppId`에 이미 확인한 앱 ID `6829597261`을 설정했다. 앞서 CLI 빌드에서 사용한 표준/면제 암호화 선택도 `mobile/app.json`의 `ITSAppUsesNonExemptEncryption: false`로 기록했다. 서버의 암호화 백업과 앱의 암호화 사용은 별개다.
- **검증:** JSON 프로필/앱 식별자 일치와 Expo 공개 설정 해석을 확인했다. 실제 새 EAS 빌드·Apple 제출 성공은 재실행 후 확인해야 한다.
- **재실행:** GitHub의 main 최신 코드로 Build from GitHub를 새로 시작한다. 실패한 이전 커밋을 그대로 Retry하면 새 설정이 들어가지 않을 수 있다. 프로필 production, 앱 폴더 mobile, iOS, 자동 제출 production을 사용한다.

## 2026-11-02 — 읽기 쉬운 HTML과 저녁 7시 자동 정리

- **보기:** 확인한 TDS 색상과 글자·표면·버튼 원칙을 프로젝트 문서에도 적용했다. 현재 상태·최근 변경·사용 흐름·최신 화면·수정 요청을 앞쪽에 두고, 개발 구조·보안/설정·오류·검증·AI 전문 자료는 뒤로 옮겼다. 개발 본문은 펼쳐서 읽고, 기존 댓글·목차·전체 이미지와 지침은 유지한다.
- **자동화:** 매일 한국 시간 19:00의 GitHub Actions 예약을 추가했다. 당일/마지막 처리 이후 커밋과 수동 변경 기록을 모아 HTML을 재생성한다. 19시 이후 변경은 다음 실행에 포함하며 같은 날 재실행해도 기록이 사라지지 않는다.
- **제한:** GitHub 예약은 지연될 수 있다. 채팅만의 정보나 미저장 작업은 자동으로 수집하지 않는다. 공개 Render 자동 배포에는 `RENDER_DEPLOY_HOOK` secret 등록이 필요하며, 아직 연결·실행 성공을 확인하지 않았다.
- **검증:** 임시 Git 저장소 집계 테스트와 문서 브라우저 테스트를 통과했다. 웹 앱 기능과 기존 TestFlight 바이너리는 이번 문서 개편으로 변경하지 않았다.

## 2026-11-02 — 다른 채팅용 인계 상태 정합성 보완

- 최근 디자인/모션과 개발 문서가 본문에 포함되어 있는지 확인하고, 앞쪽 상태표에 남아 있던 아이폰 배포 보류·Google/Notion/백업 미확인 문구를 실제 사용자 확인 상태로 정정했다.
- Expo/Apple 앱 식별자·첫 업로드 빌드/소스·최신 모션 소스와 재배포 필요 여부, 새 채팅이 바로 사용할 지침을 추가했다. 과거 기록과 현재 상태를 명확히 구분한다.
- 앱 기능 변경은 없으며 생성된 HTML의 상태표·소스 지도·이어받기 문구를 검사한다. 공개 사이트에는 최신 Render 배포 후 반영된다.

## 2026-11-02 — 공통 모션 적용

- **변경:** 5개 탭과 페이지의 짧은 페이드/이동, 공통 버튼·탭·날짜·서비스 행의 눌림/복귀, 편집·검색·대화 시트와 계정 대화상자의 전환을 공통화했다. 새 초안 카드도 부드럽게 나타난다.
- **Todo:** 체크 반응, 스와이프 복귀와 4초 대기 종료 직전의 페이드/높이 접힘을 추가했다. 완료 저장과 대기 시간은 기존 동작대로 유지하며 되돌리면 제거 예약/모션을 취소한다.
- **접근성:** OS/browser 동작 줄이기 설정을 실시간 반영한다. 이동·확대·체크·자동 스크롤·모달 전환을 생략하고, 4초 대기와 원래 행동은 유지한다. 설정 확인 전에도 움직임 없이 시작한다.
- **상태 유지:** 탭 모션이 덕 입력 초안을 초기화하지 않는다. 빠른 전환 시 이전 애니메이션을 중단한다. 계정 변경/화면 종료 시 시트 닫기 타이머와 지연 동작을 취소한다.
- **검증 완료:** 모션 전용 브라우저 테스트(버튼 누름/복귀, 탭 전환, 빠른 이동 중 초안 유지, 4초 접힘, 시트 닫기, 실시간 동작 줄이기, 완료 취소), 전체 웹 기능 회귀, TypeScript, iOS JS 번들 생성이 통과했다. 실제 아이폰 체감은 아직 확인 전이다.
- **배포:** GitHub 반영 후 Render 최신 배포가 필요하다. 기존 TestFlight 앱은 그대로이며 새 서명 빌드/업로드 전에는 반영되지 않는다. 실제 iPhone 모션 체감·OS 접근성 확인은 아직 남아 있다.

## 2026-11-02 — TDS 디자인 1차 적용

- **변경:** 확인한 TDS foundation 색상·글자 체계와 주요/보조 버튼을 네이티브 공통 테마로 도입했다. Todo·캘린더·덕·log·내정보 및 입력/연결 화면의 간격·표면·읽기 크기를 정리했다.
- **유지:** 5개 탭, 42칸 달력, 간결한 Todo, 스와이프와 4초 되돌리기, 사용자별 데이터/권한 관리.
- **검증 완료:** TypeScript, 웹 기능 회귀, 320/390/430 너비와 160% 글자 확대 시뮬레이션, iOS JS 번들. 네이티브 실기기 검증과는 구분한다.
- **자료:** `docs/tds-analysis.md`, `docs/references/tds-tokens.json`, `artifacts/mobile-*.png`. fixture 이미지는 격리된 모의 외부 응답 화면이다.

# 앱 로고·이름·내비게이션 브랜드 마무리

사용자 요청: 덕 앱의 로고와 이름을 전부 새것으로, 내비게이션 포함 통일. 기존 소스의 app.json name=docen, 앱 icon/adaptive/favicon/splash, BrandMark, BrandLoading, ConnectionScreen, AuthScreen, VerificationScreen, assistant welcome, 앱 헤더/비서 내비게이션은 이미 사용자 제공 새 로고를 사용하고 있었다. 옛 앱 설치본은 자동으로 갱신되지 않는다.

이번 변경: AgentAvatar의 눈/부리로 그리던 얼굴을 공통 BrandMark로 교체. 기존 appearance 타입/저장 데이터는 유지하되 AgentWorkspace의 색/안경 변경 UI는 숨겨 반영되지 않는 조작을 노출하지 않는다. 사용자 지정 비서 이름/지침 입력은 유지. ScreenHeading title=docen은 헤더 역할을 유지한 BrandWordmark로 렌더링. 하단 앱 내비게이션의 docen 라벨도 같은 파란 점 사용. Duo의 아이콘 배치·크기·숨겨둔 상단 장식은 유지. 채팅 기본 발신자/docen 작업 보고도 같은 워드마크. 사용자 지정 이름은 그대로 표시하고 옛 기본 이름 덕/Duck/duckduck은 클라이언트 표시에서 docen.으로 정규화한다. BrandWordmark가 accessibilityRole header를 전달하도록 보강했다.

표시만 바꾸며 Apple Bundle ID com.sjfieni.duckduck, Expo project/slug, duckduck URL scheme, 기기저장키/세션/원본연결/DB/native module이름을 치환하지 않는다. 기존 계정과 앱 업데이트 연속성을 보존한다. 홈페이지의 레이아웃 변경/가격/권한/새사업자 약관을 바꾸는 작업이 아니다.

검증: mobile typecheck 통과. Expo production web export 통과. 실제 Chromium에서 같은 공통 chat 화면의 docen heading/wordmark 및 새 로고를 확인했다. artifacts/docen-app-brand-2026-11-24/navigation-chat.png. web presentation은 desktop mode이므로 이를 iPhone native 내비게이션 실행 확인으로 가장하지 않는다. native AppNavigation은 소스/타입 검사로 확인, 실제 설치 디바이스 검사는 다음 빌드 후 필요하다.

설치 앱 아이콘/이름/내비게이션의 최종 적용에는 새 TestFlight 빌드·설치가 필요하다. native빌드 실행 상태는 작업 후속 기록을 따른다. 기존 native-build-request-2026-11-23.md의 dispatch Forbidden은 당시 실행경로 제약이며 새 빌드 성공 근거가 아니다.

# 캘린더 공간 정리와 투명 내비게이션 로고

## 사용자 확정

음악 재생 등 시스템 영역이 늘어나 캘린더 상단/카메라 열에 공간이 부족하므로 별도 오늘 복귀를 캘린더 내비게이션과 합치고 보기 전환만 남긴다. 또한 nav의 새 로고를 누끼 따서 더 크게 보여달라고 요청했다. 기존 앱 브랜드 통일 요청의 연속 작업이다.

## 표시와 동작

AppNavigation: 캘린더 일반 아이콘 대신 오늘 요일/일자 표시. 기존 탭 접근성 이름/클릭영역/long-press는 유지한다. App.tsx selectTab은 캘린더 진입/재선택 모두 오늘 navigation 요청을 보내도록 바꿨다. 다른 탭/다른 계정 동작은 유지한다. DuoChrome은 떠 있는 DuoTodayButton을 렌더링하지 않으며, context calendarDay에 현재 calendar time zone의 오늘을 전달한다. 활성 캘린더가 없으면 nav는 기기 오늘을 표시한다.

Duo 캘린더 본문 헤더: ‘캘린더’ 큰 제목 + 오른쪽 년월 중복 대신 년월 선택 하나를 왼쪽에 둔다. 선택은 기존 년 overview, 길게 누르면 기존 더보기/picker다. 보기 전환은 안전한 카메라 열 슬롯에 남고 해당 슬롯이 부족하면 본문 헤더로 fallback한다. 월→주간(2주)→일간→월 순서는 유지한다. Non-Duo 캘린더 본문 헤더는 유지한다.

duoCalendarViewFrame은 더 이상 두 액세서리 슬롯을 요구하지 않고 하단 한 슬롯만 있어도 반환한다. 기존 duoTodayFrame 순수 기하 helper는 예전 테스트/호환을 위해 남았지만 현재 UI에서는 사용하지 않는다. 430×540 및 상단180px까지 예약된 합성 geometry에서도44pt 보기 버튼이 하드웨어와 겹치지 않는 추가 단위검사를 통과한다.

## 로고 원본·누끼

사용자 기존 docen-logo-original.jpg를 image_gen에 실제 참조로 전달해 배경 제거/외곽 여백 축소·투명 PNG 생성. 결과 exec-61082eed-c38b-446e-a037-caaefb3a2348.png를 mobile/assets/brand/docen-logo-cutout.png에 그대로 복사했다. 원본 JPEG/로딩 영상/앱 홈스크린 icon은 덮어쓰지 않는다. BrandMark cutout opt-in은 transparent배경/borderRadius0, nav에서만 활성화한다. 하단32px, Duo max(36,기존icon+8)로 확대. 실제 탭 크기/스크롤 geometry는 유지하여 클릭영역을 침범하지 않는다. 기본 BrandMark는 기존 동작을 유지한다.

## 검증과 범위

mobile typecheck 통과. duo-layout/navigation-geometry 단위검사 통과. 실제 공통 Shell/AppNavigation/CalendarScreen을 Expo web fixture로 번들해 Chromium에서 tall occupied media area geometry를 적용했다. 축약된 년월 헤더, 별도 TodayButton없음, 날짜nav존재, view주간/일간전환, nav다시선택, 년월선택 및 투명 PNG로드·pageerror없음을 확인했다. 증거 artifacts/docen-calendar-navigation/, 재현 node mobile/e2e/calendar-navigation-brand.mjs. 이는 합성 native geometry의 web 렌더링이며 실제 iOS 음악 재생 실기기 검사를 대신하지 않는다.

이전 calendar-comfort/duo-layout/background-controls 등의 역사 E2E는 별도TodayButton 존재/옛헤더를 전제한 케이스가 있어 이번 UI와 그대로 비교하지 않는다. 이번 대상 회귀는 새 calendar-navigation-brand 검사와 기존 순수기하 검사를 사용한다. 기존 helper tests의 별도Today 좌표는 미사용 호환함수 검증이다.

설치앱 반영에는 새 native빌드/설치가 필요하다. 앞선 GitHub dispatch Forbidden 상태를 새 빌드 성공으로 표현하지 않는다. 이번 작업은 소스/자산/검사/GitHub 저장이며 사이트 소개 페이지나 서버 가격/권한을 배포하지 않는다.

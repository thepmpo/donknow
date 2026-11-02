# TDS 문서 확인 결과와 덕 적용 명세

## 읽은 자료와 범위

2026-11-02 사용자가 첨부한 `toss-tds-reference.md` (494,123 bytes)의 수집 메타데이터·67개 페이지의 구조·파운데이션·주요 컴포넌트의 설명/예제/접근성 규칙을 검토했다. 수집 기록상 성공 67페이지, 실패 1페이지, 발견된 미탐색 링크는 0개다. 이를 토스 디자인 전체를 읽은 것으로 확대 해석하지 않는다.

- [출처별 목차와 원본 SHA-256](references/tds-source-index.json)
- [본문에서 확인한 색상·기본 타이포그래피](references/tds-tokens.json)
- 실패는 소문자 `/components/dialog/dialog/`의 404다. 대문자 `/components/Dialog/dialog/`와 AlertDialog/ConfirmDialog 페이지는 수집돼 있다.
- 그림은 링크만 있다. 실제 렌더링·모션·픽셀 크기를 눈으로 확인한 것은 아니다. 수집 과정에서 HTML 표의 열 구분이 소실된 부분은 확실한 값만 사용하고 추측으로 복구하지 않는다.
- 추가 첨부한 `UI_UX 가이드 _ 앱인토스 개발자센터.pdf`는 32MiB 전달 한도를 초과해 도구로 열지 못했다. PDF 읽기는 미완료다. 페이지를 나누거나 용량을 줄인 첨부가 있으면 보완한다.

## 문서에서 확인한 원칙

### 파운데이션

[Colors](https://tossmini-docs.toss.im/tds-mobile/foundation/colors/)는 이름이 있는 공통 색상을 사용한다. `blue500=#3182f6`, `blue50=#e8f3ff`, `grey50=#f9fafb`, `grey100=#f2f4f6`, `grey200=#e5e8eb`, `grey500=#8b95a1`, `grey600=#6b7684`, `grey800=#333d4b`, `grey900=#191f28`을 본문에서 확인했다. 글자·배경·경계 같은 의미 토큰으로 연결하고 화면마다 비슷한 임의 색상을 만들지 않는다.

[Typography](https://tossmini-docs.toss.im/tds-mobile/foundation/typography/) 기본 주 토큰은 t1 30/40, t2 26/35, t3 22/31, t4 20/29, t5 17/25.5, t6 15/22.5, t7 13/19.5 (크기/행간)다. 문서는 실제 수치 직접 하드코딩보다 토큰 사용과 더 큰 텍스트 설정 대응을 강조한다. 덕도 React Native의 글자 확대를 끄지 않고 의미별 스타일로 관리한다. 웹 표의 iOS 비율 규칙을 그대로 네이티브에 복사해 확대를 중복 적용하지 않는다.

### 버튼과 주요 행동

[Button](https://tossmini-docs.toss.im/tds-mobile/components/button/)은 `fill`(주요 행동)과 `weak`(보조 행동), small/medium/large/xlarge 크기, inline/block/full 배치, loading·disabled를 구분한다. 문서에 따르면 로딩 중 버튼 너비를 유지한다. 따라서 덕에서는 저장·추가·로그인을 강조하고, 돌아가기·닫기·다시 보기를 같은 강도로 강조하지 않는다. 처리 중에는 중복 요청을 막으며 버튼이 갑자기 작아지지 않게 한다.

[BottomCTA](https://tossmini-docs.toss.im/tds-mobile/components/BottomCTA/check-first/)는 고정 여부와 Single/Double을 구분한다. Single의 safe area/키보드 위 고정 옵션을 참고해 하단 저장 버튼이 홈 인디케이터·키보드·기존 탭을 가리지 않게 한다. 모든 화면에 고정 버튼을 무조건 추가하는 규칙은 아니다.

### 목록과 입력

[ListRow](https://tossmini-docs.toss.im/tds-mobile/components/ListRow/list-row-overview/)는 left / contents / right 구조로 아이콘·본문·부가 행동을 분리하며, 들여쓴 구분선·상하/좌우 여백·터치 피드백·disabled를 조절한다. 덕 Todo는 체크 / 제목과 날짜 / 필요한 보조 행동으로 대응한다. 배지·카드를 늘리거나 단순 목록을 금융 서비스 홈으로 바꾸지 않는다.

[Checkbox](https://tossmini-docs.toss.im/tds-mobile/components/checkbox/)는 Circle/Line과 checked·disabled·라벨을 구분한다. 덕의 실제 완료 상태는 기존 store가 계속 소유한다. 시각적 체크만 바꾸고 서버 상태를 누락하지 않는다.

[TextField](https://tossmini-docs.toss.im/tds-mobile/components/TextField/text-field/)는 box/line/big/hero, label·placeholder·help, hasError·disabled를 구분한다. 여러 필드를 쓰는 로그인·가입에서는 항상 보이는 라벨을 우선 검토하고, 오류를 해당 필드와 연결한다. [TextArea](https://tossmini-docs.toss.im/tds-mobile/components/TextField/text-area/)는 고정/자동 높이와 최소 높이를 구분한다. 긴 붙여넣기·초안 입력에 필요한 공간과 키보드 회피를 제공한다.

### 화면 위계와 선택

[Top](https://tossmini-docs.toss.im/tds-mobile/components/top/)은 제목·상단/하단 부제목·우측 요소·상하 여백을 분리한다. 덕 화면의 제목과 설명을 공통 Header로 정리한다. [ListHeader](https://tossmini-docs.toss.im/tds-mobile/components/list-header/)는 페이지 제목과 별개의 섹션 헤더로 사용한다.

[SegmentedControl](https://tossmini-docs.toss.im/tds-mobile/components/segmented-control/)은 여러 선택지 중 하나를 선택하고, [Tab](https://tossmini-docs.toss.im/tds-mobile/components/tab/)은 콘텐츠 전환을 담당한다. 덕의 전체/미완료/완료 필터와 콘텐츠 전환에 각각 대응한다. 이 문서의 Tab을 앱 전체 하단 5개 탭의 정확한 시각 규격이라고 단정하지 않는다. 5개 탭 IA는 유지한다.

### 피드백과 오버레이

[Toast](https://tossmini-docs.toss.im/tds-mobile/components/toast/)는 짧은 작업 피드백이며 버튼과 CTA 위 배치를 지원한다. useToast 문서에는 버튼 없는 토스트 기본 3000ms, 버튼 있는 경우 기본 5000ms와 앱/웹 차이가 나온다. 덕의 완료 후 4초 되돌리기는 사용자 확정 요구이므로 이 기본값으로 바꾸지 않는다.

[Result](https://tossmini-docs.toss.im/tds-mobile/components/result/)는 결과·오류와 후속 행동을 묶는다. Loader/Skeleton과 함께 목록이 비어 있음·로딩·실패를 혼동하지 않게 한다.

[BottomSheet](https://tossmini-docs.toss.im/tds-mobile/components/bottom-sheet/)는 현재 화면을 떠나지 않는 상세/선택/추가 행동이다. 문서는 바깥 영역·뒤로가기로 취소/닫기를 권장하고, 예제의 `UNSAFE_disableFocusLock`은 실제 접근성 대응을 제거하므로 복사하지 않는다. [ConfirmDialog](https://tossmini-docs.toss.im/tds-mobile/components/Dialog/confirm-dialog/)는 확인/취소가 필요한 선택에 사용하며 긴 버튼 문구는 세로 배치될 수 있다. 삭제·외부 원본 변경 확인은 기존 동작을 유지한다.

IconButton·Checkbox·Tab 등의 역할/상태/라벨 설명은 React Native의 accessibilityRole/accessibilityState/accessibilityLabel로 대응한다. DOM aria 속성 코드를 네이티브에 그대로 붙이지 않는다.

## SDK 적용 판단

시작하기 예제는 `react-dom`, Emotion, React 18과 TDSMobileAITProvider를 사용하는 웹 라이브러리다. 덕은 React Native + Expo SDK 58 기반이다. 따라서 이 패키지를 바로 설치하거나 WebView로 전환하지 않는다. 확인된 토큰과 행동 원칙을 덕의 네이티브 공통 컴포넌트로 구현한다. 문서의 마이그레이션/legacy API나 금융 키패드·동의서·차트 예제는 덕에 필요하다는 이유 없이 추가하지 않는다.

## 다음 구현의 완료 기준

1. 의미 토큰과 제목/본문 체계를 공통화하고 기존 임의 색상·10–11pt 필수 안내를 정리한다.
2. 버튼(주요/보조·로딩·비활성), 헤더, 입력, ListRow·체크를 공통화한다.
3. Todo → 캘린더 → 덕 → log → 내정보 순으로 적용한다. 기존 42칸 달력·스와이프·4초 되돌리기·클라우드 권한/세션 처리는 보존한다.
4. 320/390/430 너비와 큰 글자·긴 제목·키보드·하단 겹침을 확인한다. TypeScript/웹 회귀와 iOS 번들 검증 후 TestFlight 새 빌드를 올려 실기기에서 확인한다.

이 문서 최초 작성은 자료 분석과 명세 저장까지였고, 이후 사용자 요청으로 디자인 1차 적용을 진행했다. 최신 변경과 검증 범위는 `docs/design-guide.md`를 따른다. 기존 업로드 iOS 바이너리는 새 빌드 없이 변경되지 않는다.

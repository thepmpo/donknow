# 캘린더 화면 채우기·버튼 순서·먼저 표시 후 갱신 — 현재 계약

2026-11-13 사용자의 후속 스크린샷/명시적 답변이 기준이다. [이전 정리 계약](calendar-refinement-2026-11-13.md)의 **24pt 추가 여백·92pt 최소 주 높이·월 내부 세로 스크롤·Today 위 보기 버튼**은 이 문서로 대체한다. 기존 Apple 참고 외형, 주말 색·인접 월 연한 숫자, 시트/원본 쓰기 보호·Glass·물리 카메라 열·좌우 pane·기존 데이터/인증은 유지한다.

## 쉽게 설명하면

- 오른쪽에 나타나던 줄은 **스크롤바**다. 캘린더의 스크롤바를 숨겼다. 월간/2주 달력 자체는 위아래로 끌리지 않고 남은 화면 높이를 나눠 채운다. 목록/시간표/긴 상세·편집은 계속 스크롤할 수 있다.
- 사용자 확인으로 카메라 열 순서는 **오늘 → 2주 보기 → 기존 5개 탭**이다. 두 원형 버튼의 순서만 바꾼다. `주 보기`의 7일 시간표와 `2주 보기`의 넓은 두 행은 다른 기능이다.
- 일반 iPhone은 **제목 옆 겹친 달력 아이콘으로 월↔2주 전환**, **오른쪽 년·월 → 오늘**로 이동한다. 기존 하단 탭을 유지한다. 새 화면 캡처를 아래에서 확인한다.
- 제목 아래 추가24pt를 없앴다. 요일 글자 위 여백도 정리해 캘린더 요일 줄이 ‘할 일’ 화면의 날짜 줄과 같은 시작 높이를 사용한다. 다섯 화면 제목은 공통 `ScreenHeading`을 그대로 공유한다.
- 이미 받아둔 일정은 즉시 보여주고 뒤에서 갱신한다. 먼저 도착한 캘린더부터 반영하고 실패한 캘린더의 기존 일정은 남긴다. 처음 보는 기간/앱을 완전히 다시 켠 경우에는 실제 조회가 필요하다.

## 배치 수치와 상태

| 항목 | 구현 기준 | 원본 |
| --- | --- | --- |
| 공통 제목 | pageTop16·heading26/35·titleBottom16, pageInset24 유지 | theme.ts / ScreenHeading.tsx |
| 캘린더 본문 시작 | 추가 spacer0, 요일 paddingTop0/paddingBottom12. 기본 글자에서 헤더 끝부터 첫 요일 글자 시작 | CalendarScreen.tsx |
| 행 높이 | `(실측 pane 높이 − 실측 제목 높이 − 하단 보호 − 실측 요일 높이) / 실제 행 수`. 정수 버림/최소92/추가16pt 없음 | calendar-model.monthCellHeight |
| 하단 보호 | Duo8pt, 일반폰 navigationHeight72+safeInset+gap8. 실제 탭·홈 인디케이터를 침범하지 않음 | CalendarScreen.tsx |
| 세로 이동 | 월/2주 scrollEnabled=false, bounces=false·alwaysBounceVertical=false·overScrollMode=never. 스크롤바 둘 다 false | CalendarScreen.tsx |
| 일정 미리보기 | 행의 실제 공간 안에서 제목/개수. 부족하면 개수와 날짜 상세로 확인. 최단 가로 높이의 숫자는 compact 처리; 큰 글자 설정 자체를 끄지 않음 | CalendarScreen.tsx |
| Duo 버튼 | 같은 안전 segment의64pt 원형2개·간격8. 오늘 위/보기 아래. 슬롯 하나만 가능하면 Today만 남고 보기는 본문 헤더로 대체 | duo-layout.ts / DuoChrome.tsx |

월은 해당 월의 날짜가 있는4·5·6주만 표시한다. 2026년11월은11/1–12/5,2주 모드는 선택 주+다음 주14일이다. 좌우 가로 이동·년월 선택·Today·날짜/일정 탭·오른쪽 활성 pane 우선·탭/접힘/회전 상태는 유지한다. 이 수치는 덕 구현 계약이지 Apple 공식 고정값이 아니다.

## 일정 유지와 갱신 계약

`mobile/src/useCalendarData.ts`의 **실행 중 메모리 캐시**이며 일정 원문을 새로운 영구 파일/공개 문서에 저장하지 않는다.

1. owner는 현재 Duck 사용자 ID와 서버 주소다. 시간대가 다르면 별도 family다. 선택 출처/기간별 최대12개 snapshot을 보관하고 새 owner에서는 캐시·기능 확인·페이지 연결을 비운다. App도 계정/서버 키로 Calendar를 재마운트한다.
2. 같은 기간은 snapshot 즉시 표시, 다른 기간은 같은 owner/시간대에서 이미 읽은 겹치는 일정을 표시한다. 새로운 출처를 추가해도 기존 출처를 비우지 않는다. 갱신 중 상태는 loading이며 완료/빈 시간으로 과장하지 않는다.
3. 기능 확인은 같은 owner에서5분 캐시해 매 화면 이동마다 capabilities→events 직렬 왕복을 반복하지 않는다. 최초/만료 후에는 실제 capabilities를 확인한다. 권한·쓰기 승인은 캐시로 우회하지 않는다.
4. 출처 GET은 병렬 실행한다. 각 응답 도착 시 해당 출처를 화면에 먼저 반영한다. 전체 성공/부분/실패 상태는 전체 결과가 정해진 뒤 판정한다. 실패한 출처의 snapshot·로그인을 지우지 않는다.
5. 다음 페이지가 있으면 기존 일정과 받은 항목을 합쳐 보여준다. 마지막 페이지까지 확인한 출처만 그 기간의 권위 있는 결과로 교체하므로 실제 삭제도 반영한다. 갱신을 시작했다는 이유로 먼저 지우지 않는다.
6. 겹치는 다른 기간의 snapshot에도 새 제목/변경/확인된 삭제를 반영한다. 2주를 갱신하고 월간으로 돌아갔을 때 옛 제목이나 삭제된 항목이 부활하지 않는다.
7. generation·현재 key·active 검사를 **각 응답 반영 전** 수행한다. 다른 월/출처/계정으로 이동한 뒤 늦게 도착한 결과는 반영하지 않는다. 명시적 unconnected 응답은 캐시를 폐기하고 해당 결과로 갱신한다. 일시 네트워크 실패와 실제 해제를 구분한다.
8. API 저장·발송·OAuth·확인 요청의 자동 재실행이나 성공 전 일정 저장 완료 표시는 추가하지 않았다. 첫 조회/서버 cold start·Google 실제 응답 속도를0초로 보장하지 않는다. 앱 완전 종료/새 기기에는 메모리 snapshot이 없으므로 조회가 필요하다.

## 이미지·검수·이어받기

- [일반 iPhone 월간 / 제목 옆2주 버튼](../artifacts/calendar-viewport-2026-11-13/ordinary-month.png)
- [일반 iPhone 년·월 메뉴 / 오늘](../artifacts/calendar-viewport-2026-11-13/ordinary-today-menu.png)
- [일반 iPhone 2주](../artifacts/calendar-viewport-2026-11-13/ordinary-fortnight.png)
- [Duo 버튼 순서 / 접힘](../artifacts/calendar-viewport-2026-11-13/duo/11-folded-calendar-light.png)
- [먼저 보이는 이전 일정](../artifacts/calendar-viewport-2026-11-13/cache-immediate-fortnight.png)
- [빠른 출처부터 갱신](../artifacts/calendar-viewport-2026-11-13/cache-fast-source-first.png)
- [QA·한계](calendar-viewport-qa-2026-11-13.md) · [개인 Notion 기록](https://app.notion.com/p/41718ee8299181389c27f3f68549c4d3)

그림은 실제 Expo 앱+합성 API 또는 명시한 Duo 기하 fixture다. 파란 카메라 영역/검은 표식은 테스트 도구의 기하 표시이며 제품 화면이나 실제 하드웨어 캡처가 아니다. 사용자 실제 스크린샷/개인 일정은 공개하지 않았다.

```bash
npm run check
npm test
npm --prefix mobile run typecheck
EXPO_NO_TELEMETRY=1 CI=1 npm --prefix mobile run export:web -- --max-workers 2
node mobile/e2e/calendar-viewport.mjs
node mobile/e2e/calendar-cache.mjs
CALENDAR_CAPTURE_DIR=/tmp/calendar-workspace-check node mobile/e2e/calendar-workspace.mjs
DUO_CAPTURE_DIR=/tmp/duo-check node mobile/e2e/duo-layout.mjs
EXPO_NO_TELEMETRY=1 CI=1 npm --prefix mobile run export:ios -- --max-workers 2
```

실제 iPhone 설치/ScrollView 네이티브 제스처·큰 글자·Google 계정 재연동은 새 native 빌드 후 검수한다. 웹/iOS JS export를 IPA/Apple 제출 성공으로 확대하지 않는다. 기존 수동·무료 GitHub Mac 경로를 유지하며 개인 토큰/새 서명/유료 플랜은 요구하지 않는다. [현재 빌드 상태](testflight-automation.md)를 확인한다. 소개 사이트·AI 사무실은 이번 범위가 아니다.

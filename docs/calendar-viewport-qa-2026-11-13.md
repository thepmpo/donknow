# 캘린더 화면/캐시 QA — 2026-11-13

final result: passed

범위: 실제 Expo 웹 렌더·격리 API·Duo 기하 fixture. 실제 iPhone IPA·사용자 Google·native Glass/VoiceOver 검수 완료를 뜻하지 않는다. [현재 계약](calendar-viewport-2026-11-13.md)이 이전24pt 여백·최소92pt 행·월 내부 스크롤·버튼 순서를 대체한다.

## 소스와 시각 비교

사용자가 이번 대화에 첨부한 월/2주·오른쪽 스크롤바·Todo 날짜 줄 사진과 버튼 순서 답변을 직접 읽었다. 실제 사용자 사진은 공개 복제하지 않았다. 동일한 합성 계정/테마/기간의 변경 전·후 Expo 캡처를 같은 비교 입력에 함께 열어 확인했다.

- 일반폰: `before-ordinary-month.png` / `ordinary-month.png`, 모두390×844 CSS·DPR2(780×1688 PNG)·2026-11-14. 첫 요일 줄의24pt 이상 추가 간격 제거·폭 축소/겹침 해소·마지막 주까지 하단 탭 위에 맞는 것을 확인했다.
- Duo: 기존 `calendar-refinement-2026-11-13/duo/11-folded-calendar-light.png` / 새 `calendar-viewport-2026-11-13/duo/11-folded-calendar-light.png`, 모두390×844 CSS·DPR1·동일 기하 fixture·2026-11-13. Today/보기 순서만 교환, 오른쪽 기존5탭·카메라 표식 위치 보존, 마지막 행이 기존보다 아래까지 채우는 것을 비교했다.
- 일반폰 년·월 메뉴와Today, 월↔2주, dark,6주 달력을 실제로 열어 캡처했다. 달력 숫자/7열과 버튼 헤더·하단 경계는 DOM 실측도 검사했다.

## 발견·수정과 재검증

1. P1 — 과거 최소92pt·추가 하단16pt로 짧은 화면/2주 보기에서 세로 스크롤이 생겼다. 실측 가용 높이를 행 수로 정확히 나누고, grid 모드 스크롤/bounce를 막았다. 320×667·390×844·431×640·430×932·844×390, 월/2주 및4·5·6주에서 scrollHeight≤clientHeight+1, wheel 후 위치0을 재확인했다.
2. P2 — Calendar 추가24pt·요일 위6pt 때문에 Todo 날짜 줄보다 낮게 시작했다. spacer 제거·요일 top0/bottom12, 다섯 제목x24/y64·기본 본문 첫 줄y115를 확인했다. 이는 이 일반폰 웹 fixture의 좌표이며 native safe area를 하드코딩하지 않는다.
3. P2 — 달력 행이 줄면 일정 칩/더보기까지 잘릴 수 있었다. 실측 높이에 맞춰 표시 개수와 실제 남은 수를 계산하고 날짜 상세를 유지했다. 낮은 가로 화면은 숫자 compact 처리. 작은 화면 dark 테스트는 제목 칩이 없는 경우 날짜→상세 경로를 검사한다.
4. P1 — 범위/선택 출처가 바뀌면 snapshot을 먼저 비웠다. owner/서버/시간대별12기간 메모리 캐시·즉시 복원·병렬 출처별 반영으로 수정했다. 응답을 보류한 여러 프레임에도 이전 일정이 보이고 도착 후 새 제목이 보이는 것을 확인했다.
5. P1 — 캐시를 더하면 옛 제목/삭제·다른 계정의 늦은 결과가 섞일 수 있다. 겹치는 기간 snapshot 갱신·마지막 페이지 후 삭제 적용·각 응답 generation/key/active 검사·새 owner 초기화를 검증했다. A 요청을 보류→로그아웃→B 로그인→A 응답을 먼저 풀어도 A 일정0, B 일정만 도착함을 확인했다.

## 필수 시각 항목

| 항목 | 결과 |
| --- | --- |
| 글꼴/위계 | 기존 시스템 글꼴·26/35 제목·18/26 년월·20/26 날짜 유지. 높이가 매우 낮은 가로만 숫자 compact. 일반폰/접힘 제목 겹침 없음 |
| 간격/레이아웃 | 공통 제목 유지, Calendar 본문 첫 줄 정렬, 남은 높이5/2행 분배, 보호 여백 밖으로 overflow 없음 |
| 색상/토큰 | 시스템 light/dark, 일요일 red/토요일 blue/인접월.48·선택 white 유지 |
| 이미지/아이콘 | 기존 오리와 Ionicons 유지. 새 생성/가짜 하드웨어 이미지 없음. 기하 fixture 표식은 제품 UI로 표시하지 않음 |
| 내용/상태 | Today·2주 보기·년월 메뉴가 실제 동작. 오류를 빈 일정 성공으로 표시하지 않음. 느린 갱신에도 기존 일정 유지 |

## 자동 검사 영수증

- `npm run check`, `npm test`: 문법 검사와 전체254개 중253통과·실패0·기존 선택1제외.
- 모바일 TypeScript, Expo web export, iOS JS/Hermes export 통과. native IPA가 아니다.
- `calendar-viewport.mjs`: 4·5·6주/2주·다섯 제목·본문 기준선·세로 이동 없음·일반폰 버튼·dark. `viewport-verification.json` 보존.
- `calendar-cache.mjs`: 즉시 재표시·보류 프레임·출처별 반영·capabilities 재요청 감소·중첩 기간 제목·503 보존·pagination/삭제·기간/계정 지연 응답 격리. `cache-verification.json` 보존.
- `calendar-workspace.mjs`: 캘린더 상세/편집/미리보기/확인/취소·결과 불명 재전송0·검색·출처·실패/부분·메모·큰 글자 회귀 통과. 새 캡처는 `workspace/`.
- `duo-layout.mjs`: 버튼 순서·물리 카메라 열·pane·회전/접힘·입력/월/스크롤 상태·일반 하단 탭/Glass 대체 재질 회귀 통과. 새 캡처는 `duo/`.

- 전체앱 `app.mjs`: 실제 격리 API·5탭·계정/401 격리·로그인/저장/모달·기존 외부 실행 확인/결과불명 보호 통과. 새 그림은 `app/`이며 기존 캡처를 덮어쓰지 않았다.

## 남은 기기 검수

- 새 native 빌드 설치 후 월/2주에서 실제 손가락 세로 끌기와 관성/bounce가 없는지, 시간표/목록/상세의 필수 스크롤은 유지되는지 확인.
- 폰의 실제 safe area·Dynamic Type·VoiceOver·회전·Duo 접힘/펼침, 특히 매우 낮은 가로의 compact 날짜 터치와 가독성 확인.
- 실제 Google 첫 조회/cold start·동일/새 기간·앱 백그라운드 복귀·실제 해제/재연결 확인. 실행 중 메모리 캐시는 앱 강제 종료/다른 기기까지 유지한다고 약속하지 않음.
- 빌드/Apple 업로드/처리/설치는 [TestFlight 기록](testflight-automation.md)과 별도 확인. 이전26 성공을 이 수정의 native 검증으로 재사용하지 않음.

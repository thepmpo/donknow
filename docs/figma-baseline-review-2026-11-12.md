# Figma 현재 화면 대조 재점검 — 2026-11-12

## 이번에 실제 확인한 것

[Figma 원본](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=3-265)의 `01 · All wireframes` 페이지(`3:265`)를 Figma 연결 도구로 읽었다. **기존 화면·상태 프레임 69개와 각각의 ID를 재확인했다.** 이전 문서의 “Figma 읽기 불가”는 당시 기록이며, 이번에는 메타데이터 읽기 1회가 성공했다.

- 캘린더 8개, Todo 9개, 편집 8개, 덕 12개, log 4개, 내정보·연결 12개, 로그인·오류 10개, 공통 6개로 합계 69개다.
- 최초 코드 비교 기준은 `5e129f03575843864b99c542ae7357718a696a6f`다. 이 커밋의 앱 코드는 사용자가 확인한 `f76172d` 이후 변경되지 않았다.
- 이 문서 작성 중 덕 채팅·Duo·로그인 관련 코드 작업이 병행되고 있다. 아래 값은 위 기준 커밋의 비교 결과이며 이번 변경 이후의 화면이 Figma에 반영됐다는 뜻이 아니다.
- 사용자 확인 이력은 Render `f76172d`, TestFlight `1.0.0 (12)`다. 현재 iPhone 실기기 화면을 이번에 새로 열어 대조한 것은 아니다.

## 아직 적용하지 못한 이유와 정확한 범위

첫 페이지 메타데이터는 성공했지만, 이어서 파일의 페이지 이름을 읽는 **읽기 전용** 요청에서 다음 응답을 받았다.

> You've reached the Figma MCP tool call limit on the Starter plan.

응답의 오류 코드는 `INVALID_ARGUMENT`였다. 연결 계정의 표시 플랜은 Starter·View였지만, 이번 실패의 직접 근거는 위 호출 한도 응답이다. 파일 쓰기 권한 자체를 별도로 시험하거나 없다고 단정하지 않았다. 유료 업그레이드·권한 변경·우회는 하지 않았다.

**이번 캔버스 수정 0개, 원본 삭제·재생성 0개, Proposed 복제 0개다.** 코드 대조 메모의 캔버스 추가도 실행하지 못했다. [Figma 공식 호출 한도 안내](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/).

## 기본 화면에서 재확인한 차이

Figma의 구조·크기는 실제 반환된 메타데이터에서 확인했다. 코드 값은 위 기준 커밋의 `mobile/src/`와 `mobile/App.tsx`를 기준으로 한다. 모든 색·폰트·모션을 시각 검수했다는 뜻은 아니다.

| 화면 | 현재 Figma의 확인된 구조 | 코드와 맞춰야 할 부분 |
|---|---|---|
| C01 캘린더 | 화면 390×844, 본문 x24·너비342 안에 날짜 그리드, 셀 약48.85·높이70 | 코드는 날짜 그리드 전체 너비, 셀 너비 14.285714%, 행 높이 max(88,min(120,(화면높이−280)/6)). 선택일/다음 달 날짜의 강조와 같은 날짜의 실제 일정·Todo도 맞춰야 한다. |
| T01 Todo | 390×844 화면, 기존 Todo 행은 64 높이의 저해상도 예시 | 제목 우측 미완료 숫자, 별도 날짜·스와이프 안내, 최소60pt 행과 실제 날짜/출처 유무를 맞춘다. 완료는 즉시 체크→3·2·1→350ms 페이드→log이며 실기기 동작 대조가 필요하다. |
| A01 덕 | 기존 인사·바로가기·입력 구조의 저해상도 예시 | 현재 작업의 채팅 내 AI 제안·붙여넣기 후보 확인 흐름은 이번 코드 검증 후 다시 반영한다. 과거 A01/A11을 새 채팅 완료 화면이라고 표시하지 않는다. |
| L01 log | 완료 이력과 별도 L03/L04 연동 기록 예시가 존재 | 실제 log 탭은 완료 Todo·완료 숫자·되돌리기가 중심이다. 연동 실행 기록을 log 본문에 합쳐 새 기능으로 만들지 않는다. |
| P01 내정보 | 상단·알림·계정·공급자별 화면이 분리된 예시 | 상단 설명·아바타·통계, 서비스 목록 행, 미리 알림·알림·내보내기의 실제 순서를 맞춘다. 연결 상태는 예시 값으로 실제 성공을 대신하지 않는다. |
| U01/U02 공통 | 하단 내비게이션 390×106 고정, 예시 버튼52, 메모220 박스 안에 라벨 포함 | 코드는 safe area 기반 하단 패딩·탭 최소58, 주요 버튼 최소56/보조48, 메모 입력 자체 최소220이다. 키보드·큰 글자·시트 손잡이44pt를 기기에서 대조한다. |

공통 코드 기준은 제목26/35·굵기700, 본문 좌우24·상단16, 브랜드 최소48, 기본 시스템 글꼴이다. Figma의 390×844는 검수용 예시 크기이며 특정 iPhone 또는 Duo의 공식 크기라고 사용하지 않는다. 상세 항목은 [기존 UI 대조표](current-ui-comparison.md)와 [공식 디자인 가이드](design-guide.md)에 이어진다.

## Current baseline과 Proposed의 완료 기준

1. 최종 코드 커밋·실제 TestFlight 빌드·기기·화면 크기·글자 크기와 같은 데이터 상태를 기록한다.
2. 기본 5개 탭과 편집/로그인/권한/오류 상태를 같은 조건으로 비교한다. 웹 fixture 캡처는 웹 검증으로, iPhone 캡처는 실기기 검증으로 구분한다.
3. 기존 69개 원본 ID는 유지하고 차이를 제자리 수정하거나 프레임 바깥의 검수 메모로 남긴다.
4. 코드와 실제 기기 모두 일치한 프레임만 **Current baseline**으로 표시한다. 코드만 맞춘 경우 “코드 기준 대조·실기기 미확인”으로 기록한다.
5. 확정한 프레임을 복제한 후에만 **Proposed**로 분리하고 변경 목적·영향·검증 상태를 적는다. 현재 기준과 제안을 한 프레임에서 섞지 않는다.

사용자는 이번에 Duo 대응 진행을 명시했다. 기존 “Duo 진행 전 보류”는 이번 요청으로 해제됐지만, 공식 API·접힘 상태·안전 영역을 확인하기 전 모델명/폭을 추정하거나 실제 지원 완료라고 쓰지 않는 기준은 유지된다. Duo 검수에는 접힘·펼침 모두 우측 내비게이션, 일반 iPhone 하단 내비게이션, iPad·가로 모드 오판 방지, 현재 탭·입력·편집·스크롤 보존, 힌지·시트·키보드 겹침 방지가 포함된다.

## 다음 작업자가 이어갈 순서

- Figma 호출이 다시 가능한지 최소 읽기 1회로 확인하고, 실패가 반복되면 동일 요청을 계속 재시도하지 않는다.
- 덕 채팅과 Duo 작업의 최종 커밋·검증 결과를 먼저 읽고 이 문서의 최초 코드 기준과 구분한다.
- 아래 기존 ID로 기본5개 화면을 우선 대조한다. 원본을 전부 새로 만들거나 불확실한 화면을 Current baseline으로 승인하지 않는다.
- 실기기 근거가 없는 부분은 정확히 남기고, 실제 화면 근거가 확보된 부분부터 차례대로 확정한다.

## 재확인한 화면·상태 69개

| 원본 화면 | 확인한 노드 ID |
|---|---|
| [C01 월간 · 일정 표시](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-8) | `4:8` |
| [C02 주간 보기](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-144) | `4:144` |
| [C03 선택일 · 아젠다 스크롤](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-212) | `4:212` |
| [C04 년·월 이동 시트](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-259) | `4:259` |
| [C05 일정 없음](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-304) | `4:304` |
| [C06 일정 연결 오류](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-340) | `4:340` |
| [C07 일정 작성 · 비서 작업](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-382) | `4:382` |
| [C08 일정 수정 · 대상 선택](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-432) | `4:432` |
| [T01 기본 목록](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-482) | `4:482` |
| [T02 완료 직후 · 3초](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-532) | `4:532` |
| [T03 카운트다운 · 2초](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-582) | `4:582` |
| [T04 카운트다운 · 1초](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-632) | `4:632` |
| [T05 실행 취소 · 복원](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-682) | `4:682` |
| [T06 페이드 · 350ms](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-726) | `4:726` |
| [T07 완료 후 목록](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-771) | `4:771` |
| [T08 빈 목록](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-814) | `4:814` |
| [T09 저장 실패 · 복구](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-847) | `4:847` |
| [E01 새 할 일](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-896) | `4:896` |
| [E02 수정 · 상단](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-948) | `4:948` |
| [E03 수정 · 하단 액션](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1000) | `4:1000` |
| [E04 날짜 선택](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1051) | `4:1051` |
| [E05 시간 선택 · 스크롤](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1099) | `4:1099` |
| [E06 메모 입력 · 키보드](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1145) | `4:1145` |
| [E07 저장 중](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1197) | `4:1197` |
| [E08 입력·저장 오류](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1244) | `4:1244` |
| [A01 덕 기본](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1297) | `4:1297` |
| [A02 수동 초안 · 확인](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1335) | `4:1335` |
| [A03 연결 서비스·동의](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1378) | `4:1378` |
| [A04 기본 대화](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1430) | `4:1430` |
| [A05 작업 제안](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1481) | `4:1481` |
| [A06 직접 작업 작성](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1529) | `4:1529` |
| [A07 실행 전 확인](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1585) | `4:1585` |
| [A08 분석·실행 중](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1634) | `4:1634` |
| [A09 AI 미설정](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1677) | `4:1677` |
| [A10 실패·결과 불확실](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1726) | `4:1726` |
| [A11 대화 붙여넣기](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1772) | `4:1772` |
| [A12 저장·외부 기록 검색](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1821) | `4:1821` |
| [L01 완료 활동 기록](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1878) | `4:1878` |
| [L02 완료 기록 없음](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1919) | `4:1919` |
| [L03 연동 작업 실행 기록](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-1950) | `4:1950` |
| [L04 동기화 전송 기록](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2000) | `4:2000` |
| [P01 내정보 · 상단](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2045) | `4:2045` |
| [P02 내정보 · 알림·데이터](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2090) | `4:2090` |
| [P03 내정보 · 계정](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2132) | `4:2132` |
| [P04 Google 읽기·연결](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2175) | `4:2175` |
| [P05 Google 쓰기·동기화](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2216) | `4:2216` |
| [P06 Google 자료·가져오기](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2253) | `4:2253` |
| [P07 Slack 연결·권한](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2297) | `4:2297` |
| [P08 Notion 연결·권한](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2336) | `4:2336` |
| [P09 네이버 별도 연결](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2378) | `4:2378` |
| [P10 연결 해제 확인](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2431) | `4:2431` |
| [P11 미리 알림 · 선택 가져오기](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2464) | `4:2464` |
| [P12 미리 알림 · 원본 변경](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2503) | `4:2503` |
| [R01 로그인](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2547) | `4:2547` |
| [R02 회원가입](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2576) | `4:2576` |
| [R03 서버 연결·체험](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2600) | `4:2600` |
| [R04 초기·서버 기동 로딩](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2623) | `4:2623` |
| [R05 로그인 오류](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2641) | `4:2641` |
| [R06 로그인 후 목록 오류](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2666) | `4:2666` |
| [R07 이메일 인증](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2700) | `4:2700` |
| [R08 비밀번호 재설정](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2741) | `4:2741` |
| [R09 계정 삭제](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2769) | `4:2769` |
| [R10 서비스 미연결·오류](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2809) | `4:2809` |
| [U01 하단 내비게이션](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2850) | `4:2850` |
| [U02 시트 · 닫기·스크롤](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2891) | `4:2891` |
| [U03 표시 이름 모달](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2938) | `4:2938` |
| [U04 개인정보 안내 모달](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-2981) | `4:2981` |
| [U05 공유창 · 시스템](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-3021) | `4:3021` |
| [U06 공통 버튼 상태](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=4-3067) | `4:3067` |

이 문서는 연결 도구의 실제 읽기 성공·실패와 코드 대조를 기록한 인계 자료다. Figma 캔버스 교정 또는 실기기 검수 완료 보고서가 아니다.

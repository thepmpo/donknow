# 변경 기록

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

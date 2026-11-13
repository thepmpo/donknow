# 캘린더 정리·2주 보기·연동 QA

final result: passed — 실제 Expo 웹·격리 API·기하 fixture 검증. native 실기기·사용자 실계정 검수가 아니다.

## 기준과 범위

사용자가 이번 대화에 첨부한 덕의 빨간 표시 영역, 시트 중 상단 흰 영역, Apple 두 주 확대 화면을 직접 확인해 반영했다. 사용자 원본 사진/실제 일정 제목을 공개 저장소에 복제하지 않는다. [현재 계약](calendar-refinement-2026-11-13.md)이 같은 날 이전42칸/본문 도구 규칙보다 우선한다. 소개 사이트는 그대로다.

## 화면 확인

[현재 month](../artifacts/calendar-refinement-2026-11-13/01-clean-adaptive-month.png), [14일 확대](../artifacts/calendar-refinement-2026-11-13/20-fortnight-expanded.png), [상단 dim/시트](../artifacts/calendar-refinement-2026-11-13/22-motion-open-and-top-dim.png), [접힌 Duo](../artifacts/calendar-refinement-2026-11-13/duo/11-folded-calendar-light.png), [실제 시트 동작 영상](../artifacts/calendar-refinement-2026-11-13/sheet-motion.webm).

[월 화면 전후 비교](../artifacts/calendar-refinement-2026-11-13/before-after-month.png)와 [시트 전후 비교](../artifacts/calendar-refinement-2026-11-13/before-after-sheet.png)는 저장소의 기존 after 캡처와 새 캡처를 같은390×844·DPR2 크기의 한 이미지에 함께 배치해 확인했다. 이 전후 비교는 제공 Apple 화면과 같은 미적 참조임을 설명하는 증거이지 Apple 자체 앱을 실행한 증거가 아니다.

확인:24pt 여백·본문 도구/연결 문구 없음,11월5주·12월5일까지만, red/blue 주말·옅은 인접월,14일 두 줄 확대·실측7등분, 상단 dim과 본문 색/opacity 일치, 다른 pane·카메라 열을 덮지 않는 닫기 배경, 실제 기능/키보드/초안 보존.

## 문제를 찾고 수정한 이력

- P1:42칸 고정 때문에 불필요한 다음 달 둘째 주 → 월 날짜가 있는 주만28/35/42일.
- P2:본문의 도구/오류/조회 줄이 시각적 공간 차지 → 년월 sheet로 이동, 상태/재시도 기능은 보존.
- P2:확대 view의 percentage cell이 내용에 따라 좁아질 수 있음 → 실측width/7·shrink0,7열 정렬 재확인.
- P2:두 번째 주 선택 시14일 창이 이동할 수 있음 → selected/fortnightAnchor 분리, 창 보존 검사.
- P1:시트가 pane 본문만 dim해 상단 흰 띠 → 실제 host/pane 좌표로 해당 상단 strip만 같은 dim.
- P2:손잡이만 닫기/짧은8pt 등장 → 배경/상단 탭·360ms 입장/260ms퇴장, reduced motion 즉시.
- P2:시트 내부 화면 전환 후 Escape 초점이 사라진 버튼에 남음 → 제목별 초점 갱신/동일 pane 년월 fallback.
- P1:정상 token회전의 raw token 비교로 잘못된 연결 변경/늦은 상태 응답 → 계정/연결 identity와 read 순서·generation 검사. 실제 계정 변경은 계속 차단.
- 테스트 환경:고정 Date.now가 Animated 진행을 멈추는 것을 확인해 모션 fixture는 흐르는 clock.install로 변경했다. 제품의 OS 보호/시간 설정을 바꾸지 않았다.

검증 범위에서 남은 P0/P1/P2 없음. 실제 native/실계정 확인은 아래 별도 한계다.

## 검증 결과

- 전체254개 중253통과·실패0·기존 선택1제외. 월4/5/6주·월요일 시작·연도 경계/14일 이동·Duo accessory 안전 좌표·동시 정상 갱신/다른 연결 차단·GET 복구 경계 포함.
- 타입, web export, iOS JS/Hermes export 통과. native IPA/서명 검사가 아니다.
- Calendar workspace:월/주/일/목록·검색/소스·명시적 일정 쓰기/취소·미확정 쓰기 재전송 금지·날짜/시간대·기존 데이터 유지·status 재확인·본문/상단 배경 닫기·Escape/large text·320/430·시스템 밝게/어둡게 통과.
- 시트 모션:실제 RAF별 Y값으로 등장 중간 위치/최종0, 내려가기 후 unmount, dim 색 동일, 두 배경 탭·reduced motion 즉시를 확인했다. [기계 판독 결과](../artifacts/calendar-refinement-2026-11-13/sheet-motion-verification.json).
- 연동 상태:취소된 안전 GET 각각1회 복구, 새 connected 응답 뒤 늦은 disconnected 무시,503 때 최근 연결/로그인 유지, 불필요 요청 loop 없음. [결과](../artifacts/calendar-refinement-2026-11-13/integration-verification.json).
- Duo:물리 카메라 열·별도보기/Today 위치·pane dim 범위·오른쪽 우선·가로/세로/접힘/상태·키보드·드래그/Glass fallback·동작/투명도 줄이기·320/390/430 및 큰 글자 회귀 통과. 단순 폭으로 실제 Duo를 감지한 것이 아니다.
- 전체 앱/로그인·이전 계정의 늦은401/프로필 응답·startup 격리, 실제 격리 서버의 HttpOnly cookie 생성/재로드/로그아웃·계정 분리 통과.

## 실제 기기·실계정 한계

사용자의 Google/Notion/Slack에 직접 로그인하거나 권한·토큰을 받지 않았다. 모의 성공을 해당 실제 계정의 연결 유지/외부 쓰기 성공으로 보고하지 않는다. 새 TestFlight/native 빌드도 아직 실행하지 않았다.26번은 이전 앱이므로 새 설치 후 실제 모션·하드웨어/안전영역·VoiceOver·공급자 권한/재승인을 확인한다. Render 서버 수정 반영과 iPhone 설치를 분리해 기록한다.

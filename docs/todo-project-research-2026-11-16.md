# Todo 프로젝트 구성 제안 — 2026-11-16

이번 사용자는 ‘프로젝트별 정리는 좀 생각해보자’고 했다. 따라서 아래는 조사와 다음 설계 제안이며 새 프로젝트 관리 기능의 출시 보고가 아니다.

## 공식 자료 비교

| 서비스 | 읽기/정리 구조 | 덕에 참고할 부분 |
|---|---|---|
| Things | Inbox·Today·Upcoming·Anytime·Someday, 여러 단계 결과는 Project, 지속 책임은 Area, 프로젝트 안 Heading | 날짜 보기와 프로젝트를 동시에 유지. 프로젝트 내부만 짧은 소제목 |
| Todoist | Project 안 Section으로 단계·맥락 분리, 섹션과 작업 이동 | 같은 할 일을 복사하지 않고 프로젝트/섹션만 이동. 빈 큰 분류를 남발하지 않기 |
| TickTick | 공식 도움말의 Folder·List·Section·Task·Subtask와 스마트 목록 | 깊은 계층을 처음부터 모두 가져오기보다 Inbox와 필요한 목록부터 |

직접 읽은 공식 Things/Todoist 가이드를 기준으로 했다. TickTick은 공식 도움말 검색/FAQ의 계층 설명을 참고했으며 동적 본문 전체나 유료 앱의 모든 화면을 직접 사용했다고 주장하지 않는다.

- [Things: Getting Organized](https://culturedcode.com/things/support/articles/6378414/)
- [Things: Headings](https://culturedcode.com/things/support/articles/2803577/)
- [Things: Move](https://culturedcode.com/things/support/articles/9651894/)
- [Todoist: Projects](https://www.todoist.com/help/todoist/features/introduction-to-projects-TLTjNftLM)
- [Todoist: Sections](https://www.todoist.com/help/todoist/features/introduction-to-sections-rOrK0aEn)
- [TickTick 공식 목록 안내](https://help.ticktick.com/articles/7055782283059396608)
- [TickTick 공식 FAQ](https://help.ticktick.com/articles/7055792921664028672)

## 덕에 맞는 가장 작은 구성

Todo 상단은 ‘날짜별 / 출처별 / 프로젝트’를 같은 할 일의 보기 방식으로 둔다. 날짜별은 지금처럼 큰 날짜와 일정/할 일, 출처별은 직접 작성부터 Slack/Google 등 실제 공급자 순서다. 프로젝트에서는 ‘받은함 → 사용자가 만든 프로젝트 → 선택적인 소제목’ 정도로 시작하는 안을 권한다. Area·Folder·깊은 하위 작업은 필요가 확인되기 전까지 추가하지 않는다.

예: 프로젝트 ‘설문 발송’ 안 ‘문항 확인 / 발송 준비 / 회신 확인’ 소제목. 각 행에는 체크박스·제목·날짜·출처·원본 링크를 유지한다. Slack이라는 출처 자체가 프로젝트는 아니다. Slack·메일·문서에서 나온 같은 결과를 한 프로젝트에 모을 수 있어야 한다.

채팅에서 Todo로 보낼 때 AI는 프로젝트를 제안하되, 미확정은 받은함에 둔다. 사용자가 실제로 선택하기 전 프로젝트를 여러 개 자동 생성하지 않는다. 길게 누르기/다중 선택 뒤 ‘프로젝트로 이동’, 행 더보기의 같은 기능과 위/아래 대체 조작을 제공한다. 이동은 같은 Todo ID에 분류/순서만 바꾸며 날짜/원본 연결/완료 이력을 복제하지 않는다.

브리핑의 주제는 당장의 읽기 묶음이고 영구 프로젝트는 사용자가 관리하는 결과다. 이번에 추가한 section 값을 곧바로 영구 프로젝트로 강제 변환하지 않는다. 완료·Todo 이동·일정 저장한 후보의 처리 키는 프로젝트 이동과 독립적으로 유지해서 다음 브리핑에 다시 생성하지 않아야 한다.

다음 구현 시에는 프로젝트/소제목 생성·이름 변경·정렬·이동·삭제 시 받은함 복귀, 동일 Todo ID 유지, 계정 격리/기존 자료 마이그레이션을 하나의 작은 흐름으로 확인한다. 당장은 새 프로젝트 권한/요금이나 무제한 AI 자동 분류를 추가하지 않는다.

# 캘린더 전체 개선 — 저장·배포 확인

2026-11-13 · [구현 계약](calendar-workspace-2026-11-13.md)의 실제 운영 기록. 뒤에 추가된 이 기록 전용 커밋은 앱·서버·공개 HTML을 바꾸지 않는다.

- 구현: `00bf57f6a4b78016a811cc244f0bcfe13118cd6e`.
- 공개 문서 포함 배포 소스: `9f838e1b8dbe6e658bc387ad5bc2fa1149a1cb43`. main에 일반 push했고 강제 push는 하지 않았다.
- [GitHub CI43393598786](https://github.com/thepmpo/donknow/actions/runs/43393598786): 같은9f838e1에서 **success**. 새 TestFlight workflow는 이번 작업에서 요청하지 않았다.
- Render: 기존 `srv-dbgpc0ff3r2c73abc7e0`, free·autoDeploy off 유지. `dep-dbrckslg1s2s7383uhr0`, 소스9f838e1, **2026-11-13 17:30:49 KST live** (`08:30:49 UTC`).
- 실제 공개 응답: `/api/health`의 ok:true, `/api/capabilities`의 calendarWorkspace:2·기존 naverMail.readOnly:true를 확인했다. 기존 인증·DB·OAuth·서명·플랜을 바꾸지 않았다.
- [공개 프로젝트](https://duckduck-test.onrender.com/project)의 첫 현재 기준 절에서 ‘캘린더 개선 전체 구현’, 구현00bf57f·240통과/기존1제외·새27개 캡처·계약 링크를 확인했다. 페이지 document-version도00bf57f다.
- [공개 디자인 가이드](https://duckduck-test.onrender.com/design-guide)의 calendar-audit 절에서 CA-01~20 승인/구현·월/주/일/목록·상세/쓰기·보호·native 미검수를 확인했다. 과거 감사 당시 제안은 역사로 표시한다.

로컬 검증은 전체241개 중240통과·실패0·기존 선택1제외, 문법46·타입·웹/iOS JS·Calendar/전체 앱/로그인/모션/예약/AI 채팅/오류·Duo 회귀다. 문서 회귀·206개 이미지/파일 해시·74개 상대 링크·생성기/Python·diff 검사도 통과했다. 새 캡처는 실제 Expo 웹/격리 API·Duo fixture이며 운영 Google 쓰기0, native/실계정 검수 결과가 아니다.

관리 실행 셸의 공개 호스트 직접 조회는 DNS EAI_AGAIN/프록시403으로 실패했다. 공개 확인은 연결된 TinyFish fetch로 캐시 TTL0·실제 공개 JSON/선택한 현재 문서 절을 읽어 수행했다. 도구 대체 조회 성공을 로그인·모델 호출·원본 쓰기 성공으로 확대하지 않는다. Render의 실제 live 소스와 CI는 각각 연결 도구로 확인했다.

원본 `duckduck-functional-completion.bundle` SHA-256은 `1b73da76ca222cff8a16d6b5a783eeed596d6930d90f05b5a9266990ad7b742d`로 동일하다. 새 DB/인증을 만들거나 복구 bundle을 갱신하지 않았다.

남은 일: 최신main 새 수동 native 빌드/Apple 처리/아이폰 업데이트, 실제 Google 시험 캘린더의 쓰기 권한·ETag·종일/시간대·페이지 검수, 실제 Duo/VoiceOver/Dynamic Type/키보드·native Glass/햅틱·Figma Current/Proposed 교정. 출시·새 유료 플랜·AI 사무실 재개는 수행하지 않았다.

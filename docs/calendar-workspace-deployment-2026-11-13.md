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

## 2026-11-13 — iPhone23 native 성공·Apple 약관으로 제출 차단

[실제 빌드/제출 기록](testflight-automation.md): 수동43394742649·소스1643e0c는 validate와1.0.0(23) 서명 IPA 생성이 성공했고 Apple Submit만 필수 약관 미동의/만료403으로 실패했다. 취소나 앱/Ubuntu 빌드 실패가 아니다. 새 Calendar·ExpoHaptics 포함 native 컴파일은 확인했지만 Apple 업로드/처리·TestFlight 설치·기기 검수는 미확인이다.

계정 소유자가 [Apple 계약](https://appstoreconnect.apple.com/business)과 필요시 [개발자 계정](https://developer.apple.com/account/)에서 약관을 확인/동의해야 한다. 본인 동의 전 재빌드·재제출을 반복하지 않는다. 기존 제출 archive의 재사용은 미확인이며 임시 runner IPA는 기존 cleanup으로 제거됐다. 코드/의존성/서명/데이터/인증·무료 플랜을 변경하지 않고 실제 성공/실패와 다음 행동을 기록한다.

## 2026-11-13 — iPhone25 빌드·Apple 업로드 성공

추가 약관 동의 확인 후 제가 연결된 GitHub로 실패job을 재실행했다. [43394742649 attempt3](https://github.com/thepmpo/donknow/actions/runs/43394742649/attempts/3)·소스1643e0c, job131801055230/validate 모두success. 현재main6161372와 앱/서버/빌드 workflow 동일함을 비교했고 사용자 추가 Run workflow 없이 진행했다. **1.0.0(25) 서명IPA 생성18:29:43 KST·Apple 업로드18:30:18 KST 성공**. [실제 증거와 설치 안내](testflight-automation.md).

Apple 처리 중이며 TestFlight25 등장·실제 설치/기기 검수·Google 실계정 쓰기·Figma는 별도다. 이전23/24의 필수약관 제출 차단은25번 제출에 대해 해제하며, 앱/데이터/인증·서명·무료플랜·원본bundle은 보존했다. 컴퓨터를 꺼도 되고 Apple 처리 후 아이폰 TestFlight→duckduck→업데이트에서25를 확인한다. 다시빌드/공개출시/추가요금은 실행하지 않는다.

# docen 전체 문서 지도

기준2026-11-22. 각 링크는 저장소의 실제 원본이다. 날짜별 문서와 QA는 당시 증거이며 현재 계약은 [통합 기준](DOCEN-START-HERE.md)·[결정 원장](docen-decisions-register.md)을 먼저 따른다. 표에 있다는 사실이 현재 기능/실계정 정상/출시 완료를 뜻하지 않는다.

## 빠른 분야별 길찾기

| 분야 | 먼저 읽을 문서 |
|---|---|
|현재 상태/전체 규칙|[DOCEN-START-HERE](DOCEN-START-HERE.md)|
|홈페이지/배경/웹/어드민 제작|[제작 매뉴얼](docen-product-build-playbook.md)|
|화면/기기/모션|design-guide · liquid-glass-navigation · iphone-duo-support · reference-flows|
|Todo/캘린더/원본|todo-organization-budget · calendar-week-day-stability · reminders-import-stability|
|AI/기억/수신/문서|dots-parity · assistant-agent · assistant-provider-setup · briefing-cards|
|가입/메일/법적문서|signup-legal · password-fields · email-verification · docen-brand|
|어드민|admin-separate-login · admin-owner-bootstrap · admin-management|
|가격/원가|billing-beta-annual · pricing-heavy-users · connections-heavy-usage(현재표와차이주의)|
|운영/빌드/배포|operations · testflight-automation · docen-introduction-deployment|
|보류된AI사무실|ai-office-* (재개지시없이자동진행금지)|

## 저장소 문서 전체 목록

| 원본 문서 | 첫 제목 |
|---|---|
|[DOCEN-START-HERE.md](DOCEN-START-HERE.md)|docen 전체 인수인계 — 다른 AI가 가장 먼저 읽을 문서|
|[REUSABLE-APP-START-HERE.md](REUSABLE-APP-START-HERE.md)|다른 앱을 만들 AI가 먼저 읽을 문서|
|[reusable-app-foundation.md](reusable-app-foundation.md)|재사용 앱 공통 기반 — 핵심 기능 개발에 집중하기 위한 상세 설계서|
|[app-foundation-module-map.md](app-foundation-module-map.md)|앱 공통 모듈 — 실제 소스·검증 파일 지도|
|[reusable-app-integration-contracts.md](reusable-app-integration-contracts.md)|새 앱 공통 기반 연결 계약 — 핵심 기능이 붙는 정확한 경계|
|[app-foundation-release-checklist.md](app-foundation-release-checklist.md)|새 앱 공통 기반 연결·출시 검수표|
|[docen-decisions-register.md](docen-decisions-register.md)|docen 결정·정정 원장|
|[docen-product-build-playbook.md](docen-product-build-playbook.md)|docen 제작 매뉴얼 — 홈페이지·배경·웹앱·어드민을 다른 제품에 재사용하기|
|[admin-live-2026-11-22.md](admin-live-2026-11-22.md)|최신 인증 정정|
|[admin-mail-diagnosis-2026-11-22.md](admin-mail-diagnosis-2026-11-22.md)|관리자 인증메일 발송 실패 진단|
|[admin-management-2026-11-22.md](admin-management-2026-11-22.md)|PG를 제외한 관리자 운영 기능|
|[admin-management-deployment-2026-11-22.md](admin-management-deployment-2026-11-22.md)|PG 외 어드민 운영 기능 배포 확인|
|[admin-owner-bootstrap-2026-11-22.md](admin-owner-bootstrap-2026-11-22.md)|별도 관리자 소유자 초기 설정|
|[admin-owner-bootstrap-deployment-2026-11-22.md](admin-owner-bootstrap-deployment-2026-11-22.md)|관리자 초기 설정 운영 반영 기록|
|[admin-separate-login-2026-11-22.md](admin-separate-login-2026-11-22.md)|별도 어드민 계정과 로그인 게이트|
|[ai-connection-investigation-2026-11-15.md](ai-connection-investigation-2026-11-15.md)|AI 연결의 실제 실패 원인|
|[ai-office-approval-gate.md](ai-office-approval-gate.md)|AI 사무실 — 읽기 전용 제품 검토·승인 후 개발 게이트|
|[ai-office-capabilities.md](ai-office-capabilities.md)|AI 사무실 — 추천 스킬, PDF·Gmail, 업무관리, 팀장회의|
|[ai-office-control.md](ai-office-control.md)|AI 사무실 업무 입력·보고서 확인·휴대폰 비공개 접속|
|[ai-office-development.md](ai-office-development.md)|사무실에서 코드 수정과 배포까지 진행하기|
|[ai-office-handoff.md](ai-office-handoff.md)|“인수인계서 만들어줘”의 공식 처리 기준|
|[ai-office-jjk-theme.md](ai-office-jjk-theme.md)|AI 사무실 주술회전 캐릭터 테마|
|[ai-office-knowledge.md](ai-office-knowledge.md)|AI 사무실 공통 제품 문서함|
|[ai-office-local-install.md](ai-office-local-install.md)|AI 사무실 — Windows 먼저, Mac도 준비|
|[ai-office-login-repair.md](ai-office-login-repair.md)|Windows 사무실 로그인 확인 오류 수정|
|[ai-office-macos.md](ai-office-macos.md)|Mac용 AI 사무실 준비 패키지|
|[ai-office-phone.md](ai-office-phone.md)|맥 사무실을 휴대폰에서 열기|
|[ai-office-ready.md](ai-office-ready.md)|AI 사무실 첫 실행 준비|
|[ai-office-role-guides.md](ai-office-role-guides.md)|사무실 추천 업무 지침(스킬)|
|[ai-office-setup.md](ai-office-setup.md)|여러 프로젝트를 맡기는 AI 사무실 — 초기 구동 기록|
|[ai-office-shared-work.md](ai-office-shared-work.md)|이 채팅과 AI 사무실이 서로 이어서 일하는 방법|
|[ai-office-tone-summary.md](ai-office-tone-summary.md)|덕의 느낌을 함께 정하기 — 쉬운 설명|
|[ai-office-usage.md](ai-office-usage.md)|AI 사무실 — 글자 크기·휴대폰·평소 지시 방법|
|[ai-office-ux-analysis.md](ai-office-ux-analysis.md)|AI 사무실 대화 분석과 duckduck UX 명세 초안|
|[app-foundation-verification-2026-11-22.md](app-foundation-verification-2026-11-22.md)|앱 공통 기반 상세 문서·전체 패키지 검증 기록|
|[assistant-actions.md](assistant-actions.md)|덕 비서 — 읽고 제안하고 Todo로 보여주고 실행하기|
|[assistant-agent-2026-11-15.md](assistant-agent-2026-11-15.md)|덕 — 대화·장기 기억·변경 수신|
|[assistant-agent-qa-2026-11-15.md](assistant-agent-qa-2026-11-15.md)|대화·기억·수신과 배경 컨트롤 — 검수|
|[assistant-briefing-2026-11-15.md](assistant-briefing-2026-11-15.md)|Dots형 개인 비서 — 시간별 브리핑·중요 변화·문서 확인|
|[assistant-briefing-qa-2026-11-15.md](assistant-briefing-qa-2026-11-15.md)|개인 비서 브리핑·문서 확인 — 검사와 한계|
|[assistant-chat-feedback-2026-11-12.md](assistant-chat-feedback-2026-11-12.md)|덕 채팅 전송 무반응 진단과 수정 — 2026-11-12|
|[assistant-provider-setup.md](assistant-provider-setup.md)|덕 공급자 수신 설정 — 운영자 절차|
|[assistant-ux-repair-2026-11-15.md](assistant-ux-repair-2026-11-15.md)|채팅·입력·일정·ME 흐름 복구|
|[assistant-ux-repair-audit-2026-11-15.md](assistant-ux-repair-audit-2026-11-15.md)|채팅·일정·ME 직접 조작 감사와 수정|
|[background-controls-2026-11-15.md](background-controls-2026-11-15.md)|겹친 팝업 뒤의 버튼 딤 — 2026-11-15|
|[billing-beta-annual-2026-11-19.md](billing-beta-annual-2026-11-19.md)|정상 월요금·연간 할인·베타 월요금 — 2026-11-19|
|[briefing-cards-2026-11-16.md](briefing-cards-2026-11-16.md)|AI 채팅 브리핑·체크·Todo/캘린더 전환 — 2026-11-16|
|[calendar-apple-reference-2026-11-13.md](calendar-apple-reference-2026-11-13.md)|Apple 캘린더 참고 수정 · 현재 계약 · 2026-11-13|
|[calendar-comfort-2026-11-14.md](calendar-comfort-2026-11-14.md)|날짜·알림·캘린더 가독성 구현 계약|
|[calendar-comfort-qa-2026-11-14.md](calendar-comfort-qa-2026-11-14.md)|날짜·알림·캘린더 가독성 QA|
|[calendar-events-motion-2026-11-14.md](calendar-events-motion-2026-11-14.md)|캘린더 상세·편집·덕 알림·공통 전환 — 현재 계약|
|[calendar-events-motion-qa-2026-11-14.md](calendar-events-motion-qa-2026-11-14.md)|캘린더 상세·편집·덕 알림·공통 전환 QA|
|[calendar-navigation-2026-11-14.md](calendar-navigation-2026-11-14.md)|캘린더 재선택·길게 누르기 — 기기별 현재 구현 계약|
|[calendar-navigation-qa-2026-11-14.md](calendar-navigation-qa-2026-11-14.md)|캘린더 단축 조작 검수 — 2026-11-14|
|[calendar-navigation-review-2026-11-14.md](calendar-navigation-review-2026-11-14.md)|캘린더 조작·년월 탐색 — 영상 비교와 기기별 결정 기록|
|[calendar-refinement-2026-11-13.md](calendar-refinement-2026-11-13.md)|캘린더 정리·2주 보기·시트·연동 안정성 — 2026-11-13 현재 계약|
|[calendar-refinement-qa-2026-11-13.md](calendar-refinement-qa-2026-11-13.md)|캘린더 정리·2주 보기·연동 QA|
|[calendar-ux-audit-2026-11-13.md](calendar-ux-audit-2026-11-13.md)|캘린더 UX/UI 감사 — Apple Calendar·Fantastical·Apple HIG 비교|
|[calendar-viewport-2026-11-13.md](calendar-viewport-2026-11-13.md)|캘린더 화면 채우기·버튼 순서·먼저 표시 후 갱신 — 현재 계약|
|[calendar-viewport-qa-2026-11-13.md](calendar-viewport-qa-2026-11-13.md)|캘린더 화면/캐시 QA — 2026-11-13|
|[calendar-week-day-stability-2026-11-16.md](calendar-week-day-stability-2026-11-16.md)|주간·일간 보기와 저장 반응 — 2026-11-16|
|[calendar-workspace-2026-11-13.md](calendar-workspace-2026-11-13.md)|캘린더 개선 구현 계약 — CA-01~20|
|[calendar-workspace-deployment-2026-11-13.md](calendar-workspace-deployment-2026-11-13.md)|캘린더 전체 개선 — 저장·배포 확인|
|[calendar-year-overview-2026-11-14.md](calendar-year-overview-2026-11-14.md)|연간 달력·월 확대 전환과 개별 롤백|
|[calendar-year-qa-2026-11-14.md](calendar-year-qa-2026-11-14.md)|연간 보기·확대 전환 QA|
|[change-log.md](change-log.md)|2026-11-22 — docen 소개만 공개·서비스 오픈 보류|
|[chat-calendar-simplicity-2026-11-14.md](chat-calendar-simplicity-2026-11-14.md)|채팅·캘린더 단순화와 양방향 완료 이동|
|[chat-calendar-simplicity-qa-2026-11-14.md](chat-calendar-simplicity-qa-2026-11-14.md)|채팅·캘린더 단순화 검증 — 2026-11-14|
|[chat-checklist-2026-11-14.md](chat-checklist-2026-11-14.md)|채팅 체크리스트 — 완료·제외·Todo 저장|
|[chat-checklist-qa-2026-11-14.md](chat-checklist-qa-2026-11-14.md)|채팅 체크리스트 검수|
|[connect-google.md](connect-google.md)|현재 테스트 서버에서 이메일 인증과 Google Tasks 연결하기|
|[connection-stability-2026-11-15.md](connection-stability-2026-11-15.md)|캘린더 저장본·AI 연결·미리 알림 안정화 — 2026-11-15|
|[connections-heavy-usage-2026-11-19.md](connections-heavy-usage-2026-11-19.md)|연결 개수와 헤비 사용량 기준 — 2026-11-19|
|[continuation-guide.md](continuation-guide.md)|현재 통합 입구 — 2026-11-22 정정|
|[current-ui-comparison.md](current-ui-comparison.md)|현재 UI·기능 통합 대조 — 2026-11-10|
|[daily-document-automation.md](daily-document-automation.md)|매일 저녁 7시 문서 자동 정리|
|[daily-updates.md](daily-updates.md)|매일 개발 정리|
|[design-guide.md](design-guide.md)|2026-11-22 — 웹 작업공간은 소개 상단 예시 기준|
|[design-qa-editor-viewport-history-2026-11-15.md](design-qa-editor-viewport-history-2026-11-15.md)|Design QA — Fixed editor and scroll reveal|
|[desktop-workspace-2026-11-22.md](desktop-workspace-2026-11-22.md)|PC 웹 · 나의 하루 작업공간|
|[desktop-workspace-design-qa.md](desktop-workspace-design-qa.md)|PC 웹 시각·동작 QA|
|[docen-brand-2026-11-22.md](docen-brand-2026-11-22.md)|서비스명 docen 통일|
|[docen-brand-deployment-2026-11-22.md](docen-brand-deployment-2026-11-22.md)|docen 이름 변경 웹 배포|
|[docen-documentation-verification-2026-11-22.md](docen-documentation-verification-2026-11-22.md)|전체 인수인계 문서화 검증 — 2026-11-22|
|[docen-introduction-2026-11-22.md](docen-introduction-2026-11-22.md)|docen 소개 사이트만 공개|
|[docen-introduction-deployment-2026-11-22.md](docen-introduction-deployment-2026-11-22.md)|소개만 공개하는 웹 배포|
|[dots-full-qa-2026-11-15.md](dots-full-qa-2026-11-15.md)|Dots 전체 대응 — 실제 검사와 화면|
|[dots-full-setup-2026-11-15.md](dots-full-setup-2026-11-15.md)|덕 비서 전체 기능 — 실제 연결과 운영 설정|
|[dots-parity-2026-11-15.md](dots-parity-2026-11-15.md)|Dots 공개 기능 전체 대응 — 덕 구현 계약|
|[duck-anydo-site-2026-11-19.md](duck-anydo-site-2026-11-19.md)|덕 소개 사이트·외부 AI 요금 개편안 — 2026-11-19|
|[duck-website-brief-2026-11-13.md](duck-website-brief-2026-11-13.md)|덕 소개 사이트 — 디자인과 실제 동작 계약 · 2026-11-13|
|[duckduck-privacy-policy-draft.md](duckduck-privacy-policy-draft.md)|duckduck 개인정보처리방침 — 공개 전 검토 초안|
|[duckduck-support-draft.md](duckduck-support-draft.md)|duckduck 사용·지원 안내|
|[duo-pane-divider-proposal-2026-11-13.md](duo-pane-divider-proposal-2026-11-13.md)|펼친 Duo 좌우 구분선 · 승인·적용 기록 — 2026-11-13|
|[editor-viewport-2026-11-15.md](editor-viewport-2026-11-15.md)|고정 편집창·선택 영역 스크롤·별도 키보드 닫기|
|[editor-viewport-qa-2026-11-15.md](editor-viewport-qa-2026-11-15.md)|편집 화면 UX/UI 점검·수정 검수|
|[email-verification-2026-11-22.md](email-verification-2026-11-22.md)|가입 이메일 소유 확인 필수|
|[email-verification-deployment-2026-11-22.md](email-verification-deployment-2026-11-22.md)|가입 인증 필수 웹 배포 확인|
|[figma-baseline-review-2026-11-12.md](figma-baseline-review-2026-11-12.md)|Figma 현재 화면 대조 재점검 — 2026-11-12|
|[figma-wireframes.md](figma-wireframes.md)|duckduck Figma 저해상도 와이어프레임 — 2026-11-09|
|[functional-completion-2026-11-13.md](functional-completion-2026-11-13.md)|덕 기능 가동과 Duo 수정 — 2026-11-13|
|[functional-workstream-2026-11-12.md](functional-workstream-2026-11-12.md)|덕 기능 검증·빌드 절약·UX/UI 작업 순서 — 2026-11-12|
|[interaction-polish-2026-11-14.md](interaction-polish-2026-11-14.md)|모션·Duo 스크롤바·채팅 입력부 — 최신 정정|
|[interaction-polish-qa-2026-11-14.md](interaction-polish-qa-2026-11-14.md)|모션·Duo 스크롤바·입력부 검수|
|[interaction-repair-2026-11-14.md](interaction-repair-2026-11-14.md)|채팅 시각·입력창 키보드 내리기·빠른 캘린더 구현|
|[interaction-repair-qa-2026-11-14.md](interaction-repair-qa-2026-11-14.md)|채팅·키보드·달력 반응 점검|
|[ios-release.md](ios-release.md)|iPhone 첫 출시 준비|
|[iphone-duo-support.md](iphone-duo-support.md)|Apple iPhone Duo 대응 · 2026-11-12|
|[keyboard-device-2026-11-14.md](keyboard-device-2026-11-14.md)|기기별 키보드와 입력 공간 계약|
|[keyboard-device-qa-2026-11-14.md](keyboard-device-qa-2026-11-14.md)|기기별 키보드·메모·오늘 음영 검수|
|[keyboard-done-2026-11-14.md](keyboard-done-2026-11-14.md)|키보드 위 ‘완료’ — 2번 선택·앱 전체 적용|
|[keyboard-done-qa-2026-11-14.md](keyboard-done-qa-2026-11-14.md)|키보드 완료 바 — 검수 영수증|
|[liquid-glass-navigation.md](liquid-glass-navigation.md)|Liquid Glass 내비게이션 — 구현·재사용 계약|
|[me-product-review-2026-11-14.md](me-product-review-2026-11-14.md)|ME — 개인 계정·연결·알림의 제품 디자인 검토|
|[me-settings-2026-11-14.md](me-settings-2026-11-14.md)|ME — 계정·연결·알림·데이터 구현 계약|
|[me-settings-qa-2026-11-14.md](me-settings-qa-2026-11-14.md)|ME 재설계 검증 — 2026-11-14|
|[me-simple-2026-11-15.md](me-simple-2026-11-15.md)|ME — 간결한 목록에서 상세로|
|[me-simple-qa-2026-11-15.md](me-simple-qa-2026-11-15.md)|ME 단순화 검증 — 2026-11-15|
|[multi-google-clean-chat-2026-11-14.md](multi-google-clean-chat-2026-11-14.md)|간결한 채팅·Google 여러 계정·맞춤 브리핑 — 2026-11-14|
|[multi-google-clean-chat-qa-2026-11-14.md](multi-google-clean-chat-qa-2026-11-14.md)|채팅 정리·Google 여러 계정 검증 — 2026-11-14|
|[native-build-38-fix-2026-11-15.md](native-build-38-fix-2026-11-15.md)|iPhone38 실패 수정 — 단축어의 Apple API 지원 조건|
|[native-build-fix-2026-11-15.md](native-build-fix-2026-11-15.md)|iPhone37 컴파일 실패 수정 — Swift import 접근 수준|
|[navigation-glass-correction-2026-11-13.md](navigation-glass-correction-2026-11-13.md)|내비게이션 선택 표시의 Glass 정정 — 2026-11-13|
|[navigation-refinement-2026-11-14.md](navigation-refinement-2026-11-14.md)|메뉴 전환·접힘 2주 보기·할 일 키보드·실행 기록|
|[navigation-refinement-qa-2026-11-14.md](navigation-refinement-qa-2026-11-14.md)|메뉴·월 스와이프·2주·키보드·실행 기록 검수|
|[operations.md](operations.md)|운영 준비 및 외부 서비스 활성화|
|[password-fields-2026-11-22.md](password-fields-2026-11-22.md)|비밀번호 확인과 8자 생성 기준|
|[password-fields-deployment-2026-11-22.md](password-fields-deployment-2026-11-22.md)|비밀번호 확인·8자 기준 웹 배포|
|[pricing-heavy-users-2026-11-19.md](pricing-heavy-users-2026-11-19.md)|덕 요금제·문서 작성·헤비 유저 손익 검토|
|[pricing-site-2026-11-16.md](pricing-site-2026-11-16.md)|사이트 요금제·기능표 — 2026-11-16|
|[product-design-chat-audit-2026-11-12.md](product-design-chat-audit-2026-11-12.md)|덕 채팅 Product Design 검토 — 2026-11-12|
|[product-direction.md](product-direction.md)|duckduck 제품 방향과 IA|
|[profile-flow-audit-2026-11-14.md](profile-flow-audit-2026-11-14.md)|내정보의 사용자 흐름 점검|
|[public-project.md](public-project.md)|공개 프로젝트 문서와 댓글|
|[reference-flows-2026-11-15.md](reference-flows-2026-11-15.md)|Things·피클 영상 기준 UX/UI 구현|
|[reference-flows-qa-2026-11-15.md](reference-flows-qa-2026-11-15.md)|Things·피클 영상 적용 검수|
|[references/pickle-motion-report-2026-11-13.md](references/pickle-motion-report-2026-11-13.md)|External browser report — unverified values remain unverified|
|[release-readiness-2026-11-12.md](release-readiness-2026-11-12.md)|덕 운영·백업·iPhone 출시 확인 — 2026-11-12|
|[remaining-activation.md](remaining-activation.md)|남은 연결 활성화와 운영 확인|
|[reminders-import-stability-2026-11-16.md](reminders-import-stability-2026-11-16.md)|미리알림 전체 가져오기·원본 완료 반영·연결 안정성 — 2026-11-16|
|[remote-recovery.md](remote-recovery.md)|Turso 원격 백업과 복구|
|[reusable-product-design-principles.md](reusable-product-design-principles.md)|재사용 가능한 제품·AI 협업 디자인 원칙|
|[scheduled-messages-2026-11-13.md](scheduled-messages-2026-11-13.md)|덕이 먼저 보내는 브리핑·날씨 — 2026-11-13|
|[signup-legal-2026-11-22.md](signup-legal-2026-11-22.md)|실제 회원가입과 약관·개인정보 동의|
|[signup-legal-deployment-2026-11-22.md](signup-legal-deployment-2026-11-22.md)|회원가입·약관 동의 웹 배포 확인|
|[site-deployment-2026-11-19.md](site-deployment-2026-11-19.md)|소개 사이트와 베타 요금 공개 배포 — 2026-11-19|
|[startup-session-pro-2026-11-16.md](startup-session-pro-2026-11-16.md)|Todo 우선순위·로그인 복원·모션·전체 프로 — 2026-11-16|
|[tds-analysis.md](tds-analysis.md)|TDS 문서 확인 결과와 덕 적용 명세|
|[templates/new-app-ai-handoff.md](templates/new-app-ai-handoff.md)|새 앱 AI 인수인계 — 실제 작업 후 작성|
|[templates/new-app-project-contract.md](templates/new-app-project-contract.md)|새 앱 프로젝트 계약 — 복사하여 작성|
|[test-deployment.md](test-deployment.md)|무료 테스트 서버 열기|
|[testflight-automation.md](testflight-automation.md)|iPhone 테스트 수동 빌드·자동 제출|
|[things-source-repair-2026-11-15.md](things-source-repair-2026-11-15.md)|Things형 할 일·원본 저장·연결 오류 수정|
|[things-source-repair-qa-2026-11-15.md](things-source-repair-qa-2026-11-15.md)|Things형 Todo·원본 저장 검수|
|[todo-build-status-2026-11-16.md](todo-build-status-2026-11-16.md)|Todo·원가 제한 빌드 실행 기록 — 2026-11-16|
|[todo-organization-budget-2026-11-16.md](todo-organization-budget-2026-11-16.md)|날짜별·출처별 Todo와 비용 제한 — 2026-11-16|
|[todo-project-research-2026-11-16.md](todo-project-research-2026-11-16.md)|Todo 프로젝트 구성 제안 — 2026-11-16|
|[tooling-and-documentation.md](tooling-and-documentation.md)|덕 문서 도구와 디자인·기획·개발 스킬|
|[unified-site-2026-11-16.md](unified-site-2026-11-16.md)|소개·요금제·덕 웹 통합 — 2026-11-16|
|[ux-ui-audit-2026-11-12.md](ux-ui-audit-2026-11-12.md)|덕 UX/UI 점검 — 2026-11-12|
|[ux-ui-fixes-2026-11-12.md](ux-ui-fixes-2026-11-12.md)|덕 UX/UI 문제 수정과 기능 검증 — 2026-11-12|
|[web-complete-2026-11-22.md](web-complete-2026-11-22.md)|실제 덕 웹앱 기능 연결 — 2026-11-22|
|[web-format-correction-2026-11-22.md](web-format-correction-2026-11-22.md)|웹사이트 상단 포맷으로 실제 웹앱 수정|
|[workspace-studio-evaluation.md](workspace-studio-evaluation.md)|Google Workspace Studio — 덕 도입 검토|

구조화 모듈 목록: [app-foundation-modules.json](app-foundation-modules.json). 중첩 templates 폴더의 양식도 위 목록과 문서ZIP에 포함한다.

## 생성물과 문서 밖의 증거

- [notion-handoff.md](notion-handoff.md): scripts/build-handoff.py 생성. 원본만 수정하고 다시 만든다.
- 루트 AGENTS.md·website/AGENTS.md: 작업 지침. 이력의 오래된 정책은 최신 통합 입구가 정정한다.
- artifacts/: 합성 화면/기하 fixture·QA결과. 실제 사용자 캡처/native 증거 여부를 분리한다.
- docs/asset-manifest.json: 생성 이미지 목록/크기/SHA-256.
- deliverables/: Notion importZIP·오프라인HTML. 파일 존재는 Notion실제저장/웹배포 완료가 아니다.
- public/project.html: 생성 기술문서. 새 docen.today에서는 미오픈제한, 기존 테스트host와구분한다.
- test/·mobile/e2e/·website/tests/: 실제 검증 절차. 문서의 과거 통과 숫자를 현재 실행결과로 사용하지 않는다.
- 사용자가 예전에 올린 외부 동영상은 경로/현재 파일 존재를 재확인한다. 이 목록이 영상원본 전체를 보관했다는 뜻은 아니다.

## 목록 재생성

새 문서를 추가하면 이 목록에도 보충한다. 모든 문서를 하나의 상태로 합치지 말고 현재계약/과거이력/검증/제안/보류를 구분한다.

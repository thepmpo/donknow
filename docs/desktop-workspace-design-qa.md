> 후속 검수: [전체 웹 연결](web-complete-2026-11-22.md). 실제 로컬 서버 저장·설정·파일·내보내기와 웹 OAuth 팝업 경로, 기존 예약/Calendar/공유 기하 회귀가 통과했다. 실계정 OAuth·실제 모델 응답/실기기 확인은 별개다.

# PC 웹 시각·동작 QA

final result: passed (targeted desktop implementation, local headless Chromium)

시각 기준은 사용자가 선택한 기존 소개 상단 나의 하루 제품 예시다. artifacts/duck-beta-annual-2026-11-19/desktop-hero.png를 직접 열었고 실제 구현의 desktop-briefing.png/desktop-todos.png/desktop-dark.png를 열어 비교했다. 기준의 페이지 전체를 복제하는 요청이 아니라 그 안 제품 프레임을 실제 앱에 적용하는 범위다. 예시의 자료와 실제 계정의 자료는 다르다.

상단54px/왼쪽171px/오른쪽245px/중앙30px 여백·얇은 테두리·16px 모서리와 기존 오리 이미지를 옮겼다. PC 전체 작업공간으로 확장하므로 기준 소개 페이지의 바깥 홍보 제목/CTA/설명은 포함하지 않는다. 실제 브리핑의 소제목/시각/원본 링크와 기존 확인 흐름을 유지한다. 체크박스가 본문 중간으로 내려가던 정렬과 회색 중첩 카드를 수정했고 Todo/캘린더 동작을 기본으로 노출했다. 시스템 dark에서도 semantic 색상으로 표시한다.

production browser 흐름은 results.json에 있다. 모든 변경 컨트롤은 기존 저장/원본 확인 경로를 사용한다. 1100~1920 페이지 가로 넘침0, 작은 웹390px 하단5탭, 작성 초안 유지와 빈 상태/401을 확인했다. 실계정/모델 응답·iPhone 실제 기기/VoiceOver·공유 브라우저 패널 열림은 검수하지 않았다. 기존 예약/Duo 전체 회귀의 별도 중단 사항은 구현 문서에 남겼다. 본 결과를 전체 제품/native 검수 통과로 해석하지 않는다.

후속: 실제 긴 브리핑과 대량 Todo에서 정보 밀도, 일정 뷰와 오른쪽 요약 중복, 태블릿의 중간 크기 구성을 사용자와 검토한다.

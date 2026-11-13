# duckduck 소개 사이트 — 원본 확보 단계

final result: blocked

## Source visual truth

요청 URL https://pickle.com/ko . 사용자 요청은 ‘디자인 똑같이, 내용만 덕으로’이며 임의의 새 스타일 제안이 아니다. 새 사이트는 기존 앱과 분리된 website 프로젝트로 준비한다. 현재 디렉터리는 이 QA 기록뿐이며 앱/사이트 scaffold·서버·배포를 만들지 않았다.

외부 브라우저 조사 실행 https://agent.tinyfish.ai/runs/bc11f729-004b-4416-bc8c-01677627ca7a 는18단계/150초 뒤 실제 한국어 홈페이지·다운로드 모달·FAQ·아래 섹션이 열렸다고 보고했다. 그러나 이미지/다운로드 가능한 캡처와 실제 computed-style 값이 반환되지 않았다. 이 문서 작성자는 원본 screenshot을 직접 열어 대조하지 못했다. 해당 브라우저의 설명만으로 시각 검수 통과를 주장하지 않는다.

일반 공개 fetch의 /ko, www/ko, query URL은 Something went wrong / Reload 화면을 반환했다. 로컬 Playwright의 proxy/기본 경로는 모두 ERR_TUNNEL_CONNECTION_FAILED, 상속 proxy의 curl은 CONNECT tunnel failed, response403이다. 최신 environment_status의 관측은 current/enforced/restricted이고 pickle.com과 이미지 CDN이 허용 목록에 없다. 네트워크 제한을 우회하거나 TLS 검증을 끄지 않는다.

## Missing evidence

- Desktop1440×1000, mobile390×844 전체 스크롤과 헤더/hero/소개/기능/하단/다운로드/FAQ의 실제 이미지.
- font family/weight/size/line height, layout spacing, colors, exact media files/crops and responsive states.
- Implementation capture: 없음. 원본 확보 전 frontend를 만들거나 같은 디자인이라고 가정하지 않았다.
- Full-view/focused side-by-side comparisons: 원본 이미지와 구현 이미지가 없어 미실행.

## Acceptance gate

Product Design url-to-code의 ‘Capture source evidence first’와 design-qa의 source/rendered artifact 비교가 필수다. 이미지가 없는데 prose·추측 CSS만으로 clone을 완성하지 않는다. 원본이 확보되면 prototype template 초기화 → 덕 자산/정확한 제품 문구 → PC/모바일 메뉴/CTA/FAQ → 나란히 시각 대조 → 이 문서의 검수 이력을 갱신한다.

피클 로고/캐릭터/보안 기술·예약/통화·결제 기능·QR·스토어 주소를 덕의 것으로 복사하지 않는다. 덕은 기존 오리 자산, 실제 Calendar/Todo/AI/명시 확인 흐름과 현재 출시 상태를 사용한다.

# PC 소개 메인 배경 영상 — 2026-11-23

사용자는 두 시안 중 첫 번째(중앙 문구 + 오른쪽 은은한 로고)를 선택했다. 움직이는지 확인 후 실제 사이트 반영을 요청했다. 정지 시안을 배포했다고 답하지 않는다. 기존 로딩용 영상 제한에 대한 사용자 명시 예외로, 소개 hero에서도 원본 영상을 사용한다.

## 구현

website/src/App.jsx HeroBounce: 장식용 aria-hidden/pointer-events none, 첨부 docen-loading.mp4 재사용. 1100px 이상과 prefers-reduced-motion no-preference에서만 video를 mount한다. autoplay muted loop playsInline. video preload metadata, 원본 약354KB 그대로 재사용하며 다른 영상을 만들지 않았다. 재생 거부/error는 정지 docen-logo.png로 fallback. matchMedia 변경 시 video 제거/재생; IntersectionObserver와 visibilitychange로 화면 밖/백그라운드 정지. 본문 렌더링/로그인/자료 호출과 무관하며 대기시간을 만들지 않는다.

styles.css: hero position relative/isolation isolate, 배경은 z-index -1. 720px 정사각형, top -90px, right calc(50% - 50vw - 100px), opacity .42. 좌측 가독성과 하단 경계 완화를 위해 마스크 두 개를 intersect. 문구/헤더/데모 위치는 기존 그대로. main overflow-x clip으로 화면 밖 장식만 잘라낸다. 모바일/태블릿1099px 이하 display none, video 요청 없음.

## 검증

npm --prefix website run build 및 node website/tests/hero-bounce.mjs 통과. 실제 Chromium에서 currentTime 증가·muted/loop/inline·중앙 정렬·사용법 링크·스크롤 밖 pause/resume·동작 줄이기 정지·error fallback·320/390/768/1099/1100/1440/1920px 가로 넘침 없음·pageerror 없음 확인. node website/tests/public-launch.mjs 통과: 소개만 공개/내부 가입 차단 유지. 해당 browser는 로컬 Chromium Playwright이며 공유 클라우드 브라우저 조작으로 보고하지 않는다.

시안/구현/비교 이미지 및 결과: artifacts/docen-hero-bounce-2026-11-23/. 원본 시안은 selected-reference.jpg로 보관. 초기 구현에서 영상 하단 네모 경계 P2 발견, top -90px와 하단 fade 후 재촬영하여 해결. root design-qa.md 참조. 시안의 데모 날짜 변경은 이미지 생성 예시이며 이번 실제 제품 데이터/예시 날짜를 바꾸는 범위가 아니다. 실제 프레임은 반복 영상 시간에 따라 공 위치가 달라진다.

앱·모바일·native 빌드·가격·메일·키·외부 연결·오픈 guard는 변경하지 않는다. 배포 상태는 별도 영수증을 따른다.

# 모바일 소개 페이지 메인 공 튀기기

## 대상과 정정

사용자가 앞선 async질문에 모바일 소개 페이지(docen.today)라고 답했다. 앱에 추가한 첫 화면 장식을 제거하겠다는 답변에는 ‘아냐’라고 정정했고, 최종적으로 앱 첫 화면 작업도 일단 그대로 두고 모바일 웹을 작업하라고 확정했다. 따라서 이전 앱 로딩/docen.ai/논듀오주간일간/듀오길게누르기제거/앱장식 모션은 유지한다. 사용자 ‘그것도 빌드 올려봐 봐볼게’에 따라 모바일웹 공개배포와 앱native빌드 실행을 각각 구분한다.

## 구현

website/src/App.jsx HeroBounce의 min-width1100 매체 조건만 제거했다. 모든 화면에서 원본 mp4를 muted/loop/playsInline 재생하며 browser reduced-motion에서는 영상 대신 정지로고. 재생거부/error fallback, document.hidden/IntersectionObserver pause/resume 로직은 유지한다. 새 배경/로고를 생성하지 않고 기존 제공영상을 재사용한다.

styles.css: PC1100px이상 기존720px/opacity.42/중앙문구 구성을 유지. 601~1099px는480px 정사각형, top-20px/right-150px/opacity.3. 600px이하380px/top0/right-150px/opacity.3. 왼쪽 fade와 하단 fade 두 마스크를 intersect하여 문구뒤 배경·아랫경계를 부드럽게 처리한다. z-index-1, pointer-events none. main overflow-x clip으로 화면밖장식만 자른다. 제목/카피/버튼/데모 위치를 바꾸지 않는다. 모바일header/메뉴/법적사업자정보/소개only guard/가격은 유지한다.

## 검증

기존 hero-bounce.mjs의 모바일숨김 계약을 새요청에 맞춰 갱신했다. 320/390/430/768/1099/1440px 별 fresh browser page에서 실제video currentTime증가, muted/loop/inline, 가로넘침없음, 사용법anchor, 화면밖pause/복귀play, reduced-motion 정지, errorfallback, JS pageerror없음을 확인했다.390/1440의KO/EN스크린샷 artifacts/docen-mobile-web-hero/.390한국어실제캡처를직접확인했다. 테스트의mobile viewport844px높이, desktop1024px. 사이트 server build와 static build 모두 검사한다.

## 배포와 확인 경계

기존무료static srv-dc1qt4uc6qcc73bjpffg 및 Docker srv-dbgpc0ff3r2c73abc7e0 모두 autoDeploy=no 확인후 각각배포한다. 도메인 매핑을 자동 이동하거나 결제플랜을 바꾸지 않는다. 기본URL/actualdocen.today 확인과 iPhone/TestFlight 빌드 상태는 별도 영수증으로 기록한다. Render Docker 배포가 nativeIPA를 생성하는 것은 아니다. 앱 코드는 유지하지만 설치앱이 갱신됐다고 주장하지 않는다.

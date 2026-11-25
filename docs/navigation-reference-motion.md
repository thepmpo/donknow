# 2026-11-25 — 참고 영상 내비게이션 모션 및 웹 로고 정렬

## 요청과 범위
사용자 제공 8.4초 GitHub iPhone 화면 녹화의 내비게이션 동작을 참고해 Docen 모바일의 어색한 이동을 개선한다. 뒤이어 웹에서 로고 그림이 서비스명보다 낮아 보이는 현상을 모든 공통 표시에 수정하도록 요청했다. 참조 앱의 기능/색/탭 개수를 복제하지 않고 Docen의 기존 다섯 탭·날짜 버튼·모달 차단·기기별 제스처를 보존한다.

## 관찰과 최종 동작
1. 참고 영상은 터치 중 선택 렌즈가 넓어지고 아이콘이 약간 확대되며 손가락을 따라간다. 기존 Docen은 이동을 고정 시간 timing으로 처리하고 터치 확대가 1.025에 그쳐 움직임과 반응이 약했다.
2. 선택 렌즈 위치는 stiffness 420/damping 32/mass 0.65의 spring으로 이동한다. 연속 목적지 변경 때 이전 속도를 상속하고 overshootClamping으로 경계 밖 튐을 억제한다.
3. 누르는 동안 렌즈 1.09배(85ms), 아이콘 1.12배(spring 500/34/0.65). 해제 시 렌즈 180ms로 원래 크기로 돌아온다. 읽지 않은 배지는 확대 wrapper 밖 원래 위치를 유지한다.
4. 드래그 중 실제 화면을 연속 전환하지 않는다. 손가락 아래 선택만 미리 보여주고 유효한 탭 위에서 놓으면 한 번 선택한다. 바 밖 취소/앱 비활성화/모달 차단 시 원래 선택으로 복귀한다.
5. 모든 탭이 들어가는 바는 ScrollView responder가 스크럽을 빼앗지 않게 한다. 실제 overflow 상태는 기존 스크롤을 유지하며 스크럽은 하지 않는다. 글자 선택도 막는다.
6. RN Web은 드래그 취소 뒤 짧은 터치에서 click을 생략하는 경우가 실제 테스트에서 발견됐다. 웹에서만 단일 손가락 이동 8px 이하 touch end를 선택으로 처리하고 뒤따르는 click은 300ms 안에 중복 실행하지 않는다. 새 터치는 중복 방지 상태를 초기화한다. native/키보드/접근성은 Pressable의 기존 선택을 사용한다.
7. 동작 줄이기 설정에서는 렌즈/아이콘 확대와 이동 모션을 생략한다. native glass 지원 여부에 따른 기존 NavigationGlass 및 blur/불투명 fallback은 그대로다.

## 웹 로고 정렬
원본 정사각 로고의 그림 상단 여백 때문에 flex 중앙 정렬이어도 실제 그림이 아래로 보였다. 크기를 줄이거나 글자를 옮기지 않고 그림을 자기 높이의 8% 위로 옮겼다. 홈페이지 .duck-mark(헤더/푸터/데모), 공통 .docen-logo(로그인/어드민/안내 페이지), RN Web BrandMark 기본 이미지에 적용한다. 투명 내비게이션 아이콘·native 이미지·메인 영상은 이번 웹 정렬 대상에서 제외한다.

## 변경 파일
- mobile/src/AppNavigation.tsx: 선택 렌즈/아이콘 반응, 터치 중단/중복 방지, overflow responder.
- mobile/src/theme.ts: 공통 모션 상수.
- mobile/src/BrandMark.tsx: 웹 기본 로고의 시각 정렬.
- website/src/styles.css 및 public/assets/brand/brand.css, website/public-site/assets/brand/brand.css: 양쪽 배포 경로의 로고 정렬.
- mobile/e2e/fixtures/navigation-motion.tsx 및 mobile/e2e/navigation-motion.mjs: 실제 공유 컴포넌트를 터치 입력으로 검사하는 독립 fixture.
- website/tests/brand-polish.mjs: 로고 translateY 검사, 캡처 출력 폴더 분리.
- website/tests/legal-business.mjs: 캡처 출력 폴더 분리(과거 증거를 덮지 않기 위함).

## 검증과 재현
- `npm --prefix mobile run typecheck`: 통과.
- `EXPO_NO_TELEMETRY=1 CI=1 npm --prefix mobile run export:ios -- --max-workers 2`: Hermes iOS JS bundle export 통과(서명 IPA 빌드는 아님).
- `node --test mobile/src/navigation-geometry.test.ts mobile/src/duo-layout.test.ts`: 21개 통과.
- `node mobile/e2e/navigation-motion.mjs`: Duo 세로형/일반 가로형 터치 확대, 드래그 미리보기, release 한 번 실행, 취소 시 실행 없음, 연속 탭 각각 한 번 실행, 모달 차단, reduced-motion 통과. 실제 Chromium/CDP touch 사용.
- 홈페이지 production build + `BRAND_CAPTURE_DIR=artifacts/docen-logo-alignment node website/tests/brand-polish.mjs`: 320/360/361/375/390/600/900/1440px, KR/EN, 크기 유지/상향 정렬/파란 점/가로 넘침/어드민 로그인 gate 통과.
- 정적 build + `node website/tests/legal-business.mjs`: 원본 약관·푸터·링크 및 320/390/1440px 검사 통과. 변경된 footer 캡처만 새 증거 폴더로 보존했다.
- 캡처: artifacts/navigation-reference-motion 및 artifacts/docen-logo-alignment. 참조 영상 전체에는 개인 수신함 정보가 있어 공개 저장하지 않고 내비게이션 부분만 reference-nav-frames.jpg로 보관한다.

## 실제 확인의 한계
브라우저 fixture는 실제 공유 RN Web 코드를 실행하지만 iPhone의 native optical Liquid Glass 렌더러나 실제 손가락 체감을 대신하지 않는다. 설치된 iPhone 앱에는 새 native 빌드/설치가 필요하다. iOS JS export 성공은 App Store/TestFlight 빌드 제출 성공을 의미하지 않는다. 기존 로그인/공개 제한/가격/사업자 및 약관 문구/Bundle ID/키/사용자 데이터를 변경하지 않는다.

배포 결과는 아래에 별도 기록한다.

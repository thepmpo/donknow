# 앱 로딩·새로고침·채팅 이름·기기별 캘린더 전환

## 사용자 요청과 해석

앱 첫 로딩/작업 로딩/당겨서 새로고침을 ‘공 튀는’ 모션으로 통일, 채팅 이름은 기존 docen. 뒤에 ai만 붙여 docen.ai로 표시. 논 듀오에서는 길게 누를 때 주간에서 끝나지 않고 일간을 오갈 것. 추가 정정으로 듀오에는 이 길게 누르기가 필요 없으며 보기버튼만 유지한다. 추가 ‘모바일에도 웹처럼 메인 공 튀는 모션’은 모바일 소개웹/앱 첫 화면 중 어느 것인지 async 질문했다. 독립 작업을 진행하는 동안 답변이 없어 앱 작업의 연속으로 우선 앱 시작/빈 채팅 화면에 적용한다고 알렸다. docen.today 모바일 소개 화면은 이번 범위에서 바꾸지 않았다.

## 흰 배경 없는 로딩

원래 H264 mp4는 흰 배경이 실제 픽셀에 포함돼 있어 단순 wrapper transparent로 없앨 수 없다. 밝은 공까지 사라질 수 있는 흰색 chroma key를 쓰지 않았다. image_gen에 실제 사용자 logo-cutout 참조를 전달해 받침만/공만 두 투명 PNG를 만들었다. 원본 generated이미지 exec-4294212d-cabb-4182-a196-cf2698604709 및 exec-ec250b23-e50e-41af-90d9-6174486d682c를 각각 docen-loading-base.png/docen-loading-ball.png로 그대로 저장했다. 외곽 RGBA alpha0~255를 확인했다. 원본 로고/영상은 보존하고 홈페이지 hero video는 유지한다.

BrandBounce.tsx는 고정 받침 Image 위에 Animated.Image 공을 올린다. 크기는 전체size의36%, left32%, top7%; translateY는 size의+10%에서-6%로 반복 이동한다. 올라가기/내려가기 각430ms, out/in cubic, native에서는useNativeDriver 사용. container는 투명, 흰 배경 사각형/clip border가 없다. 렌더링 가능한 이미지로 움직이는 모션이며 첨부 mp4 자체의 프레임을 재생한다고 주장하지 않는다.

BrandLoading(native/web)은 같은 BrandBounce를 re-export. 실제busy에서만 progressbar/busy로 표시한다. BrandMotion은 비서 시작 화면의 장식 모션으로 image역할이며busy상태를 만들지 않는다. ConnectionScreen/DuckScreen/AssistantChat 빈 상태에88px, 숨긴 채팅 화면에서는 active=false로 움직임을 멈춘다. AppState백그라운드에서도 중지, image실패/reduced-motion은 투명 cutout 정지로고로 fallback. 가짜로딩 시간을 추가하지 않는다.

앱이 JS를 실행하기 전 운영체제의 launch screen은 애니메이션을 지원하지 않아 app.json splash에 cutout과 light:white/dark:black 배경을 적용했다. 실제 app 초기저장복원/로그인복원부터는 BrandLoading 공 모션이다. 설치앱 적용에는 native빌드가 필요하다.

## 당겨서 새로고침과 공통 작업 표시

ui.tsx Page는 기존 RefreshControl의 onRefresh/refreshing/enabled를 보존하고 native tint/colors/progressBackground만 투명하게 clone한다. native pull 동작/요청은 유지한다. offset<-28pt 또는 controlled refreshing일 때만 상단48px BrandLoading을 overlay로 표시한다. 새로고침이 끝나면 사라진다. ScrollArea는 refreshControl이 있을 때 빈/짧은 목록도 스크롤·bounce하도록 허용하되 scrollEnabled=false/드래그잠금은 유지한다. 중복 요청 gesture를 새로 만들지 않는다.

Button, AssistantChecklist, ConnectionScreen 연결 대기, AppleRemindersScreen 작업의 기존 ActivityIndicator도28px BrandLoading으로 바꿨다. 확인된 JSX ActivityIndicator 잔여는 없다. Todo/Log의 기존 Page refreshControl도 공통 경로를 사용한다. native 실제 pull-release 물리 동작은 iPhone 설치 후 추가 확인 대상이며 이번 브라우저 검사는 controlled refreshing 시작/종료를 검증했다.

## 채팅 이름

BrandWordmark ai옵션을 추가: docen + 기존 #2366e8 파란 점 + ai. ScreenHeading docen 제목·하단 비서 nav라벨·기본 비서 메시지/작업보고에만 ai=true. ConnectionScreen의 서비스 워드마크, 앱 이름/BundleID/계정/DB/OAuth/법적 문구/홈페이지는 유지. 사용자 지정 비서 이름은 원래 값 유지. 저장된 대화와 이름을 일괄 수정하지 않는다.

## 캘린더

CalendarNavigationRequest action=cycle 추가. nextLongPressCalendarView는 month→fortnight(주간), fortnight→day, day→fortnight. root longPressCalendar가 고정 fortnight 대신cycle 요청. Duo에서는 AppNavigation에 onCalendarLongPress를 전달하지 않아 제스처가 보기 전환을 하지 않는다. 캘린더 nav의 오늘 복귀와 화면의 보기 전환 버튼은 유지. 전환 시 기존 애니메이션/스크롤 정리/기기·계정scope 검사도 유지한다. 접근성 hint도 논Duo길게주간/일간·Duo오늘복귀로 구분한다. 실제 압력 감지 전용 API를 새로 추가하지 않았으며 기존500ms길게누르기 동작을 수정했다.

## 검증

mobile typecheck, iOS JS export, web export 통과(서명 IPA 빌드와 다름). calendar-model/duo-layout/navigation-geometry29개 테스트 통과. mobile/e2e/loading-ai.mjs는 실제 공유 CalendarScreen/AppNavigation/Page/BrandLoading을 Expo fixture로 번들해 Chromium에서 공 transform변화·투명container·docen.ai·refresh controlled 표시 시작/종료·논Duo650ms길게누르기3회로주간/일간/주간·reducedmotion시공움직임제거·pageerror없음을 확인했다. BrandMotion은aria-busy없음도 확인. 증거 artifacts/docen-loading-ai/. 화면은 합성 입력의 web-rendered native components이며 iPhone실기기 실행으로 보고하지 않는다.

mobile/e2e/calendar-navigation-brand.mjs에는 Duo캘린더700ms길게누른전후viewlabel불변 검사를 추가해통과했다. tall reserved media영역·date nav·compact heading·viewcycle 회귀도통과. 새증거 artifacts/docen-duo-no-longpress/로 보존하여 이전승인샷은 덮지 않는다. assets PNG는 PIL로 alpha검사만 했으며 이미지편집은image_gen으로 수행했다.

## 전달 경계

소스/검사/GitHub 반영이며 기존 설치 iPhone이 자동 갱신됐다고 주장하지 않는다. 이전 GitHub dispatch Forbidden으로 native빌드 미시작인 상태는 그대로다. user가 build를 요청하면 당시 연결상태를 확인한다. 사이트/API/가격/메일/PG/로그인 권한/사용자 자료는 변경하지 않는다. Mobile introduction hero는 위 대상 질문의 응답 전에는 바꾸지 않은 상태다.

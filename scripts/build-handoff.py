"""Build a single-page Notion import with every repository image. No credentials/DB files are read."""
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import base64, hashlib, html, json, re, subprocess, zipfile

ROOT = Path(__file__).resolve().parents[1]
subprocess.run(['python3', str(ROOT/'scripts/build-design-guide.py')], check=True)
OUT = ROOT / 'deliverables'
OUT.mkdir(exist_ok=True)
CODE = subprocess.check_output(['git', 'log', '-1', '--format=%H', '--', 'server.js', 'server', 'mobile', 'Dockerfile', 'public/project-comments.js', 'public/project-comments.css'], cwd=ROOT, text=True).strip()
DATE = datetime.now(ZoneInfo('Asia/Seoul')).strftime('%Y-%m-%d')
REPO = 'https://github.com/thepmpo/donknow'
# Proposal images can be committed without changing app code. Pin their own tree
# so a new visual never becomes a 404 under an older code-only snapshot.
ASSET_COMMIT = subprocess.check_output(['git', 'log', '-1', '--format=%H', '--', 'artifacts', 'mobile/assets'], cwd=ROOT, text=True).strip() or CODE
RAW = f'https://raw.githubusercontent.com/thepmpo/donknow/{ASSET_COMMIT}/'
images = sorted(p for folder in ('artifacts', 'mobile/assets') for p in (ROOT/folder).rglob('*') if p.suffix.lower() in {'.png','.jpg','.jpeg','.gif','.webp','.svg','.ico'})
priority = ['artifacts/mobile-todos.png','artifacts/mobile-calendar.png','artifacts/mobile-duckduck.png','artifacts/mobile-log.png','artifacts/mobile-profile.png']
images.sort(key=lambda p: (0, priority.index(p.relative_to(ROOT).as_posix())) if p.relative_to(ROOT).as_posix() in priority else (1 if p.name.startswith('mobile-') else 2, p.as_posix()))
manifest = []
for path in images:
    relative = path.relative_to(ROOT).as_posix()
    category = '상세·편집·덕 알림·화면 전환/스크롤바 · 실제 Expo·합성 API·Duo 기하 · native/실계정 아님' if 'calendar-event-review-2026-11-14' in relative else '연간 보기·줌·OFF복원/시안(합성제안) · 실제 Expo/합성API·Duo기하 fixture · native/실계정 아님' if 'calendar-year-2026-11-14' in relative else '캘린더 단축·년월 변경전 비교 · 실제 Expo/합성API·Duo기하 fixture · native/실계정 아님' if 'calendar-navigation-2026-11-14' in relative else '캘린더 viewport·캐시·일반폰 버튼 · 실제 Expo/합성API·Duo기하 fixture · native/실계정 아님' if 'calendar-viewport-2026-11-13' in relative else '캘린더 정리·14일·시트·연동 · 실제 Expo/합성API·Duo 기하 fixture · native/실계정 아님' if 'calendar-refinement-2026-11-13' in relative else '덕 소개 웹 프로토타입 · 원본 비교용/합성 데이터 · native/실계정 아님' if 'duck-website-2026-11-13' in relative else 'Apple 참고 정정 전후 · 합성 데이터 Expo 웹/격리 API·Duo 기하 fixture · native/실계정 아님' if 'calendar-apple-reference-2026-11-13' in relative else '캘린더 개선 후 실제 Expo 웹·격리 API/Duo fixture · native/실계정 아님' if 'calendar-workspace-2026-11-13' in relative else '캘린더 UX 감사 · 실제 앱 웹/격리 API · native/실기기 아님' if 'calendar-audit-2026-11-13' in relative else '상태별 내비게이션·일반 iPhone·Duo 웹 fixture · native/실기기 아님' if 'navigation-interaction-2026-11-13' in relative else '사용자 승인 위치 확인 시안 · 실기기 아님' if path.name=='approved-wireframe.png' else '파란 선택 표시 수정 후 웹 fallback · native/실기기 아님' if 'duo-glass-selection-fix-2026-11-13' in relative else '승인 구분선 실제 앱 웹 fixture · native/실기기 아님' if 'duo-divider-implemented-2026-11-13' in relative else 'AI 생성 구분선 추천 원본 · 이후 승인/구현' if 'duo-divider-proposal-2026-11-13' in relative else '내비게이션 확대·Glass 웹 대체 재질 fixture · native 아님' if 'duo-liquid-glass-2026-11-13' in relative else '카메라 열·분할 화면 격리 웹 fixture · 실기기 아님' if 'duo-camera-column-2026-11-13' in relative else '앱 초기 리소스·최종 브랜딩 미확정' if relative.startswith('mobile/assets/') else '체험 데이터 메모/시트 검증' if 'notes-fixture' in path.stem else '체험 데이터 8개 목록 밀도 검증' if 'density-fixture' in path.stem else '모의 응답 테스트 화면' if 'fixture' in path.stem else '네이티브 기반 웹의 격리 테스트 화면' if path.name.startswith('mobile-') else '단계별 개요 또는 초기 웹 프로토타입'
    manifest.append({'path':relative, 'category':category, 'bytes':path.stat().st_size, 'sha256':hashlib.sha256(path.read_bytes()).hexdigest(), 'import_path':'images/'+relative.replace('/','__')})
(ROOT/'docs/asset-manifest.json').write_text(json.dumps({'generatedAt':DATE,'codeCommit':CODE,'assetCommit':ASSET_COMMIT,'imageCount':len(manifest),'images':manifest},ensure_ascii=False,indent=2)+'\n')
body = r'''# duckduck — 제품·구현·운영·이미지·AI 인계 문서

> 기준: {{DATE}} · 한국 시간 · 기능 코드 {{SHORT}} · 문서와 GitHub 소스가 이어받기의 기준입니다.
> 이 파일은 저장소의 기술 인계 원본입니다. 사용자용 업무 기록은 선택한 개인 Notion의 **duckduck · 제품·개발 기록**에 남깁니다. 비공개 Notion 페이지를 이 공개 파일에 복제하지 않습니다. 아래 상태 표에서 구현/자동 테스트/실사용 확인을 구분합니다.

## 1. 이 프로젝트가 하려는 일

### 가장 먼저 읽을 현재 기준 — 2026-11-14

#### 2026-11-14 — 상세·편집·덕 알림·공통 모션 최신 정정

[현재 구현 계약](https://github.com/thepmpo/donknow/blob/main/docs/calendar-events-motion-2026-11-14.md) · [실제 QA](https://github.com/thepmpo/donknow/blob/main/docs/calendar-events-motion-qa-2026-11-14.md). 일반 iPhone/Duo 각각 승인했다. 월간의 빈 하단은 각 주에 균등 분배, Duo는 native안전하단 중 하드웨어 없는 빈 strip만 Calendar에 확장한다. 반대pane·카메라열 오늘→2주→5탭은 유지한다. 상세의 강제높이/빈편집행과 긴계정명라벨깨짐을 없앴다. 공통화면은.96→1/420ms,기존연간은실측matchedzoom이다. 본문/시트의각우측스크롤바는1초유지→240msfade,동작줄이기1000ms후즉시숨김이며월grid에는없다. 이전연간숨김/상세96%고정은이범위에서대체한다.

변경한공통항목만Google에ETag/명시확인으로PATCH,원본반복·참석자·첨부/알림은보존한다. 덕전용메모·URL·첨부링크·앱알림은calendarDetails:1의계정별암호화저장으로분리한다. Google성공후덕실패는덕만재시도하고원본쓰기를반복하지않는다. 읽기전용원본도덕전용필드는저장한다. Todo+일정합쳐가까운60개기기알림이며원본변경은앱동기화후반영한다. 실제iPhone수신/실계정은별도다.

**실제최신native는 사용자실행43536270733·f008503의1.0.0(28)**,서명IPA00:52:04UTC/Apple업로드00:52:32UTC성공이다. 연간/viewport/탭단축은28에포함된다. **이번추가개선은28이후이며새앱빌드/설치가필요하다. 이번작업에서native빌드를자동실행하지않는다.** 기존인증/데이터/서명·무료Render/수동빌드·복구bundle/사무실·website보류를유지한다. 아래27최신/빌드접수실패는그당시이력이다.

#### 최신 연간 달력 — 월 확대 전환·기능만 되돌리기

[연간 구현/수치/기기별 범위/개별 롤백](https://github.com/thepmpo/donknow/blob/main/docs/calendar-year-overview-2026-11-14.md) · [실제 QA](https://github.com/thepmpo/donknow/blob/main/docs/calendar-year-qa-2026-11-14.md). 사용자가 첫 시안인 연간 달력형과 일반폰전체/Duo선택pane 전환을 승인했다. 년월→12개월→월직접선택·실측균일줌420ms·줄인모션/좌표없음120ms페이드,더보기분리다. 반대pane·카메라열Today→2주→5탭·기존탭단축/월/2주/캐시/데이터·인증은유지한다. 연간숫자는로컬계산하며12개월일정을미리조회하지않는다.

**yearOverview=false**로 연간/줌/새메뉴만 끄면 이전 선택창으로 돌아간다. OFF번들에서도복원/월이동/Today를검사했다. 설치된앱은되돌린코드로재빌드·업데이트해야하며서버즉시스위치가아니다. 앱삭제/로그아웃/데이터초기화는필요없다. 새native빌드를시작하지않았고27번앱에는이번기능이없다. 실제iPhone모션/VoiceOver/실계정은별도다. 아래년월미정은승인이전이력이다.

#### 최신 캘린더 조작 — 기기별 승인 구현, 년월 UI는 답변 대기

[현재 계약](https://github.com/thepmpo/donknow/blob/main/docs/calendar-navigation-2026-11-14.md) · [QA](https://github.com/thepmpo/donknow/blob/main/docs/calendar-navigation-qa-2026-11-14.md) · [영상/공식자료·년월비교](https://github.com/thepmpo/donknow/blob/main/docs/calendar-navigation-review-2026-11-14.md). 일반 iPhone은 캘린더로 들어갈 때마다 오늘, 길게누르면2주다. Duo는Today→보기→5탭배치를유지하고 재선택Today·길게2주,가로에서오른쪽Calendar우선/다른탭이면왼쪽고정Calendar를바꾸며오른쪽은유지한다. 상단/전용보기버튼도유지한다.500ms·손떼기중복0·pane/계정scope·열린시트무시·회전/접힘보존을검사했다.

문법47/단위253통과·실패0·기존1제외/타입·웹/iOS JS·일반폰·Duo·캐시·전체앱회귀가통과했다. **년월UI는이후연간달력형구현승인으로확정**,실기기진동/VoiceOver/실계정/nativeIPA는별도다. 이번단축과viewport/캐시는27이후수정으로새native빌드가필요하다. 새빌드는시작하지않았다. 용어선제설명/기기별질문기준을AGENTS/이어받기에기록했고개인영상/일정프레임은공개하지않는다. 아래모든질문대기/코드변경없음은승인답변전이력이다.

#### 최신 실제 빌드27 — 이번 화면/캐시 수정은 다음 빌드

[사용자 실행43494093136](https://github.com/thepmpo/donknow/actions/runs/43494093136)·a61740e의 validate/build-and-submit 모두success,실제1.0.0(27) IPA19:47:29 UTC/Apple업로드19:59:32 UTC 성공을 확인했다.27에는e2c853b의첫 정리가 있지만 **c4eebbd의이번 viewport/버튼 순서/캐시는 없다**. Apple 처리/설치/기기는별도다. 이번에 새native dispatch를 실행하지 않았다. 아래26과 권한 차단은 그때의 이력이다.

#### 가장 최신 캘린더 — 화면 채우기·오늘/보기 순서·일정 먼저 표시

[현재 계약](https://github.com/thepmpo/donknow/blob/main/docs/calendar-viewport-2026-11-13.md), [QA](https://github.com/thepmpo/donknow/blob/main/docs/calendar-viewport-qa-2026-11-13.md), [개인 Notion](https://app.notion.com/p/41718ee8299181389c27f3f68549c4d3). 월/2주가 실제 남은 높이를 채우고 위아래 스크롤·bounce/indicator는 없다. 추가24pt를 빼서 요일 줄을 Todo 날짜 줄과 맞추고 다섯 제목을 유지한다. 사용자 확인으로 카메라열은 **오늘 위·2주 보기 아래·기존5탭**이다. 일반폰2주는 제목옆 아이콘,Today는 년월메뉴다. 이전92pt/24pt/순서는 아래 이력으로 남긴다.

일정은 계정/서버/시간대별 실행 메모리12기간에서 먼저 보여주고 출처별 도착즉시 갱신한다. 기능확인5분·겹친기간 갱신·페이지 완료 후 삭제·실패보존·늦은 계정/기간 응답 폐기를 검증했다. 캐시는 완전 재시작/다른 기기까지 영구 유지된다는 뜻이 아니다. 실제 Expo/합성API·Duo기하 그림과 검증 JSON은 새 viewport 폴더에 보존했다. 기존 데이터/인증/서명·복구bundle·소개 사이트·사무실은 보존했다.

단위253통과/실패0/기존선택1제외·문법/타입·웹/iOS JS·화면 fit/캐시/Calendar/Duo/전체앱 검사를 통과했다. native IPA·실계정·기기 설치와 구분한다. 이전 빌드 요청은 플랫폼 인증 dispatch Forbidden으로 새 실행을 만들지 못했으며 **이번 수정은 새 native 빌드가 필요하다**. 자동 push/유료 빌드는 켜지 않는다.

#### 최신 캘린더 — 본문 정리·필요한 주·14일 확대·시트·연동

[현재 계약/수치/파일 지도](https://github.com/thepmpo/donknow/blob/main/docs/calendar-refinement-2026-11-13.md), [실제 QA](https://github.com/thepmpo/donknow/blob/main/docs/calendar-refinement-qa-2026-11-13.md), [개인 Notion 기록](https://app.notion.com/p/41718ee8299181389c27f3f68549c4d3). 코드e2c853b. Calendar 본문 도구/status를 년월 sheet로 이동하고24pt 여백, 해당 월 날짜가 있는 주만 표시(2026-11은11/1–12/5), red/blue 주말·옅은 인접월, Today 위 별도2주 보기와14일 두 줄 확대를 적용했다. 선택일/anchor를 분리해 두 번째 주 날짜 선택 때 창을 유지한다. 기존 카메라열/5탭·고정왼쪽/오른쪽 우선/회전 상태는 보존한다.

시트는360ms 입장/260ms퇴장·dim220ms,실측 pane 상단까지 같은 회색,본문/상단 배경 탭·Close/DuoBack/손잡이/Escape 닫기이며 내용/다른pane·busy/취소·reduced motion/초점을 보호한다. 정상 token회전과 계정변경을 구분하고,늦은 상태 응답·일시 네트워크 실패가 연결을 지우지 않게 했다. GET60초·native취소의안전읽기1회복구이며 OAuth/쓰기/확인은 반복하지 않는다. 비밀값·인증·DB·서명·복구bundle·소개 사이트는 보존했다.

전체254중253통과/실패0/기존선택1제외,타입·web/iOS JS·Calendar/실제모션/연동경쟁/Duo/전체앱/세션/격리웹로그인 검사를 통과했다. 새 그림은 Expo+합성API/기하fixture다. **사용자 실제계정/native기기 검수는 별도이며 TestFlight26에는 이번 수정이 없다. 이 작업에서 새 native빌드를 자동 실행하지 않았다.** 아래42일/본문도구/이전26 업로드 설명은 당시 이력이다.

#### 덕 소개 사이트 — 디자인·동작 프로토타입 구현/검증

[현재 계약·원본 수치](https://github.com/thepmpo/donknow/blob/main/docs/duck-website-brief-2026-11-13.md), [사이트 QA](https://github.com/thepmpo/donknow/blob/main/website/design-qa.md), [확인용 ZIP](https://raw.githubusercontent.com/thepmpo/donknow/93b311d4a8291b5f65b4eeb53955afce4953b99c/tools/duck-website/duck-website-preview.zip). 원본43423800908의 실제 PC/모바일 영상·화면·DOM/스타일을 직접 회수해93b311d에 별도 website를 만들었다. 반복 영상·스크롤 배경/footer reveal·기능 선택과 실제 덕 예시 영상4개·진행률·자동 전환·touch swipe·메뉴/KR·EN/QR/dialog/FAQ가 동작한다. PC/모바일 조작·나란히 시각 대조·320~1440 overflow·reduced motion·build/packaging 검사를 통과했다. 원본 영상과 검수 증거를 artifact 만료 이후에도 저장소에 보존했다.

원본 배경/장식은 비교용 참고 자산이며 공개 제품 출시 전 Duck용 교체/권한 확인이 필요하다. 기존 앱을 덮어쓰거나 새 소개 사이트를 공개 배포하지 않았다. 관리 환경 preview relay/화면 열기가 막혀 사용자 cloud panel 확인은 못했고 ZIP으로 확인할 수 있게 했다. Mac/Windows 직접 파일 열기·Safari 기기 확인은 별도다. 이 사이트의 디자인을 기존 iPhone 앱에 일괄 적용하지 않는다.

#### 최신 iPhone26 — native/서명·Apple 업로드 성공

사용자가 직접 시작한 [43408230557](https://github.com/thepmpo/donknow/actions/runs/43408230557)·2a7aa82의 validate/build-and-submit 모두success, 실제 **1.0.0(26)** 서명IPA19:27:56 KST·Apple 업로드19:28:25 KST 성공이다.083192e의 새 Calendar·시스템 외형·서버 응답 수정이 포함된다. Apple 처리 완료/TestFlight26 표시·설치·실기기/실계정 오류 해소는 별도다. 사이트 작업 중 추가 native 빌드는 실행하지 않았다. [로그·정확한 상태](https://github.com/thepmpo/donknow/blob/main/docs/testflight-automation.md). 아래25/권한 차단은 당시 이력이다.

#### 최신 캘린더 정정 — Apple 참고·시스템 밝게/어둡게

년·월은 **캘린더 본문 오른쪽 위**, 오늘은 **물리 카메라 열의 세로 탭 바로 위 별도 원형**, 시스템 밝게/어둡게로 확정했다. 큰 2단 도구 막대를 줄이고, 읽을 수 있는 월 달력·직접 일정 상세·인접 월 옅은 날짜·큰 제목/그룹 옵션·전체 semantic 외형을 적용했다.42일은 유지하고 작은 화면은 달력 내부 스크롤이다. [현재 계약·수치·코드·검수·실제 운영 한계](https://github.com/thepmpo/donknow/blob/main/docs/calendar-apple-reference-2026-11-13.md)를 먼저 읽는다. 이전 light 고정 규칙은 대체한다.

Calendar 조회 응답/시간 초과·잘못된JSON 한 번 복구·캐시 보존·서버 직렬화 헤더 순서를 보강했다. 실제 사용자 계정 오류 원인은 아직 독립 재현하지 못했다. 쓰기 자동 반복은 없고 데이터/인증·Duo 카메라 열·무료 플랜·원본bundle을 보존한다. **25번에는 없고 최신26번의 native/Apple 업로드 성공을 위에서 확인한다.** 아래25번은 이전 앱의 업로드 이력이다.

#### 이전 iPhone25 — 빌드·Apple 업로드 성공

추가 약관 동의 후 제가 연결된 GitHub로 [43394742649 attempt3](https://github.com/thepmpo/donknow/actions/runs/43394742649/attempts/3)의 실패job을 재실행했고, **1.0.0(25) 서명IPA 생성18:29:43 KST·Apple 업로드18:30:18 KST 성공**을 확인했다. validate/build-and-submit 모두success다. 해당 빌드의 앱/빌드 workflow는 당시main6161372와 동일한1643e0c임을 비교했다. 이번 캘린더/시스템 외형 수정은25번 이후다. 이전23/24의 필수약관 차단은 이번 제출에서 해제됐고 사용자 추가 Run workflow 없이 진행했다. **Apple 처리 중**이며 TestFlight25 등장·설치/기기 검수는 별도다. 사용자PC를 꺼도 되고 아이폰 TestFlight→duckduck→업데이트에서25를 확인한다. 안 보이면 처리를 기다리며 추가 빌드를 누르지 않는다. [실제 로그·재개/설치 안내](https://github.com/thepmpo/donknow/blob/main/docs/testflight-automation.md)를 따른다. 기존 데이터/인증/서명·무료플랜·원본bundle을 보존하고 공개 App Store 출시는 하지 않았다.

#### 캘린더 개선 전체 구현 · CA-01~20

사용자가 ‘지금 그거 전체 수정해’로 전체 개선 구현을 승인했다. [현재 구현 계약](https://github.com/thepmpo/donknow/blob/main/docs/calendar-workspace-2026-11-13.md)에 20개 항목·원본 파일·수치/상태·원본 쓰기 보호·실제 검사·실기기/Figma 남은 일을 기록했다. 월42칸·선택일/일정 상세·월/주/일/목록·시간표·일정 작성/수정·소스/검색·시간대와 상태 보존을 연결했다. regular Glass는 조작층에만 쓴다. Google 원본은 미리보기/확인·한 번 실행·역할/연결/ETag로 보호하고 결과 불확실은 재발송하지 않는다. Duo 카메라 열·분할·기존 데이터/인증·무료 플랜·수동 TestFlight를 보존했다. 새 캡처는 웹/격리 API이며 native/실계정/Apple 설치 완료를 뜻하지 않는다.

구현00bf57f는 전체241개 중240통과·실패0·기존선택1제외, 문법46·타입·웹/iOS JS·Calendar/전체 앱/로그인/모션/예약/채팅/오류/Duo 회귀를 통과했다. 새 웹/격리 캡처27개를 보존하고 운영 Google 쓰기0·불확실 재발송0이다. 새native빌드/실계정·Figma검수는 별도다.

#### 이전 캘린더 비교 감사 · 당시 제안 단계

[Apple Calendar·Fantastical·Apple HIG 비교 보고서](https://github.com/thepmpo/donknow/blob/main/docs/calendar-ux-audit-2026-11-13.md)에6흐름·새캡처16개·20개문제/기회와수용조건을정리했다. 주이동/탭복귀보존·월의실제높이/선택일상세·큰글자/44pt·조회실패/부분상태를먼저검토한다. HIG16항목중Glass는조작층에만적용하는방향이다. 이전 감사 당시에는 앱코드·권한·Duo확정배치를 변경하지 않았다. 이후 전체 구현 승인/현재 상태는 위 최신 절이 우선한다.16개이미지는실제앱웹fixture이고두네이티브앱/실기기검사와구분한다. 전문은18절에도포함한다.


[전체 이어받기 기준서](https://github.com/thepmpo/donknow/blob/main/docs/continuation-guide.md) → [Liquid Glass 구현 계약](https://github.com/thepmpo/donknow/blob/main/docs/liquid-glass-navigation.md) → [다른 서비스용 공통 원칙 v1.1](https://github.com/thepmpo/donknow/blob/main/docs/reusable-product-design-principles.md)을 먼저 읽는다. 세 문서 전문도18절에 포함한다. 과거 대화 없이 제품·기능·시각 토큰·상태 전이·예외·원본 파일·검사 명령·남은 기기 검수를 찾도록 정리했다. 아래 이전 날짜의 보류/미구현/빌드 설명을 최신 기준으로 다시 적용하지 않는다.

최신 사용자 승인으로 일반 iPhone은 평평한 하단 바에서 좌우12pt·bottom=max(safeInset,8pt)·radius32의 떠 있는 capsule로 변경한다. 바regular,선택idle중립/press1.08배·100ms/drag포인터추적/release250ms중앙·180ms복귀/cancel원래탭이며,듀오의카메라열·64/272/52/28·분할/상태는보존한다. 수치는덕구현값이다. 흰본문을가짜무늬로꾸미거나본문전체를Glass로바꾸지않는다.

실제1.0.0(21)은1f7dc5d의[43378603322](https://github.com/thepmpo/donknow/actions/runs/43378603322)에서무료Mac빌드·Apple업로드15:33:45 KST 성공,사용자가Glass외형을확인했다. 이번상태별터치/하단수정은21이후이며새native설치·기기광학효과/VoiceOver/실제Duo검수는별도다. 기존서명·데이터·인증·원본bundle·무료플랜·수동TestFlight정책을유지한다.


서비스 이름은 **duckduck**, 편하게 **덕**이라고 부릅니다. 처음에는 dot이라는 이름과 현재 ChatGPT 안에서 쓰는 dot의 느낌을 이야기했지만, 최종 이름을 duckduck으로 바꿨습니다. 기존 개인 설정을 복사하는 일이 아니라 대화에서 할 일을 정리하고 실행으로 이어주는 개인 비서를 만드는 일입니다.

목표는 iPhone 앱이고, Toss처럼 간결하고 읽기 쉬운 화면을 참고합니다. Google, Slack, Notion의 승인된 정보를 이용하고, 덕에서 정리한 내용을 Todo로 옮깁니다. 사용자가 정하지 않은 상세 화면은 작업하면서 함께 결정합니다.

**2026-11-04 요청으로 AI·Slack 구현 보류를 해제**했습니다. 연결한 자료→근거가 붙은 오늘 할 일 제안→Todo 카드→사용자 확인 후 실행 흐름을 추가했습니다. AI 분석은 서버 키·모델·활성화 설정이 있어야 하며, 외부 쓰기는 공급자 권한 재승인이 필요합니다. 사용자가 첫 실제 AI 인사 응답을 확인했습니다. 실제 업무 분석·새 쓰기·네이버 접속 성공은 별도 확인입니다. 최신 확인한 Apple 업로드는1.0.0(21)이며 이번 수정의 새 설치와 구분합니다. 실모델·실계정 쓰기는 별도입니다. 자세한 범위는 [비서 실행 안내](assistant-actions.md)를 읽습니다.

### 2026-11-13 실제 Glass 정정 — 파란 선택 View 제거

사용자 보고로 움직이는 선택 원은 일반 파란 View이고 바 배경만 Glass였음을 확인했다. 구현fdd555f에서 선택 표시에도 지원 iOS의 GlassView regular/isInteractive를 넣고 파란 채움·host 클리핑을 제거했다. 이동은 기존250ms 커스텀 모션이며 웹/이전OS는 중립 블러 대체, 투명도/동작 줄이기·고대비·위치/구분선/상태를 지킨다. 전체224통과/선택1개 제외·타입·웹/iOS JS·전체 앱/모션/Duo 검사를 통과했다. 실제43374883126의1.0.0(20)은 ExpoGlassEffect 모듈 포함/Apple 업로드15:04:13 KST 성공이지만 이 수정 전이다. 사용자는 아이폰 TestFlight 앱에서 본 현상이라고 답했고, 실제 설치 버전/OS/재질 모드 및 수정 후 화면은 새 무료 빌드/폰 검수가 필요하다. [원인·빌드20·수정/미확인 구분](https://github.com/thepmpo/donknow/blob/main/docs/navigation-glass-correction-2026-11-13.md)을 우선한다.

### 2026-11-13 승인·적용 — 펼친 Duo의 연한 좌우 구분선

사용자가 추천 이미지에 **“그렇게 해서 적용하자”**고 승인했다. 구현4d41361에서 펼친 가로 Duo의 실제 pane gutter 중앙에 기존 목록 색 **#E5E8EB**의 **StyleSheet.hairlineWidth** 선을 추가했다. 양 끝은16pt씩 띄우며 흰 배경·카메라 열 내비게이션·왼쪽 캘린더 고정/오른쪽 선택 화면을 유지한다. 이전 이미지 제안의 미승인/미구현 상태는 이 승인으로 해제한다.

선은 스크롤/탭 전환과 독립된 장식이고 터치를 가로채거나 접근성 조작 항목을 만들지 않는다. 세로·접힘·일반 iPhone·분할 비활성 상태에서는 숨긴다. 실제 활성 힌지/가림 영역이 중앙을 차지하면 선을 중복해 그리지 않는다. 화면50%나 기기 모델/폭으로 위치·기기를 추정하지 않고 기존 native-confirmed geometry를 사용한다. 확대 내비게이션·Glass·250ms 선택 이동·초안/월/스크롤·데이터/인증은 보존했다.

검증: 문법·전체225개 중224통과/실패0/기존 선택1개 제외·기하12개·타입·웹/iOS JS export·전체 앱·Duo 선 위치/양끝16pt/색/터치 통과·스크린리더 제외/스크롤·탭 고정/회전·힌지 숨김/기존 상태·Glass 선택 모션 회귀를 통과했다. 공개 문서/디자인 가이드 회귀와148개 이미지 해시도 검증했다. 새 캡처는 **실제 앱 컴포넌트의 기하/체험 데이터 웹 fixture**이며 AI 시안과 구분한다. native Glass·실제 Duo/기기 설치 검수는 새 무료 빌드 후 별도다.

[승인 기준·실제 캡처·공식 근거·남은 검수](https://github.com/thepmpo/donknow/blob/main/docs/duo-pane-divider-proposal-2026-11-13.md) · [무료 빌드](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml). 현재 확인한 설치19번에는 앞선 Glass/확대와 구분선이 없으므로 최신 main을 새로 수동 빌드하면 함께 받는다. 새 빌드 번호나 Apple/실기기 성공을 미리 확정하지 않는다. 기존 인증·서명·데이터·원본 recovery bundle을 보존했고 push 자동 빌드는 계속 꺼져 있다.

### 2026-11-13 구분선 추천 이미지 — 구현 전

사용자는 펼친 Duo의 좌우 구분을 연한 선으로 표시하고 다른 서비스의 방식 중 가장 나은 이미지 한 장을 요청했다. Apple/Material/Fluent의 공식 가이드를 읽고 같은 흰 표면 위에 #E5E8EB hairline 하나를 gutter 중앙에 두고 위아래 여백을 주는 시안을 생성했다. 실제 앱 코드는 바꾸지 않았고 사용자 선택 전 제안이다. 공개 문서 회귀/143개 이미지 해시를 검증하며, 앱 코드와 별개로 추가된 제안 이미지의 링크가404가 되지 않도록 assetCommit을 분리해 고정한다. [추천 이미지·공식 출처·치수 제안·검수와 다음 작업](https://github.com/thepmpo/donknow/blob/main/docs/duo-pane-divider-proposal-2026-11-13.md)을 읽는다. native Glass/실기기 검증 이미지로 오해하지 않는다.

### 2026-11-13 승인 반영 — 큰 내비게이션·Apple Glass·선택 이동

구현30ea3d9에서 Duo 아이콘28pt·터치52pt·바64×272pt로 확대하고 지원 iOS의 실제 Liquid Glass를 연결했다. 웹/이전OS는 블러 대체, 투명도 줄이기/강제 고대비는 불투명 재질이다. 선택 강조판은 측정 좌표로250ms 이동/1.06배 반응하며 동작 줄이기에서는 즉시 바뀐다. 카메라 열·고정 캘린더/오른쪽 탭·세로 단일 화면·초안/스크롤/복귀를 유지한다. 전체223통과/선택1개 제외·타입·웹/iOS JS·전체 앱/모션/채팅·Duo 이동/접근성 검사를 통과했다.19번 앱에는 이번 변경이 없어 새 무료 native 빌드/실기기 검수가 남는다.90분은 한 빌드 job의 제한이며 월간 횟수/총시간 한도가 아니다. [확대 미리보기·native/웹 구분·검수](https://github.com/thepmpo/donknow/blob/main/docs/iphone-duo-support.md)를 우선한다.

### 2026-11-13 실제 무료 빌드 성공 — 1.0.0(19) Apple 업로드

사용자 수동43365834762는 소스224a498에서 validate/build-and-submit 모두 성공했다. 실제 Xcode27.1·기존 서명·로컬IPA11.4MB 생성·Apple 업로드13:40:01 KST를 확인했다. 새 버전은1.0.0(19)이고 승인 카메라 열/가로 Calendar 고정·Todo 선택/세로 현재 화면을 포함한다. [실행 결과](https://github.com/thepmpo/donknow/actions/runs/43365834762) · [Apple 제출](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/submissions/0d6c6741-25ea-4444-9a1e-62c55ec958da). 제출 로그는 Apple 처리 중이며 TestFlight 목록/설치/Duo 기기 검수는 아직 별도다.19가 안 보이면 Apple 처리를 기다리고 재빌드하지 않는다. Expo cloud 무료 한도를 쓰지 않는 공개 GitHub 표준 Mac 경로의 실제 성공이다. [실제 증거와 남은 검수](https://github.com/thepmpo/donknow/blob/main/docs/testflight-automation.md)를 우선한다.

### 2026-11-13 무료 빌드 — Windows에서도 GitHub의 Mac 사용

사용자 비용0 정책에 따라 기존 수동 TestFlight 버튼을 공개 저장소의 표준 xcode-27 GitHub Mac에서 실제 local 빌드→제출하는 경로로 변경했다. 저장소 공개/표준 runner 무료/설치된 Xcode27.1을 공식 자료로 확인했다. 추가 Mac·Expo Starter 결제·새 인증이 필요하지 않다. main/public/manual 조건, 기존 서명 freeze, 임시 파일 정리·공개 artifact 제외, 유료 대체/자동 push 빌드 금지를 유지한다. actionlint·셸·224개 중223통과/선택1개 제외·타입·iOS JS·문서 회귀는 확인했지만 첫 Mac 컴파일/제출/Apple 처리는 아직 미확인이다. [무료 빌드 실행 화면](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml)에서 Run workflow→main→Run workflow를 누른다. 이전 실패 실행 Re-run은 구cloud 코드이므로 쓰지 않는다. [공식 근거·구현·상태 구분](https://github.com/thepmpo/donknow/blob/main/docs/testflight-automation.md)을 읽는다.

### 2026-11-13 빌드 차단 — Expo 무료 iOS 한도 소진

사용자 수동43357992366은 faee581에서 검사·타입·iOS JS export를 통과했지만 EAS가 이번 달 무료 iOS 한도 소진으로 거절했다. 로그의 초기화일은12월1일이다. buildNumber18은 할당만 됐고 새 IPA/제출은 확인되지 않았다. Node20/Ubuntu 이전 안내는 중단 원인이 아니다. 같은 재실행·인증 재생성·유료 전환을 하지 않는다. 무료 대안은 사용자 Mac의 호환 Xcode에서 로컬 production 빌드/업로드이며 아직 미실행이다. [실제 실패 근거·공식 무료 대안·빌드 상태](https://github.com/thepmpo/donknow/blob/main/docs/testflight-automation.md)를 읽는다. push 자동 EAS는 계속 꺼짐이다.

### 2026-11-13 승인 시안 반영 — 카메라 열과 두 화면

Duo는 본문 안쪽 오른쪽이 아니라 **물리 카메라가 있는 맨 오른쪽 열**에 내비게이션을 둔다. 접힘·펼침 모두 그 열 아래에 세로5개 탭, 카메라/상태 표시 아래에는 실제 복귀·닫기 경로에서만 원형 ‹를 표시한다. 상·하 안전 여백8pt,64×272pt 묶음·52pt 조작·28pt 아이콘을 유지한다. 펼친 가로 화면은 왼쪽 캘린더 고정·오른쪽 최초 Todo이며 탭 선택은 오른쪽만 바꾼다. 펼친 세로 화면과 접힌 화면은 선택 중인 화면 하나를 본문 전체에 표시한다. 회전·접힘 시 현재 탭·입력·편집·캘린더 월·스크롤을 보존한다. 일반 iPhone은 기존 하단 탭이다.

이 기준이 아래 이전 가로 탭·본문 안쪽 세로 탭·64pt 보호 padding·단일 본문 정책보다 우선한다. 사용자가 승인한 그림에서 파란 열과 검은 카메라 점은 **위치 확인용 안내 표시**이며 앱에 그려 넣지 않는다. [최신 구현·미리보기·검수](https://github.com/thepmpo/donknow/blob/main/docs/iphone-duo-support.md).

검증: 전체224개 중223통과·실패0·기존 선택1개 제외, 기하11개·모바일 타입·웹/iOS JS 출력·Duo 전환 검사를 통과했다. 카메라 중심선과 탭/뒤로가기 중심선 일치, 본문 밖 배치, 왼쪽 고정/오른쪽 전환, 세로 단일 화면, 월·초안·스크롤 유지, 실제 복귀·비활성 보호·짧은 높이·초기 하단 탭 깜박임 방지를 검사했다. 전체 앱·웹 로그인·모션·AI 채팅/오류·세션 격리 회귀도 통과했다. 공개 문서/디자인 가이드 회귀와131개 이미지 manifest를 검증했다. 구현775a561. 웹 모의 기하/체험 데이터 결과이며 Swift 컴파일·Duo 실기기·시스템 키보드는 미검증이다. 기존1.0.0(17)은380dde2로 이번 수정 전이며 새 네이티브 수동 빌드가 필요하다. push 자동 EAS 빌드는 계속 꺼짐이다.

### 2026-11-13 — 네이버 읽기 전용·아이폰 테스트

사용자는 네이버를 읽기 전용으로 확정했다. `NAVER_READ_ONLY=true`로 읽음 상태 변경·발송·답장과 이전 초안 실행을 막고 기존 인증은 보존한다. 사용자 수동 실행43345083809는57aee29의 아이폰 빌드16 요청/제출 예약 접수이며 실제 Apple 처리는 별도다. 이 서버 정책은 해당 빌드에도 적용하므로 이번 변경으로 추가 EAS를 요청하지 않는다. 웹·서버 변경 때 매번 아이폰 빌드를 할 필요는 없다. Google·Notion 실제 권한/읽기/시험용 쓰기는 설치 후 최종 테스트에 포함한다. [최신 정책·빌드 증거](https://github.com/thepmpo/donknow/blob/main/docs/functional-completion-2026-11-13.md)를 우선한다.

### 2026-11-13 — 예약 브리핑·날씨와 Duo 배치 정정

사용자가 별도 명세 대기를 해제해 정한 시간에 덕 채팅으로 오는 브리핑·도시 날씨를 구현했다. 기본 꺼짐·시간대/자료/AI 동의·중복/취소/복원 보호·아이폰 도착 알림 연결을 포함한다. Duo는 접힘·펼침 모두 배터리 아래 기존 헤더 오른쪽으로 모으고 본문76pt 예약 공간과 전체 높이 rail을 제거했다. [현재 기능·서버 제약](https://github.com/thepmpo/donknow/blob/main/docs/functional-completion-2026-11-13.md), [예약 사용·보호·검증](https://github.com/thepmpo/donknow/blob/main/docs/scheduled-messages-2026-11-13.md), [Duo 화면](https://github.com/thepmpo/donknow/blob/main/docs/iphone-duo-support.md)을 우선한다.

네이버 읽기/읽음 변경을SMTP와 분리했다. Render Free의465/587 차단은 실제 공식 제약이므로 발송은 이 호스트에서 막고 이유를 표시한다. 유료 전환·외부 쓰기·기존 데이터/인증 재설정은 하지 않는다. 실제 계정 승인·iPhone 빌드/기기 수신은 별도이며 TestFlight 수동·출시 준비 마지막 정책을 유지한다. 아래 이전 ‘브리핑·날씨 상세 문서 대기’와‘Duo76pt 세로 열’은 당시 기록이다.

### 2026-11-12 — UX/UI 10개 수정·편집 저장 가림 보완

사용자 요청에 따라 감사10개와 추가로 발견한 할 일 편집창 저장 버튼 가림을 수정했다. 덕 도구 접기·동의 안내·후보 확인 우선·메모/완료 상세 펼치기·권한 선택 후 연결·44pt·버튼 대비·날짜 선택·작은 탭·선택일/계정 바로가기를 적용했다. 기존 동의/확인·데이터·인증과 브리핑/날씨는 유지한다. [19개 화면과 실제 회귀 검증](https://github.com/thepmpo/donknow/blob/main/docs/ux-ui-fixes-2026-11-12.md), [남은 실계정 가동·기기 확인](https://github.com/thepmpo/donknow/blob/main/docs/functional-workstream-2026-11-12.md)을 따른다. TestFlight는 수동이며 이번 EAS 빌드는 없다. GitHub 반영과 Render 실제 공개 반영은 별도 확인 후 기록한다.

### 2026-11-12 — 빌드 절약·기능 검증·UX/UI 전체 점검

사용자 요청으로 출시 준비는 마지막에 둡니다. TestFlight는 필요할 때만 수동 요청하고 코드 검사는 계속 자동 수행합니다. 실제 임시 서버·DB의 AI 후보→확인→Todo 저장과 중복/계정 보호를 검증했습니다. 새15개 모의 화면을 직접 캡처·열어 UX/UI 개선10개를 정리했습니다. [화면별 근거와 개선 우선순위](https://github.com/thepmpo/donknow/blob/main/docs/ux-ui-audit-2026-11-12.md), [진행표·계정 승인·기기 검수](https://github.com/thepmpo/donknow/blob/main/docs/functional-workstream-2026-11-12.md)를 확인하세요. 전체208개 중207개 통과·기존 선택1개 제외이며 새 EAS 빌드·실계정 외부 발송은 하지 않았습니다. 앱 디자인 일괄 변경과 출시 완료를 뜻하지 않습니다.

### 2026-11-12 — 첫 실제 AI 답변 사용자 확인

사용자가 덕에서 인사에 대한 실제 AI 답변을 받았다고 확인했습니다. 인사에도 업무 분석과 자료 부족 설명을 요구하던 지침을 다듬어 짧고 자연스럽게 답하도록 했습니다. 실제 업무 요청에는 근거·후보·사용자 확인 후 실행을 유지합니다. 수정 후 실모델 말투, 실제 할 일 저장과 외부 쓰기는 별도 확인입니다. [응답 확인·말투 보완 기록](https://github.com/thepmpo/donknow/blob/main/docs/assistant-chat-feedback-2026-11-12.md)을 참고하세요.

### 2026-11-12 — AI 요청 제한 사유 분류 보완

수정 화면에서 사용자가 요청 제한(HTTP 429) 안내를 확인했습니다. 최신 공식 오류 코드 5개를 추가해 API 잔액·조직/프로젝트 한도·일시적인 요청 제한을 더 정확하게 구분합니다. 사용자의 실제 원인은 아직 확정하지 않았고, 계정 잔액 확인부터 안내했습니다. 결제나 한도를 자동 변경하지 않습니다. 관련 14개와 전체 206개 검사 통과·선택 1개 제외입니다. [확인 근거와 사용자 안내](https://github.com/thepmpo/donknow/blob/main/docs/assistant-chat-feedback-2026-11-12.md)를 따릅니다.

### 2026-11-12 — 덕 전송 무반응 안내 수정

파란 ↑를 눌러도 그대로 보이던 화면에서 오류가 대화 영역 밖에 숨는 문제를 재현하고 고쳤습니다. 입력창 위 처리·실패 안내, 입력/동의를 보존한 다시 보내기, AI 연결 재확인과 인증·권한·모델·사용 한도별 쉬운 안내를 제공합니다. 자동 재전송은 하지 않습니다. [진단·수정 전후 화면·버튼별 안내](https://github.com/thepmpo/donknow/blob/main/docs/assistant-chat-feedback-2026-11-12.md)를 확인하세요. 루트 206개 통과·선택 1개 건너뜀, 문법·타입·웹/iOS JS·전체 앱·채팅/오류 회귀를 통과했습니다. 13:36 KST 공개 서버에서 AI 설정 활성화를 확인했으나 실제 사용자 모델 응답·권한/한도 원인은 아직 미확인입니다. 13:52 KST에 7eeac79의 Render live와 공개 문서·디자인 가이드 반영을 확인했고 빌드 15 생성·제출 요청이 접수됐습니다. [배포와 남은 확인](https://github.com/thepmpo/donknow/blob/main/docs/release-readiness-2026-11-12.md)을 따릅니다.

### 2026-11-12 — Product Design 덕 채팅 후속 검토

새 할 일 후보의 제목·날짜가 가려지던 자동 이동을 고쳤습니다. 새 답변·초안·완료 결과와 자료 선택이 바로 보이고, 이미 준비한 후보의 날짜는 읽기 전용입니다. 기존 톤·토큰·동의·확인 후 실행을 유지했습니다. [수정 전후 화면·네 단계 검토·실제 검사](https://github.com/thepmpo/donknow/blob/main/docs/product-design-chat-audit-2026-11-12.md)를 확인하세요. 자동 검사 202개·문법·타입·웹/iOS JS·전체 앱 검사를 통과했습니다. 후속 Render 배포 dd1abae의 live와 공개 문서·디자인 가이드·지원 연락처를 확인했고, TestFlight 빌드 14 생성·제출 요청도 접수됐습니다. 당시 실제 AI 활성화·실기기·Apple 처리는 별도였으며, 이후 AI 설정 활성화 상태는 위 최신 기록을 따릅니다. 사용자용 결과는 개인 Notion에 기록합니다.

### 2026-11-12 — 덕 개발 재개·Duo·Notion 업무 기록

사용자는 AI 사무실의 추가 개발을 보류하고 덕의 남은 기능과 iPhone Duo 대응을 진행하도록 승인했습니다. 덕 채팅의 AI 제안→초안 확인→실행, 계정 전환 시 늦은 응답 차단, Apple 공식 힌지·화면 영역 API에 따른 Duo 우측 내비게이션을 구현하고 자동 검증했습니다. 실제 Xcode 네이티브 컴파일·Duo 실기기 검증은 남습니다. 일반 iPhone의 하단 내비게이션·기존 데이터와 인증은 보존합니다. 아래의 이전 Duo 보류 기록보다 이번 지시가 우선하며, 브리핑·날씨는 후속 간략 문서를 기다립니다.

[운영·출시 확인](https://github.com/thepmpo/donknow/blob/main/docs/release-readiness-2026-11-12.md)에서 초기 공개 서버 정상 응답과 AI 비활성 기록, 이후 13:36 KST AI 설정 활성화, Slack 미설정, Google·Notion 설정 존재, 예약 백업·격리 복원과 기존 TestFlight 요청 성공의 실제 근거를 확인합니다. 설정 존재를 실제 AI·새 쓰기·Apple 처리 성공으로 해석하지 않습니다. [Figma 69개 대조](https://github.com/thepmpo/donknow/blob/main/docs/figma-baseline-review-2026-11-12.md)는 새 읽기 성공과 이후 Starter 한도 차단을 구분합니다.

매 업무의 결정·변경·실제 검사·남은 일을 개인 Notion에 기록하고 코드·테스트·공개 기술 문서는 GitHub에 유지합니다. [Notion·Craft·스킬 비교](https://github.com/thepmpo/donknow/blob/main/docs/tooling-and-documentation.md)에 공식 설치·다운로드 경로와 토큰 비교의 한계를 정리했습니다. 스킬 다운로드는 외부 계정 로그인이나 실제 작업 성공을 대신하지 않습니다.

### 2026-11-12 — 사무실 스킬·PDF·Gmail·업무관리 (개발 보류 전 기록)

[추천 스킬·PDF·Gmail·업무관리 사용법](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-capabilities.md)을 먼저 확인합니다. 문서고에서 공통·직무별 지침을 한 번에 연결하며, 다음에 새로 준비하는 업무에 실제 원문과 버전을 전달합니다. 보고서의 PDF 저장·인쇄와 선택한 PDF의 본인 Gmail 전송을 준비했습니다. Gmail은 Mac 사무실에서 직접 앱 비밀번호를 연결해야 하며 실제 계정 인증·수신은 미확인입니다. 업무관리 실행은 기존 안건의 내용 확인으로 연결하고, 삭제 대신 보관·복원을 제공해 보고서와 기록을 보존합니다. 팀장회의는 현재 개별 의견 수집 후 종합 제안이며 반복 상호 토론은 아직 아닙니다. 적용 파일·검증·남은 계정 단계는 위 안내에 기록합니다.

### 2026-11-12 이어받기 — 사무실 재개 후 적용할 이전 기록

[양방향 이어받기 기준](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-shared-work.md)을 공식 지침에 추가했습니다. 이 채팅의 작업자는 수정 전에 사무실이 GitHub main에 반영한 코드·문서·검증 기록을 확인합니다. 여기서 수정한 뒤에는 사무실에서 **최신 코드 받기가 필요한지 반드시 안내**합니다. Mac 안의 미게시 코드·채팅·보고서·추가 문서는 자동으로 공유되지 않으며, 실제 작업 사본의 변경과 검증을 확인한 인계가 필요합니다. 설치된 사무실 프로그램 업데이트와 프로젝트 코드 갱신도 구분합니다.

사용자는 Tailscale Serve 허용 완료 화면과 **휴대폰 사무실 접속 성공**을 확인했습니다. 모바일 글씨가 작다는 피드백도 받았습니다. Wi-Fi를 끈 외부 모바일 데이터 접속·다른 컴퓨터 접속·11번 개발 업데이트·12번 GitHub 로그인·실제 코드 게시/배포는 별도 확인입니다. 문서고는 스킬 목록, 상단 문서함은 제품 자료, 보고서는 업무 결과입니다. 다음 날짜별 기록은 당시 상태입니다.

### 2026-11-10 이어받기 — 톤 합의와 제품 원칙

2026-11-11 휴대폰 연결: [Mac용 10번 파일·쉬운 사용법](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-phone.md)을 준비했습니다. 기존 사무실을 재사용하고 같은 Tailscale 계정에만 HTTPS로 연결합니다. 설정/호스트 모의15개 통과이며 실제 계정 로그인·HTTPS 동의·외부 폰 접속은 확인 전입니다. 코드 수정·배포도 [별도 설치·권한·검증 문서](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-development.md)에 따라 연결했습니다. 전용 작업 사본 수정→실제 격리 검사→확인한 GitHub 반영→정확한 커밋의 Render 배포 순서이며, 사용자 Mac 적용·GitHub 로그인·Render 비밀 설정·실제 모델과 배포는 확인 전입니다. 기존 원본/인증/업무는 보존합니다.

2026-11-11 최신 Mac: 설치·화면 열림·로그인 단계 완료는 사용자 보고이며 채팅 설치 로그도 확인했습니다. 이후에는 **0-open-office.command 하나**로 기존 환경과 사무실·문서함·채팅을 시작/재사용하고 브라우저를 엽니다. [시작 파일 다운로드](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-mac-open.zip) · [사용법·현재 상태·검증 범위](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md). 재설치·로그인 초기화·자동 새 업무 실행은 하지 않습니다. 기존 수동 서버 창은 유지하며, 0번이 새로 켠 서버는 실행 창을 닫아도 유지됩니다. 새 시작 파일의 실제 Mac 실행·14명 연결 상태·실모델 응답은 확인 전입니다. 아래 예전 미확인 기록은 당시 상태이며 Ubuntu24.04 CI 다운로드 DNS 실패 이력도 보존합니다.

최신v5: 직원/팀장 수신자 선택, 전체 실행 연결, 승인된 팀장회의(최대6명+종합1건)와 쉬운 보고를 준비했습니다. 계정/모델 설정을 보존하며 실제14명 응답은 미검증입니다. 결론·할 일·내 결정부터 보여주고 원문은 접어 보존합니다. [사용·보존·실행 한도·검증](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-control.md).

최신v4 사용자 정정: 별도 공용방 대신 캐릭터의 원래 대화하기 UI를 전체 대화에도 재사용합니다. 모드 선택 전송은 안건으로 이어지고 보고서는 에이전트 준비 없이 원문을 표시합니다. 알 수 없는 보고서kind/빈 선택지의 표시 버그를 고쳤으며 실제 사용자2건은 미열람입니다. [v4 사용·구현·보존·검증](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-control.md).

2026-11-11 공용방: 전체 직원의 실제 기록·내 요청·보고서를 한곳에서 보고 지시/질문/공지를 선택합니다. 실행 저장 상태와 실행기 연결·경과 시간·최근 활동을 구분합니다. 공지는 저장 후 이후 새 업무에서 참고하며 직원 읽음은 미확인입니다. 실제 실행은 검토 담당자1명이고 다자 자동 협업은 남아 있습니다. [사용·API·검증](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-control.md).

최신 Windows 사무실 시작: **0-open-office.cmd 하나**로 기존 사무실과 채팅을 자동 시작/재사용하고 서버 창은 최소화합니다. 이름·대사 확대는 초기150%, 상단에서100~200% 조절합니다. [다운로드·보존·검증](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-control.md). 사용자 PC 적용 성공은 미확인입니다.

2026-11-11: [사무실 채팅·내 지시](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-control.md)를 사무실 안에 연결했습니다. 후속 요청은 이전 보고서와 연결된 별도 읽기 전용 업무이며 전체 원문/상태 검색을 제공합니다. [Mac용 준비 패키지](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md)는 미리 제작했고 실제 Mac 설치/로그인은 미확인입니다.

[업무 입력·보고서 확인·휴대폰 설정](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-control.md): 요청 입력/명시적 읽기 전용 실행/중지/보고서 확인 완료와 본인 전용 Tailscale Serve 추가 파일을 준비했습니다. 기존 미결 보고서를 읽고 제품 검토만 완료 처리하며 개발/배포는 승인하지 않습니다. Windows/실제 폰 연결과 새 모델 응답은 사용자 확인 대기입니다.

[사무실 글자 확대·휴대폰·지시 방법](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-usage.md): 이름/말풍선 크기를 개선하고 검토 종료 후 적용하는 UI 패키지를 준비했습니다. 사용자 PC의 ready/started는 확인됐고 첫 결과는 대기입니다. 외부 폰 접속과 범용 반복 요청 입력창은 아직 연결 전입니다.

[Windows 로그인 오류 수정](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-login-repair.md): 공식 Codex가 만든 임시/로그/잠금 보조 파일을 인증 실패로 오판한 문제를 확인해 v2 독립 수정 ZIP을 준비했습니다. 인증/키/DB/worker 정책을 보존하고 사용 중이 아닌 보조 파일만 백업합니다. 실제 PC의 인증·첫 AI 응답은 수정 후 확인 대기입니다.

[주술회전 직원 테마](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-jjk-theme.md): 직원14명의 생성 스프라이트를 적용하고 실제 화면/PNG·복원/재적용을 확인했습니다. 역할·모델·업무는 유지하며 Windows 최신 패키지에 적용 경로를 추가했습니다. 실제 Windows/Mac 검증과 AI 업무 실행 성공을 뜻하지 않습니다.

[Windows부터 AI 사무실 실행·Mac 경로·캐릭터 변경](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-local-install.md): Windows WSL2 시작 패키지와 Mac Lima 경로를 준비했습니다. 실제 PC 설치/로그인/모델 응답은 미확인입니다. [인수인계 공식 기준](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-handoff.md)은 문서뿐 아니라 실제 작업물과 검증 결과를 함께 전달하도록 정했습니다.

[공통 제품 문서함](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-knowledge.md): 기존 제품 문서를 기본 연결하고 문서 추가 즉시 버전을 발행합니다. 모든 역할이 최신 목록·관련 원문을 읽도록 연결하며 공통/프로젝트 범위를 구분합니다. 로컬 문서함은 http://127.0.0.1:8791 이고 공개 업로드 공간은 아닙니다. 문서 변경 시 이전 실행 승인은 만료됩니다.

[AI 사무실 첫 실행 준비](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-ready.md): 공식 Codex 실행기·일회 제품 검토·보고서/중지 명령을 준비했습니다. API247개와 빌드 및 실제 네이티브 도구 격리를 검증했습니다. 첫 작업은 inbox, 승인/실행0, 개발 잠금입니다. 현재 환경의 auth.openai.com·chatgpt.com 차단 해제와 개인 터미널 ChatGPT 로그인이 남았습니다. 실제 모델 응답과 Render 공개 반영은 미검증입니다. [설치](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-setup.md) · [승인 경계](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-approval-gate.md).


### 2026-11-10 당시 결정과 확인 기록

아래의 보류·미확인 표시는 당시 기록입니다. 현재 작업은 위의 2026-11-12 덕 개발 재개와 최신 상태 표를 우선합니다.

- [AI 사무실 대화 상세 분석](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-ux-analysis.md), [쉬운 톤앤톤 확정 요약](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-tone-summary.md), [다른 프로젝트용 공식 원칙 v1.0](https://github.com/thepmpo/donknow/blob/main/docs/reusable-product-design-principles.md)을 먼저 읽습니다. 첨부 전체를 분석했으며 사용자 발언·이전 AI 제안·현재 코드·새 후보를 구분했습니다. 원문 전체는 공개 재게시하지 않습니다.
- 사용자 확인: GitHub/Render 기준 f76172d, iPhone build and submit 성공, TestFlight **1.0.0 (12)**. 아래 예전 날짜의 빌드/배포 미확인 기록은 당시 상태입니다. 에이전트가 Apple/Render 대시보드를 직접 검증한 것과 구분합니다. 실모델·실계정 가동은 아직 완료되지 않았습니다.
- 사용자가 추천안 **A + ② + 가**를 공식 확정했습니다(2026-11-10): **차분하고 친근한 비서 · 필요할 때 담당 역할 표시 · 오리는 인사/완료 순간에 가볍게 표현**. RP-01~RP-12는 공식 v1.0입니다. 초기 초안 A + ① + 가보다 최신 승인이 우선합니다. [디자인 가이드](/design-guide)와 원칙 문서에 승인 범위를 기록했습니다. 당시 작업에서는 앱·Figma·새 수치/시안을 변경하지 않았습니다.
- 붙여넣기 Todo는 덕 채팅의 AI 후보→사용자 확인→추가 방향입니다. 브리핑·날씨는 정한 시간에 덕 채팅으로 오는 자동화 방향이며 후속 간략 문서 전 구현/현재 코드 수정 금지입니다.
- [Figma 69개 기존 화면](https://www.figma.com/design/UkWrjnq8PQpqOZvY0uVZSx?node-id=3-265)과 [저장된 검수 목록](https://github.com/thepmpo/donknow/blob/main/docs/figma-wireframes.md)은 유지합니다. Current baseline 교정/Proposed 분리는 미완료입니다. 당시 metadata 요청은 Starter 한도로 실패했습니다. 11월 12일에는 69개 화면 ID 읽기에 성공했고 후속 쓰기는 제한됐습니다.
- Apple iPhone Duo의 `Duo 우측 내비게이션`/`DuoTrailingNavigation`은 [상세 분석 14절](https://github.com/thepmpo/donknow/blob/main/docs/ai-office-ux-analysis.md)에 기록만 했습니다. 일반 iPhone 하단 유지, Duo 접힘/펼침 우측 이동·상태 보존·공식 API 검증이 필요해 당시에는 **“Duo 진행” 전 코드 수정 금지**였으며, 11월 12일 사용자가 진행을 승인해 이 보류는 해제됐습니다.
- 당시 운영 `/project`·`/design-guide` 조회는 프록시 403/별도 웹 도구 실패였습니다. 현재 공개 조회와 새 문서의 Render 반영은 별개이며 Git push를 공개 배포 성공으로 해석하지 않습니다.

공통 레이아웃과 화면 예시는 [디자인 가이드](/design-guide), 자동 빌드는 [설정 안내](testflight-automation.md)를 참고합니다.

## 2. 사용자가 정한 IA와 동작

| 탭 | 핵심 동작 |
|---|---|
| 캘린더 | 화면을 채우는 월별 42칸 그리드, 날짜 선택, 해당 날짜 할 일, 승인된 Google 기본 캘린더 일정 |
| Todo 리스트 | 간결한 할 일, 추가/수정/삭제, 예정일·선택 알림, 좌우 스와이프 완료/되돌리기 |
| duckduck | 오리 이모지, 빈 시작 화면, 입력 초안 편집·버리기·Todo 전환, 대화 붙여넣기, 기록 찾기 |
| log | 완료한 할 일 모아보기와 미완료로 되돌리기. 내정보 바로 왼쪽 |
| 내정보 | 계정·이메일 인증·암호 재설정·삭제, 서비스 연결, 알림, 저장/백업 안내, 개인 데이터 내보내기 |

체크·미완료 복원은 서버 응답 전에 화면에 즉시 반영하고, 저장은 뒤에서 진행합니다. 완료된 항목은 누른 시점부터 약 **3초** 동안 되돌릴 수 있게 남긴 뒤 350ms 동안 옅어지며 접힌 후 리스트에서 숨깁니다. 3→2→1을 매초 표시하고 0은 표시하지 않습니다. 저장 중에도 되돌릴 수 있고, 늦은 이전 응답/목록은 최신 선택을 덮어쓰지 않습니다. 실패하면 마지막 서버 확인 상태로 복원하고 오류를 알립니다. 완료 여부는 log에서도 복원할 수 있습니다.

외부 서비스의 **미완료 항목만** 선택해 가져옵니다. **완료 기록은 접근·조회·검색할 수 있지만 신규 Todo로 가져오지 않습니다.** 덕에 이미 가져온 항목의 상태를 동기화하는 것은 이 규칙과 별개입니다.

## 3. 지금 어디까지 되었는가

| 항목 | 현재 상태 | 근거/남은 일 |
|---|---|---|
| 무료 서버·DB | Render Free + Turso 연결 | 사용자가 접속·저장 동작 확인 |
| 가입/로그인/저장 | 구현·검증 | 계정별 분리·재시작·만료 처리 자동 테스트 |
| 이메일 인증 | 실사용 확인 | 사용자가 Resend 설정 후 인증 완료 |
| Google Tasks 읽기 | 실사용 확인 | 사용자가 미완료 가져오기·완료 조회·외부 검색 확인 |
| 선택적 완료 동기화 | 실사용 확인 | 사용자 계정에서 켜기·완료 전송·미완료 복원 전송 성공. 다른 사용자는 기본 꺼짐 |
| Google 캘린더 | 구현·기본 실사용 확인 | 사용자가 API/권한 설정 후 기본 동작 확인. 일반 사용자 OAuth 검증은 별개 |
| Gmail·Drive | 기존 읽기 실사용 확인, 새 상세 읽기·제한 쓰기 구현 | 메일 본문 일부·읽음·답장·발송, 텍스트 파일 생성/수정. 새 권한·서버 배포와 실계정 확인 필요 |
| Notion | 기존 읽기 실사용 확인, 쓰기 구현·모의 검증 | 하위 페이지 생성·내용 추가·제목 수정. 콘텐츠 capability/대상 페이지 접근과 재승인 필요 |
| Slack | 읽기·전송·자기 메시지 수정 구현 | 공개 운영 응답 configured:false. OAuth 설정·chat:write 승인·채널 접근 필요 |
| 아이폰 미리 알림 | 읽기·가져오기·완료 참고·수동 양방향 상태 맞추기 구현 | 실제 아이폰 권한/ID/상태 확인 필요 |
| 기기 알림 | 미래 시간·권한·예약·변경·취소 구현 | 실제 아이폰 잠금/재실행/권한 검증 필요 |
| 개인 데이터 내보내기 | 웹 다운로드·네이티브 파일 공유 구현 | 웹 실동작 테스트, 네이티브 공유는 기기 확인 필요 |
| 원격 암호화 백업·복원 | 실제 수동 백업·임시 DB 복원 검증 성공 | Actions run 40996926840 녹색 사용자 확인. 2026-11-12 재확인: 예약 실행 42924574013의 암호화 백업·격리 복원 성공 |
| iPhone 설치/출시 | 무료 Mac에서1.0.0(21) Apple 업로드 성공, 사용자 Glass 외형 확인 |43378603322·1f7dc5d. 이번 터치/하단 수정은21 이후. 실제 전체 기기 검수·App Store 공개는 별도 |
| 최신 디자인·모션 | 톤v1.0·공통원칙v1.1·Apple 상태별Glass·하단capsule | continuation-guide.md와liquid-glass-navigation.md가현재계약. Figma Current/Proposed 미완료 |
| AI 비서·덕 채팅 | 대화·동의·초안 편집·미리보기·한 번 실행 구현 | 운영 assistant:true, 첫 실제 AI 답변 사용자 확인. 수정 후 말투·업무 저장·외부 쓰기는 별도 |
| Apple iPhone Duo | 공식 힌지/가림 기반 물리 카메라 열·가로 분할·세로 단일·상태 보존 | 기하/브라우저 회귀 및21번까지 Xcode27.1 native 빌드 성공. 실제 Duo 하드웨어 검수 별도 |
| 네이버 메일 | IMAP 읽기 활성·읽기 전용 확정, NAVER_READ_ONLY=true | 읽음/발송/답장 차단. 실제 계정의 IMAP 허용·앱 비밀번호를 앱에 직접 입력 후 읽기 확인 |
| 범용 붙여넣기 자동 추출 | 목록 초안·동의 기반 AI 분석 구현 | 개별 수정·선택 저장. 서버 AI 설정 활성화 확인, 실제 모델 답변은 별도 |
| 날씨·오늘 브리핑 | 시간/도시/동의를 고르는 예약 덕 채팅 구현, 문서 대기 해제 | 기본꺼짐. 실제 예약·모델·기기 수신은 별도,무료지연으로정확한분보장안함 |

**GitHub 저장과 실제 Render 배포는 다릅니다.** 자동 배포는 꺼져 있습니다. 이 작업 시작 때의 실제 live는1f7dc5d/dep-dbrap0btqb8s73e0v600(15:22:33 KST)이며 이번 문서의 공개 반영은 최종 배포ID/SHA/응답으로 별도 확인합니다. 최종 운영 결과는 선택한 Notion 작업 기록과 실제 Render 상태에서 확인하며 Git push나 웹 회귀를 운영 성공으로 대신하지 않습니다.

## 4. 현재 주소와 관리 위치

- 앱: https://duckduck-test.onrender.com
- 서버 상태: https://duckduck-test.onrender.com/api/health
- 코드: https://github.com/thepmpo/donknow
- 전체 소스 다운로드: https://github.com/thepmpo/donknow/archive/refs/heads/main.zip
- 기능 기준 커밋: {{COMMIT_LINK}}
- Render 서비스: https://dashboard.render.com/web/srv-dbgpc0ff3r2c73abc7e0
- Render 환경: https://dashboard.render.com/web/srv-dbgpc0ff3r2c73abc7e0/env
- Render Blueprint: https://dashboard.render.com/blueprint/exs-dbgorbjbc2fs73b9o2b0
- Expo 프로젝트: https://expo.dev/accounts/thepmpo/projects/duckduck-donknow
- Expo Project ID: f7827732-1b41-485f-b3b2-6bcc145f3c44
- iOS Bundle ID: com.sjfieni.duckduck
- App Store Connect/TestFlight: https://appstoreconnect.apple.com/apps/6829597261/testflight/ios
- Google 프로젝트: https://console.cloud.google.com/home/dashboard?project=duckduck-513102
- Resend: https://resend.com/emails
- Turso: https://app.turso.tech

주소/프로젝트 식별자는 비밀키가 아닙니다. 토큰·시드·OAuth 보안 비밀·인증번호·세션은 이 문서에 넣지 않습니다. 관리 화면 로그인은 에이전트에게 자동 전달되지 않습니다. 현재 열린 URL만으로 화면 내용을 봤다고 말하지 않습니다.

## 5. 기술 구조와 중요한 파일

React Native/Expo SDK 58 + TypeScript로 실제 네이티브 컴포넌트를 사용합니다. 웹은 동일 앱을 내보낸 것입니다. 서버는 Node.js 24이며 계정·Todo·OAuth·백업 API를 제공합니다. 저장소 이름/폴더 `donknow`와 서비스명 duckduck은 구분합니다.

| 위치 | 역할 |
|---|---|
| mobile/App.tsx | 5개 탭, 세션/계정 변경 시 화면 초기화, 에디터 |
| mobile/src/theme.ts | 확인한 TDS 색상·글자와 덕의 의미 토큰 |
| mobile/src/motion.tsx | 공통 눌림/전환/닫기, 실시간 동작 줄이기 |
| mobile/e2e/motion.mjs | 실제 웹 번들의 모션·취소·선호 설정 검증 |
| mobile/app.json · mobile/eas.json | Expo 프로젝트 연결, iOS Bundle ID와 배포 프로필 |
| docs/change-log.md | 변경 날짜·검증·배포 상태, 이 HTML에 직접 포함 |
| mobile/src/useTodos.ts | 계정/저장소/할 일 상태, 실패 보존, 완료 3초 처리 |
| mobile/src/domain.ts | 데이터 검증, 날짜·월 그리드·제목 검색 |
| mobile/src/NotesField.tsx · mobile/src/notes.ts | 메모 입력·글머리표·글자 수 검증 |
| mobile/src/screens/DuckScreen.tsx | 입력/붙여넣기→초안→Todo |
| mobile/src/screens/RecordSearchSheet.tsx | 저장된 기록 및 외부 Google Tasks 검색 |
| mobile/src/screens/IntegrationsScreen.tsx | 범위 선택, OAuth, 자료·완료 참고 조회, 가져오기·점검 |
| mobile/src/screens/TaskSyncPanel.tsx | 선택적 완료 동기화, 대기/실패/충돌, 원본 읽기 |
| mobile/src/screens/CalendarScreen.tsx | 조회 월에 맞춘 외부 일정·페이지 조회 |
| mobile/src/screens/AppleRemindersScreen.tsx | 기기 권한·가져오기·수동 상태 맞추기 |
| mobile/src/apple-reconcile.ts | 계정/화면 수명과 5개 배치를 고려한 기기 상태 반영 |
| mobile/src/useReminders.ts | 기기 알림 권한과 예약 정리 |
| mobile/src/screens/DataExportPanel.tsx | 개인 JSON 다운로드/파일 공유와 임시 파일 정리 |
| server.js | HTTP·보안·세션·라우팅·Render 시작 |
| server/database.js, store.js | SQLite/Turso 선택, 사용자별 저장 |
| server/features-store.js | 인증 메일 큐·OAuth·암호화 연결·중복 가져오기 |
| server/integrations.js | Google/Slack/Notion 어댑터·선택 권한·자료 읽기·외부 작업 연결 |
| server/assistant.js, provider-actions.js, action-store.js | AI 분석·고정 작업 카탈로그·암호화 미리보기·확인 후 한 번 실행 |
| server/naver-mail.js | 기본 비활성화된 고정 TLS IMAP/SMTP 어댑터 |
| mobile/src/screens/AssistantSheet.tsx | 자료/동의 선택·대화·작업 초안/미리보기·실행 기록 |
| server/sync-store.js, task-sync.js | 영속 전송 대기열·최신 revision·재시도·5개씩 상태 읽기 |
| server/secrets.js | AES-GCM 암호화·HMAC·안정적인 키 유도 |
| server/backups.js | 로컬 SQLite의 검증/서명 백업·새 폴더 복원 |
| server/remote-backups.js | 원격 DB 일관된 암호화 스냅샷·다른 빈 DB 복원 |
| scripts/remote-backup.js | 원격 백업/복원 관리 CLI |
| .github/workflows/remote-backup.yml | 기본 비활성, 선택 활성화하는 암호화 백업 |
| Dockerfile, render.yaml, compose.yaml | 런타임 CA·무료 배포·선택적 직접 서버 구성 |
| test/, mobile/e2e/ | 사용자 분리·권한·복구·실제 번들 화면 검증 |

## 6. 데이터와 보안 원칙

- 비밀번호는 scrypt 해시, 세션은 서버에 해시로 저장합니다. 웹은 HttpOnly/SameSite/운영 Secure 쿠키, 네이티브는 SecureStore를 사용합니다.
- 모든 계정·Todo·연결·대기열은 소유 사용자 기준입니다. 다른 계정 자료를 열거나 가져오지 못하게 합니다.
- OAuth state는 계정/서비스에 묶여 한 번만, 10분 동안 사용합니다. Google은 PKCE를 사용합니다.
- 공급자 토큰은 서버에서 AES-256-GCM으로 암호화하며 클라이언트에 돌려주지 않습니다.
- 원격 DB에서는 안정적인 암호화 키/시드가 필수입니다. 원래 키와 다르면 기존 DB 시작/백업/복원을 거절합니다.
- 기기/계정 변경 시 초안·로그인 정보·기기 알림을 정리합니다. 덕의 초안/붙여넣기 원문은 대화 DB로 보관하지 않습니다.
- 개인 JSON에는 비밀번호/세션/외부 토큰이 없습니다. 전체 DB 백업은 별도로 암호화합니다.
- 실계정 원본 변경은 수정 권한과 명시적 기능 켜기/확인 동작이 필요합니다. 테스트에서 실제 사용자 API를 쓰지 않습니다.

## 7. 환경 변수 — 이름과 용도만

| 이름 | 보관/용도 |
|---|---|
| STORE_DRIVER=turso | 무료 Render의 원격 저장 선택 |
| TURSO_DATABASE_URL | Turso의 libsql:// DB 주소 |
| TURSO_AUTH_TOKEN | DB 토큰 값만. URL을 넣지 않음 |
| INTEGRATION_KEY_SEED | Render가 생성한 원래 비밀값. 유지 필수 |
| INTEGRATION_TOKEN_KEY | 별도 32바이트 base64 키를 쓸 때. 설정 시 seed보다 우선 |
| MAIL_API_KEY / MAIL_FROM | Resend 키와 발신자 |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | 웹 OAuth ID/보안 비밀 |
| SLACK_CLIENT_ID / SLACK_CLIENT_SECRET | Slack OAuth |
| NOTION_CLIENT_ID / NOTION_CLIENT_SECRET | Notion OAuth |
| AI_ENABLED / OPENAI_API_KEY / OPENAI_MODEL | 서버 AI 명시적 활성화·비밀 키·모델 ID, 기본 비활성화 |
| NAVER_MAIL_ENABLED | 실계정 조건 확인 후 네이버 IMAP/SMTP를 켜는 서버 플래그 |
| NOTION_BASIC_AUTH | 프록시용 불투명 Basic 값이 필요한 환경의 선택지 |
| PUBLIC_ORIGIN | 명시적 HTTPS 원본. 없으면 Render 주소를 읽음 |
| RENDER_EXTERNAL_URL | Render가 제공하는 공개 주소 |
| BACKUP_ENABLED=0 | 무료 원격 구성은 로컬 SQLite 백업 비활성 |
| DUCKDUCK_BACKUP_ENABLED | GitHub Actions 변수. true일 때만 원격 자동 백업 활성 |

키 값은 Render/제공 업체/GitHub의 비밀 설정에만 입력합니다. 채팅으로 보내거나 문서/코드에 복사하지 않습니다. 토큰 앞의 Bearer, 변수 이름, 따옴표를 넣지 않습니다.

## 8. 연결과 동기화의 실제 범위

Google Tasks는 읽기 기본값이며 미완료만 가져옵니다. 완료·숨김 기록은 참고용으로 조회하고, 외부 검색은 첫 5개 목록·각 상태 첫 페이지를 확인합니다. 일부만 검색했으면 그 사실을 표시하고 나머지는 목록별 페이지 탐색으로 확인합니다.

완료 동기화는 Google의 Tasks 수정 권한(생성/수정/삭제를 포함하는 범위)을 승인하고 별도로 스위치를 켠 경우에만 이후 완료 변경을 반영합니다. 앱은 현재 완료 상태만 바꿉니다. 대기열은 DB에 보존하고 최신 revision을 검사하며 ETag/If-Match로 원본 변경 충돌을 처리합니다. Google→덕은 가져온 항목을 5개씩 직접 읽어 맞춥니다. 제목·날짜·삭제나 실시간 전체 양방향 복제를 구현했다고 말하지 않습니다.

캘린더는 승인한 기본 캘린더의 조회 월을 한국 날짜로 표시합니다. Gmail은 받은편지함의 제목, Drive는 이름/메타데이터입니다. 메시지 본문·첨부·파일 전체를 모두 수집하는 기능이 아닙니다.

Slack은 접근 가능한 채널 메시지, Notion은 승인한 페이지를 읽고 선택한 제목을 가져옵니다. 에이전트가 작업 문서를 쓸 Notion과 제품 안의 읽기 연결은 다른 권한/연결입니다.

카카오톡은 일반 공개 API로 전체 대화를 자동 읽지 않습니다. 저장된 할 일을 시스템 공유창/웹 복사로 보내고, 사용자가 복사한 대화를 붙여넣어 직접 할 일을 정리합니다. 카카오 로그인·나에게 보내기·알림톡은 구현하지 않았습니다.

아이폰 미리 알림은 EventKit 기반입니다. 읽기/완료 참고/미완료 가져오기와 수동 완료 상태 맞추기를 제공합니다. 기기에서 권한이 필요하고 웹에서는 직접 접근하지 않습니다. 기기 알림은 활성 계정의 미래 미완료 중 가까운 60개를 예약하며 완료/삭제/로그아웃에 맞춰 정리합니다.

## 9. 무료 운영·백업·복구

Render Free와 Turso 무료 한도 안에서 사용하는 개인 테스트 구성입니다. 유료 디스크/플랜을 만들지 않습니다. 대기 후 첫 접속 지연과 제공 업체의 사용량 제한은 있을 수 있습니다. 코드 변경만으로 이미 만든 유료 자원이 해지되지는 않습니다.

DB URL/토큰/원래 키가 빠지면 서버가 시작하지 않습니다. 파일이 사라지는 로컬 DB로 조용히 넘어가지 않습니다.

원격 백업은 읽기 트랜잭션으로 DB를 수집하고 압축 후 AES-256-GCM으로 인증 암호화합니다. 백업 파일과 원래 키는 분리 보관합니다. 다른 빈 DB로만 복원하고 기존 DB는 덮어쓰지 않습니다. 복원 시 예전 세션·코드·OAuth state·메일/동기화 전송 대기를 제거하고 완료 동기화를 끕니다. 복구 후 재로그인/연결 점검이 필요합니다.

GitHub 자동 백업은 현재 비밀 설정과 활성화가 필요한 준비 상태입니다. 선택 활성화하면 한국 시간 매일 03:30, 암호화 artifact 보관 7일입니다. GitHub 무료 한도도 확인하고 유료 사용 한도를 늘리지 않습니다. 활성화·실제 성공·복구 훈련을 확인하기 전 운영 성공으로 표시하지 않습니다.

## 10. 배포 오류와 해결 기록

| 증상 | 확인한 원인 | 해결 |
|---|---|---|
| Exited 127, export ... exec node ... not found | Render에서 복잡한 셸 명령 인용부호 처리 | node server.js로 단순화, Node가 Render 원본을 직접 읽음 |
| InvalidTlsConfiguration, no valid native root CA certificates | slim 런타임 OS에 네이티브 TLS 루트 CA 없음 | Debian ca-certificates 설치, SSL_CERT_FILE/SSL_CERT_DIR 지정, 검증 유지 |
| JWT Base64 Invalid symbol 58 | TURSO_AUTH_TOKEN에 libsql:// 주소를 넣음 | URL 변수와 토큰 변수를 분리해 값만 입력 |
| Google 미확인 앱 안내 | 개인 테스트 OAuth 앱 미심사 | 본인 앱/테스트 사용자/요청 범위 확인 후 승인. 공개 심사와 구분 |
| Google Tasks 버튼이 없음 | Tasks 읽기 범위가 승인되지 않음 | Tasks 범위 선택→재승인→상태 새로고침 |
| CLI 인증 실패와 Git 업로드 상태 혼동 | gh 인증과 Git 인증 경로가 다름 | 실제 Git push/원격 SHA로 저장 여부 확인 |
| 에이전트 공개 주소 접속 실패 | 작업 환경의 프록시/DNS 제한 | 사이트 장애로 단정하지 않음. 사용자 화면/로그로 확인 |

처음 Render 유료 Starter+디스크 구성을 준비했다가 사용자의 요청으로 Free+Turso 구조로 전환했습니다. 이미 유료 자원을 만들었다면 별도 확인해야 한다고 안내했습니다. 같은 실수를 반복하지 않도록 무료 기본값을 유지합니다.

## 11. 검증 결과와 재현

최근 비서 확장에서 **서버/단위 테스트 53개**, TypeScript/문법, 실제 Expo 웹 기능·모션 테스트와 iOS JS 번들이 통과했습니다. 메모·소유권·백업 보존·글머리표·드래그/X 닫기와 새 작업 20종의 확인 경계·중복 방지·권한/연결 변경·네이버 어댑터·AI 동의/제안을 검증했습니다. 공급자 모의 검증은 실계정 발송 성공과 다릅니다. 운영 이미지의 CA/TLS·서명 백업/복원·재시작은 앞선 변경에서 검증한 기록이며 이번에 컨테이너 전체를 다시 빌드한 것은 아닙니다. 실제 iPhone 설치와 OS 동작 검증은 별도입니다. 새 변경 후에는 관련 결과를 재확인합니다.

```sh
npm ci
npm --prefix mobile ci
npm run check
npm test
npm --prefix mobile run typecheck
npm --prefix mobile run export:web -- --max-workers 2
npm --prefix mobile run test:e2e
npm --prefix mobile run test:motion
npm --prefix mobile run export:ios -- --max-workers 2
npm run build:container
npm run test:container
```

웹 테스트는 실제 Expo 번들을 격리된 테스트 API와 공급자 응답에 연결합니다. native PanResponder 스와이프, 3초 처리, 계정 분리/만료, 실패 보존, 검색, 이메일/암호 재설정, 완료 참고, 동기화 선택, 내 데이터 JSON 다운로드를 확인합니다. 원격 DB 프로토콜 테스트는 실제 libSQL HTTP 클라이언트를 로컬 서버에 연결합니다. 실제 사용자 데이터/메일/API를 시험용으로 변경하지 않습니다.

iOS의 `.hbc` 번들은 IPA/서명된 앱/실기기 테스트가 아닙니다. 아이폰 기기와 계정 승인이 필요한 항목은 아래 운영 문서의 체크리스트로 남겨두었습니다.

## 12. 다음 AI가 바로 할 일

### 새 채팅에서 바로 사용할 지침

이 문서를 duckduck 프로젝트의 인계 자료로 읽고 이어서 작업하세요. continuation-guide.md → liquid-glass-navigation.md → 공통 원칙v1.1을 먼저 읽고3절 현재 상태·14절 변경·실제 GitHub main을 대조하세요. 최초 이름 dot이 아닌 duckduck/덕을 쓰고, 사용자의 기존 AI 설정은 복사하지 않습니다. AI·Slack 구현은 최신 사용자 요청으로 보류를 해제했고 서버 키·권한·실계정 확인은 남아 있습니다. 붙여넣기 목록 초안·동의 기반 AI 분석은 구현되었고 채팅 중심 통합은 최신 사용자 방향입니다. 예약 브리핑·날씨는 2026-11-13 사용자 정정으로 문서 대기를 해제했고 docs/scheduled-messages-2026-11-13.md를 따릅니다. Duo는 본문 안쪽 오른쪽이 아니라 **물리 카메라가 있는 맨 오른쪽 열**에 내비게이션을 둔다. 접힘·펼침 모두 그 열 아래에 세로5개 탭, 카메라/상태 표시 아래에는 실제 복귀·닫기 경로에서만 원형 ‹를 표시한다. 상·하 안전 여백8pt,64×272pt 묶음·52pt 조작·28pt 아이콘을 유지한다. 펼친 가로 화면은 왼쪽 캘린더 고정·오른쪽 최초 Todo이며 탭 선택은 오른쪽만 바꾼다. 펼친 세로 화면과 접힌 화면은 선택 중인 화면 하나를 본문 전체에 표시한다. 회전·접힘 시 현재 탭·입력·편집·캘린더 월·스크롤을 보존한다. 일반 iPhone은 기존 하단 탭이다. 기존 5개 탭·단순한 Todo·42칸 달력·스와이프/3초 되돌리기·완료 기록 참고 규칙을 보존하세요. 최신 TDS 스타일과 동작 줄이기 지원을 유지하세요.

다음 실행 순서는 최신 공개 댓글 확인 → 소스/실제 Render·iOS 빌드 버전 대조 → 요청된 수정 또는 새 iOS 빌드·TestFlight 실기기 검증입니다. Expo 프로젝트는 thepmpo/duckduck-donknow이고 앱 폴더는 mobile입니다. 사용자는 이후 디자인·메모·카운트다운 빌드의 Apple 업로드도 확인했으며 실제21번43378603322·1f7dc5d의 무료Mac/Apple업로드와 사용자Glass외형확인을 확인했습니다. 이번 수정은21이후이며Render 최신배포는각기록의실제ID/SHA로확인합니다. 이전 빌드·배포 설명과 구분하고 실계정 AI 가동은 별도로 확인합니다. App Store 공개 완료로 오해하지 마세요. Google OAuth 테스트 계정 제한과 일반 사용자 공개 승인도 별도 확인 대상입니다.

실제 작업에는 연결된 GitHub 저장소 소스와 필요한 도구/계정 접근이 추가로 필요합니다. 문서를 읽는 것만으로 코드·계정 권한이 자동 제공되지 않습니다. 읽기/브라우저 도구가 없어 문서를 열지 못하면 HTML 파일 또는 본문을 요청하세요. 로그인 비밀번호·토큰은 채팅으로 요청하지 말고, 계정 인증은 사용자가 해당 서비스의 보안 화면에서 수행하게 하세요. 접근 실패를 서비스 장애로 단정하지 마세요.

수정한 뒤 변경 내용·관련 파일·검증·실제 배포 상태를 docs/change-log.md와 이 HTML에 반드시 갱신하세요. 전체 실행 지침은 17절, 환경/보안 설정은 데이터·보안·설정·검증 부분, 실제 작업 문서 전문은 18절에 포함되어 있습니다. 모르는 운영 상태는 성공으로 추정하지 말고 확인 전으로 유지하세요.

### 이어받기 절차

1. 이 페이지의 최신 상태와 GitHub main, 실제 배포 커밋을 대조한다. 현재 디렉터리의 AGENTS.md를 읽는다.
2. 사용자가 새 댓글/수정 요청을 알려주면 접근 가능한 해당 페이지와 댓글을 먼저 읽는다. 도구가 없으면 읽었다고 주장하지 않고 댓글 내용/캡처를 요청한다.
3. 실제 계정·기기에서 남아 있는 확인을 코드 작업과 구분해 실행한다. 제공 업체 키를 채팅으로 요구하지 않는다.
4. 반복 구현하지 않는다. 이미 통과한 Google Tasks 읽기 흐름과 세션/저장 보호를 유지한다.
5. 수정 요청을 요청→결정→변경 파일→검증→배포 상태로 기록한다. 사용자 계정/데이터를 추정하거나 강제로 덮어쓰지 않는다.
6. 댓글 답글/알림을 자동으로 보내거나 백그라운드 감시를 하고 있다고 말하지 않는다. 사용자 요청이 있을 때 확인하고 대화로 결과를 보고한다.
7. AI·Slack 구현 보류 해제와 별도의 키/권한 활성화 상태를 구분한다. 붙여넣기 기반 구현과 채팅 중심 후속 통합을 구분하고, 브리핑·날씨는 사용자 간략 문서를 기다린다. 무료 우선 조건을 유지한다. 아이폰 출시는 사용자 요청으로 진행 중이다. 도구/계정/하드웨어로 막힌 항목은 정확하게 밝힌다.

## 13. 외부 HTML에서 댓글로 수정 요청하기

공개 문서 주소는 https://duckduck-test.onrender.com/project 입니다. 배포 후 문서와 이미지 {{COUNT}}개를 별도 파일 없이 읽을 수 있습니다. 하단의 댓글 영역에서 덕 계정으로 로그인하고 이메일 인증을 마친 뒤 요청을 남깁니다.

- 각 절/이미지의 수정 요청 버튼으로 위치를 지정할 수 있습니다.
- 댓글은 서버 DB에 저장되며 작성자만 수정·삭제·반영 확인할 수 있습니다.
- 본문과 댓글은 링크를 가진 사람에게 공개됩니다. 이메일·비밀키·개인정보를 적지 않습니다. 표시 이름은 직접 정하며 계정 이메일을 자동 공개하지 않습니다.
- 댓글을 남긴 뒤 AI에게 페이지 주소와 댓글 위치를 알려주세요. 자동 감시는 하지 않습니다.
- AI의 네트워크 접근이 막히면 ‘AI에 전달할 댓글 복사’로 열린 요청을 복사해 대화에 붙여넣을 수 있습니다. 50개 이후 요청은 다음 페이지에서 확인합니다.
- 공개 읽기 API: https://duckduck-test.onrender.com/api/project/comments?status=open
- Notion 연결/업로드는 이 HTML 사용에 필요하지 않습니다.

## 14. 변경 이력과 상태 기록

{{CHANGELOG}}

### Git 커밋 이력

{{HISTORY}}

- 새 범위의 실제 외부 연결·아이폰 기기 확인: 아직 완료로 표시하지 않음.
- 이번 확장 코드: {{SHORT}}에 저장. 실제 Render 반영은 수동 배포/Live 확인 필요.
- 새 수정은 이 절에 날짜, 요청, 결정, 관련 커밋, 테스트, 실제 배포 확인을 이어서 기록한다.

## 15. 모든 이미지 — {{COUNT}}개

아래는 현재 저장소에서 생성·보관한 이미지와 앱 리소스 **전체**입니다. 파일별 SHA-256과 크기는 `docs/asset-manifest.json`에도 있습니다. 테스트 화면은 실제 사용자 자료가 아니라 격리된 계정/예시 데이터입니다. 오래된 웹 프로토타입과 현재 모바일 기반 화면을 구분합니다.

사용자가 Google/Render 설정 중 대화에 첨부한 외부 스크린샷 원본은 현재 작업 공간에 파일로 없으므로 포함했다고 주장하지 않습니다. 그 과정에서 확인된 설정과 오류 내용은 위 기록에 정리했습니다. 생성 이미지/로컬 파일은 아래 목록에 모두 포함했습니다.

{{GALLERY}}

## 16. 정적 미리보기와 소스

- `artifacts/duckduck-preview.html`: 서버 없이 여는 초기 체험판. 실제 클라우드 연결/AI 동작 확인용이 아님.
- `artifacts/screens.html`: 단계별 화면 모음.
- 전체 소스 ZIP에는 코드, 잠금 파일, 문서, 테스트, 이미지, 정적 미리보기가 들어간다.
- node_modules, Git 내부 정보, 실제 DB/백업, .env, 키/토큰, 생성된 배포 번들은 포함하지 않는다.

## 17. 실행 가능한 AI 지침 전문

{{AGENTS}}

## 18. 운영·기획·연결 문서 전문

아래는 분실 없이 다른 AI에게 넘기기 위한 문서 원문 묶음입니다. 예전 단계의 설명은 최신 상태 표와 실제 코드에 비추어 해석합니다. 링크를 열지 않아도 기본 지침과 절차를 읽을 수 있도록 이 한 페이지에 포함했습니다.

{{DOCUMENTS}}
'''
history = subprocess.check_output(['git','log','--reverse','--format=%h %s'],cwd=ROOT,text=True).strip()
gallery = []
labels={'mobile-calendar-events-fixture':'일정·할 일 분리와 시간 표시 · 테스트','mobile-assistant-action-fixture':'비서 초안 확인과 Todo 실행 · 테스트','mobile-assistant-ai-fixture':'AI 근거·Todo 제안 · 모의 응답','mobile-completion-countdown-fixture':'완료 3→1 카운트다운 · 체험 화면','mobile-todos':'할 일','mobile-notes-fixture':'메모·글머리표·닫기 손잡이','mobile-todo-density-fixture':'한 화면에 8개 · 목록 밀도 확인','mobile-calendar':'캘린더','mobile-duckduck':'덕 첫 화면','mobile-log':'완료 기록','mobile-profile':'내정보','mobile-record-search':'기록 찾기','mobile-duck-draft':'할 일 초안','mobile-auth':'로그인','mobile-services':'서비스 연결','mobile-reminder':'알림 설정','mobile-kakao-paste':'대화 붙여넣기','mobile-kakao-share':'공유','mobile-apple-reminders':'아이폰 미리 알림','mobile-task-sync-fixture':'Google 완료 동기화 · 테스트','mobile-google-tasks-fixture':'Google 가져오기 · 테스트','mobile-completed-reference-fixture':'완료 기록 참고 · 테스트','mobile-external-search-fixture':'외부 기록 검색 · 테스트'}
for item in manifest:
    name=labels.get(Path(item['path']).stem,Path(item['path']).stem.replace('-',' '))
    gallery += [f"### {name}", f"파일: `{item['path']}`", f"분류: {item['category']} · {item['bytes']:,} bytes · SHA-256 `{item['sha256']}`", f"![{item['path']}]({RAW+item['path']})", '']

def appendix(path):
    original = (ROOT/path).read_text()
    lines=[];fence=False
    for line in original.splitlines():
        if line.startswith('```'):fence=not fence
        if not fence and re.match(r'^#{1,5} ',line):line='##'+line
        if not fence:
            def link(match):
                image_prefix,label,target=match.groups()
                if '://' in target or target.startswith('#') or target.startswith('mailto:'):return match.group(0)
                local=(ROOT/path).parent/target
                try:relative=local.resolve().relative_to(ROOT).as_posix()
                except ValueError:return match.group(0)
                destination=RAW+relative if image_prefix and any(item['path']==relative for item in manifest) else f'{REPO}/blob/main/{relative}'
                return f'{image_prefix}[{label}]({destination})'
            line=re.sub(r'(!?)\[([^\]]+)\]\(([^)]+)\)',link,line)
        lines.append(line)
    return f'### 原文 / {path}\n\n'+'\n'.join(lines)

documents=['docs/calendar-events-motion-2026-11-14.md','docs/calendar-events-motion-qa-2026-11-14.md','docs/calendar-year-overview-2026-11-14.md','docs/calendar-year-qa-2026-11-14.md','docs/calendar-navigation-2026-11-14.md','docs/calendar-navigation-qa-2026-11-14.md','docs/calendar-navigation-review-2026-11-14.md','docs/calendar-viewport-2026-11-13.md','docs/calendar-viewport-qa-2026-11-13.md','docs/calendar-refinement-2026-11-13.md','docs/calendar-refinement-qa-2026-11-13.md','docs/duck-website-brief-2026-11-13.md','docs/calendar-apple-reference-2026-11-13.md','docs/calendar-workspace-2026-11-13.md','docs/calendar-ux-audit-2026-11-13.md','docs/continuation-guide.md','docs/liquid-glass-navigation.md','docs/navigation-glass-correction-2026-11-13.md','docs/functional-completion-2026-11-13.md','docs/scheduled-messages-2026-11-13.md','docs/ux-ui-fixes-2026-11-12.md','docs/ux-ui-audit-2026-11-12.md','docs/functional-workstream-2026-11-12.md','docs/assistant-chat-feedback-2026-11-12.md','docs/product-design-chat-audit-2026-11-12.md','docs/release-readiness-2026-11-12.md','docs/iphone-duo-support.md','docs/tooling-and-documentation.md','docs/figma-baseline-review-2026-11-12.md','docs/duckduck-privacy-policy-draft.md','docs/duckduck-support-draft.md','docs/ai-office-capabilities.md','docs/ai-office-role-guides.md','docs/ai-office-shared-work.md','docs/ai-office-development.md','docs/ai-office-phone.md','docs/ai-office-control.md','docs/ai-office-macos.md','docs/ai-office-usage.md','docs/ai-office-login-repair.md','docs/ai-office-jjk-theme.md','docs/ai-office-local-install.md','docs/ai-office-handoff.md','docs/ai-office-knowledge.md','docs/ai-office-ready.md','docs/ai-office-approval-gate.md','docs/ai-office-setup.md','docs/ai-office-tone-summary.md','docs/ai-office-ux-analysis.md','docs/reusable-product-design-principles.md','docs/current-ui-comparison.md','docs/workspace-studio-evaluation.md','docs/assistant-actions.md','docs/testflight-automation.md','docs/product-direction.md','docs/test-deployment.md','docs/connect-google.md','docs/remaining-activation.md','docs/remote-recovery.md','docs/operations.md','docs/public-project.md','docs/daily-document-automation.md','docs/ios-release.md','docs/design-guide.md','docs/tds-analysis.md','mobile/README.md']
body=body.replace('{{DATE}}',DATE).replace('{{SHORT}}',CODE[:7]).replace('{{COMMIT_LINK}}',REPO+'/tree/'+CODE).replace('{{COUNT}}',str(len(manifest))).replace('{{GALLERY}}','\n'.join(gallery)).replace('{{HISTORY}}','```text\n'+history+'\n```').replace('{{CHANGELOG}}',re.sub(r'^(#{1,4}) ',r'##\1 ',(ROOT/'docs/change-log.md').read_text(),flags=re.M)).replace('{{AGENTS}}',appendix(Path('AGENTS.md'))).replace('{{DOCUMENTS}}','\n\n'.join(appendix(Path(path)) for path in documents))
# Put the reader's decisions ahead of engineering reference material.
daily=(ROOT/'docs/daily-updates.md').read_text()
daily=re.sub(r'<!-- daily:.*? -->', '', daily)
daily=re.sub(r'^(#{1,4}) ',r'##\1 ',daily,flags=re.M)
body=body.replace('### Git 커밋 이력', '### 저녁 7시 자동 정리\n\n'+daily+'\n\n### Git 커밋 이력')
order=[(1,'덕은 어떤 서비스인가요'),(3,'지금 어디까지 되었나요'),(14,'최근 변경과 매일 기록'),(2,'화면과 사용 흐름'),(15,'화면 미리보기와 이미지'),(13,'댓글로 수정 요청하기'),(12,'다음 할 일과 AI 이어받기'),(4,'서비스와 관리 바로가기'),(5,'개발 구조와 파일 지도'),(6,'데이터와 보안'),(7,'환경 변수'),(8,'연결과 동기화'),(9,'운영·백업·복구'),(10,'오류와 해결 기록'),(11,'검증과 실행 명령'),(16,'소스와 정적 미리보기'),(17,'AI 개발 지침 전문'),(18,'전체 참고 문서')]
pieces=re.split(r'(?=^## \d+\. )',body,flags=re.M)
sections={int(re.match(r'^## (\d+)\.',piece)[1]):piece for piece in pieces[1:]}
body=pieces[0]+''.join(re.sub(r'^## \d+\. [^\n]+',f'## {i}. {title}',sections[old],count=1) for i,(old,title) in enumerate(order,1))
number_map={old:i for i,(old,_) in enumerate(order,1)}
body=re.sub(r'(?<!\d)(\d+)절',lambda m:str(number_map.get(int(m[1]),int(m[1])))+'절',body)
body=body.replace('14번', '3번').replace('6–11절', '9–15절')
(ROOT/'docs/notion-handoff.md').write_text(body)
import_md=body
for item in manifest:import_md=import_md.replace(RAW+item['path'],item['import_path'])
with zipfile.ZipFile(OUT/'duckduck-notion-import.zip','w',zipfile.ZIP_DEFLATED) as archive:
    archive.writestr('duckduck-handoff.md',import_md)
    for item in manifest:archive.write(ROOT/item['path'],item['import_path'])

# Standalone HTML preview with embedded images; Markdown ZIP is preferred for Notion import.
inline_md=body
for item in manifest:
    suffix=Path(item['path']).suffix.lower();mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon'}[suffix]
    inline_md=inline_md.replace(RAW+item['path'],'data:'+mime+';base64,'+base64.b64encode((ROOT/item['path']).read_bytes()).decode())
def inline(text):
    text=html.escape(text)
    text=re.sub(r'!\[([^\]]*)\]\(([^)]+)\)',lambda m:f'<figure><img alt="{m[1]}" src="{m[2]}"><figcaption>{m[1]}</figcaption></figure>',text)
    text=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',r'<a href="\2">\1</a>',text)
    text=re.sub(r'`([^`]+)`',r'<code>\1</code>',text)
    return re.sub(r'\*\*(.+?)\*\*',r'<strong>\1</strong>',text)
html_parts=[];fence=False;code=[];table=False
for line in inline_md.splitlines():
    if line.startswith('```'):
        if fence:html_parts.append('<pre><code>'+html.escape('\n'.join(code))+'</code></pre>');code=[]
        fence=not fence;continue
    if fence:code.append(line);continue
    is_table=line.startswith('|') and line.endswith('|')
    if table and not is_table:html_parts.append('</tbody></table></div>');table=False
    if is_table:
        if re.match(r'^\|[\s:|\-]+\|$',line):continue
        if not table:html_parts.append('<div class="table"><table><tbody>');table=True
        html_parts.append('<tr>'+''.join('<td>'+inline(cell.strip())+'</td>' for cell in line.strip('|').split('|'))+'</tr>');continue
    heading=re.match(r'^(#{1,6}) (.*)',line)
    if heading:level=len(heading[1]);html_parts.append(f'<h{level}>'+inline(heading[2])+f'</h{level}>')
    elif line.startswith('!['):html_parts.append(inline(line))
    elif line.startswith('> '):html_parts.append('<blockquote>'+inline(line[2:])+'</blockquote>')
    elif line.strip():html_parts.append('<p>'+inline(line)+'</p>')
if table:html_parts.append('</tbody></table></div>')
style='body{font-family:system-ui,sans-serif;max-width:1040px;margin:0 auto;padding:38px 22px;color:#263346;line-height:1.8;background:#f7f8fa}h1{font-size:30px}h2{margin-top:54px;border-bottom:1px solid #dbe3ef;padding-bottom:12px}h3{margin-top:32px}p,td{overflow-wrap:anywhere}a{color:#246bd9}blockquote{border-left:4px solid #3182f6;margin:18px 0;padding:12px 18px;background:#edf4ff}code{background:#edf1f7;padding:2px 5px;border-radius:4px;font-size:12px}pre{background:#edf1f7;padding:18px;overflow:auto}pre code{padding:0}figure{margin:24px 0;background:white;border-radius:18px;padding:16px;text-align:center}img{max-width:100%;max-height:880px;object-fit:contain}figcaption{font-size:12px;color:#76879b}.table{overflow-x:auto}table{border-collapse:collapse;width:100%;background:white}td{border:1px solid #dbe3ef;padding:10px;vertical-align:top}tr:first-child{font-weight:600;background:#edf4ff}'
(OUT/'duckduck-handoff.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>duckduck 인계 문서</title><style>'+style+'</style><body>'+'\n'.join(html_parts)+'</body></html>')
# Published HTML uses the same full document, with persistent account-owned feedback.
project = (OUT/'duckduck-handoff.html').read_text()
# Keep the online document small; immutable images load only near the viewport.
asset_dir = ROOT/'public/project-assets'
asset_dir.mkdir(exist_ok=True)
for item in manifest:
    data = (ROOT/item['path']).read_bytes()
    suffix = Path(item['path']).suffix.lower()
    filename = item['sha256'] + suffix
    (asset_dir/filename).write_bytes(data)
    encoded = base64.b64encode(data).decode()
    project = re.sub(r'src="data:[^;]+;base64,'+re.escape(encoded)+r'"', 'loading="lazy" decoding="async" width="960" height="720" src="/project-assets/'+filename+'"', project)
toc_groups = [
    ('먼저 볼 내용', 1, 4), ('화면과 수정 요청', 5, 6),
    ('이어가기·바로가기', 7, 8), ('개발 구조와 설정', 9, 12),
    ('운영과 문제 해결', 13, 16), ('AI 지침과 전체 자료', 17, 99),
]
groups = [[] for _ in toc_groups]
section_index = 0
sub_index = 0
current = None
current_group = 0
def section_heading(match):
    global section_index, sub_index, current, current_group
    level, content = int(match[1]), match[2]
    title = re.sub('<[^>]+>', '', content)
    if level == 2:
        numbered = re.match(r'^(\d+)\.', html.unescape(title))
        if numbered:
            number = int(numbered[1])
            anchor = 'section-'+str(number-1)
            current_group = next(i for i, (_, low, high) in enumerate(toc_groups) if low <= number <= high)
            current = {'title':title, 'anchor':anchor, 'children':[]}
            groups[current_group].append(current)
        else:
            anchor = 'subsection-'+str(sub_index)
            sub_index += 1
            if current is not None:current['children'].append((anchor, title, 3))
    else:
        anchor = 'subsection-'+str(sub_index)
        sub_index += 1
        if current is not None:
            current['children'].append((anchor, title, level))
    return f'<h{level} id="{anchor}">{content}</h{level}>'
project = re.sub(r'<h([234])>(.*?)</h\1>', section_heading, project)
toc = []
for (label, _, _), sections in zip(toc_groups, groups):
    entries = []
    for section in sections:
        link = '<a href="#'+section['anchor']+'">'+section['title']+'</a>'
        if section['children']:
            children = ''.join('<a class="toc-small toc-depth-'+str(level)+'" href="#'+anchor+'">'+title+'</a>' for anchor, title, level in section['children'])
            entries.append('<details class="toc-section"><summary>'+link+'</summary><div class="toc-children">'+children+'</div></details>')
        else:
            entries.append('<div class="toc-section">'+link+'</div>')
    toc.append('<details class="toc-group"'+(' open' if len(toc)<3 else '')+'><summary>'+label+'</summary>'+''.join(entries)+'</details>')
before,_,rest=project.partition('<body>')
content,_,after=rest.partition('</body>')
chunks=re.split(r'(?=<h2 id="section-\d+">)',content)
readable=[chunks[0]]
for chunk in chunks[1:]:
    heading,body_part=chunk.split('</h2>',1)
    number=int(re.match(r'<h2 id="section-(\d+)">',heading)[1])+1
    if number==2:
        body_part='<p class="status-intro">기존 Google·Notion 읽기와 백업 복원은 확인했어요. 비서의 자료 분석·Todo 제안·확인 후 실행을 추가했고 사용자가 첫 실제 AI 답변을 확인했어요. 인사는 짧게, 업무 요청은 근거와 확인을 거치도록 보완했어요. 실제 업무 저장과 외부 쓰기 확인은 남아 있어요. TestFlight는 사용자 확인 1.0.0 (12)와 이후 빌드 요청을 구분해 기록해요. 공식 톤 원칙은 앞쪽에서 확인할 수 있어요.</p>'+re.sub(r'(<div class="table">.*?</table></div>)',r'<details class="status-details"><summary>기능별 자세한 상태 보기</summary>\1</details>',body_part,flags=re.S)
    if number==3:
        change_count=[0]
        def fold_change(match):
            change_count[0]+=1
            return '<details class="change-entry"'+(' open' if change_count[0]==1 else '')+'><summary id="'+match[1]+'">'+match[2]+'</summary><div class="change-content">'+match[3]+'</div></details>'
        body_part=re.sub(r'<h4 id="([^"]+)">(.*?)</h4>(.*?)(?=<h[1-4] |$)',fold_change,body_part,flags=re.S)
        body_part=re.sub(r'(<h3[^>]*>Git 커밋 이력</h3>)(<pre>.*?</pre>)',r'<details class="technical-section"><summary>개발 커밋 이력 펼쳐보기</summary>\1\2</details>',body_part,flags=re.S)
    if number>=9:
        body_part='<details class="technical-section"><summary>개발 자료 펼쳐보기</summary><div class="technical-content">'+body_part+'</div></details>'
    elif number==5:
        cards=re.split(r'(?=<h3 )',body_part)
        body_part=cards[0]+'<div class="image-grid">'+''.join('<article class="screenshot-card">'+card+'</article>' for card in cards[1:])+'</div>'
    readable.append('<section class="document-section">'+heading+'</h2>'+body_part+'</section>')
project=before+'<body>'+''.join(readable)+'</body>'+after
project = project.replace('<body>', '<body><aside class="project-toc" aria-label="목차"><details open><summary>목차</summary><nav>'+''.join(toc)+'<a href="#feedback">댓글 · 수정 요청</a></nav></details></aside>', 1)
project = project.replace('<title>', '<meta name="robots" content="noindex"><meta name="document-version" content="'+CODE+'"><link rel="stylesheet" href="/project-comments.css"><title>',1)
project = project.replace('<body>', '<body><nav class="project-nav"><strong>🦆 duckduck</strong><a href="/">덕 앱</a><a href="#feedback">댓글·수정 요청</a><button id="feedback-selection" type="button">선택한 문장에 댓글</button></nav>',1)
feedback = r'''<section id="feedback" class="feedback"><h2>댓글 · 수정 요청</h2><p class="feedback-warning">이 문서와 댓글은 링크를 가진 사람이 볼 수 있어요. 비밀번호·API 키·개인정보는 적지 마세요. 덕 계정으로 로그인하고 이메일 인증을 마치면 작성할 수 있어요.</p><p>문서의 절이나 이미지 옆 수정 요청 버튼으로 위치를 지정하세요. 댓글을 남긴 뒤 AI에게 이 페이지 주소와 댓글 위치를 알려주세요. 자동으로 감시하거나 수정하지는 않습니다.</p>
<p id="feedback-status" role="status" aria-live="polite"></p>
<form id="feedback-login"><h3>덕 계정으로 로그인</h3><label>이메일<input id="feedback-email" type="email" required autocomplete="username"></label><label>비밀번호<input id="feedback-password" type="password" required autocomplete="current-password"></label><button id="feedback-signin" type="submit">로그인</button><a href="/">계정 만들기·이메일 인증은 덕 앱에서</a></form>
<div id="feedback-authenticated" hidden><p>로그인되어 있어요. 내 댓글만 수정·삭제·반영 확인할 수 있어요.</p><button id="feedback-signout" type="button">로그아웃</button></div><p id="feedback-verify" hidden>덕 앱 내정보에서 이메일 인증을 먼저 완료해주세요.</p>
<form id="feedback-composer" hidden><label>공개 표시 이름<input id="feedback-name" value="작성자" maxlength="40" required></label><label>문서 위치<input id="feedback-section" value="문서 전체" maxlength="160" required></label><label>참고할 문장·이미지<textarea id="feedback-quote" maxlength="500"></textarea></label><label>댓글·원하는 수정 사항<textarea id="feedback-body" maxlength="2000" required placeholder="현재 동작과 원하는 변경을 적어주세요."></textarea></label><button id="feedback-submit" type="submit">댓글 저장</button></form>
<label>댓글 상태<select id="feedback-filter"><option value="all">전체</option><option value="open">열린 요청</option><option value="resolved">반영 확인</option></select></label><button id="feedback-refresh" type="button">댓글 새로고침</button><button id="feedback-copy" type="button">AI에 전달할 댓글 복사</button><textarea id="feedback-copy-text" aria-label="AI에 전달할 요청" readonly hidden></textarea><p><a href="/api/project/comments?status=open">AI에게 전달할 열린 댓글 목록(JSON)</a></p><div id="feedback-list"></div><button id="feedback-more" type="button" hidden>댓글 더 보기</button></section><script src="/project-comments.js" defer></script>'''
project = re.sub(r'<h1>duckduck — 제품.*?</h1>', '', project, count=1)
project = project.replace('실제 Notion에 생성된 페이지가 아니라 <strong>한 페이지 가져오기 원본</strong>입니다.', '외부에서 읽고 댓글로 수정 요청을 남길 수 있는 프로젝트 문서입니다.')
hero='<header class="project-hero"><span class="eyebrow">DUCKDUCK PROJECT</span><h1>덕과 함께 만드는 하루</h1><p>지금까지 만든 것, 바뀐 것, 다음에 할 일을 한곳에서 확인하세요.</p><div class="hero-meta"><span>문서 갱신 '+DATE+'</span><a href="#section-2">최근 변경 보기 →</a></div><div class="overview-cards"><a href="#section-1"><span>현재 상태</span><strong>iPhone 1.0.0 (28)</strong><small>Apple 업로드 성공 · 새 수정은 다음 빌드</small></a><a href="#section-4"><span>화면 미리보기</span><strong>다섯 탭을 한눈에</strong><small>할 일 · 캘린더 · 덕 · log · 내정보</small></a><a href="#feedback"><span>함께 다듬기</span><strong>수정할 점을 남겨주세요</strong><small>문서 위치와 연결되는 댓글</small></a></div></header>'
# Add the hero after the top utility nav, not inside the sidebar's navigation.
marker='<button id="feedback-selection" type="button">선택한 문장에 댓글</button></nav>'
project=project.replace(marker,marker+hero,1)
project = project.replace('</body>',feedback+'</body>')
# Give navigation its own grid column rather than overlaying the document.
aside = re.search(r'<aside class="project-toc".*?</aside>', project).group(0)
project = project.replace(aside, '', 1)
project = project.replace('<body>', '<body class="project-layout">'+aside+'<main class="project-content">', 1)
project = project.replace('</body>', '</main></body>', 1)
(ROOT/'public/project.html').write_text(project)
(OUT/'IMPORT-README.txt').write_text('개인 Notion의 올바른 계정/워크스페이스에 로그인한 뒤 설정 또는 사이드바의 가져오기 → Markdown & CSV에서 duckduck-notion-import.zip을 선택하세요.\nZIP에는 문서 한 개와 전체 이미지 폴더가 있습니다. 가져온 뒤 이미지 수와 마지막 지침 절이 있는지 확인하세요.\n이 ZIP은 저장소 기술 인계용입니다. 사용자용 기록은 선택한 개인 Notion의 duckduck · 제품·개발 기록에 별도로 작성하며, 비공개 페이지를 이 ZIP에 복제하지 않습니다.\nHTML은 전체 이미지가 포함된 오프라인 미리보기입니다.\nsource.zip은 별도의 전체 소스 인계용이며 Notion에 함께 가져오지 않아도 됩니다.\nAPI 키·토큰·DB·node_modules·Git 내부 데이터는 포함하지 않습니다.\n')
with zipfile.ZipFile(OUT/'duckduck-notion-import.zip') as archive:
    assert len([name for name in archive.namelist() if name.endswith('.md')])==1
    assert len([name for name in archive.namelist() if name.startswith('images/')])==len(manifest)
    for item in manifest:assert hashlib.sha256(archive.read(item['import_path'])).hexdigest()==item['sha256']
print(json.dumps({'codeCommit':CODE,'images':len(manifest),'notionZipBytes':(OUT/'duckduck-notion-import.zip').stat().st_size,'htmlBytes':(OUT/'duckduck-handoff.html').stat().st_size,'documentBytes':len(body.encode())},ensure_ascii=False))

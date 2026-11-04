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
RAW = f'https://raw.githubusercontent.com/sjfieni/donknow/{CODE}/'
images = sorted(p for folder in ('artifacts', 'mobile/assets') for p in (ROOT/folder).rglob('*') if p.suffix.lower() in {'.png','.jpg','.jpeg','.gif','.webp','.svg','.ico'})
priority = ['artifacts/mobile-todos.png','artifacts/mobile-calendar.png','artifacts/mobile-duckduck.png','artifacts/mobile-log.png','artifacts/mobile-profile.png']
images.sort(key=lambda p: (0, priority.index(p.relative_to(ROOT).as_posix())) if p.relative_to(ROOT).as_posix() in priority else (1 if p.name.startswith('mobile-') else 2, p.as_posix()))
manifest = []
for path in images:
    relative = path.relative_to(ROOT).as_posix()
    category = '앱 초기 리소스·최종 브랜딩 미확정' if relative.startswith('mobile/assets/') else '체험 데이터 메모/시트 검증' if 'notes-fixture' in path.stem else '체험 데이터 8개 목록 밀도 검증' if 'density-fixture' in path.stem else '모의 응답 테스트 화면' if 'fixture' in path.stem else '네이티브 기반 웹의 격리 테스트 화면' if path.name.startswith('mobile-') else '단계별 개요 또는 초기 웹 프로토타입'
    manifest.append({'path':relative, 'category':category, 'bytes':path.stat().st_size, 'sha256':hashlib.sha256(path.read_bytes()).hexdigest(), 'import_path':'images/'+relative.replace('/','__')})
(ROOT/'docs/asset-manifest.json').write_text(json.dumps({'generatedAt':DATE,'codeCommit':CODE,'imageCount':len(manifest),'images':manifest},ensure_ascii=False,indent=2)+'\n')
body = r'''# duckduck — 제품·구현·운영·이미지·AI 인계 문서

> 기준: {{DATE}} · 한국 시간 · 기능 코드 {{SHORT}} · 문서와 GitHub 소스가 이어받기의 기준입니다.
> 실제 Notion에 생성된 페이지가 아니라 **한 페이지 가져오기 원본**입니다. 아래 상태 표에서 구현/자동 테스트/실사용 확인을 구분합니다.

## 1. 이 프로젝트가 하려는 일

서비스 이름은 **duckduck**, 편하게 **덕**이라고 부릅니다. 처음에는 dot이라는 이름과 현재 ChatGPT 안에서 쓰는 dot의 느낌을 이야기했지만, 최종 이름을 duckduck으로 바꿨습니다. 기존 개인 설정을 복사하는 일이 아니라 대화에서 할 일을 정리하고 실행으로 이어주는 개인 비서를 만드는 일입니다.

목표는 iPhone 앱이고, Toss처럼 간결하고 읽기 쉬운 화면을 참고합니다. Google, Slack, Notion의 승인된 정보를 이용하고, 덕에서 정리한 내용을 Todo로 옮깁니다. 사용자가 정하지 않은 상세 화면은 작업하면서 함께 결정합니다.

**2026-11-04 요청으로 AI·Slack 구현 보류를 해제**했습니다. 연결한 자료→근거가 붙은 오늘 할 일 제안→Todo 카드→사용자 확인 후 실행 흐름을 추가했습니다. AI 분석은 서버 키·모델·활성화 설정이 있어야 하며, 외부 쓰기는 공급자 권한 재승인이 필요합니다. 아직 실계정 AI 분석·새 쓰기·네이버 접속 성공을 확인한 것은 아닙니다. 기존 기능 빌드의 Apple 업로드는 사용자 확인했고 이번 확장은 별도 서버 배포와 새 iOS 빌드가 필요합니다. 자세한 범위는 [비서 실행 안내](assistant-actions.md)를 읽습니다.

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
| Slack | 읽기·전송·자기 메시지 수정 구현 | 보류 해제. chat:write 승인과 실계정 검증 필요 |
| 아이폰 미리 알림 | 읽기·가져오기·완료 참고·수동 양방향 상태 맞추기 구현 | 실제 아이폰 권한/ID/상태 확인 필요 |
| 기기 알림 | 미래 시간·권한·예약·변경·취소 구현 | 실제 아이폰 잠금/재실행/권한 검증 필요 |
| 개인 데이터 내보내기 | 웹 다운로드·네이티브 파일 공유 구현 | 웹 실동작 테스트, 네이티브 공유는 기기 확인 필요 |
| 원격 암호화 백업·복원 | 실제 수동 백업·임시 DB 복원 검증 성공 | Actions run 40996926840 녹색 사용자 확인. 정기 schedule 성공은 아직 미확인 |
| iPhone 출시 | 첫 IPA 생성·App Store Connect 업로드 성공 | build 37a454bf-afdf-49aa-ab21-70fec36ba28a / 소스 400e9d5. TestFlight 설치·심사·공개는 미확인 |
| 최신 디자인·모션 | 구현·웹/타입/iOS JS 검증 통과 | source 5d096f2 이후. Render 최신 배포 및 새 iOS 서명 빌드 반영 확인 필요 |
| AI 비서 | 동의 기반 자료 분석·근거·작업 제안 구현 | AI 키/모델/명시적 활성화 필요. 모의 응답 검증과 실제 모델 호출은 구분 |
| 네이버 메일 | IMAP/SMTP 어댑터 구현·기본 비활성화 | 앱 비밀번호·계정별 설정·실제 호스트 접속 검증 필요 |
| 범용 붙여넣기 자동 추출 | 별도 백로그 | 기존 수동 붙여넣기 유지 |

**GitHub에 저장된 최신 기능이 Render에 자동으로 배포되지는 않습니다.** Render의 자동 배포는 꺼져 있습니다. 이번 확장 기능은 최신 커밋으로 수동 배포한 후 실제 화면에서 확인해야 합니다. 에이전트의 공개 사이트 직접 접속은 환경 네트워크 제한으로 막힌 적이 있으므로 사용자 확인과 자동 검증을 혼동하지 않습니다.

## 4. 현재 주소와 관리 위치

- 앱: https://duckduck-test.onrender.com
- 서버 상태: https://duckduck-test.onrender.com/api/health
- 코드: https://github.com/sjfieni/donknow
- 전체 소스 다운로드: https://github.com/sjfieni/donknow/archive/refs/heads/main.zip
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

이 문서를 duckduck 프로젝트의 인계 자료로 읽고 이어서 작업하세요. 과거 기록보다 3절의 현재 상태, 14절의 최신 변경, 실제 GitHub main을 우선하세요. 최초 이름 dot이 아닌 duckduck/덕을 쓰고, 사용자의 기존 AI 설정은 복사하지 않습니다. AI·Slack 구현은 최신 사용자 요청으로 보류를 해제했고 서버 키·권한·실계정 확인은 남아 있습니다. 범용 붙여넣기 자동 추출은 별도 백로그이며 iPhone 출시는 진행 중입니다. 기존 5개 탭·단순한 Todo·42칸 달력·스와이프/3초 되돌리기·완료 기록 참고 규칙을 보존하세요. 최신 TDS 스타일과 동작 줄이기 지원을 유지하세요.

다음 실행 순서는 최신 공개 댓글 확인 → 소스/실제 Render·iOS 빌드 버전 대조 → 요청된 수정 또는 새 iOS 빌드·TestFlight 실기기 검증입니다. Expo 프로젝트는 thepmpo/duckduck-donknow이고 앱 폴더는 mobile입니다. 사용자는 이후 디자인·메모·카운트다운 빌드의 Apple 업로드도 확인했으며 정확한 설치 번호는 미확인입니다. 이번 비서 확장은 새 서버 배포와 iOS 빌드가 필요합니다. App Store 공개 완료로 오해하지 마세요. Google OAuth 테스트 계정 제한과 일반 사용자 공개 승인도 별도 확인 대상입니다.

실제 작업에는 연결된 GitHub 저장소 소스와 필요한 도구/계정 접근이 추가로 필요합니다. 문서를 읽는 것만으로 코드·계정 권한이 자동 제공되지 않습니다. 읽기/브라우저 도구가 없어 문서를 열지 못하면 HTML 파일 또는 본문을 요청하세요. 로그인 비밀번호·토큰은 채팅으로 요청하지 말고, 계정 인증은 사용자가 해당 서비스의 보안 화면에서 수행하게 하세요. 접근 실패를 서비스 장애로 단정하지 마세요.

수정한 뒤 변경 내용·관련 파일·검증·실제 배포 상태를 docs/change-log.md와 이 HTML에 반드시 갱신하세요. 전체 실행 지침은 17절, 환경/보안 설정은 데이터·보안·설정·검증 부분, 실제 작업 문서 전문은 18절에 포함되어 있습니다. 모르는 운영 상태는 성공으로 추정하지 말고 확인 전으로 유지하세요.

### 이어받기 절차

1. 이 페이지의 최신 상태와 GitHub main, 실제 배포 커밋을 대조한다. 현재 디렉터리의 AGENTS.md를 읽는다.
2. 사용자가 새 댓글/수정 요청을 알려주면 접근 가능한 해당 페이지와 댓글을 먼저 읽는다. 도구가 없으면 읽었다고 주장하지 않고 댓글 내용/캡처를 요청한다.
3. 실제 계정·기기에서 남아 있는 확인을 코드 작업과 구분해 실행한다. 제공 업체 키를 채팅으로 요구하지 않는다.
4. 반복 구현하지 않는다. 이미 통과한 Google Tasks 읽기 흐름과 세션/저장 보호를 유지한다.
5. 수정 요청을 요청→결정→변경 파일→검증→배포 상태로 기록한다. 사용자 계정/데이터를 추정하거나 강제로 덮어쓰지 않는다.
6. 댓글 답글/알림을 자동으로 보내거나 백그라운드 감시를 하고 있다고 말하지 않는다. 사용자 요청이 있을 때 확인하고 대화로 결과를 보고한다.
7. AI·Slack 구현 보류 해제와 별도의 키/권한 활성화 상태를 구분한다. 범용 붙여넣기 자동 추출은 별도 백로그이며 무료 우선 조건을 유지한다. 아이폰 출시는 사용자 요청으로 진행 중이다. 도구/계정/하드웨어로 막힌 항목은 정확하게 밝힌다.

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
                target=match.group(2)
                if '://' in target or target.startswith('#') or target.startswith('mailto:'):return match.group(0)
                local=(ROOT/path).parent/target
                try:relative=local.resolve().relative_to(ROOT).as_posix()
                except ValueError:return match.group(0)
                return f'[{match.group(1)}]({REPO}/blob/main/{relative})'
            line=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',link,line)
        lines.append(line)
    return f'### 原文 / {path}\n\n'+'\n'.join(lines)

documents=['docs/product-direction.md','docs/test-deployment.md','docs/connect-google.md','docs/remaining-activation.md','docs/remote-recovery.md','docs/operations.md','docs/public-project.md','docs/daily-document-automation.md','docs/ios-release.md','docs/design-guide.md','docs/tds-analysis.md','mobile/README.md']
body=body.replace('{{DATE}}',DATE).replace('{{SHORT}}',CODE[:7]).replace('{{COMMIT_LINK}}',REPO+'/tree/'+CODE).replace('{{COUNT}}',str(len(manifest))).replace('{{GALLERY}}','\n'.join(gallery)).replace('{{HISTORY}}','```text\n'+history+'\n```').replace('{{CHANGELOG}}',re.sub(r'^(#{1,4}) ',r'##\1 ',(ROOT/'docs/change-log.md').read_text(),flags=re.M)).replace('{{AGENTS}}',(ROOT/'AGENTS.md').read_text()).replace('{{DOCUMENTS}}','\n\n'.join(appendix(Path(path)) for path in documents))
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
        body_part='<p class="status-intro">기존 Google·Notion 읽기와 백업 복원은 확인했어요. 비서의 자료 분석·Todo 제안·확인 후 실행을 추가했으며 키·쓰기 권한·새 서버/아이폰 빌드 확인이 남아 있어요.</p>'+re.sub(r'(<div class="table">.*?</table></div>)',r'<details class="status-details"><summary>기능별 자세한 상태 보기</summary>\1</details>',body_part,flags=re.S)
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
hero='<header class="project-hero"><span class="eyebrow">DUCKDUCK PROJECT</span><h1>덕과 함께 만드는 하루</h1><p>지금까지 만든 것, 바뀐 것, 다음에 할 일을 한곳에서 확인하세요.</p><div class="hero-meta"><span>문서 갱신 '+DATE+'</span><a href="#section-2">최근 변경 보기 →</a></div><div class="overview-cards"><a href="#section-1"><span>현재 상태</span><strong>아이폰 출시 진행 중</strong><small>첫 빌드 업로드 · 새 디자인 빌드 필요</small></a><a href="#section-4"><span>화면 미리보기</span><strong>다섯 탭을 한눈에</strong><small>할 일 · 캘린더 · 덕 · log · 내정보</small></a><a href="#feedback"><span>함께 다듬기</span><strong>수정할 점을 남겨주세요</strong><small>문서 위치와 연결되는 댓글</small></a></div></header>'
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
(OUT/'IMPORT-README.txt').write_text('개인 Notion의 올바른 계정/워크스페이스에 로그인한 뒤 설정 또는 사이드바의 가져오기 → Markdown & CSV에서 duckduck-notion-import.zip을 선택하세요.\nZIP에는 문서 한 개와 전체 이미지 폴더가 있습니다. 가져온 뒤 이미지 수와 마지막 지침 절이 있는지 확인하세요.\n이 패키지는 아직 실제 Notion 페이지를 만들거나 계정을 조회하지 않았습니다.\nHTML은 전체 이미지가 포함된 오프라인 미리보기입니다.\nsource.zip은 별도의 전체 소스 인계용이며 Notion에 함께 가져오지 않아도 됩니다.\nAPI 키·토큰·DB·node_modules·Git 내부 데이터는 포함하지 않습니다.\n')
with zipfile.ZipFile(OUT/'duckduck-notion-import.zip') as archive:
    assert len([name for name in archive.namelist() if name.endswith('.md')])==1
    assert len([name for name in archive.namelist() if name.startswith('images/')])==len(manifest)
    for item in manifest:assert hashlib.sha256(archive.read(item['import_path'])).hexdigest()==item['sha256']
print(json.dumps({'codeCommit':CODE,'images':len(manifest),'notionZipBytes':(OUT/'duckduck-notion-import.zip').stat().st_size,'htmlBytes':(OUT/'duckduck-handoff.html').stat().st_size,'documentBytes':len(body.encode())},ensure_ascii=False))

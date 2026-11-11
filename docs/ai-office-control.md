# AI 사무실 업무 입력·보고서 확인·휴대폰 비공개 접속

2026-11-11 사용자 요청: 외부 휴대폰 연결을 설정하고, 매번 명령창을 쓰지 않는 업무 입력창을 연결한다. 기존 첫 검토가 ‘미결 의사결정’으로 표시되는 이유와 결과 확인 방법도 제공한다.

## Windows에서 바로 진행

[업무 입력·휴대폰 추가 파일 다운로드](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-control.zip)

1. 기존 **2-start.cmd**로 켠 사무실 서버 창을 유지한다.
2. 새 ZIP을 압축 해제하고 **9-open-office.cmd**를 실행한다. 사무실·DB·로그인을 재설치하거나 초기화하지 않는다.
3. 새 창의 **프로젝트 → 요청 작성 → 요청 내용 확인 → 확인하고 실행**을 사용한다. 입력하거나 초안을 확인하는 것만으로 AI가 실행되지 않는다. 실제 실행은 계정의 모델 사용량을 소비한다.
4. **진행·보고서**에 기존 첫 검토도 표시된다. 내용을 읽고 **보고서 확인 완료**를 누르면 해당 제품 검토만 완료 처리한다. 개발·병합·배포를 승인하는 버튼이 아니다.
5. 실행 중에는 **중지**로 해당 작업만 취소할 수 있다. 새 업무·개발 권한이 생기지 않는다.

현재 입력창은 **읽기 전용 제품 검토/조사/제안**용이다. 실제 소스 수정·외부 계정 쓰기·자동 개발 위임·병합·배포는 잠겨 있다. 코드 수정 요청도 이번 실행에서는 수정안을 보고하며 직접 파일을 바꾸지 않는다. 검토 결과를 인계서로 확정하고 개발 범위를 별도 승인하는 후속 UI/개발 실행 연결은 남아 있다.

## ‘미결 의사결정’의 의미와 처리

현재 사무실 정책은 최종 응답이 완전히 끝나고 프로세스가 성공 종료하면 결과를 tasks.result에 저장하고 status=review로 두어 사용자 확인을 기다린다. 이 상태 자체가 실패는 아니다. 그러나 사용자가 본 실제 보고서 본문은 이 대화에 전달되지 않아 그 내용까지 확인한 것으로 기록하지 않는다. pending/보고서 없음/실행 오류는 성공으로 표시하지 않는다.

기본 사무실의 decision-inbox 조회는 추가 의견 취합/알림 부작용을 포함한다. 새 연결 화면은 이 경로를 그대로 호출하지 않고 **보고서 확인 대기 목록**만 계산한다. 기존 회의/위임 결정 reply와 임의 API 쓰기는 프록시에서 차단한다.

보고서 확인 완료는 본인 인증과 CSRF 검증 후 BEGIN IMMEDIATE 트랜잭션으로 다음을 확인한다.

- review 상태, 제품 검토 permission=consumed, 권한 스냅샷의 프로젝트/담당자/요청과 현재 작업 일치
- 사용자가 본 보고서 SHA256이 현재 result와 같음, 담당자가 해당 작업을 실행 중이지 않음
- 조건부 UPDATE가 정확히1건일 때만 done/완료시각·감사 완료·로그를 함께 기록

보고서는 보존하고, 권한을 재발급/재사용하거나 새 작업·회의·병합을 실행하지 않는다. 과거 성공 검토이므로 consumed 권한의 TTL 경과만으로 결과 수락을 막지 않는다. 완료 이벤트는 기존 runtime에 직접 방송하지 않으므로 새 입력창은4초 폴링하며 기존 사무실 탭은 필요 시 새로고침한다.

## 휴대폰 설정

1. 같은 추가 파일의 **10-phone-connect.cmd**를 실행한다.
2. PC에 Tailscale이 없으면 [공식 Windows 다운로드](https://tailscale.com/download/windows)가 열린다. 설치와 본인 계정 로그인 후10번 파일을 다시 실행한다. 계정의 개인 무료 플랜 사용 가능 범위는 공급자 화면에서 확인하고 새 유료 자원을 자동 활성화하지 않는다.
3. 휴대폰에도 [공식 Tailscale 앱](https://tailscale.com/download)을 설치하고 **동일한 계정**으로 로그인해 연결한다.
4. PC 창에 출력된 **PRIVATE OFFICE ADDRESS**의 실제 HTTPS 주소를 휴대폰 브라우저에서 연다. 예시 주소가 아니라 본인 PC에서 출력된 주소를 사용한다.

PC는 켜져 있고 절전 상태가 아니어야 하며 WSL·기존 사무실 서버·새 입력 서버 창이 모두 실행 중이어야 한다. 전원만 켜면 자동 서비스가 실행되는 구성은 아직 아니다. 네트워크·계정 정책에 따라 HTTPS 활성화/접근 권한은 본인이 Tailscale의 공식 화면에서 승인해야 한다. 로그인 링크/키/ChatGPT 코드/control-access.key를 채팅에 보내지 않는다.

**현재 실제 Windows·Tailscale 계정·휴대폰 간 접속은 사용자 실행 후 확인해야 한다.** 이 환경에서 모의 CLI 검사나390px 브라우저가 통과한 것을 실제 외부 접속 성공으로 기록하지 않는다.

## 비공개 연결 경계

- 원래 사무실8790·문서함8791은 loopback을 유지한다. 새 게이트웨이8810도127.0.0.1에만 바인딩한다. Windows에서 localhost 접근을 실제 health 확인하며 실패해도0.0.0.0/공용 포트 공개로 우회하지 않는다.
- Tailscale **Serve HTTPS443 → http://127.0.0.1:8810**만 설정한다. Funnel은 사용하지 않는다. 기존 Serve/Funnel/다른 서비스 설정이 있으면 보존하고 중단하며 reset하지 않는다. 설정 전후와 루트 경로를 확인한다.
- 현재 helper는 검증한 identity 삭제/설정 동작이 있는 Tailscale1.90.0 이상을 요구한다. [공식 v1.90 소스](https://github.com/tailscale/tailscale/blob/v1.90.0/ipn/ipnlocal/serve.go)에서 입력 identity 제거 후 Funnel은 별도 표시, private Serve는 검증한 User-Login을 부여하고 원래 Host를 유지함을 확인했다.
- 게이트웨이는 정확한 .ts.net HTTPS Host와 설치한 PC 계정의 Tailscale-User-Login을 고정한다. 다른 계정/identity 없는 태그 기기/헤더 누락/모든 Funnel 표시를 거부한다. HTTPS 경로/계정 pin은 state/private-access.json(0600)에 보관하며 다른 계정 설정을 자동 덮지 않는다.
- loopback의 Tailscale proxy와 같은 PC의 프로세스는 신뢰 경계 안이다. 악성 로컬 프로세스까지 방어하는 격리 제품으로 설명하지 않는다. OS 계정·설치 앱 보안도 유지해야 한다.
- PC 브라우저는 시작 파일이 읽은 별도 private 키의 URL fragment로1회 연결한다. fragment는 즉시 지우며 서버 접근 로그/Referer에 싣지 않는다. 원래 사무실 owner key·OAuth·API 토큰은 브라우저에 주지 않는다. 이후 HttpOnly/SameSite 세션, 정확한 Origin과 CSRF를 확인한다. 휴대폰은 Tailscale 본인 인증을 매 요청 확인하고 Secure 쿠키를 사용한다.
- 입력창은 보고서/요청을 textContent로 표시한다. native 사무실은 조회 프록시이며 임의 쓰기를 허용하지 않는다. Pixi.js 렌더러에 필요한 unsafe-eval은 native 조회 프레임의 CSP에만 허용하고 제어 입력창에는 허용하지 않는다.

## 작업 실행 경계

새 요청은 프로젝트/담당자/프롬프트/소스 HEAD/문서 revision을 묶는다. 내용 확인 후 명시적 실행 때만 제품 검토 단일 권한을 prepare/approve/run하고 finally에서 master를 잠근다. 개발 잠금은 유지한다. 다른 작업이 실행 중이면 시작하지 않으며 한 게이트웨이의 요청은 직렬 처리한다. 재클릭은 같은 요청을 중복 실행하지 않는다. 네트워크 오류로 실행 여부가 불명확하면 자동 재실행하지 않고 상태 확인을 요구한다. 잠금은 이미 실행 중인 자식을 중지하는 기능과 구분한다.

## 설치·기록·복구

추가 모듈은 /workspace/ai-office/control/versions/<패키지해시>/에 검증된 버전으로 설치한다. 기존 프로젝트 Git/격리 소스/Claw runtime/DB/로그인·암호화 키를 덮지 않는다. 같은 버전의 사용자 수정이나 커스텀 시작 파일이 있으면 보존하고 멈춘다. current.json 포인터만 새 검증 버전으로 바꾼다. 이미 구버전 입력 서버가 켜져 있으면 주 사무실이 아닌 그 입력 서버 창만 종료한 뒤9번을 다시 실행한다.

state/control-requests/*.json은 private 요청·확인 기록이다. state/control-access.key는 OS 소유자의 별도 브라우저 연결키이며 공개 문서/Git/채팅에 넣지 않는다. private-access.json은 본인 Tailnet 주소/로그인 pin이다. 다른 PC/클라우드로 옮길 때 이 키·인증/권한을 그대로 복제하지 말고 새 환경에서 공식 로그인/본인 연결을 구성한다.

## 검증

- 실제 HTTP 게이트웨이+격리 SQLite+모의 backend로 개인 PC 키 연결·CSRF/Origin·권한 경계·기존 보고서 목록·draft는 실행 없음·명시적 단일 실행·중복 방지·보고서 원자 완료/감사·실패/범위 변경 거부를 확인했다. 실제 모델을 호출하지 않았다.
- 입력창의320px mock 브라우저 흐름에서 원문 XSS 차단·확인 전 실행0·실행1·보고서 수락·중지 취소0/승인1·가로 넘침/오류 없음을 확인했다.
- 실제 로컬 앱에 대한 개인 브라우저 연결·390px 입력창·프록시 사무실 canvas를 확인했다. 새 업무/모델은 실행하지 않았다.
- 실제 PowerShell 엔진/모의 Tailscale CLI로 버전·본인 계정·Serve 전후 설정·Funnel 거부·프록시 경로를 확인했다. 실제 고객 Windows Tailscale 계정/휴대폰 연결로 대체하지 않는다.
- 추가 설치기의 해시 검증·멱등성·사용자 수정/시작 파일 보존·DB/인증 바이트 보존을 확인했다.

[Windows 설치](ai-office-local-install.md) · [사용 흐름](ai-office-usage.md) · [인수인계](ai-office-handoff.md) · [Tailscale Serve 공식 안내](https://tailscale.com/docs/features/tailscale-serve)

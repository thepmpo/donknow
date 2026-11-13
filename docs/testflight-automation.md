# iPhone 테스트 수동 빌드·자동 제출

## 2026-11-13 — 네이버 읽기 전용 확정·아이폰 빌드16 요청

사용자 결정으로 네이버는 **받은 메일 읽기 전용**을 유지한다. `NAVER_READ_ONLY=true`를 기존 무료 서버에 병합하고 Blueprint에도 같은 비밀 아닌 값을 기록한다. 읽음 상태 변경·발송·답장을 연결 설정·서버 미리보기/실행·AI/수동 카탈로그에서 막는다. 예전에 저장된 `mailWrite` 권한이나 준비한 실행 초안도 제한을 우회할 수 없으며, 기존 인증·메일 계정·자료를 삭제하거나 다시 저장하지 않는다. 최신 UI는 쓰기 선택을 숨긴다. 기존 설치 앱에 선택칸이 보여도 서버에서 차단되므로 꺼두고 읽기만 연결한다.

[사용자 수동 실행43345083809](https://github.com/thepmpo/donknow/actions/runs/43345083809)는 소스57aee29의 검사 후 **아이폰 빌드16** 요청·자동 제출 예약 접수를 완료했다. [EAS 빌드](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/builds/f2dcece3-7540-4407-b02a-5019579976dd), [제출](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/submissions/a92f2559-01cd-4ca5-8b98-165299799d45). 실제 IPA·Apple 처리·설치는 아직 확인 전이다. 공개 EAS URL은 로그인 없이 정상 상태를 확인하지 못했으므로 실패/완료로 단정하지 않는다. 읽기 전용은 서버 정책으로 이 빌드에도 적용하고, 새 UI만을 위해 추가 EAS 빌드를 요청하지 않는다.

웹·서버 변경은 일반 배포로 반영하며, 설치 앱 코드가 바뀌어 새 아이폰 버전을 테스트할 때만 수동 TestFlight 빌드가 필요하다. 지금 사용자가 버튼을 누른 이유는 작업 환경의 GitHub API 요청 제한이며 매 업무마다 빌드할 필요가 없다. push 자동 EAS 빌드는 계속 꺼둔다. Google·Notion은 설치 후 본인 권한 승인→읽기→시험용 항목/페이지 작성·수정까지 최종 테스트에 포함한다.

[공식 Render 가격](https://render.com/pricing)의 최소 유료 웹 서버는월 US$7부터이며 세금·초과 사용료는 별도다. 네이버 발송을 쓰지 않으므로 무료 플랜을 유지하고 결제·마이그레이션을 실행하지 않는다.

검증: 전체221개 중220통과·실패0·기존 선택1개 제외, 문법·모바일 타입·웹/iOS JS 출력·네이버 전용 읽기 UI·기존 채팅을 통과했다. 전용 회귀에서 이전 인증/권한 보존·읽기 가능·원본 변경0·기존 초안 차단·쓰기 선택 제거·앱 비밀번호 초기화를 확인했다. 이 검사는 모의 계정/공급자이며 운영 네이버 계정 접속 성공과 다르다. 실제 공개 정책 적용은 배포 후 확인한다.

2026-11-13 추가: Deliver scheduled Duck messages는 브리핑 due 작업만OIDC로 호출하며 EAS/Expo 빌드·submit을 호출하지 않는다. 앱 검사/예약 전달/TestFlight 수동 workflow는 서로 다르다. 예약 전달 실행기 관련 파일만 바뀔 때의 연결 검사 push도 TestFlight가 아니다. 최신 Duo 상단 탭·예약/도착 알림은 아이폰에 설치할 새 수동 빌드가 있어야 바뀐다.

## 최신 정책 — 필요할 때만 빌드

사용자가 빌드 한도 절약 방식을 승인했다. 이제 앱 코드를 main에 올려도 EAS 빌드를 자동 요청하지 않는다. 코드 검사는 app-checks에서 자동 수행하며, 아이폰 설치가 필요한 시점에만 이 문서의 수동 실행을 사용한다. 출시 준비는 마지막에 진행한다. [전체 기능 작업 순서](functional-workstream-2026-11-12.md).

## 이전 실행 기록

2026-11-12 새 작업: `dd650f0`의 [43130303497 실행](https://github.com/thepmpo/donknow/actions/runs/43130303497)이 검사 후 EAS build number 13 요청에 성공했다. [빌드 진행](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/builds/1830483a-8fb8-4dc3-a36e-b150f799d29e). `--no-wait`이므로 Swift·IPA·Apple 처리·설치는 별도이며, [실패 재현과 복구·전체 증거](release-readiness-2026-11-12.md)를 읽는다.


2026-11-12 확인: 기존 f76172d의 workflow 실행 `42745583353`과 job `129596764087`은 성공이며, 이는 새로 작성하는 채팅·Duo 코드의 iOS 빌드 성공을 뜻하지 않는다. EAS의 빌드 요청 접수, 실제 Xcode 빌드, Apple 업로드·처리, TestFlight 설치를 구분한다. 실제 확인 근거와 운영 가동 상태는 [최신 출시 점검](release-readiness-2026-11-12.md)을 따른다. 기존 인증·서명·앱 ID는 재생성하지 않는다.

2026-11-10 사용자 확인: f76172d 기준 iPhone workflow 성공, 현재 TestFlight 1.0.0 (12). 에이전트의 EAS/Apple 독립 검증과 구분한다. 아래 초기 등록/미확인 설명은 당시 상태이며 이미 등록된 인증 설정을 재생성하지 않는다. 이번 톤 분석은 문서 변경뿐이므로 새 iOS 빌드를 요청하지 않는다.

`.github/workflows/ios-testflight.yml`은 수동 workflow_dispatch에만 반응한다. 코드 push/PR의 자동 검사는 `.github/workflows/app-checks.yml`이 담당하며 EAS 빌드·제출 명령과 EXPO_TOKEN이 없다. 루트/모바일 잠금 파일로 의존성을 설치하고 서버 문법·단위/API 테스트·모바일 타입 검사·iOS JS export를 통과한 후 EAS production iOS 빌드를 요청하며 성공한 EAS 빌드는 자동으로 App Store Connect에 제출된다. App Store 공개 배포는 하지 않는다.

## 한 번만 등록

1. https://expo.dev/settings/access-tokens 에서 thepmpo 계정의 토큰을 만든다.
2. https://github.com/thepmpo/donknow/settings/secrets/actions 에서 `EXPO_TOKEN` 이름의 repository secret으로 등록한다. 토큰을 채팅·Git·문서에 붙이지 않는다.
3. https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml 에서 **Run workflow → main → Run workflow**로 필요할 때 한 번만 실행한다.

이미 EAS에 저장된 배포 인증서·프로비저닝 프로파일·App Store Connect API 키와 ascAppId를 사용한다. production의 autoIncrement와 remote 버전 소스를 유지한다. 토큰/인증서가 유효한 한 반복 로그인·테스터 재초대가 필요하지 않다. 갱신·회수된 자격 증명이나 Apple 약관·권한 변경은 별도 대응이 필요하다.

## 상태의 의미

GitHub Actions는 `--no-wait`로 빌드 요청 후 종료해 EAS 대기 시간 동안 GitHub 실행 시간을 소모하지 않는다. 따라서 초록 체크는 빌드 요청 접수이지 IPA 생성·Apple 업로드 성공이 아니다. 실제 상태는 https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/builds 에서 확인하고, Apple 처리 후 https://appstoreconnect.apple.com/apps/6829597261/testflight/ios 에서 TestFlight 가능 여부를 확인한다.

EAS/GitHub의 기존 무료 한도를 사용하며 플랜을 올리지 않는다. 자동 검사는 유지하며 설치용 변경을 모은 뒤 필요한 시점에만 수동 빌드를 요청한다. JS export는 원격 EAS 빌드 횟수를 쓰지 않는다. 제출 실패나 EAS 장애는 Expo 로그를 확인한다. 토큰을 아직 등록하지 않았다면 명확한 오류로 중단한다. 기존 빌드13·14·15 생성/자동 제출 요청 성공을 확인했으며 실제 EAS/Apple 완료 여부는 각 결과를 따로 확인한다.

서버 변경은 서버 배포가 별도로 필요하다. 디자인 가이드는 `/design-guide`, 인계 문서는 `/project`이다.

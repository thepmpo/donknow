# 다른 앱을 만들 AI가 먼저 읽을 문서

사용자 확정: 다음 앱에서 핵심 기능에 집중할 수 있도록 docen의 공통 기반을 상세 문서/실제 소스/검수 절차로 재사용한다. 2026-11-22 작성.

## 1. 가장 먼저 구분

- **docen을 이어서 수정**: [docen 통합 기준](DOCEN-START-HERE.md)과 적용 AGENTS.md를 읽고 기존 제품/계정/키/식별자를 보존한다.
- **별개 새 앱 제작**: 이 문서의 읽는 순서로 진행한다. docen의 운영 권한·계정·DB·키·Duo·가격·탭·브랜드를 새 앱의 기본값으로 복사하지 않는다. 새 저장소의 AGENTS.md에 새로운 제품 계약을 적는다.

현재 코드는 docen 구현이다. 범용 앱 생성기/독립 SDK가 이미 완성됐다고 해석하지 않는다. 새 앱에서 재사용할 공통 정책/부품과 도메인 의존성을 목록으로 구분했다. 실제 결제·소셜로그인·완전offline·모든OS검수가 이미 제공되는 것은 아니다.

## 2. 읽는 순서

1. [공통 앱 설계서](reusable-app-foundation.md): 인증/세션/UI/키보드/저장/동기화/알림/설정/운영/배포31개 주제.
2. [모듈 목록](app-foundation-module-map.md): 실제 파일·검증 근거·필수 의존·새 앱 교체 사항.
3. [홈페이지/웹/어드민 매뉴얼](docen-product-build-playbook.md): 시각 구성·배경·반응형·실제 API/권한/운영 흐름.
4. [새 앱 계약 양식](templates/new-app-project-contract.md): 제품별 핵심 기능/자료/정책/식별자 정의.
5. [출시 검수표](app-foundation-release-checklist.md): 공통 기반 연결 후 상태별 검수.
6. [다음 AI 인계 양식](templates/new-app-ai-handoff.md): 변경/검증/가동/미완료를 전달.
7. [전체 문서 지도](docen-document-map.md): 관련 분야 원본/역사/QA 추가 읽기.

추출할 인터페이스/상태/핵심 기능 연결 경계는 [연결 계약 예시](reusable-app-integration-contracts.md)를 함께 읽는다. 이는 새 설계 예시이며 현재 범용 SDK의 API라고 오해하지 않는다.

## 3. 구현 순서

새 제품 계약/identity → 공통auth/transport/shell분리 → 토큰/폼/키보드/상태 → 합성 핵심 흐름 → 실제domain/repository/API → 안전한 저장/원본 → 설정/알림/개인정보/운영자 → 테스트 → 새 서버/native 설정 → 실제 배포/기기 검수 → 문서 전달.

처음부터 모든 docen 기능을 복제하지 않는다. 예: 단순 독서 앱에는 외부 원본 동기화/AI/Duo가 필수가 아니다. 메일/예약/AI를 쓰지 않으면 provider·budget 모듈은 제외하되 계정/자료/권한/오류/보안 검수는 유지한다.

## 4. 포함된 ZIP과 실제 빠진 것

문서용 docen-ai-handoff.zip에는 전체 기술문서·지침·모듈JSON·양식이 있다. 전체용 docen-complete-handoff.zip에는 Git에 저장된 소스/문서/테스트/lock/합성 이미지 자산과 PACKAGE-START-HERE/manifest가 있다. ZIP의 commitSHA와 manifest의 파일 hash를 확인한다.

둘 다 실제 운영DB·키·세션·토큰·개인첨부·node_modules·Git이력·서명인증서·실제 연결 권한은 전달하지 않는다. 받은 AI/개발자는 자기 개발환경 의존성을 설치하고 새 제품용 안전한 설정을 준비해야 한다. 문서에 없는 권한이 ZIP으로 생기지는 않는다.

## 5. 완료라고 말하기 전

모듈의 코드경로/정책추출·통제테스트·production웹·native빌드·스토어처리·실계정/실기기를 각각 기록한다. 핵심 화면 하나가 보이는 것과 운영 가능한 제품은 다르다. [검수표](app-foundation-release-checklist.md)의 필요한 항목에 실제 증거를 남기고 미실행은 그대로 표시한다.

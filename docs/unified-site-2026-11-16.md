# 소개·요금제·덕 웹 통합 — 2026-11-16

대표 주소 / 는 기존 영상 소개 메인이다. 메뉴에서 #pricing으로 이동하면 같은 문서 안의 무료/프로27,900원/맥스준비중 기능표를 확인한다. iframe이나 별도 요금제 헤더/푸터를 넣지 않는다. ‘덕 열기’와 무료 시작은 같은 탭의 /app으로 연결한다. 앱 ME와 지원/개인정보에서 소개·요금제로 돌아온다. 기존 /pricing 링크도 대표 화면의 요금제로 이어진다.

같은 origin의 쿠키/세션과 AsyncStorage 키·API 주소를 유지한다. 계정/자료를 옮기거나 삭제하지 않는다. OAuth 성공 안내의 웹 복귀만 /app으로 맞추며 native 복귀 URI는 유지한다. 라이트를 제거한 무료/프로/맥스 준비중 비교와 결제 준비 상태·원가 한도를 바꾸지 않는다.

Docker는 소개 빌드와 기존 Expo 웹을 같은 무료 서비스에서 제공한다. LANDING_DIR=/app/site, WEB_DIR=/app/mobile-web. 공개 자산은 제한한 경로/실제 파일 경계를 검사하고 영상 Range·HEAD·스트리밍을 지원한다. API/기존 앱 자산은 별도 기존 처리 경로를 유지한다.

로컬 실제 프로덕션 소개/Expo 빌드와 타입 검사를 통과했다. Chromium에서는 소개·요금표의 한 DOM, h1 하나·iframe 없음, 메뉴/모바일320/390/768/1440, 같은 탭 앱 진입, 로그인과 저장 Todo 보존, ME 복귀, 이전 요금제 링크의 HTTP redirect와 대상 anchor를 확인했다. 공개 소개는 API/모델을 호출하지 않았고 page/static asset 오류0, 캡처5장이 생성됐다. 공개 경로/Range/HEAD/소유 계정/심볼릭 링크 이탈/비공개 경로 검사3개도 통과했다. 실제 결제/native 기기/실계정 공급자 쓰기 검수는 아니다.

이후 로컬 저장 공간 부족과 실행 환경 연결 중단으로 전체 Docker smoke와 전체 테스트를 마무리하지 못했다. 캡처와 일부 미커밋 파일은 /workspace의 원본에 있으며 현재 접근 불가라 원격에 업로드했다고 보고하지 않는다. 연결된 GitHub를 통해 같은 구현을 보존한 PR에서 CI로 다시 검증한 뒤 기존 Render에 반영한다. 실제 결과는 최종 기록으로 구분한다. 01:00Z 고정 fixture 시각과 실제 시각이 달라 웹훅 재시도 검사가 흔들리는 문제는 Date만 fixture 시각으로 고정하고, 실제 자식 HTTP 서버의 서명에는 실제 시각을 쓰도록 바로잡았다. 검증 assertion은 줄이지 않는다.

소개 화면의 참고 영상/라이선스 표기와 합성 제품 시연 구분은 유지한다. 새 유료 자원·결제·native 빌드·원본 쓰기를 활성화하지 않는다.

## 실제 원격 검증·게시 결과

- PR https://github.com/thepmpo/donknow/pull/1 는 2026-11-16 10:39 KST에 병합했다. 게시 소스는 `233bdb4e62617a17ddc7b84b6147e3e04cceaaf1`이다.
- CI https://github.com/thepmpo/donknow/actions/runs/43787352935 에서 root check, 테스트405통과/실패0/기존조건부2skip, 소개 build, Sites packaging4통과, mobile typecheck/check:native/iOS JavaScript export가 모두 통과했다. 이는 Apple 서명·업로드나 새 native 빌드 실행을 뜻하지 않는다. 기존 interaction script의 버튼/QR 링크 기대값도 새 진입 구조에 맞췄으나 환경 연결 중단 이후 그 전체 영상 시나리오를 다시 실행하지는 못했다.
- 기존 무료 Render의 자동 배포 off 상태를 확인하고 수동 deploy `dep-dbt5tmec6qcc73aqtt70`를 한 번 실행했다. Docker build가 성공했고, 2026-11-16 10:41:03 KST에 위 source SHA로 `live`가 됐다. 실제 앱 로그의 port10000 listening과 service live도 확인했다. 새 유료 리소스·결제·native 배포는 실행하지 않았다.
- 공개 대표 https://duckduck-test.onrender.com/ 는 소개+#pricing, 앱 진입은 같은 탭 /app, 과거 /pricing은 /#pricing redirect다. 브라우저 로컬 검증과 서버 경로 테스트의 결과를 배포 후 실계정 검증처럼 보고하지 않는다. 공개 사이트 직접 읽기는 웹 도구가 “not accessible via this tool”로 응답하여 이 환경에서 게시 후 본문/실기기 재접속 검사는 완료하지 못했다.
- 실행 환경 연결이 복구되지 않아 build-handoff 생성기 재실행과 로컬 캡처5장 업로드, 전체 컨테이너 smoke는 여전히 미완료다. 기존 handoff 산출물의 생성 시각/빌드 SHA를 임의로 바꾸지 않는다. 최신 게시/검증 결과는 이 기록을 정본으로 남긴다.

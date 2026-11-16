# Todo·원가 제한 빌드 실행 기록 — 2026-11-16

## 검사 완료

406개 중405통과/실패0/기존 선택1제외,103문법·타입 검사,web/iOS JavaScript export,실제 로컬 모듈을 쓰는 iOS prebuild/provider/Swift import 사전 검사가 통과했다. JavaScript/prebuild 성공은 Mac archive/서명/Apple 업로드가 아니다.

실제 Expo/Chromium 신규19장·기존 reference26장·일반 앱 전체·Duo 회귀가 통과했다. 모두 합성 계정/API/Duo 기하이며 실기기/실계정 검수가 아니다. [디자인과 비용 계약](todo-organization-budget-2026-11-16.md).

## 첫 소스와 서버 배포 — 후속 수정 이력 포함

최초 구현 소스 aab764955b5b9ab26849d9c584f44fd0fd7e3823, 화면/공개 인계 포함 main fb8d482bf693e28d3fa1b3c2406c20ead813de7b. [GitHub 검사43777563448](https://github.com/thepmpo/donknow/actions/runs/43777563448)는 success다. 서버/모바일 단위·타입·실제 iOS prebuild/provider/import·iOS JavaScript export가 이 소스에서 통과했다.

기존 Render free duckduck-test/srv-dbgpc0ff3r2c73abc7e0, 워크스페이스 tea-dbgoqa0ae00c73d1q47g, main, autoDeploy off를 확인하고 수동 배포했다. dep-dbt4dtuc6qcc73amugj0는 fb8d482를23:57:43 UTC에 시작해23:58:44 UTC에 live가 됐다. 새 인스턴스 v8n9q의 port10000 시작과 Your service is live 로그를 확인했다. HTTP health path는/api/health이며 Render readiness를 통과했다. 이 실행 환경의 직접HTTP 요청은403, 웹 도구도 접근 불가여서 독립적인 운영 endpoint 응답 본문은 확인하지 못했다. 이를 앱 자체의403이나 정상 실계정 동작으로 단정하지 않는다. 무료 plan·키/인증/서명·데이터를 바꾸지 않았다.

## TestFlight — 시작 요청이 권한으로 차단됨

최신 main fb8d482 push 후 ios-testflight workflow407665801에 새 workflow_dispatch를 요청했으나 GitHub POST가 Forbidden으로 거부됐다. 신규 run/서명IPA/Apple 업로드는 만들어지지 않았다. 연결된 GitHub 도구도 새 workflow dispatch를 제공하지 않는다. 옛 소스 Re-run/자동 push trigger/유료 runner/서명·권한 우회로 대신하지 않았다.

사용자가 [iPhone 무료 Mac 빌드](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml)에서 Run workflow → main → Run workflow를 누르면 최신 코드로 실행한다. 추가 조회로 이전1.0.0(42)/43769831520/소스ca3244d의 Apple 업로드 성공(22:42:03 UTC)을 확인했다. 실제 Mac job132983283238의 buildNumber41→42와 App Store Connect 업로드 로그를 읽었다.42에는 이번 Todo 시안/원가 제한 aab7649가 포함되지 않는다. JavaScript export를 새 iPhone 빌드 성공으로 보고하지 않는다.

## 비용·결제 상태

Pro27,900원·월 사용자별 AI원가 최대4,000원 정책과 사전 예약 차단을 구현했다. 실제 StoreKit/영수증·구독/정산 자동 연동은 미구현이며 신규 예산은0원이다. 정산 확인 없는 계정은 무료 수신만 제공한다. 이전 OpenAI credit_balance_exhausted는 해결/충전하지 않았다. 무조건 무손실/무제한 AI/무료 서버 상시 실시간을 보장하지 않는다. 자세한 조건별 현금흐름은 계약 문서에 있다.

## 후속 검수

Google Calendar가 실제로 반환하는 www.google.com/calendar/event 링크만 추가 허용하고 같은 호스트의 일반 redirect URL은 거부하는 검사를 추가했다. 전체406개 중405통과/실패0/기존 선택1제외다. 공개 문서 생성은 이미지를 한 번에 치환하도록 줄였으며 기존 산출물5종의 SHA-256이 전부 같음을 확인했다. 후속 소스/문서는 같은 무료 서비스에 반영하며, 실행 상태는 [Render 배포 목록](https://dashboard.render.com/web/srv-dbgpc0ff3r2c73abc7e0)을 따른다.

## 최종 반영 확인 — 2026-11-16 00:06 UTC

최종 앱/공개 문서 소스 c50845e25af3e3b44a92c7a65bcae17d51899332. [GitHub 검사43778265351](https://github.com/thepmpo/donknow/actions/runs/43778265351)는 success다. Render 최종 dep-dbt4hh9srm7s73a73hig는 해당 소스를00:05:25 UTC에 시작해00:06:16 UTC에 live로 반영했다. 새 인스턴스 fp6sb의 port10000 시작 및 live 로그를 확인했다. 직접 운영HTTP 본문 검증의 접근 제한은 앞 절과 같고 정상 AI/실계정 확인으로 대체하지 않는다.

이 마지막 기록만 추가한 문서 commit은 앱 코드를 바꾸거나 새 native를 실행하지 않는다. 새 TestFlight는 여전히 시작되지 않았고, 사용자가 최신main의 Run workflow를 눌러야 한다. iPhone42에는 이번 수정이 없으며 빌드 번호를 임의로43 성공으로 표시하지 않는다.

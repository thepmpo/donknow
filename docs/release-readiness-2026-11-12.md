# 덕 운영·백업·iPhone 출시 확인 — 2026-11-12

확인 기준: 2026-11-12 09:29 KST. 새 기능 구현과 운영 서버 설정, 실제 사용자 계정 성공을 구분한다. 이번 확인은 공개 GET 요청과 GitHub 실행 기록 조회만 사용했다. 실제 계정 생성·AI 호출·메일 발송·DB 변경·재배포·빌드 재실행은 하지 않았다.

## 지금 확인된 것

| 항목 | 실제 증거 | 판정 |
|---|---|---|
| 운영 사이트 | [덕 열기](https://duckduck-test.onrender.com/)에 로그인 화면 표시, [/api/health](https://duckduck-test.onrender.com/api/health)에서 `ok:true` | 공개 서비스 응답 확인 |
| AI | [/api/capabilities](https://duckduck-test.onrender.com/api/capabilities)의 `assistant:false` | 운영 AI 비활성 상태. 코드 구현과 별개로 서버 설정 필요 |
| 이메일 인증 서비스 | 같은 응답의 `mail:true` | 설정됨. 이번 확인에서 인증메일 실제 수신은 시험하지 않음 |
| Google·Notion | `configured:true` | 서버 OAuth 설정됨. 사용자 연결·쓰기 권한·실제 쓰기 성공은 별도 |
| Slack | `configured:false` | 서버 OAuth 설정이 준비되지 않음 |
| 외부 작업 API | `externalActions:true` | 실행 API 제공 상태. 실제 외부 계정 쓰기 성공이라는 뜻은 아님 |
| 공개 문서·댓글 | [/project](https://duckduck-test.onrender.com/project)에 11월 12일 사무실 스킬/PDF/Gmail 기록 확인. 열린 댓글 조회는 `items:[]`, `nextCursor:null` | 이전 환경 프록시 차단 기록과 달리 이번에는 별도 읽기 도구로 공개 내용을 확인 |

첫 공개 조회 중 HTTP 503이 발생했지만 후속 조회에서 홈과 올바른 `/api/health` 경로가 응답했다. 일시 지연의 원인은 확정하지 않았고 지속 장애로 판정하지 않았다. `/api/assistant/status`는 HTTP 401로 로그인이 필요했다. 로그인하지 않았으며 공개 capability 외의 개인 설정은 읽지 않았다. 현재 응답에는 배포 SHA가 없으므로 이 확인만으로 Render의 정확한 배포 커밋을 확정하지 않는다.

## 정기 백업은 실제 성공 확인

기존 문서에서 미확인이던 **예약 실행 백업·격리 복원 검사**를 확인했다.

- [예약 백업 실행 42924574013](https://github.com/thepmpo/donknow/actions/runs/42924574013): 이벤트 `schedule`, 소스 `f9781961c79ff7f3570758e675e7fb6fec979e2e`, 결과 `success`.
- [backup 작업 130207634681](https://github.com/thepmpo/donknow/actions/runs/42924574013/job/130207634681): 암호화 snapshot 생성, 임시 로컬 DB 복원·무결성 검사, artifact 업로드가 각각 `success`.
- artifact `duckduck-encrypted-42924574013`: 4,636 bytes, 조회 시 미만료. 생성 `2026-11-10T23:35:27Z` = **2026-11-11 08:35:27 KST**, 만료 예정 `2026-11-17T23:35:26Z` = **2026-11-18 08:35:26 KST**.
- digest: `sha256:39de56bb9408701e5a0333072a196543322a160bb670cd1747531b86bdf29f41`.
- workflow 설정은 매일 **03:30 KST**이지만 위 실행 시각은 그와 다르다. 예약 지연 원인은 이번 조회로 확정하지 않는다. 공개 목록에서 #4~#15 예약 성공을 확인했으며, 위 실행보다 새로운 성공 증거는 아직 확보하지 않았다.

암호화 artifact의 내용은 다운로드하거나 복호화하지 않았다. 이미 workflow가 수행한 격리 복원 검사를 읽은 것이며 운영 DB를 새 DB로 전환하는 재난 복구 훈련은 남는다. [전체 백업 목록](https://github.com/thepmpo/donknow/actions/workflows/remote-backup.yml).

## TestFlight: 요청 성공과 실제 Apple 처리를 구분

- [iOS 실행 42745583353](https://github.com/thepmpo/donknow/actions/runs/42745583353): `f76172d058568f1bd27d21f44dc8115edce5ab64` push의 작업 [129596764087](https://github.com/thepmpo/donknow/actions/runs/42745583353/job/129596764087) 전체 단계 성공.
- 서버 검사, 단위/API 검사, 모바일 타입, iOS JS export, EAS 요청 단계 성공을 실제 GitHub API 응답으로 확인했다.
- 실행 로그의 EAS build: [efa906c8-bf5e-4346-bc74-9eec98c36415](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/builds/efa906c8-bf5e-4346-bc74-9eec98c36415).
- 실행 로그의 submission: [33afada9-cc47-4cc0-8b17-0fbb419915c1](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/submissions/33afada9-cc47-4cc0-8b17-0fbb419915c1).
- workflow는 `--no-wait`라 GitHub 성공만으로 IPA 생성·업로드·Apple 처리까지 보장하지 않는다. 공개 EAS build 페이지는 “No internal distribution build exists at this URL”을 반환했고 submission 조회는 timeout이었다. 이는 production 빌드 실패 증거로 해석하지 않는다. EAS 계정/Apple에서 독립 확인이 남는다.
- 이전 사용자 확인은 **TestFlight 1.0.0 (12)**다. 이번에 Apple 계정에서 새로 확인한 값은 아니다. [TestFlight 관리](https://appstoreconnect.apple.com/apps/6829597261/testflight/ios).

GitHub CLI의 Actions API 요청은 `Forbidden`이었지만 연결된 GitHub 도구와 공개 웹에서 위 기록을 읽었다. 개인 토큰을 요구하거나 기존 인증을 교체하지 않았다.

## iPhone Duo 빌드 환경

[Expo 공식 빌드 인프라](https://docs.expo.dev/build-reference/infrastructure/)에서 다음 이미지를 확인했다.

- `macos-tahoe-26.6-xcode-27.1` — 문서의 `latest`, `sdk-58` 별칭. Xcode 27.1 RC (`27A9275`), macOS Tahoe 26.6.2.
- `macos-tahoe-26.6-xcode-27.2`도 목록에 존재한다.
- Xcode 27 이미지에서 iOS 27 앱은 UIKit scene lifecycle을 사용해야 한다. 공식 문서의 SDK 57 안내는 `expo-build-properties`의 `ios.enableSceneSupport`이며, 현재 프로젝트는 SDK 58이므로 SDK 57 설정을 그대로 추가했다고 대응 완료로 판단하지 않는다.

실제 Duo SDK의 API·네이티브 브리지 검사는 별도 구현 기록을 따른다. 이 표는 EAS에서 선택 가능한 문서상 이미지 확인이며, 새 Swift 코드의 실제 Xcode 컴파일·서명·Duo 실기기 검증 결과가 아니다.

## App Store 공개 전 채워야 할 내용

사용자가 공개 운영자 이름 **Kim Sanghyun**, 지원·개인정보 문의 이메일 **thepmpo.official@gmail.com**을 직접 확인했다. 개인 Notion·GitHub 계정 주소를 추정해 사용한 것이 아니다.

- [개인정보처리방침 초안](duckduck-privacy-policy-draft.md): 수집 항목, 동의 기반 외부 자료/AI, 삭제, 실제 코드의 보관 규칙을 정리했다.
- [지원 안내](duckduck-support-draft.md): 로그인·서비스 연결·알림·내보내기·삭제·연락 시 보낼 정보와 확정된 지원 이메일을 준비했다.
- [출시 메타데이터](app-store-metadata.json)에 확정된 운영 주체·공개 지원 이메일과 준비한 `/privacy`, `/support` URL을 반영했다. 시행일은 `null`, 최종 정책 검토는 `false`로 유지한다. `/privacy`는 검토 중인 안내임을 명시하며 아직 시행된 정식 정책으로 제출하지 않는다. `/support`는 실제 연락처와 사용 도움말을 제공한다. 두 URL의 공개 가동은 Render 배포 후 별도 확인한다.
- App Privacy 답변, 개인정보 국외 이전/수탁사 실제 계약·지역·보관 조건, 실기기 스크린샷, 심사 계정·심사 메모는 확정이 필요하다. 현재 웹/fixture 캡처를 실제 iPhone 화면으로 제출했다고 하지 않는다.

## 다음 작업자가 반복 확인하는 방법

```sh
node scripts/check-release-readiness.mjs --offline
node scripts/check-release-readiness.mjs
```

첫 명령은 출시 메타데이터만 읽는다. 두 번째는 추가로 공개 `/api/health`, `/api/capabilities`에 인증 없는 GET 두 건만 보낸다. 계정·토큰·AI 실행·외부 쓰기·배포·설정 변경은 없다. 비밀값이나 임의 응답 본문은 출력하지 않는다.

- 종료 코드 `0`: 검사한 사전 조건에 누락이 없다는 뜻. 실제 AI·외부 쓰기·Apple 심사 성공은 여전히 별도 검증이다.
- 종료 코드 `2`: 메타데이터 누락, 비활성 서버 기능, 접속 미확인 중 하나 이상. 현재 메타데이터에는 의도적으로 미확인 칸이 있어 이 결과가 정상이다.
- 종료 코드 `1`: 진단 도구 자체 실행/파일 형식 오류.

현재 허용된 무료 구성과 원래 DB 암호화 키·OAuth 설정은 유지한다. 운영 AI 활성화에는 기존 Render 설정에서 `AI_ENABLED`, `OPENAI_API_KEY`, `OPENAI_MODEL`의 실제 준비 상태를 확인해야 하며 값은 채팅/문서에 적지 않는다. Slack은 앱 OAuth 설정, Google·Notion 쓰기는 계정 재승인·대상 공유, 네이버는 계정 IMAP/SMTP·앱 비밀번호, Apple 기능은 기기 권한 확인이 필요하다.

검증: `node --test test/release-readiness.test.js` 4개 통과, 진단 스크립트 문법 검사와 `git diff --check` 통과. 오프라인 진단은 미확인 메타데이터를 정확히 표시하고 종료 코드 2로 끝난다. 이 환경의 직접 Node 공개 요청은 `public_request_failed`로 끝나 해당 실행 경로에서는 미확인이다. 위 운영 응답 증거는 별도 TinyFish 읽기 도구로 확인했다.

## 확정된 공개 연락처 반영 후 검증

`node scripts/build-service-pages.mjs`로 `/support`·`/privacy` HTML을 생성한다. 사용자가 확정한 공개 이름·이메일만 사용하며 미확정 연락처나 HTML 삽입은 거절/이스케이프한다. privacy 템플릿은 metadata 플래그만 바꿔도 정식 정책으로 자동 전환되지 않는다. 서버 경로는 고정 파일의 익명 GET/HEAD만 허용하고 POST는 405로 거절한다. 스크립트/폼/프레임을 막는 CSP, 본문 없는 HEAD, 경로 변형/조회 인자 비반사와 로그인 API 보호를 실제 임시 서버에서 확인했다. 출시 진단 4개와 공개 경로/생성 2개, 합계 6개 테스트 통과. 두 페이지의 390px·1280px 브라우저 표시, 연락 링크·초안 표시·가로 넘침 없음도 확인했다. 실제 배포는 수행하지 않았다.

## 2026-11-12 새 반영과 TestFlight CI 추적

구현 `7644621`, 문서 `06cb1e3`을 main에 일반 push하고 원격 SHA 일치를 확인했다. 재조회한 Render `/project`는 이전 문서였으므로 새 변경의 공개 배포는 아직 아니다. 마지막 `/api/health`는 `ok:true`, capability는 AI 비활성·Slack 미설정 그대로다. 첫 재조회 503 후 정상 응답했으며 지속 장애로 확정하지 않는다.

새 [iOS 실행 43129844358](https://github.com/thepmpo/donknow/actions/runs/43129844358)은 `npm test`에서 기존 사무실 동기화 검사 11개가 `office_development_source_filters_require_review`로 실패했다. EAS 요청은 실행되지 않았다. 로컬 기본 환경에서는 통과했지만 임시 글로벌 Git LFS 설정을 주입하면 같은 11개 실패를 재현했다. 임시 테스트 저장소의 시스템/글로벌 Git 설정을 분리하고, 의도적으로 필터를 추가하면 여전히 원본 동기화를 차단하는 회귀를 추가한다. 운영 보호 코드는 완화하지 않는다. 같은 임시 글로벌 LFS 설정에서 해당 파일은 수정 전 25개 중 11개 실패, 수정 후 26개 모두 통과했다. 전체 검사도 CI와 같은 설정에서 203개 중 202개 통과·선택 검사 1개 제외·실패 0개다. 후속 GitHub CI와 EAS/Apple 처리는 별도 확인한다.

수정 커밋 `dd650f094e880b01300b85c27c8f7a253e4628cd`의 [후속 iOS 실행 43130303497](https://github.com/thepmpo/donknow/actions/runs/43130303497)은 **성공**했다. 실제 CI에서 문법·203개 중 202개 통과/1개 선택 제외·타입·iOS JS export·EAS 요청 단계를 통과했다. EAS가 **build number 13** 요청을 접수했다.

- [새 EAS build 1830483a-8fb8-4dc3-a36e-b150f799d29e](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/builds/1830483a-8fb8-4dc3-a36e-b150f799d29e)
- [자동 제출 요청 f4f3ebc8-d182-4c44-a757-537325941f46](https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/submissions/f4f3ebc8-d182-4c44-a757-537325941f46)

이 workflow는 `--no-wait`다. build number 13의 요청 접수를 IPA 생성·Swift 컴파일·Apple 처리·TestFlight 설치 성공으로 표시하지 않는다. 앱 기능 소스는 `7644621`, 빌드 요청의 정확한 소스는 `dd650f0`이다. 기존 확인된 TestFlight 버전 1.0.0 (12)는 새 설치 증거가 생기기 전까지 유지한다.

새 EAS 공개 build 페이지는 “No internal distribution build exists at this URL”, submission은 로그인 필요 응답이었다. production 빌드의 실패로 해석하지 않으며 계정에서 실제 상태를 확인해야 한다.

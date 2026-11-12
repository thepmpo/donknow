# 덕 문서 도구와 디자인·기획·개발 스킬

확인일: 2026-11-12 KST. 사무실 개발은 보류하고 덕 앱 작업을 진행한다. 사용자는 앞으로 매 업무의 진행과 결과를 Notion에 기록하라고 요청했다. 이 문서는 도구 비교·공식 설치 경로에 대한 조사이며, 사용자 기기에 플러그인을 설치했거나 계정 권한을 추가했다는 기록이 아니다.

## 추천: 덕의 공식 작업 기록은 Notion

현재 연결된 Notion을 쓰는 것이 덕의 기획·설계·개발·검증 기록을 이어가기 쉽다. 기획서와 작업 상태, 결정 이유, 관련 코드와 검사 결과를 함께 찾을 수 있다. Craft도 AI가 문서를 읽고 쓰는 MCP/API를 제공하므로 기능이 없는 도구로 취급하지 않는다. 직접 읽고 쓰는 문서의 편안함을 우선하면 Craft를 비교할 가치가 있지만, 이번에 Notion과 Craft의 화면을 같은 기기에서 사용성 비교한 것은 아니다.

| 비교 기준 | Notion | Craft |
|---|---|---|
| 덕의 지속적인 업무 기록 | 프로젝트 문서·할 일·상태·결정을 연결해 관리하기에 적합 | 문서·일일 노트·할 일과 컬렉션을 중심으로 관리 가능 |
| AI 읽기·쓰기 | 사용자가 선택한 개인 계정에 제품 기록 공간과 업무·비교 문서를 실제 작성하고 조회 확인 | 공식 MCP/API에 검색·문서 생성/수정·컬렉션 관리 기능이 있음. 이 채팅에서 실제 Craft 계정 연결은 확인하지 못함 |
| 자료 접근 범위 | 연결 사용자에게 허용된 페이지와 워크스페이스 권한을 따름 | 선택 문서·일일 노트 연결 또는 권한을 허용한 공간 단위 연결을 지원 |
| 작업 재사용 | Notion Skill 페이지를 여러 연결된 AI에서 읽을 수 있음 | 승인한 문서를 여러 MCP 클라이언트에서 참고 가능 |
| 지금 시작하는 데 필요한 일 | 개인 계정과 제품 기록 공간 확정·작성 완료 | Craft 계정/공간 연결과 접근 범위 설정 추가 |
| AI 토큰 | 도구의 이름만으로 비용이 낮다고 판단할 수 없음 | Notion보다 토큰을 덜 쓴다는 실측 근거를 확보하지 못함 |

Craft의 공식 도움말에는 ChatGPT 플러그인 경로가 있다. 다만 이번 계정의 플러그인 검색에서는 Craft 결과가 나오지 않았다. 이는 현재 검색에서 설치 가능성을 확인하지 못했다는 뜻이며 Craft의 연동 기능 자체가 없다는 뜻은 아니다. [플러그인 디렉터리](https://chatgpt.com/plugins)와 [Craft 공식 연결 안내](https://support.craft.do/en/integrate/mcp)에서 계정별 제공 여부를 확인할 수 있다.

## 토큰을 줄이는 기록·조회 방식

같은 모델이 같은 분량의 본문을 읽으면 문서 앱 이름만 바꿔 토큰이 크게 줄어든다고 보장할 수 없다. 실제 사용량에는 반환된 본문·메타데이터·도구 설명, 조회 횟수, 다시 읽는 양, 이미지, 모델의 토큰화·캐시 정책이 영향을 준다. Notion과 Craft를 같은 모델·질문·문서로 측정한 비교 실험은 이번에 수행하지 않았다. 각 앱의 자체 AI 요금과 이 채팅에서 외부 도구를 사용하는 비용도 구분해야 한다.

덕의 기록은 다음처럼 운영한다.

1. 프로젝트 첫 화면에는 최신 상태·다음 할 일·주요 문서 링크만 둔다.
2. 업무마다 **요청 / 변경 내용 / 실제 검증 / 미확인 사항 / 다음 작업 / 코드·배포 링크**를 기록한다.
3. 전체 인수인계를 매번 복사하지 않고, 관련 작업 문서와 변경된 부분만 읽고 갱신한다.
4. 상세 소스와 반복 가능한 테스트는 GitHub에 보존하고 Notion에는 결과·이유·링크를 남긴다.
5. 기록 성공 후 실제 페이지를 다시 확인한다. 연결 실패 시 저장되지 않은 내용을 분명히 알리고 로컬 기록을 보존한다.
6. 비밀번호·토큰·개인 메일 원문·원본 DB는 업무 기록에 넣지 않는다.

이 방식은 중복 읽기를 줄이는 운영 원칙이며 절감 비율을 약속하는 것은 아니다. “매 업무마다 기록”은 해당 업무를 수행하는 에이전트가 기록하는 방식이다. 외부의 모든 AI 대화와 작업을 배경에서 자동 수집하는 기능을 켠 것은 아니다.

## 덕에 사용할 스킬 묶음

스킬은 AI가 일을 처리하는 방법과 참고 자료이고, 플러그인은 여러 스킬과 외부 연결을 함께 배포하는 묶음이다. 스킬 파일을 내려받아도 계정 권한·Xcode·시뮬레이터·서버가 자동으로 준비되지는 않는다.

| 분야 | 권장 묶음·스킬 | 덕에 쓰는 일 | 확인한 상태 |
|---|---|---|---|
| 기획·인수인계 | Notion의 `notion-spec-to-implementation`, `notion-knowledge-capture`, `notion-research-documentation` | 요구사항을 할 일로 나누고, 결정과 테스트 결과를 기록 | 현재 채팅에 해당 스킬 제공 |
| 화면·디자인 시스템 | Figma의 `figma-design-to-code`, `figma-generate-library`, `figma-implement-motion` | 기존 화면과 코드 대조, 공통 토큰·컴포넌트·모션 관리 | 현재 채팅에 해당 스킬 제공. 파일 접근·쓰기 성공은 작업별로 확인 |
| UX 검토·시안 비교 | Product Design의 `audit`, `research`, `ideate` | 사용 흐름의 불편 확인과 개선안 비교 | 플랫폼의 설치 완료 알림 확인. 공식 audit 지침으로 덕 채팅을 후속 검토 |
| React Native·Expo 개발 | Expo의 `native-data-fetching`, `expo-module`, `expo-deployment`, `expo-cicd-workflows`, `expo-dev-client` | 로그인·API 오류, 네이티브 연결, TestFlight·EAS 배포 | 공식 플러그인 저장소에서 확인. 현재 채팅에 설치된 것으로 확인하지 않음 |
| iPhone 실기기 전 단계 | Build iOS Apps의 `ios-debugger-agent`, `ios-simulator-browser` | Mac의 Xcode·시뮬레이터에서 화면과 실행 오류 확인 | 공식 저장소에서 확인. 해당 Mac 도구와 설치는 별도 필요 |
| iPhone Duo 화면 대응 | Apple App Resizability 스킬 | 힌지·안전 영역·회전·상태 보존 검토 | Apple 공식 Xcode 안내 확인. Mac/Xcode에서 `xcrun agent skills export`로 내보내기. 이 환경에서 내보내기·설치한 것은 아님 |
| 코드 검토·CI | GitHub 플러그인 | 커밋·변경·Actions 결과 확인, 코드 검토 | 현재 GitHub 연결 도구 제공 |
| 선택 보강 | Codex Security의 변경 검사·보안 검토 | 인증·개인정보·외부 쓰기 변경의 보안 검토 | 추가 선택 사항. 일반 개발을 시작하는 필수 조건으로 두지 않음 |

현재 덕은 React Native/Expo 앱이므로 Expo 관련 지침이 주 개발에 맞는다. SwiftUI 전용 패턴은 Swift 모듈이나 실제 SwiftUI 화면을 다룰 때 적용한다. 스킬 때문에 기존 앱을 SwiftUI·웹·다른 프레임워크로 교체하지 않는다. 확정된 디자인 원칙과 사용자의 최신 요청이 외부 스킬의 일반 권장안보다 우선한다.

## 한 번에 받는 방법

### 가장 쉬운 방법: 플러그인 묶음 설치

[ChatGPT 플러그인](https://chatgpt.com/plugins)에서 필요한 플러그인을 설치하면 그 안의 여러 스킬을 함께 받을 수 있다. 이미 연결된 Notion·Figma·GitHub는 중복 설치하지 않는다. 설치 뒤 새 대화/세션에서 스킬이 제공되는지 확인하며, 외부 서비스는 별도 계정 연결이 필요할 수 있다.

공식 안내에는 플러그인별 설치와 묶음 배포 경로가 있다. 모든 플러그인·외부 계정 권한을 한 번에 무조건 활성화하는 사용자용 버튼은 이번 조사에서 확인하지 못했다. 현재 제공되는 전체 목록은 계정·작업 화면·관리자 정책에 따라 다르다.

### 공식 예제 파일을 통째로 다운로드

- [공식 OpenAI 플러그인 저장소](https://github.com/openai/plugins)
- [이번에 확인한 버전 전체 ZIP 다운로드](https://github.com/openai/plugins/archive/d420d13051bffe4543ed39e30fa46b87148e47dd.zip)
- [Expo 스킬 묶음](https://github.com/openai/plugins/tree/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/expo)
- [iOS 개발 스킬 묶음](https://github.com/openai/plugins/tree/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/build-ios-apps)

ZIP은 파일 다운로드이며 ChatGPT에 모든 플러그인을 설치하거나 연결하는 동작은 아니다. 예제를 재배포하거나 수정할 때는 각 플러그인의 라이선스를 확인한다. 전체 저장소에 있는 훅·스크립트를 일괄 실행하지 않는다.

Codex CLI에서 공식 예제 카탈로그를 한 번에 등록하는 개발자용 명령은 다음과 같다. 공식 문서의 `codex plugin marketplace add`를 지원하는 버전이 필요하며, 사용자의 Mac/Windows CLI에서 이 명령을 실행해 검증한 것은 아니다.

```sh
codex plugin marketplace add openai/plugins --ref d420d13051bffe4543ed39e30fa46b87148e47dd
```

이 명령은 고정된 버전의 **카탈로그 등록**이다. 이후 지원되는 플러그인 화면에서 필요한 묶음을 선택해 설치하고, 새 세션에서 확인한다. 카탈로그 등록을 전체 설치·로그인·권한 승인 완료로 보고하지 않는다.

### 기존 안내와 다른 점

2026-11-12 확인한 `openai/skills`의 README는 저장소를 deprecated로 표시하고 최신 예제로 `openai/plugins`를 안내한다. 따라서 옛 저장소의 모든 스킬을 설치하는 방식부터 권하지 않는다. 기존 `$skill-installer`는 여러 경로를 한 호출로 설치할 수 있지만, 최신 플러그인 배포와 외부 도구 연결까지 자동으로 처리한다는 뜻은 아니다.

공식 스킬 문서에 따르면 스킬 이름·설명부터 읽고 필요한 스킬의 본문을 나중에 읽는다. 모든 스킬을 설치했다고 모든 본문을 매번 읽는 것은 아니다. 다만 설치 목록이 아주 커지면 소개가 축약되거나 일부 스킬이 초기 목록에서 빠질 수 있으므로 덕에 필요한 묶음부터 연결하는 것을 권한다.

[Apple 공식 Duo 준비 안내](https://developer.apple.com/iphone-duo/prepare/) · [이 프로젝트의 Duo 구현·검증 범위](iphone-duo-support.md).

## 확인 근거와 한계

- [Notion MCP 공식 개요](https://developers.notion.com/guides/mcp/overview): 검색·문서 작성·프로젝트/데이터베이스 관리.
- [Notion Skill 공식 안내](https://developers.notion.com/guides/mcp/notion-skills): 공유 가능한 지침, 다운로드와 실행의 구분.
- [Craft MCP 공식 도움말](https://support.craft.do/en/integrate/mcp): 선택 자료·공간 접근, ChatGPT 플러그인 연결.
- [Craft API 공식 도움말](https://support.craft.do/en/integrate/api): 문서/일일 노트/컬렉션 작업.
- [Craft의 ChatGPT 수동 MCP 안내](https://www.craft.do/imagine/guide/mcp/chatgpt): OAuth 연결과 공간 승인. 계정의 사용자 정의 앱 제공 여부 확인 필요.
- [OpenAI 플러그인 안내](https://learn.chatgpt.com/docs/plugins): 설치된 플러그인의 스킬 묶음과 서비스 연결.
- [스킬 로딩 방식](https://learn.chatgpt.com/docs/build-skills): 필요한 지침만 읽는 방식.
- [플러그인 카탈로그와 설치 방법](https://developers.openai.com/plugins/build/plugins): 버전 고정 카탈로그 등록 명령.
- 조사한 공식 저장소: `openai/plugins@d420d13051bffe4543ed39e30fa46b87148e47dd`, `openai/skills@49f948faa9258a0c61caceaf225e179651397431`.

공식 플러그인 카탈로그의 경로와 해당 스킬 파일 존재를 확인했다. 최초 검색에서는 Product Design 설치 가능·미설치로 나왔고 이후 플랫폼이 설치 완료를 알렸다. 후속 화면 검토에서 공식 audit 지침을 적용했다. Figma는 설치됨을 확인했고 Craft·Expo는 검색 결과를 확보하지 못했다. 이 조사를 위해 플러그인을 설치·실행하거나 계정 권한을 변경하지 않았다. Craft 개발자 상세 사이트는 GitBook 로그인 화면으로 이동해 전체 엔드포인트 명세를 검증하지 못했으며, 비용·속도·사용성의 동일 조건 실측도 하지 않았다.

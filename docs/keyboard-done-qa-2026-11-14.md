# 키보드 완료 바 — 검수 영수증

## 최신 정정 — 1번 입력창 안 내리기로 변경

사용자가 큰 완료 pill과 가림을 보고 **이전1번으로 변경**을 요청했다. [현재 계약](interaction-repair-2026-11-14.md)과 [실제 QA](interaction-repair-qa-2026-11-14.md)가 우선한다. 아래2번 설치/시각/동작 설명은 과거 이력이다. 실제33은2번 코드를 포함해 Apple 업로드에 성공했고 지금1번은33 이후로 새 앱 업데이트가 필요하다.


## 확인한 결과

- 전체 단위292개 중291통과·실패0·기존 선택1제외. 이 수치는 기존 JS/서버 회귀이며 UIKit 동작 테스트가 아니다.
- 서버/웹/도구50파일 문법 검사와 모바일 TypeScript 통과.
- Expo web export 및 iOS JS export 통과. IPA/서명·Swift 컴파일을 뜻하지 않는다.
- Expo Apple autolinking resolve에 기존 `DuckduckDuoModule`과 새 `DuckduckKeyboardModule`이 같은 로컬 pod로 포함됨을 확인했다.
- 실제 Expo 웹/격리 API 전체 앱 회귀와 Duo 접힘·펼침/분할·기하 회귀 통과. 임시 캡처는 `/tmp/keyboard-done-app-regression`, `/tmp/keyboard-done-duo-regression`에 만들었으며 이전 화면 근거를 덮지 않았다.
- 소스 검토: 현재14개 RN TextInput 사용 파일의 한 줄·여러 줄·보안·숫자 입력을 같은 네이티브 클래스 관찰로 포함한다. Done action은 resign만 하며 텍스트 접근·submit·저장·통신을 하지 않는다. 반복 알림은 설치된 바 동일성으로 차단하고 해제 시 원래 바를 복원한다.

## 네이티브 시각·동작 검수

**final result: blocked** — Linux 작업 환경에 Xcode·UIKit 시뮬레이터가 없어 Swift 컴파일·실제 키보드 캡처·선택 시안과의 같은 상태 시각 대조를 하지 못했다. 웹 회귀 캡처를 네이티브 완료 바의 검수 증거로 제시하지 않는다. 원본은 [2번 선택 시안](../artifacts/multi-google-clean-chat-2026-11-14/design-previews/keyboard-2-accessory-done.png), 실제 기기 수락 항목은 [구현 계약](keyboard-done-2026-11-14.md)에 있다.

실제 최신 확인 앱1.0.0(32)은 이번 코드 이전이다. 새 native 빌드/설치 이후 이 목록을 확인하고 영수증을 갱신한다. 새 빌드 번호·Apple 처리 완료·사용자 설치를 추정하지 않는다. 실계정 로그인/모델/Google 원본 쓰기를 실행하지 않았다.

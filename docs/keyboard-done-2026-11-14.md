# 키보드 위 ‘완료’ — 2번 선택·앱 전체 적용

상태: **사용자 선택 확정 / 코드 구현 / 네이티브 빌드·실기기 검수 대기**. 2026-11-14의 “2번으로 하고 키보드 쓸때마다 모두 나오도록”이 이전 미선택 상태를 대체한다.

## 선택한 화면과 동작

[2번 시안 원본](../artifacts/multi-google-clean-chat-2026-11-14/design-previews/keyboard-2-accessory-done.png). 입력창 바로 아래, 실제 iOS 키보드 바로 위의 얇은 시스템 바에 파란 **완료**를 오른쪽 정렬한다. 바 높이는 최소44pt, 배경/색상은 UIKit의 시스템 외형을 따른다. 이미지는 선택용 합성 시안이며 구현 후 캡처가 아니다. 기존 앱의 폰트·내비게이션·Duo 하드웨어 위치가 이미지와 다르다는 이유로 변경하지 않는다.

일반 iPhone과 Duo 접힘·펼침 모두 앱의 입력칸에 공통 적용한다. AI 채팅, Todo 제목·메모, 캘린더 텍스트 편집, 검색, 이름, 로그인·비밀번호, 인증번호·숫자, 시간대·예약·연결 설정과 모달 안 입력칸을 포함한다. 새 React Native 입력칸도 자동 포함한다. Google 로그인 브라우저나 iOS 자체 입력 화면은 해당 서비스/시스템이 관리한다.

**완료는 키보드만 닫는다.** 작성 중 내용·초안과 현재 화면을 유지하고 전송/저장/실행/뒤로가기를 호출하지 않는다. Return/Enter의 기존 의미와 자동 초점 제거 정책도 유지한다. 입력창 안에 새 버튼이나 새 쓸어 내리기 동작을 추가하는 안은 선택하지 않았다.

## 구현 위치와 재현 규칙

- `mobile/modules/duckduck-duo/ios/DuckduckKeyboardModule.swift`: 별도 Expo 모듈 이름 `DuckduckKeyboard`. UIKit의 입력 시작/키보드 표시·프레임 알림을 관찰한다. 실제 포커스를 가진 RN `RCTUITextField`/`RCTUITextView`와 그 하위 클래스에만 `UIToolbar`를 연결한다. UIKit 창들을 확인하므로 모달 입력도 포함한다.
- `mobile/modules/duckduck-duo/expo-module.config.json`: 기존 Duo 모듈과 함께 등록한다. 기존 pod의 Swift 파일 glob으로 포함하며 SDK·서명·패키지 의존성을 바꾸지 않는다.
- `mobile/src/keyboard-done.ts`와 `mobile/App.tsx`의 `Shell`: 앱 전체 수명에 한 번 활성화하고 해제 시 observer와 본인이 설치한 바만 복원한다. 웹/Android·구버전 바이너리에서 모듈이 없어도 기존 입력은 유지한다.
- `완료` action은 `resignFirstResponder()`만 호출한다. 입력 텍스트를 읽거나 저장·전송하지 않는다. 비밀번호도 JS/로그로 보내지 않는다.
- 같은 입력의 동일 바는 다시 만들거나 reload하지 않아 반복 알림 루프를 막는다. 종료할 때 아직 본인 바인 경우에만 원래 accessory를 복원한다. UIKit이 회전/키보드 높이·위치를 관리한다.

React Native의 deprecated `InputAccessoryView`는 공식 문서에 여러 줄·하단 탭 관련 알려진 문제가 있어 사용하지 않았다. 설치된 RN0.88.1의 숫자 키패드 기본 완료는 submit 이벤트를 호출하므로 재사용하지 않는다. 근거: [RN 공식 문서](https://reactnative.dev/docs/inputaccessoryview), 설치된 `RCTTextInputComponentView.mm`의 `setDefaultInputAccessoryView`/`handleInputAccessoryDoneButton`.

## 검증과 설치 범위

[검수 영수증·실기기 체크리스트](keyboard-done-qa-2026-11-14.md). JS 검사와 모듈 자동 연결 확인을 Swift 컴파일/실제 키보드 검증으로 표현하지 않는다. Linux에는 Xcode/UIKit 실행 환경이 없어 네이티브 시각 대조·VoiceOver·한국어 조합 입력은 대기다.

최근 확인된 TestFlight는 사용자 실행43573843501·소스60462e2의 **1.0.0(32)**이며 이 코드를 포함하지 않는다. 앱을 새로 빌드하고 TestFlight에서 업데이트해야 한다. 현재 요청에서 새 네이티브 빌드를 자동 시작하지 않는다. 무료 수동 빌드 정책·데이터/인증·사무실/소개 사이트 보류를 유지한다. 서버 문서 배포만으로 설치된 앱에 네이티브 바가 생기지 않는다.

## 다음 작업자가 실제 기기에서 확인할 항목

1. 일반 iPhone과 Duo 접힘/펼침·가로/세로에서 키보드를 반복 열고 전환해 오른쪽 완료 바 하나만 보이는지 확인한다.
2. 한 줄/여러 줄/한국어 조합/자동 완성/붙여넣기/비밀번호/숫자·인증번호와 모달에서 확인한다.
3. 완료 후 내용·초안 유지, 전송/저장/API 실행0, 다시 탭하면 재입력 가능함을 확인한다.
4. 긴 채팅·키보드 종류 변경·회전·큰 글자·밝게/어둡게·VoiceOver·하드웨어 키보드 연결/해제에서 겹침·가림·반복 reload가 없는지 확인한다.
5. 일반 하단 탭과 Duo 카메라 열·반대 pane·닫기/저장 위치를 보존한다. 합성 웹 키보드로 대체하지 않는다.

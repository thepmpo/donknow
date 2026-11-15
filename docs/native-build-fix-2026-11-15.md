# iPhone37 컴파일 실패 수정 — Swift import 접근 수준

## 확인한 실제 실패

사용자가 시작한 [43696660983](https://github.com/thepmpo/donknow/actions/runs/43696660983), 소스446128293939443d665cff2acb6d88e0b84d4bf0을 확인했다. validate132758610786은success, build-and-submit132758825189의 native archive가 실패했고 Apple 제출은skipped다. EAS에서36→37이 할당됐지만37의 서명 IPA/Apple 업로드 성공은 아니다. 마지막 성공은36·43661869084다.

실제 원인:

```text
ambiguous implicit access level for import of 'DuckduckDuo'; it is imported as 'internal' elsewhere
DuckShortcuts.swift:4:8
```

Expo가 생성하는 모듈 provider는 `internal import DuckduckDuo`를 쓴다. 새 단축어 파일은 접근 수준을 생략해 현재 Swift 툴체인에서 두 선언을 일관되게 결정하지 못했다. Fastlane의 마지막 exit1/65나 일반 Xcode 안내는 이 컴파일 오류의 요약이다.

## 수정

- `mobile/native/DuckShortcuts.swift`에서 `internal import DuckduckDuo`를 명시했다. 단축어·파일 전달과 기존 모듈은 유지한다.
- 같은 실패 로그의 Expo Doctor에 나온 SDK58 호환 버전 경고를 맞췄다: Expo58.0.25, safe-area5.11.1, blur58.0.6, calendar58.0.7, font58.0.12, notifications58.1.9, secure-store58.0.3, sharing58.0.23, status-bar58.0.5, web-browser58.0.8. 잠금 파일도 갱신했다. React Native/SDK major·Bundle ID·서명 자격 증명·무료 runner는 바꾸지 않았다.
- `npm --prefix mobile run check:native`를 추가했다. 실제 Expo iOS 프로젝트를 임시 디렉터리에 생성하고, 실제 autolinker로 로컬 모듈 provider를 만든 다음 단축어 원본/생성 소스와 provider의 import 접근 수준을 비교한다. assistant native bridge의 실제 자동 연결도 확인한다. Linux에서는 SDK의 macro scan에 Xcode가 필요하므로 명시한 로컬 모듈만 대상으로 한다. 원래 실패 소스를 임시 복사본으로 넣으면 이 검사가 실제로 거부하는 것도 확인했다. 전체 native 컴파일 성공을 대신하는 검사는 아니다.
- 일반 app-checks와 iPhone workflow의 validate 단계에 이 검사를 넣었다. push가 native 빌드/제출을 자동 실행하지는 않는다.

## 검증

로컬 native prebuild·provider/import 검사, SDK bundled 의존성 검사,95개 문법, 전체354중353통과/실패0/기존 선택1제외, 모바일 타입, web/iOS JS export, Python100중99통과/선택1제외를 확인했다. 일반 앱 회귀를 통과했다. Duo 검사의 이전 서비스 버튼 이름을 현재 ME의 연결된 서비스 진입으로 맞췄고 레이아웃 회귀도 통과했다. 화면 캡처는 임시 경로에 저장하며 기존 공개 증거 이미지를 덮어쓰지 않는다.

온라인 Expo Doctor는18/20이며 남은 두 검사는 이 개발 환경의 Expo API/React Native Directory 네트워크 실패다. SDK 패키지 버전 불일치는 사라졌고 로컬 SDK의 install --check는통과했다. 검사를 exclude/비활성화하거나 TLS 검증을 끄지 않았다. 실제 Mac의 다음 Doctor/Swift archive/서명/Apple 업로드는 새 main 실행에서 다시 확인해야 한다.

## 다음 빌드

기존37 실패 실행의 Re-run은 소스4461282로 돌아가므로 이 수정을 포함하지 않는다. [무료 iPhone 빌드 화면](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml)의 **Run workflow → Branch:main → Run workflow**로 새 소스를 실행한다. 현재 연결의 새 dispatch는 이전 요청에서Forbidden이었으며 권한을 우회하지 않는다. 실제 새 run/번호/서명/제출 성공을 확인하기 전 빌드 완료라고 하지 않는다. 다음 번호를 임의로 고정하거나37을 재사용하지 않는다.

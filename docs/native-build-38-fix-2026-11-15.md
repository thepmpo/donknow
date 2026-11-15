# iPhone38 실패 수정 — 단축어의 Apple API 지원 조건

수정606e53d를 포함한 [새 실행43699451034](https://github.com/thepmpo/donknow/actions/runs/43699451034)의 validate132767151513은 성공했지만 native132767426954는 실패했다. EAS는37→38을 할당했고 Apple 제출은 skipped다. 마지막 Apple 업로드 성공은1.0.0(36)이며38의 IPA/설치 성공은 아니다.

실제 컴파일 오류:

```text
'OpenURLIntent' is only available in iOS 18.0 or newer
DuckShortcuts.swift:23:33
```

이전 import 접근 수준 오류는 통과했고 다음 API 가용성 검사에서 실패했다. 단축어 코드가 iOS16.4부터 사용 가능하다고 선언하면서 iOS18 전용 API를 호출했다. 이전 Linux prebuild/import 검사는 Apple API 가용성을 검사하지 못했다.

`AskDuckIntent`와 이를 등록하는 `DuckAppShortcuts`에 iOS18 availability를 명시했다. 앱 전체 최소 버전·Bundle ID·기존 서명 자격 증명·무료 runner·기존 사용자 데이터는 유지한다. 새 단축어 기능만 iOS18 이상에서 제공한다.

무료 Mac에서 EAS 이전에 `node scripts/check-shortcuts-swift.mjs`를 실행한다. 실제 Apple iPhoneOS SDK로 실제 Keychain bridge를 모듈로 컴파일하고 실제 단축어 파일을 typecheck한다. Expo adapter를 제외한 원본 bridge를 사용하며 모의 구현으로 대체하지 않는다. 앱보다 낮은16.4 target에서 검사해 빠진 availability를 잡고, 임시 복사본을 이전16.4 선언으로 되돌렸을 때 원래 OpenURLIntent 오류가 발생하는지도 확인한다. 서명·빌드 번호 할당 전에 실패하므로 같은 유형의 문제로 빌드 번호를 소모하지 않는다. 이 검사는 전체 Expo 앱 archive/서명/Apple 제출과 별개다.

로컬 확인:96개 서버/웹/도구 문법 검사와 실제 Expo iOS prebuild·로컬 모듈 provider·import 일관성 검사는 통과했다. Linux에는 Xcode가 없으므로 추가한 Apple SDK 검사의 실제 실행과 전체 Swift archive는 새 main workflow에서 확인해야 한다. 성공했다고 미리 기록하지 않는다.

실패38의 Re-run은 수정 전606e53d를 사용한다. [무료 iPhone workflow](https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml)의 새 **Run workflow → main → Run workflow**가 필요하다. 다음 번호는 EAS가 할당하므로 미리 확정하지 않는다. 새 실행 시작/컴파일/서명/제출/Apple 처리·설치를 각각 실제 결과로 구분한다.

ME의 간결한 묶음 목록→상세 디자인 방향은 보존했다. 이번 실패 대응에서 ME 화면이나 앱 내 일반형 미리보기를 구현했다고 보고하지 않는다.

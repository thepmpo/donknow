# Apple iPhone Duo 대응 · 2026-11-12

**현재 상태:** 공식 iOS 27.1 API를 사용하는 네이티브 연결과 `DuoTrailingNavigation`을 구현했다. 기하 계산 8개 테스트, React 화면 유지 테스트, TypeScript 검증을 수행했다. Linux 환경에서는 Swift 네이티브 빌드와 Duo 실기기 동작을 확인할 수 없으므로 **TestFlight·실기기 검증 완료로 표시하지 않는다.**

사용자가 이번 업무에서 Duo 구현 진행을 명시적으로 승인했다. 기존의 “Duo 진행 전 보류”는 해제한다. 대상은 **Apple iPhone Duo**이며 Microsoft Surface Duo나 Android 폴더블이 아니다. 일반 iPhone은 기존 하단 탭을 유지한다.

## 공식 근거

2026-11-12 Apple 공식 제품 페이지, 개발자 문서 JSON, 기술 영상의 본문을 확인했다. 검색 요약이나 모델명 추측을 구현 근거로 쓰지 않았다.

| 확인 내용 | 공식 출처 |
|---|---|
| Apple iPhone Duo 제품과 접힘·펼침 | [제품 페이지](https://www.apple.com/kr/iphone-duo/) |
| iOS 27.1 SDK 전체 화면 대응, 크기 변경과 safe area | [개발 준비](https://developer.apple.com/iphone-duo/prepare/), [앱 준비 개요](https://developer.apple.com/documentation/technologyoverviews/preparing-your-app-for-iphone-duo) |
| 상태 유지, 비대칭 safe area, 다양한 자세 | [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo) |
| 실제 힌지 지원 여부: `UIHingeInteraction`, `update.hinge` | [UIHingeInteraction](https://developer.apple.com/documentation/uikit/uihingeinteraction), [문서 원본 JSON](https://developer.apple.com/tutorials/data/documentation/uikit/uihingeinteraction.json), [공식 기술 영상 111464](https://developer.apple.com/videos/play/tech-talks/111464/) |
| 가림·접힘 경계: `UIView.reservedRegions(kind:options:)`, `.division`, `.occlusion`, `.includeInactive` | [ReservedRegion](https://developer.apple.com/documentation/uikit/uiview/reservedregion), [메서드 원본 JSON](https://developer.apple.com/tutorials/data/documentation/uikit/uiview/reservedregions(kind:options:).json), [공식 기술 영상 111463](https://developer.apple.com/videos/play/tech-talks/111463/) |
| 시스템 세로 바 방향: `UITraitCollection.verticalBarEdge` | [문서 원본 JSON](https://developer.apple.com/tutorials/data/documentation/uikit/uitraitcollection/verticalbaredge.json) |
| 사용 가능한 Xcode 27.1 빌드 이미지 | [Expo 빌드 인프라](https://docs.expo.dev/build-reference/infrastructure/) |

Apple의 App Resizability 스킬은 [개발 준비 문서](https://developer.apple.com/iphone-duo/prepare/)에 안내되어 있다. 지원하는 Xcode 설치 환경에서 `xcrun agent skills export`로 외부 에이전트에 내보낼 수 있다. 현재 Linux 환경에는 Xcode가 없어 내보내기·실행 여부를 검증하지 않았다.

## 구현 기준

1. **기능 탐지:** iOS에서 네이티브 모듈이 있고 iOS 27.1 API 사용 가능 및 `update.hinge != nil`일 때만 Duo 모드를 활성화한다. 모델명, 화면 폭, 화면 비율, iPad 여부, 가로 방향만으로 탐지하지 않는다. 힌지 값이 없으면 하단 탭으로 되돌아간다.
2. **오른쪽 내비게이션:** 접은 상태와 펼친 상태 모두 같은 탭 컴포넌트를 오른쪽에 배치한다. 고정 폭 76pt, 탭 최소 높이 64pt는 앱의 조작 영역 수치이며 기기 식별값이 아니다. 키보드 등으로 세로 공간이 줄면 탭 목록을 스크롤할 수 있다. iOS의 `verticalBarEdge`는 공식 근거로 확인했지만, 사용자가 명시한 **물리적 오른쪽** 배치를 위해 시스템 leading 선호를 기기 식별로 사용하지 않는다.
3. **접힘과 가림 회피:** native view의 실제 `bounds`, `safeAreaInsets`, `reservedRegions`만 사용한다. API의 frame은 해당 뷰 좌표이며 여유 공간을 이미 포함한다. `updateConstraints()`에서 읽어 변경을 관찰한다. 비활성·폭 0 접힘 선은 본문을 잘라내지 않는다.
4. **초기 단일 본문 정책:** 접힘 경계가 활성 상태일 때 본문을 복제하거나 양쪽에 나누지 않고 안전한 한 영역에 표시한다. 전체 높이를 가르는 세로 접힘이면 **오른쪽 영역을 우선**한다. 오른쪽이 300pt(본문 224pt + 내비게이션 76pt)보다 좁아 사용할 수 없으면 가장 넓고 안전한 영역으로 이동하며, 그 영역의 오른쪽에 내비게이션을 둔다. 카메라 옆의 가느다란 빈 공간보다 충분한 폭을 확보한 영역을 우선한다. 300pt는 사용성 기준이며 Duo 탐지 기준이 아니다.
5. **상태 유지:** 접힘·펼침은 스타일과 안전 영역만 바꾼다. 화면·편집기를 재생성하거나 key를 바꾸지 않는다. 현재 탭·입력·편집·스크롤 상태를 그대로 유지한다. 계정 변경·로그아웃 때 필요한 기존 사용자 데이터 초기화는 유지한다.
6. **모달과 시트:** 공통 `MotionModal`과 캘린더 월 선택창에도 별도의 관찰 뷰를 둬 모달 자신의 좌표로 가림 영역을 계산한다. 기존 키보드 회피와 시트 제스처를 유지한다. 모든 키보드 조합은 실기기 검증 대상이다.
7. **빌드 호환:** CocoaPods 설치 시 선택된 실제 iPhoneOS SDK가 27.1 이상이면 `DUCKDUCK_DUO_SDK` 컴파일 조건을 추가한다. 새 UIKit 선언은 이 조건 안에 두며 런타임도 `#available(iOS 27.1, *)`로 검사한다. 모듈이 없는 기존 바이너리·Expo Go·이전 SDK·웹은 기존 내비게이션으로 동작한다. EAS preview/production은 공식 목록의 `macos-tahoe-26.6-xcode-27.1`을 지정했다.
8. **방향:** Expo `orientation`을 `default`로 설정해 기기의 자세 전환을 허용한다. 일반 iPhone 가로 모드도 하단 내비게이션을 유지하며 Duo로 오인하지 않는다.

## 구현 위치

- [`mobile/modules/duckduck-duo`](../mobile/modules/duckduck-duo): Expo 로컬 iOS 모듈, 공식 API 관찰, SDK 컴파일 조건.
- [`mobile/src/duo-layout.ts`](../mobile/src/duo-layout.ts): 검증된 기하 데이터, 기능 탐지, 안전한 영역 계산.
- [`mobile/src/DuoLayout.tsx`](../mobile/src/DuoLayout.tsx): 상태를 유지하는 레이아웃 및 모달 별 좌표 공간.
- [`mobile/App.tsx`](../mobile/App.tsx): `DuoTrailingNavigation`, 기존 하단 탭 대체 배치.
- [`mobile/src/motion.tsx`](../mobile/src/motion.tsx), [`mobile/src/ui.tsx`](../mobile/src/ui.tsx): 모달 보호, 본문 아래 여백.
- [`mobile/src/duo-layout.test.ts`](../mobile/src/duo-layout.test.ts), [`mobile/e2e/duo-layout.mjs`](../mobile/e2e/duo-layout.mjs): 수학·기능 탐지와 실제 React 상태 유지 테스트.

## 검증과 다음 작업

```sh
node --test mobile/src/duo-layout.test.ts
node mobile/e2e/duo-layout.mjs
npm --prefix mobile run typecheck
```

테스트용 geometry는 **독립 브라우저 fixture에서만** 전달한다. 제품에는 URL·query·기기 폭으로 Duo를 켜는 숨은 스위치를 추가하지 않았다. 브라우저 fixture의 성공은 UIKit 실행 성공의 증거가 아니다.

- [x] iPad·일반 iPhone 가로 화면·웹·Android 오탐 방지.
- [x] 비대칭 safe area, 비활성 접힘, 세로·가로 활성 접힘, 카메라 가림, 뷰 밖 영역 계산.
- [x] 비대칭 접힘에서도 사용 가능한 오른쪽 영역 우선, 가느다란 영역 회피.
- [x] 펼침→책처럼 접기→접힘 화면→탁상 자세→펼침→일반 레이아웃에서 탭·초안·편집 상태·스크롤 600px 및 동일 React 자식 유지.
- [x] Expo autolinking에서 `duckduck-duo` 모듈 발견 확인.
- [ ] EAS/Xcode 27.1 **Swift 컴파일·링크** 성공 확인. Linux TypeScript/JS 번들 검증으로 대체하지 않는다.
- [ ] TestFlight 설치 후 힌지 데이터의 초기 제공·닫힘·펼침·백그라운드 복귀에서 `UIHingeInteraction` 값을 확인한다.
- [ ] Duo 실기기에서 키보드 열림/닫힘, Todo 편집, AI 채팅, 캘린더 선택창, 권한 시트·시스템 시트, 회전·Dynamic Type·VoiceOver를 확인한다.
- [ ] iPhone/iPad 이전 OS 및 새 OS에서 기존 하단 탭·일반 가로 모드 회귀를 확인한다.
- [ ] Figma Current baseline은 실기기 검증 결과와 맞춘 뒤 업데이트한다. Proposed에 구현 완료로 표시하지 않는다.

데이터·인증 스키마, Apple 계정 권한, AI 실제 연결, 브리핑·날씨 정책은 이 변경에서 수정하지 않는다. 추가 자격증명이나 비밀번호를 채팅에 요청하지 않는다.

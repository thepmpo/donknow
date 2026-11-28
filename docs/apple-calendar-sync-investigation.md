# 도슨 iPhone 캘린더 표시 불일치 회고

2026년 11월 28일. iPhone에서 접근 가능한 Apple 캘린더의 일정이 도슨의 같은 날짜에 보여야 한다는 요구와, TestFlight 76에서 그 차이가 해소됐다는 사용자 확인을 기록한다.

## 무엇이 반복됐나

같은 달을 열어도 Apple에 있는 일정이 도슨에서 빠지고, Apple에선 사라졌거나 보이지 않는 일정이 도슨에 남았다. 특히 11월 26일 종일 일정과 12·13일에 도슨에만 보이는 일정이 비교 기준이었다. 사용자는 전체 캘린더 목록을 다시 읽고 추가·수정·삭제를 대조해 달라고 요청했다. 도슨에서 작성하거나 편집한 일정은 기기에 먼저 반영하고 원본 전송을 이어가는 기존 저장 원칙도 적용됐다.

## 원인과 증거

- **조회 결과와 표시 대상을 같은 것으로 취급했다.** iPhone에서 EventKit으로 읽은 일정에도 도슨의 캘린더 숨김 설정이 적용됐다. Apple에 실제로 있는 일정이 선택일의 화면에 들어가기 전에 걸러질 수 있었다. 숨김 설정 때문에 일정이 사라지는 경로를 브라우저의 모의 EventKit에서 재현했다.
- **기본 화면이 세 가지 데이터를 합쳤다.** EventKit 결과에 직접 연결한 Google 결과와 도슨 사본을 합쳤고, 원본 ID가 연결된 일부 일반 일정만 별도로 대조했다. 따라서 원본 전체를 다시 읽어도 다른 출처의 사본을 함께 표시하는 구조가 남았다. 연결된 Google 일정은 원본이 `404`, `410`, `cancelled`를 반환해도 이전 구현에서 도슨 사본이 남는 것을 별도로 재현했다. 사진 속 12·13일 각각의 실제 공급자 응답은 확인하지 못했다.
- **날짜 경계에도 별도 누락 조건이 있었다.** 종일 일정의 종료일은 그 날을 제외하는 경계다. 시작일과 종료일이 같은 원본 값에 이 규칙을 적용하면 표시할 날짜가 사라질 수 있었다. 이 입력을 모의 테스트로 재현했다. 사진 속 11월 26일 일정의 실제 EventKit 응답은 확보하지 못했으므로 그 일정의 단독 원인을 날짜 경계로 단정할 수 없다.

각 수정본의 비교는 [기존 Apple 조회 및 필터](https://github.com/thepmpo/donknow/blob/408f3e4/mobile/src/useAppleCalendarData.ts), [기존 통합 화면](https://github.com/thepmpo/donknow/blob/408f3e4/mobile/src/useUnifiedCalendarData.ts), [Google 삭제 확인 수정](https://github.com/thepmpo/donknow/commit/06439e8)에서 볼 수 있다.

## 시도와 결과

| 시도 | 바뀐 동작 | 계속 남은 문제 |
| --- | --- | --- |
| 목록 선택과 중복 제거 | Apple 목록을 10개 제한에서 분리하고 같은 원본의 복제 표시를 줄였다. | 도슨의 숨김 설정과 혼합 화면은 여전히 적용됐다. |
| 진입·복귀·원본 변경마다 새로고침 | 선택 기간과 이전 달도 다시 읽고 EventKit 변경 신호를 받았다. | 최신 원본을 읽은 뒤에도 화면에서 걸러지거나 다른 출처와 합쳐질 수 있었다. |
| 기기 우선 저장, 재시도, 백그라운드 동기화 | 도슨에서 만든 일정과 기존 편집을 기기에 먼저 남기고 원본 전송을 이어갔다. | 이 작업은 저장과 전송에 적용됐고, 화면에서 어떤 데이터를 선택하는지는 기존 방식이었다. |
| 연결된 원본 수정·삭제 대조와 한 건 확인 | 기존에 연결된 사본의 변경과 확인된 삭제를 반영하고 삭제 전에 해당 일정만 확인했다. | 기존 연결이 있는 일정에 적용됐다. 화면 전체의 출처 우선순위는 그대로였다. |
| iPhone 기본 보기를 EventKit 원본으로 전환 | 기기에서 접근 가능한 전체 캘린더를 해당 기간만큼 읽고, 그 결과에서 화면을 구성했다. | Apple 캘린더 앱 자체의 체크 상태는 공개 API로 읽을 수 없다. |

주요 변경은 [원본 변경과 삭제 대조](https://github.com/thepmpo/donknow/commit/8ae11b8), [기기 우선 편집 저장](https://github.com/thepmpo/donknow/commit/22d4d35), [백그라운드 재시도](https://github.com/thepmpo/donknow/commit/cd8e7fc), [iPhone 기본 보기 전환](https://github.com/thepmpo/donknow/commit/4a011ac)에서 확인할 수 있다.

## TestFlight 76에서 달라진 기준

1. EventKit의 날짜 범위 조회에 전체 캘린더 조건을 사용한다. 화면에 보이는 날짜 범위를 열거나 이동하면 그 범위의 원본 결과에서 추가·수정·삭제를 반영한다.
2. iPhone 기본 보기는 도슨의 통합 보기 필터를 적용하기 전에 Apple 목록을 사용한다. 이전 Google 조회 결과나 원본에 없는 동기화 완료 사본을 Apple 일정으로 표시하지 않는다. 도슨에서 작성하거나 편집해 Apple에 반영 중인 항목은 기기에서 계속 표시한다.
3. 종일 일정의 날짜를 현지 달력 날짜로 사용하고, 시작일과 종료일이 같게 들어온 원본은 시작일을 포함하도록 종료 경계를 보정한다. 새 일정의 기본 저장 위치는 EventKit이 알려준 iPhone 기본 캘린더다.
4. 목록 메뉴에서 직접 읽는 보기와 통합 보기를 바꿀 수 있다. 76의 ‘아이폰 기준’ 라벨은 후속 가독성 변경에서 ‘아이폰 캘린더’로 바뀌었다. 통합 보기에는 Google과 도슨 전용 일정도 포함되며 캘린더별 표시 선택을 적용한다.

[EventKit 조회](https://github.com/thepmpo/donknow/blob/4a011ac/mobile/modules/duckduck-duo/ios/DuckduckCalendarChangesModule.swift) · [화면에 사용할 원본 선택](https://github.com/thepmpo/donknow/blob/4a011ac/mobile/src/calendar-copies.ts) · [종일 일정 변환](https://github.com/thepmpo/donknow/blob/4a011ac/mobile/src/apple-calendar-model.ts)

## 검증 기록

- [TestFlight 76](https://github.com/thepmpo/donknow/actions/runs/46099427884)의 소스는 `0bbb545`다. GitHub Actions의 검증, 서명 IPA 생성, Apple 제출 단계를 각각 성공으로 확인했다.
- 모의 EventKit으로 일반 iPhone 및 Duo 화면의 기존 숨김 목록, 10개 초과 캘린더, 과거 날짜의 추가·수정·삭제, 통합 보기 전환을 검증했다. 단위 테스트에서 종일 반복 일정의 날짜 경계, 다른 출처 사본의 제외, 전송 중인 Apple 일정의 보존을 검사했다.
- 사용자는 배포 이후 대화에서 이전에 안 보였던 일정이 이제 모두 들어왔다고 확인했다. 그 확인은 실제 사용 결과다. 누락됐던 각 일정의 원시 EventKit 응답과 iOS 자체의 캘린더 체크 상태는 직접 확인하지 못했다.
- 확인 명령은 `node --test mobile/src/apple-calendar-model.test.ts mobile/src/calendar-copies.test.ts mobile/src/calendar-model.test.ts`, `npm --prefix mobile run check:native`, `CREATE_CAPTURE_DIR=$(mktemp -d) node mobile/e2e/apple-calendar-workspace.mjs`다. 모의 검증은 실제 iCloud 계정의 성공을 보증하지 않는다.

## 같은 증상이 다시 나오면

1. 설치된 TestFlight 번호와 소스 커밋, 기본 보기인지 통합 보기인지 확인한다. 같은 날짜의 같은 모드부터 비교한다.
2. 날짜 범위와 iPhone 권한을 확인하고 **EventKit에서 반환한 캘린더 → 기간의 일정 → 종일 날짜 변환 → 화면 목록** 순서로 대조한다. 해당 단계가 기록되기 전에는 재시도 주기 변경을 해결로 기록하지 않는다.
3. 원본 부재는 정확한 캘린더·원본 ID와 조회 성공을 함께 확인한다. 조회 실패나 권한 해제를 삭제로 처리하지 않고, 아직 전송하지 않은 도슨 변경을 보존한다.
4. 재현은 사용자 일정 제목이나 계정 주소 없이 합성 일정으로 남긴다. 같은 날짜의 종일 반복 일정, 직접 연결한 Google 사본, 숨김 설정이 있는 Apple 목록을 함께 포함한다.

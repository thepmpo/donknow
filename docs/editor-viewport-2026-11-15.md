# 고정 편집창·선택 영역 스크롤·별도 키보드 닫기

## 2026-11-15 — X 유지·위에 키보드 닫기·고정 편집창의 내부 스크롤

[현재 계약](editor-viewport-2026-11-15.md) · [직접 조작 점검·10장](editor-viewport-qa-2026-11-15.md). 방금 첨부한 A2F8770D의4장을 기준으로 한다. **Duo 접힘/펼침은 X/뒤로가기 기능을 유지하고 그 위에 키보드 닫기를 별도 원으로 표시**한다. 같은 카메라 열 중심선, 최소44pt, 하드웨어를 피한 두 안전 슬롯을 사용한다. 부족하면64→44pt로 줄이며 탭/오늘/2주/스크롤바는 두 슬롯 아래 영역을 쓴다. 키보드 닫기와 X의 실제 콜백은 다르다. 일반 iPhone의 실제 키보드 위 완료는 유지한다. ‘X를 키보드로 대체’는 폐기한 해석이다.

**선택기/메모를 별도로 띄우거나 편집창을 밀어 올리지 않는다.** Todo 편집창은 같은90% 위치/높이를 유지하며 키보드 screenY와 실제 창 경계의 겹침만 내부 viewport 아래에서 뺀다. KeyboardAvoidingView와 입력 중 높이 전환을 없앴다. 내부 ScrollView만 focus/layout/keyboard 이후 측정해서 이동한다. 선택기는 inline 그대로이고 펼친 영역 자체가 scroll reveal에 등록된다. 들어가면 전체 영역+12pt 여백을 보이고, 물리적으로 더 크면 시작점을 보이고 내부 스크롤을 허용한다. 날짜/알림/캘린더 선택 중에는 저장을 숨기고 선택을 마치면 복원한다. 메모도 별도 창 없이 기존 입력 안에 남긴다. 알림 옵션마다 반복되던 날짜/시간 부제는 제거하며 선택 결과의 정확한 알림 시각은 한 번 유지한다. ‘예정일 선택 선택’ 중복도 제거했다.

현재 정렬은 오른쪽 컨트롤/아이콘 중심선 기준으로 직접 측정했다. 1번에서 지적한 정렬 대상은 별도 질문을 보냈으나 아직 답변이 없어 본문 전체를 임의 재배치하지 않았다. 기본 가정은 해당 사진의 오른쪽 X/내비게이션 열이며 모든 아이콘을 실제 중앙 정렬한다. 오늘 칸 음영·일정/초안/원본 쓰기 확인·캐시/월 이동·기존 접힘/가로분할/세로전환은 유지한다. **사용자는 덕 작업에서 사무실 안내를 제외하라고 명시했다. 완료 답변에 그 안내를 반복하지 않는다.**

최신 확인은 사용자 실행43655786235·1a6dd56·1.0.0(35), Apple업로드2026-11-15 00:07:58 UTC 성공이다. 이번 수정은35 이후라 새 빌드/설치가 필요하다. 이번 요청은 UI 수정이며 추가 빌드를 자동 실행하지 않는다. 직접 실행한 것은 동일 Expo 폼/합성 API·Duo 기하·키보드 가림 검사다. 실제 iOS 키보드/날짜 휠·기기 회전/IME/VoiceOver는 이 환경에서 확인하지 못했다. 공개 화면은 합성자료이고 원본 첨부/개인 일정은 공개하지 않는다. 무료/수동 정책·기존 데이터/인증/서명·복구bundle을 유지한다.

## 구현과 복원 기준

- duoDismissFrames(scene,backVisible,keyboardVisible)가 닫기/키보드 프레임을 각각 반환한다. 키보드가 없으면 이전 scene.back으로 복원한다. 입력 중에는 안전 구간 안에서 키보드 위/X 아래로 쌓으며 같은 x중심을 쓴다. X를 같은 위치에 보장한다고 하지 않는다. 카메라/상태 영역을 피하려고 닫기 원의 y는 한 슬롯 내려갈 수 있다. controlsBottom은 탭·오늘/2주·스크롤바의 안전 시작점에 반영된다. 충분한 높이에서는 기존 아래 탭 위치가 그대로다.
- AppNavigation.verticalItems는 alignItems:center로 내부 아이콘까지 가운데 정렬한다. 작은 헤더/시트 안으로 탭을 옮기지 않는다. 1번 정렬 대상 질문은 답변 대기이며 실제 native 광학 중심 검수는 별도다.
- KeyboardUX는 endCoordinates.screenY와 frame 변화를 제공한다. useKeyboardInset은 View.measureInWindow로 실제 겹침만 구한다. TodoEditorForm은 외부 KeyboardAvoidingView 없이 고정90% sheet, opacity 있는 배경/overflow:hidden과 내부 가림 inset을 사용한다. fixed header와 창 frame에는 translate를 추가하지 않는다. 닫기 drag 애니메이션은 기존 기능이며 입력 자동 이동과 구분한다.
- ScrollRevealContext/ScrollRevealRegion은 펼친 DateTimePickerPanel·알림 popup·장소/메모 그룹을 해당 부모 scroll에 등록한다. useFocusedField는 입력 ref 또는 펼친 View를 측정해 revealOffset으로 scrollTo만 호출한다. native scroll offset과 window 좌표를 사용한다. 이전 onContentSizeChange 한 번의 scrollToEnd는 제거했다. 입력 초점은 지역 등록을 대체하며 지역 unmount 시 해제한다.
- DateTimePickerPanel은 기존 native216pt spinner/44pt Done을 유지한다. 실제 휠을 웹에 가짜로 그리지 않는다. 알림 popup은 옵션 이름/선택 표시만 남기며 메뉴 밖 선택 결과의 정확한 시각·권한/오류 표시를 보존한다. 저장은 키보드·날짜/알림/캘린더 목록 조작 중 숨긴다.
- 사용자 메모 값·selection/글머리표·날짜값과 Done 의미, 저장 전 확인·ETag·연결 권한은 유지한다. 새 네트워크 쓰기·자동 캘린더 변경은 없다.

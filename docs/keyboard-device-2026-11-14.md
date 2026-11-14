# 기기별 키보드와 입력 공간 계약

## 2026-11-14 — 기기별 키보드 닫기·입력 가림·오늘 칸 음영

[현재 계약](keyboard-device-2026-11-14.md) · [검수·새 화면](keyboard-device-qa-2026-11-14.md). 사용자가 Duo와 일반폰의 닫기 위치를 각각 정했다. **Duo 접힘/펼침은 키보드가 열린 동안 카메라 열의 기존 X/뒤로가기 원형 자리를 keyboard-close로 바꾼다. 일반 iPhone은 실제 키보드 바로 위44pt accessory 오른쪽에 작은 완료를 둔다.** 시트 제목/채팅 입력 안의 중복 아이콘은 없앤다. 닫기는 초안을 유지하고 키보드만 내리며 저장/전송/화면닫기0이다. Duo는 키보드가 닫히면 원래 X/뒤로가기 동작을 복원한다. 일반폰 탭은 키보드를 내리면 원위치다. native geometry가 준비된 뒤에만 기기별 accessory를 설정한다.

사진의 TodoEditor에는 저장 숨김과 재배치 후 메모 초점 보정이 빠져 있었다. 이제 할 일/일정 모두 키보드 중 저장을 숨기고 가용 영역을 폼에 준다. focus·viewport layout·keyboardDidShow·입력 높이 변화 뒤 작성 필드를 다시 드러낸다. 메모는 입력 중100~140pt 내부 스크롤로 긴 내용의 caret을 유지하고 키보드를 내리면 원래 높이로 돌아온다. 날짜 피커는 텍스트 초점 시 닫으며 선택 완료와 폼 저장은 별개다.

**오늘은 날짜 칸 전체에 옅은 pale 음영/모서리12pt, 진한 날짜 숫자**다. 다른 날을 선택해도 오늘의 음영은 남는다. 선택한 날의 파란 원·주말 색·이전/다음달 옅은 숫자·월/2주 높이/선·데이터/캐시/원본 쓰기 확인은 유지한다. 참고 서비스의 월요일 시작/하단 메뉴 등을 복제한 것이 아니다. 아래 오늘 범위 답변 대기와 모든기기1번/모든기기2번은 이전 이력이다.

실제 최신 성공은 사용자 실행43609269160·f8a9b36의1.0.0(34), Apple 업로드2026-11-14 15:26:13 UTC다. 이번 변경은34 이후이고 새 native 빌드/설치가 필요하다. 실제 iOS 완료 accessory·Modal native geometry·IME/VoiceOver 검수는 남는다. 이번 수정 요청에서 빌드를 자동 실행하지 않는다. 무료/수동 정책·기존 DB/인증/서명·복구bundle·AI사무실/소개사이트 보류는 유지한다.

## 구현 위치와 재현

- mobile/src/KeyboardUX.tsx의 KeyboardDismiss는 표시 버튼 대신 현재 DuoBackProvider에 키보드 핸들러를 등록한다. Modal은 자신의 DuoSafeSurface 좌표와 등록 목록을 사용한다. 우선순위는 키보드 닫기 → 실제 X/뒤로가기이며 dismiss는 Draft/저장/전송 콜백을 호출하지 않는다. 여러 등록은 symbol별로 해제하고 이전 실제 action을 보존한다.
- mobile/App.tsx는 ready 뒤 configureKeyboardAccessory(duo)를 설정한다. 기존 DuckduckKeyboard ABI setEnabled를 보존하며 일반폰만 켠다. Swift는 기본 .done 대신44pt UIButton을 customView에 담아 큰 OS 강조 pill을 피한다. 기존 RN 입력만 대상으로 원래 accessory를 보존/복원한다. 외부 OAuth/시스템 입력에는 설치하지 않는다.
- useFocusedField는 현재 초점 ref/scroll offset을 보존하고 keyboardDidShow와 layout 후 input/viewport를 측정해 보이는 곳으로 스크롤한다. 키보드 이전 측정 한 번만 믿지 않는다. TodoEditorForm은 native Modal과 합성 geometry fixture가 같은 폼을 실행하게 분리했으며 save/remove·busy·dismiss 흐름을 유지한다. NotesField의 내용/글머리표/selection 저장 방식은 그대로다.
- CalendarEventEditor도 제목/장소/메모에 같은 reveal을 쓴다. 메모에 내부 최대140pt, 기존 저장 숨김을 유지한다. 일정 쓰기/ETag/확인/권한은 바꾸지 않았다.
- CalendarScreen.dateGrid는 day===today일 때 todayCell을 붙인다. 선택일과 독립이며 sourceColor·주말색은 그대로다. 연간의 선택/줌을 바꾸지 않았다.

## 검증과 한계

keyboard-device.mjs는 실제 Expo resolver/동일 TodoEditorForm/일반폰·합성 Duo 접힘/가로/세로·API fixture로 검사한다. 키보드 가림/viewport를 주입하며 실제 iOS 키보드 그림을 만들지 않는다. 일반폰 완료는 Swift 변경이라 브라우저 이미지로 위치 검증 완료를 주장하지 않는다. interaction-repair 회귀의 일반폰 닫기는 웹 Escape/blur와 명시적 fixture hide만 사용한다. Duo 닫기는 실제 camera-column 버튼을 누른다. 과거 inline 아이콘 존재 assertion만 새 계약에 맞게 수정하고 캐시·시각/꼬리·월 seam·확인된 생성/늦은 GET/중복 검사는 유지한다.

원본 첨부4장(B1477F75...)은 개인 정보 때문에 공개하지 않고 새 캡처는 합성 자료8장이다. 새 앱을 설치한 뒤 일반폰 실제 완료 위치/44pt 영역과 IME 확정, Duo Modal의 자기 camera column·닫기 후 원래 X, 메모 첫 줄/긴 내용/caret·키보드 show/hide/회전, 날짜 변경과 별개인 오늘 음영을 실기기로 확인한다. 설치된34에서 서버 배포만으로 native UI가 바뀌지 않는다.

# 새 앱 프로젝트 계약 — 복사하여 작성

이 양식은 새 제품용이다. 빈칸을 docen의 실제 계정/키/가격으로 채우지 않는다. 확정/제안/미정과 근거를 나눈다. 원본 양식 자체는 사용자 승인이나 새 앱 구현 완료 증거가 아니다.

## 제품과 고객

- 제품명/한글·영문 표기:
- 대표 고객/문제/기존 대안:
- 고객의 첫 성공(한 가지):
- 대표 흐름(입력/수신→처리→사용자 결정→결과):
- 이번 범위/다음 단계/명시적 제외:
- 참고 UI와 참고 부분(정보밀도/구성/색/모션)/사용권:

## 새 제품 identity/운영 분리

- 새 저장소/branch/Node·Expo 버전:
- iOS bundle/Android package/Expo project/URL scheme/링크 도메인:
- API origin/웹 공개 도메인/CSRF·CORS:
- DB/키 namespace/백업prefix(값은 기록하지 않음):
- cookie/SecureStore/AsyncStorage/cache namespace:
- provider OAuth앱/redirect/메일 발신 도메인/지원 주소:
- 운영자 계정 지정 방식(개인 주소는 안전한 설정에만):
- 기존 제품에서 절대 가져오지 않을 자료/권한:

## 공통 기반 선택

모듈 목록 JSON의ID/필수여부/추출범위/제품교체/검사/현재상태를 표로 작성한다.

| 모듈ID | 필수/선택/제외 | 실제 사용할 원본/adapter | 새 제품 변경 | 검증/상태 |
|---|---|---|---|---|
|identity-session|필수|작성|작성|미검증|
|transport|필수|작성|작성|미검증|
|app-shell|필수|작성|작성|미검증|
|domain-repository|필수|작성|작성|미검증|

## 핵심 도메인

- entity/필드/owner/revision/시간 의미:
- 입력 검증/정렬/검색/목록·상세·편집:
- 허용 작업/확인 필요한 작업/취소:
- 수동 작성과외부원본 구분:
- 원본지원필드/불가대안/충돌·unknown 처리:
- 멱등key/receipt/실패rollback/오프라인범위:

## UI·기기·접근성

- 지원OS/최소버전/일반폰·태블릿·PC·특수기기:
- navigation/뒤로가기/회전·분할 상태 보존:
- design tokens/행높이·밀도/키보드·시트/동작 줄이기:
- 큰글자·스크린리더·터치·focus/긴번역:
- 필수상태:restoring/empty/error/partial/stale/pending/conflict/unknown:

## 계정·권한·개인정보

- 가입/비밀번호/확인/동의/연령·이메일인증:
- 복원/만료/다중기기/정지·삭제/권한철회:
- OS권한·OAuth scope/자료선택/기억opt-in:
- 수집/처리/보관/수탁사·국외이전/내보내기/삭제/백업:
- 실제 약관 정본/버전/동의기록/변경고지:

## 요금·운영

- 가격정본/월·연/할인/무료량/사용량단위:
- 기능권한/결제거래/원가예산 분리:
- PG준비상태/웹훅검증/환불·정산·회수:
- 관리자역할/읽기·쓰기목록/사유·버전·감사:
- 서버/메일/AI/저장·트래픽한도와초과처리:

## 검증·공개

- local/test/staging/production분리:
- 단위/HTTP/DB/providerfixture/productionUI/native/실기기검사:
- 공개단계(소개만/제한테스트/일반오픈)와서버guard:
- 배포대상/무료·유료범위/자동·수동정책:
- 완료기준/실제증거/미검수·남은작업:
- 시안승인/제품확정근거/문서·ZIP저장경로:

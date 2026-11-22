# 앱 공통 기반 상세 문서·전체 패키지 검증 기록

## 사용자 요청과 실제 범위

2026-11-22 사용자가 앱 공통 사항도 전부 상세히 기록해 다음 앱은 핵심 기능 구현에 집중할 수 있도록 하고, 전체 ZIP과 GitHub를 다시 제공하라고 요청했다.

31개 주제의 공통 설계서,36개 모듈과176개 실제 소스/검증 경로,추출할 연결 계약 예시,58개 출시/경계 검수 항목,새 앱 계약서/AI 인계 양식을 추가했다. 통합 기준/결정원장/README/AGENTS와 전체 문서 지도/생성기에 연결했다. 현재 앱/웹/어드민의 동작·DB·키·가격·공개 단계·약관 고정 버전은 바꾸지 않는다. 완성된 범용 SDK·PG·새 앱 실계정 검증으로 가장하지 않는다.

## 이번에 실행한 검사

- Python 생성기/전체 ZIP 제작 스크립트 문법 검사를 통과했다.
-36개 모듈의176개 소스/검증 파일 경로가 실제 존재하는지 확인했다.
- 모듈 의존ID 존재와 DAG 순환 없음 검사를 통과했다.
- 출시 검수표58항목은 다음 앱용 미실행 양식이다. 이 숫자를 이번 통과한 앱 테스트 수로 보고하지 않는다.
- 전체 패키징의 Git 추적 경로를 검사했다. .env/DB/인증서/개인키/node_modules/Git내부 제외 검사를 수행한다. 공개 website/.npmrc는 fund/audit boolean설정만 있는지 검사하며 인증설정은 허용하지 않는다.
- 전체 ZIP은 커밋된 tree만 읽고 sourceCommit/각파일크기·SHA-256 manifest를 담는다. Git archive와 추적tree 일치·ZIP CRC·모든파일 hash를 생성 과정에서 검사하고 통과한 패키지만 최종 경로에 쓴다.
- 문서전용ZIP에는 전체Markdown(templates포함)·지침·모듈JSON·이미지manifest를 넣는다. 큰 이미지 전체는 별도 기존Notion ZIP/HTML 및 전체소스 ZIP에 있다.

관련 앱 기능/실기기/유료모델/PG/외부원본/메일수신 검사는 이번 문서 작업의 실행 범위가 아니다. 문서화 과정의 관련 문법·링크·모듈/패키지 검사 결과를 앱 전체 재검증으로 바꾸지 않는다.

## 재현 명령

```sh
python3 -m py_compile scripts/build-handoff.py scripts/build-docen-complete-handoff.py
npm run check
python3 scripts/build-handoff.py
# 문서/소스 변경을 커밋하고 tracked tree가 깨끗한 상태에서:
python3 scripts/build-docen-complete-handoff.py
```

전체 ZIP 제작은 네트워크·운영DB·유료API를 사용하지 않는다. 작업공간 변경이 남아 있으면 커밋부터 하도록 거부하며 아직 커밋되지 않은 파일/로컬 .env를 넣지 않는다. 완성 ZIP의 sourceCommit과파일수·크기·hash는 PACKAGE-MANIFEST.json 및 제작 도구의 실제 출력에 있다. GitHub에는 원본 소스/문서를 저장하고 대형 생성 ZIP을 Git blob으로 중복 올리지 않는다.

## 이어받을 때의 경계

기존docen업데이트와별개새앱의identity/DB/키분리를구별한다. 새앱자료정책/법적문서/결제/외부등록/스토어/실기기는제품별로확정한다. README와두START-HERE가각각작업목적별입구다. 운영배포·native빌드·새서비스공개·개인Notion쓰기는이번작업에서실행하지않는다.

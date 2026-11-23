# 첨부 사업자 푸터·약관·환불정책 반영

## 사용자 계약과 원본

2026-11-23 사용자 첨부 1-docen-terms-3.html, 2-docen-footer-2.html, 3-docen-refund-3.html을 content/legal/2026-11-23/docen-{terms,footer,refund}.html에 바이트 그대로 저장했다. 사업자 정보/법률 문구/금액/날짜/자리표시자를 임의 교정하지 않는다. 본문의 더피엠피오·김상현·480-30-01764·경기도 화성시 동탄신리천로2길 66·010-8273-9104·thepmpo.official@gmail.com 및 [통신판매업 신고번호: 신고 완료 후 기재]를 사용한다. 원본 주석에 남은 ‘주소 입력’ 예시는 실제 본문 정보로 대체하거나 표시하지 않는다. 원본 파일은 변경하지 않고 표시용 주석만 제거한다.

## 푸터

website/src/App.jsx에서 footer 원본을 raw import하여 footer-inner의 상세 company/contact/note를 표시한다. 중복된 원본 링크 블록은 제거하고 기존 footer nav에 refund를 추가했다. 기존 terms/privacy 링크 유지. 언어 전환에도 법적 사업자 정보는 원본 한국어 그대로(lang=ko), 영어 UI링크는 Refund policy. styles.css는 전체폭 상세블록·12px/1.9·모바일 grid로 자연스럽게 줄바꿈한다. 지원메일 mailto 및 홈페이지 내 세 링크가 실제 페이지로 이동한다. Docker landing 빌드에도 원본 content/legal 경로를 복사해야 하므로 COPY를 추가했다.

## 정책 생성과 버전

scripts/build-supplied-legal.mjs는 제공 article의 텍스트를 수정하지 않고 완전한 HTML 문서/사이트 nav/기존버전 링크만 감싼다. 표에 스크롤 wrapper와 tabindex/region을 추가한다. 신규 public/terms.html 및 refund.html과 public/legal/2026-11-23/{terms,refund}.html을 생성하고, 동일 고정버전의 내용 변경 시 오류로 중단한다. 기존 build-legal-pages는 old terms 덮어쓰기를 멈추고 기존 privacy/AI/cookies를 그대로 생성한 후 supplied generator를 실행한다. 이전 public/legal/2026-11-22*는 변경하지 않는다. 개인정보처리방침 public/privacy.html도 변경하지 않았다.

server/legal-policy.js는 새 terms version만2026-11-23, privacy/AI/cookies는2026-11-22.2로 구분한다. 동의 검증/저장 모두 실제 terms 버전을 사용한다. 구문서 동의로 신규가입하는 것은 거부하며 기존 가입/동의 DB는 일괄변경하지 않는다. 웹/앱 가입 UI는 /api/legal의 문서별 버전을 이미 사용하므로 별도 UI 변경이 없다. 테스트 fixture 역시 문서별 version을 따른다.

## 경로와 정적배포

server-runtime.js servicePages와 archivedLegal regex에 refund를 추가한다. server/public-launch.js는 GET/HEAD /refund와 고정 archive만 공개 허용하고 나머지 내부/API 차단을 유지한다. website/scripts/prepare-static-host.mjs의 공개 allowlist에도 refund를 추가하고 버전 폴더마다 실제 존재하는 허용 HTML만 복사한다(새 버전에는 terms/refund만 존재함). 공개 사이트에 서버/관리자 파일이나 계정정보를 복사하지 않는다. 기존 무료static/무료Docker 두 배포에 적용하며 도메인 이전 미완료는 기존 계약대로 별도 상태다. PG/결제/환불 실행 기능을 이 문서 게시로 활성화하지 않는다.

## 검증

첨부 대비 새 article textContent를 공백 정규화 후 전체 비교해 본문/금액/날짜/자리표시자 동일을 확인한다. 정규화는 HTML 들여쓰기/표 wrapper 차이만 무시하고 문자는 그대로 비교한다. 실제 Chromium 320/390/1440px에서 사업자 필드 모두 존재, terms/privacy/refund footer 클릭 이동, 문서/푸터 가로넘침 없음, JS pageerror 없음 통과. screenshot/results: artifacts/docen-business-legal-2026-11-23/. 모바일 footer390/terms320 직접 확인. 표는 컨테이너 내부에서 가로 스크롤하며 본문 페이지 전체는 넘치지 않는다.

build:static·기존 서버용 website build·정적호스트 KR/EN 영상 및 안내·오픈 guard 브라우저 회귀·문법 검사 통과. signup/password/public-launch/turso/todos 13테스트 통과. 구약관 버전으로 신규가입 거절과 /refund의 public GET/archive 검사도 보충했다. 개인정보/이전고정버전 git diff없음 확인. 배포 영수증은 실행 후 보충한다.

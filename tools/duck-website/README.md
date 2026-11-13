# 덕 소개 사이트 확인용 다운로드

[duck-website-preview.zip](duck-website-preview.zip)을 내려받아 압축을 풀고 **index.html**을 Chrome/Safari로 여세요. 영상·스크롤·기능 선택·메뉴·QR·FAQ가 들어 있습니다. 별도 설치/터미널은 필요 없습니다.

비교용 프로토타입이며 배경/장식은 원본 참고 자산입니다. 공개 제품 출시 전 덕용 자산 교체/권한 확인이 필요합니다. 실제 업무는 ‘웹에서 열기’로 기존 덕 앱에서 사용하세요. 휴대폰 속 화면은 예시 데이터를 쓴 실제 Expo 웹 앱 녹화입니다.

[전체 구현·검증](../../website/README.md), [검수와 기기 제한](../../website/design-qa.md), [SHA256](preview-sha256.json). 관리 환경에서 직접 file URL은 정책으로 차단됐고 동일 패키지의 HTTP 동작·pageerror0을 검증했습니다. 최종 사용자 브라우저에서 파일 열기는 별도 확인입니다.

재생성: 저장소 루트에서 npm --prefix website run build, npm --prefix website run download 후 deliverables/duck-website-preview 전체를 같은 이름의 루트 폴더로 zip합니다. ZIP·해시를 함께 갱신하고 파일 무결성과 로컬 HTTP 동작을 확인하세요. 기존 앱/인증/데이터/TestFlight 파일은 포함하지 않습니다.

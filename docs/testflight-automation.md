# iPhone 테스트 자동 빌드·제출

`.github/workflows/ios-testflight.yml`은 main의 실제 앱 코드 변경과 수동 workflow_dispatch에 반응한다. 문서·e2e·단위 테스트만 바뀌면 빌드하지 않는다. npm 잠금 파일로 모바일 의존성을 설치하고 타입 검사를 통과한 후 EAS production iOS 빌드를 요청하며 성공한 EAS 빌드는 자동으로 App Store Connect에 제출된다. App Store 공개 배포는 하지 않는다.

## 한 번만 등록

1. https://expo.dev/settings/access-tokens 에서 thepmpo 계정의 토큰을 만든다.
2. https://github.com/thepmpo/donknow/settings/secrets/actions 에서 `EXPO_TOKEN` 이름의 repository secret으로 등록한다. 토큰을 채팅·Git·문서에 붙이지 않는다.
3. https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml 에서 수동 실행하거나 앱 코드 변경을 main에 반영한다.

이미 EAS에 저장된 배포 인증서·프로비저닝 프로파일·App Store Connect API 키와 ascAppId를 사용한다. production의 autoIncrement와 remote 버전 소스를 유지한다. 토큰/인증서가 유효한 한 반복 로그인·테스터 재초대가 필요하지 않다. 갱신·회수된 자격 증명이나 Apple 약관·권한 변경은 별도 대응이 필요하다.

## 상태의 의미

GitHub Actions는 `--no-wait`로 빌드 요청 후 종료해 EAS 대기 시간 동안 GitHub 실행 시간을 소모하지 않는다. 따라서 초록 체크는 빌드 요청 접수이지 IPA 생성·Apple 업로드 성공이 아니다. 실제 상태는 https://expo.dev/accounts/thepmpo/projects/duckduck-donknow/builds 에서 확인하고, Apple 처리 후 https://appstoreconnect.apple.com/apps/6829597261/testflight/ios 에서 TestFlight 가능 여부를 확인한다.

EAS/GitHub의 기존 무료 한도를 사용하며 플랜을 올리지 않는다. 앱 코드가 반영될 때마다 빌드를 요청하므로 변경을 모아 커밋하고 무료 빌드 한도를 확인한다. 제출 실패나 EAS 장애는 Expo 로그를 확인한다. 토큰을 아직 등록하지 않았다면 명확한 오류로 중단한다. 이 저장소에 토큰을 등록하거나 실제 workflow 실행 성공을 확인한 것은 아니다.

서버 변경은 서버 배포가 별도로 필요하다. 디자인 가이드는 `/design-guide`, 인계 문서는 `/project`이다.

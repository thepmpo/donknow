사무실에서 코드 수정 → 검사 → GitHub 반영 → 배포

이미 사무실 설치와 ChatGPT 로그인을 마친 분을 위한 추가 파일입니다.
새 폴더에 압축을 풀고 폴더 안의 파일을 함께 보관하세요.

처음 한 번:
1. 진행 중인 업무가 끝나면 11-enable-development.cmd를 엽니다.
   기존 사무실의 필요한 파일만 백업·검사 후 갱신합니다.
   모르는 수정이나 실행 중인 업무가 있으면 변경하지 않고 멈춥니다.
   정상적인 서버만 확인해서 다시 켜며 로그인·업무·데이터는 초기화하지 않습니다.
   이어서 자동 검사 도구를 다운로드합니다. 완료될 때까지 기다려주세요.
2. 12-connect-github.cmd를 열어 공식 GitHub 화면에서 로그인합니다.
   기존 로그인이 있으면 사용합니다. 비밀번호·토큰·일회 코드는 채팅에 보내지 마세요.
검사 도구 준비만 중단됐을 때는 13-prepare-tests.cmd로 다시 이어갈 수 있습니다.

평소에는 0-open-office.cmd 하나만 여세요.
전체 대화 → 코드 수정 → 최신 코드 확인 → 내용을 확인하고 최신 코드 받기.
요청을 쓰고 수정 범위를 확인한 뒤 실행하세요.
작업이 끝나면 코드 결과에서 변경 내용과 실제 검사 결과를 확인합니다.
검사를 통과한 변경만 GitHub 반영 버튼으로 저장할 수 있습니다.
원격 main이 바뀌거나 검사 후 코드가 달라지면 자동으로 강제 반영하지 않습니다.

공개 사이트 배포:
GitHub 반영과 공개 사이트 배포는 별도 버튼입니다.
배포는 승인한 정확한 커밋으로 GitHub Actions 검사를 다시 하고 기존 Render 서비스를 갱신합니다.
기존 자동 배포 설정·요금제·환경 변수·DB는 바꾸지 않습니다.
아직 Render 연결이 없으면 GitHub Actions 비밀 설정에 RENDER_API_KEY가 필요합니다.
공식 발급 안내: https://render.com/docs/api
비밀 설정: https://github.com/thepmpo/donknow/settings/secrets/actions
값은 이 공식 설정 화면에만 입력하세요. 채팅·문서·코드에는 넣지 마세요.
배포 요청 접수와 실제 Live 성공은 다르며 Actions 실행 결과에서 확인합니다.
https://github.com/thepmpo/donknow/actions/workflows/office-render-deploy.yml

모바일 앱 코드를 main에 반영하면 기존 TestFlight 자동화가 시작될 수 있습니다.
웹 배포 성공은 TestFlight/Apple 처리 완료를 뜻하지 않습니다.
현재 자동 GitHub/Render 반영 대상은 thepmpo/donknow입니다.
다른 프로젝트는 별도 등록과 대상·검증·배포 연결이 필요합니다.

이 파일을 실행하는 것만으로 AI 업무나 배포를 시작하지 않습니다.
실제 계정/모델/기기의 성공은 사용자가 실행한 결과로 확인합니다.
상세 안내: https://github.com/thepmpo/donknow/blob/main/docs/ai-office-development.md

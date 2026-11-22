# 실제 웹 기능 연결 검수

PC 웹 /app의 실제 Expo production 번들을 검사했다. real-api-results.json은 실제 로컬 서버·임시 SQLite·가상 HTTPS 브리지에서 실행한 회원가입/이메일 인증/HttpOnly 세션/쓰기/재조회/완료·복원/맞춤 지침/첨부 업로드/JSON 다운로드/계정 격리다. 메일은 test-outbox이며 실제 메일은 발송하지 않았다. DB는 종료 시 삭제했다.

oauth-results.json은 Google·Slack·Notion 인증 URL/API와 공급자 페이지를 모두 가로챈 합성 검수다. 실제 OAuth 승인·토큰·공급자 접근·사용자 자료를 포함하지 않는다. 캘린더/채팅 성공은 공급자·모델 응답 fixture이며 실계정 생성 결과로 보지 않는다. actual server 테스트의 AI는 꺼진 상태에서 전송 안내와 입력 보존을 확인했다. root unit439통과·기존 선택1제외, PC/전체 웹/예약/Calendar/공유 기하 검사 영수증을 함께 보관한다.

개인 계정 연결은 웹 로그인/이메일 인증/공급자 권한 승인이 필요하다. 실제 모델 품질·키 설정·입금된 AI 예산·운영계정 원본 쓰기는 별도이며 이번 변경에서 임의 활성화하지 않았다.

# 새 로고·로딩·FAQ 삭제 실제 배포 영수증 — 2026-11-23

- 구현커밋:d89ed9f843732a461adfb8b5a365d51b37b6ddd5.
- 배포소스:f83567dcffb062908702e8090b8426e078a638d2. GitHub main/작업branch에일반push성공. 기존일일문서커밋57b08c4를ff로보존했다.
- Render서비스:srv-dbgpc0ff3r2c73abc7e0, 기존duckduck-test/Free/Docker/Singapore, 자동배포off유지. workspace tea-dbgoqa0ae00c73d1q47g는기존사용자확정대상이다. 새서비스/유료자원/환경키/DB/Origin변경없음.
- 새deploy:dep-dc1paqvf3r2c73dc282g, trigger api, 시작2026-11-23T01:22:51.191323Z, **live완료2026-11-23T01:24:27.361019Z**. Render get_deploy로해당SHA와terminal live를확인했다. 기존live dep-dc1ijgeq1p3s738an2g0/57b08c4를대체한다.

## 배포 뒤 공개주소 확인

실행환경curl의CONNECT proxy403은이환경의접근제한이며운영서비스403으로보고하지않는다. 로그인/원격브라우저조작없이공개URL fetch도구로다음결과를읽었다.

1. https://docen.today/ :실제소개본문이조회되고image_links에https://docen.today/site/assets/brand/docen-logo.png가포함된다. 삭제요청한KR Dots FAQ질문이본문에없음을검사했다. 로컬production실조작의KR/EN문항삭제검사도통과했다.
2. https://docen.today/api/health :ok=true,requestLanes=2,release=f83567dcffb062908702e8090b8426e078a638d2. 새배포로응답하는것을확인했다.
3. https://docen.today/coming-soon :웹서비스미오픈준비안내와새/assets/brand/docen-logo.png가조회됐다. 새도메인의소개전용단계는유지한다.

실제iPhone/OS키보드/VoiceOver/native영상/Apple처리/설치를검증한것은아니다. 공개페이지fetch가실계정AI/외부원본쓰기를시험한것도아니다. native설치는새서명빌드가필요하며이번작업에서는수동TestFlight실행/Apple업로드를하지않았다.

## 검증과전달

467자동검사중466통과/기존1skip/실패0,관련5HTTP검사와Sites4검사·문법123·타입·web/iOS JS·격리prebuild/autolink·PC/390px/KR/EN/브랜드/로딩motion/reduced/실패/어드민gate/미오픈브라우저회귀를통과했다. [상세계약/원본/검사](docen-identity-2026-11-23.md).

문서전용ZIP과전체Git추적소스ZIP은재생성한다. 전체ZIP은sourceCommit/각파일SHA-256/CRC/추적tree일치/금지경로검사를생성시수행한다. 배포뒤추가된이영수증/문서만으로다시서비스를배포하지않으며,운영소스SHA는위f83567d다. 개인Notion에실제로저장했다고하지않는다.

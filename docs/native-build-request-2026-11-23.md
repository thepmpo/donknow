# 최신 로고/로딩 영상 iPhone 빌드 요청 — 2026-11-23

## 승인·준비된 소스

사용자가 ‘빌드해’라고 요청했다. 최신앱구현 d89ed9f, 공개웹 f83567d, 요청당시main 9ad050ed27a1e2624ceac8dbccd2615277f5ee58이다. 새로고/icon·BrandLoading·expo-video/asset SDK58잠금파일·FAQ변경·native사전검사수정을포함한다. 작업사본은깨끗하고원격main과일치함을확인했다.

연결GitHub조회로9ad050e의Validate app changes 실행45094564731이success임을확인했다. 이는일반CI이며IPA/Apple제출성공이아니다. 직전로컬467검사중466통과·기존1skip/문법·타입·iOS/webJS·격리prebuild/autolink통과도이전작업의검증으로보존한다.

## 실제 시작 시도·차단

기존ios-testflight.yml은workflow_dispatch만, main/public저장소만, 표준무료xcode-27/Xcode27.1·EASlocal --freeze-credentials·같은IPA제출·자동nativepush없음이다. 이정책/키/서명/유료자원을변경하지않았다.

1. gh run list --repo thepmpo/donknow --workflow ios-testflight.yml ... :workflow GET이Forbidden으로거부됐다.
2. gh api --method POST repos/thepmpo/donknow/actions/workflows/407665801/dispatches -f ref=main --silent :POST자체도Forbidden으로거부됐다.

이응답은빌드컴파일실패나Apple서명실패가아니다. 자동승인심사가거부됐다는도구메시지도없었다. 연결GitHub도구에는읽기/기존job재실행은있으나새dispatch기능은없다. 옛job재실행은옛소스이므로실행하지않고push자동native/다른키/유료EAS로우회하지않았다. 새run·buildnumber·IPA·Apple업로드는시작됐다고보고하지않는다.

## 읽기 확인

연결GitHub fetch의actions/runs?event=workflow_dispatch&per_page=20에서가장최근ios-testflight 실행은43828995337,2026-11-16T08:09:29Z,소스045f3107a7f84bd5ab5eae02bf01dcbddb79798e,completed/success다. 그다음43805463425와43796991834도성공이다. 이들은새로고수정전이며이번요청의새실행이아니다. 일반CI success와구분한다. 원격응답은메타만정리하고계정세부/원문로그/비밀값을문서에복사하지않는다.

## 사용자가 한 번 실행할 위치

https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml

Run workflow → Branch:main → 초록Run workflow를한번누른다. 이전run의Re-run이아니다. 이기록뒤문서만추가된main도같은앱/서명/workflow를포함한다. 실행후새run/SHA/validate/native/Apple제출을읽기도구로이어서확인할수있다. 사용자PC를켜둘필요없다. Apple처리/TestFlight설치/기기영상확인은그후별도다.

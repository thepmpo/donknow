# AI 사무실 주술회전 캐릭터 테마

2026-11-11 사용자 요청으로 현재 사무실 직원14명의 외형과 한국어 표시 이름을 변경했다. 원본 직원 ID/영문 이름/부서/직급/모델/업무/실행 잠금은 유지했다. CEO 사용자 아바타는 직원 테마의 적용 대상에 포함하지 않았다. AI 생성 픽셀 스프라이트이며 원작 공식 게임 리소스를 가져온 것은 아니다.

[실제 적용 화면](https://github.com/thepmpo/donknow/blob/main/tools/ai-office/themes/jujutsu-kaisen/preview.png) · [원본 생성 시트](https://github.com/thepmpo/donknow/blob/main/tools/ai-office/themes/jujutsu-kaisen/atlas.png)

| 부서 | 기존 직원 → 캐릭터 |
|---|---|
| 기획 | Sage → 고죠 사토루, Clio → 나나미 켄토 |
| 개발 | Nova → 이타도리 유지, Bolt → 후시구로 메구미, Aria → 옷코츠 유타 |
| 디자인 | Luna → 쿠기사키 노바라, Pixel → 젠인 마키 |
| 품질관리 | DORO → 판다, Lint → 이누마키 토게, Hawk → 이에이리 쇼코 |
| 인프라보안 | Pipe → 후시구로 토우지, Vault → 게토 스구루 |
| 운영 | Turbo → 료멘 스쿠나, Atlas → 토도 아오이 |

## PC에서 쓰기

[최신 Windows 시작 패키지](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-windows.zip)를 사용한다. 새 사무실 설치 시 기본 적용하고, **서버를 켠 뒤 `6-characters.cmd`**로도 적용할 수 있다. 기존에 사용자 설정이 있는 설치는 setup이 반복해서 외형을 바꾸지 않는다. 이전 ZIP/소스를 받은 PC는 최신 스크립트와 테마 파일이 필요하며, 사용자 코드 변경을 무시하고 덮어쓰지 않는다.

Linux/WSL에서:

```sh
cd /workspace/donknow
node scripts/ai-office-theme.mjs apply jjk
```

Mac Lima는 최신 설치 후 `bash macos.sh characters`를 사용한다. 실제 Windows/Mac 기기 설치·화면 검증은 아직 미확인이며 현재 클라우드 Linux에서 적용·복구·PNG 제공·브라우저 캡처를 확인했다.

## 원래 외형으로 되돌리기

적용 전에 `/workspace/ai-office/state/appearance-backups/jjk-<시각>.json`에 원래 `name_ko`/`sprite_number`를0600으로 보관한다. 기존 이미지 파일을 덮지 않고 새 번호9101~9114를 사용한다. 같은 번호의 다른 파일이 있으면 변경 전에 중단한다.

```sh
node scripts/ai-office-theme.mjs restore /workspace/ai-office/state/appearance-backups/jjk-<시각>.json
```

출력된 실제 백업 경로를 사용한다. 테마 적용 뒤 사용자가 다른 외형을 선택했다면 그 변경을 자동으로 덮지 않고 중단한다. 직원 대응이 없거나 중복되면 적용하지 않는다. 백업은 이 설치의 직원 ID에 대응하므로 다른 환경에 그대로 복원하지 않는다. 다른 환경은 테마 에셋/manifest를 적용하고 원래 영문 직원 이름을 대조한다.

## 에셋·검증

- `tools/ai-office/themes/jujutsu-kaisen/theme.json`:14명 대응, 번호, 파일별 SHA256.
- `atlas.png`: 생성한7열×6행 투명 시트. `sprites/`: 전면/좌/우 각 프레임 총70개 PNG.
- 전면3개 파일은 같은 기본 자세다. 서로 다른 걷기/업무 애니메이션을 제작한 것으로 설명하지 않는다. 사무실에서 위치 이동과 방향 표시는 유지한다.
- 각 프레임은 원본 시트를 분리·정렬하여96px 높이로 준비했다. 사무실의 원래 렌더 크기에 맞춰 표시된다.
- production은 dist 정적 리소스를 제공하므로 public/sprites와 dist/sprites에 같은 해시의 파일을 연결한다. 이후 빌드는 public 파일을 다시 복사한다. 기존 파일이 다른 내용이면 덮어쓰지 않는다.
- 실제 사무실에서14명 매핑,70개 PNG HTTP200/content-type, 브라우저 스크립트 오류 없음, 복원→재적용, 원래 부서/직급/업무/실행 잠금 보존을 확인했다.
- [인수인계 생성기](ai-office-handoff.md)는 새 PNG와 직원 sprite_number를 수집하므로 PC에서 클라우드로 옮길 때 에셋·코드·문서와 함께 인계한다. 인증·권한 자동 이전은 하지 않는다.

이 변경은 AI 업무를 실행하거나 로그인하는 기능이 아니다. 외형이 바뀌어도 실계정 AI 응답 검증 상태는 달라지지 않는다.

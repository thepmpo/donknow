# AI 사무실 승인 게이트 패치

대상: [Claw-Empire](https://github.com/GreenSheep01201/claw-empire)2.0.4, Apache-2.0 upstream `66a24ea7df2435ef897c48c147deb7ec572c01c2`.

`runtime-policy.patch`는 이 정확한 기준 위에 적용하는 사무실 전용 변경이다. duckduck 앱/서버를 변경하지 않는다. 메타데이터·패치 SHA-256은 runtime-policy.json에 있다. 로컬 사무실 policy commit은28baa44이며 upstream 저장소에 push하지 않았다.

## 재현

기존 사무실을 중단하고 상태·설정 백업을 보존한다. 원본 소스가 pinned commit과 다르면 자동 적용하지 않는다.

```sh
node scripts/apply-ai-office-policy.mjs /workspace/ai-office-runtime
```

이 도구는 검증한 코드 패치만 적용하고 모델 연결·직원 실행·비밀 설정 생성·기존 키 변경·자동 병합·push를 하지 않는다. 현재 이미 설치한 사무실에는 재적용하지 않는다. 다른 upstream 버전은 별도 검토가 필요하다.

독립 사무실의 보안 설정에서 `AI_OFFICE_POLICY_ENABLED=true`, `AI_OFFICE_WORKERS_ENABLED=false`, `AI_OFFICE_PROJECTS_ROOT`, `AI_OFFICE_PROVIDER_AUTH_DIR`, 별도 `AI_OFFICE_OWNER_KEY`를 구성한다. 원래 앱의 키/DB는 사용하지 않는다. owner key는 보안 파일에서 생성·보관하며 값 자체를 채팅/로그/Git에 넣지 않는다. 현재 환경에는 이 설정이 적용됐고 **workersEnabled:false(직원 실행 불가)** 상태를 유지한다.

## 검사

vendor에서 `AI_OFFICE_POLICY_ENABLED=false pnpm exec vitest run --config server/vitest.config.ts`, `AI_OFFICE_POLICY_ENABLED=false pnpm run build`를 실행한다. tests는 임시 DB/저장소와 모의 호출이며 운영 AI를 사용하지 않는다.

`node_modules/.bin/tsx scripts/office-sandbox-smoke.ts`는 실제 OS 파일 격리를 확인한다. Codex 끝부분을 고정 셸로 교체하며 가짜 프로젝트/인증 파일만 사용한다. 클라우드 도구 샌드박스 안에서는 uid-map 제한으로 실패하고, 검증된 호스트 실행 경로에서는 통과했다. 실패를 skip/success로 바꾸지 않는다.

실제 Codex 모델/인증/네트워크/도구의 전체 실행은 이 테스트와 별개이며 아직 확인 전이다. 정상 보안 로그인과 작은 격리된 검수 작업을 확인하기 전 workers를 켜지 않는다.

자세한 사용법·제한: [승인 게이트 운영 안내](../../docs/ai-office-approval-gate.md).

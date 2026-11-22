# 새 앱 공통 기반 연결 계약 — 핵심 기능이 붙는 정확한 경계

이 문서의 TypeScript는 **추출할 때 사용할 설계 예시**다. 현재 docen에 이 이름의 범용 패키지가 이미 설치돼 있다는 뜻은 아니다. 원본과의 매핑/검증을 함께 제공해 다음 AI가 이름만 바꾸는 잘못된 복제를 피하도록 한다.

## 1. 앱별 설정

```ts
type AppBrandConfig = {
  productId: string;
  displayName: string;
  apiOrigin: string;
  webOrigin: string;
  storageNamespace: string;
  sessionCookieName: string;
  urlScheme: string;
  supportUrl: string;
  launchPhase: 'introduction' | 'restricted-test' | 'public';
  supportedPlatforms: Array<'ios' | 'web' | 'android'>;
};
```

이 필드는 공개 가능한 앱 설정이다. API key/DB token/OAuth client secret/암호화 seed는 넣지 않는다. 플랫폼이 배열에 있다고 구현/실기기 검증이 생기지는 않는다. docen의 app.json/eas.json/auth storage key/server Origin/site guard를 각기 매핑한다. 기존 앱 업데이트에서는 식별자를 보존하고 별개 새 앱에서만 분리한다.

## 2. SessionController

```ts
type SessionSnapshot =
  | { kind: 'restoring'; epoch: number }
  | { kind: 'anonymous'; epoch: number }
  | { kind: 'unverified'; epoch: number; userId: string }
  | { kind: 'ready'; epoch: number; userId: string }
  | { kind: 'unavailable'; epoch: number; retry: () => void }
  | { kind: 'suspended'; epoch: number };
```

현재auth.ts·useTodos.ts·App.tsx의세션부분을이책임으로추출한다. epoch는계정/origin/로그아웃경계마다바뀐다. restore에서401만anonymous로전환하고timeout/503은unavailable로유지한다. unverified는인증API외자료를불러오지않는다. userId는표시/경계값이며서버owner검사는항상실제세션에서한다.

## 3. 핵심 자료 repository

```ts
type VersionedEntity = {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
type WriteResult<T> =
  | { status: 'confirmed'; item: T }
  | { status: 'queued'; item: T; operationId: string }
  | { status: 'rejected'; reason: string; code: string }
  | { status: 'conflict'; current: T }
  | { status: 'unknown'; operationId: string };
interface DomainRepository<T extends VersionedEntity, Draft, Patch> {
  list(input: { cursor?: string; signal?: AbortSignal }): Promise<{
    items: T[]; nextCursor?: string; partial?: boolean;
  }>;
  read(id: string, signal?: AbortSignal): Promise<T>;
  create(draft: Draft, requestId: string): Promise<WriteResult<T>>;
  update(id: string, patch: Patch, revision: number, requestId: string): Promise<WriteResult<T>>;
  remove(id: string, revision: number, requestId: string): Promise<WriteResult<T>>;
  receipt(operationId: string): Promise<WriteResult<T>>;
}
```

현재repository.ts의Todo API는이인터페이스와동일하지않다. 실제응답을adapter로매핑하고없는revision/receipt기능은서버에추가해야한다. 상태문자열을프런트에서만붙여서멱등성/원자성을가장하지않는다. 삭제의결과자료/취소정책도제품에맞춰조정한다.

핵심기능이제공해야할것은Draft/Patch유효성검사·자료변환·목록정렬·핵심화면·owner/API/DB연결이다. 공통컨트롤러는pending표시·요청세대·응답유실조회·확정실패rollback·충돌안내를담당한다. 늦은receipt가새revision을덮지않는다.

## 4. 원본 adapter

```ts
type ProviderCapabilities = {
  read: boolean;
  create: boolean;
  updateFields: string[];
  complete: boolean;
  remove: boolean;
  deviceOnly: boolean;
};
interface ProviderPort {
  capabilities(): ProviderCapabilities;
  prepare(change: unknown): Promise<{ previewId: string; expiresAt: string }>;
  confirm(previewId: string, requestId: string): Promise<{ operationId: string }>;
  inspect(operationId: string): Promise<unknown>;
}
```

server/source-edits·source-outbox·action-store와기기Apple경로를참고한다. prepare는owner/권한/ETag/동의범위에묶인미리보기다. confirm은같은승인을한번선점한다. inspect는읽기이며원본쓰기를다시실행하지않는다. 지원하지않는필드는대안으로안내한다. 원본을사용하지않는새제품은이모듈을제외한다.

## 5. 알림계획·화면 진입

원칙은‘확정된자료에서계획을만들고이전계획과차이를적용’이다. 새제품이제공할값은owner/entity ID·확정revision·시각/시간대·표시문구·허용화면이다. 로컬예약ID/원격기기token은공통알림관리층이관리하고제품자료본문과섞지않는다.

서버/기기에서전달된대상도현재session owner와자료존재를다시확인한다. 잘못된대상/삭제된자료/다른계정은안전한안내또는기본화면으로가고임의URL을열지않는다. 푸시token이나비밀값을deep link에싣지않는다.

## 6. 기능권한과 원가판정

서버는memberAccess/계정정지/현재이용권·허용작업을확인한다. 외부비용이있는작업은그다음별도AI원가예산을예약한다. 둘중하나의성공으로다른하나를대신하지않는다. 프런트는‘사용가능/한도도달/업그레이드필요/운영중지/준비중’을서버결과로표시한다.

새PG가추가되면검증된서명웹훅→고유거래기록→멱등적이용권변경→감사의경계를만든다. 현재수동이용권테이블에가짜payment ID를넣어실거래로만들지않는다.

## 7. 공통 화면에 등록할 핵심 기능

권장기능등록은id/title/icon/list/detail/editor/permission/loadState/errorState/actions형태다. 실제Reactcomponent등록표이름은새앱이정한다. AppShell은상태/기기/뒤로가기를, DomainFeature는내용과작업의미를담당한다.

예:독서앱이면Book/Draft/Progress와서재/책상세/진도편집을구현하고,공통가입·설정·오류·내보내기·관리자·배포흐름에연결한다. docen의Todo완료/Google원본/3초카운트다운을독서기록에무조건적용하지않는다.

## 8. 모듈 연결의 계약 테스트

| 입력 | 공통층이 지킬 결과 | 핵심 기능이 제공할 부분 |
|---|---|---|
|A계정조회중B로그인|A결과적용안함|owner별자료경계|
|저장성공후응답유실|같은IDreceipt조회·중복생성없음|서버멱등저장|
|구revision수정|conflict/정확거절|원자적version비교|
|provider쓰기미지원|이유/대안·허위성공없음|capability/대안문구|
|전체refresh일부실패|성공분유지·partial표시|source별성공/실패|
|모달닫힌뒤옛응답|새모달상태변경안함|작업/화면identity|
|알림탭대상삭제됨|안전한안내|자료존재/owner조회|
|한도동시요청|예산중복소비없음|원가추정/usage정산|

테스트가불가능한범용인터페이스만늘리지않고실제첫핵심기능하나로계약을검증한다. 성공경로뿐아니라거절/지연/응답유실을먼저고정하면다음기능의구현량이줄어든다.

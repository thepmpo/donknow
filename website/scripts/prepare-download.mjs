// Make an offline, installation-free review copy from the verified Vite build.
import { readFile, mkdir, writeFile, cp } from "node:fs/promises";
import { resolve } from "node:path";
import { inlineBuild } from "./inline-build.mjs";
const root = resolve(new URL("..", import.meta.url).pathname),
  dist = resolve(root, "dist/client"),
  out = resolve(root, "../deliverables/duck-anydo-site-preview");
await mkdir(out, { recursive: true });
await cp(resolve(dist, "assets"), resolve(out, "assets"), { recursive: true });
const html = await inlineBuild(
  await readFile(resolve(dist, "index.html"), "utf8"),
  (asset) =>
    readFile(resolve(dist, "." + asset.replace(/^\/site\//, "/")), "utf8"),
);
await writeFile(resolve(out, "index.html"), html);
await writeFile(
  resolve(out, "먼저 읽어주세요.txt"),
  "docen 소개 사이트 검토용입니다.\n\n압축을 풀고 index.html을 Chrome 또는 Safari로 여세요. 브리핑에서 할 일로·일정으로·대화에서 마치기를 눌러볼 수 있어요. 예시 동작은 계정에 저장되지 않아요.\n이번 버전은 영상 없이 docen 자체 문구와 UI로 만들었습니다. Any.do는 페이지 구성 참고용이며 제휴·공식 연결을 뜻하지 않습니다. 정상 월요금 라이트19,900원·프로55,900원이며 연간 월환산은16,900원·49,900원(연 총202,800원·598,800원)입니다. 베타 기간에는 월 결제에도 같은 연간 할인가를 적용합니다. 비즈니스는 상담형입니다. 라이트/프로는 같은 정리 기능에 사용량 차이를 두며, 직접 AI 채팅은 프로에서 제공합니다. 문서 초안을 포함한 AI 사용량에는 한도가 있습니다. 외부 AI 연결과 결제는 준비 중입니다. Dots의 대화·기억·결과를 자동으로 가져오지 않습니다.\n로그인·실제 앱·지원 문서는 인터넷이 필요합니다. QR은 같은 docen 앱 주소를 엽니다. 로컬 file 직접 실행은 이 환경의 정책으로 확인하지 못했고, 같은 패키지를 HTTP로 검증했습니다.\n",
);
console.log(out);

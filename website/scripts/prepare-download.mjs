// Make an offline, installation-free review copy from the verified Vite build.
import {
  readFile,
  mkdir,
  writeFile,
  cp,
} from "node:fs/promises";
import { resolve } from "node:path";
import { inlineBuild } from "./inline-build.mjs";
const root = resolve(new URL("..", import.meta.url).pathname),
  dist = resolve(root, "dist/client"),
  out = resolve(root, "../deliverables/duck-website-preview");
await mkdir(out, { recursive: true });
await cp(resolve(dist, "assets"), resolve(out, "assets"), { recursive: true });
const html = await inlineBuild(await readFile(resolve(dist, "index.html"), "utf8"), asset => readFile(resolve(dist, "." + asset), "utf8"));
await writeFile(resolve(out, "index.html"), html);
await writeFile(
  resolve(out, "먼저 읽어주세요.txt"),
  "덕 사이트 동작 확인용입니다.\n\n1. 압축을 풉니다.\n2. index.html을 Chrome 또는 Safari로 엽니다.\n3. 스크롤하고 기능 버튼, 메뉴, FAQ, 덕 열기를 눌러보세요.\n\n설치는 필요 없습니다. 영상과 UI는 인터넷 없이도 열립니다. 덕 앱 열기·문의·문서 링크만 인터넷이 필요합니다.\n휴대폰 안은 실제 덕 앱의 예시 데이터 녹화이며, 여기에서 실제 업무를 저장하지 않습니다.\n배경과 장식 캐릭터는 pickle.com 원본을 비교하기 위한 참고 자산입니다. 공개 출시 전에는 덕 자산으로 교체하거나 사용 권한을 확인해야 합니다.\n",
);
console.log(out);

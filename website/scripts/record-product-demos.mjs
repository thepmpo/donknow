import { openDuckTools } from "../../mobile/e2e/helpers.mjs";
import { chromium } from "../../mobile/node_modules/playwright-core/index.mjs";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
const root = resolve(
    new URL("../../mobile/dist-web/", import.meta.url).pathname,
  ),
  origin = "https://duck-chat.test";
const index = Number(process.argv[2] || 0),
  out = resolve("website/public/assets/demos");
await (await import("node:fs/promises")).mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    recordVideo: {
      dir: "/tmp/duck-demo-videos",
      size: { width: 390, height: 844 },
    },
  });
  await page.clock.setFixedTime(new Date("2026-11-13T00:00:00Z"));
  page.setDefaultTimeout(12000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  async function visibleInConversation(locator, message) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const box = await locator.boundingBox(),
        area = await page.getByTestId("duck-chat-scroll").boundingBox();
      if (
        box &&
        area &&
        box.y >= area.y - 1 &&
        box.y + box.height <= area.y + area.height + 1
      )
        return;
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(resolve)),
      );
    }
    assert.fail(message);
  }
  let enabled = true,
    userId = "first-user",
    chatCalls = [],
    prepareCalls = [],
    confirmCalls = [],
    drafts = Array.from({ length: 5 }, (_, index) => ({
      id: "older-" + index,
      operation: "todo.create",
      label: "이전 기록 " + index,
      status: "succeeded",
      args: { title: "예전 업무 " + index, notes: "오래된 기록 ".repeat(30) },
      expiresAt: Date.now() - 1000,
    })),
    todos = [
      {
        id: "t1",
        title: "오늘의 디자인 리뷰 준비하기",
        notes: "검토할 내용을 정리해요.",
        dueDate: "2026-11-13",
        done: false,
        category: "업무",
      },
      {
        id: "t2",
        title: "저녁 산책 20분",
        notes: "",
        dueDate: "2026-11-13",
        done: false,
        category: "일상",
      },
      {
        id: "t3",
        title: "이번 주 읽은 책 정리",
        notes: "조금씩 이어가는 기록",
        dueDate: "2026-11-12",
        done: true,
        category: "일상",
      },
    ],
    holdChat = false,
    releaseChat,
    holdConfirm = false,
    releaseConfirm,
    holdActionsRead = false,
    releaseActionsRead;
  const definition = {
    operation: "todo.create",
    provider: "todo",
    label: "Todo 추가",
    fields: ["title", "notes", "dueDate"],
    required: ["title"],
  };
  await page.addInitScript(
    ({ origin }) =>
      localStorage.setItem(
        "duckduck.mobile.connection.v1",
        JSON.stringify({ mode: "cloud", baseUrl: origin }),
      ),
    { origin },
  );
  await page.route(origin + "/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname,
      method = request.method(),
      body = request.postDataJSON();
    if (!path.startsWith("/api/")) {
      const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
      assert.ok(file.startsWith(root + "/"));
      try {
        await route.fulfill({
          body: await readFile(file),
          contentType:
            {
              ".js": "text/javascript",
              ".html": "text/html",
              ".ttf": "font/ttf",
              ".png": "image/png",
              ".ico": "image/x-icon",
            }[extname(file)] || "application/octet-stream",
        });
      } catch {
        await route.fulfill({ status: 404, body: "" });
      }
      return;
    }
    if (path === "/api/auth/session")
      return route.fulfill({
        json: {
          user: {
            id: userId,
            email: userId + "@example.test",
            emailVerified: true,
          },
        },
      });
    if (path === "/api/auth/logout") {
      userId = "second-user";
      todos = [];
      drafts = [];
      return route.fulfill({ json: { ok: true } });
    }
    if (path === "/api/auth/login")
      return route.fulfill({
        json: {
          user: {
            id: userId,
            email: userId + "@example.test",
            emailVerified: true,
          },
        },
      });
    if (path === "/api/assistant/status")
      return route.fulfill({
        json: {
          enabled,
          message: enabled
            ? "AI 준비됨"
            : "AI 서비스가 아직 설정되지 않았어요. 직접 작업을 작성하고 확인해 실행할 수 있어요.",
          actions: [definition],
        },
      });
    if (path === "/api/assistant/actions" && method === "GET") {
      const snapshot = structuredClone(drafts);
      if (holdActionsRead) {
        holdActionsRead = false;
        await new Promise((resolve) => {
          releaseActionsRead = resolve;
        });
      }
      return route.fulfill({ json: { actions: snapshot } });
    }
    if (path === "/api/assistant/chat") {
      chatCalls.push(body);
      assert.equal(body.consent, true);
      assert.ok(body.message.length <= 2000);
      assert.ok(body.history.every((turn) => turn.text.length <= 2000));
      if (holdChat)
        await new Promise((resolve) => {
          releaseChat = resolve;
        });
      return route.fulfill({
        json: {
          answer:
            "붙여넣은 글에서 할 일 후보를 찾았어요. 내용을 확인하고 추가해주세요.",
          sources: [],
          warnings: [],
          proposals: [
            {
              operation: "todo.create",
              label: "Todo 추가",
              args: {
                title: "금요일 발표 자료 준비",
                notes: "",
                dueDate: null,
              },
              sourceRefs: [],
            },
          ],
        },
      });
    }
    if (path === "/api/assistant/actions" && method === "POST") {
      prepareCalls.push(body);
      const draft = {
        ...body,
        id: "draft-" + prepareCalls.length,
        label: "Todo 추가",
        status: "pending",
        expiresAt: Date.now() + 600000,
      };
      drafts.unshift(draft);
      return route.fulfill({ json: draft });
    }
    if (path.match(/^\/api\/assistant\/actions\/[^/]+\/confirm$/)) {
      confirmCalls.push({ path, body });
      assert.equal(body.confirmation, true);
      if (holdConfirm)
        await new Promise((resolve) => {
          releaseConfirm = resolve;
        });
      const draft = drafts.find((draft) => path.includes(draft.id));
      draft.status = "succeeded";
      todos.push({
        ...draft.args,
        id: "todo-" + confirmCalls.length,
        done: false,
        createdAt: new Date().toISOString(),
        category: "일상",
        reminderAt: null,
      });
      return route.fulfill({ json: draft });
    }
    if (path.match(/^\/api\/todos\/[^/]+$/) && method === "PATCH") {
      const todo = todos.find((x) => path.endsWith(x.id));
      Object.assign(todo, body);
      return route.fulfill({ json: todo });
    }
    if (path === "/api/calendar/calendars")
      return route.fulfill({
        json: {
          items: [
            {
              id: "primary",
              primary: true,
              name: "내 일정",
              canWrite: true,
              color: "#d92d40",
            },
          ],
          nextCursor: null,
        },
      });
    if (path === "/api/calendar/events")
      return route.fulfill({
        json: {
          items: [
            {
              id: "demo:calendar:review",
              eventId: "review",
              calendarId: "primary",
              calendarName: "내 일정",
              title: "오전 디자인 리뷰",
              dueDate: "2026-11-13",
              startAt: "2026-11-13T00:00:00Z",
              endAt: "2026-11-13T01:00:00Z",
              canWrite: true,
              location: "회의실 A",
              notes: "이번 주 진행한 내용을 살펴봐요.",
            },
            {
              id: "demo:calendar:workshop",
              eventId: "workshop",
              calendarId: "primary",
              calendarName: "내 일정",
              title: "팀 워크숍",
              dueDate: "2026-11-18",
              endDate: "2026-11-19",
              allDay: true,
              canWrite: true,
            },
          ],
          calendarId: "primary",
          calendarName: "내 일정",
          canWrite: true,
          connectionState: "connected",
          nextCursor: null,
          readAt: "2026-11-13T00:00:00Z",
        },
      });
    if (path === "/api/todos" && method === "GET")
      return route.fulfill({ json: todos });
    if (path === "/api/todos" && method === "POST") {
      const todo = {
        ...body,
        id: "manual-1",
        done: false,
        createdAt: new Date().toISOString(),
      };
      todos.push(todo);
      return route.fulfill({ json: todo });
    }
    if (path === "/api/capabilities")
      return route.fulfill({
        json: {
          todoNotes: true,
          calendarWorkspace: 2,
          assistant: enabled,
          externalActions: true,
        },
      });
    if (path === "/api/integrations") return route.fulfill({ json: [] });
    if (path === "/api/operations/backup")
      return route.fulfill({
        json: {
          enabled: false,
          offsite: false,
          lastLocalSuccess: null,
          failed: false,
        },
      });
    throw Error("Unexpected API request " + method + " " + path);
  });

  await page.goto(origin);
  const wait = (ms) => page.waitForTimeout(ms);
  if (index === 0) {
    await page.getByRole("tab", { name: "캘린더", exact: true }).click();
    await page.getByTestId("calendar-date-grid").waitFor();
    await wait(1800);
    await page.screenshot({ path: resolve(out, "duck-0.png") });
    await page
      .getByTestId("calendar-date-grid")
      .getByRole("button", { name: /2026년 11월 13일,/ })
      .click({ position: { x: 8, y: 8 } });
    await wait(1800);
    await page
      .getByRole("button", { name: "오전 디자인 리뷰 일정 상세", exact: true })
      .click();
    await wait(2500);
    await page
      .getByTestId("calendar-sheet")
      .getByRole("button", { name: "닫기", exact: true })
      .click();
    await wait(1200);
  } else if (index === 1) {
    await page.getByRole("tab", { name: "Todo 리스트", exact: true }).click();
    await wait(1600);
    await page.screenshot({ path: resolve(out, "duck-1.png") });
    await page
      .getByRole("checkbox", {
        name: "오늘의 디자인 리뷰 준비하기 완료하기",
        exact: true,
      })
      .click();
    await wait(2400);
    await page.getByRole("button", { name: "할 일 추가", exact: true }).click();
    await wait(700);
    await page
      .getByRole("textbox", { name: "할 일 제목", exact: true })
      .pressSequentially("내일 회의 안건 정리", { delay: 90 });
    await wait(1200);
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await wait(2000);
  } else if (index === 2) {
    await page.getByRole("tab", { name: "duckduck", exact: true }).click();
    await wait(1300);
    await page.screenshot({ path: resolve(out, "duck-2.png") });
    await page
      .getByRole("textbox", { name: "덕에게 이야기하기", exact: true })
      .pressSequentially("금요일 발표 자료 준비를 할 일로 정리해줘", {
        delay: 70,
      });
    await wait(800);
    await page
      .getByRole("checkbox", {
        name: "선택한 자료와 내 Todo를 AI에 보내 분석하기 동의",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "덕에게 보내기", exact: true })
      .click();
    await wait(2200);
    await page
      .getByRole("button", { name: "Todo 추가 초안 확인", exact: true })
      .click();
    await wait(2200);
  } else {
    await page.getByRole("tab", { name: "log", exact: true }).click();
    await wait(1800);
    await page.screenshot({ path: resolve(out, "duck-3.png") });
    await page
      .getByRole("button", {
        name: "이번 주 읽은 책 정리 되돌리기",
        exact: true,
      })
      .click();
    await wait(1500);
    await page.getByRole("tab", { name: "Todo 리스트", exact: true }).click();
    await wait(2800);
  }
  assert.deepEqual(errors, []);
  const video = page.video();
  await page.close();
  await video.saveAs(resolve(out, `duck-${index}.webm`));
  console.log("Recorded actual Duck app with synthetic data:", index);
} finally {
  await browser.close();
}

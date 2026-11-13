import { chromium } from "../../mobile/node_modules/playwright-core/index.mjs";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const origin = process.env.WEBSITE_ORIGIN || "http://127.0.0.1:4173",
  out = resolve(
    new URL("../../artifacts/duck-website-2026-11-13", import.meta.url)
      .pathname,
  );
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const results = [];
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      recordVideo: {
        dir: "/tmp/duck-site-test-videos",
        size: { width, height },
      },
      isMobile: name === "mobile",
      hasTouch: name === "mobile",
    });
    const page = await context.newPage(),
      errors = [],
      badResponses = [],
      remoteRequests = [];
    page.setDefaultTimeout(12000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400)
        badResponses.push({ url: r.url(), status: r.status() });
    });
    page.on("request", (r) => {
      if (!r.url().startsWith(origin) && !r.url().startsWith("data:"))
        remoteRequests.push(r.url());
    });
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.locator(".hero-" + name).waitFor();
    await page.waitForTimeout(1300);
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll(
          ".hero-" + (innerWidth <= 700 ? "mobile" : "desktop"),
        ),
      ].some((v) => v.currentTime > 0.05),
    );
    assert.equal(
      await page
        .locator(".showcase-phoneVideoCurrent")
        .evaluate((v) => v.paused),
      true,
      "offscreen product recording stays paused",
    );
    const pause = page.getByRole("button", {
      name: "영상 일시정지",
      exact: true,
    });
    await pause.click();
    assert.equal(
      await page.locator(".hero-" + name).evaluate((v) => v.paused),
      true,
    );
    await page.getByRole("button", { name: "영상 재생", exact: true }).click();
    await page.screenshot({ path: resolve(out, name + "-hero.png") });
    await page
      .getByRole("button", { name: "덕 열기", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog", { name: "덕 열기", exact: true });
    await dialog.waitFor();
    await page.waitForFunction(() => {
      const i = document.querySelector(".qr-qr");
      return i?.complete && i.naturalWidth > 0;
    });
    assert.equal(
      await dialog
        .getByRole("link", { name: "웹에서 열기", exact: true })
        .getAttribute("href"),
      "https://duckduck-test.onrender.com/",
    );
    await page.screenshot({ path: resolve(out, name + "-open.png") });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    assert.equal(
      await page
        .getByRole("button", { name: "덕 열기", exact: true })
        .first()
        .evaluate((e) => e === document.activeElement),
      true,
      "Escape restores trigger focus",
    );
    await page.getByRole("button", { name: "언어 선택", exact: true }).click();
    await page
      .getByRole("button", { name: "EN English", exact: false })
      .click();
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    await page
      .getByRole("heading", {
        name: "A little less to carry. A little more room for you.",
        exact: false,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Choose language", exact: true })
      .click();
    await page.getByRole("button", { name: "KR 한국어", exact: false }).click();
    if (name === "mobile") {
      await page
        .getByRole("button", { name: "메뉴 열기", exact: true })
        .click();
      await page.screenshot({ path: resolve(out, "mobile-menu.png") });
      await page
        .locator("#mobile-menu")
        .getByRole("link", { name: "기능", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector("#features").getBoundingClientRect().top < 120,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "메뉴 열기", exact: true })
          .getAttribute("aria-expanded"),
        "false",
      );
    }
    await page
      .locator("#features")
      .evaluate((e) => scrollTo({ top: e.offsetTop, behavior: "instant" }));
    await page.waitForTimeout(800);
    await page
      .getByRole("button", { name: "iPhone 테스트", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "iPhone에서 덕을 만나보세요", exact: true })
      .waitFor();
    assert.ok(
      (await page.getByRole("dialog").innerText()).includes(
        "공개 초대 링크는 아직 준비 중",
      ),
    );
    await page.keyboard.press("Escape");
    await page.locator(".showcase-phone").scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => !document.querySelector(".showcase-phoneVideoCurrent").paused,
    );
    await page.screenshot({ path: resolve(out, name + "-demo.png") });
    const seen = [];
    for (let n = 0; n < 4; n++) {
      const current = page.getByRole("tab", { selected: true });
      const label = await current.innerText();
      seen.push(label);
      const src = await page
        .locator(".showcase-phoneVideoCurrent")
        .getAttribute("src");
      assert.match(src, new RegExp("duck-" + n + "\\.webm$"));
      await current.focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
    }
    assert.equal(
      new Set(seen).size,
      4,
      "keyboard selects all four real Duck recordings",
    );
    await page.waitForFunction(
      () =>
        document.querySelector(".showcase-phoneVideoCurrent").readyState >= 2,
    );
    await page.locator(".showcase-phone").scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => !document.querySelector(".showcase-phoneVideoCurrent").paused,
    );
    await page.waitForTimeout(250);
    const selectedBefore = await page
      .getByRole("tab", { selected: true })
      .innerText();
    await page.locator(".showcase-phoneVideoCurrent").evaluate((v) => {
      v.currentTime = v.duration - 0.15;
    });
    await page.waitForFunction(
      (previous) =>
        document.querySelector('[role="tab"][aria-selected="true"]')
          .innerText !== previous,
      selectedBefore,
    );
    assert.notEqual(
      await page.getByRole("tab", { selected: true }).innerText(),
      selectedBefore,
      "video ending advances feature",
    );
    if (name === "mobile") {
      const pills = page.locator(".showcase-pillViewport");
      await pills.scrollIntoViewIfNeeded();
      const box = await pills.boundingBox();
      const previous = await page.getByRole("tab", {selected: true}).innerText();
      const cdp = await context.newCDPSession(page);
      const point = {x: box.x + box.width * .7, y: box.y + 20};
      await cdp.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [point]});
      await cdp.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [{...point, x: point.x - 90}]});
      await cdp.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
      await page.waitForFunction(previous => document.querySelector('[role="tab"][aria-selected="true"]').innerText !== previous, previous);
      await cdp.detach();
    }
    await page.locator("#approach").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    assert.ok(
      (await page
        .locator(".landing-zone")
        .evaluate((e) =>
          Number(getComputedStyle(e).getPropertyValue("--research-fade")),
        )) > 0.7,
      "scroll darkens background",
    );
    await page.screenshot({ path: resolve(out, name + "-research.png") });
    await page.locator("#privacy").scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({ path: resolve(out, name + "-security.png") });
    await page.locator("#faq").scrollIntoViewIfNeeded();
    const q = page.getByRole("button", {
      name: "덕은 어떤 일을 도와주나요?",
      exact: true,
    });
    await q.click();
    await page
      .getByRole("region", { name: "덕은 어떤 일을 도와주나요?", exact: true })
      .waitFor();
    assert.equal(await q.getAttribute("aria-expanded"), "true");
    await page.waitForTimeout(350);
    await page.screenshot({ path: resolve(out, name + "-faq.png") });
    await q.click();
    assert.equal(await q.getAttribute("aria-expanded"), "false");
    await page.evaluate(() =>
      scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant",
      }),
    );
    await page.waitForTimeout(700);
    await page.screenshot({ path: resolve(out, name + "-footer.png") });
    await page.locator(".footer-download").click();
    await page.getByRole("dialog", { name: "덕 열기", exact: true }).waitFor();
    await page.keyboard.press("Escape");
    for (const w of [320, 390, 700, 768, 1440]) {
      await page.setViewportSize({ width: w, height });
      await page.waitForTimeout(80);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "no horizontal overflow at " + w,
      );
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(200);
    assert.equal(
      await page.locator(".hero-desktop").evaluate((v) => v.paused),
      true,
      "reduced motion pauses decorative videos",
    );
    assert.equal(
      await page
        .locator(".landing-heroTitle")
        .evaluate((e) => getComputedStyle(e).animationName),
      "none",
    );
    await page.getByRole("button", { name: "영상 재생", exact: true }).click();
    await page.waitForFunction(
      () => !document.querySelector(".hero-desktop").paused,
    );
    await page
      .getByRole("button", { name: "영상 일시정지", exact: true })
      .click();
    assert.deepEqual(errors, []);
    assert.deepEqual(badResponses, []);
    assert.deepEqual(
      remoteRequests,
      [],
      "no external requests or real account/model calls",
    );
    results.push({
      name,
      width,
      height,
      errors,
      badResponses,
      remoteRequests,
      checks: [
        "hero playback/pause",
        "offscreen pause",
        "QR and real web target",
        "Escape/focus",
        "KR/EN",
        "mobile menu/anchor",
        "honest TestFlight dialog",
        "four real product videos",
        "keyboard feature tabs",
        "automatic feature advancement",
        "scroll background transition",
        "FAQ expand/collapse",
        "sticky footer reveal/CTA",
        "320–1440 overflow",
        "reduced motion and opt-in playback",
      ],
    });
    const video = page.video();
    await context.close();
    await video.saveAs(resolve(out, name + "-interaction.webm"));
  }
  await writeFile(
    resolve(out, "verification.json"),
    JSON.stringify(
      { date: "2026-11-13", sourceCaptureRun: "43423800908", results },
      null,
      2,
    ),
  );
  console.log(
    "PASS: interactive website, desktop and mobile; all core controls, motion, accessible alternatives, no external network calls.",
  );
} finally {
  await browser.close();
}

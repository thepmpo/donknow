import { chromium } from "../../mobile/node_modules/playwright-core/index.mjs";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const origin = process.env.WEBSITE_ORIGIN || "http://127.0.0.1:4173";
const out = resolve(
  new URL("../../artifacts/duck-beta-annual-2026-11-19", import.meta.url)
    .pathname,
);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
});
const results = [];
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["phone", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: name === "phone",
      hasTouch: name === "phone",
    });
    const page = await context.newPage();
    const errors = [],
      network = [],
      media = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (!r.url().startsWith(origin) && !r.url().startsWith("data:"))
        network.push(r.url());
      if (/\.(mp4|webm|mov)(\?|$)/.test(r.url())) media.push(r.url());
      if (!["GET", "HEAD"].includes(r.method()))
        errors.push("Unexpected write: " + r.method());
    });
    page.setDefaultTimeout(10000);
    await page.goto(origin, { waitUntil: "networkidle" });
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("video,iframe").count(), 0);
    assert.equal(await page.locator(".demo-task").count(), 3);
    await page.screenshot({ path: out + "/" + name + "-hero.png" });
    await page.screenshot({
      path: out + "/" + name + "-full.png",
      fullPage: true,
    });
    await page.locator("#product-demo").scrollIntoViewIfNeeded();
    const demo = page.locator("#product-demo");
    await demo
      .getByRole("button", { name: "할 일로", exact: true })
      .first()
      .click();
    assert.equal(await demo.locator(".demo-task").count(), 2);
    await demo.getByRole("button", { name: /Todo/ }).click();
    assert.match(
      await demo.locator(".demo-task").innerText(),
      /다음 주 제안서/,
    );
    await page.screenshot({ path: out + "/" + name + "-todo.png" });
    await demo
      .locator(".demo-sidebar")
      .getByRole("button", { name: /브리핑/ })
      .click();
    await demo
      .getByRole("button", { name: "일정으로", exact: true })
      .first()
      .click();
    await demo.getByLabel("일정 날짜").fill("2026-11-20");
    await demo.getByLabel("일정 시간").fill("14:00");
    await demo
      .getByRole("button", { name: "일정에 담기", exact: true })
      .click();
    await demo.getByRole("button", { name: /캘린더/ }).click();
    assert.match(
      await demo.locator(".demo-task").innerText(),
      /2026-11-20 14:00/,
    );
    await page.screenshot({ path: out + "/" + name + "-calendar.png" });
    await demo
      .locator(".demo-sidebar")
      .getByRole("button", { name: /브리핑/ })
      .click();
    await demo
      .getByRole("button", { name: "대화에서 마치기", exact: true })
      .click();
    assert.equal(await demo.locator(".demo-task").count(), 0);
    await demo.getByRole("button", { name: /기록/ }).click();
    assert.match(await demo.locator(".demo-task").innerText(), /도서관/);
    await demo.getByRole("button", { name: /미완료로 되돌리기/ }).click();
    await demo
      .locator(".demo-sidebar")
      .getByRole("button", { name: /브리핑/ })
      .click();
    await demo.getByRole("button", { name: /완료: 도서관/ }).click();
    await demo.getByRole("button", { name: /기록/ }).click();
    assert.equal(await demo.locator(".demo-task").count(), 1);
    await demo.getByRole("button", { name: "예시 초기화" }).click();
    assert.equal(await demo.locator(".demo-task").count(), 3);
    await page
      .locator("#pricing")
      .evaluate((el) =>
        el.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    await page.screenshot({ path: out + "/" + name + "-pricing.png" });
    assert.match(await page.locator("#pricing").innerText(), /16,900원/);
    assert.match(await page.locator("#pricing").innerText(), /비즈니스/);
    assert.match(await page.locator("#pricing").innerText(), /49,900원/);
    for (const text of [
      "19,900원",
      "55,900원",
      "202,800원",
      "598,800원",
      "베타 월요금",
    ])
      assert.ok((await page.locator("#pricing").innerText()).includes(text));
    assert.equal(await page.locator("#pricing .regular-price").count(), 2);
    assert.match(await page.locator("#pricing").innerText(), /Dots.*자동/);
    assert.equal(
      await page.locator('a[href*="checkout"],a[href*="stripe"]').count(),
      0,
    );
    const table = page.locator(".table-scroll");
    if (width < 600) {
      assert.ok(await table.evaluate((el) => el.scrollWidth > el.clientWidth));
      await table.evaluate((el) => (el.scrollLeft = 500));
      await page.screenshot({ path: out + "/" + name + "-comparison.png" });
    }
    await page.locator("#faq details").nth(1).locator("summary").click();
    assert.equal(
      await page.locator("#faq details").nth(1).getAttribute("open"),
      "",
    );
    await page.locator(".demo-caption button").click();
    await page.getByRole("dialog").waitFor();
    assert.ok(await page.locator(".qr-image").getAttribute("src"));
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await page.evaluate(
        () => document.activeElement?.closest("[role=dialog]") !== null,
      ),
      true,
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.locator(".closing button").click();
    assert.match(await page.getByRole("dialog").innerText(), /TestFlight/);
    await page.getByRole("button", { name: "닫기", exact: true }).click();
    if (width < 600) {
      await page
        .getByRole("button", { name: "메뉴 열기", exact: true })
        .click();
      await page
        .locator(".mobile-menu")
        .getByRole("link", { name: /요금/ })
        .click();
      assert.equal(await page.locator(".mobile-menu").count(), 0);
    }
    await demo
      .getByRole("button", { name: "할 일로", exact: true })
      .first()
      .click();
    await page.getByRole("button", { name: "Switch to English" }).click();
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    assert.match(await page.locator("h1").innerText(), /Bring it all together/);
    assert.equal(await page.locator("#pricing").getAttribute("lang"), "en");
    assert.match(
      await demo.locator(".demo-status").innerText(),
      /Added to To-dos/,
    );
    const englishText = await page.locator("body").innerText();
    assert.equal(
      /[가-힣]/.test(englishText),
      false,
      "English page has untranslated Korean text",
    );
    assert.match(await page.locator("#pricing").innerText(), /₩16,900/);
    assert.match(await page.locator("#pricing").innerText(), /₩49,900/);
    for (const text of [
      "₩19,900",
      "₩55,900",
      "₩202,800",
      "₩598,800",
      "Beta monthly rate",
      "billed annually",
    ])
      assert.ok((await page.locator("#pricing").innerText()).includes(text));
    assert.equal(await page.locator("#pricing .plan").count(), 4);
    assert.equal(await page.locator("#pricing thead th").count(), 5);
    assert.match(
      await page.locator("#pricing .usage").innerText(),
      /document drafting/,
    );
    assert.ok(
      await page.locator('#pricing a[href="/support?topic=business"]').count(),
    );
    assert.equal(/[가-힣]/.test(await page.title()), false);
    await page
      .locator("#pricing")
      .evaluate((el) =>
        el.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    await page.screenshot({ path: out + "/" + name + "-pricing-en.png" });
    await page.screenshot({
      path: out + "/" + name + "-full-en.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "한국어로 전환" }).click();
    assert.equal(await page.locator("#pricing").getAttribute("lang"), "ko");
    assert.match(await page.locator("#pricing").innerText(), /16,900원/);
    for (const size of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width: size, height });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "horizontal page overflow at " + size,
      );
    }
    const appLinks = await page
      .locator('a[href$="/app"]')
      .evaluateAll((all) =>
        all.map((a) => ({ href: a.href, target: a.target })),
      );
    assert.ok(appLinks.length >= 4);
    assert.ok(appLinks.every((a) => a.href === origin + "/app" && !a.target));
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    assert.deepEqual(media, []);
    results.push({
      name,
      width,
      height,
      passed: true,
      flows: [
        "todo",
        "schedule date and time",
        "finish in chat",
        "restore and complete",
        "reset",
        "pricing and overflow",
        "FAQ",
        "QR and dialog focus",
        "iPhone status",
        "language and mobile navigation",
      ],
      pageErrors: errors,
      externalRequests: network,
      mediaRequests: media,
    });
    await context.close();
  }
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await page.goto(origin);
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
    "auto",
  );
  await page.close();
  await writeFile(
    out + "/results.json",
    JSON.stringify(
      {
        time: new Date().toISOString(),
        source:
          "Duck website in local Chromium; example data; no provider or production account calls",
        results,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}

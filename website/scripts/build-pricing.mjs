import { readFile, writeFile } from "node:fs/promises";
import { pricingCopy, pricingMarkup } from "../src/pricing-content.mjs";
const css = await readFile(
  new URL("../src/pricing.css", import.meta.url),
  "utf8",
);
for (const lang of ["ko", "en"]) {
  const c = pricingCopy[lang],
    html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${c.meta}"><meta name="theme-color" content="#ffffff"><title>${c.title}</title><style>${css}</style></head><body><header><nav class="nav" aria-label="${lang === "en" ? "Main navigation" : "주 메뉴"}"><a class="brand" href="/">docen</a><a href="/#how">${c.nav[0]}</a><a href="/#pricing">${c.nav[1]}</a><a href="/app">${c.nav[2]}</a></nav></header><main id="main">${pricingMarkup(lang)}</main><footer><div class="footer-inner"><span>${c.footer}</span><div class="footer-links">${["/privacy", "/support", "/project"].map((url, i) => `<a href="${url}">${c.footerLinks[i]}</a>`).join("")}</div></div></footer></body></html>`;
  await writeFile(
    new URL(
      "../../public/" + (lang === "en" ? "pricing.en.html" : "pricing.html"),
      import.meta.url,
    ),
    html,
  );
}
console.log("Generated Korean and English pricing from shared product copy.");

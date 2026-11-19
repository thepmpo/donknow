import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import postcss from "postcss";
function pricingContent() {
  return {
    name: "duck-pricing-content",
    resolveId(id) {
      if (id === "virtual:duck-pricing") return "\0duck-pricing";
    },
    async load(id) {
      if (id !== "\0duck-pricing") return;
      const files = ["pricing.html", "pricing.en.html"].map(
        (name) => new URL("../public/" + name, import.meta.url),
      );
      files.forEach((file) => this.addWatchFile(file.pathname));
      const pages = await Promise.all(
        files.map((file) => readFile(file, "utf8")),
      );
      const extract = (html) => {
        const styles = /<style>([\s\S]*?)<\/style>/.exec(html),
          main = /<main id="main">([\s\S]*?)<\/main>/.exec(html);
        if (!styles || !main || /<script/i.test(main[1]))
          throw Error("Pricing content must remain static and bounded");
        return {
          styles: styles[1],
          markup:
            '<div class="pricing-main">' +
            main[1]
              .replace(/<h2(\s|>)/g, "<h3$1")
              .replace(/<\/h2>/g, "</h3>")
              .replace(/id="title"/g, 'id="pricing-title"')
              .replace(
                /aria-labelledby="title"/g,
                'aria-labelledby="pricing-title"',
              )
              .replace('<h1 id="pricing-title">', '<h2 id="pricing-title">')
              .replace("</h1>", "</h2>") +
            "</div>",
        };
      };
      const [ko, en] = pages.map(extract),
        css = postcss.parse(ko.styles);
      if (ko.styles !== en.styles)
        throw Error("Pricing languages must share the same layout CSS");
      css.walkRules((rule) => {
        if (rule.selector === "html") {
          rule.remove();
          return;
        }
        rule.selectors = rule.selectors.map((selector) =>
          selector === ":root" || selector === "body"
            ? ".duck-pricing"
            : selector === "main"
              ? ".duck-pricing .pricing-main"
              : ".duck-pricing " + selector.replace(/\.intro h1/g, ".intro h2"),
        );
      });
      return (
        "export const css=" +
        JSON.stringify(css.toString()) +
        ";export const markup=" +
        JSON.stringify(ko.markup) +
        ";export const markupEn=" +
        JSON.stringify(en.markup) +
        ";"
      );
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/site/" : "/",
  publicDir: "public-site",
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(), pricingContent()],
}));

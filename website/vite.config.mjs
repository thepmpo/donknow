import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {readFile} from "node:fs/promises";
import postcss from "postcss";
function pricingContent(){return {name:'duck-pricing-content',resolveId(id){if(id==='virtual:duck-pricing')return '\0duck-pricing';},async load(id){if(id!=='\0duck-pricing')return;const file=new URL('../public/pricing.html',import.meta.url);this.addWatchFile(file.pathname);const html=await readFile(file,'utf8'),styles=/<style>([\s\S]*?)<\/style>/.exec(html),main=/<main id="main">([\s\S]*?)<\/main>/.exec(html);if(!styles||!main||/<script/i.test(main[1]))throw Error('Pricing content must remain static and bounded');const css=postcss.parse(styles[1]);css.walkRules(rule=>{if(rule.selector==='html'){rule.remove();return;}rule.selectors=rule.selectors.map(selector=>selector===':root'||selector==='body'?'.duck-pricing':selector==='main'?'.duck-pricing .pricing-main':'.duck-pricing '+selector.replace(/\.intro h1/g,'.intro h2'));});const markup='<div class="pricing-main">'+main[1].replace(/id="title"/g,'id="pricing-title"').replace(/aria-labelledby="title"/g,'aria-labelledby="pricing-title"').replace('<h1 id="pricing-title">','<h2 id="pricing-title">').replace('</h1>','</h2>')+'</div>';return 'export const css='+JSON.stringify(css.toString())+';export const markup='+JSON.stringify(markup)+';';}};}


export default defineConfig(({command})=>({
  base:command==='build'?'/site/':'/',
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
  plugins: [react(),pricingContent()],
}));

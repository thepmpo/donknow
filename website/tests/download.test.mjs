import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {inlineBuild} from '../scripts/inline-build.mjs';
test('portable build preserves compiled replacement tokens and script boundaries',async()=>{
 const value="$&|$`|$'|</script>|/assets/duck.png";
 const html=await inlineBuild('<head><link rel="stylesheet" href="/assets/style.css"><script type="module" src="/assets/main.js"></script></head>',async asset=>asset.endsWith('.js')?'globalThis.probe='+JSON.stringify(value)+';':':root{--literal:"$&"}');
 assert.equal((html.match(/<script/g)||[]).length,1,'replacement tokens cannot inject another script');
 const code=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1],context={};
 vm.runInNewContext(code,context);assert.equal(context.probe,value.replace('/assets/','./assets/'));
 assert.ok(html.includes(':root{--literal:"$&"}'));assert.equal(html.includes('src="/assets/main.js"'),false);
});

import {chromium} from '../../mobile/node_modules/playwright-core/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {createHash} from 'node:crypto';
import {SOURCE,publicAsset,realLanding,downloadable} from './policy.mjs';
const out=resolve(process.env.REFERENCE_OUTPUT||'reference-output');await mkdir(out,{recursive:true});await mkdir(resolve(out,'assets'),{recursive:true});
const browser=await chromium.launch({headless:true});const assets=new Set(),evidence=[];
try{
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const dir=resolve(out,name);await mkdir(dir,{recursive:true});
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:name==='mobile',hasTouch:name==='mobile',recordVideo:{dir,size:{width,height}},acceptDownloads:false});
  const page=await context.newPage(),errors=[],events=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(publicAsset(r.url())&&['stylesheet','image','font','media'].includes(r.request().resourceType()))assets.add(r.url());});
  page.on('popup',async p=>{events.push({kind:'popup-blocked',url:p.url()});await p.close();});page.on('download',d=>d.cancel());
  await page.addInitScript(()=>{window.referenceEvents=[];for(const type of ['animationstart','animationend','transitionend'])document.addEventListener(type,e=>{if(window.referenceEvents.length<400)window.referenceEvents.push({type,time:performance.now(),target:e.target?.tagName,property:e.propertyName,animation:e.animationName});},true);});
  async function load(){const r=await page.goto(SOURCE,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(2500);if(!realLanding(await page.locator('body').innerText())){await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(3000);}const text=await page.locator('body').innerText();if(!r?.ok()||!realLanding(text)){await page.screenshot({path:resolve(dir,'blocked.png')});throw Error('reference_source_blocked:'+text.slice(0,180));}return text;}
  const text=await load();await writeFile(resolve(dir,'text.txt'),text);
  async function shot(label){await page.screenshot({path:resolve(dir,label+'.png')});}
  await shot('01-hero');await page.waitForTimeout(3500);await shot('02-hero-later');
  const snapshot=()=>page.evaluate(()=>({url:location.href,width:innerWidth,height:innerHeight,pageHeight:document.documentElement.scrollHeight,
   fonts:[...document.fonts].map(f=>({family:f.family,weight:f.weight,status:f.status})),
   sheets:[...document.styleSheets].map(s=>s.href),
   media:[...document.querySelectorAll('video')].map(v=>({src:v.currentSrc||v.src,poster:v.poster,autoplay:v.autoplay,muted:v.muted,loop:v.loop,currentTime:v.currentTime,duration:Number.isFinite(v.duration)?v.duration:null,paused:v.paused,readyState:v.readyState})),
   animations:document.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime,timing:a.effect?.getTiming(),computed:a.effect?.getComputedTiming(),frames:a.effect?.getKeyframes()})),
   elements:[...document.querySelectorAll('header,nav,h1,h2,h3,p,button,a,img,video,source')].slice(0,650).map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return{tag:e.tagName,text:e.textContent?.trim().slice(0,220),label:e.getAttribute('aria-label'),expanded:e.getAttribute('aria-expanded'),href:e.getAttribute('href'),src:e.currentSrc||e.src,rect:{x:r.x,y:r.y,w:r.width,h:r.height},style:{font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,tracking:s.letterSpacing,color:s.color,background:s.backgroundColor,padding:s.padding,margin:s.margin,gap:s.gap,radius:s.borderRadius,position:s.position,transition:s.transition,animation:s.animation,transform:s.transform}};}),events:window.referenceEvents}));
  const initial=await snapshot();for(const v of initial.media)if(publicAsset(v.src))assets.add(v.src);for(const u of initial.sheets)if(publicAsset(u))assets.add(u);
  let last=-1;for(let i=0;i<35;i++){const y=await page.evaluate(()=>scrollY);if(y===last)break;last=y;await page.mouse.wheel(0,Math.round(height*.7));await page.waitForTimeout(650);await shot('scroll-'+String(i).padStart(2,'0'));}
  await writeFile(resolve(dir,'scrolled.json'),JSON.stringify(await snapshot(),null,2));await page.screenshot({path:resolve(dir,'full-page.png'),fullPage:true});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(800);
  async function click(label,locator){if(!await locator.count()||!await locator.first().isVisible())return false;await locator.first().scrollIntoViewIfNeeded();await locator.first().click({timeout:4000});await page.waitForTimeout(1100);events.push({kind:label,observed:await snapshot()});await shot(label);return true;}
  const download=page.getByRole('button',{name:/앱 다운로드|Download app/i});
  if(await click('download-open',download)){await page.keyboard.press('Escape');await page.waitForTimeout(400);await shot('download-after-escape');events.push({kind:'after-escape',dialogs:await page.getByRole('dialog').count()});await load();}
  const pills=page.getByRole('button').filter({hasText:/대신 전화|KTX|약속을 잡|물건 주문/});const names=await pills.allTextContents();for(let i=0;i<Math.min(names.length,5);i++){await click('feature-'+i,page.getByRole('button').filter({hasText:names[i].trim()}).first());}
  const faq=page.getByRole('button').filter({hasText:/비밀번호|카드 번호|결제.*확인|누가.*볼|피클.*안전/});const questions=await faq.allTextContents();for(let i=0;i<Math.min(questions.length,3);i++)await click('faq-'+i,page.getByRole('button').filter({hasText:questions[i].trim()}).first());
  await page.evaluate(()=>scrollTo(0,0));await click('language-open',page.getByRole('button',{name:/^(KR|한국어|Korean)$/i}));await page.keyboard.press('Escape');
  if(name==='mobile')await click('mobile-menu',page.getByRole('button',{name:/메뉴|menu|navigation/i}));
  await writeFile(resolve(dir,'initial.json'),JSON.stringify(initial,null,2));await writeFile(resolve(dir,'interactions.json'),JSON.stringify(events,null,2));await writeFile(resolve(dir,'errors.json'),JSON.stringify(errors,null,2));await writeFile(resolve(dir,'source.html'),await page.content());
  const video=page.video();await context.close();const path=await video.path();evidence.push({name,width,height,pixels:`${width}x${height}`,video:path.split('/').at(-1),interactions:events.map(e=>e.kind),errors});
 }
 const request=await browser.newContext();let total=0;const manifest=[];
 for(const url of [...assets].slice(0,110)){
  try{const r=await request.request.get(url,{timeout:25000,maxRedirects:0}),headers=r.headers(),type=headers['content-type']||'',expected=Number(headers['content-length']);if(expected>25*1024*1024)continue;const body=await r.body();if(!downloadable({status:r.status(),type,length:body.length,total}))continue;total+=body.length;const hash=createHash('sha256').update(body).digest('hex');let suffix=extname(new URL(url).pathname);if(!/^\.[a-z0-9]{1,6}$/i.test(suffix))suffix=type.includes('css')?'.css':type.includes('woff2')?'.woff2':type.includes('mp4')?'.mp4':'.bin';const file='assets/'+hash+suffix;await writeFile(resolve(out,file),body);manifest.push({url,file,type,bytes:body.length,sha256:hash});}catch(e){manifest.push({url,error:String(e.message).slice(0,160)});}
 }
 await request.close();await writeFile(resolve(out,'assets.json'),JSON.stringify(manifest,null,2));await writeFile(resolve(out,'verification.json'),JSON.stringify({source:SOURCE,scope:'anonymous public marketing page only; no login/forms/purchase',capturedAt:new Date().toISOString(),evidence,assetBytes:total},null,2));console.log(JSON.stringify({source:SOURCE,evidence,assets:manifest.length,total}));
}finally{await browser.close();}

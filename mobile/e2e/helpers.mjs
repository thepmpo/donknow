/** Open optional chat tools without changing manual/offline Duck flows. */
export async function openDuckTools(page){
 const toggle=page.getByRole('button',{name:'대화 도구 열기',exact:true});
 if(await toggle.count()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
}
/** Navigate the current ME hierarchy through its real Back controls. */
export async function openMe(page){
 await page.getByRole('tab',{name:'ME',exact:true}).click();
 for(let i=0;i<6;i++){
  if(await page.getByTestId('me-overview').isVisible())return;
  const physical=page.getByTestId('DuoBackButton');
  if(await physical.count())await physical.click();else await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 }
 await page.getByTestId('me-overview').waitFor({state:'visible'});
}
export async function openMeAccount(page){await openMe(page);await page.getByRole('button',{name:'내 계정 관리',exact:true}).click();await page.getByRole('heading',{name:'내 계정',exact:true}).waitFor();}
export async function openMeData(page){await openMe(page);await page.getByRole('button',{name:'데이터·개인정보',exact:true}).click();}
export async function openMeService(page,name){await openMe(page);let target=page.getByRole('button',{name:name+' 연결 안내',exact:true});if(!await target.count()){await page.getByRole('button',{name:'연결된 서비스 관리',exact:true}).click();target=page.getByRole('button',{name:name+' 연결 안내',exact:true});}await target.click();await page.getByRole('heading',{name,exact:true}).waitFor();await page.getByText('연결 상태를 확인하고 있어요.',{exact:true}).waitFor({state:'hidden'});}
export async function openServicePanel(page,name){if(await page.getByRole('heading',{name,exact:true}).count())return;let panel=page.getByRole('button',{name,exact:true});if(!await panel.count()){const back=page.getByTestId('DuoBackButton');if(await back.count())await back.click();else await page.getByRole('button',{name:'돌아가기',exact:true}).click();}await panel.waitFor({state:'visible'});await panel.click();}
/** Optional AI controls moved out of the conversation while the + design is deferred. */
export async function openAssistantSettings(page){await openMeData(page);await page.getByRole('button',{name:'AI 자료·실행 관리',exact:true}).click();await page.getByRole('heading',{name:'AI 자료·실행 관리',exact:true}).waitFor();}
export async function closeAssistantSettings(page){const back=page.getByTestId('DuoBackButton');if(await back.count())await back.click();else await page.getByRole('button',{name:'돌아가기',exact:true}).click();await page.getByRole('tab',{name:'docen.t ai',exact:true}).click();await page.getByTestId('duck-composer').waitFor();}

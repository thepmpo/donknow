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
export async function openMeService(page,name){await openMe(page);let target=page.getByRole('button',{name:name+' 연결 안내',exact:true});if(!await target.count()){await page.getByRole('button',{name:'서비스 추가·가져오기',exact:true}).click();target=page.getByRole('button',{name:name+' 연결 안내',exact:true});}await target.click();await page.getByRole('heading',{name,exact:true}).waitFor();}
export async function openServicePanel(page,name){const panel=page.getByRole('button',{name,exact:true});await panel.waitFor({state:'visible'});if(await panel.getAttribute('aria-expanded')!=='true')await panel.click();}

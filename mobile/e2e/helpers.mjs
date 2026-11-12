/** Open optional chat tools without changing manual/offline Duck flows. */
export async function openDuckTools(page){
 const toggle=page.getByRole('button',{name:'대화 도구 열기',exact:true});
 if(await toggle.count()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
}

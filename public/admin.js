import {createAdminControls} from './admin-controls.js';
// No admin credentials or role state are stored in the browser. Server authorization is required on every read.
const names={overview:'운영 현황',members:'회원 관리',passes:'이용권',payments:'결제 내역',connections:'서비스 연결·동기화',usage:'AI·사용량',audit:'운영 기록',operators:'운영자 관리'};
const state={view:'members',selected:null,member:null,query:'',offset:0,authorized:false,permissions:[],role:'reader'};
let content=document.querySelector('#content'),logout=null,sessionLabel=null;
const workspaceTemplate='\n  <div class="shell">\n    <aside class="sidebar">\n      <a class="brand" href="/"><img class="docen-logo" src="/assets/brand/docen-logo.png" alt="" width="32" height="32">docen<span class="brand-period" aria-hidden="true">.</span><small>ADMIN</small></a>\n      <a class="admin-web-link" href="/app" target="_blank" rel="noopener">웹 앱 열기 <span aria-hidden="true">↗</span></a>\n      <p class="nav-label">운영 관리</p>\n      <nav aria-label="어드민 메뉴">\n        <button data-view="overview">운영 현황</button>\n        <button data-view="members" aria-current="page">회원 관리</button>\n        <button data-view="passes">이용권</button>\n        <button data-view="payments">결제 내역</button>\n        <button data-view="connections">서비스 연결·동기화</button>\n        <button data-view="usage">AI·사용량</button>\n        <button data-view="audit">운영 기록</button>\n        <button data-view="operators">운영자 관리</button>\n      </nav>\n      <div class="sidebar-bottom"><span class="preview-dot"></span> 운영 관리</div>\n    </aside>\n    <div class="workspace">\n      <header class="topbar"><span id="breadcrumb">운영 / 회원 관리</span><div class="admin-session"><span class="preview-badge" id="session-label">접근 확인 중</span><button class="pill-button" id="admin-logout" hidden>로그아웃</button></div></header>\n      <main id="content" tabindex="-1" aria-busy="true"><p class="subtitle">운영자 권한을 확인하고 있어요.</p></main>\n      <footer>운영자 전용 화면입니다. 모든 변경은 기록되며 PG 결제·구독·환불은 연결 전입니다.</footer>\n    </div>\n  </div>\n';
function mountWorkspace(email){document.body.className='';document.body.innerHTML=workspaceTemplate;content=document.querySelector('#content');logout=document.querySelector('#admin-logout');sessionLabel=document.querySelector('#session-label');sessionLabel.textContent=email+' · '+({owner:'총관리자',operator:'운영자',reader:'조회 전용'}[state.role]??'조회 전용');logout.hidden=false;document.title='docen 어드민 · 운영 관리';}
let controller=null,version=0,memberReadAt=0;
let mutationPending=false;
const RECENT_READ_WINDOW=20_000;
const recentViews=new Map();
const memberViews=new Set(['profile','passes','payments','connections','usage']);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeZone:'Asia/Seoul'}).format(new Date(v)):'기록 없음';
const instant=v=>v?new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(v)):'—';
const number=v=>Number(v??0).toLocaleString('ko-KR'),won=v=>number(v)+'원';
const plan=v=>({pro:'프로',lite:'라이트',free:'무료'}[v]??v);
const badge=(v,tone='')=>`<span class="badge ${tone}">${esc(v)}</span>`;
const title=(v,copy)=>`<h1>${esc(v)}</h1><p class="subtitle">${esc(copy)}</p>`;
const panel=(name,body,aside='')=>`<section class="panel"><div class="panel-head"><h2>${esc(name)}</h2><span>${esc(aside)}</span></div>${body}</section>`;
const table=(head,rows)=>`<div class="table-wrap"><table><thead><tr>${head.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
const fields=list=>`<dl class="fields">${list.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
const stats=list=>`<div class="stats">${list.map(([k,v,n])=>`<section class="stat"><p>${esc(k)}</p><strong>${esc(v)}</strong><small>${esc(n)}</small></section>`).join('')}</div>`;
const memberLink=(id,label=id)=>`<button class="link mono" data-member="${esc(id)}">${esc(label)}</button>`;
async function request(path,{method='GET',body,signal}={}){
 const res=await fetch(path,{method,credentials:'same-origin',cache:'no-store',signal,headers:{'X-Duckduck-Client':'web',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let data;try{data=await res.json();}catch{throw Error('서버 응답을 확인하지 못했어요. 다시 확인해주세요.');}
 if(!res.ok)throw Object.assign(Error(data.error??'조회하지 못했어요.'),{status:res.status,code:data.code});return data;
}
function clearData(){recentViews.clear();memberReadAt=0;state.member=null;state.selected=null;state.query='';state.offset=0;state.authorized=false;if(logout)logout.hidden=true;if(sessionLabel)sessionLabel.textContent='운영자 로그인 필요';}
function gate(message,setup=false){
 controller?.abort();version++;clearData();document.body.className='admin-gate';document.title='docen 어드민 로그인';document.body.innerHTML='<main id="content" class="gate-card" tabindex="-1"></main>';content=document.querySelector('#content');logout=null;sessionLabel=null;
 const brand='<a class="brand" href="/"><img class="docen-logo" src="/assets/brand/docen-logo.png" alt="" width="32" height="32">docen<span class="brand-period" aria-hidden="true">.</span><small>ADMIN</small></a>';
 content.innerHTML=brand+title(setup?'관리자 계정 설정':'어드민 로그인','docen 앱 계정과 별개의 관리자 전용 계정입니다.')+(setup?`<form id="admin-setup" class="admin-login" method="post" action="/api/admin/auth/setup/confirm"><label>아이디 (이메일)<input name="email" type="email" autocomplete="username" required maxlength="254"></label><button class="pill-button" type="button" data-send-code>인증번호 받기</button><label>인증번호<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label><label>관리자 비밀번호<input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label><label>비밀번호 확인<input name="confirmPassword" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label><p id="login-message" role="status">${esc(message)}</p><button class="pill-button" type="submit">비밀번호 설정하고 로그인</button><button class="link" type="button" data-login>로그인으로 돌아가기</button></form>`:`<form id="admin-login" class="admin-login" method="post" action="/api/admin/auth/login"><label>아이디 (이메일)<input name="email" type="email" autocomplete="username" required maxlength="254"></label><label>관리자 비밀번호<input name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="128"></label><p id="login-message" role="status">${esc(message)}</p><button class="pill-button" type="submit">로그인</button><button class="link" type="button" data-setup>처음 설정 · 비밀번호 재설정</button></form>`);
}
function loginForm(message='관리자 아이디와 비밀번호를 입력해주세요.'){gate(message,false);}
function passwordChangeForm(){
 gate('');document.title='docen 어드민 · 비밀번호 변경';
 content.innerHTML='<a class="brand" href="/"><img class="docen-logo" src="/assets/brand/docen-logo.png" alt="" width="32" height="32">docen<span class="brand-period" aria-hidden="true">.</span><small>ADMIN</small></a>'+title('비밀번호 변경','임시 비밀번호를 새 비밀번호로 바꿔야 관리 화면에 들어갈 수 있어요.')+'<form id="admin-password-change" class="admin-login" method="post" action="/api/admin/auth/password/change"><label>새 비밀번호<input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label><label>새 비밀번호 확인<input name="confirmPassword" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label><p id="login-message" role="status">10자 이상으로 설정해주세요.</p><button class="pill-button" type="submit">변경하고 들어가기</button><button class="link" type="button" id="admin-logout">로그아웃</button></form>';
}
function updateNav(){document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view===(state.view==='profile'?'members':state.view))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});document.querySelector('#breadcrumb').textContent='운영 / '+(names[state.view]??'회원 상세');}
function memberList(data){const rows=data.items.map(m=>`<tr><td>${memberLink(m.id)}</td><td><strong>${esc(m.email)}</strong></td><td>${date(m.joinedAt)}</td><td>${badge(plan(m.access.plan))}<small>${m.access.mode==='complimentary'?'프로 무료 제공':'운영자 발급'} · ${m.status==='suspended'?'이용 정지':'이용 가능'}</small></td><td>${badge(m.emailVerified?'인증 완료':'인증 대기',m.emailVerified?'green':'amber')}</td><td><button class="link" data-member="${esc(m.id)}" aria-label="${esc(m.email)} 회원 상세">상세 보기 →</button></td></tr>`).join('');
 return title('회원 관리','사용자 ID나 이메일로 검색한 뒤 회원별 정보를 확인하세요.')+`<section class="panel"><div class="panel-head"><h2>회원 목록</h2><span>${number(data.total)}명 · 검색 결과</span></div><form class="toolbar" id="member-search"><input name="query" type="search" aria-label="회원 검색" placeholder="사용자 ID 또는 이메일 검색" maxlength="100" value="${esc(state.query)}"><button class="pill-button" type="submit">검색</button></form>${table(['사용자 ID','이메일','가입일','현재 이용권','이메일 인증',''],rows||'<tr><td colspan="6" class="empty">검색 결과가 없어요.</td></tr>')}<div class="pagination"><button class="pill-button" data-offset="${Math.max(0,data.offset-25)}" ${!data.offset?'disabled':''}>이전</button><span>${data.total?number(data.offset+1):0}–${number(data.offset+data.items.length)} / ${number(data.total)}</span><button class="pill-button" data-offset="${data.nextOffset??0}" ${data.nextOffset===null?'disabled':''}>다음</button></div></section>`;
}
function memberHeader(m,tab){const tabs=[['profile','회원 정보'],['passes','이용권 목록'],['payments','결제 내역'],['connections','연결·동기화'],['usage','AI 사용량']];return `<button class="back" data-members>← 다른 회원 찾기</button><div class="detail-head"><div class="avatar">${esc(m.email.slice(0,1).toUpperCase())}</div><div><h1>${esc(m.email)}</h1><p class="mono">${esc(m.id)}</p></div></div><div class="tabs" role="tablist" aria-label="회원 상세 메뉴">${tabs.map(([key,label])=>`<button role="tab" data-section="${key}" aria-selected="${key===tab}">${label}</button>`).join('')}</div>`;}
const controls=createAdminControls({state,esc,panel,table,fields,date,instant,badge,plan});
function memberBody(m,section){return memberDetails(m,section)+controls.member(m,section);}
function memberDetails(m,section){
 if(section==='profile')return `<div class="grid">${panel('기본 정보',fields([['사용자 ID',m.id],['이메일',m.email],['가입일',date(m.joinedAt)],['이메일 인증',m.emailVerified?'인증 완료':'인증 대기'],['이용 상태',m.status==='suspended'?'이용 정지':'이용 가능'],['현재 이용권',plan(m.access.plan)],['저장된 할 일',number(m.todos.total)+'개 · 완료 '+number(m.todos.completed)+'개'],['가입 동의',m.signupAgreements?'약관 '+m.signupAgreements.termsVersion+' · 개인정보 '+m.signupAgreements.privacyVersion+' · '+instant(m.signupAgreements.acceptedAt):'기존 가입 · 별도 동의 기록 없음']]))}${panel('현재 이용권',fields([['상품',plan(m.access.plan)],['제공 방식',m.access.mode==='complimentary'?'현재 운영 정책 · 무료 제공':'운영자 개별 발급'],['종료일',m.access.endsAt?date(m.access.endsAt):'만료 설정 없음'],['자동 결제','사용하지 않음']]))}</div><p class="hint">개별 이용권이 없으면 기존 프로 무료 제공 정책을 따릅니다. 개별 이용권 회수·만료 후에는 무료로 전환됩니다.</p>`;
 if(section==='passes')return panel('현재 적용 이용권',table(['상품','제공 방식','상태','시작일','종료일'],m.entitlements.map(p=>`<tr><td>${badge(plan(p.plan))}</td><td>${p.source==='operator'?'운영자 발급':'운영 정책 · 무료 제공'}</td><td>${badge({active:'사용 중',revoked:'회수',expired:'만료',scheduled:'시작 대기'}[p.status]??p.status,p.status==='active'?'green':'gray')}</td><td>${date(p.startsAt)}</td><td>${p.endsAt?date(p.endsAt):'만료 설정 없음'}</td></tr>`).join('')))+`<p class="hint">운영자가 발급한 이용권과 현재 상태를 표시합니다. 결제 내역과 AI 예산은 별도로 관리합니다.</p>`;
 if(section==='payments')return panel('결제 내역','<div class="empty">실제 결제 내역이 아직 연결되지 않았어요.<br>이용권 발급·변경을 결제로 기록하지 않아요.</div>','PG 연동 전');
 if(section==='connections')return panel('저장된 연결 정보',table(['서비스','연결 계정','연결 정보 갱신일','상태'],m.connections.map(c=>`<tr><td>${esc({google:'Google',slack:'Slack',notion:'Notion',naver:'네이버'}[c.provider]??c.provider)}</td><td>${esc(c.label)}</td><td>${instant(c.updatedAt)}</td><td>${badge('정보 저장됨','gray')}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">저장된 외부 연결이 없어요.</td></tr>'))+panel('원본 반영 작업',table(['작업 종류','상태','건수'],[...m.sync.source.map(s=>({...s,kind:'원본 편집'})),...m.sync.tasks.map(s=>({...s,kind:'Google Tasks 완료 반영'}))].map(s=>`<tr><td>${s.kind}</td><td>${esc(s.status)}</td><td>${number(s.count)}</td></tr>`).join('')||'<tr><td colspan="3" class="empty">저장된 반영 작업이 없어요.</td></tr>'))+'<p class="hint">연결 정보 갱신일은 마지막 동기화 성공 시각과 다릅니다. 아래에서 실제 연결 점검과 실패 작업 재시도를 실행할 수 있어요.</p>';
 if(section==='usage')return stats([['에이전트 대화',number(m.usage.agentTurns)+'회',m.usage.period+' · 기록된 대화 기준'],['사용·예약 원가',won(m.usage.usedAndReservedKrw),'확정 원가와 진행 중 예약 포함'],['배정된 AI 예산',won(m.usage.limitKrw),'실제 확인된 예산'],['남은 AI 예산',won(m.usage.remainingKrw),'프로 이용권과 별도']])+panel('사용량 안내','<p class="skeleton-note">이용권을 무료 제공받아도 AI 처리 예산이 자동으로 생기지는 않아요. 모든 종류의 모델 호출 횟수를 집계한 수치는 아니며, 실제 예산과 에이전트 대화 기록을 표시합니다.</p>');
 return '';
}
function selectFirst(){return title(names[state.view],'회원별로 확인할 수 있어요.')+panel('회원 선택','<div class="empty">먼저 회원을 찾아 선택해주세요.<br><button class="link" data-members>회원 찾기 →</button></div>');}
function renderView(html,{busy=false,resetScroll=false}={}){
 content.innerHTML=html;
 content.setAttribute('aria-busy',String(busy));
 if(resetScroll)window.scrollTo(0,0);
}
function memberView(member,view){return memberHeader(member,view)+memberBody(member,view);}
async function load(view=state.view,{reuseRecent=false}={}){
 if(!state.authorized)return false;
 const viewChanged=view!==state.view,selected=state.selected;
 state.view=view;updateNav();controller?.abort();controller=new AbortController();
 const captured=++version,signal=controller.signal;
 if(memberViews.has(view)&&!selected){renderView(selectFirst(),{resetScroll:viewChanged});return true;}
 const cacheKey=view==='members'?JSON.stringify([view,state.query,state.offset]):view;
 const recent=recentViews.get(cacheKey);
 if(reuseRecent&&!mutationPending&&!memberViews.has(view)&&recent&&Date.now()-recent.readAt<RECENT_READ_WINDOW){
  renderView(recent.html,{resetScroll:viewChanged});return true;
 }
 if(reuseRecent&&!mutationPending&&memberViews.has(view)&&state.member?.id===selected&&Date.now()-memberReadAt<RECENT_READ_WINDOW){
  renderView(memberView(state.member,view),{resetScroll:viewChanged});return true;
 }
 const heading=names[view]??'회원 상세';
 const loading='<p class="subtitle" role="status">불러오는 중…</p>';
 renderView((memberViews.has(view)&&state.member?.id===selected?memberHeader(state.member,view):'<h1>'+esc(heading)+'</h1>')+loading,{busy:true,resetScroll:viewChanged});
 try{
  let html;
  if(view==='members'){const data=await request('/api/admin/members?'+new URLSearchParams({q:state.query,offset:String(state.offset)}),{signal});html=memberList(data);}
  else if(view==='overview'){const d=await request('/api/admin/overview',{signal});html=title('운영 현황','실제 계정·연결·사용 기록을 조회해요.')+stats([['전체 회원',number(d.members.total)+'명','가입 계정 기준'],['이메일 인증',number(d.members.verified)+'명','현재 인증 상태'],['저장된 연결',number(d.connections)+'개','외부 접속 정상 여부와 구분'],['에이전트 대화',number(d.agentTurns)+'회',d.period+' · 기록 기준']])+panel('이용권·결제 상태','<p class="skeleton-note">현재 전체 계정에 프로를 무료 제공하고 있습니다.<br>PG 결제 기록은 연결 전이며 매출은 집계하지 않습니다.</p>');}
  else if(view==='operators'){html=title('운영자 관리','관리자 전용 계정과 역할을 관리합니다.')+controls.operators(await request('/api/admin/operators',{signal}));}
  else if(view==='audit'){const d=await request('/api/admin/audit',{signal});const labels={session:'운영자 접속 확인',overview:'운영 현황 조회',members:'회원 검색·목록 조회',member:'회원 상세 조회',audit:'운영 기록 조회'};html=title('운영 기록','실제 운영자 조회 이력을 최근 50건까지 표시합니다.')+panel('조회 이력',table(['일시','운영자','작업','대상 회원 ID'],d.items.map(a=>`<tr><td>${instant(a.createdAt)}</td><td>${esc(a.actorEmail??'삭제된 계정')}</td><td>${esc(labels[a.operation]??a.operation)}</td><td>${a.subjectId?memberLink(a.subjectId):'—'}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">저장된 기록이 없어요.</td></tr>'));html+=panel('변경 기록',table(['일시','운영자','작업','대상','사유'],(d.changes??[]).map(a=>`<tr><td>${instant(a.createdAt)}</td><td>${esc(a.actorEmail)}</td><td>${esc(a.operation)}</td><td class="mono">${esc(a.subjectId??a.after?.operatorId??'—')}</td><td>${esc(a.reason)}<details><summary>변경 전후</summary><pre>${esc(JSON.stringify({before:a.before,after:a.after},null,2))}</pre></details></td></tr>`).join('')||'<tr><td colspan="5" class="empty">변경 기록이 없어요.</td></tr>'));}
  else{const m=await request('/api/admin/members/'+encodeURIComponent(selected),{signal});if(captured!==version)return false;state.member=m;memberReadAt=mutationPending?0:Date.now();html=memberView(m,view);}
  if(captured!==version)return false;
  if(!mutationPending&&!memberViews.has(view)){
   recentViews.delete(cacheKey);recentViews.set(cacheKey,{html,readAt:Date.now()});
   if(recentViews.size>12)recentViews.delete(recentViews.keys().next().value);
  }
  renderView(html);return true;
 }catch(error){if(error.name==='AbortError'||captured!==version)return;if(error.code==='ADMIN_PASSWORD_CHANGE_REQUIRED'){passwordChangeForm();return;}if(error.status===401||error.status===403){loginForm(error.message);return;}content.setAttribute('aria-busy','false');content.innerHTML=title('조회하지 못했어요.',error.message)+'<button class="pill-button" data-retry>다시 확인</button>';}
}
async function bootstrap(){controller?.abort();if(!content.querySelector('#admin-login'))loginForm();const captured=++version;state.authorized=false;state.member=null;if(logout)logout.hidden=true;
 try{const d=await request('/api/admin/session');if(captured!==version)return;if(d.user.mustChangePassword){passwordChangeForm();return;}state.authorized=true;state.role=d.role;state.permissions=d.permissions??[];mountWorkspace(d.user.email);await load();}catch(error){if(captured!==version)return;const message=content.querySelector('#login-message'),submit=content.querySelector('button[type=submit]');if(message)message.textContent=error.status===401?'관리자 아이디와 비밀번호를 입력해주세요.':error.message;if(submit)submit.disabled=false;}
}
function showMembers(){state.selected=null;state.member=null;state.offset=0;void load('members',{reuseRecent:true});}
document.addEventListener('submit',async event=>{event.preventDefault();const form=event.target;
 if(form.id==='admin-password-update'){const data=Object.fromEntries(new FormData(form)),message=form.querySelector('.operation-result'),button=form.querySelector('[type=submit]');if(data.password!==data.confirmPassword){message.textContent='비밀번호 확인이 일치하지 않아요.';return;}button.disabled=true;try{await request('/api/admin/auth/password/change',{method:'POST',body:{currentPassword:data.currentPassword,password:data.password}});if(!form.isConnected)return;form.reset();await bootstrap();}catch(error){if(form.isConnected){message.textContent=error.message;button.disabled=false;}}return;}
 if(form.matches('[data-operation]')){await submitOperation(form,event.submitter);return;}
 if(form.id==='admin-password-change'){
 const submitted=++version,data=new FormData(form),message=form.querySelector('#login-message'),button=form.querySelector('[type=submit]');if(data.get('password')!==data.get('confirmPassword')){message.textContent='비밀번호 확인이 일치하지 않아요.';return;}button.disabled=true;message.textContent='비밀번호를 변경하고 있어요.';try{await request('/api/admin/auth/password/change',{method:'POST',body:{password:data.get('password')}});if(submitted!==version||!form.isConnected)return;form.reset();await bootstrap();}catch(error){if(submitted!==version||!form.isConnected)return;message.textContent=error.message;button.disabled=false;}
 }else if(form.id==='admin-login'||form.id==='admin-setup'){
  const submitted=++version,submit=form.querySelector('button[type=submit]'),message=form.querySelector('#login-message'),data=new FormData(form),setup=form.id==='admin-setup';if(setup&&data.get('password')!==data.get('confirmPassword')){message.textContent='비밀번호 확인이 일치하지 않아요.';return;}submit.disabled=true;message.textContent=setup?'관리자 계정을 설정하고 있어요.':'로그인 중…';
  try{await request(setup?'/api/admin/auth/setup/confirm':'/api/admin/auth/login',{method:'POST',body:{email:data.get('email'),password:data.get('password'),...(setup?{code:data.get('code')}:{})}});if(submitted!==version||!form.isConnected)return;form.reset();state.selected=null;state.query='';state.offset=0;state.view='members';await bootstrap();}catch(error){if(submitted!==version||!form.isConnected)return;message.textContent=error.message;submit.disabled=false;}
 }else if(form.id==='member-search'){state.query=String(new FormData(form).get('query')??'');state.offset=0;void load('members');}
});
async function submitOperation(form,submitter){
 if(mutationPending)return;
 const data=Object.fromEntries(new FormData(form));let path=form.dataset.operation;const method=form.dataset.method??'POST';const message=form.querySelector('.operation-result');
 if(path.includes('/connections/'))path+='/'+(submitter?.value==='refresh'?'refresh':'check');
 if(path.includes('/passes')){data.endsAt=data.endsAt?new Date(data.endsAt).toISOString():null;if(submitter?.value==='revoke')data.revoke=true;}
 if(path.includes('/operators')){data.disabled=data.disabled==='true';if(!data.temporaryPassword)delete data.temporaryPassword;}
 const body={...data,version:Number(form.dataset.version)};const signature=JSON.stringify([path,body]);if(form._signature!==signature){form._requestId=crypto.randomUUID();form._signature=signature;}body.requestId=form._requestId;
 const buttons=[...form.querySelectorAll('button')];
 const memberId=state.selected,view=state.view;
 mutationPending=true;memberReadAt=0;recentViews.clear();
 buttons.forEach(button=>button.disabled=true);message.textContent='처리 중…';
 try{
  const result=await request(path,{method,body});
  mutationPending=false;
  if(!state.authorized||(!form.isConnected&&(state.selected!==memberId||!memberId||!memberViews.has(state.view))))return;
  const refreshed=await load();
  if(!refreshed||!state.authorized||(memberId?state.selected!==memberId:state.view!==view))return;
  const notice=document.createElement('p');
  notice.className='operation-notice';notice.setAttribute('role','status');
  notice.textContent=result.notified?'docen 비서에 기기 확인 안내를 전달했어요.':result.state==='failed'?'연결 확인 결과를 기록했어요. 서비스 재승인이 필요할 수 있어요.':result.refreshed?'자료를 새로 확인했어요. 일부 자료는 다음 페이지에 있을 수 있어요.':'변경 내용을 저장했어요.';
  if(result.passId&&!result.revoked&&state.member?.access.plan===result.plan)notice.textContent=plan(result.plan)+' 이용권을 적용했어요.';
  content.prepend(notice);notice.tabIndex=-1;notice.focus();
 }catch(error){
  if(!form.isConnected)return;
  if(error.status===401){loginForm(error.message);return;}
  message.textContent=error.message;buttons.forEach(button=>button.disabled=false);
 }finally{mutationPending=false;}
}
async function signOut(){controller?.abort();version++;clearData();loginForm('로그아웃 중…');try{await request('/api/admin/auth/logout',{method:'POST',body:{}});loginForm('로그아웃했어요.');}catch(error){loginForm('로그아웃 응답을 확인하지 못했어요. '+error.message);}}
document.addEventListener('click',async event=>{const b=event.target.closest('button');if(!b||b.disabled)return;
 if(b.hasAttribute('data-setup'))gate('등록된 관리자 이메일로 인증번호를 받아 비밀번호를 설정해주세요.',true);
 else if(b.hasAttribute('data-login'))loginForm();
 else if(b.hasAttribute('data-send-code')){const form=b.closest('form'),input=form.querySelector('[name=email]'),message=form.querySelector('#login-message');if(!input.reportValidity())return;b.disabled=true;message.textContent='인증번호를 요청하고 있어요.';try{const d=await request('/api/admin/auth/setup/send',{method:'POST',body:{email:input.value}});message.textContent=d.message+' 받은 인증번호와 새 비밀번호를 입력해주세요.';}catch(error){message.textContent=error.message;}finally{b.disabled=false;}}
 else if(b.id==='admin-logout')await signOut();
 else if(b.dataset.view){if(b.dataset.view==='members')showMembers();else void load(b.dataset.view,{reuseRecent:true});}
 else if(b.dataset.member){state.selected=b.dataset.member;void load('profile');}else if(b.dataset.section)void load(b.dataset.section,{reuseRecent:true});else if(b.hasAttribute('data-members'))showMembers();else if(b.hasAttribute('data-retry'))void load();else if(b.hasAttribute('data-offset')){state.offset=Number(b.dataset.offset);void load('members');}
});
window.addEventListener('pageshow',event=>{if(event.persisted)void bootstrap();});window.addEventListener('pagehide',()=>{controller?.abort();version++;clearData();document.body.className='admin-gate';document.body.innerHTML='<main id="content" class="gate-card"></main>';content=document.querySelector('#content');logout=null;sessionLabel=null;});
void bootstrap();

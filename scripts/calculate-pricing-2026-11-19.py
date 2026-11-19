"""Reproducible planning model, not a measured invoice or profit guarantee. No API calls."""
from pathlib import Path
import json, math, csv
import xlsxwriter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/pricing-2026-11-19'
OUT.mkdir(parents=True,exist_ok=True)
A={
 'fx_krw_per_usd':1600,'ai_cost_buffer':.20,'vat':.10,
 'web_fee_of_gross':.0385,'refund_reserve_of_gross':.02,
 'normal_support_krw':1000,'heavy_support_krw':3000,
 'replacement_marketing_per_paid':1500,'paid_data_indexing_reserve':200,'free_per_paid':3,'free_service_cost':300,
 'fixed_infrastructure_krw':200000,'fixed_operations_risk_reserve':50000,
 'monthly_labor_krw':3000000,'lite_share':.60,
 'lite_price':16900,'pro_price':49900,'lite_regular_monthly':19900,'pro_regular_monthly':55900,'lite_annual_gross':202800,'pro_annual_gross':598800,'lite_ai_cap_proposal':4000,'pro_ai_cap_proposal':18000,
 'mini_input_usd_per_million':.75,'mini_output_usd_per_million':4.5,
 'nano_input_usd_per_million':.20,'nano_output_usd_per_million':1.25,
 'web_search_usd_per_call':.01,'container_1gb_usd_per_20min':.03,
}
fx=A['fx_krw_per_usd']*(1+A['ai_cost_buffer'])
def token_cost(model,inp,out):
 return (inp*A[model+'_input_usd_per_million']+out*A[model+'_output_usd_per_million'])/1e6*fx
U={
 'source_batch':token_cost('nano',4000,300),
 'briefing':token_cost('mini',12000,1200),
 'chat_turn':token_cost('mini',8000,1500),
 # Three model steps, each 20k input/4k output, all intermediate/reasoning outputs included in this estimate.
 'standard_document':token_cost('mini',60000,12000),
 # A costly document: 600k aggregate input,30k aggregate output,5 searches and one 1GB container session.
 'complex_document':token_cost('mini',600000,30000)+(5*A['web_search_usd_per_call']+A['container_1gb_usd_per_20min'])*fx,
}
profiles={
 'lite_normal':{'source_batch':220,'briefing':44,'chat_turn':0,'standard_document':3,'complex_document':0},
 'lite_heavy':{'source_batch':2200,'briefing':220,'chat_turn':0,'standard_document':0,'complex_document':10},
 'pro_normal':{'source_batch':440,'briefing':88,'chat_turn':300,'standard_document':10,'complex_document':0},
 'pro_heavy':{'source_batch':2200,'briefing':220,'chat_turn':2000,'standard_document':0,'complex_document':40},
}
profile_cost={k:sum(U[t]*n for t,n in v.items()) for k,v in profiles.items()}
def plan_economics(plan,h,capped=True,fee=None):
 price=A[plan+'_price'];fee=A['web_fee_of_gross'] if fee is None else fee
 ai=sum(w*(min(profile_cost[plan+'_'+kind],A[plan+'_ai_cap_proposal']) if capped else profile_cost[plan+'_'+kind]) for kind,w in [('normal',1-h),('heavy',h)])
 support=(1-h)*A['normal_support_krw']+h*A['heavy_support_krw']
 # Web fee charged against VAT-inclusive gross. Refund reserve is conservative, not booked refund revenue.
 receipts=price/(1+A['vat'])-price*fee
 other=price*A['refund_reserve_of_gross']+support+A['replacement_marketing_per_paid']+A['paid_data_indexing_reserve']+A['free_per_paid']*A['free_service_cost']
 return {'price':price,'net_receipts':receipts,'ai':ai,'support':support,'other_variable':other,'contribution':receipts-ai-other}
def fleet(n,h,capped=True,fee=None,lite_share=None,fixed=None):
 ls=A['lite_share'] if lite_share is None else lite_share
 l=plan_economics('lite',h,capped,fee);p=plan_economics('pro',h,capped,fee)
 margin=ls*l['contribution']+(1-ls)*p['contribution']
 overhead=A['fixed_infrastructure_krw']+A['fixed_operations_risk_reserve'] if fixed is None else fixed
 result=n*margin-overhead
 return {'paid_users':n,'heavy_ratio':h,'lite_share':ls,'capped':capped,'gross':n*(ls*l['price']+(1-ls)*p['price']), 'ai':n*(ls*l['ai']+(1-ls)*p['ai']),'contribution_per_paid':margin,'fixed':overhead,'operating_balance_before_labor':result,'balance_after_3m_labor':result-A['monthly_labor_krw'],'break_even_before_labor':math.ceil(overhead/margin) if margin>0 else None,'break_even_after_labor':math.ceil((overhead+A['monthly_labor_krw'])/margin) if margin>0 else None}
rows=[fleet(n,h,cap) for cap in [False,True] for n in [10,20,50,70,100,500] for h in [0,.1,.3,.5,.7,1]]
worst=[{'plan':plan,**plan_economics(plan,1,True)} for plan in ['lite','pro']]
# How much chat capacity remains at the illustrative average, after normal briefings/source handling/documents.
remaining_chat={plan:math.floor(max(0,A[plan+'_ai_cap_proposal']-sum(U[k]*v for k,v in profiles[plan+'_normal'].items() if k!='chat_turn'))/U['chat_turn']) for plan in ['lite','pro']}
# The Lite counter is a theoretical conversion only: direct chat is not included in Lite.
result={'assumptions':A,'unit_costs_krw':U,'profiles':profiles,'profile_costs_krw':profile_cost,'all_heavy_per_plan':worst,'pro_illustrative_monthly_chat_turns_after_normal_other_work':remaining_chat['pro'],'scenarios':rows,'mix_sensitivity_all_heavy':[fleet(100,1,True,lite_share=v) for v in [0,.4,.6,1]],'fee_sensitivity_all_heavy':[fleet(100,1,True,fee=v) for v in [.0385,.15,.30]],'notes':['Displayed monthly prices16900/49900 are the beta monthly rates and annual monthly equivalents. Regular monthly prices19900/55900; annual upfront totals202800/598800. Annual upfront cash receipts are not twelve months of immediately earned profit.','Amounts are monthly KRW. No measured usage, payment settlement or real external generation.','FX1600 and 20% AI buffer are budgeting assumptions, not spot FX or a guarantee. No cache/batch savings assumed.','Prices VAT-inclusive; fee rate3.85% of gross is a conservative web-payment assumption, not an agreed PSP quote. Alternate platform percentages here are stress tests on the same gross-fee basis, not official Apple settlement calculations.','Free ratio3:1, 300 KRW/free user, paid data/index reserve200, normal support1k/heavy3k, replacement marketing1500 are assumptions. Extra acquisition spend, corporate tax, unknown compliance quotes and headcount beyond one 3M labor allowance are excluded.','Infrastructure200k and operating risk50k are planning reserves, not capacity-tested provider quotations. 500-paid-user rows retain the same fixed reserve for comparability and need additional capacity/infra stress before launch.','AI cap4k/18k and workload routing are proposals. Existing production has an absolute4k cap and25% funding rule. It has not been increased or funded. Pricing is not enforcement.','Standard document uses aggregate60k/12k tokens across3 steps. Complex document uses aggregate600k/30k plus5 searches and1GB20min container. These are workload estimates, not output guarantees.','Source batching, change-only generation and mini/nano routing are assumed. Actual provider model configuration, source permissions, tool caps, result quality and per-request reservations must be measured.','Shared AI allowance includes briefing, analysis, drafting, chat, tools, failures and repeated work. A per-call cap, concurrent pre-reservation and server stop are necessary.']}
(OUT/'pricing-model.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
with (OUT/'scenario-results.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=rows[0].keys(),lineterminator="\n");w.writeheader();w.writerows(rows)
book=xlsxwriter.Workbook(OUT/'duck-pricing-and-heavy-users.xlsx')
head=book.add_format({'bold':True,'bg_color':'#1B3556','font_color':'white','text_wrap':True});num=book.add_format({'num_format':'#,##0'});edit=book.add_format({'num_format':'0.0000','font_color':'#2468EB'});wrap=book.add_format({'text_wrap':True,'valign':'top'});pct=book.add_format({'num_format':'0%'});
ws=book.add_worksheet('Assumptions');ws.set_column('A:A',40);ws.set_column('B:B',21);ws.write_row(0,0,['Assumption (editable)','Value'],head)
refs={}
for r,(k,v) in enumerate(A.items(),1):ws.write(r,0,k);ws.write_number(r,1,v,edit);refs[k]=f"Assumptions!$B${r+1}"
unit=book.add_worksheet('Unit costs');unit.set_column('A:G',24);unit.write_row(0,0,['Workload','Input tokens, aggregate','Output tokens, aggregate','Model','Search calls','Container sessions','KRW with reserve'],head)
unit_ref={}
for r,(name,inp,out,model,search,container) in enumerate([('source_batch',4000,300,'nano',0,0),('briefing',12000,1200,'mini',0,0),('chat_turn',8000,1500,'mini',0,0),('standard_document',60000,12000,'mini',0,0),('complex_document',600000,30000,'mini',5,1)],1):
 rr=r+1;unit.write_row(r,0,[name,inp,out,model,search,container]);formula=f'=((B{rr}*{refs[model+"_input_usd_per_million"]}+C{rr}*{refs[model+"_output_usd_per_million"]})/1000000+E{rr}*{refs["web_search_usd_per_call"]}+F{rr}*{refs["container_1gb_usd_per_20min"]})*{refs["fx_krw_per_usd"]}*(1+{refs["ai_cost_buffer"]})';unit.write_formula(r,6,formula,num,U[name]);unit_ref[name]=f"'Unit costs'!$G${rr}"
pws=book.add_worksheet('Profiles');pws.set_column('A:G',23);pws.write_row(0,0,['Profile',*U.keys(),'AI cost,KRW'],head);profile_ref={}
for r,(name,profile) in enumerate(profiles.items(),1):
 pws.write_row(r,0,[name,*[profile[k] for k in U]]);rr=r+1;formula='='+ '+'.join(f'{chr(66+i)}{rr}*{unit_ref[k]}' for i,k in enumerate(U));pws.write_formula(r,6,formula,num,profile_cost[name]);profile_ref[name]=f'Profiles!$G${rr}'
sws=book.add_worksheet('Heavy user scenarios');sws.freeze_panes(1,0);sws.set_column('A:J',24);sws.write_row(0,0,['Paid users','Heavy ratio','Capped 1=yes','Lite share','Gross','AI cost','Variable contribution','Fixed reserves','Before labor','After labor'],head)
for r,row in enumerate(rows,1):
 rr=r+1;sws.write_row(r,0,[row['paid_users'],row['heavy_ratio'],int(row['capped']),row['lite_share']]);sws.set_row(r,19)
 for col in [1,3]:sws.write_number(r,col,[row['paid_users'],row['heavy_ratio'],int(row['capped']),row['lite_share']][col],pct)
 costs={}
 for plan in ['lite','pro']:
  n=profile_ref[plan+'_normal'];h=profile_ref[plan+'_heavy'];cap=refs[plan+'_ai_cap_proposal'];costs[plan]=f'((1-B{rr})*IF(C{rr}=1,MIN({n},{cap}),{n})+B{rr}*IF(C{rr}=1,MIN({h},{cap}),{h}))'
 price=f'(D{rr}*{refs["lite_price"]}+(1-D{rr})*{refs["pro_price"]})'
 gross=f'=A{rr}*{price}';ai=f'=A{rr}*(D{rr}*{costs["lite"]}+(1-D{rr})*{costs["pro"]})'
 margin=f'=E{rr}/(1+{refs["vat"]})-E{rr}*({refs["web_fee_of_gross"]}+{refs["refund_reserve_of_gross"]})-F{rr}-A{rr}*((1-B{rr})*{refs["normal_support_krw"]}+B{rr}*{refs["heavy_support_krw"]}+{refs["replacement_marketing_per_paid"]}+{refs["paid_data_indexing_reserve"]}+{refs["free_per_paid"]}*{refs["free_service_cost"]})'
 for c,f,v in [(4,gross,row['gross']),(5,ai,row['ai']),(6,margin,row['contribution_per_paid']*row['paid_users']),(7,'='+refs['fixed_infrastructure_krw']+'+'+refs['fixed_operations_risk_reserve'],row['fixed']),(8,f'=G{rr}-H{rr}',row['operating_balance_before_labor']),(9,f'=I{rr}-{refs["monthly_labor_krw"]}',row['balance_after_3m_labor'])]:sws.write_formula(r,c,f,num,v)
sws.autofilter(0,0,len(rows),9)
notes=book.add_worksheet('Read me');notes.set_column('A:A',130)
for r,note in enumerate(result['notes']):notes.write(r,0,note,wrap);notes.set_row(r,47)
notes.write(len(result['notes'])+1,0,'Sources: developers.openai.com/api/docs/models/gpt-5.4-mini ; gpt-5.4-nano ; developers.openai.com/api/docs/pricing ; render.com/pricing. Verified 2026-11-19. Provider API pricing and hosting eligibility can change.',wrap)
book.close()
# Check cached formula totals independently so the downloadable workbook is usable without recalculation.
from openpyxl import load_workbook
cached=load_workbook(OUT/'duck-pricing-and-heavy-users.xlsx',data_only=True)
for i,row in enumerate(rows,2):assert abs(cached['Heavy user scenarios'].cell(i,10).value-row['balance_after_3m_labor'])<1e-6
print(json.dumps({'unit_costs':U,'profile_costs':profile_cost,'100_paid':[fleet(100,h,cap) for cap in [False,True] for h in [.1,.3,.5,1]],'all_heavy_by_plan':worst,'pro_chat_estimate':remaining_chat['pro']},ensure_ascii=False,indent=2))

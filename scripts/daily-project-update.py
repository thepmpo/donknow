"""Summarize committed work into the public handoff; no AI or service secrets used."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from pathlib import Path
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()
def safe_title(text):
    return text.translate(str.maketrans({'[':'［',']':'］','(':'（',')':'）','<':'＜','>':'＞','`':'＇','*':'＊'}))[:200]
def collect(previous, now):
    args = [previous+'..HEAD'] if previous else ['--since='+now.replace(hour=0,minute=0,second=0,microsecond=0).isoformat()]
    hashes = git('log','--reverse','--format=%H',*args).splitlines()
    if len(hashes)>1000:
        raise RuntimeError('Too many unprocessed commits; review the journal state')
    generated = {'docs/daily-update-state.json','docs/daily-updates.md','docs/notion-handoff.md','docs/asset-manifest.json','public/project.html'}
    result=[]
    for sha in hashes:
        paths=git('diff-tree','--root','--no-commit-id','--name-only','-r',sha).splitlines()
        meaningful=[p for p in paths if p not in generated and not p.startswith('public/project-assets/')]
        if not meaningful:
            continue
        title=safe_title(git('show','-s','--format=%s',sha))
        date=git('show','-s','--format=%cI',sha)
        result.append({'sha':sha,'title':title,'date':date,'paths':meaningful})
    return result

def main():
    now=datetime.now(ZoneInfo('Asia/Seoul')); day=now.strftime('%Y-%m-%d')
    state_path=ROOT/'docs/daily-update-state.json'
    state=json.loads(state_path.read_text()) if state_path.exists() else {}
    records=collect(state.get('processedCommit'),now)
    output=ROOT/'docs/daily-updates.md'
    existing=output.read_text() if output.exists() else '# 매일 개발 정리\n\n한국 시간 19:00 예약. 실제 실행 시각과 원본 커밋을 기록합니다. 채팅·비공개 계정·실제 배포 여부를 추정하지 않습니다.\n'
    # Multiple runs on the same day merge rather than drop earlier entries.
    start,end=f'<!-- daily:{day}:start -->',f'<!-- daily:{day}:end -->'
    earlier=re.search(re.escape(start)+r'\n(.*?)\n'+re.escape(end),existing,re.S)
    previous_hashes=set(re.findall(r'/commit/([a-f0-9]{40})',earlier[1])) if earlier else set()
    lines=[f'### {day} — 당일 저장된 작업',f'실제 정리: {now.strftime("%H:%M")} KST. 새 저장 작업 {len(records)}개. 자동 집계는 코드 저장 사실이며 테스트/배포 성공을 의미하지 않습니다.']
    if earlier:
        lines.extend(l for l in earlier[1].splitlines() if l.startswith('- ['))
    for item in records:
        if item['sha'] in previous_hashes:
            continue
        stamp=datetime.fromisoformat(item['date']).astimezone(ZoneInfo('Asia/Seoul')).strftime('%m-%d %H:%M')
        lines.append(f'- [{item["sha"][:7]}](https://github.com/sjfieni/donknow/commit/{item["sha"]}) · {stamp} · {item["title"]}')
    if not records and not earlier:
        lines.append('이 실행 구간에 새로 저장된 작업이 없습니다. 이전 작업과 최신 수동 변경 기록은 유지합니다.')
    block=start+'\n'+'\n\n'.join(lines)+'\n'+end
    if earlier:
        text=existing[:earlier.start()]+block+existing[earlier.end():]
    else:
        heading,separator,rest=existing.partition('\n\n')
        text=heading+'\n\n'+block+'\n\n'+rest
    output.write_text(text.rstrip()+'\n')
    state_path.write_text(json.dumps({'processedCommit':git('rev-parse','HEAD'),'capturedAt':now.isoformat(),'timezone':'Asia/Seoul'},indent=2)+'\n')
    subprocess.run(['python3',str(ROOT/'scripts/build-handoff.py')],cwd=ROOT,check=True)
    print(f'Daily document refreshed: {day}; {len(records)} committed changes. Deployment not inferred.')
if __name__=='__main__':main()

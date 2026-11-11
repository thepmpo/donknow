"""Build reviewed native-chat UI payload from the pinned policy source; no credentials read."""
from pathlib import Path
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[1]
RUNTIME=Path('/workspace/ai-office-runtime')
BASE='66a24ea7df2435ef897c48c147deb7ec572c01c2'
PAYLOAD=ROOT/'tools/ai-office/install/readability.json'
def source(name):return subprocess.check_output(['git','-C',str(RUNTIME),'show',BASE+':'+name],text=True)
def sha(s):return hashlib.sha256(s.encode()).hexdigest()
changes={}
p='src/components/ChatPanel.tsx';s=source(p).replace('export function ChatPanel({','function LegacyChatPanel({',1);s=s.replace('import ProjectFlowDialog from "./chat-panel/ProjectFlowDialog";', 'import ProjectFlowDialog from "./chat-panel/ProjectFlowDialog";\nimport MessageContent from "./MessageContent";')
s+='\nexport function ChatPanel(props:ChatPanelProps){return location.pathname.startsWith("/office/")?<OfficeNativeChatPanel {...props}/>:<LegacyChatPanel {...props}/>;}\n'+(ROOT/'tools/ai-office/native-chat/room.tsx.fragment').read_text();changes[p]=s
p='src/components/chat-panel/ChatComposer.tsx';s=source(p).replace('type ChatMode = "chat" | "task" | "announcement" | "report";', 'type ChatMode = "chat" | "task" | "announcement" | "report" | "question";').replace('interface ChatComposerProps {','interface ChatComposerProps {\n  allowGlobalTasks?: boolean;').replace('}: ChatComposerProps) {','  allowGlobalTasks=false,\n}: ChatComposerProps) {').replace('disabled={!selectedAgent}','disabled={!selectedAgent && !allowGlobalTasks}');s=s.replace('<div className="flex flex-shrink-0 gap-2 border-t border-gray-700/50 px-4 pb-1 pt-3">','<div className="flex flex-shrink-0 gap-2 border-t border-gray-700/50 px-4 pb-1 pt-3">{allowGlobalTasks && <><button className="flex-1 rounded-lg border px-2 py-1.5 text-xs" onClick={()=>onModeChange("chat")} aria-pressed={mode==="chat"}>대화</button><button className="flex-1 rounded-lg border px-2 py-1.5 text-xs" onClick={()=>onModeChange("question")} aria-pressed={mode==="question"}>질문</button></>}');s=s.replace('<button\n          onClick={() => onModeChange(mode === \"report\"', '{!allowGlobalTasks && <button\n          onClick={() => onModeChange(mode === \"report\"').replace('<span>{tr(\"보고 요청\", \"Report\", \"レポート依頼\", \"报告请求\")}</span>\n        </button>', '<span>{tr(\"보고 요청\", \"Report\", \"レポート依頼\", \"报告请求\")}</span>\n        </button>}');changes[p]=s
p='src/components/chat-panel/ChatComposer.tsx';changes[p]=changes[p].replace('mode={mode} isDirectiveMode={isDirectiveMode}', 'mode={mode === "question" ? "chat" : mode} isDirectiveMode={isDirectiveMode}')
p='src/components/DecisionInboxModal.tsx';s=source(p).replace('  const isKorean =', '  const [officeReportBusy,setOfficeReportBusy]=useState<string|null>(null);\n  const [officeReportNotices,setOfficeReportNotices]=useState<Record<string,string>>({});\n  const isKorean =',1);s=s.replace('{items.map((item) => (','{items.map((item) => '+(ROOT/'tools/ai-office/native-chat/report-card.tsx.fragment').read_text()+' (');changes[p]=s
p='src/App.tsx';s=('import {useEffect} from "react";\n'+source(p)).replace('  const [showChat, setShowChat] = useState(false);','''  const [showChat, setShowChat] = useState(false);
  useEffect(()=>{const ready=()=>window.parent.postMessage({kind:'office-native-room-ready'},location.origin);const listener=(event:MessageEvent)=>{if(event.origin!==location.origin||event.source!==window.parent)return;if(event.data?.kind==='office-native-room-open'){setChatAgent(null);setShowChat(true);}if(event.data?.kind==='office-native-room-check')ready();};window.addEventListener('message',listener);ready();return()=>window.removeEventListener('message',listener);},[]);''');changes[p]=s
p='src/app/useAppLabels.ts';s=source(p).replace('ko: "전사 공지",','ko: "전체 대화",').replace('en: "Announcement",','en: "All Conversations",');changes[p]=s
p='src/components/chat-panel/model.ts';changes[p]=source(p).replace('"chat" | "task" | "announcement" | "report";', '"chat" | "task" | "announcement" | "report" | "question";')
payload=json.loads(PAYLOAD.read_text());payload['id']='office-native-chat-v4';originals={e['path']:e for e in payload['files']}
for path,content in changes.items():
 before=source(path);old=originals.get(path);allowed=list(dict.fromkeys(([old['afterSha256']]+old.get('acceptedBeforeSha256',[]) if old else [])+[sha(before)]))
 originals[path]={'path':path,'beforeSha256':sha(before),'acceptedBeforeSha256':allowed,'afterSha256':sha(content),'content':content}
payload['files']=list(originals.values());PAYLOAD.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
# Explicit source allowlist used by the safe updater; every destination already exists.
p=ROOT/'tools/ai-office/install/update-readability.py';s=p.read_text();a=s.index('FILES = ');b=s.index('\n\n\ndef digest',a);s=s[:a]+'FILES = {'+', '.join(repr(k) for k in sorted(originals))+'}'+s[b:];p.write_text(s)
print('Native chat/decision UI payload built:',len(originals),'reviewed source files')

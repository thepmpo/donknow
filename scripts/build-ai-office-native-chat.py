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
p='src/components/chat-panel/ChatComposer.tsx';s=source(p).replace('type ChatMode = "chat" | "task" | "announcement" | "report";', 'type ChatMode = "chat" | "task" | "announcement" | "report" | "question" | "development";').replace('interface ChatComposerProps {','interface ChatComposerProps {\n  allowGlobalTasks?: boolean;').replace('}: ChatComposerProps) {','  allowGlobalTasks=false,\n}: ChatComposerProps) {').replace('disabled={!selectedAgent}','disabled={!selectedAgent && !allowGlobalTasks}');s=s.replace('<div className="flex flex-shrink-0 gap-2 border-t border-gray-700/50 px-4 pb-1 pt-3">','<div className="flex flex-shrink-0 gap-2 border-t border-gray-700/50 px-4 pb-1 pt-3">{allowGlobalTasks && <><button className="flex-1 rounded-lg border px-2 py-1.5 text-xs" onClick={()=>onModeChange("chat")} aria-pressed={mode==="chat"}>대화</button><button className="flex-1 rounded-lg border px-2 py-1.5 text-xs" onClick={()=>onModeChange("question")} aria-pressed={mode==="question"}>질문</button></>}');s=s.replace('<button\n          onClick={() => onModeChange(mode === \"report\"', '{!allowGlobalTasks && <button\n          onClick={() => onModeChange(mode === \"report\"').replace('<span>{tr(\"보고 요청\", \"Report\", \"レポート依頼\", \"报告请求\")}</span>\n        </button>', '<span>{tr(\"보고 요청\", \"Report\", \"レポート依頼\", \"报告请求\")}</span>\n        </button>}');changes[p]=s
p='src/components/chat-panel/ChatComposer.tsx';changes[p]=changes[p].replace('mode={mode} isDirectiveMode={isDirectiveMode}', 'mode={(mode === "question" || mode === "development") ? "chat" : mode} isDirectiveMode={isDirectiveMode}')
for mode in ['chat','question']:
 p='src/components/chat-panel/ChatComposer.tsx';changes[p]=changes[p].replace('className="flex-1 rounded-lg border px-2 py-1.5 text-xs" onClick={()=>onModeChange("'+mode+'")}', 'className={"flex-1 rounded-lg border px-2 py-1.5 text-xs "+(mode==="'+mode+'"?"bg-blue-600 text-white":"bg-gray-700 text-gray-200")} onClick={()=>onModeChange("'+mode+'")}')
p='src/components/chat-panel/ChatComposer.tsx';changes[p]=changes[p].replace('<div className="flex flex-shrink-0 gap-2 border-t border-gray-700/50 px-4 pb-1 pt-3">','<div className="flex flex-shrink-0 flex-wrap gap-2 border-t border-gray-700/50 px-4 pb-1 pt-3">').replace('>질문</button></>}', '>질문</button><button className={"flex-1 rounded-lg border px-2 py-1.5 text-xs "+(mode==="development"?"bg-blue-600 text-white":"bg-gray-700 text-gray-200")} onClick={()=>onModeChange("development")} aria-pressed={mode==="development"}>코드 수정</button></>}').replace('isAnnouncementMode\n                ? tr(', 'mode === "development" ? tr("무엇을 어떻게 바꿀지 적어주세요...", "Describe the code change...") : isAnnouncementMode\n                ? tr(')
p='src/components/DecisionInboxModal.tsx';s=source(p).replace('  const isKorean =', '  const [officeReportBusy,setOfficeReportBusy]=useState<string|null>(null);\n  const [officeReportNotices,setOfficeReportNotices]=useState<Record<string,string>>({});\n  const isKorean =',1);s=s.replace('{items.map((item) => (','{items.map((item) => '+(ROOT/'tools/ai-office/native-chat/report-card.tsx.fragment').read_text()+' (');changes[p]=s
p='src/App.tsx';s=('import {useEffect} from "react";\n'+source(p)).replace('  const [showChat, setShowChat] = useState(false);','''  const [showChat, setShowChat] = useState(false);
  useEffect(()=>{const ready=()=>window.parent.postMessage({kind:'office-native-room-ready',version:'office-team-v5'},location.origin);const listener=(event:MessageEvent)=>{if(event.origin!==location.origin||event.source!==window.parent)return;if(event.data?.kind==='office-native-room-open'){setChatAgent(null);setShowChat(true);}if(event.data?.kind==='office-native-room-check')ready();};window.addEventListener('message',listener);ready();return()=>window.removeEventListener('message',listener);},[]);''');changes[p]=s
p='src/app/useAppLabels.ts';s=source(p).replace('ko: "전사 공지",','ko: "전체 대화",').replace('en: "Announcement",','en: "All Conversations",');changes[p]=s
p='src/components/chat-panel/model.ts';changes[p]=source(p).replace('"chat" | "task" | "announcement" | "report";', '"chat" | "task" | "announcement" | "report" | "question" | "development";')
p='src/components/MessageContent.tsx';changes[p]='import {useState,useRef} from "react";\n'+source(p)+'\n'+(ROOT/'tools/ai-office/native-chat/friendly-report.tsx.fragment').read_text()+'\n'+(ROOT/'tools/ai-office/native-chat/report-mail.tsx.fragment').read_text()
p='src/components/chat-panel/ChatMessageList.tsx';s=source(p).replace('import MessageContent from "../MessageContent";', 'import MessageContent, {FriendlyOfficeReport} from "../MessageContent";').replace('<MessageContent content={msg.content} />', '{msg.message_type === "report" ? <FriendlyOfficeReport content={msg.content}/> : <MessageContent content={msg.content} />}');changes[p]=s
for p in ['src/components/ChatPanel.tsx','src/components/DecisionInboxModal.tsx']:
 changes[p]=changes[p].replace('import MessageContent from "./MessageContent";', 'import MessageContent, {FriendlyOfficeReport} from "./MessageContent";').replace('<MessageContent content={item.requestContent}/>', '<FriendlyOfficeReport content={item.requestContent}/>').replace('<MessageContent content={t.result}/>', '<FriendlyOfficeReport content={t.result}/>')

# Managed office board actions use the same explicit task confirmation as chat.
# Native task DELETE also removes reports/messages, so expose reversible archive instead.
p='src/app/useAppActions.ts';s=source(p)
helpers='''function managedOfficeBoard(): boolean { return typeof window !== "undefined" && location.pathname.startsWith("/office/"); }
function officeBoardError(error: unknown): string {
  const code=error instanceof Error?error.message:"";
  const messages:Record<string,string>={
    office_archive_task_running:"실행 중인 업무는 보관할 수 없어요. 업무가 끝난 뒤 다시 확인해주세요.",
    office_archive_approval_active:"실행 승인이 남아 있는 업무예요. 승인 상태를 먼저 확인해주세요. 업무와 보고서는 그대로 보존했습니다.",
    office_archive_meeting_active:"아직 끝나지 않은 회의에 속한 업무예요. 회의가 끝난 뒤 보관해주세요.",
    office_manual_assignment_required:"이 업무는 현재 사무실의 관리 대상 프로젝트가 아니어서 변경하지 않았어요.",
    office_project_outside_root:"이 업무의 프로젝트 위치를 확인하지 못해 변경하지 않았어요.",
    office_open_from_start_file:"사무실 접속을 다시 확인해야 해요. 컴퓨터에서 0번 시작 파일로 다시 열어주세요.",
    office_refresh_before_action:"화면 연결 정보가 오래됐어요. 새로고침한 뒤 업무 상태를 확인해주세요.",
  };
  return messages[code]||"보관·복원 결과를 확인하지 못했어요. 새로고침한 뒤 업무 상태를 확인해주세요. 자동으로 다시 처리하지 않습니다.";
}
async function officeBoardArchive(id:string,hidden:0|1):Promise<boolean> {
  if(!window.confirm(hidden===1?"업무를 보관할까요? 보고서와 대화 기록은 남고, 모두보기에서 복원할 수 있어요.":"이 업무를 다시 목록에 표시할까요? 복원만으로 업무를 실행하지는 않습니다."))return false;
  const sessionResponse=await fetch("/control-api/session",{credentials:"same-origin",cache:"no-store"});
  const session=await sessionResponse.json();
  if(!sessionResponse.ok)throw new Error(String(session.error||"office_open_from_start_file"));
  const response=await fetch("/control-api/tasks/"+encodeURIComponent(id)+(hidden===1?"/archive":"/restore"),{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json","x-control-csrf":session.csrf},body:JSON.stringify({confirmation:true})});
  const result=await response.json();
  if(!response.ok)throw new Error(String(result.error||"office_request_failed"));
  return true;
}
'''
s=s.replace('interface UseAppActionsParams {',helpers+'\ninterface UseAppActionsParams {',1)
old='''      try {
        await api.updateTask(id, data);
        const tks = await api.getTasks();
        setTasks(tks);
      } catch (error) {
        console.error("Update task failed:", error);
      }'''
new='''      try {
        if(managedOfficeBoard()) {
          if(Object.keys(data).length!==1||(data.hidden!==0&&data.hidden!==1)) {
            window.alert("사무실 업무의 실행과 결과 확인은 전체 대화에서 진행해주세요. 이 화면에서는 보관·복원만 직접 바꿀 수 있어요.");return;
          }
          if(!await officeBoardArchive(id,data.hidden))return;
        } else await api.updateTask(id, data);
        const tks = await api.getTasks();
        setTasks(tks);
      } catch (error) {
        if(managedOfficeBoard())window.alert(officeBoardError(error));
        else console.error("Update task failed:", error);
      }'''
assert old in s;s=s.replace(old,new,1)
old='''      try {
        await api.deleteTask(id);
        setTasks((prev) => prev.filter((task) => task.id !== id));
      } catch (error) {
        console.error("Delete task failed:", error);
      }'''
new='''      try {
        if(managedOfficeBoard()) {
          if(!await officeBoardArchive(id,1))return;
          setTasks(await api.getTasks());
        } else {
          await api.deleteTask(id);
          setTasks((prev) => prev.filter((task) => task.id !== id));
        }
      } catch (error) {
        if(managedOfficeBoard())window.alert(officeBoardError(error));
        else console.error("Delete task failed:", error);
      }'''
assert old in s;s=s.replace(old,new,1)
old='''  const handleRunTask = useCallback(
    async (id: string) => {
      try {
        await api.runTask(id);
        await refreshTasksAndAgents();
      } catch (error) {
        console.error("Run task failed:", error);
      }
    },
    [refreshTasksAndAgents],
  );'''
new='''  const handleRunTask = useCallback(
    async (id: string) => {
      if(managedOfficeBoard()) {
        try {window.sessionStorage.setItem("office-task-open",id);}catch {window.alert("업무 확인창을 연결하지 못했어요. 전체 대화의 안건에서 이 업무를 확인해주세요.");return;}
        window.dispatchEvent(new CustomEvent("office-task-open",{detail:{taskId:id}}));
        setChatAgent(null);setShowChat(true);return;
      }
      try {
        await api.runTask(id);
        await refreshTasksAndAgents();
      } catch (error) {
        console.error("Run task failed:", error);
      }
    },
    [refreshTasksAndAgents,setChatAgent,setShowChat],
  );'''
assert old in s;s=s.replace(old,new,1);changes[p]=s

p='src/components/taskboard/TaskCard.tsx';s=source(p)
s=s.replace('  const canRun = task.status === "planned" || task.status === "inbox";', '  const officeBoard=typeof window!=="undefined"&&location.pathname.startsWith("/office/");\n  const canRun = (task.status === "planned" || task.status === "inbox") && (!officeBoard||!isHiddenTask);')
s=s.replace('  const canDelete = task.status !== "in_progress";', '  const canDelete = task.status !== "in_progress" && (!officeBoard||!isHiddenTask);')
s=s.replace('  const canHideTask = isHideableStatus(task.status);', '  const canHideTask = officeBoard ? task.status !== "in_progress" : isHideableStatus(task.status);')
s=s.replace('if (!task.assigned_agent_id) {', 'if (!task.assigned_agent_id && !officeBoard) {',1)
s=s.replace('title={t({ ko: "작업 실행", en: "Run task", ja: "タスク実行", zh: "运行任务" })}', 'title={officeBoard?"실행 내용 확인":t({ ko: "작업 실행", en: "Run task", ja: "タスク実行", zh: "运行任务" })}')
s=s.replace('▶ {t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })}', '▶ {officeBoard?"실행 확인":t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })}')
s=s.replace('{canHideTask && !isHiddenTask && onHideTask && (', '{!officeBoard && canHideTask && !isHiddenTask && onHideTask && (')
old='''            onClick={() => {
              if (
                confirm('''
new='''            onClick={() => {
              if(officeBoard){onDeleteTask(task.id);return;}
              if (
                confirm('''
assert old in s;s=s.replace(old,new,1)
s=s.replace('title={t({ ko: "작업 삭제", en: "Delete task", ja: "タスク削除", zh: "删除任务" })}', 'title={officeBoard?"업무 보관":t({ ko: "작업 삭제", en: "Delete task", ja: "タスク削除", zh: "删除任务" })}')
s=s.replace('            🗑\n', '            {officeBoard?"보관":"🗑"}\n')
changes[p]=s

p='src/components/TaskBoard.tsx';s=source(p)
s=s.replace('      if (isHideableStatus(task.status) && hiddenTaskIds.has(task.id)) count++;', '      if ((location.pathname.startsWith("/office/")||isHideableStatus(task.status)) && hiddenTaskIds.has(task.id)) count++;')
s=s.replace('onClick={() => setShowBulkHideModal(true)}', 'onClick={() => {if(location.pathname.startsWith("/office/")){window.alert("업무별 보관 버튼을 사용해주세요. 보관한 업무는 모두보기에서 복원할 수 있어요.");return;}setShowBulkHideModal(true);}}')
changes[p]=s

p='src/components/SkillsLibrary.tsx';s=source(p).replace('export default function SkillsLibrary(', 'function LegacySkillsLibrary(', 1);s='import {useState,useEffect,useRef} from "react";\n'+s+'\nexport default function SkillsLibrary(props:SkillsLibraryProps){return location.pathname.startsWith("/office/")?<OfficeRoleGuidesLibrary/>:<LegacySkillsLibrary {...props}/>;}\n'+(ROOT/'tools/ai-office/native-chat/role-library.tsx.fragment').read_text();changes[p]=s
payload=json.loads(PAYLOAD.read_text());payload['id']='office-development-v6';originals={e['path']:e for e in payload['files']}
for path,content in changes.items():
 before=source(path);old=originals.get(path);allowed=list(dict.fromkeys(([old['afterSha256']]+old.get('acceptedBeforeSha256',[]) if old else [])+[sha(before)]))
 originals[path]={'path':path,'beforeSha256':sha(before),'acceptedBeforeSha256':allowed,'afterSha256':sha(content),'content':content}
payload['files']=list(originals.values());PAYLOAD.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
# Explicit source allowlist used by the safe updater; every destination already exists.
p=ROOT/'tools/ai-office/install/update-readability.py';s=p.read_text();a=s.index('FILES = ');b=s.index('\n\n\ndef digest',a);s=s[:a]+'FILES = {'+', '.join(repr(k) for k in sorted(originals))+'}'+s[b:];p.write_text(s)
print('Native chat/decision UI payload built:',len(originals),'reviewed source files')

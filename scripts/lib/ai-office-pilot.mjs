import {createHash} from 'node:crypto';
export const PILOT_TITLE='첫 제품 검토 — UX·디자인·흐름 진단';
export const pilotDescription=name=>`프로젝트 ${name}의 첫 읽기 전용 제품 검토입니다.\n먼저 source의 AGENTS.md, README, 제품 정책과 디자인 가이드, 실제 화면 코드를 대조하세요. duckduck이면 공식 톤 v1.0(차분한 비서·필요 시 역할·가벼운 오리), 5개 탭·3초 완료/350ms·권한/원본 변경 확인을 유지하세요. 다른 프로젝트에 duckduck 고유 디자인을 강요하지 마세요.\n목표: 가입/첫 입력→할 일 확인→저장→완료 흐름에서 막히는 점과 전달력을 검토하세요. 사실/추론/제안을 구분하고 코드 파일과 줄 근거를 제시하세요. TestFlight·Figma·실계정을 직접 검수한 것처럼 쓰지 마세요.\n출력: 1) 확인한 범위와 현재 흐름 2) 근거가 있는 우선 문제 최대3개 3) 대표 흐름 개선 후보1개 4) 유지 조건·예외·검수 기준·인계서 초안 5) 사용자 선택이 필요한 사항 최대3개. 보고서는 응답으로 제출하세요.\n금지: 파일·코드·설정 변경, git commit/merge/push, 개발 위임, 설치, 배포, 외부 발행·원본 쓰기·계정 연결·비밀값 읽기. 브리핑/날씨는 후속 문서 전 수정하지 않고 Duo는 별도 지시 전 기록만 합니다. 제품 검토 결과는 개발 승인이 아닙니다.`;
export const textHash=text=>createHash('sha256').update(text).digest('hex');
export function pilotPayload(project,agent){return {title:`${project.name} ${PILOT_TITLE}`,description:pilotDescription(project.name),project_id:project.id,project_path:project.project_path,department_id:'planning',assigned_agent_id:agent.id,status:'inbox',priority:0,task_type:'general',workflow_pack_key:'development',output_format:'markdown',workflow_meta_json:{office_pilot:'product-review-v1'}};}
export function validatePilot(plan,task,head){
 if(!task||task.id!==plan.taskId||task.project_id!==plan.projectId||task.assigned_agent_id!==plan.agentId||textHash(task.description??'')!==plan.promptSha256||head!==plan.sourceHead)throw Error('office_pilot_changed_review_again');
 if(!['inbox','pending','planned'].includes(task.status))throw Error('office_pilot_not_waiting');
 return true;
}
export function readinessBlockers({server,provider,pilot,network}){
 const errors=[];if(!server?.enabled)errors.push('approval_policy_required');if(server?.developmentEnabled!==false)errors.push('development_must_remain_locked');
 if(!provider?.runnerConfigured)errors.push('official_runner_required');if(!provider?.authReady)errors.push('chatgpt_login_required');if(!provider?.sandboxAvailable)errors.push('host_sandbox_required');if(!pilot)errors.push('prepared_pilot_required');
 for(const check of network??[])if(!check.reachable)errors.push('network_allowlist:'+check.host);
 return [...new Set(errors)];
}

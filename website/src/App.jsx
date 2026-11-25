import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  CircleCheck,
  ClipboardList,
  Clock3,
  Link2,
  ListTodo,
  Menu,
  MessageCircle,
  Plus,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  Mail,
  NotebookPen,
  Globe,
  QrCode,
} from "lucide-react";
import QRCode from "qrcode";
import suppliedFooter from "../../content/legal/2026-11-23/docen-footer.html?raw";
import { Pricing } from "./Pricing.jsx";

const WEB =
  location.protocol === "file:"
    ? "https://duckduck-test.onrender.com"
    : location.origin;
const APP = WEB + "/coming-soon";
// Supplied business text remains verbatim; discard template comments and duplicate links.
const companyFooter = suppliedFooter.replace(/<!--[\s\S]*?-->/g, "").match(/<div class="footer-inner">([\s\S]*?)<\/div>/)[1].replace(/<p class="footer-links">[\s\S]*?<\/p>/, "");
const initialTasks = [
  {
    id: "review",
    title: ["다음 주 제안서 검토하기", "Review next week’s proposal"],
    note: [
      "공유받은 제안서에서 확인할 내용 세 가지를 정리했어요.",
      "Three points to review from the shared proposal.",
    ],
    source: "Gmail",
    date: ["오늘까지", "Due today"],
    status: "inbox",
  },
  {
    id: "meeting",
    title: ["디자인 피드백 미팅 잡기", "Schedule a design feedback meeting"],
    note: [
      "내일 오후에 가능한 시간을 확인해보세요.",
      "Find a suitable time tomorrow afternoon.",
    ],
    source: "Slack",
    date: ["내일", "Tomorrow"],
    status: "inbox",
  },
  {
    id: "personal",
    title: ["도서관에 책 반납하기", "Return the library books"],
    note: [
      "미리알림에 남아 있는 이번 주 할 일이에요.",
      "An unfinished reminder for this week.",
    ],
    source: ["미리알림", "Reminders"],
    date: ["이번 주", "This week"],
    status: "inbox",
  },
];
const demoNotices = {
  todo: [
    "Todo에 담았어요. 왼쪽 Todo에서 확인해보세요.",
    "Added to To-dos. Open To-dos to see it.",
  ],
  calendar: [
    "캘린더에 담았어요. 왼쪽 캘린더에서 확인해보세요.",
    "Added to Calendar. Open Calendar to see it.",
  ],
  done: [
    "대화에서 마쳤어요. 기록에 남겨두었어요.",
    "Finished here. You can find it in Log.",
  ],
  inbox: ["브리핑으로 되돌렸어요.", "Restored to your briefing."],
};
const views = [
  { id: "inbox", icon: Sparkles, name: ["브리핑", "Briefing"] },
  { id: "todo", icon: ListTodo, name: ["Todo", "To-dos"] },
  { id: "calendar", icon: CalendarDays, name: ["캘린더", "Calendar"] },
  { id: "done", icon: CheckCheck, name: ["기록", "Log"] },
];
function Duck({ className = "" }) {
  return (
    <img
      className={"duck-mark " + className}
      src={import.meta.env.BASE_URL + "assets/brand/docen-logo.png"}
      alt=""
      width="32"
      height="32"
    />
  );
}
// Decorative responsive hero: reuse the supplied animation; never delay page content.
function HeroBounce() {
  const root = useRef(null), video = useRef(null);
  const [animate, setAnimate] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAnimate(!motion.matches);
    update(); motion.addEventListener('change', update);
    return () => { motion.removeEventListener('change', update); };
  }, []);
  useEffect(() => {
    if (!animate || failed || !video.current) return;
    const player = video.current;
    let visible = true;
    const update = () => {
      if (document.hidden || !visible) player.pause();
      else player.play().catch(() => setFailed(true));
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); });
    observer.observe(root.current); document.addEventListener('visibilitychange', update); update();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); player.pause(); };
  }, [animate, failed]);
  const base = import.meta.env.BASE_URL + 'assets/brand/';
  return <div className="hero-bounce" ref={root} aria-hidden="true">
    <img src={base + 'docen-logo.png'} alt="" width="720" height="720" />
    {animate && !failed && <video ref={video} src={base + 'docen-loading.mp4'} autoPlay muted loop playsInline preload="metadata" onError={() => setFailed(true)} />}
  </div>;
}
function Demo({ en }) {
  const tr = (a) => (Array.isArray(a) ? a[en ? 1 : 0] : a);
  const [tasks, setTasks] = useState(initialTasks),
    [view, setView] = useState("inbox"),
    [notice, setNotice] = useState(""),
    [schedule, setSchedule] = useState(null),
    [date, setDate] = useState(""),
    [time, setTime] = useState("");
  const dateRef = useRef(null);
  const itemsRef = useRef(null);
  const move = (id, status) => {
    setTasks((all) =>
      all.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              ...(status === "calendar"
                ? { scheduled: date + " " + time }
                : {}),
            }
          : t,
      ),
    );
    setNotice(status);
    setSchedule(null);
  };
  useEffect(() => {
    if (itemsRef.current) itemsRef.current.scrollTop = 0;
  }, [view]);
  useEffect(() => {
    if (schedule) dateRef.current?.focus();
  }, [schedule]);
  const visible = tasks.filter((x) => x.status === view);
  return (
    <div className="demo-frame" id="product-demo">
      <div className="demo-topline">
        <span>
          <Duck /> {tr(["나의 하루", "My day"])}
        </span>
        <span className="example-label">
          {tr(["직접 눌러보는 기능 예시", "Interactive product example"])}
        </span>
        <button
          className="icon-btn"
          title={tr(["예시 초기화", "Reset example"])}
          aria-label={tr(["예시 초기화", "Reset example"])}
          onClick={() => {
            setTasks(initialTasks);
            setView("inbox");
            setNotice("");
            setSchedule(null);
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="demo-body">
        <nav
          className="demo-sidebar"
          aria-label={tr(["제품 예시 메뉴", "Product example navigation"])}
        >
          <span className="sidebar-label">WORKSPACE</span>
          {views.map(({ id, icon: Icon, name }) => (
            <button
              key={id}
              aria-pressed={view === id}
              className={view === id ? "active" : ""}
              onClick={() => {
                setView(id);
                setSchedule(null);
                setNotice("");
              }}
            >
              <Icon size={19} />
              <span>{tr(name)}</span>
              <span className="count">
                {tasks.filter((x) => x.status === id).length}
              </span>
            </button>
          ))}
          <div className="sidebar-bottom">
            <ShieldCheck size={16} />
            {tr(["내가 결정하는 하루", "Your day, your decisions"])}
          </div>
        </nav>
        <div className="demo-content">
          <div className="demo-heading">
            <div>
              <p className="eyebrow">
                {tr(["11월 19일 목요일", "Thursday, November 19"])}
              </p>
              <h2>{tr(views.find((x) => x.id === view).name)}</h2>
            </div>
            <span className="demo-avatar">
              <Duck />
            </span>
          </div>
          <p className="demo-intro">
            {tr(
              view === "inbox"
                ? [
                    "오늘 챙길 일을 한곳에 모았어요. 어떻게 할지 골라보세요.",
                    "Your next steps, together. Choose what happens next.",
                  ]
                : view === "todo"
                  ? [
                      "내가 하기로 한 일만, 차분하게.",
                      "A clear list of the things you’ve chosen to do.",
                    ]
                  : view === "calendar"
                    ? [
                        "시간을 정한 일은 일정으로 이어져요.",
                        "Make time for what matters.",
                      ]
                    : [
                        "끝낸 일은 기록하고, 다음 일에 집중해요.",
                        "Keep a record. Make room for what’s next.",
                      ],
            )}
          </p>
          <div className="demo-items" ref={itemsRef}>
            <div className="demo-list">
              {visible.map((task) => (
                <article className="demo-task" key={task.id}>
                  <button
                    className="task-check"
                    aria-label={
                      tr(
                        task.status === "done"
                          ? ["미완료로 되돌리기: ", "Restore: "]
                          : ["완료: ", "Complete: "],
                      ) + tr(task.title)
                    }
                    aria-pressed={task.status === "done"}
                    onClick={() =>
                      move(task.id, task.status === "done" ? "inbox" : "done")
                    }
                  >
                    {task.status === "done" && <Check size={17} />}
                  </button>
                  <div className="task-content">
                    <h3>{tr(task.title)}</h3>
                    <div className="task-meta">
                      <span
                        className={
                          "source-dot " +
                          (task.source === "Slack"
                            ? "violet"
                            : task.source === "Gmail"
                              ? "coral"
                              : "amber")
                        }
                      />
                      {tr(task.source)}
                      <span>·</span>
                      <span>{task.scheduled || tr(task.date)}</span>
                    </div>
                    {view === "inbox" && (
                      <>
                        <p>{tr(task.note)}</p>
                        <div className="task-actions">
                          <button onClick={() => move(task.id, "todo")}>
                            <Plus size={14} />
                            {tr(["할 일로", "To-do"])}
                          </button>
                          <button
                            onClick={() => {
                              setSchedule(schedule === task.id ? null : task.id);
                              setDate("");
                              setTime("");
                            }}
                          >
                            <CalendarDays size={14} />
                            {tr(["일정으로", "Schedule"])}
                          </button>
                          <button onClick={() => move(task.id, "done")}>
                            {tr(["대화에서 마치기", "Finish here"])}
                          </button>
                        </div>
                      </>
                    )}
                    {schedule === task.id && (
                      <form
                        className="schedule-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          move(task.id, "calendar");
                        }}
                      >
                        <label>
                          {tr(["날짜", "Date"])}
                          <input
                            ref={dateRef}
                            aria-label={tr(["일정 날짜", "Event date"])}
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                          />
                        </label>
                        <label>
                          {tr(["시간", "Time"])}
                          <input
                            aria-label={tr(["일정 시간", "Event time"])}
                            type="time"
                            required
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                          />
                        </label>
                        <button type="submit" className="small-primary">
                          {tr(["일정에 담기", "Add event"])}
                        </button>
                        <button
                          type="button"
                          className="plain-btn"
                          onClick={() => setSchedule(null)}
                        >
                          {tr(["취소", "Cancel"])}
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {!visible.length && (
              <div className="demo-empty">
                <CircleCheck size={30} />
                <h3>
                  {tr(
                    view === "inbox"
                      ? [
                          "지금 확인할 일은 모두 정리했어요",
                          "You’re all caught up",
                        ]
                      : ["아직 담긴 일이 없어요", "Nothing here yet"],
                  )}
                </h3>
                <p>
                  {tr([
                    "브리핑에서 할 일을 골라 담아보세요.",
                    "Choose an item from your briefing.",
                  ])}
                </p>
                <button onClick={() => setView("inbox")}>
                  {tr(["브리핑 보기", "See briefing"])}
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
          <div className="demo-status" aria-live="polite" role="status">
            {notice
              ? tr(demoNotices[notice])
              : tr([
                  "예시 데이터입니다. 실제 계정에는 저장되지 않아요.",
                  "Example data. Changes are not saved to an account.",
                ])}
          </div>
        </div>
        <aside className="demo-today">
          <span className="eyebrow">
            {tr(["오늘의 여유", "A little room today"])}
          </span>
          <h3>{tr(["하나씩, 가볍게.", "One thing at a time."])}</h3>
          <p>
            {tr([
              "지금 할 일과 나중에 할 일을 나누면 하루가 조금 더 선명해져요.",
              "A little clarity about what’s next makes space for the rest.",
            ])}
          </p>
          <div className="agenda-date">
            <strong>19</strong>
            <span>NOV / THU</span>
          </div>
          <div className="agenda-line">
            <span>10:00</span>
            <div>
              <strong>{tr(["오늘 할 일 살펴보기", "Review the day"])}</strong>
              <small>
                {tr(["내 시간을 먼저 챙겨요", "Make time for yourself"])}
              </small>
            </div>
          </div>
          <div className="agenda-line">
            <span>14:00</span>
            <div>
              <strong>{tr(["집중하는 시간", "Focus time"])}</strong>
              <small>
                {tr(["방해 없이, 하나씩", "One thing, without distractions"])}
              </small>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
const faqs = [
  [
    "docen은 어떤 서비스인가요?",
    "What is docen?",
    "연결한 자료에서 챙길 일을 살펴보고, 브리핑·Todo·캘린더로 정리하는 개인 비서예요. 받은 모든 내용을 할 일로 만들 필요는 없어요. 필요한 일만 옮기거나 대화 안에서 마칠 수 있어요.",
    "docen brings your next steps into a briefing, to-do list and calendar. Keep only the things you need, or finish them in the conversation.",
  ],
  [
    "라이트와 프로는 무엇이 다른가요?",
    "What is the difference between Lite and Pro?",
    "정상 월요금은 라이트19,900원·프로55,900원이에요. 연간 결제는 각각202,800원·598,800원으로, 월환산16,900원·49,900원이에요. 베타 기간에는 월 결제에도 같은 연간 할인가를 적용해요. 라이트의 정리 기능에 프로는 직접 AI채팅과 확대 사용량을 더하며, 두 플랜 모두 사용량 제한이 있어요. 결제는 준비 중이에요.",
    "Regular monthly prices are ₩19,900 for Lite and ₩55,900 for Pro. Annual plans cost ₩202,800 and ₩598,800, equivalent to ₩16,900 and ₩49,900 per month. During beta, monthly billing gets the same annual discounted rate. Pro adds direct AI chat and a larger allowance to Lite’s organization tools. Both have usage limits. Checkout is in preparation.",
  ],
  [
    "할 일과 일정을 바꾸면 원본도 바뀌나요?",
    "Will changes update the original service?",
    "지원되는 연결의 항목은 권한과 수정 내용을 확인한 뒤 원본에 반영해요. 읽기 전용이나 미지원 항목은 제한을 알려드려요. docen에서만 만든 항목은 docen 안에서만 바뀌어요.",
    "Supported connections can update the source with the necessary permissions and confirmation. Read-only and unsupported items have limits. docen-only items stay in docen.",
  ],
  [
    "모든 자료를 실시간으로 확인하나요?",
    "Is every source monitored in real time?",
    "연결한 서비스의 권한·조회 방식·사용량에 따라 달라요. 정기 브리핑과 중요한 변화 알림을 구분하며, 모든 자료의 즉시 감지와 무제한 AI 처리를 약속하지 않아요.",
    "This depends on source permissions, sync methods and usage limits. Scheduled briefings and important updates are separate; instant monitoring of every source and unlimited AI are not promised.",
  ],
  [
    "지금 어디에서 사용할 수 있나요?",
    "Where can I use docen?",
    "현재는 소개 페이지만 공개하고 있어요. 웹서비스와 iPhone 앱은 내부 테스트 중이며, 공개 오픈 후 소개 페이지에서 로그인해 이용할 수 있어요. 결제는 아직 시작되지 않았어요.",
    "Only our introduction website is public. The web app and iPhone app are in internal testing. After launch, you can sign in from this website. Checkout is not active.",
  ],
];
export function App() {
  const [en, setEn] = useState(false),
    [menu, setMenu] = useState(false),
    [modal, setModal] = useState(null),
    [qr, setQr] = useState("");
  const modalRef = useRef(null),
    opener = useRef(null);
  const t = (ko, eng) => (en ? eng : ko);
  useEffect(() => {
    document.documentElement.lang = en ? "en" : "ko";
    document.title = en
      ? "docen — Bring it together. Make room for your day."
      : "docen — 흩어진 일은 모으고, 나의 하루는 가볍게.";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        en
          ? "Your briefings, to-dos, calendar and document drafts, together in docen. Beta monthly rates: Lite ₩16,900 and Pro ₩49,900, matching annual equivalents. Regular monthly rates: ₩19,900 and ₩55,900. Business by consultation."
          : "흩어진 일은 모으고, 나의 하루는 가볍게. 정상 월요금 라이트19,900원·프로55,900원, 베타 월요금16,900원·49,900원으로 브리핑부터 문서 초안까지 이어가세요.",
      );
  }, [en]);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(WEB + "/", { width: 220, margin: 2 }).then((data) => {
      if (alive) setQr(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!modal) return;
    opener.current = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.querySelector("button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const all = [
          ...modalRef.current.querySelectorAll('a,button,[tabindex="0"]'),
        ];
        const first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      opener.current?.focus();
    };
  }, [modal]);
  const links = [
    ["#how", t("작동 방식", "How it works")],
    ["#features", t("기능", "Features")],
    ["#connections", t("연결", "Connections")],
    ["#pricing", t("요금", "Pricing")],
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        {t("본문으로 건너뛰기", "Skip to content")}
      </a>
      <header className="site-header">
        <div className="nav-wrap">
          <a className="brand" href="#" aria-label={t("docen 홈", "docen home")}>
            <Duck />
            <span>
              docen<span className="brand-period" aria-hidden="true">.</span>
            </span>
          </a>
          <nav
            className={menu ? "main-nav open" : "main-nav"}
            aria-label={t("메인 메뉴", "Main navigation")}
          >
            {links.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
          </nav>
          <div className="nav-end">
            <button
              className="language-btn"
              aria-label={t("Switch to English", "한국어로 전환")}
              onClick={() => setEn(!en)}
            >
              <Globe size={15} />
              {en ? "KR" : "EN"}
            </button>
            <a className="btn nav-cta" href={APP}>
              {t("오픈 준비 중", "Coming soon")}
              <ArrowUpRight size={15} />
            </a>
            <button
              className="icon-btn mobile-toggle"
              aria-expanded={menu}
              aria-controls="mobile-menu"
              aria-label={t(
                menu ? "메뉴 닫기" : "메뉴 열기",
                menu ? "Close menu" : "Open menu",
              )}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menu && (
          <nav
            className="mobile-menu"
            id="mobile-menu"
            aria-label={t("모바일 메뉴", "Mobile navigation")}
          >
            {links.map(([href, label]) => (
              <a href={href} key={href} onClick={() => setMenu(false)}>
                {label}
                <ArrowRight size={17} />
              </a>
            ))}
            <a href={APP}>
              {t("서비스 오픈 준비 중", "Web app coming soon")}
              <ArrowUpRight size={17} />
            </a>
          </nav>
        )}
      </header>
      <main id="main">
        <section className="hero section-wrap">
          <HeroBounce />
          <p className="hero-kicker">
            <span className="tiny-blue-dot" />
            {t(
              "할 일과 일정을 잇는 나의 AI 비서",
              "Your personal assistant, from thought to done",
            )}
          </p>
          <h1>
            {t("흩어진 일은 모으고,", "Bring it all together.")}
            <br />
            <span>{t("나의 하루는 가볍게.", "Make room for your day.")}</span>
          </h1>
          <p className="hero-copy">
            {t(
              "메시지 속 약속부터 머릿속 할 일까지.",
              "From a promise in a message to a thought on your mind.",
            )}
            <br />
            {t(
              "docen에서 살펴보고, 필요한 일만 이어가세요.",
              "See what matters. Choose what happens next.",
            )}
          </p>
          <div className="hero-actions">
            <a className="text-link" href="#product-demo">
              {t("어떻게 쓰나요?", "See how it works")}
              <ChevronDown size={17} />
            </a>
          </div>
          <Demo en={en} />
          <div className="demo-caption">
            <span>
              {t(
                "받은 내용을 그대로 쌓아두지 않도록.",
                "A place for next steps, not another pile of messages.",
              )}
            </span>
            <button onClick={() => setModal("qr")}>
              <QrCode size={16} />
              {t("휴대폰에서 열기", "Open on your phone")}
            </button>
          </div>
        </section>
        <section className="workflow section-wrap" id="how">
          <div className="section-heading">
            <p className="eyebrow blue">FROM INBOX TO ACTION</p>
            <h2>
              {t("읽고 끝나는 정리에서,", "From something you read,")}
              <br />
              {t("실제로 끝내는 하루로.", "to something you do.")}
            </h2>
            <p>
              {t(
                "모든 메시지가 할 일이 될 필요는 없어요. 다음 행동은 내가 정해요.",
                "Not every message needs a task. You choose the next step.",
              )}
            </p>
          </div>
          <div className="steps-grid">
            {[
              [
                MessageCircle,
                t("한곳에서 살펴보고", "See it together"),
                t(
                  "연결한 자료와 대화에서 챙길 일을 확인해요.",
                  "Review the things that need you, from connected sources and conversations.",
                ),
              ],
              [
                ListTodo,
                t("필요한 일만 담고", "Keep what matters"),
                t(
                  "할 일로 옮기거나, 날짜를 정해 캘린더에 담아요.",
                  "Keep it as a to-do, or give it a date and make it an event.",
                ),
              ],
              [
                CircleCheck,
                t("끝낸 일은 가볍게", "Finish and move on"),
                t(
                  "대화에서 바로 마쳐도 좋아요. 끝낸 일은 기록으로 남아요.",
                  "Finish it in the conversation if that’s all it needs. Keep a record, not a loose end.",
                ),
              ],
            ].map(([Icon, title, body], i) => (
              <article key={title}>
                <span className="step-number">0{i + 1}</span>
                <Icon size={25} />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="features section-wrap" id="features">
          <div className="feature-row">
            <div className="feature-copy">
              <span className="eyebrow blue">A LITTLE MORE CLARITY</span>
              <h2>
                {t("오늘 할 일은,", "Today’s tasks.")}
                <br />
                {t("오늘 보이게.", "A clearer day.")}
              </h2>
              <p>
                {t(
                  "날짜별로 하루를 계획하고, 출처별로 흐름을 살펴보세요. 언제까지인지, 어디에서 온 일인지 함께 보여요.",
                  "Plan by date. Find context by source. See when it’s due and where it came from, together.",
                )}
              </p>
              <ul>
                <li>
                  <Check />
                  {t(
                    "날짜와 출처가 보이는 간결한 목록",
                    "Simple lists with dates and sources",
                  )}
                </li>
                <li>
                  <Check />
                  {t(
                    "연결할 수 있는 원본으로 바로 이동",
                    "A link back to supported sources",
                  )}
                </li>
                <li>
                  <Check />
                  {t(
                    "체크하면 완료, 필요하면 되돌리기",
                    "Check it off, undo when you need to",
                  )}
                </li>
              </ul>
            </div>
            <div className="todo-illustration product-surface">
              <div className="mini-toolbar">
                <span>
                  <ListTodo size={18} /> Todo
                </span>
                <span className="segmented-label">
                  {t("날짜별", "By date")}
                  <span>{t("출처별", "By source")}</span>
                </span>
              </div>
              <div className="date-heading">
                <strong>19</strong>
                <span>{t("오늘 · 목요일", "Today · Thursday")}</span>
                <span className="rule" />
              </div>
              <div className="small-task">
                <CircleCheck size={20} />
                <div>
                  <strong>
                    {t("제안서 피드백 전달하기", "Send proposal feedback")}
                  </strong>
                  <small>
                    11.19 · Gmail <ArrowUpRight size={11} />
                  </small>
                </div>
              </div>
              <div className="small-task">
                <CircleCheck size={20} />
                <div>
                  <strong>
                    {t("다음 주 회의 준비", "Prepare next week’s meeting")}
                  </strong>
                  <small>
                    11.19 · Slack <ArrowUpRight size={11} />
                  </small>
                </div>
              </div>
              <div className="date-heading smaller">
                <strong>20</strong>
                <span>{t("내일 · 금요일", "Tomorrow · Friday")}</span>
                <span className="rule" />
              </div>
              <div className="small-task">
                <CircleCheck size={20} />
                <div>
                  <strong>{t("책 반납하기", "Return library books")}</strong>
                  <small>
                    {t("11.20 · 미리알림", "11.20 · Reminders")}{" "}
                    <ArrowUpRight size={11} />
                  </small>
                </div>
              </div>
              <p className="surface-caption">
                {t("제품 화면 구성 예시", "Illustrative product layout")}
              </p>
            </div>
          </div>
          <div className="feature-row reverse">
            <div className="feature-copy">
              <span className="eyebrow blue">YOUR TIME, IN ONE PLACE</span>
              <h2>
                {t("할 일에 시간을 주면,", "Give your to-dos time.")}
                <br />
                {t("계획이 되니까.", "Make a plan that fits.")}
              </h2>
              <p>
                {t(
                  "할 일과 일정을 오가며 내 하루를 계획하세요. 오늘 해야 하는 일과 이미 잡힌 약속을 한눈에 확인해요.",
                  "Bring to-dos and events into the same day. See what needs doing alongside the plans you already have.",
                )}
              </p>
              <a className="text-link" href={APP}>
                {t("웹서비스 오픈 준비 중", "Web app coming soon")}
                <ArrowRight size={17} />
              </a>
            </div>
            <div className="calendar-illustration product-surface">
              <div className="mini-toolbar">
                <span>
                  <CalendarDays size={18} />
                  {t("나의 캘린더", "My calendar")}
                </span>
                <span>2026.11</span>
              </div>
              <div className="week-strip">
                {[16, 17, 18, 19, 20, 21, 22].map((day, i) => (
                  <div key={day} className={day === 19 ? "today" : ""}>
                    <small>
                      {
                        (en
                          ? ["M", "T", "W", "T", "F", "S", "S"]
                          : ["월", "화", "수", "목", "금", "토", "일"])[i]
                      }
                    </small>
                    <strong>{day}</strong>
                  </div>
                ))}
              </div>
              <div className="calendar-event">
                <span>10:00</span>
                <div>
                  <strong>{t("팀 미팅", "Team meeting")}</strong>
                  <small>Google Calendar</small>
                </div>
              </div>
              <div className="calendar-event violet">
                <span>14:00</span>
                <div>
                  <strong>{t("제안서 검토하기", "Review the proposal")}</strong>
                  <small>
                    {t(
                      "Todo에서 일정으로",
                      "From a to-do to time on your calendar",
                    )}
                  </small>
                </div>
              </div>
              <div className="calendar-event muted">
                <span>16:00</span>
                <div>
                  <strong>
                    {t("잠깐, 나를 위한 시간", "A little time for yourself")}
                  </strong>
                  <small>
                    {t("내가 직접 만든 일정", "An event you created")}
                  </small>
                </div>
              </div>
              <p className="surface-caption">
                {t("제품 화면 구성 예시", "Illustrative product layout")}
              </p>
            </div>
          </div>
        </section>
        <section className="ai-section" id="ai">
          <div className="section-wrap">
            <div className="section-heading">
              <span className="eyebrow blue">YOUR AI, YOUR WAY</span>
              <h2>
                {t("같은 정리 방식으로,", "The same clear workflow.")}
                <br />
                {t("나에게 맞는 만큼.", "The right amount of help.")}
              </h2>
              <p>
                {t(
                  "브리핑부터 문서 초안까지. 더 깊은 대화는 프로에서.",
                  "From briefings to document drafts. Go Pro for direct conversation.",
                )}
              </p>
            </div>
            <div className="ai-options">
              <article>
                <div className="option-top">
                  <Link2 size={25} />
                  <span>
                    {t(
                      "라이트 · 베타 월 16,900원",
                      "LITE · BETA ₩16,900 / MONTH",
                    )}
                  </span>
                </div>
                <h3>
                  {t("필요한 정리부터 가볍게", "A little everyday assistance")}
                </h3>
                <p>
                  {t(
                    "자료를 정리하고, 브리핑을 받고, 문서 초안을 만들어요. 필요한 내용은 Todo와 캘린더로 이어가세요.",
                    "Organize sources, receive briefings and draft supported documents. Keep the next step as a to-do or calendar event.",
                  )}
                </p>
                <div className="ai-route">
                  <span>{t("자료 · 브리핑", "Sources · Briefings")}</span>
                  <ArrowRight size={18} />
                  <span>
                    <Duck /> Todo · Calendar
                  </span>
                </div>
                <small>
                  {t(
                    "기본 월 사용량 · 직접 AI 채팅은 프로에서",
                    "Base monthly allowance · Direct AI chat in Pro",
                  )}
                </small>
              </article>
              <article>
                <div className="option-top">
                  <Sparkles size={25} />
                  <span>
                    {t("프로 · 베타 월 49,900원", "PRO · BETA ₩49,900 / MONTH")}
                  </span>
                </div>
                <h3>
                  {t(
                    "더 이야기하고, 더 맡기려면",
                    "More room to talk and get things done",
                  )}
                </h3>
                <p>
                  {t(
                    "라이트의 정리 기능에 직접 AI 채팅을 더해요. 더 넉넉한 사용량으로 자료를 질문하고 문서 작업을 이어가세요.",
                    "Everything in Lite, plus direct AI chat. Ask about your sources and work on documents with a larger monthly allowance.",
                  )}
                </p>
                <div className="ai-route">
                  <span>
                    <Duck />
                    {t("docen AI", "docen AI")}
                  </span>
                  <ArrowRight size={18} />
                  <span>Chat · Todo · Calendar</span>
                </div>
                <small>
                  {t(
                    "확대 월 사용량 · 자료 사용 동의와 연결 권한 필요",
                    "Larger monthly allowance · Source consent and permissions required",
                  )}
                </small>
              </article>
            </div>
          </div>
        </section>
        <section className="connections section-wrap" id="connections">
          <div className="connection-heading">
            <div>
              <p className="eyebrow blue">LESS SCATTERED, MORE TOGETHER</p>
              <h2>
                {t("쓰던 곳에서 시작해,", "Start where you already are.")}
                <br />
                {t("docen에서 이어가세요.", "Bring the next step to docen.")}
              </h2>
            </div>
            <p>
              {t(
                "연결은 필요한 만큼만. 계정과 자료 범위를 직접 고르고, 원본을 확인하며 정리해요.",
                "Connect what you need. Choose your accounts and sources, and keep the original context within reach.",
              )}
            </p>
          </div>
          <div className="connection-grid">
            {[
              [
                CalendarDays,
                "Google Calendar",
                t("일정 조회 · 권한 내 수정", "View events · permitted edits"),
              ],
              [
                Mail,
                "Gmail",
                t("선택한 메일에서 업무 확인", "Review selected email sources"),
              ],
              [
                ClipboardList,
                "Google Tasks",
                t("할 일 가져오기 · 상태 반영", "Import tasks · update status"),
              ],
              [
                Smartphone,
                t("iPhone 미리알림", "iPhone Reminders"),
                t(
                  "기기 권한으로 미완료 가져오기",
                  "Import unfinished items with device access",
                ),
              ],
              [
                MessageCircle,
                "Slack",
                t(
                  "전용 앱 설정 · 권한 필요",
                  "Dedicated app setup and permissions",
                ),
              ],
              [
                NotebookPen,
                "Notion",
                t(
                  "선택한 페이지 · 권한 필요",
                  "Selected pages and permissions",
                ),
              ],
            ].map(([Icon, name, desc]) => (
              <div className="connection-item" key={name}>
                <span className="service-icon">
                  <Icon size={25} />
                </span>
                <div>
                  <h3>{name}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="connection-note">
            {t(
              "서비스별 설정과 권한이 필요하며, 사용 가능한 기능은 연결 상태에 따라 달라요. iPhone 미리알림은 웹에서 직접 가져올 수 없어요.",
              "Setup and permissions vary by service. Features depend on connection status. iPhone Reminders cannot be imported directly from the web.",
            )}
          </p>
        </section>
        <Pricing lang={en ? "en" : "ko"} />
        <section className="trust-section section-wrap">
          <div className="trust-intro">
            <ShieldCheck size={31} />
            <h2>
              {t("나의 자료니까,", "Your information.")}
              <br />
              {t("선택도 내 손안에.", "Your choice.")}
            </h2>
          </div>
          <div className="trust-points">
            <article>
              <h3>{t("필요한 자료만", "Only the context you choose")}</h3>
              <p>
                {t(
                  "계정 연결과 AI 자료 사용은 별개예요. AI에게 맡길 범위를 직접 선택해요.",
                  "Connecting an account and sharing context with AI are separate choices.",
                )}
              </p>
            </article>
            <article>
              <h3>{t("바꾸기 전에 확인", "Review before changes")}</h3>
              <p>
                {t(
                  "원본 변경에는 실제 권한과 확인이 필요해요. 할 수 없는 일은 이유와 함께 알려드려요.",
                  "Source changes require permissions and confirmation. Limits are explained.",
                )}
              </p>
            </article>
            <article>
              <h3>
                {t("내 기록은 내 계정에서", "Your records, in your account")}
              </h3>
              <p>
                {t(
                  "연결을 해제하고 자료 사용을 조정할 수 있어요.",
                  "Disconnect services and adjust which information is used.",
                )}
              </p>
            </article>
            <a className="text-link" href={WEB + "/privacy"}>
              {t("개인정보 처리방침", "Privacy policy")}
              <ArrowUpRight size={16} />
            </a>
          </div>
        </section>
        <section className="faq-section section-wrap" id="faq">
          <h2>{t("궁금한 점이 있나요?", "A few things you might wonder.")}</h2>
          <div>
            {faqs.map(([q, qe, a, ae]) => (
              <details key={q}>
                <summary>
                  {t(q, qe)}
                  <Plus size={20} />
                </summary>
                <p>{t(a, ae)}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="closing section-wrap">
          <div className="closing-wordmark" aria-label="docen">docen<span className="brand-period" aria-hidden="true">.</span></div>
          <h2>
            {t("오늘은 조금 더 가볍게.", "A little less to carry today.")}
          </h2>
          <p>
            {t(
              "머릿속에 쌓아둔 일, docen에서 하나씩 풀어보세요.",
              "Give the things on your mind a place to go.",
            )}
          </p>
          <div className="hero-actions">
            <button className="text-link" onClick={() => setModal("iphone")}>
              <Smartphone size={17} />
              {t("iPhone 앱 안내", "About the iPhone app")}
            </button>
          </div>
        </section>
      </main>
      <footer className="site-footer section-wrap">
        <div>
          <a className="brand" href="#">
            <Duck />
            <span>
              docen<span className="brand-period" aria-hidden="true">.</span>
            </span>
          </a>
          <p>
            {t(
              "흩어진 일은 모으고, 나의 하루는 가볍게.",
              "Bring it together. Make room for your day.",
            )}
          </p>
          <small>© {new Date().getFullYear()} docen.</small>
        </div>
        <nav aria-label={t("하단 메뉴", "Footer navigation")}>
          <a href="#pricing">{t("요금제", "Pricing")}</a>
          <a href={WEB + "/support"}>{t("문의하기", "Support")}</a>
          <a href={WEB + "/terms"}>{t("이용약관", "Terms")}</a>
          <a href={WEB + "/privacy"}>{t("개인정보 처리방침", "Privacy")}</a>
          <a href={WEB + "/refund"}>{t("환불정책", "Refund policy")}</a>
          <a href={WEB + "/ai-policy"}>{t("AI·외부 서비스 안내", "AI and integrations")}</a>
          <a href={WEB + "/cookies"}>{t("쿠키 안내", "Cookies")}</a>
          <a href={APP}>
            {t("서비스 오픈 안내", "Launch information")}
            <ArrowUpRight size={14} />
          </a>
        </nav>
        <div className="footer-business" lang="ko" dangerouslySetInnerHTML={{__html: companyFooter}} />
      </footer>
      {modal && (
        <div
          className="modal-scrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            className="site-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            ref={modalRef}
          >
            <button
              className="icon-btn modal-close"
              aria-label={t("닫기", "Close")}
              onClick={() => setModal(null)}
            >
              <X />
            </button>
            <Duck />
            <h2 id="modal-title">
              {t(
                modal === "qr" ? "휴대폰에서도 가볍게" : "iPhone에서 만나요",
                modal === "qr"
                  ? "View our website on your phone"
                  : "Meet docen on iPhone",
              )}
            </h2>
            {modal === "qr" ? (
              <>
                <p>
                  {t(
                    "QR코드를 스캔하면 docen 소개 페이지가 열려요. 웹서비스는 아직 오픈 준비 중이에요.",
                    "Scan to visit the docen introduction website. The web app is not open yet.",
                  )}
                </p>
                {qr && (
                  <img
                    className="qr-image"
                    src={qr}
                    width="220"
                    height="220"
                    alt={t(
                      "docen 소개 페이지를 여는 QR 코드",
                      "QR code for the docen introduction website",
                    )}
                  />
                )}
              </>
            ) : (
              <p>
                {t(
                  "iPhone 앱은 TestFlight로 내부 테스트 중이에요. 현재는 소개 페이지만 공개하며, 웹서비스와 앱의 공개 오픈은 준비 중이에요.",
                  "The iPhone app is in internal testing with TestFlight. Only our introduction website is public; the web app and public app launch are still in preparation.",
                )}
              </p>
            )}
            <a className="btn" href={APP}>
              {t("오픈 준비 중", "Coming soon")}
              <ArrowUpRight size={16} />
            </a>
          </section>
        </div>
      )}
    </>
  );
}

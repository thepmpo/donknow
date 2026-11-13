import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Globe,
  Smartphone,
  ShieldCheck,
  Menu,
  X,
  Pause,
  Play,
  Check,
} from "lucide-react";
import QRCode from "qrcode";
import decorations from "./decorations.json";
import "./reference.css";

const WEB = "https://duckduck-test.onrender.com";
const copy = {
  kr: {
    nav: ["기능", "개인정보 보호", "도움말"],
    open: "덕 열기",
    hero: ["AI와 함께하는 하루,", "조금 더 가볍게"],
    sub: "덕과 함께 만들어갑니다",
    intro: "나만의 AI 비서",
    introTitle: ["흩어진 일정을 한눈에 모으는", "나만의 AI 비서, 덕"],
    web: "웹에서 열기",
    iphone: "iPhone 테스트",
    features: [
      "일정 한눈에",
      "작은 할 일 끝내기",
      "메시지를 할 일로",
      "완료한 일 기록으로",
    ],
    research: "덕이 일하는 방식",
    researchTitle: ["대신 결정하기보다,", "함께 정리하고 확인합니다."],
    more: "덕을 만드는 과정",
    securityTitle: ["나의 하루를 맡기는 만큼,", "선택은 언제나 내 손안에"],
    securityLead:
      "연결한 계정과 AI에게 보낼 자료를 직접 고르고, 외부에 반영할 내용은 실행 전에 확인해요.",
    privacy: "개인정보 처리방침",
    actions: "AI 실행 방식",
    tiles: [
      ["인증 정보 보호", "연결 정보는 암호화해서"],
      ["계정별 데이터", "내 자료는 내 계정에서"],
      ["실행 전 확인", "변경은 내가 확인한 뒤에"],
    ],
    faq: "자주 묻는 질문",
    all: "도움말 보기",
    questions: [
      "덕은 어떤 일을 도와주나요?",
      "AI에게 어떤 자료가 전달되나요?",
      "덕이 마음대로 수정하거나 보내나요?",
      "아이폰과 웹에서 사용할 수 있나요?",
    ],
    answers: [
      "캘린더와 Todo를 함께 보고, 덕 채팅에서 할 일을 정리할 수 있어요. 붙여넣은 글에서 할 일 후보를 제안받고, 직접 확인해서 추가할 수 있습니다.",
      "동의한 뒤 선택한 자료와 요청 내용이 AI 분석에 사용됩니다. 계정 연결과 AI 자료 선택은 별개이며, 연결했다고 모든 자료가 자동으로 AI에 전달되지는 않아요.",
      "외부 서비스의 변경은 실행 초안을 확인하고 실행을 눌러야 반영됩니다. 서비스별 쓰기 권한과 연결 상태가 필요해요.",
      "웹에서 덕을 열 수 있습니다. iPhone 앱은 TestFlight로 검증 중이며, 공개 App Store 출시나 누구나 사용하는 테스트 초대 링크는 아직 제공하지 않습니다.",
    ],
    footer: ["하루의 흩어진 조각들,", "덕과 함께 가볍게"],
    qr: "QR코드를 스캔하면 휴대폰에서 덕을 열 수 있어요.",
    testTitle: "iPhone에서 덕을 만나보세요",
    testBody:
      "현재 TestFlight로 실제 기기에서 검증하고 있어요. 공개 초대 링크는 아직 준비 중입니다. 지금은 웹에서 사용하거나 문의해주세요.",
    support: "문의하기",
    close: "닫기",
    lang: "언어 선택",
    demo: "실제 덕 화면 · 예시 데이터",
    pause: "영상 일시정지",
    play: "영상 재생",
  },
  en: {
    nav: ["Features", "Privacy", "Help"],
    open: "Open Duck",
    hero: ["A little less to carry.", "A little more room for you."],
    sub: "Make space for your day with Duck",
    intro: "Your personal AI assistant",
    introTitle: [
      "Your scattered plans, together.",
      "Your personal assistant, Duck.",
    ],
    web: "Open web app",
    iphone: "iPhone testing",
    features: [
      "See your schedule",
      "Finish the little things",
      "Messages into to-dos",
      "Keep a record of progress",
    ],
    research: "How Duck works",
    researchTitle: ["Organize together.", "You make the final call."],
    more: "How we build Duck",
    securityTitle: ["Your day is personal.", "Your choices stay yours."],
    securityLead:
      "Choose the accounts and information to share with AI. Review changes before they reach an external service.",
    privacy: "Privacy policy",
    actions: "How AI actions work",
    tiles: [
      ["Credential protection", "Encrypted connection details"],
      ["Account separation", "Your data, in your account"],
      ["Review before action", "Confirm changes yourself"],
    ],
    faq: "Frequently asked questions",
    all: "Get help",
    questions: [
      "What can Duck help me with?",
      "What information is shared with AI?",
      "Can Duck change things without asking?",
      "Can I use Duck on iPhone and the web?",
    ],
    answers: [
      "See your calendar and to-dos together, and organize tasks in Duck chat. Paste a message to get proposed to-dos, then review and add them yourself.",
      "AI uses the request and the information you choose after giving consent. Connecting an account does not automatically send all its information to AI.",
      "Changes to external services require a preview and your confirmation. Each service also needs the right connection and write permission.",
      "You can open Duck on the web. The iPhone app is being tested through TestFlight. A public App Store listing and open TestFlight invitation are not available yet.",
    ],
    footer: ["Bring the pieces of your day", "together with Duck."],
    qr: "Scan to open Duck on your phone.",
    testTitle: "Meet Duck on iPhone",
    testBody:
      "The iPhone app is currently being tested through TestFlight. An open invitation is not available yet. Try the web app or contact us.",
    support: "Contact us",
    close: "Close",
    lang: "Choose language",
    demo: "Actual Duck app · sample data",
    pause: "Pause videos",
    play: "Play videos",
  },
};
const join = (...a) => a.filter(Boolean).join(" ");
function Video({ name, src, poster, className = "", loop = true, ...props }) {
  return (
    <video
      className={className}
      src={src || `/assets/reference/${name}.webm`}
      poster={poster || `/assets/reference/${name}.webp`}
      muted
      playsInline
      loop={loop}
      preload="metadata"
      data-office-video="true"
      {...props}
    />
  );
}
function Decoration({ item, footer = false }) {
  return (
    <span
      aria-hidden="true"
      className={
        footer
          ? "characters-slot"
          : join("showcase-pickle", item.front && "showcase-pickleFront")
      }
      style={item.style}
    >
      <span
        className={footer ? "characters-frame" : "showcase-pickleArt"}
        style={item.artStyle}
      >
        <div className={footer ? "characters-video" : "showcase-pickleVideo"}>
          <Video src={item.src} poster={item.poster} />
        </div>
      </span>
    </span>
  );
}

export function App() {
  const [lang, setLang] = useState("kr"),
    [menu, setMenu] = useState(false),
    [languageMenu, setLanguageMenu] = useState(false),
    [download, setDownload] = useState(false),
    [testInfo, setTestInfo] = useState(false),
    [qr, setQr] = useState(""),
    [faq, setFaq] = useState(-1),
    [cursor, setCursor] = useState(4),
    [progress, setProgress] = useState(0),
    [paused, setPaused] = useState(false),
    [reduced, setReduced] = useState(false),
    [motionOptIn, setMotionOptIn] = useState(false),
    [phoneVisible, setPhoneVisible] = useState(false),
    [headerTheme, setHeaderTheme] = useState("clear"),
    [headerHidden, setHeaderHidden] = useState(false);
  const allowMotion = !paused && (!reduced || motionOptIn);
  const t = copy[lang],
    active = ((cursor % 4) + 4) % 4,
    root = useRef(),
    zone = useRef(),
    research = useRef(),
    security = useRef(),
    track = useRef(),
    viewport = useRef(),
    phoneVideos = useRef([]),
    dialog = useRef(),
    opener = useRef(),
    touch = useRef(null),
    [trackX, setTrackX] = useState(0);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(WEB + "/", {
      width: 446,
      margin: 0,
      errorCorrectionLevel: "M",
    }).then((v) => alive && setQr(v));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "kr" ? "ko" : "en";
    document.title =
      lang === "kr"
        ? "덕 — 하루가 조금 더 가벼워지는 순간"
        : "Duck — Make space for your day";
  }, [lang]);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)"),
      update = () => {
        setReduced(mq.matches);
        setMotionOptIn(false);
      };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const videos = [
      ...root.current.querySelectorAll("video[data-office-video]"),
    ];
    const io = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting } of entries) {
          target.dataset.inView = String(isIntersecting);
          if (isIntersecting && allowMotion && !document.hidden) {
            target.play().catch(() => {});
          } else target.pause();
        }
      },
      { threshold: 0.05 },
    );
    videos.forEach((v) => io.observe(v));
    const visibility = () =>
      videos.forEach((v) => {
        if (document.hidden) v.pause();
        else if (v.dataset.inView === "true" && allowMotion)
          v.play().catch(() => {});
      });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      videos.forEach((v) => v.pause());
    };
  }, [allowMotion]);
  useEffect(() => {
    phoneVideos.current.forEach((video, index) => {
      if (video && index === active) video.currentTime = 0;
    });
    setProgress(0);
  }, [active]);
  useEffect(() => {
    const update = () =>
      phoneVideos.current.forEach((video, index) => {
        if (!video) return;
        if (index === active && allowMotion && phoneVisible && !document.hidden)
          video.play().catch(() => {});
        else video.pause();
      });
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [active, allowMotion, phoneVisible]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setPhoneVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    const phone = root.current.querySelector(".showcase-phone");
    observer.observe(phone);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const update = () => {
      const b = track.current?.children[cursor];
      if (b && viewport.current)
        setTrackX(
          viewport.current.clientWidth / 2 - b.offsetLeft - b.offsetWidth / 2,
        );
    };
    update();
    const ro = new ResizeObserver(update);
    if (viewport.current) ro.observe(viewport.current);
    return () => ro.disconnect();
  }, [cursor, lang]);
  useEffect(() => {
    let last = scrollY,
      frame;
    const update = () => {
      const y = scrollY,
        h = innerHeight,
        rr = research.current.getBoundingClientRect(),
        sr = security.current.getBoundingClientRect();
      const fade = Math.max(0, Math.min(1, (h * 0.82 - rr.top) / (h * 0.6)));
      const black = Math.max(0, Math.min(1, (h * 0.7 - sr.top) / (h * 0.55)));
      zone.current.style.setProperty("--research-fade", fade);
      zone.current.style.setProperty("--security-fade", black);
      setHeaderTheme(
        sr.top < 80
          ? "dark"
          : rr.top < 80 && rr.bottom > 80
            ? "dark"
            : y < 60
              ? "clear"
              : "light",
      );
      if (Math.abs(y - last) > 6) {
        setHeaderHidden(
          y > last && y > h * 0.6 && !menu && !download && !languageMenu,
        );
        last = y;
      }
      frame = null;
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", scroll, { passive: true });
    addEventListener("resize", scroll);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", scroll);
      removeEventListener("resize", scroll);
    };
  }, [menu, download, languageMenu]);
  useEffect(() => {
    if (!download && !testInfo) return;
    const restore = document.activeElement;
    opener.current = restore;
    const p = dialog.current;
    p?.querySelector("a,button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") {
        setDownload(false);
        setTestInfo(false);
      }
      if (e.key === "Tab" && p) {
        const list = [...p.querySelectorAll("a[href],button")].filter(
          (x) => x.getClientRects().length,
        );
        const first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      restore?.focus();
    };
  }, [download, testInfo]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") {
        setMenu(false);
        setLanguageMenu(false);
      }
    };
    const click = (e) => {
      if (!e.target.closest("[data-popover]")) {
        setDownload(false);
        setLanguageMenu(false);
      }
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", click);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", click);
    };
  }, []);
  function advance() {
    setCursor((c) => (c >= 7 ? 4 : c + 1));
  }
  const go = () => {
    setMenu(false);
    setHeaderHidden(false);
  };
  const iconStyle = { width: 20, height: 20 };
  const openDownload = () => {
    setDownload((v) => !v);
    setLanguageMenu(false);
    setMenu(false);
  };
  return (
    <main
      ref={root}
      className="shell-page shell-entered"
      data-language={lang}
      data-topbar-hidden={headerHidden}
    >
      <a className="skip-link" href="#features">
        {lang === "kr" ? "본문 바로가기" : "Skip to content"}
      </a>
      <header
        className={join("duck-header", menu && "is-menu-open")}
        data-theme={headerTheme}
      >
        <div className="header-inner">
          <a
            className="duck-brand"
            href="#top"
            onClick={go}
            aria-label={lang === "kr" ? "덕 홈" : "Duck home"}
          >
            <img src="/assets/duck.png" alt="" width="35" height="35" />
            <span>duckduck</span>
          </a>
          <nav
            className="desktop-links"
            aria-label={lang === "kr" ? "주 메뉴" : "Main navigation"}
          >
            <a href="#features">{t.nav[0]}</a>
            <a href="#privacy">{t.nav[1]}</a>
          </nav>
          <div className="header-actions">
            <div
              className={join("download-root", download && "download-open")}
              data-popover
            >
              <button
                className="download-pill"
                onClick={openDownload}
                aria-expanded={download}
                aria-controls="download-dialog"
              >
                {t.open}
              </button>
              {download && (
                <div className="download-dropdown">
                  <div
                    ref={dialog}
                    id="download-dialog"
                    role="dialog"
                    aria-label={t.open}
                    className="qr-panel download-panel"
                  >
                    <button
                      className="dialog-close"
                      onClick={() => setDownload(false)}
                      aria-label={t.close}
                    >
                      <X size={20} />
                    </button>
                    {qr && (
                      <img
                        src={qr}
                        width="223"
                        height="223"
                        className="qr-qr"
                        alt={t.qr}
                      />
                    )}
                    <p className="qr-caption">{t.qr}</p>
                    <div className="qr-links">
                      <a
                        className="qr-open"
                        href={WEB + "/"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.web}
                      </a>
                      <button
                        className="qr-open text-button"
                        onClick={() => {
                          setDownload(false);
                          setTestInfo(true);
                        }}
                      >
                        {t.iphone}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div
              className={join("language-root", languageMenu && "language-open")}
              data-popover
            >
              <button
                className="language-chip"
                aria-label={t.lang}
                aria-expanded={languageMenu}
                onClick={() => {
                  setLanguageMenu((v) => !v);
                  setDownload(false);
                }}
              >
                {lang === "kr" ? "KR" : "EN"}
                <ChevronDown className="language-chevron" size={18} />
              </button>
              {languageMenu && (
                <div className="language-dropdown">
                  <div
                    className="language-menu"
                    role="group"
                    aria-label={t.lang}
                  >
                    {[
                      ["kr", "한국어"],
                      ["en", "English"],
                    ].map(([code, label]) => (
                      <button
                        key={code}
                        className={join(
                          "language-item",
                          lang === code && "language-itemCurrent",
                        )}
                        onClick={() => {
                          setLang(code);
                          setLanguageMenu(false);
                        }}
                        lang={code === "kr" ? "ko" : "en"}
                      >
                        <span className="language-itemCode">
                          {code.toUpperCase()}
                        </span>
                        <span className="language-itemName">{label}</span>
                        {lang === code && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              className="mobile-menu-button"
              onClick={() => {
                setMenu((v) => !v);
                setDownload(false);
                setLanguageMenu(false);
              }}
              aria-label={
                menu ? t.close : lang === "kr" ? "메뉴 열기" : "Open menu"
              }
              aria-expanded={menu}
              aria-controls="mobile-menu"
            >
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        <nav
          id="mobile-menu"
          className={join("mobile-menuPanel", menu && "mobile-menuPanelOpen")}
          aria-label={lang === "kr" ? "모바일 메뉴" : "Mobile navigation"}
          inert={!menu}
        >
          {[
            [t.nav[0], "#features"],
            [t.nav[1], "#privacy"],
            [t.nav[2], "#faq"],
          ].map(([label, href]) => (
            <a className="mobile-menuLink" key={href} href={href} onClick={go}>
              {label}
            </a>
          ))}
        </nav>
      </header>
      <div className="shell-stage">
        <div className="shell-bottomPin">
          <div className="shell-bottom">
            <footer className="footer-footer">
              <div className="footer-characters">
                <div className="footer-characterScale">
                  <div className="characters-strip">
                    {decorations.footer.map((item, i) => (
                      <Decoration key={i} item={item} footer />
                    ))}
                  </div>
                </div>
              </div>
              <div className="footer-column">
                <h2 className="footer-title">
                  {t.footer.map((line) => (
                    <span key={line} className="footer-titleLine">
                      {line}
                    </span>
                  ))}
                </h2>
                <button
                  className="footer-download"
                  onClick={() => {
                    scrollTo({
                      top: 0,
                      behavior: reduced ? "instant" : "smooth",
                    });
                    setHeaderHidden(false);
                    setDownload(true);
                  }}
                >
                  {t.open}
                </button>
                <div className="footer-bottomRow">
                  <div className="footer-brand">
                    <img
                      src="/assets/duck.png"
                      alt="duckduck"
                      className="footer-logo"
                    />
                    <p className="footer-copyright">
                      © 2026 duckduck
                      <br />
                      Kim Sanghyun
                    </p>
                  </div>
                  <div className="footer-links">
                    <div className="footer-linkStack">
                      <a
                        className="footer-link"
                        href={WEB + "/privacy"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.privacy}
                      </a>
                      <a
                        className="footer-link"
                        href={WEB + "/support"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.nav[2]}
                      </a>
                    </div>
                    <div className="footer-linkStack">
                      <a
                        className="footer-link"
                        href={WEB + "/project"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {lang === "kr" ? "프로젝트 문서" : "Project docs"}
                      </a>
                      <a
                        className="footer-link"
                        href="mailto:thepmpo.official@gmail.com"
                      >
                        {t.support}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </div>
        <div className="shell-whiteSection">
          <div className="landing-content landing-entered">
            <section className="landing-hero" id="top" aria-label="duckduck">
              <div className="landing-heroFrame">
                <div className="landing-heroVideo">
                  <Video className="hero-desktop" name="hero_background-1440" />
                  <Video
                    className="hero-mobile"
                    name="hero_background_mobile-540"
                  />
                </div>
                <div className="landing-heroText">
                  <h1 className="landing-heroTitle">
                    {lang === "kr" ? (
                      <>
                        <strong>AI</strong>
                        {t.hero[0].slice(2)}
                      </>
                    ) : (
                      t.hero[0]
                    )}
                    <br />
                    {t.hero[1]}
                  </h1>
                  <p className="landing-heroSubtitle">{t.sub}</p>
                </div>
                <a
                  href="#features"
                  className="landing-heroChevron"
                  aria-label={t.nav[0]}
                >
                  <ChevronDown size={21} />
                </a>
                <button
                  className="video-toggle"
                  onClick={() => {
                    if (!allowMotion) {
                      setMotionOptIn(true);
                      setPaused(false);
                    } else setPaused(true);
                  }}
                  aria-label={allowMotion ? t.pause : t.play}
                  aria-pressed={!allowMotion}
                >
                  {!allowMotion ? <Play size={14} /> : <Pause size={14} />}
                </button>
              </div>
            </section>
            <div ref={zone} className="landing-zone">
              <div className="landing-backdrop" aria-hidden="true">
                <div className="landing-backdropResearch">
                  <div className="landing-backdropVideo">
                    <Video name="research_app_loop-480" />
                  </div>
                  <div className="landing-backdropDim" />
                </div>
                <div className="landing-backdropSecurity" />
              </div>
              <section className="landing-intro" id="features">
                <p className="landing-introEyebrow">{t.intro}</p>
                <h2 className="landing-introTitle">
                  {t.introTitle[0]}
                  <br />
                  {lang === "kr" ? (
                    <>
                      나만의 <strong>AI</strong> 비서, 덕
                    </>
                  ) : (
                    t.introTitle[1]
                  )}
                </h2>
                <div className="landing-storeRow">
                  <a
                    className="landing-storeButton"
                    href={WEB + "/"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Globe size={22} />
                    {t.web}
                  </a>
                  <button
                    className="landing-storeButton"
                    onClick={() => setTestInfo(true)}
                  >
                    <Smartphone size={22} />
                    {t.iphone}
                  </button>
                </div>
                <div
                  className="showcase-showcase"
                  role="region"
                  aria-label={
                    lang === "kr" ? "덕 기능 데모" : "Duck feature demos"
                  }
                >
                  <div className="showcase-stageFrame">
                    <div className="showcase-stage">
                      {decorations.intro.map((item, i) => (
                        <Decoration key={i} item={item} />
                      ))}
                      <div
                        className="showcase-phone"
                        role="tabpanel"
                        id="feature-preview"
                        aria-label={t.features[active]}
                      >
                        {t.features.map((_, i) => (
                          <video
                            ref={(v) => (phoneVideos.current[i] = v)}
                            key={i}
                            className={join(
                              "showcase-phoneVideo",
                              i === active && "showcase-phoneVideoCurrent",
                            )}
                            src={`/assets/demos/duck-${i}.webm`}
                            poster={`/assets/demos/duck-${i}.png`}
                            aria-hidden={i !== active}
                            aria-label={t.features[i]}
                            playsInline
                            muted
                            preload="metadata"
                            onEnded={() =>
                              i === active &&
                              allowMotion &&
                              phoneVisible &&
                              advance()
                            }
                            onTimeUpdate={(e) =>
                              i === active &&
                              setProgress(
                                e.currentTarget.currentTime /
                                  (e.currentTarget.duration || 1),
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div
                    className="showcase-pillViewport"
                    ref={viewport}
                    onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
                    onTouchEnd={(e) => {
                      if (touch.current !== null) {
                        const delta =
                          e.changedTouches[0].clientX - touch.current;
                        if (Math.abs(delta) > 35)
                          setCursor((c) =>
                            c + (delta < 0 ? 1 : -1) < 4
                              ? 7
                              : c + (delta < 0 ? 1 : -1) > 7
                                ? 4
                                : c + (delta < 0 ? 1 : -1),
                          );
                        touch.current = null;
                      }
                    }}
                  >
                    <div
                      className="showcase-pillTrack"
                      ref={track}
                      style={{ transform: `translateX(${trackX}px)` }}
                      role="tablist"
                      aria-label={t.nav[0]}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <button
                          id={i === cursor ? "current-feature" : undefined}
                          key={i}
                          className={join(
                            "showcase-pill",
                            i === cursor && "showcase-pillCurrent",
                          )}
                          role="tab"
                          aria-controls="feature-preview"
                          aria-selected={i === cursor}
                          tabIndex={i === cursor ? 0 : -1}
                          aria-hidden={i < 4 || i >= 8 ? true : undefined}
                          style={{ "--progress": i === cursor ? progress : 0 }}
                          onClick={() => setCursor(4 + (i % 4))}
                          onKeyDown={(e) => {
                            if (
                              e.key === "ArrowRight" ||
                              e.key === "ArrowLeft"
                            ) {
                              e.preventDefault();
                              const n =
                                4 +
                                ((active + (e.key === "ArrowRight" ? 1 : 3)) %
                                  4);
                              setCursor(n);
                              requestAnimationFrame(() =>
                                track.current.children[n]?.focus(),
                              );
                            }
                          }}
                        >
                          <span className="showcase-pillFill" />
                          <span className="showcase-pillLabel">
                            {t.features[i % 4]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="demo-caption">{t.demo}</p>
                </div>
              </section>
              <section
                className="landing-research"
                ref={research}
                id="approach"
              >
                <div className="landing-researchColumn">
                  <div className="landing-researchVideoBox">
                    <div className="landing-researchVideo">
                      <Video name="research_app_loop-480" />
                    </div>
                  </div>
                  <div className="landing-researchText">
                    <p className="landing-researchEyebrow">{t.research}</p>
                    <h2 className="landing-researchTitle">
                      {t.researchTitle[0]}
                      <br />
                      {t.researchTitle[1]}
                    </h2>
                    <a
                      className="landing-researchMore"
                      href={WEB + "/project"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.more}
                      <ChevronRight size={18} />
                    </a>
                  </div>
                  <p className="landing-researchLicense">
                    Critter ©{" "}
                    <a
                      href="https://studio.blender.org/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Blender Studio
                    </a>
                    <br />
                    <a
                      href="https://creativecommons.org/licenses/by/4.0/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      CC BY 4.0
                    </a>
                    <br />
                    {lang === "kr"
                      ? "프로토타입 참고 영상"
                      : "Prototype reference footage"}
                  </p>
                </div>
              </section>
              <section className="landing-security" ref={security} id="privacy">
                <div className="landing-securityHead">
                  <div className="landing-securityShield">
                    <ShieldCheck size={52} />
                  </div>
                  <h2 className="landing-securityTitle">
                    {t.securityTitle[0]}
                    <br />
                    {t.securityTitle[1]}
                  </h2>
                  <p className="landing-securityLead">{t.securityLead}</p>
                  <div className="landing-securityLinks">
                    <a
                      className="landing-securityPill landing-securityPillFilled"
                      href={WEB + "/privacy"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.privacy}
                      <ChevronRight size={18} />
                    </a>
                    <a
                      className="landing-securityPill"
                      href="https://github.com/thepmpo/donknow/blob/main/docs/assistant-actions.md"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.actions}
                      <ArrowUpRight size={18} />
                    </a>
                  </div>
                </div>
                <div className="landing-tiles">
                  {["key", "box", "toggles"].map((name, i) => (
                    <a
                      key={name}
                      className="landing-tile"
                      href={
                        i === 2
                          ? "https://github.com/thepmpo/donknow/blob/main/docs/assistant-actions.md"
                          : WEB + "/privacy"
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span
                        className={join(
                          "landing-tileVisual",
                          "landing-tileVisual_" +
                            ["encryption", "isolation", "control"][i],
                        )}
                      >
                        <img
                          src={`/assets/reference/security-tile-${name}.webp`}
                          alt=""
                          loading="lazy"
                        />
                      </span>
                      <span className="landing-tileFoot">
                        <span className="landing-tileText">
                          <span className="landing-tileLabel">
                            {t.tiles[i][0]}
                          </span>
                          <span className="landing-tileTitle">
                            {t.tiles[i][1]}
                          </span>
                        </span>
                        <span className="landing-tileArrow">
                          <ArrowUpRight size={24} />
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
                <div className="landing-securityFaq faq-faq" id="faq">
                  <div className="faq-header">
                    <h2 className="faq-title">{t.faq}</h2>
                    <a
                      className="faq-all"
                      href={WEB + "/support"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.all}
                      <ChevronRight size={18} />
                    </a>
                  </div>
                  <ul className="faq-list">
                    {t.questions.map((q, i) => (
                      <li
                        key={i}
                        className={join(
                          "faq-item",
                          faq === i && "faq-itemOpen",
                        )}
                      >
                        <button
                          id={"question-" + i}
                          className="faq-question"
                          aria-expanded={faq === i}
                          aria-controls={"answer-" + i}
                          onClick={() => setFaq((v) => (v === i ? -1 : i))}
                        >
                          <span className="faq-questionText">{q}</span>
                          <ChevronRight
                            className="faq-questionChevron"
                            size={24}
                          />
                        </button>
                        <div
                          id={"answer-" + i}
                          role="region"
                          aria-labelledby={"question-" + i}
                          className="faq-panel"
                          inert={faq !== i}
                        >
                          <div className="faq-panelInner">
                            <p className="faq-answer">{t.answers[i]}</p>
                            <div className="faq-links">
                              <a
                                className="faq-link"
                                href={WEB + "/support"}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {t.nav[2]}
                                <ChevronRight size={16} />
                              </a>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </div>
        <div className="shell-revealSpace" />
      </div>
      {testInfo && (
        <div
          className="modal-scrim"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setTestInfo(false);
          }}
        >
          <section
            className="modal-card test-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="test-title"
            ref={dialog}
          >
            <button
              className="dialog-close"
              onClick={() => setTestInfo(false)}
              aria-label={t.close}
            >
              <X size={20} />
            </button>
            <Smartphone size={32} />
            <h2 id="test-title">{t.testTitle}</h2>
            <p>{t.testBody}</p>
            <a
              className="modal-primary"
              href={WEB + "/"}
              target="_blank"
              rel="noreferrer"
            >
              {t.web}
              <ArrowUpRight size={18} />
            </a>
            <a
              className="modal-contact"
              href="mailto:thepmpo.official@gmail.com"
            >
              {t.support}
            </a>
          </section>
        </div>
      )}
    </main>
  );
}

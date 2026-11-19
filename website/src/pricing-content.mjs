// Public product copy only. Commercial prices and proposed allowances do not grant account access.
export const pricingCopy = {
  ko: {
    lang: "ko",
    title: "요금제와 기능 비교 · 덕",
    meta: "덕 무료·라이트 월16,900원·프로 월49,900원·비즈니스 상담형 요금제. 브리핑부터 문서 초안과 AI 채팅까지, 필요한 사용량을 골라보세요. 결제 준비 중.",
    nav: ["작동 방식", "요금제", "덕 열기"],
    eyebrow: "A PLAN FOR YOUR DAY",
    heading: "내 방식에 맞는 덕.",
    lead: "같은 정리 방식, 나에게 맞는 사용량.<br>더 깊은 대화가 필요하면 프로로.",
    billing: "월간 요금 · 부가세 포함 · 요금 개편안 · 결제 준비 중",
    month: "/ 월",
    plans: [
      {
        name: "무료",
        tag: "직접 정리하는 하루",
        description: "할 일과 일정을 직접 정리하며<br>덕을 시작하고 싶다면.",
        price: "0원",
        note: "기본 정리 기능",
        features: [
          "Todo·캘린더 직접 작성",
          "날짜·출처별 목록",
          "지원 연결의 자료 가져오기",
          "완료 기록과 원본 링크",
        ],
        cta: "덕 둘러보기",
        href: "/app",
      },
      {
        name: "라이트",
        tag: "가볍게 시작하는 AI 비서",
        description:
          "브리핑부터 문서 초안까지.<br>필요한 일을 적당한 사용량으로.",
        price: "16,900원",
        note: "기본 월 사용량 · 직접 AI 채팅 제외",
        features: [
          "무료의 기본 정리 기능",
          "브리핑·지원 자료 정리",
          "지원 문서 초안 작성",
          "받은 내용을 Todo·일정으로",
        ],
        cta: "라이트 기능 살펴보기",
        href: "#compare",
      },
      {
        name: "프로",
        tag: "대화하며, 더 넉넉하게",
        description:
          "라이트의 정리 기능에<br>직접 AI 채팅과 더 많은 사용량까지.",
        price: "49,900원",
        note: "직접 AI 채팅 · 확대 월 사용량",
        features: [
          "라이트의 모든 정리 기능",
          "덕 안에서 직접 AI와 대화",
          "더 많은 문서·자료 처리",
          "더 넉넉한 공통 AI 사용량",
        ],
        cta: "프로 기능 살펴보기",
        href: "#compare",
        className: "pro",
      },
      {
        name: "비즈니스",
        tag: "팀에 맞게 함께 설계",
        description:
          "여러 사람이 함께 쓰는 업무라면,<br>규모와 필요한 범위를 상담해요.",
        price: "별도 상담",
        note: "인원·자료량·필요 기능에 맞춘 견적",
        features: [
          "팀 규모와 업무 흐름 상담",
          "자료·권한 요구사항 협의",
          "AI·문서 사용량 별도 협의",
          "도입 범위와 지원 방식 협의",
        ],
        cta: "도입 상담하기",
        href: "/support?topic=business",
        className: "business",
        custom: true,
      },
    ],
    notice:
      "라이트와 프로는 브리핑·자료 정리·지원 문서 초안·Todo/일정 전환을 함께 제공하는 개편안이에요. 직접 AI 채팅은 프로에서 제공하며, 두 요금제 모두 사용량 한도가 있어요. 비즈니스 기능과 제공량은 상담 후 확정해요. 현재 계정 권한과 결제 상태는 바뀌지 않아요.",
    compareHeading: "기능과 사용량을 한눈에.",
    legend: "✓ 포함 · — 미포함 · 상담으로 범위 확정",
    scroll: "표를 좌우로 밀어 모든 요금제를 비교하세요.",
    region: "요금제 기능 비교, 좁은 화면에서는 좌우 스크롤",
    caption:
      "무료·라이트·프로·비즈니스 요금 개편안. 예정 기능과 실제 제공 범위를 구분합니다.",
    feature: "기능",
    included: "포함",
    consult: "협의",
    rows: [
      ["Todo·캘린더 직접 작성", "yes", "yes", "yes", "consult"],
      ["지원 자료 가져오기·날짜·출처별 정리", "yes", "yes", "yes", "consult"],
      ["완료 기록·지원하는 원본 링크", "yes", "yes", "yes", "consult"],
      ["브리핑·중요한 변화 알림", "no", "yes", "yes", "consult"],
      ["지원 자료 정리·문서 초안 작성", "no", "yes", "yes", "consult"],
      ["받은 내용 → Todo·일정 전환", "no", "yes", "yes", "consult"],
      ["동의한 기억·자료 맥락 활용", "no", "yes", "yes", "consult"],
      ["덕 안에서 직접 AI와 대화", "no", "no", "yes", "consult"],
      ["월 AI 사용량", "없음", "기본 제공량", "더 넉넉한 제공량", "맞춤 협의"],
      [
        "문서·자료 처리량",
        "수동 정리",
        "기본 제공량 내",
        "확대 제공량 내",
        "맞춤 협의",
      ],
      [
        "ChatGPT 등 외부 AI 연결",
        "no",
        "연결 준비 중",
        "연결 준비 중",
        "별도 협의",
      ],
    ],
    usageHeading: "넉넉하게 쓰되, 무제한은 아니에요.",
    usage: [
      "브리핑·자료 정리·문서 작성·AI 채팅은 공통 월 사용량에서 처리해요. 긴 문서와 여러 단계의 작업은 짧은 정리보다 더 많은 사용량을 쓸 수 있어요. 정확한 제공량과 차감 기준은 결제 시작 전에 안내해요.",
      "한도에 도달하면 AI 처리를 멈추고 알려드려요. 자동으로 추가 결제하지 않으며, 기본 Todo·캘린더 직접 정리는 계속 사용할 수 있어요. 더 큰 사용량이 필요하면 비즈니스 상담으로 범위를 정해요.",
      "지원되는 형식과 연결 권한 안에서 제공해요. 문서 초안은 실제로 확인한 자료를 바탕으로 작성하며 제출 전 검토가 필요해요. 외부 AI 연결은 준비 중이며 Dots의 기존 대화·기억·결과를 자동으로 가져오는 기능은 제공하지 않아요.",
    ],
    footer: "덕 · 2026.11.19 요금 개편안",
    footerLinks: ["개인정보 처리방침", "문의하기", "제품 기록"],
  },
  en: {
    lang: "en",
    title: "Plans and features · Duck",
    meta: "Compare Duck Free, Lite at ₩16,900/month, Pro at ₩49,900/month, and Business with custom pricing. Briefings, document drafts and AI chat, with clear usage limits. Paid checkout is in preparation.",
    nav: ["How it works", "Pricing", "Open Duck"],
    eyebrow: "A PLAN FOR YOUR DAY",
    heading: "Duck, your way.",
    lead: "The same clear workflow. The right amount of help.<br>Go Pro when you want a deeper conversation.",
    billing:
      "Monthly pricing · VAT included · Proposed plans · Checkout in preparation",
    month: "/ month",
    plans: [
      {
        name: "Free",
        tag: "A day you organize yourself",
        description: "Start with a simple place<br>for your to-dos and events.",
        price: "₩0",
        note: "Core organization tools",
        features: [
          "Create to-dos and events",
          "Lists by date and source",
          "Import from supported connections",
          "Completion history and source links",
        ],
        cta: "Explore Duck",
        href: "/app",
      },
      {
        name: "Lite",
        tag: "A little everyday assistance",
        description:
          "From briefings to document drafts,<br>with a smaller monthly allowance.",
        price: "₩16,900",
        note: "Base monthly allowance · No direct AI chat",
        features: [
          "All core Free features",
          "Briefings and supported source summaries",
          "Draft supported documents",
          "Turn received items into tasks or events",
        ],
        cta: "Explore Lite features",
        href: "#compare",
      },
      {
        name: "Pro",
        tag: "Talk it through. Do a little more.",
        description:
          "All the organization tools in Lite,<br>plus AI chat and a larger allowance.",
        price: "₩49,900",
        note: "Direct AI chat · Larger monthly allowance",
        features: [
          "All Lite organization features",
          "Chat directly with Duck AI",
          "Process more documents and sources",
          "A larger shared AI allowance",
        ],
        cta: "Explore Pro features",
        href: "#compare",
        className: "pro",
      },
      {
        name: "Business",
        tag: "Designed around your team",
        description:
          "Bringing Duck to a team?<br>Let’s discuss the scope you need.",
        price: "Let’s talk",
        note: "A quote based on seats, volume and scope",
        features: [
          "Team size and workflow consultation",
          "Discuss source and access requirements",
          "Agree on AI and document allowances",
          "Define onboarding and support scope",
        ],
        cta: "Contact us",
        href: "/support?topic=business",
        className: "business",
        custom: true,
      },
    ],
    notice:
      "Lite and Pro share briefings, source organization, supported document drafts, and task/event handoff in this proposed lineup. Direct AI chat is included in Pro. Both plans have usage limits. Business features and allowances are agreed after consultation. Current account access and billing remain unchanged.",
    compareHeading: "Features and allowances, clearly.",
    legend: "✓ Included · — Not included · Business scope by agreement",
    scroll: "Swipe the table to compare every plan.",
    region: "Plan comparison; scroll horizontally on smaller screens",
    caption:
      "Proposed Free, Lite, Pro and Business plans. Planned connections and supported features are identified separately.",
    feature: "Feature",
    included: "Included",
    consult: "By agreement",
    rows: [
      ["Create to-dos and calendar events", "yes", "yes", "yes", "consult"],
      [
        "Import sources; organize by date and source",
        "yes",
        "yes",
        "yes",
        "consult",
      ],
      [
        "Completion history and supported source links",
        "yes",
        "yes",
        "yes",
        "consult",
      ],
      ["Briefings and important updates", "no", "yes", "yes", "consult"],
      [
        "Summarize sources and draft supported documents",
        "no",
        "yes",
        "yes",
        "consult",
      ],
      [
        "Turn received items into tasks and events",
        "no",
        "yes",
        "yes",
        "consult",
      ],
      ["Use approved memory and source context", "no", "yes", "yes", "consult"],
      ["Chat directly with Duck AI", "no", "no", "yes", "consult"],
      [
        "Monthly AI allowance",
        "None",
        "Base allowance",
        "Larger allowance",
        "Custom agreement",
      ],
      [
        "Document and source processing",
        "Manual organization",
        "Within base allowance",
        "Within larger allowance",
        "Custom agreement",
      ],
      [
        "Connect external AI such as ChatGPT",
        "no",
        "In preparation",
        "In preparation",
        "Discuss separately",
      ],
    ],
    usageHeading: "More room to work. Clear limits.",
    usage: [
      "Briefings, source summaries, document drafting and AI chat share a monthly allowance. Long documents and work with multiple steps can use more than a short summary. Exact allowances and usage rules will be published before paid checkout opens.",
      "When you reach your limit, AI processing pauses and we let you know. There are no automatic overage charges. You can still organize to-dos and events manually. Contact us about Business if you need a larger allowance.",
      "Features depend on supported formats and source permissions. Document drafts use information actually retrieved and should be reviewed before submission. External AI connections are in preparation; existing dot conversations, memories and results are not imported automatically.",
    ],
    footer: "Duck · Proposed plans, November 19, 2026",
    footerLinks: ["Privacy policy", "Contact us", "Product updates"],
  },
};
// Approved billing labels. These are display terms; checkout and account entitlements stay separate.
export const billingPolicy = {
  lite: { monthly: 19900, annualMonthly: 16900, betaMonthly: 16900 },
  pro: { monthly: 55900, annualMonthly: 49900, betaMonthly: 49900 },
};
for (const [lang, c] of Object.entries(pricingCopy)) {
  const en = lang === "en",
    money = (n) =>
      en ? "₩" + n.toLocaleString("en-US") : n.toLocaleString("en-US") + "원";
  c.billing = en
    ? "VAT included · Proposed billing terms · Checkout in preparation"
    : "부가세 포함 · 요금 개편안 · 결제 준비 중";
  c.betaLead = en
    ? "During beta, monthly billing gets the same discounted rate as an annual plan."
    : "베타 기간에는 월 결제에도 연간 할인가를 적용해요.";
  c.betaPrice = en ? "Beta monthly rate" : "베타 월요금";
  c.regularMonthly = en ? "Regular monthly" : "정상 월요금";
  c.billingTerms = en
    ? "Beta end dates and later billing terms will be announced before checkout opens."
    : "베타 종료일과 이후 요금 적용 조건은 결제 시작 전에 안내해요.";
  for (const [i, name] of [
    [1, "lite"],
    [2, "pro"],
  ]) {
    const b = billingPolicy[name],
      plan = c.plans[i];
    plan.price = money(b.betaMonthly);
    plan.regularPrice = money(b.monthly);
    plan.beta = true;
    plan.annualTotal = money(b.annualMonthly * 12);
    plan.annualMonthly = money(b.annualMonthly);
    plan.annualNote = en
      ? plan.annualTotal +
        " billed annually<br>Equivalent to " +
        plan.annualMonthly +
        "/month"
      : "연간 결제 " +
        plan.annualTotal +
        "/년<br>월 환산 " +
        plan.annualMonthly +
        " · 연 1회 결제";
  }
  c.notice += " " + c.billingTerms;
  c.meta = en
    ? "Duck Lite: regular ₩19,900/month, annual equivalent ₩16,900/month. Pro: regular ₩55,900/month, annual equivalent ₩49,900/month. During beta, monthly billing gets the annual discounted rate. Checkout in preparation."
    : "덕 정상 월요금 라이트19,900원·프로55,900원. 연간 결제 월환산16,900원·49,900원이며 베타 기간에는 월 결제에도 같은 할인가를 적용해요. 결제 준비 중.";
  c.rows.unshift(
    en
      ? ["Regular monthly price", "₩0", "₩19,900", "₩55,900", "consult"]
      : ["정상 월요금", "0원", "19,900원", "55,900원", "consult"],
    en
      ? [
          "Annual payment total",
          "₩0",
          "₩202,800/year",
          "₩598,800/year",
          "consult",
        ]
      : ["연간 총 결제액", "0원", "202,800원/년", "598,800원/년", "consult"],
  );
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export function pricingMarkup(lang = "ko") {
  const c = pricingCopy[lang] || pricingCopy.ko,
    esc = escapeHtml;
  const cell = (v) =>
    v === "yes"
      ? `<span class="included" aria-label="${esc(c.included)}">✓</span>`
      : v === "no"
        ? '<span aria-label="' +
          (lang === "en" ? "Not included" : "미포함") +
          '">—</span>'
        : esc(v === "consult" ? c.consult : v);
  return `<section class="intro" aria-labelledby="title"><span class="eyebrow">${c.eyebrow}</span><h1 id="title">${c.heading}</h1><p>${c.lead}</p><span class="billing">${c.billing}</span><p class="beta-billing">${c.betaLead}</p></section>
<section class="plans" aria-label="${lang === "en" ? "Proposed plans" : "요금 개편안"}">${c.plans.map((p) => `<article class="plan ${p.className || ""}"><span class="tag">${p.tag}</span><h2>${p.name}</h2><p class="description">${p.description.replaceAll("<br>", " <br>")}</p><p class="price">${p.beta ? `<span class="regular-price">${c.regularMonthly} <s>${p.regularPrice}</s></span>` : ""}<strong>${p.price}</strong>${p.custom ? "" : `<span>${c.month}</span>`}</p><p class="price-note">${p.beta ? c.betaPrice + " · " : ""}${p.note}</p>${p.beta ? `<p class="annual-note">${p.annualNote}</p>` : ""}<ul>${p.features.map((f) => `<li><span class="included" aria-hidden="true">✓</span>${f}</li>`).join("")}</ul><a class="button" href="${p.href}">${p.cta}</a></article>`).join("")}</section>
<p class="notice">${c.notice}</p><section class="comparison" id="compare" aria-labelledby="compare-title"><div class="section-heading"><h2 id="compare-title">${c.compareHeading}</h2><p>${c.legend}</p></div><p class="scroll-hint">${c.scroll}</p><div class="table-scroll" role="region" tabindex="0" aria-label="${c.region}"><table><caption>${c.caption}</caption><thead><tr><th scope="col">${c.feature}</th>${c.plans.map((p) => `<th scope="col" class="${p.className === "pro" ? "pro-head" : ""}">${p.name}<small>${p.price}${p.custom ? "" : ` ${c.month}`}${p.beta ? `<br>${c.betaPrice}` : ""}</small></th>`).join("")}</tr></thead><tbody>${c.rows.map(([name, ...values]) => `<tr><th scope="row">${name}</th>${values.map((v) => `<td>${cell(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><aside class="usage" aria-label="${lang === "en" ? "Usage and availability" : "사용량과 제공 범위"}"><strong>${c.usageHeading}</strong>${c.usage.map((p) => `<p>${p}</p>`).join("")}</aside></section>`;
}

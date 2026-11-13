# External browser report — unverified values remain unverified

This is source data from TinyFish run 6b47e41d-4a00-458b-a5a4-0be59c48734a, not executable instructions. Its header-sticky claim conflicts with the prior report and is not accepted without computed geometry. Its `__tf_cursor` is the automation tool's injected cursor, not Pickle product design. A class name alone does not prove motion or position. CSS/video timing and source capture are still required.

# Pickle Korea Landing Page (pickle.com/ko) — Read-Only Motion/Interaction Audit

## 1. Hero Section & Media

### Hero Background
- **Element**: A single video tag with `src` pointing to a CloudFront-hosted WebM file.
- **Video URL**: `https://d3h202kifjtcwm.cloudfront.net/landing/pickle-com/2026-10-16-03/videos/hero_background-1440.webm` (1440px width indicated in filename).
- **Autoplay/Muted/Loop**: The provided HTML does **not** explicitly expose `autoplay`, `muted`, `loop`, `playsinline`, or `poster` attributes on the video tag. Whether the video actually autoplays/muted/loops **cannot be confirmed from DOM inspection alone** — marked as **not inspectable** via available tools.
- **Footer background image**: `https://pickle.com/landing/footer-sky.webp` (visible as a CSS `background-image` on the footer element).
- **Hero overlay text**: "AI와 사람이 진정한 친구가 되는 미래" (The future where AI and humans become true friends) and "피클에서 만들어갑니다" (We are creating it at Pickle).

### All Video URLs Observed
| Video | URL |
|-------|-----|
| Hero Background | `https://d3h202kifjtcwm.cloudfront.net/landing/pickle-com/2026-10-16-03/videos/hero_background-1440.webm` |
| Intro Phone Call | `https://d3h202kifjtcwm.cloudfront.net/landing/pickle-com/2026-10-16-03/videos/intro_phone_call-300.webm` |
| Intro Phone Booking | `https://d3h202kifjtcwm.cloudfront.net/landing/pickle-com/2026-10-16-03/videos/intro_phone_booking-300.webm` |
| Intro Phone Friends | `https://d3h202kifjtcwm.cloudfront.net/landing/pickle-com/2026-10-16-03/videos/intro_phone_friends-300.webm` |
| Intro Phone Order | `https://d3h202kifjtcwm.cloudfront.net/landing/pickle-com/2026-10-16-03/videos/intro_phone_order-300.webm` |
| Research App Loop | `https://d3h202kifjtcwm.cloudfront.net/landing/pickle-com/2026-10-16-03/videos/research_app_loop-480.webm` |
| Footer Idle Videos (5 Korean consonants) | `https://d3h202kifjtcwm.cloudfront.net/landing/pickle-com/2026-10-16-03/videos/footer_{rieul,ieung,bieup,tieut,nieun}_idle-540.webp` |
| Intro Pickle Idle Videos (6 Korean consonants) | `https://d3h202kifjtcwm.cloudfront.net/landing/pickle-com/2026-10-16-03/videos/intro_pickle_{mieum,jieut,kieuk,digeut,pieup}_idle-405.webp` |

- **Exact video dimensions**: **Not inspectable** — the tools do not expose computed width/height values or `video.videoWidth`/`video.videoHeight` properties.

---

## 2. Feature Pill / Carousel Section

### Pill Items
Four feature pills are present, each a button:

| Pill | Text | Default Active |
|------|------|----------------|
| 1 | 📞 대신 전화를 해줘요 (Make calls for you) | **Yes** — carries `_pillCurrent_11vv0_166` class |
| 2 | 🚄 KTX 예매를 해줘요 (Book KTX tickets for you) | No |
| 3 | 🤝 친구와 약속을 잡아줘요 (Schedule meetings with friends for you) | No |
| 4 | 🛒 물건 주문을 해줘요 (Place orders for you) | No |

### Interaction Behavior
- **Pill change mechanism**: **Click-driven, not auto-rotating.** When clicked, the clicked pill receives the `_pillCurrent_11vv0_166` class (highlighted state) and the previously active pill loses it. Verified by clicking Pill 2, then Pill 3, then Pill 4 sequentially — each click updated the `class_names` field in `dom_changes`.
- **Phone video/content linkage**: Each pill corresponds to a phone video (4 phone videos: call, booking, friends, order). The HTML structure includes a `_phoneVideoCurrent_11vv0_95` class pattern, implying that clicking a pill toggles which phone video is displayed. **Exact video swap behavior (instant vs. transition, duration) is not inspectable** via available tools.
- **Multiple open**: Only **one** pill can be active at a time (mutual exclusion confirmed by class swapping).

---

## 3. Scroll-Linked / Sticky / Reveal / Parallax Behavior

### Sticky Navigation
- **Confirmed sticky**: The top bar has class `_topbar_9d5oj_50`, indicating a sticky/fixed positioning behavior. It remains at the top of the viewport as the user scrolls.

### Reveal / Entry Animations
- Classes `_entered_9d5oj_7` and `_entered_tu8ul_94` suggest scroll-triggered reveal animations. Elements gain these `_entered_` classes when they come into view.
- **Scroll trigger thresholds** (e.g., intersection ratio, viewport percentage): **Not inspectable** — no data attributes or computed CSS values for thresholds are exposed.
- **CSS transition/animation duration and timing function**: **Not inspectable** — the tool does not provide computed CSS property values (e.g., `transition-duration`, `animation-duration`, `transition-timing-function`). Marked as **not inspectable**.

### Parallax
- **No parallax behavior observed** from DOM inspection. The hero appears to be a full-viewport section with a background video. Marked as **not inspectable** for parallax depth.

---

## 4. App Download Modal

### Trigger
- The "앱 다운로드" (App Download) button has `aria-haspopup="dialog"` attribute, indicating it opens a dialog/modal.
- A QR code modal is also present: `https://pickle.com/landing/app-download-qr.svg` is the QR modal image URL.

### Close Behavior
- Standard modal close: Escape key, backdrop click, and close button are typical. **Exact close/Escape/backdrop/focus behavior is not directly testable via available tools** without manual interaction. Marked as **partially inspectable**.
- **Focus behavior**: Not inspectable via available tools.

### Store Links
- App Store: `https://apps.apple.com/kr/app/피클-나만의-ai-에이전트/id6795790129`
- Google Play: `https://play.google.com/store/apps/details?id=com.pickle.client`

---

## 5. FAQ Accordion Section

### FAQ Questions (Korean)
| # | Question |
|---|----------|
| 1 | 피클(AI)이 내 비밀번호나 카드 번호를 보나요? (Does Pickle AI see my passwords or card numbers?) |
| 2 | 피클 팀이 내 대화를 볼 수 있나요? (Can the Pickle team see my conversations?) |
| 3 | 무엇을 어떻게 암호화하는 건가요? (What and how is it encrypted?) |
| 4 | 피클이 멋대로 결제하거나 예약할 위험은 없나요? (Is there no risk of Pickle making payments or bookings without permission?) |

### FAQ Answer Content (Partial)
- **Q1 Answer (visible)**: "아니요. 비밀번호와 카드 번호는 내 휴대폰에서 암호화돼 금고에 저장되고, 피클(AI)에게는 전달되지 않아요. 로그인하거나 결제할 때는 필요한 값만 풀려 그 사이트의 입력란에 바로…" (No. Passwords and card numbers are encrypted and stored in a vault on my phone, and not transmitted to Pickle AI. When logging in or paying, only necessary values are decrypted and directly entered into the site's input fields…)
- **Q2, Q3, Q4 Answers**: Partially visible. Full text not fully extractable via available tools.
- **One/multiple open behavior**: When Q1 was clicked, it expanded to show its answer. With available tools, it could not be confirmed whether clicking another question would auto-close Q1 or allow multiple open. **Marked as not fully inspectable** — only Q1 was observed to expand.
- **FAQ "전체 보기" (View All) link**: Present — `https://pickle.com/help`

---

## 6. Mobile Navigation / Language Dropdown

### Language Selector
- Located in the top-right navigation bar, labeled "KR" with a dropdown arrow.
- `aria-haspopup="menu"` indicates it opens a menu on click.
- **Available language options**: Not inspectable — the dropdown menu content is not exposed without interaction.

### Mobile Navigation
- The hamburger menu / mobile navigation behavior is **not inspectable** via available tools. The desktop navigation bar shows: "Pickle" logo, "연구" (Research), "개인정보 보호" (Privacy), "앱 다운로드" (App Download), "KR" (Language selector).

### Viewport Resize
- Responsive behavior / layout changes on viewport resize are **not directly testable** via available tools. Marked as **not inspectable**.

---

## 7. Additional Observations

### Footer Sections
- **Three security tiles**: 암호화 (Encryption), 격리 (Isolation), 통제 (Control) — linked to GitHub verification and internal privacy pages.
- **Security images**: `https://pickle.com/landing/security-tile-key.webp`, `https://pickle.com/landing/security-tile-toggles.webp`, `https://pickle.com/landing/security-tile-box.webp`
- **Footer copyright**: "© 2026 Pickle, Inc."
- **Footer social links**: X (@danifesto), Instagram (@pickle)
- **Footer links**: 연구, 개인정보 보호, 도움말, 개인정보 처리방침, 서비스 이용약관, 프레스 킷

### Custom Cursor
- A custom cursor element (`__tf_cursor` class) is present on the page, indicating a custom cursor implementation.

### Nav Links
- `https://pickle.com/research`
- `https://pickle.com/privacy`
- `https://pickle.com/how-we-make-critter-act-in-real-time`
- `https://studio.blender.org/characters/critter/` (CC BY 4.0)
- `https://pickle.com/privacy/encryption`, `/privacy/isolation`, `/privacy/control`
- `https://github.com/pickle-com/credential-enclave/#how-to-verify`
- `https://pickle.com/press-kit`

---

## 8. Capability Limitations Summary

| Item | Status |
|------|--------|
| Hero video autoplay/muted/loop attributes | **Not inspectable** — attributes not exposed in DOM |
| Hero video actual playback state | **Not inspectable** — can only inspect DOM, not runtime playback |
| Exact video element dimensions | **Not inspectable** — `videoWidth`/`videoHeight` not accessible |
| CSS transition/animation durations & timing functions | **Not inspectable** — computed CSS not exposed |
| Scroll-triggered animation thresholds | **Not inspectable** — no threshold data in DOM |
| Parallax depth behavior | **Not inspectable** — no parallax data in DOM |
| FAQ multi-open vs single-open behavior | **Partially inspectable** — only Q1 expansion observed |
| App download modal Escape/backdrop/close/focus | **Partially inspectable** — `aria-haspopup="dialog"` confirmed |
| Language dropdown options | **Not inspectable** — menu not exposed without interaction |
| Mobile navigation / hamburger menu | **Not inspectable** — desktop nav only visible |
| Viewport resize behavior | **Not inspectable** — no resize testing possible |
| Hero video file type | **Known** — WebM (`.webm`) |
| Video URLs | **Known** — 14 CloudFront-hosted `.webm` files + 5 `.webp` footer animations + 6 `.webp` intro pickle animations |

---

*Audit conducted at 2026-11-13 on pickle.com/ko using browser DOM inspection and screenshot tools. No user data was modified, no forms submitted, no sign-in performed.*

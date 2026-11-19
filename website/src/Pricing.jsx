import React from "react";
import { css, markup, markupEn } from "virtual:duck-pricing";
/** Trusted repository HTML only. Both languages share layout and product policy. */
export function Pricing({ lang = "ko" }) {
  const en = lang === "en";
  return (
    <section
      className="duck-pricing"
      id="pricing"
      lang={en ? "en" : "ko"}
      aria-label={en ? "Plans and feature comparison" : "요금제와 기능 비교"}
    >
      <style>{css}</style>
      <div dangerouslySetInnerHTML={{ __html: en ? markupEn : markup }} />
    </section>
  );
}

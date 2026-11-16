import React from "react";
import {css,markup} from "virtual:duck-pricing";
/** Trusted repository HTML; never accepts customer or API content. */
export function Pricing(){return <section className="duck-pricing" id="pricing" lang="ko" aria-label="요금제와 기능 비교"><style>{css}</style><div dangerouslySetInnerHTML={{__html:markup}}/></section>;}

import{t as n,getLocale as S}from"./i18n/i18n.mjs?v=20260823c";import{escapeHtml as s}from"./html-utils.js?v=20260816g";import{formatDietLabel as Y,getDietBadgeTone as I,normalizeDietCode as T}from"./diet-utils.mjs?v=20260823b";import{normalizeKitchenDietLegend as _}from"./diet-legend.mjs?v=20260823b";import{buildKitchenMatrixScreens as J,buildSummaryMatrixScreens as Q}from"./summary-matrix-model.js?v=20260820i";let A=0;function va(a,{days:t=[],operationDays:e=[],kitchen:r=!1,layout:i="classic",residentLabel:o="name",dietLegend:m=[],showContactHint:c=!0,activeIndex:l=0,onActiveIndexChange:u=()=>{}}={}){const y=r?J(t,e):Q(t,[],e);if(i==="future"&&!r){V(a,y,o,l,u,c);return}if(y.every(h=>h.columns.length===0)){a.innerHTML=`<p class="empty-state">${s(n("summary.noMeal"))}</p>`;return}const d=r?"kitchen":"summary",x=i==="international"?ca:sa;a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${i}${r?" summary-layout-kitchen":" summary-layout-diners"}" data-${d}-matrix-track aria-label="${s(n("summary.screensLabel"))}">
      ${y.map(h=>x(h,{kitchen:r,activeIndex:l,residentLabel:o,showContactHint:c,dietLegend:m})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${s(n("summary.swipeHint"))}</p>
  `;const f=a.querySelector(`[data-${d}-matrix-track]`);let p=0;f.addEventListener("scroll",()=>{window.clearTimeout(p),p=window.setTimeout(()=>{const h=ha(f,d);U(a,d,h),u(h)},100)},{passive:!0}),window.requestAnimationFrame(()=>{ta(a,l,{kitchen:r,smooth:!1})})}function V(a,t,e,r=0,i=()=>{},o=!0){a.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${t.map(l=>`
        <article class="summary-future-card" data-summary-future-screen="${l.index}" aria-hidden="${l.index!==r}">
          <header class="summary-future-card-head">
            <div><strong>${s(n(l.labelKey))}</strong><time datetime="${s(l.dateId)}">${s(N(l.dateId))}</time></div>
            ${aa(l)}
          </header>
          <div class="summary-future-meals">
            ${l.columns.map(u=>X(u,e,o)).join("")}
          </div>
        </article>
      `).join("")}
    </div>
  `;const m=a.querySelector("[data-summary-future-track]");let c=0;m?.addEventListener("scroll",()=>{window.clearTimeout(c),c=window.setTimeout(()=>{const l=Math.max(0,Math.min(1,Math.round(m.scrollLeft/Math.max(1,m.clientWidth+14))));m.querySelectorAll("[data-summary-future-screen]").forEach(u=>{u.setAttribute("aria-hidden",String(Number(u.dataset.summaryFutureScreen)!==l))}),i(l)},100)},{passive:!0}),window.requestAnimationFrame(()=>{m&&m.scrollTo({left:Math.max(0,r)*(m.clientWidth+14),behavior:"auto"})})}function X(a,t,e=!0){const r=Array.isArray(a.names)?a.names:[],i=Number(a.specialDiets?.participantCount||0),o=Number(a.guestCount||0),m=Number(a.sickCount||0),c=Array.isArray(a.sickDiets)?a.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${M(a.mealTypeId)}</span>
        <span class="summary-future-meal-name">${s(k(a,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${s(String(a.total||0))}</strong>
      </div>
      ${P(a,e)}
      ${o>0?j("summary.guests",o,"guests"):""}
      ${i?`<p class="summary-future-diets">${s(n("week.operations.diet.count",{count:i}))}</p>`:""}
      ${m>0?j("summary.sickMeals",m,"sick"):""}
      ${c.length>0?`<div class="summary-future-special-row"><span>${s(n("summary.sickDiets"))}</span><div>${v(c," summary-future-diet-list")}</div></div>`:""}
      ${r.length?`<div class="summary-future-people">${r.map(l=>Z(l,t)).join("")}</div>`:""}
    </section>
  `}function j(a,t,e){return e==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${s(String(t))}</strong><span>${s(n(a))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${s(e)}"><span>${s(n(a))}</span><strong>${s(String(t))}</strong></p>`}function Z(a,t){const e=String(a.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(u=>u[0]).join("").toUpperCase(),r=t==="signature"?a.signature||a.displayName:t==="initials"?a.initials||e||a.signature:a.displayName,i=Array.isArray(a.dietTags)?a.dietTags.map(u=>$(u)).filter(Boolean):[],o=`${s(r||"–")}${i.length?`&nbsp;<small>(${s(i.join(", "))})</small>`:""}`,m=C(a.phone),c=a.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${s(m)}" aria-label="${s(n("summary.callPerson",{name:a.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",l=a.whatsappEnabled&&a.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(n("summary.messagePerson",{name:a.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(c||l){const u=`summary-contact-popup-${++A}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${u}" aria-haspopup="dialog" aria-label="${s(n("summary.contactPerson",{name:a.displayName}))}">${o}</button><span class="summary-matrix-contact-popover" id="${u}" popover role="dialog"><span class="summary-matrix-contact-actions">${c}${l}</span></span></span>`}return`<span class="summary-future-person" title="${s(a.displayName||r)}">${o}</span>`}function aa(a){const t=a.columns.find(e=>e.dayIndex===a.index)?.dayMassStatus;return!t||t==="UNKNOWN"?"":B(t)}function B(a){const t=a==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${t?"yes":"no"}"><span>${s(n("summary.mass"))}:</span><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${s(n(t?"summary.yes":"summary.no"))}</strong></span>`}function ta(a,t,{kitchen:e=!1,smooth:r=!0}={}){const i=e?"kitchen":"summary",o=Number(t)===1?1:0;if(!e){const l=a?.querySelector("[data-summary-future-track]");if(l)return l.scrollTo({left:o*(l.clientWidth+14),behavior:r?"smooth":"auto"}),l.querySelectorAll("[data-summary-future-screen]").forEach(u=>{u.setAttribute("aria-hidden",String(Number(u.dataset.summaryFutureScreen)!==o))}),!0}const m=a?.querySelector(`[data-${i}-matrix-track]`),c=m?.querySelector(`[data-${i}-screen="${o}"]`);return!m||!c?!1:(m.scrollTo({left:m.scrollLeft+c.getBoundingClientRect().left-m.getBoundingClientRect().left,behavior:r?"smooth":"auto"}),U(a,i,o),!0)}function sa(a,{kitchen:t,activeIndex:e,residentLabel:r="name",showContactHint:i=!0,dietLegend:o=[]}){const m=t?"kitchen":"summary",c=a.index===e,l=ea(a);return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!c}">
        <p class="empty-state">${s(n("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!c}">
      <table class="summary-matrix summary-matrix-optional-rows-${l}">
        ${ra(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(u=>u.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${s(n("summary.item"))}</span></th>
            ${a.dateGroups.map(u=>`
              <th class="summary-matrix-date-heading${w(u,a)}" scope="colgroup" colspan="${u.span}">
                <span>${s(G(u.dayIndex))}</span>
                <time datetime="${s(u.dateId)}">${s(D(u.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(u=>`
              <th class="summary-matrix-meal-heading${w(u,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${M(u.mealTypeId)}</span><span class="summary-matrix-meal-label">${s(k(u))}</span>${la(u,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?b(n("summary.guests"),"summary-matrix-row-guests",a,u=>String(u.guestCount)):""}
          ${b(n("summary.diningMeals"),"summary-matrix-row-meals",a,L)}
          ${a.hasSpecialDiets?b(n("summary.includedDiets"),"summary-matrix-row-diets",a,t?H:F):""}
          ${a.hasSickMeals?b(n("summary.sickMeals"),"summary-matrix-row-sick",a,q):""}
          ${a.hasSickDiets?b(n("summary.sickDiets"),"summary-matrix-row-sick-diets",a,K):""}
          ${a.hasMassInformation?ua(a):""}
          ${t?"":ma(a,r,i)}
        </tbody>
      </table>
      ${t?z(a,o):""}
      ${t?W(a):""}
    </section>
  `}function ea(a){return[a.hasGuestGroup,a.hasSickMeals,a.hasSickDiets].filter(Boolean).length}function ra(a,t){return t?`<caption class="sr-only">${s(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${s(a.dateId)}">${s(N(a.dateId))}</time>
    </caption>
  `}function M(a){const t={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return na({breakfast:"coffee",lunch:"sun",dinner:"moon"}[a],t[a]||"•")}function na(a,t="•"){const e=document.documentElement.dataset.interfaceStyle;if(!(e==="cool"||e==="urban"||e==="future")||!a)return t;const o={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[a];return o?`<svg class="meal-line-icon meal-line-icon-${a}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${o}</svg>`:t}function k(a,{breakfastTomorrow:t=!1}={}){const e=String(a?.mealTypeId||"").trim().toLowerCase();if(t&&e==="breakfast")return n("summary.breakfastTomorrow");const r=e?n(`meal.type.${e}`):"",i=String(a?.label||"").trim();return r&&r!==`meal.type.${e}`?r:i}function b(a,t,e,r){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${s(a)}</th>
      ${e.columns.map(i=>`<td class="${w(i,e).trim()}">${r(i)}</td>`).join("")}
    </tr>
  `}function L(a,{contactHint:t=!1}={}){const e=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${s(n(e))}</span>${t?P(a):""}`}function E(a){return Array.isArray(a?.names)&&a.names.some(t=>t?.phoneConsent&&C(t.phone))}function P(a,t=!0){return!t||!E(a)?"":`<small class="summary-contact-hint">${s(n("summary.contactHint"))}</small>`}function q(a){if(a.sickCount===0)return g(n("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${s(n(t))}</span>`}function K(a){return a.sickDiets.length===0?g(n("summary.noDiet")):v(a.sickDiets)}function ia(a){if(a.massStatus==="UNKNOWN")return g(n("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${s(n(t?"summary.yes":"summary.no"))}</span>`}function ma(a,t="name",e=!0){return`
    <tr class="summary-matrix-row-names">
      <th class="summary-matrix-label summary-matrix-people-label" scope="row">
        <span class="summary-matrix-people-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <circle cx="9" cy="8" r="3"></circle>
            <circle cx="17" cy="9" r="2.5"></circle>
            <path d="M3.5 19c.4-4 2.3-6 5.5-6s5.1 2 5.5 6"></path>
            <path d="M14.5 14.5c3.4-.7 5.4.8 6 4.5"></path>
          </svg>
        </span>
        ${e&&a.columns.some(E)?`<small class="summary-contact-hint">${s(n("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${s(n("summary.names"))}</span>
      </th>
      ${a.columns.map(i=>`<td class="${w(i,a).trim()}">${R(i,{compactActions:!0,residentLabel:t})}</td>`).join("")}
    </tr>
  `}function oa(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function ua(a){const t=ya(a).map(e=>`<td class="summary-matrix-mass-band${w(e,a)}${oa(e.massStatus)}" colspan="${e.span}">${fa(e)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${s(n("summary.mass"))}</th>
      ${t}
    </tr>
  `}function la(a,t){if(t||a.mealTypeId!=="breakfast")return"";const e=a.breakfastPlanned===!0,r=n(e?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${e?"yes":"no"}"><span aria-hidden="true">${e?"✓":"×"}</span>${s(r)}</span>`}function F(a){if(a.specialDiets.participantCount===0)return g(n("summary.noDiet"));const t=[...a.specialDiets.items].sort((e,r)=>$(e.tag).localeCompare($(r.tag),S(),{numeric:!0}));return v(t)}function H(a){return a.specialDiets.participantCount===0?g(n("summary.noDiet")):v(a.specialDiets.items," summary-matrix-kitchen-diets")}function v(a,t=""){const e=[...a].sort((r,i)=>$(r.tag).localeCompare($(i.tag),S(),{numeric:!0}));return`<ul class="summary-matrix-diets${t}">${e.map(r=>{const i=$(r.tag),o=Math.max(0,Math.floor(Number(r.count)||0)),m=o>1?`<span class="diet-code-count">× ${o}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${I(r.tag)}">${s(i)}</span>${m}</li>`}).join("")}</ul>`}function $(a){return Y(T(a),n)}function R(a,{compactActions:t=!1,residentLabel:e="name"}={}){return a.names.length===0?g(n("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(r=>{const i=r.dietTags.map(p=>$(p)),o=C(r.phone),m=String(r.displayName||"").trim(),c=m.split(/\s+/).filter(Boolean).slice(0,3).map(p=>p[0]).join("").toUpperCase(),l=e==="signature"?r.signature||m:e==="initials"&&(r.initials||c||r.signature)||m,u=s(l),y=i.length?` <small>(${s(i.join(", "))})</small>`:"",d=`<span class="summary-matrix-person-name">${u}${y}</span>`,x=r.phoneConsent&&o?`<a class="summary-matrix-call" href="tel:${s(o)}" aria-label="${s(n("summary.callPerson",{name:r.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",f=r.whatsappEnabled&&r.phoneConsent&&o?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(o.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(n("summary.messagePerson",{name:r.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(t&&(x||f)){const p=`summary-contact-popup-${++A}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${p}" aria-haspopup="dialog" aria-label="${s(n("summary.contactPerson",{name:r.displayName}))}" title="${s(n("summary.contactPerson",{name:r.displayName}))}">${d}</button>
            <span class="summary-matrix-contact-popover" id="${p}" popover role="dialog" aria-label="${s(n("summary.contactPerson",{name:r.displayName}))}">
              <span class="summary-matrix-contact-actions">${x}${f}</span>
            </span>
          </li>`}return`<li>${d}<span class="summary-matrix-contact-actions">${x}${f}</span></li>`}).join("")}</ul>`}function C(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function ca(a,{kitchen:t,activeIndex:e,residentLabel:r="name",showContactHint:i=!0,dietLegend:o=[]}){const m=t?"kitchen":"summary",c=a.index===e;return`
    <section class="summary-matrix-screen summary-international-screen${da(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!c}">
      ${t?`<h2 class="sr-only">${s(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${s(a.dateId)}">${s(N(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map((u,y,d)=>pa(u,{kitchen:t,residentLabel:r,showContactHint:i,showMassMetadata:y===0||d[y-1]?.dateId!==u.dateId})).join("")}
      </div>
      ${t?z(a,o):""}
      ${t?W(a):""}
    </section>
  `}function da(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function pa(a,{kitchen:t,residentLabel:e="name",showContactHint:r=!0,showMassMetadata:i=!1}){const o=t?H(a):F(a);return`
    <article class="summary-international-card summary-day-tone-${O(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${M(a.mealTypeId)}</span>
        <div><strong>${s(k(a,{breakfastTomorrow:!0}))}</strong><time datetime="${s(a.dateId)}">${s(D(a.dateId))}</time></div>
        ${i&&a.dayMassStatus!=="UNKNOWN"?B(a.dayMassStatus):""}
        ${a.guestCount>0?`<span class="summary-international-mobile-guests">${s(n("summary.guests"))}: <strong>${a.guestCount}</strong></span>`:""}
      </header>
      <dl>
        ${a.guestCount>0?`<div class="summary-international-guest-row"><dt>${s(n("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${s(n("summary.diningMeals"))}</dt><dd>${L(a,{contactHint:!t&&r})}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${s(n("summary.includedDiets"))}</dt><dd>${o}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${s(n("summary.sickMeals"))}</dt><dd>${q(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${s(n("summary.sickDiets"))}</dt><dd>${K(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${s(n("summary.names"))}</h3>${R(a,{compactActions:!0,residentLabel:e})}</section>`}
    </article>
  `}function ya(a){return a.dateGroups.map(t=>{const e=a.columns.find(r=>r.dateId===t.dateId);return{...t,massStatus:e?.dayMassStatus||"UNKNOWN"}})}function W(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${s(n("kitchen.notes.title"))}">
      <h3>${s(n("kitchen.notes.title"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${s(t.dateId)}">${s(D(t.dateId))}</time>
          <ul>${t.notes.map(e=>`<li><p>${s(e.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function z(a,t){const e=new Set;a.columns.forEach(i=>{[...i.specialDiets?.items||[],...i.sickDiets||[]].forEach(o=>{const m=T(o?.tag);/^\d{1,3}$/.test(m)&&e.add(m)})});const r=_(t).filter(i=>e.has(i.code));return r.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${s(n("kitchen.dietLegend.title"))}">
      <h3>${s(n("kitchen.dietLegend.title"))}</h3>
      <ul>${r.map(i=>`<li><strong class="diet-code-badge diet-code-tone-${I(i.code)}">${s($(i.code))}</strong><span aria-hidden="true">=</span><span>${s(i.label)}</span></li>`).join("")}</ul>
    </section>
  `}function g(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${s(a)}</span>`}function $a(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function fa(a){return`
    <span class="summary-mass-control">
      <span class="summary-mass-control-day">${s(G(a.dayIndex))}</span>
      <span class="summary-mass-control-state">${ia(a)}</span>
    </span>`}function w(a,t){return`${$a(a,t)} summary-day-tone-${O(a.dayIndex)}`}function O(a){return Math.max(0,Math.min(2,Number(a)||0))}function G(a){return[n("summary.today"),n("summary.tomorrow"),n("summary.dayAfterTomorrow")][a]||n("summary.followingDay")}function D(a){const[t,e,r]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(S(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,e-1,r))}function N(a){const[t,e,r]=String(a).split("-").map(Number);return!t||!e||!r?"":new Intl.DateTimeFormat(S(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,e-1,r))}function ha(a,t){const e=[...a.querySelectorAll(`[data-${t}-screen]`)];if(e.length===0)return 0;const r=e.reduce((i,o)=>Math.abs(o.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(i.getBoundingClientRect().left-a.getBoundingClientRect().left)?o:i);return Number(r.dataset[`${t}Screen`])===1?1:0}function U(a,t,e){a.querySelectorAll(`[data-${t}-screen]`).forEach(r=>{r.setAttribute("aria-hidden",String(Number(r.dataset[`${t}Screen`])!==e))})}export{va as mountSummaryMatrix,ta as scrollSummaryMatrix};

import{t as n,getLocale as w}from"./i18n/i18n.mjs?v=20260823a";import{escapeHtml as s}from"./html-utils.js?v=20260816g";import{formatDietLabel as z,normalizeDietCode as O}from"./diet-utils.mjs?v=20260823a";import{buildKitchenMatrixScreens as U,buildSummaryMatrixScreens as G}from"./summary-matrix-model.js?v=20260820i";let N=0;function ha(a,{days:t=[],operationDays:e=[],kitchen:r=!1,layout:i="classic",residentLabel:m="name",showContactHint:o=!0,activeIndex:u=0,onActiveIndexChange:l=()=>{}}={}){const c=r?U(t,e):G(t,[],e);if(i==="future"&&!r){Y(a,c,m,u,l,o);return}if(c.every(d=>d.columns.length===0)){a.innerHTML=`<p class="empty-state">${s(n("summary.noMeal"))}</p>`;return}const y=r?"kitchen":"summary",b=i==="international"?ia:X;a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${i}${r?" summary-layout-kitchen":" summary-layout-diners"}" data-${y}-matrix-track aria-label="${s(n("summary.screensLabel"))}">
      ${c.map(d=>b(d,{kitchen:r,activeIndex:u,residentLabel:m,showContactHint:o})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${s(n("summary.swipeHint"))}</p>
  `;const $=a.querySelector(`[data-${y}-matrix-track]`);let f=0;$.addEventListener("scroll",()=>{window.clearTimeout(f),f=window.setTimeout(()=>{const d=da($,y);W(a,y,d),l(d)},100)},{passive:!0}),window.requestAnimationFrame(()=>{V(a,u,{kitchen:r,smooth:!1})})}function Y(a,t,e,r=0,i=()=>{},m=!0){a.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${t.map(l=>`
        <article class="summary-future-card" data-summary-future-screen="${l.index}" aria-hidden="${l.index!==r}">
          <header class="summary-future-card-head">
            <div><strong>${s(n(l.labelKey))}</strong><time datetime="${s(l.dateId)}">${s(D(l.dateId))}</time></div>
            ${Q(l)}
          </header>
          <div class="summary-future-meals">
            ${l.columns.map(c=>_(c,e,m)).join("")}
          </div>
        </article>
      `).join("")}
    </div>
  `;const o=a.querySelector("[data-summary-future-track]");let u=0;o?.addEventListener("scroll",()=>{window.clearTimeout(u),u=window.setTimeout(()=>{const l=Math.max(0,Math.min(1,Math.round(o.scrollLeft/Math.max(1,o.clientWidth+14))));o.querySelectorAll("[data-summary-future-screen]").forEach(c=>{c.setAttribute("aria-hidden",String(Number(c.dataset.summaryFutureScreen)!==l))}),i(l)},100)},{passive:!0}),window.requestAnimationFrame(()=>{o&&o.scrollTo({left:Math.max(0,r)*(o.clientWidth+14),behavior:"auto"})})}function _(a,t,e=!0){const r=Array.isArray(a.names)?a.names:[],i=Number(a.specialDiets?.participantCount||0),m=Number(a.guestCount||0),o=Number(a.sickCount||0),u=Array.isArray(a.sickDiets)?a.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${S(a.mealTypeId)}</span>
        <span class="summary-future-meal-name">${s(M(a,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${s(String(a.total||0))}</strong>
      </div>
      ${B(a,e)}
      ${m>0?I("summary.guests",m,"guests"):""}
      ${i?`<p class="summary-future-diets">${s(n("week.operations.diet.count",{count:i}))}</p>`:""}
      ${o>0?I("summary.sickMeals",o,"sick"):""}
      ${u.length>0?`<div class="summary-future-special-row"><span>${s(n("summary.sickDiets"))}</span><div>${v(u," summary-future-diet-list")}</div></div>`:""}
      ${r.length?`<div class="summary-future-people">${r.map(l=>J(l,t)).join("")}</div>`:""}
    </section>
  `}function I(a,t,e){return e==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${s(String(t))}</strong><span>${s(n(a))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${s(e)}"><span>${s(n(a))}</span><strong>${s(String(t))}</strong></p>`}function J(a,t){const e=String(a.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(c=>c[0]).join("").toUpperCase(),r=t==="signature"?a.signature||a.displayName:t==="initials"?a.initials||e||a.signature:a.displayName,i=Array.isArray(a.dietTags)?a.dietTags.map(c=>p(c)).filter(Boolean):[],m=`${s(r||"–")}${i.length?`&nbsp;<small>(${s(i.join(", "))})</small>`:""}`,o=C(a.phone),u=a.phoneConsent&&o?`<a class="summary-matrix-call" href="tel:${s(o)}" aria-label="${s(n("summary.callPerson",{name:a.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",l=a.whatsappEnabled&&a.phoneConsent&&o?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(o.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(n("summary.messagePerson",{name:a.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(u||l){const c=`summary-contact-popup-${++N}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${c}" aria-haspopup="dialog" aria-label="${s(n("summary.contactPerson",{name:a.displayName}))}">${m}</button><span class="summary-matrix-contact-popover" id="${c}" popover role="dialog"><span class="summary-matrix-contact-actions">${u}${l}</span></span></span>`}return`<span class="summary-future-person" title="${s(a.displayName||r)}">${m}</span>`}function Q(a){const t=a.columns.find(e=>e.dayIndex===a.index)?.dayMassStatus;return!t||t==="UNKNOWN"?"":T(t)}function T(a){const t=a==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${t?"yes":"no"}"><span>${s(n("summary.mass"))}:</span><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${s(n(t?"summary.yes":"summary.no"))}</strong></span>`}function V(a,t,{kitchen:e=!1,smooth:r=!0}={}){const i=e?"kitchen":"summary",m=Number(t)===1?1:0;if(!e){const l=a?.querySelector("[data-summary-future-track]");if(l)return l.scrollTo({left:m*(l.clientWidth+14),behavior:r?"smooth":"auto"}),l.querySelectorAll("[data-summary-future-screen]").forEach(c=>{c.setAttribute("aria-hidden",String(Number(c.dataset.summaryFutureScreen)!==m))}),!0}const o=a?.querySelector(`[data-${i}-matrix-track]`),u=o?.querySelector(`[data-${i}-screen="${m}"]`);return!o||!u?!1:(o.scrollTo({left:o.scrollLeft+u.getBoundingClientRect().left-o.getBoundingClientRect().left,behavior:r?"smooth":"auto"}),W(a,i,m),!0)}function X(a,{kitchen:t,activeIndex:e,residentLabel:r="name",showContactHint:i=!0}){const m=t?"kitchen":"summary",o=a.index===e;return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!o}">
        <p class="empty-state">${s(n("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!o}">
      <table class="summary-matrix">
        ${Z(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(u=>u.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${s(n("summary.item"))}</span></th>
            ${a.dateGroups.map(u=>`
              <th class="summary-matrix-date-heading${x(u,a)}" scope="colgroup" colspan="${u.span}">
                <span>${s(R(u.dayIndex))}</span>
                <time datetime="${s(u.dateId)}">${s(k(u.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(u=>`
              <th class="summary-matrix-meal-heading${x(u,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${S(u.mealTypeId)}</span><span class="summary-matrix-meal-label">${s(M(u))}</span>${na(u,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?g(n("summary.guests"),"summary-matrix-row-guests",a,u=>String(u.guestCount)):""}
          ${g(n("summary.diningMeals"),"summary-matrix-row-meals",a,A)}
          ${a.hasSpecialDiets?g(n("summary.includedDiets"),"summary-matrix-row-diets",a,t?E:q):""}
          ${a.hasSickMeals?g(n("summary.sickMeals"),"summary-matrix-row-sick",a,P):""}
          ${a.hasSickDiets?g(n("summary.sickDiets"),"summary-matrix-row-sick-diets",a,L):""}
          ${a.hasMassInformation?ra(a):""}
          ${t?"":sa(a,r,i)}
        </tbody>
      </table>
      ${t?H(a):""}
    </section>
  `}function Z(a,t){return t?`<caption class="sr-only">${s(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${s(a.dateId)}">${s(D(a.dateId))}</time>
    </caption>
  `}function S(a){const t={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return aa({breakfast:"coffee",lunch:"sun",dinner:"moon"}[a],t[a]||"•")}function aa(a,t="•"){const e=document.documentElement.dataset.interfaceStyle;if(!(e==="cool"||e==="urban"||e==="future")||!a)return t;const m={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[a];return m?`<svg class="meal-line-icon meal-line-icon-${a}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${m}</svg>`:t}function M(a,{breakfastTomorrow:t=!1}={}){const e=String(a?.mealTypeId||"").trim().toLowerCase();if(t&&e==="breakfast")return n("summary.breakfastTomorrow");const r=e?n(`meal.type.${e}`):"",i=String(a?.label||"").trim();return r&&r!==`meal.type.${e}`?r:i}function g(a,t,e,r){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${s(a)}</th>
      ${e.columns.map(i=>`<td class="${x(i,e).trim()}">${r(i)}</td>`).join("")}
    </tr>
  `}function A(a,{contactHint:t=!1}={}){const e=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${s(n(e))}</span>${t?B(a):""}`}function j(a){return Array.isArray(a?.names)&&a.names.some(t=>t?.phoneConsent&&C(t.phone))}function B(a,t=!0){return!t||!j(a)?"":`<small class="summary-contact-hint">${s(n("summary.contactHint"))}</small>`}function P(a){if(a.sickCount===0)return h(n("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${s(n(t))}</span>`}function L(a){return a.sickDiets.length===0?h(n("summary.noDiet")):v(a.sickDiets)}function ta(a){if(a.massStatus==="UNKNOWN")return h(n("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${s(n(t?"summary.yes":"summary.no"))}</span>`}function sa(a,t="name",e=!0){return`
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
        ${e&&a.columns.some(j)?`<small class="summary-contact-hint">${s(n("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${s(n("summary.names"))}</span>
      </th>
      ${a.columns.map(i=>`<td class="${x(i,a).trim()}">${F(i,{compactActions:!0,residentLabel:t})}</td>`).join("")}
    </tr>
  `}function ea(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function ra(a){const t=ua(a).map(e=>`<td class="summary-matrix-mass-band${x(e,a)}${ea(e.massStatus)}" colspan="${e.span}">${ca(e)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${s(n("summary.mass"))}</th>
      ${t}
    </tr>
  `}function na(a,t){if(t||a.mealTypeId!=="breakfast")return"";const e=a.breakfastPlanned===!0,r=n(e?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${e?"yes":"no"}"><span aria-hidden="true">${e?"✓":"×"}</span>${s(r)}</span>`}function q(a){if(a.specialDiets.participantCount===0)return h(n("summary.noDiet"));const t=[...a.specialDiets.items].sort((e,r)=>p(e.tag).localeCompare(p(r.tag),w(),{numeric:!0}));return v(t)}function E(a){return a.specialDiets.participantCount===0?h(n("summary.noDiet")):v(a.specialDiets.items," summary-matrix-kitchen-diets")}function v(a,t=""){const e=[...a].sort((r,i)=>p(r.tag).localeCompare(p(i.tag),w(),{numeric:!0}));return`<ul class="summary-matrix-diets${t}">${e.map(r=>{const i=p(r.tag),m=Math.max(0,Math.floor(Number(r.count)||0)),o=m>1?`${i} (${m})`:i;return`<li>${s(o)}</li>`}).join("")}</ul>`}function p(a){const t=O(a);return/^\d+$/.test(t)?t:z(t,n)}function F(a,{compactActions:t=!1,residentLabel:e="name"}={}){return a.names.length===0?h(n("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(r=>{const i=r.dietTags.map(d=>p(d)),m=C(r.phone),o=String(r.displayName||"").trim(),u=o.split(/\s+/).filter(Boolean).slice(0,3).map(d=>d[0]).join("").toUpperCase(),l=e==="signature"?r.signature||o:e==="initials"&&(r.initials||u||r.signature)||o,c=s(l),y=i.length?` <small>(${s(i.join(", "))})</small>`:"",b=`<span class="summary-matrix-person-name">${c}${y}</span>`,$=r.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${s(m)}" aria-label="${s(n("summary.callPerson",{name:r.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",f=r.whatsappEnabled&&r.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(n("summary.messagePerson",{name:r.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(t&&($||f)){const d=`summary-contact-popup-${++N}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${d}" aria-haspopup="dialog" aria-label="${s(n("summary.contactPerson",{name:r.displayName}))}" title="${s(n("summary.contactPerson",{name:r.displayName}))}">${b}</button>
            <span class="summary-matrix-contact-popover" id="${d}" popover role="dialog" aria-label="${s(n("summary.contactPerson",{name:r.displayName}))}">
              <span class="summary-matrix-contact-actions">${$}${f}</span>
            </span>
          </li>`}return`<li>${b}<span class="summary-matrix-contact-actions">${$}${f}</span></li>`}).join("")}</ul>`}function C(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function ia(a,{kitchen:t,activeIndex:e,residentLabel:r="name",showContactHint:i=!0}){const m=t?"kitchen":"summary",o=a.index===e;return`
    <section class="summary-matrix-screen summary-international-screen${ma(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!o}">
      ${t?`<h2 class="sr-only">${s(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${s(a.dateId)}">${s(D(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map((l,c,y)=>oa(l,{kitchen:t,residentLabel:r,showContactHint:i,showMassMetadata:c===0||y[c-1]?.dateId!==l.dateId})).join("")}
      </div>
      ${t?H(a):""}
    </section>
  `}function ma(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function oa(a,{kitchen:t,residentLabel:e="name",showContactHint:r=!0,showMassMetadata:i=!1}){const m=t?E(a):q(a);return`
    <article class="summary-international-card summary-day-tone-${K(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${S(a.mealTypeId)}</span>
        <div><strong>${s(M(a,{breakfastTomorrow:!0}))}</strong><time datetime="${s(a.dateId)}">${s(k(a.dateId))}</time></div>
        ${i&&a.dayMassStatus!=="UNKNOWN"?T(a.dayMassStatus):""}
        ${a.guestCount>0?`<span class="summary-international-mobile-guests">${s(n("summary.guests"))}: <strong>${a.guestCount}</strong></span>`:""}
      </header>
      <dl>
        ${a.guestCount>0?`<div class="summary-international-guest-row"><dt>${s(n("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${s(n("summary.diningMeals"))}</dt><dd>${A(a,{contactHint:!t&&r})}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${s(n("summary.includedDiets"))}</dt><dd>${m}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${s(n("summary.sickMeals"))}</dt><dd>${P(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${s(n("summary.sickDiets"))}</dt><dd>${L(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${s(n("summary.names"))}</h3>${F(a,{compactActions:!0,residentLabel:e})}</section>`}
    </article>
  `}function ua(a){return a.dateGroups.map(t=>{const e=a.columns.find(r=>r.dateId===t.dateId);return{...t,massStatus:e?.dayMassStatus||"UNKNOWN"}})}function H(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${s(n("kitchen.notes.title"))}">
      <h3>${s(n("kitchen.notes.title"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${s(t.dateId)}">${s(k(t.dateId))}</time>
          <ul>${t.notes.map(e=>`<li><p>${s(e.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function h(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${s(a)}</span>`}function la(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function ca(a){return`
    <span class="summary-mass-control">
      <span class="summary-mass-control-day">${s(R(a.dayIndex))}</span>
      <span class="summary-mass-control-state">${ta(a)}</span>
    </span>`}function x(a,t){return`${la(a,t)} summary-day-tone-${K(a.dayIndex)}`}function K(a){return Math.max(0,Math.min(2,Number(a)||0))}function R(a){return[n("summary.today"),n("summary.tomorrow"),n("summary.dayAfterTomorrow")][a]||n("summary.followingDay")}function k(a){const[t,e,r]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(w(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,e-1,r))}function D(a){const[t,e,r]=String(a).split("-").map(Number);return!t||!e||!r?"":new Intl.DateTimeFormat(w(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,e-1,r))}function da(a,t){const e=[...a.querySelectorAll(`[data-${t}-screen]`)];if(e.length===0)return 0;const r=e.reduce((i,m)=>Math.abs(m.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(i.getBoundingClientRect().left-a.getBoundingClientRect().left)?m:i);return Number(r.dataset[`${t}Screen`])===1?1:0}function W(a,t,e){a.querySelectorAll(`[data-${t}-screen]`).forEach(r=>{r.setAttribute("aria-hidden",String(Number(r.dataset[`${t}Screen`])!==e))})}export{ha as mountSummaryMatrix,V as scrollSummaryMatrix};

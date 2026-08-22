import{t as n,getLocale as b}from"./i18n/i18n.mjs?v=20260823a";import{escapeHtml as s}from"./html-utils.js?v=20260816g";import{formatDietLabel as W,normalizeDietCode as z}from"./diet-utils.mjs?v=20260823a";import{buildKitchenMatrixScreens as O,buildSummaryMatrixScreens as U}from"./summary-matrix-model.js?v=20260820i";let I=0;function ha(a,{days:t=[],operationDays:e=[],kitchen:r=!1,layout:o="classic",residentLabel:m="name",activeIndex:i=0,onActiveIndexChange:u=()=>{}}={}){const l=r?O(t,e):U(t,[],e);if(o==="future"&&!r){G(a,l,m,i,u);return}if(l.every(d=>d.columns.length===0)){a.innerHTML=`<p class="empty-state">${s(n("summary.noMeal"))}</p>`;return}const c=r?"kitchen":"summary",v=o==="international"?ia:V;a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${o}${r?" summary-layout-kitchen":" summary-layout-diners"}" data-${c}-matrix-track aria-label="${s(n("summary.screensLabel"))}">
      ${l.map(d=>v(d,{kitchen:r,activeIndex:i,residentLabel:m})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${s(n("summary.swipeHint"))}</p>
  `;const h=a.querySelector(`[data-${c}-matrix-track]`);let p=0;h.addEventListener("scroll",()=>{window.clearTimeout(p),p=window.setTimeout(()=>{const d=da(h,c);R(a,c,d),u(d)},100)},{passive:!0}),window.requestAnimationFrame(()=>{Q(a,i,{kitchen:r,smooth:!1})})}function G(a,t,e,r=0,o=()=>{}){a.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${t.map(u=>`
        <article class="summary-future-card" data-summary-future-screen="${u.index}" aria-hidden="${u.index!==r}">
          <header class="summary-future-card-head">
            <div><strong>${s(n(u.labelKey))}</strong><time datetime="${s(u.dateId)}">${s(N(u.dateId))}</time></div>
            ${J(u)}
          </header>
          <div class="summary-future-meals">
            ${u.columns.map(l=>Y(l,e)).join("")}
          </div>
        </article>
      `).join("")}
    </div>
  `;const m=a.querySelector("[data-summary-future-track]");let i=0;m?.addEventListener("scroll",()=>{window.clearTimeout(i),i=window.setTimeout(()=>{const u=Math.max(0,Math.min(1,Math.round(m.scrollLeft/Math.max(1,m.clientWidth+14))));m.querySelectorAll("[data-summary-future-screen]").forEach(l=>{l.setAttribute("aria-hidden",String(Number(l.dataset.summaryFutureScreen)!==u))}),o(u)},100)},{passive:!0}),window.requestAnimationFrame(()=>{m&&m.scrollTo({left:Math.max(0,r)*(m.clientWidth+14),behavior:"auto"})})}function Y(a,t){const e=Array.isArray(a.names)?a.names:[],r=Number(a.specialDiets?.participantCount||0),o=Number(a.guestCount||0),m=Number(a.sickCount||0),i=Array.isArray(a.sickDiets)?a.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${S(a.mealTypeId)}</span>
        <span class="summary-future-meal-name">${s(M(a,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${s(String(a.total||0))}</strong>
      </div>
      ${j(a)}
      ${o>0?T("summary.guests",o,"guests"):""}
      ${r?`<p class="summary-future-diets">${s(n("week.operations.diet.count",{count:r}))}</p>`:""}
      ${m>0?T("summary.sickMeals",m,"sick"):""}
      ${i.length>0?`<div class="summary-future-special-row"><span>${s(n("summary.sickDiets"))}</span><div>${w(i," summary-future-diet-list")}</div></div>`:""}
      ${e.length?`<div class="summary-future-people">${e.map(u=>_(u,t)).join("")}</div>`:""}
    </section>
  `}function T(a,t,e){return e==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${s(String(t))}</strong><span>${s(n(a))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${s(e)}"><span>${s(n(a))}</span><strong>${s(String(t))}</strong></p>`}function _(a,t){const e=String(a.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(c=>c[0]).join("").toUpperCase(),r=t==="signature"?a.signature||a.displayName:t==="initials"?a.initials||e||a.signature:a.displayName,o=Array.isArray(a.dietTags)?a.dietTags.map(c=>y(c)).filter(Boolean):[],m=`${s(r||"–")}${o.length?`&nbsp;<small>(${s(o.join(", "))})</small>`:""}`,i=k(a.phone),u=a.phoneConsent&&i?`<a class="summary-matrix-call" href="tel:${s(i)}" aria-label="${s(n("summary.callPerson",{name:a.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",l=a.whatsappEnabled&&a.phoneConsent&&i?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(i.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(n("summary.messagePerson",{name:a.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(u||l){const c=`summary-contact-popup-${++I}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${c}" aria-haspopup="dialog" aria-label="${s(n("summary.contactPerson",{name:a.displayName}))}">${m}</button><span class="summary-matrix-contact-popover" id="${c}" popover role="dialog"><span class="summary-matrix-contact-actions">${u}${l}</span></span></span>`}return`<span class="summary-future-person" title="${s(a.displayName||r)}">${m}</span>`}function J(a){const t=a.columns.find(e=>e.dayIndex===a.index)?.dayMassStatus;return!t||t==="UNKNOWN"?"":A(t)}function A(a){const t=a==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${t?"yes":"no"}"><span>${s(n("summary.mass"))}:</span><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${s(n(t?"summary.yes":"summary.no"))}</strong></span>`}function Q(a,t,{kitchen:e=!1,smooth:r=!0}={}){const o=e?"kitchen":"summary",m=Number(t)===1?1:0;if(!e){const l=a?.querySelector("[data-summary-future-track]");if(l)return l.scrollTo({left:m*(l.clientWidth+14),behavior:r?"smooth":"auto"}),l.querySelectorAll("[data-summary-future-screen]").forEach(c=>{c.setAttribute("aria-hidden",String(Number(c.dataset.summaryFutureScreen)!==m))}),!0}const i=a?.querySelector(`[data-${o}-matrix-track]`),u=i?.querySelector(`[data-${o}-screen="${m}"]`);return!i||!u?!1:(i.scrollTo({left:i.scrollLeft+u.getBoundingClientRect().left-i.getBoundingClientRect().left,behavior:r?"smooth":"auto"}),R(a,o,m),!0)}function V(a,{kitchen:t,activeIndex:e,residentLabel:r="name"}){const o=t?"kitchen":"summary",m=a.index===e;return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${o}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
        <p class="empty-state">${s(n("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${o}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
      <table class="summary-matrix">
        ${X(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(i=>i.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${s(n("summary.item"))}</span></th>
            ${a.dateGroups.map(i=>`
              <th class="summary-matrix-date-heading${x(i,a)}" scope="colgroup" colspan="${i.span}">
                <span>${s(K(i.dayIndex))}</span>
                <time datetime="${s(i.dateId)}">${s(D(i.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(i=>`
              <th class="summary-matrix-meal-heading${x(i,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${S(i.mealTypeId)}</span><span class="summary-matrix-meal-label">${s(M(i))}</span>${na(i,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?g(n("summary.guests"),"summary-matrix-row-guests",a,i=>String(i.guestCount)):""}
          ${g(n("summary.diningMeals"),"summary-matrix-row-meals",a,t?C:i=>C(i,{contactHint:!0}))}
          ${a.hasSpecialDiets?g(n("summary.includedDiets"),"summary-matrix-row-diets",a,t?q:L):""}
          ${a.hasSickMeals?g(n("summary.sickMeals"),"summary-matrix-row-sick",a,B):""}
          ${a.hasSickDiets?g(n("summary.sickDiets"),"summary-matrix-row-sick-diets",a,P):""}
          ${a.hasMassInformation?ra(a):""}
          ${t?"":sa(a,r)}
        </tbody>
      </table>
      ${t?F(a):""}
    </section>
  `}function X(a,t){return t?`<caption class="sr-only">${s(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${s(a.dateId)}">${s(N(a.dateId))}</time>
    </caption>
  `}function S(a){const t={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return Z({breakfast:"coffee",lunch:"sun",dinner:"moon"}[a],t[a]||"•")}function Z(a,t="•"){const e=document.documentElement.dataset.interfaceStyle;if(!(e==="cool"||e==="urban"||e==="future")||!a)return t;const m={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[a];return m?`<svg class="meal-line-icon meal-line-icon-${a}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${m}</svg>`:t}function M(a,{breakfastTomorrow:t=!1}={}){const e=String(a?.mealTypeId||"").trim().toLowerCase();if(t&&e==="breakfast")return n("summary.breakfastTomorrow");const r=e?n(`meal.type.${e}`):"",o=String(a?.label||"").trim();return r&&r!==`meal.type.${e}`?r:o}function g(a,t,e,r){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${s(a)}</th>
      ${e.columns.map(o=>`<td class="${x(o,e).trim()}">${r(o)}</td>`).join("")}
    </tr>
  `}function C(a,{contactHint:t=!1}={}){const e=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${s(n(e))}</span>${t?j(a):""}`}function aa(a){return Array.isArray(a?.names)&&a.names.some(t=>t?.phoneConsent&&k(t.phone))}function j(a){return aa(a)?`<small class="summary-contact-hint">${s(n("summary.contactHint"))}</small>`:""}function B(a){if(a.sickCount===0)return f(n("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${s(n(t))}</span>`}function P(a){return a.sickDiets.length===0?f(n("summary.noDiet")):w(a.sickDiets)}function ta(a){if(a.massStatus==="UNKNOWN")return f(n("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${s(n(t?"summary.yes":"summary.no"))}</span>`}function sa(a,t="name"){return`
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
        <span class="sr-only">${s(n("summary.names"))}</span>
      </th>
      ${a.columns.map(e=>`<td class="${x(e,a).trim()}">${E(e,{compactActions:!0,residentLabel:t})}</td>`).join("")}
    </tr>
  `}function ea(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function ra(a){const t=ua(a).map(e=>`<td class="summary-matrix-mass-band${x(e,a)}${ea(e.massStatus)}" colspan="${e.span}">${ca(e)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${s(n("summary.mass"))}</th>
      ${t}
    </tr>
  `}function na(a,t){if(t||a.mealTypeId!=="breakfast")return"";const e=a.breakfastPlanned===!0,r=n(e?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${e?"yes":"no"}"><span aria-hidden="true">${e?"✓":"×"}</span>${s(r)}</span>`}function L(a){if(a.specialDiets.participantCount===0)return f(n("summary.noDiet"));const t=[...a.specialDiets.items].sort((e,r)=>y(e.tag).localeCompare(y(r.tag),b(),{numeric:!0}));return w(t)}function q(a){return a.specialDiets.participantCount===0?f(n("summary.noDiet")):w(a.specialDiets.items," summary-matrix-kitchen-diets")}function w(a,t=""){const e=[...a].sort((r,o)=>y(r.tag).localeCompare(y(o.tag),b(),{numeric:!0}));return`<ul class="summary-matrix-diets${t}">${e.map(r=>{const o=y(r.tag),m=Math.max(0,Math.floor(Number(r.count)||0)),i=m>1?`${o} (${m})`:o;return`<li>${s(i)}</li>`}).join("")}</ul>`}function y(a){const t=z(a);return/^\d+$/.test(t)?t:W(t,n)}function E(a,{compactActions:t=!1,residentLabel:e="name"}={}){return a.names.length===0?f(n("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(r=>{const o=r.dietTags.map($=>y($)),m=k(r.phone),i=String(r.displayName||"").trim(),u=i.split(/\s+/).filter(Boolean).slice(0,3).map($=>$[0]).join("").toUpperCase(),l=e==="signature"?r.signature||i:e==="initials"&&(r.initials||u||r.signature)||i,c=s(l),v=o.length?` <small>(${s(o.join(", "))})</small>`:"",h=`<span class="summary-matrix-person-name">${c}${v}</span>`,p=r.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${s(m)}" aria-label="${s(n("summary.callPerson",{name:r.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",d=r.whatsappEnabled&&r.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(n("summary.messagePerson",{name:r.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(t&&(p||d)){const $=`summary-contact-popup-${++I}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${$}" aria-haspopup="dialog" aria-label="${s(n("summary.contactPerson",{name:r.displayName}))}" title="${s(n("summary.contactPerson",{name:r.displayName}))}">${h}</button>
            <span class="summary-matrix-contact-popover" id="${$}" popover role="dialog" aria-label="${s(n("summary.contactPerson",{name:r.displayName}))}">
              <span class="summary-matrix-contact-actions">${p}${d}</span>
            </span>
          </li>`}return`<li>${h}<span class="summary-matrix-contact-actions">${p}${d}</span></li>`}).join("")}</ul>`}function k(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function ia(a,{kitchen:t,activeIndex:e,residentLabel:r="name"}){const o=t?"kitchen":"summary",m=a.index===e;return`
    <section class="summary-matrix-screen summary-international-screen${ma(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${o}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
      ${t?`<h2 class="sr-only">${s(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${s(a.dateId)}">${s(N(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map((u,l,c)=>oa(u,{kitchen:t,residentLabel:r,showMassMetadata:l===0||c[l-1]?.dateId!==u.dateId})).join("")}
      </div>
      ${t?F(a):""}
    </section>
  `}function ma(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function oa(a,{kitchen:t,residentLabel:e="name",showMassMetadata:r=!1}){const o=t?q(a):L(a);return`
    <article class="summary-international-card summary-day-tone-${H(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${S(a.mealTypeId)}</span>
        <div><strong>${s(M(a,{breakfastTomorrow:!0}))}</strong><time datetime="${s(a.dateId)}">${s(D(a.dateId))}</time></div>
        ${r&&a.dayMassStatus!=="UNKNOWN"?A(a.dayMassStatus):""}
        ${a.guestCount>0?`<span class="summary-international-mobile-guests">${s(n("summary.guests"))}: <strong>${a.guestCount}</strong></span>`:""}
      </header>
      <dl>
        ${a.guestCount>0?`<div class="summary-international-guest-row"><dt>${s(n("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${s(n("summary.diningMeals"))}</dt><dd>${C(a,{contactHint:!t})}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${s(n("summary.includedDiets"))}</dt><dd>${o}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${s(n("summary.sickMeals"))}</dt><dd>${B(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${s(n("summary.sickDiets"))}</dt><dd>${P(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${s(n("summary.names"))}</h3>${E(a,{compactActions:!0,residentLabel:e})}</section>`}
    </article>
  `}function ua(a){return a.dateGroups.map(t=>{const e=a.columns.find(r=>r.dateId===t.dateId);return{...t,massStatus:e?.dayMassStatus||"UNKNOWN"}})}function F(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${s(n("kitchen.notes.title"))}">
      <h3>${s(n("kitchen.notes.title"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${s(t.dateId)}">${s(D(t.dateId))}</time>
          <ul>${t.notes.map(e=>`<li><p>${s(e.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function f(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${s(a)}</span>`}function la(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function ca(a){return`
    <span class="summary-mass-control">
      <span class="summary-mass-control-day">${s(K(a.dayIndex))}</span>
      <span class="summary-mass-control-state">${ta(a)}</span>
    </span>`}function x(a,t){return`${la(a,t)} summary-day-tone-${H(a.dayIndex)}`}function H(a){return Math.max(0,Math.min(2,Number(a)||0))}function K(a){return[n("summary.today"),n("summary.tomorrow"),n("summary.dayAfterTomorrow")][a]||n("summary.followingDay")}function D(a){const[t,e,r]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(b(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,e-1,r))}function N(a){const[t,e,r]=String(a).split("-").map(Number);return!t||!e||!r?"":new Intl.DateTimeFormat(b(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,e-1,r))}function da(a,t){const e=[...a.querySelectorAll(`[data-${t}-screen]`)];if(e.length===0)return 0;const r=e.reduce((o,m)=>Math.abs(m.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(o.getBoundingClientRect().left-a.getBoundingClientRect().left)?m:o);return Number(r.dataset[`${t}Screen`])===1?1:0}function R(a,t,e){a.querySelectorAll(`[data-${t}-screen]`).forEach(r=>{r.setAttribute("aria-hidden",String(Number(r.dataset[`${t}Screen`])!==e))})}export{ha as mountSummaryMatrix,Q as scrollSummaryMatrix};

import{t as r,getLocale as x}from"./i18n/i18n.mjs";import{escapeHtml as e}from"./html-utils.js?v=20260808a";import{formatDietLabel as c}from"./diet-utils.mjs?v=20260810a";import{buildKitchenMatrixScreens as P,buildSummaryMatrixScreens as q}from"./summary-matrix-model.js?v=20260815i";function ea(a,{days:t=[],operationDays:s=[],kitchen:n=!1,layout:m="classic",activeIndex:i=0,onActiveIndexChange:l=()=>{}}={}){const o=n?P(t,s):q(t,[],s);if(o.every(d=>d.columns.length===0)){a.innerHTML=`<p class="empty-state">${e(r("summary.noMeal"))}</p>`;return}const u=n?"kitchen":"summary",$=m==="international"?Y:z;a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${m}${n?" summary-layout-kitchen":" summary-layout-diners"}" data-${u}-matrix-track aria-label="${e(r("summary.screensLabel"))}">
      ${o.map(d=>$(d,{kitchen:n,activeIndex:i})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${e(r("summary.swipeHint"))}</p>
  `;const h=a.querySelector(`[data-${u}-matrix-track]`);let w=0;h.addEventListener("scroll",()=>{window.clearTimeout(w),w=window.setTimeout(()=>{const d=X(h,u);R(a,u,d),l(d)},100)},{passive:!0}),window.requestAnimationFrame(()=>{E(a,i,{kitchen:n,smooth:!1})})}function E(a,t,{kitchen:s=!1,smooth:n=!0}={}){const m=s?"kitchen":"summary",i=Number(t)===1?1:0,l=a?.querySelector(`[data-${m}-matrix-track]`),o=l?.querySelector(`[data-${m}-screen="${i}"]`);return!l||!o?!1:(l.scrollTo({left:l.scrollLeft+o.getBoundingClientRect().left-l.getBoundingClientRect().left,behavior:n?"smooth":"auto"}),R(a,m,i),!0)}function z(a,{kitchen:t,activeIndex:s}){const n=t?"kitchen":"summary",m=a.index===s;return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${n}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
        <p class="empty-state">${e(r("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${n}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
      <table class="summary-matrix">
        ${G(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(i=>i.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${e(r("summary.item"))}</span></th>
            ${a.dateGroups.map(i=>`
              <th class="summary-matrix-date-heading${p(i,a)}" scope="colgroup" colspan="${i.span}">
                <span>${e(g(i.dayIndex))}</span>
                <time datetime="${e(i.dateId)}">${e(b(i.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(i=>`
              <th class="summary-matrix-meal-heading${p(i,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${S(i.mealTypeId)}</span><span class="summary-matrix-meal-label">${e(C(i))}</span>${F(i,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?f(r("summary.guests"),"summary-matrix-row-guests",a,i=>String(i.guestCount)):""}
          ${f(r("summary.diningMeals"),"summary-matrix-row-meals",a,D)}
          ${a.hasSpecialDiets?f(r("summary.includedDiets"),"summary-matrix-row-diets",a,t?T:N):""}
          ${a.hasSickMeals?f(r("summary.sickMeals"),"summary-matrix-row-sick",a,v):""}
          ${a.hasSickDiets?f(r("summary.sickDiets"),"summary-matrix-row-sick-diets",a,k):""}
          ${a.hasMassInformation?O(a):""}
          ${t?"":H(a)}
        </tbody>
      </table>
      ${t?L(a):""}
    </section>
  `}function G(a,t){return t?`<caption class="sr-only">${e(`${r("kitchen.title")}: ${r(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${e(a.dateId)}">${e(K(a.dateId))}</time>
    </caption>
  `}function S(a){return{breakfast:"☕",lunch:"🍝",dinner:"🍽"}[a]||"•"}function C(a){const t=String(a?.mealTypeId||"").trim().toLowerCase(),s=t?r(`meal.type.${t}`):"",n=String(a?.label||"").trim();return s&&s!==`meal.type.${t}`?s:n}function f(a,t,s,n){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${e(a)}</th>
      ${s.columns.map(m=>`<td class="${p(m,s).trim()}">${n(m)}</td>`).join("")}
    </tr>
  `}function D(a){const t=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${e(r(t))}</span>`}function v(a){if(a.sickCount===0)return y(r("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${e(r(t))}</span>`}function k(a){return a.sickDiets.length===0?y(r("summary.noDiet")):`<ul class="summary-matrix-diets">${a.sickDiets.map(t=>`<li>${e(c(t))}</li>`).join("")}</ul>`}function I(a){if(a.massStatus==="UNKNOWN")return y(r("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${e(r(t?"summary.yes":"summary.no"))}</span>`}function H(a){return`
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
        <span class="sr-only">${e(r("summary.names"))}</span>
      </th>
      ${a.columns.map(t=>`<td class="${p(t,a).trim()}">${j(t,{compactActions:!0})}</td>`).join("")}
    </tr>
  `}function M(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function O(a){const t=B(a).map(s=>`<td class="summary-matrix-mass-band${p(s,a)}${M(s.massStatus)}" colspan="${s.span}"><span class="summary-matrix-mass-day">${e(g(s.dayIndex))}</span>${I(s)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${e(r("summary.mass"))}</th>
      ${t}
    </tr>
  `}function F(a,t){if(t||a.mealTypeId!=="breakfast")return"";const s=a.breakfastPlanned===!0,n=r(s?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${s?"yes":"no"}"><span aria-hidden="true">${s?"✓":"×"}</span>${e(n)}</span>`}function N(a){return a.specialDiets.participantCount===0?y(r("summary.noDiet")):`<ul class="summary-matrix-diets">${[...a.specialDiets.items].sort((s,n)=>c(s.tag).localeCompare(c(n.tag),x())).map(s=>`<li>${e(c(s.tag))}</li>`).join("")}</ul>`}function T(a){return a.specialDiets.participantCount===0?y(r("summary.noDiet")):`<ul class="summary-matrix-diets summary-matrix-kitchen-diets">${[...new Set(a.specialDiets.items.map(s=>W(s.tag)))].sort((s,n)=>s.localeCompare(n,x())).map(s=>`<li>${e(s)}</li>`).join("")}</ul>`}function W(a){const t=String(a||"").trim();return/^\d+$/.test(t)?t:c(t)}function j(a,{compactActions:t=!1}={}){return a.names.length===0?y(r("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(s=>{const n=s.dietTags.map(h=>c(h)),m=U(s.phone),i=e(s.displayName),l=n.length?` <small>(${e(n.join(", "))})</small>`:"",o=`<span class="summary-matrix-person-name">${i}${l}</span>`,u=s.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${e(m)}" aria-label="${e(r("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",$=s.whatsappEnabled&&s.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${e(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${e(r("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";return t&&(u||$)?`
          <li class="summary-matrix-name-with-picker">
            <details class="summary-matrix-contact-picker">
              <summary aria-label="${e(r("summary.contactPerson",{name:s.displayName}))}" title="${e(r("summary.contactPerson",{name:s.displayName}))}">
                ${o}<span class="summary-matrix-contact-caret" aria-hidden="true">⌄</span>
              </summary>
              <span class="summary-matrix-contact-actions">${u}${$}</span>
            </details>
          </li>`:`<li>${o}<span class="summary-matrix-contact-actions">${u}${$}</span></li>`}).join("")}</ul>`}function U(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function Y(a,{kitchen:t,activeIndex:s}){const n=t?"kitchen":"summary",m=a.index===s;return`
    <section class="summary-matrix-screen summary-international-screen${_(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${n}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
      ${t?`<h2 class="sr-only">${e(`${r("kitchen.title")}: ${r(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${e(a.dateId)}">${e(K(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map(l=>J(l,{kitchen:t})).join("")}
      </div>
      ${a.hasMassInformation?Q(a,t):""}
      ${t?L(a):""}
    </section>
  `}function _(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function J(a,{kitchen:t}){const s=t?T(a):N(a);return`
    <article class="summary-international-card summary-day-tone-${A(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${S(a.mealTypeId)}</span>
        <div><strong>${e(C(a))}</strong><time datetime="${e(a.dateId)}">${e(b(a.dateId))}</time></div>
      </header>
      <dl>
        ${a.guestCount>0?`<div><dt>${e(r("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${e(r("summary.diningMeals"))}</dt><dd>${D(a)}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${e(r("summary.includedDiets"))}</dt><dd>${s}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${e(r("summary.sickMeals"))}</dt><dd>${v(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${e(r("summary.sickDiets"))}</dt><dd>${k(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${e(r("summary.names"))}</h3>${j(a)}</section>`}
    </article>
  `}function Q(a,t){const s=B(a);return s.length===0?"":`
    <section class="summary-international-mass${t?" summary-international-mass-kitchen":""}">
      <div class="summary-international-mass-segments">
        ${s.map((n,m)=>`
          <div class="summary-international-mass-group${m===0?" summary-international-mass-group-first":""}${p(n,a)}${M(n.massStatus)}" style="--mass-segment-span:${n.span}">
            ${m===0?`<strong class="summary-international-mass-title">${e(r("summary.mass"))}</strong>`:""}
            <div class="summary-international-mass-segment">
              <span>${e(g(n.dayIndex))}</span>
              ${I(n)}
            </div>
          </div>`).join("")}
      </div>
    </section>`}function B(a){return a.dateGroups.map(t=>{const s=a.columns.find(n=>n.dateId===t.dateId);return{...t,massStatus:s?.dayMassStatus||"UNKNOWN"}})}function L(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${e(r("kitchen.notes"))}">
      <h3>${e(r("kitchen.notes"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${e(t.dateId)}">${e(b(t.dateId))}</time>
          <ul>${t.notes.map(s=>`<li><p>${e(s.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function y(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${e(a)}</span>`}function V(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function p(a,t){return`${V(a,t)} summary-day-tone-${A(a.dayIndex)}`}function A(a){return Math.max(0,Math.min(2,Number(a)||0))}function g(a){return[r("summary.today"),r("summary.tomorrow"),r("summary.dayAfterTomorrow")][a]||r("summary.followingDay")}function b(a){const[t,s,n]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(x(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,s-1,n))}function K(a){const[t,s,n]=String(a).split("-").map(Number);return!t||!s||!n?"":new Intl.DateTimeFormat(x(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,s-1,n))}function X(a,t){const s=[...a.querySelectorAll(`[data-${t}-screen]`)];if(s.length===0)return 0;const n=s.reduce((m,i)=>Math.abs(i.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(m.getBoundingClientRect().left-a.getBoundingClientRect().left)?i:m);return Number(n.dataset[`${t}Screen`])===1?1:0}function R(a,t,s){a.querySelectorAll(`[data-${t}-screen]`).forEach(n=>{n.setAttribute("aria-hidden",String(Number(n.dataset[`${t}Screen`])!==s))})}export{ea as mountSummaryMatrix,E as scrollSummaryMatrix};

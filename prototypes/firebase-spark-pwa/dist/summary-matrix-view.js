import{t as n,getLocale as g}from"./i18n/i18n.mjs?v=20260818aa";import{escapeHtml as r}from"./html-utils.js?v=20260816g";import{formatDietLabel as q,normalizeDietCode as z}from"./diet-utils.mjs?v=20260818w";import{buildKitchenMatrixScreens as F,buildSummaryMatrixScreens as H}from"./summary-matrix-model.js?v=20260817h";let O=0;function ya(a,{days:t=[],operationDays:s=[],kitchen:e=!1,layout:i="classic",residentLabel:m="name",activeIndex:o=0,onActiveIndexChange:u=()=>{}}={}){const c=e?F(t,s):H(t,[],s);if(i==="future"&&!e){G(a,c,m);return}if(c.every(y=>y.columns.length===0)){a.innerHTML=`<p class="empty-state">${r(n("summary.noMeal"))}</p>`;return}const l=e?"kitchen":"summary",d=i==="international"?ea:J;a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${i}${e?" summary-layout-kitchen":" summary-layout-diners"}" data-${l}-matrix-track aria-label="${r(n("summary.screensLabel"))}">
      ${c.map(y=>d(y,{kitchen:e,activeIndex:o})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${r(n("summary.swipeHint"))}</p>
  `;const C=a.querySelector(`[data-${l}-matrix-track]`);let I=0;C.addEventListener("scroll",()=>{window.clearTimeout(I),I=window.setTimeout(()=>{const y=oa(C,l);E(a,l,y),u(y)},100)},{passive:!0}),window.requestAnimationFrame(()=>{_(a,o,{kitchen:e,smooth:!1})})}function G(a,t,s){a.innerHTML=`
    <div class="summary-future-grid">
      ${t.map(e=>`
        <article class="summary-future-card">
          <header class="summary-future-card-head">
            <strong>${r(n(e.labelKey))}</strong>
            <time datetime="${r(e.dateId)}">${r(M(e.dateId))}</time>
          </header>
          <div class="summary-future-meals">
            ${e.columns.map(i=>U(i,s)).join("")}
          </div>
          ${Y(e)}
        </article>
      `).join("")}
    </div>
  `}function U(a,t){const s=Array.isArray(a.names)?a.names:[],e=Number(a.specialDiets?.participantCount||0);return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${x(a.mealTypeId)}</span>
        <span class="summary-future-meal-name">${r(b(a))}</span>
        <strong class="summary-future-meal-total">${r(String(a.total||0))}</strong>
      </div>
      ${e?`<p class="summary-future-diets">${r(n("week.operations.diet.count",{count:e}))}</p>`:""}
      ${s.length?`<div class="summary-future-people">${s.map(i=>W(i,t)).join("")}</div>`:""}
    </section>
  `}function W(a,t){const s=String(a.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(i=>i[0]).join("").toUpperCase(),e=t==="signature"?a.signature||a.displayName:t==="initials"?a.initials||s||a.signature:a.displayName;return`<span class="summary-future-person" title="${r(a.displayName||e)}">${r(e||"–")}</span>`}function Y(a){const t=a.columns.find(e=>e.dayIndex===a.index)?.dayMassStatus;if(!t||t==="UNKNOWN")return"";const s=t==="YES";return`<div class="summary-future-mass"><span>${r(n("summary.mass"))}</span><strong class="summary-future-mass-${s?"yes":"no"}">${r(n(s?"summary.yes":"summary.no"))}</strong></div>`}function _(a,t,{kitchen:s=!1,smooth:e=!0}={}){const i=s?"kitchen":"summary",m=Number(t)===1?1:0,o=a?.querySelector(`[data-${i}-matrix-track]`),u=o?.querySelector(`[data-${i}-screen="${m}"]`);return!o||!u?!1:(o.scrollTo({left:o.scrollLeft+u.getBoundingClientRect().left-o.getBoundingClientRect().left,behavior:e?"smooth":"auto"}),E(a,i,m),!0)}function J(a,{kitchen:t,activeIndex:s}){const e=t?"kitchen":"summary",i=a.index===s;return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${e}-screen="${a.index}" role="tabpanel" aria-hidden="${!i}">
        <p class="empty-state">${r(n("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${e}-screen="${a.index}" role="tabpanel" aria-hidden="${!i}">
      <table class="summary-matrix">
        ${Q(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(m=>m.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${r(n("summary.item"))}</span></th>
            ${a.dateGroups.map(m=>`
              <th class="summary-matrix-date-heading${f(m,a)}" scope="colgroup" colspan="${m.span}">
                <span>${r(R(m.dayIndex))}</span>
                <time datetime="${r(m.dateId)}">${r(S(m.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(m=>`
              <th class="summary-matrix-meal-heading${f(m,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${x(m.mealTypeId)}</span><span class="summary-matrix-meal-label">${r(b(m))}</span>${ta(m,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?h(n("summary.guests"),"summary-matrix-row-guests",a,m=>String(m.guestCount)):""}
          ${h(n("summary.diningMeals"),"summary-matrix-row-meals",a,w)}
          ${a.hasSpecialDiets?h(n("summary.includedDiets"),"summary-matrix-row-diets",a,t?T:j):""}
          ${a.hasSickMeals?h(n("summary.sickMeals"),"summary-matrix-row-sick",a,D):""}
          ${a.hasSickDiets?h(n("summary.sickDiets"),"summary-matrix-row-sick-diets",a,k):""}
          ${a.hasMassInformation?aa(a):""}
          ${t?"":Z(a)}
        </tbody>
      </table>
      ${t?L(a):""}
    </section>
  `}function Q(a,t){return t?`<caption class="sr-only">${r(`${n("kitchen.title")}: ${n(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${r(a.dateId)}">${r(M(a.dateId))}</time>
    </caption>
  `}function x(a){const t={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return V({breakfast:"coffee",lunch:"sun",dinner:"moon"}[a],t[a]||"•")}function V(a,t="•"){const s=document.documentElement.dataset.interfaceStyle;if(!(s==="cool"||s==="urban")||!a)return t;const m={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[a];return m?`<svg class="meal-line-icon meal-line-icon-${a}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${m}</svg>`:t}function b(a){const t=String(a?.mealTypeId||"").trim().toLowerCase(),s=t?n(`meal.type.${t}`):"",e=String(a?.label||"").trim();return s&&s!==`meal.type.${t}`?s:e}function h(a,t,s,e){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${r(a)}</th>
      ${s.columns.map(i=>`<td class="${f(i,s).trim()}">${e(i)}</td>`).join("")}
    </tr>
  `}function w(a){const t=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${r(n(t))}</span>`}function D(a){if(a.sickCount===0)return $(n("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${r(n(t))}</span>`}function k(a){return a.sickDiets.length===0?$(n("summary.noDiet")):v(a.sickDiets)}function X(a){if(a.massStatus==="UNKNOWN")return $(n("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${r(n(t?"summary.yes":"summary.no"))}</span>`}function Z(a){return`
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
        <span class="sr-only">${r(n("summary.names"))}</span>
      </th>
      ${a.columns.map(t=>`<td class="${f(t,a).trim()}">${A(t,{compactActions:!0})}</td>`).join("")}
    </tr>
  `}function N(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function aa(a){const t=B(a).map(s=>`<td class="summary-matrix-mass-band${f(s,a)}${N(s.massStatus)}" colspan="${s.span}">${P(s)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${r(n("summary.mass"))}</th>
      ${t}
    </tr>
  `}function ta(a,t){if(t||a.mealTypeId!=="breakfast")return"";const s=a.breakfastPlanned===!0,e=n(s?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${s?"yes":"no"}"><span aria-hidden="true">${s?"✓":"×"}</span>${r(e)}</span>`}function j(a){if(a.specialDiets.participantCount===0)return $(n("summary.noDiet"));const t=[...a.specialDiets.items].sort((s,e)=>p(s.tag).localeCompare(p(e.tag),g(),{numeric:!0}));return v(t)}function T(a){return a.specialDiets.participantCount===0?$(n("summary.noDiet")):v(a.specialDiets.items," summary-matrix-kitchen-diets")}function v(a,t=""){const s=[...a].sort((e,i)=>p(e.tag).localeCompare(p(i.tag),g(),{numeric:!0}));return`<ul class="summary-matrix-diets${t}">${s.map(e=>{const i=p(e.tag),m=Math.max(0,Math.floor(Number(e.count)||0)),o=m>1?`${i} (${m})`:i;return`<li>${r(o)}</li>`}).join("")}</ul>`}function p(a){const t=z(a);return/^\d+$/.test(t)?t:q(t)}function A(a,{compactActions:t=!1}={}){return a.names.length===0?$(n("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(s=>{const e=s.dietTags.map(d=>p(d)),i=sa(s.phone),m=r(s.displayName),o=e.length?` <small>(${r(e.join(", "))})</small>`:"",u=`<span class="summary-matrix-person-name">${m}${o}</span>`,c=s.phoneConsent&&i?`<a class="summary-matrix-call" href="tel:${r(i)}" aria-label="${r(n("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",l=s.whatsappEnabled&&s.phoneConsent&&i?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(i.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(n("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(t&&(c||l)){const d=`summary-contact-popup-${++O}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${d}" aria-haspopup="dialog" aria-label="${r(n("summary.contactPerson",{name:s.displayName}))}" title="${r(n("summary.contactPerson",{name:s.displayName}))}">${u}</button>
            <span class="summary-matrix-contact-popover" id="${d}" popover role="dialog" aria-label="${r(n("summary.contactPerson",{name:s.displayName}))}">
              <span class="summary-matrix-contact-actions">${c}${l}</span>
            </span>
          </li>`}return`<li>${u}<span class="summary-matrix-contact-actions">${c}${l}</span></li>`}).join("")}</ul>`}function sa(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function ea(a,{kitchen:t,activeIndex:s}){const e=t?"kitchen":"summary",i=a.index===s;return`
    <section class="summary-matrix-screen summary-international-screen${ra(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${e}-screen="${a.index}" role="tabpanel" aria-hidden="${!i}">
      ${t?`<h2 class="sr-only">${r(`${n("kitchen.title")}: ${n(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${r(a.dateId)}">${r(M(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map(o=>na(o,{kitchen:t})).join("")}
      </div>
      ${a.hasMassInformation?ia(a,t):""}
      ${t?L(a):""}
    </section>
  `}function ra(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function na(a,{kitchen:t}){const s=t?T(a):j(a);return`
    <article class="summary-international-card summary-day-tone-${K(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${x(a.mealTypeId)}</span>
        <div><strong>${r(b(a))}</strong><time datetime="${r(a.dateId)}">${r(S(a.dateId))}</time></div>
        ${a.guestCount>0?`<span class="summary-international-mobile-guests">${r(n("summary.guests"))}: <strong>${a.guestCount}</strong></span>`:""}
      </header>
      <dl>
        ${a.guestCount>0?`<div class="summary-international-guest-row"><dt>${r(n("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${r(n("summary.diningMeals"))}</dt><dd>${w(a)}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${r(n("summary.includedDiets"))}</dt><dd>${s}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${r(n("summary.sickMeals"))}</dt><dd>${D(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${r(n("summary.sickDiets"))}</dt><dd>${k(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${r(n("summary.names"))}</h3>${A(a,{compactActions:!0})}</section>`}
    </article>
  `}function ia(a,t){const s=B(a);return s.length===0?"":`
    <section class="summary-international-mass${t?" summary-international-mass-kitchen":""}">
      <div class="summary-international-mass-segments">
        ${s.map((e,i)=>`
          <div class="summary-international-mass-group${i===0?" summary-international-mass-group-first":""}${f(e,a)}${N(e.massStatus)}" style="--mass-segment-span:${e.span}">
            ${i===0?`<strong class="summary-international-mass-title">${r(n("summary.mass"))}</strong>`:""}
            <div class="summary-international-mass-segment">
              ${P(e)}
            </div>
          </div>`).join("")}
      </div>
    </section>`}function B(a){return a.dateGroups.map(t=>{const s=a.columns.find(e=>e.dateId===t.dateId);return{...t,massStatus:s?.dayMassStatus||"UNKNOWN"}})}function L(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${r(n("kitchen.notes.title"))}">
      <h3>${r(n("kitchen.notes.title"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${r(t.dateId)}">${r(S(t.dateId))}</time>
          <ul>${t.notes.map(s=>`<li><p>${r(s.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function $(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${r(a)}</span>`}function ma(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function P(a){return`
    <span class="summary-mass-control">
      <span class="summary-mass-control-day">${r(R(a.dayIndex))}</span>
      <span class="summary-mass-control-state">${X(a)}</span>
    </span>`}function f(a,t){return`${ma(a,t)} summary-day-tone-${K(a.dayIndex)}`}function K(a){return Math.max(0,Math.min(2,Number(a)||0))}function R(a){return[n("summary.today"),n("summary.tomorrow"),n("summary.dayAfterTomorrow")][a]||n("summary.followingDay")}function S(a){const[t,s,e]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(g(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,s-1,e))}function M(a){const[t,s,e]=String(a).split("-").map(Number);return!t||!s||!e?"":new Intl.DateTimeFormat(g(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,s-1,e))}function oa(a,t){const s=[...a.querySelectorAll(`[data-${t}-screen]`)];if(s.length===0)return 0;const e=s.reduce((i,m)=>Math.abs(m.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(i.getBoundingClientRect().left-a.getBoundingClientRect().left)?m:i);return Number(e.dataset[`${t}Screen`])===1?1:0}function E(a,t,s){a.querySelectorAll(`[data-${t}-screen]`).forEach(e=>{e.setAttribute("aria-hidden",String(Number(e.dataset[`${t}Screen`])!==s))})}export{ya as mountSummaryMatrix,_ as scrollSummaryMatrix};

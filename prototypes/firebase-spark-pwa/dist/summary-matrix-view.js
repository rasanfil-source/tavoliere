import{t as r,getLocale as f}from"./i18n/i18n.mjs";import{escapeHtml as e}from"./html-utils.js?v=20260808a";import{formatDietLabel as c}from"./diet-utils.mjs?v=20260810a";import{buildKitchenMatrixScreens as A,buildSummaryMatrixScreens as K}from"./summary-matrix-model.js?v=20260814y";function V(a,{days:t=[],operationDays:s=[],kitchen:n=!1,layout:m="classic",activeIndex:i=0,onActiveIndexChange:l=()=>{}}={}){const o=n?A(t,s):K(t,[],s);if(o.every(u=>u.columns.length===0)){a.innerHTML=`<p class="empty-state">${e(r("summary.noMeal"))}</p>`;return}const d=n?"kitchen":"summary",h=m==="international"?W:q;a.innerHTML=`
    <div class="summary-matrix-track" data-${d}-matrix-track aria-label="${e(r("summary.screensLabel"))}">
      ${o.map(u=>h(u,{kitchen:n,activeIndex:i})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${e(r("summary.swipeHint"))}</p>
  `;const b=a.querySelector(`[data-${d}-matrix-track]`);let w=0;b.addEventListener("scroll",()=>{window.clearTimeout(w),w=window.setTimeout(()=>{const u=U(b,d);L(a,d,u),l(u)},100)},{passive:!0}),window.requestAnimationFrame(()=>{R(a,i,{kitchen:n,smooth:!1})})}function R(a,t,{kitchen:s=!1,smooth:n=!0}={}){const m=s?"kitchen":"summary",i=Number(t)===1?1:0,l=a?.querySelector(`[data-${m}-matrix-track]`),o=l?.querySelector(`[data-${m}-screen="${i}"]`);return!l||!o?!1:(l.scrollTo({left:l.scrollLeft+o.getBoundingClientRect().left-l.getBoundingClientRect().left,behavior:n?"smooth":"auto"}),L(a,m,i),!0)}function q(a,{kitchen:t,activeIndex:s}){const n=t?"kitchen":"summary",m=a.index===s;return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${n}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
        <p class="empty-state">${e(r("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${n}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
      <table class="summary-matrix">
        ${P(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(i=>i.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${e(r("summary.item"))}</span></th>
            ${a.dateGroups.map(i=>`
              <th class="summary-matrix-date-heading${p(i,a)}" scope="colgroup" colspan="${i.span}">
                <span>${e(x(i.dayIndex))}</span>
                <time datetime="${e(i.dateId)}">${e(g(i.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(i=>`
              <th class="summary-matrix-meal-heading${p(i,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${v(i.mealTypeId)}</span><span class="summary-matrix-meal-label">${e(i.label)}</span>${G(i)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?y(r("summary.guests"),"summary-matrix-row-guests",a,i=>String(i.guestCount)):""}
          ${y(r("summary.diningMeals"),"summary-matrix-row-meals",a,D)}
          ${a.hasSpecialDiets?y(r("summary.includedDiets"),"summary-matrix-row-diets",a,t?M:C):""}
          ${a.hasSickMeals?y(r("summary.sickMeals"),"summary-matrix-row-sick",a,S):""}
          ${a.hasSickDiets?y(r("summary.sickDiets"),"summary-matrix-row-sick-diets",a,k):""}
          ${a.hasMassInformation?E(a):""}
          ${t?"":y(r("summary.names"),"summary-matrix-row-names",a,N)}
        </tbody>
      </table>
      ${t?T(a):""}
    </section>
  `}function P(a,t){return t?`<caption class="sr-only">${e(`${r("kitchen.title")}: ${r(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${e(a.dateId)}">${e(B(a.dateId))}</time>
    </caption>
  `}function v(a){return{breakfast:"☕",lunch:"🍝",dinner:"🍽"}[a]||"•"}function y(a,t,s,n){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${e(a)}</th>
      ${s.columns.map(m=>`<td class="${p(m,s).trim()}">${n(m)}</td>`).join("")}
    </tr>
  `}function D(a){const t=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${e(r(t))}</span>`}function S(a){if(a.sickCount===0)return $(r("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${e(r(t))}</span>`}function k(a){return a.sickDiets.length===0?$(r("summary.noDiet")):`<ul class="summary-matrix-diets">${a.sickDiets.map(t=>`<li>${e(c(t))}</li>`).join("")}</ul>`}function I(a){if(a.massStatus==="UNKNOWN")return $(r("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${e(r(t?"summary.yes":"summary.no"))}</span>`}function E(a){const t=j(a).map(s=>`<td class="summary-matrix-mass-band${p(s,a)}" colspan="${s.span}"><span class="summary-matrix-mass-day">${e(x(s.dayIndex))}</span>${I(s)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${e(r("summary.mass"))}</th>
      ${t}
    </tr>
  `}function G(a){if(a.mealTypeId!=="breakfast")return"";const t=a.breakfastPlanned===!0,s=r(t?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${t?"yes":"no"}"><span aria-hidden="true">${t?"✓":"×"}</span>${e(s)}</span>`}function C(a){return a.specialDiets.participantCount===0?$(r("summary.noDiet")):`<ul class="summary-matrix-diets">${[...a.specialDiets.items].sort((s,n)=>c(s.tag).localeCompare(c(n.tag),f())).map(s=>`<li>${e(c(s.tag))}</li>`).join("")}</ul>`}function M(a){return a.specialDiets.participantCount===0?$(r("summary.noDiet")):`<ul class="summary-matrix-diets summary-matrix-kitchen-diets">${[...new Set(a.specialDiets.items.map(s=>H(s.tag)))].sort((s,n)=>s.localeCompare(n,f())).map(s=>`<li>${e(s)}</li>`).join("")}</ul>`}function H(a){const t=String(a||"").trim();return/^\d+$/.test(t)?t:c(t)}function N(a){return a.names.length===0?$(r("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(t=>{const s=t.dietTags.map(h=>c(h)),n=F(t.phone),m=e(t.displayName),i=s.length?` <small>(${e(s.join(", "))})</small>`:"",l=`<span class="summary-matrix-person-name">${m}${i}</span>`,o=t.phoneConsent&&n?`<a class="summary-matrix-call" href="tel:${e(n)}" aria-label="${e(r("summary.callPerson",{name:t.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",d=t.whatsappEnabled&&t.phoneConsent&&n?`<a class="summary-matrix-whatsapp" href="https://wa.me/${e(n.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${e(r("summary.messagePerson",{name:t.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";return`<li>${l}<span class="summary-matrix-contact-actions">${o}${d}</span></li>`}).join("")}</ul>`}function F(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function W(a,{kitchen:t,activeIndex:s}){const n=t?"kitchen":"summary",m=a.index===s;return`
    <section class="summary-matrix-screen summary-international-screen" data-${n}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
      ${t?`<h2 class="sr-only">${e(`${r("kitchen.title")}: ${r(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${e(a.dateId)}">${e(B(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map(i=>z(i,{kitchen:t})).join("")}
      </div>
      ${a.hasMassInformation?O(a,t):""}
      ${t?T(a):""}
    </section>
  `}function z(a,{kitchen:t}){const s=t?M(a):C(a);return`
    <article class="summary-international-card${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${v(a.mealTypeId)}</span>
        <div><strong>${e(a.label)}</strong><time datetime="${e(a.dateId)}">${e(g(a.dateId))}</time></div>
      </header>
      <dl>
        ${a.guestCount>0?`<div><dt>${e(r("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${e(r("summary.diningMeals"))}</dt><dd>${D(a)}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${e(r("summary.includedDiets"))}</dt><dd>${s}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${e(r("summary.sickMeals"))}</dt><dd>${S(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${e(r("summary.sickDiets"))}</dt><dd>${k(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${e(r("summary.names"))}</h3>${N(a)}</section>`}
    </article>
  `}function O(a,t){const s=j(a);return s.length===0?"":`
    <section class="summary-international-mass${t?" summary-international-mass-kitchen":""}">
      <div class="summary-international-mass-segments">
        ${s.map((n,m)=>`
          <div class="summary-international-mass-group${m===0?" summary-international-mass-group-first":""}${p(n,a)}" style="--mass-segment-span:${n.span}">
            ${m===0?`<strong class="summary-international-mass-title">${e(r("summary.mass"))}</strong>`:""}
            <div class="summary-international-mass-segment">
              <span>${e(x(n.dayIndex))}</span>
              ${I(n)}
            </div>
          </div>`).join("")}
      </div>
    </section>`}function j(a){return a.dateGroups.map(t=>{const s=a.columns.find(n=>n.dateId===t.dateId);return{...t,massStatus:s?.dayMassStatus||"UNKNOWN"}})}function T(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${e(r("kitchen.notes"))}">
      <h3>${e(r("kitchen.notes"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${e(t.dateId)}">${e(g(t.dateId))}</time>
          <ul>${t.notes.map(s=>`<li><p>${e(s.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function $(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${e(a)}</span>`}function p(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function x(a){return[r("summary.today"),r("summary.tomorrow"),r("summary.dayAfterTomorrow")][a]||r("summary.followingDay")}function g(a){const[t,s,n]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(f(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,s-1,n))}function B(a){const[t,s,n]=String(a).split("-").map(Number);return!t||!s||!n?"":new Intl.DateTimeFormat(f(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,s-1,n))}function U(a,t){const s=[...a.querySelectorAll(`[data-${t}-screen]`)];if(s.length===0)return 0;const n=s.reduce((m,i)=>Math.abs(i.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(m.getBoundingClientRect().left-a.getBoundingClientRect().left)?i:m);return Number(n.dataset[`${t}Screen`])===1?1:0}function L(a,t,s){a.querySelectorAll(`[data-${t}-screen]`).forEach(n=>{n.setAttribute("aria-hidden",String(Number(n.dataset[`${t}Screen`])!==s))})}export{V as mountSummaryMatrix,R as scrollSummaryMatrix};

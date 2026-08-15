import{t as n,getLocale as f}from"./i18n/i18n.mjs";import{escapeHtml as e}from"./html-utils.js?v=20260808a";import{formatDietLabel as c}from"./diet-utils.mjs?v=20260810a";import{buildKitchenMatrixScreens as R,buildSummaryMatrixScreens as q}from"./summary-matrix-model.js?v=20260815i";function aa(a,{days:t=[],operationDays:s=[],kitchen:r=!1,layout:m="classic",activeIndex:i=0,onActiveIndexChange:l=()=>{}}={}){const o=r?R(t,s):q(t,[],s);if(o.every(u=>u.columns.length===0)){a.innerHTML=`<p class="empty-state">${e(n("summary.noMeal"))}</p>`;return}const d=r?"kitchen":"summary",h=m==="international"?O:E;a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${m}${r?" summary-layout-kitchen":" summary-layout-diners"}" data-${d}-matrix-track aria-label="${e(n("summary.screensLabel"))}">
      ${o.map(u=>h(u,{kitchen:r,activeIndex:i})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${e(n("summary.swipeHint"))}</p>
  `;const b=a.querySelector(`[data-${d}-matrix-track]`);let w=0;b.addEventListener("scroll",()=>{window.clearTimeout(w),w=window.setTimeout(()=>{const u=J(b,d);K(a,d,u),l(u)},100)},{passive:!0}),window.requestAnimationFrame(()=>{P(a,i,{kitchen:r,smooth:!1})})}function P(a,t,{kitchen:s=!1,smooth:r=!0}={}){const m=s?"kitchen":"summary",i=Number(t)===1?1:0,l=a?.querySelector(`[data-${m}-matrix-track]`),o=l?.querySelector(`[data-${m}-screen="${i}"]`);return!l||!o?!1:(l.scrollTo({left:l.scrollLeft+o.getBoundingClientRect().left-l.getBoundingClientRect().left,behavior:r?"smooth":"auto"}),K(a,m,i),!0)}function E(a,{kitchen:t,activeIndex:s}){const r=t?"kitchen":"summary",m=a.index===s;return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${r}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
        <p class="empty-state">${e(n("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${r}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
      <table class="summary-matrix">
        ${z(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(i=>i.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${e(n("summary.item"))}</span></th>
            ${a.dateGroups.map(i=>`
              <th class="summary-matrix-date-heading${p(i,a)}" scope="colgroup" colspan="${i.span}">
                <span>${e(x(i.dayIndex))}</span>
                <time datetime="${e(i.dateId)}">${e(g(i.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(i=>`
              <th class="summary-matrix-meal-heading${p(i,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${S(i.mealTypeId)}</span><span class="summary-matrix-meal-label">${e(D(i))}</span>${H(i,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?y(n("summary.guests"),"summary-matrix-row-guests",a,i=>String(i.guestCount)):""}
          ${y(n("summary.diningMeals"),"summary-matrix-row-meals",a,v)}
          ${a.hasSpecialDiets?y(n("summary.includedDiets"),"summary-matrix-row-diets",a,t?N:M):""}
          ${a.hasSickMeals?y(n("summary.sickMeals"),"summary-matrix-row-sick",a,I):""}
          ${a.hasSickDiets?y(n("summary.sickDiets"),"summary-matrix-row-sick-diets",a,k):""}
          ${a.hasMassInformation?G(a):""}
          ${t?"":y(n("summary.names"),"summary-matrix-row-names",a,T)}
        </tbody>
      </table>
      ${t?L(a):""}
    </section>
  `}function z(a,t){return t?`<caption class="sr-only">${e(`${n("kitchen.title")}: ${n(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${e(a.dateId)}">${e(A(a.dateId))}</time>
    </caption>
  `}function S(a){return{breakfast:"☕",lunch:"🍝",dinner:"🍽"}[a]||"•"}function D(a){const t=String(a?.mealTypeId||"").trim().toLowerCase(),s=t?n(`meal.type.${t}`):"",r=String(a?.label||"").trim();return s&&s!==`meal.type.${t}`?s:r}function y(a,t,s,r){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${e(a)}</th>
      ${s.columns.map(m=>`<td class="${p(m,s).trim()}">${r(m)}</td>`).join("")}
    </tr>
  `}function v(a){const t=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${e(n(t))}</span>`}function I(a){if(a.sickCount===0)return $(n("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${e(n(t))}</span>`}function k(a){return a.sickDiets.length===0?$(n("summary.noDiet")):`<ul class="summary-matrix-diets">${a.sickDiets.map(t=>`<li>${e(c(t))}</li>`).join("")}</ul>`}function C(a){if(a.massStatus==="UNKNOWN")return $(n("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${e(n(t?"summary.yes":"summary.no"))}</span>`}function G(a){const t=j(a).map(s=>`<td class="summary-matrix-mass-band${p(s,a)}" colspan="${s.span}"><span class="summary-matrix-mass-day">${e(x(s.dayIndex))}</span>${C(s)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${e(n("summary.mass"))}</th>
      ${t}
    </tr>
  `}function H(a,t){if(t||a.mealTypeId!=="breakfast")return"";const s=a.breakfastPlanned===!0,r=n(s?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${s?"yes":"no"}"><span aria-hidden="true">${s?"✓":"×"}</span>${e(r)}</span>`}function M(a){return a.specialDiets.participantCount===0?$(n("summary.noDiet")):`<ul class="summary-matrix-diets">${[...a.specialDiets.items].sort((s,r)=>c(s.tag).localeCompare(c(r.tag),f())).map(s=>`<li>${e(c(s.tag))}</li>`).join("")}</ul>`}function N(a){return a.specialDiets.participantCount===0?$(n("summary.noDiet")):`<ul class="summary-matrix-diets summary-matrix-kitchen-diets">${[...new Set(a.specialDiets.items.map(s=>F(s.tag)))].sort((s,r)=>s.localeCompare(r,f())).map(s=>`<li>${e(s)}</li>`).join("")}</ul>`}function F(a){const t=String(a||"").trim();return/^\d+$/.test(t)?t:c(t)}function T(a){return a.names.length===0?$(n("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(t=>{const s=t.dietTags.map(h=>c(h)),r=W(t.phone),m=e(t.displayName),i=s.length?` <small>(${e(s.join(", "))})</small>`:"",l=`<span class="summary-matrix-person-name">${m}${i}</span>`,o=t.phoneConsent&&r?`<a class="summary-matrix-call" href="tel:${e(r)}" aria-label="${e(n("summary.callPerson",{name:t.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",d=t.whatsappEnabled&&t.phoneConsent&&r?`<a class="summary-matrix-whatsapp" href="https://wa.me/${e(r.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${e(n("summary.messagePerson",{name:t.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";return`<li>${l}<span class="summary-matrix-contact-actions">${o}${d}</span></li>`}).join("")}</ul>`}function W(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function O(a,{kitchen:t,activeIndex:s}){const r=t?"kitchen":"summary",m=a.index===s;return`
    <section class="summary-matrix-screen summary-international-screen" data-${r}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
      ${t?`<h2 class="sr-only">${e(`${n("kitchen.title")}: ${n(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${e(a.dateId)}">${e(A(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map(i=>U(i,{kitchen:t})).join("")}
      </div>
      ${a.hasMassInformation?Y(a,t):""}
      ${t?L(a):""}
    </section>
  `}function U(a,{kitchen:t}){const s=t?N(a):M(a);return`
    <article class="summary-international-card summary-day-tone-${B(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${S(a.mealTypeId)}</span>
        <div><strong>${e(D(a))}</strong><time datetime="${e(a.dateId)}">${e(g(a.dateId))}</time></div>
      </header>
      <dl>
        ${a.guestCount>0?`<div><dt>${e(n("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${e(n("summary.diningMeals"))}</dt><dd>${v(a)}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${e(n("summary.includedDiets"))}</dt><dd>${s}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${e(n("summary.sickMeals"))}</dt><dd>${I(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${e(n("summary.sickDiets"))}</dt><dd>${k(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${e(n("summary.names"))}</h3>${T(a)}</section>`}
    </article>
  `}function Y(a,t){const s=j(a);return s.length===0?"":`
    <section class="summary-international-mass${t?" summary-international-mass-kitchen":""}">
      <div class="summary-international-mass-segments">
        ${s.map((r,m)=>`
          <div class="summary-international-mass-group${m===0?" summary-international-mass-group-first":""}${p(r,a)}" style="--mass-segment-span:${r.span}">
            ${m===0?`<strong class="summary-international-mass-title">${e(n("summary.mass"))}</strong>`:""}
            <div class="summary-international-mass-segment">
              <span>${e(x(r.dayIndex))}</span>
              ${C(r)}
            </div>
          </div>`).join("")}
      </div>
    </section>`}function j(a){return a.dateGroups.map(t=>{const s=a.columns.find(r=>r.dateId===t.dateId);return{...t,massStatus:s?.dayMassStatus||"UNKNOWN"}})}function L(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${e(n("kitchen.notes"))}">
      <h3>${e(n("kitchen.notes"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${e(t.dateId)}">${e(g(t.dateId))}</time>
          <ul>${t.notes.map(s=>`<li><p>${e(s.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function $(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${e(a)}</span>`}function _(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function p(a,t){return`${_(a,t)} summary-day-tone-${B(a.dayIndex)}`}function B(a){return Math.max(0,Math.min(2,Number(a)||0))}function x(a){return[n("summary.today"),n("summary.tomorrow"),n("summary.dayAfterTomorrow")][a]||n("summary.followingDay")}function g(a){const[t,s,r]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(f(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,s-1,r))}function A(a){const[t,s,r]=String(a).split("-").map(Number);return!t||!s||!r?"":new Intl.DateTimeFormat(f(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,s-1,r))}function J(a,t){const s=[...a.querySelectorAll(`[data-${t}-screen]`)];if(s.length===0)return 0;const r=s.reduce((m,i)=>Math.abs(i.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(m.getBoundingClientRect().left-a.getBoundingClientRect().left)?i:m);return Number(r.dataset[`${t}Screen`])===1?1:0}function K(a,t,s){a.querySelectorAll(`[data-${t}-screen]`).forEach(r=>{r.setAttribute("aria-hidden",String(Number(r.dataset[`${t}Screen`])!==s))})}export{aa as mountSummaryMatrix,P as scrollSummaryMatrix};

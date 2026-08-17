import{t as r,getLocale as x}from"./i18n/i18n.mjs?v=20260818x";import{escapeHtml as e}from"./html-utils.js?v=20260816g";import{formatDietLabel as q,normalizeDietCode as z}from"./diet-utils.mjs?v=20260818w";import{buildKitchenMatrixScreens as E,buildSummaryMatrixScreens as H}from"./summary-matrix-model.js?v=20260817h";let G=0;function oa(a,{days:t=[],operationDays:s=[],kitchen:n=!1,layout:i="classic",activeIndex:m=0,onActiveIndexChange:o=()=>{}}={}){const l=n?E(t,s):H(t,[],s);if(l.every(d=>d.columns.length===0)){a.innerHTML=`<p class="empty-state">${e(r("summary.noMeal"))}</p>`;return}const u=n?"kitchen":"summary",f=i==="international"?X:F;a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${i}${n?" summary-layout-kitchen":" summary-layout-diners"}" data-${u}-matrix-track aria-label="${e(r("summary.screensLabel"))}">
      ${l.map(d=>f(d,{kitchen:n,activeIndex:m})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${e(r("summary.swipeHint"))}</p>
  `;const c=a.querySelector(`[data-${u}-matrix-track]`);let v=0;c.addEventListener("scroll",()=>{window.clearTimeout(v),v=window.setTimeout(()=>{const d=ea(c,u);K(a,u,d),o(d)},100)},{passive:!0}),window.requestAnimationFrame(()=>{O(a,m,{kitchen:n,smooth:!1})})}function O(a,t,{kitchen:s=!1,smooth:n=!0}={}){const i=s?"kitchen":"summary",m=Number(t)===1?1:0,o=a?.querySelector(`[data-${i}-matrix-track]`),l=o?.querySelector(`[data-${i}-screen="${m}"]`);return!o||!l?!1:(o.scrollTo({left:o.scrollLeft+l.getBoundingClientRect().left-o.getBoundingClientRect().left,behavior:n?"smooth":"auto"}),K(a,i,m),!0)}function F(a,{kitchen:t,activeIndex:s}){const n=t?"kitchen":"summary",i=a.index===s;return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${n}-screen="${a.index}" role="tabpanel" aria-hidden="${!i}">
        <p class="empty-state">${e(r("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${n}-screen="${a.index}" role="tabpanel" aria-hidden="${!i}">
      <table class="summary-matrix">
        ${W(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(m=>m.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${e(r("summary.item"))}</span></th>
            ${a.dateGroups.map(m=>`
              <th class="summary-matrix-date-heading${$(m,a)}" scope="colgroup" colspan="${m.span}">
                <span>${e(P(m.dayIndex))}</span>
                <time datetime="${e(m.dateId)}">${e(b(m.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(m=>`
              <th class="summary-matrix-meal-heading${$(m,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${w(m.mealTypeId)}</span><span class="summary-matrix-meal-label">${e(M(m))}</span>${Q(m,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?h(r("summary.guests"),"summary-matrix-row-guests",a,m=>String(m.guestCount)):""}
          ${h(r("summary.diningMeals"),"summary-matrix-row-meals",a,C)}
          ${a.hasSpecialDiets?h(r("summary.includedDiets"),"summary-matrix-row-diets",a,t?N:k):""}
          ${a.hasSickMeals?h(r("summary.sickMeals"),"summary-matrix-row-sick",a,S):""}
          ${a.hasSickDiets?h(r("summary.sickDiets"),"summary-matrix-row-sick-diets",a,D):""}
          ${a.hasMassInformation?J(a):""}
          ${t?"":_(a)}
        </tbody>
      </table>
      ${t?B(a):""}
    </section>
  `}function W(a,t){return t?`<caption class="sr-only">${e(`${r("kitchen.title")}: ${r(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${e(a.dateId)}">${e(R(a.dateId))}</time>
    </caption>
  `}function w(a){const t={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return U({breakfast:"coffee",lunch:"sun",dinner:"moon"}[a],t[a]||"•")}function U(a,t="•"){if(document.documentElement.dataset.interfaceStyle!=="cool"||!a)return t;const n={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[a];return n?`<svg class="meal-line-icon meal-line-icon-${a}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${n}</svg>`:t}function M(a){const t=String(a?.mealTypeId||"").trim().toLowerCase(),s=t?r(`meal.type.${t}`):"",n=String(a?.label||"").trim();return s&&s!==`meal.type.${t}`?s:n}function h(a,t,s,n){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${e(a)}</th>
      ${s.columns.map(i=>`<td class="${$(i,s).trim()}">${n(i)}</td>`).join("")}
    </tr>
  `}function C(a){const t=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${e(r(t))}</span>`}function S(a){if(a.sickCount===0)return p(r("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${e(r(t))}</span>`}function D(a){return a.sickDiets.length===0?p(r("summary.noDiet")):g(a.sickDiets)}function Y(a){if(a.massStatus==="UNKNOWN")return p(r("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${e(r(t?"summary.yes":"summary.no"))}</span>`}function _(a){return`
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
      ${a.columns.map(t=>`<td class="${$(t,a).trim()}">${T(t,{compactActions:!0})}</td>`).join("")}
    </tr>
  `}function I(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function J(a){const t=j(a).map(s=>`<td class="summary-matrix-mass-band${$(s,a)}${I(s.massStatus)}" colspan="${s.span}">${A(s)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${e(r("summary.mass"))}</th>
      ${t}
    </tr>
  `}function Q(a,t){if(t||a.mealTypeId!=="breakfast")return"";const s=a.breakfastPlanned===!0,n=r(s?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${s?"yes":"no"}"><span aria-hidden="true">${s?"✓":"×"}</span>${e(n)}</span>`}function k(a){if(a.specialDiets.participantCount===0)return p(r("summary.noDiet"));const t=[...a.specialDiets.items].sort((s,n)=>y(s.tag).localeCompare(y(n.tag),x(),{numeric:!0}));return g(t)}function N(a){return a.specialDiets.participantCount===0?p(r("summary.noDiet")):g(a.specialDiets.items," summary-matrix-kitchen-diets")}function g(a,t=""){const s=[...a].sort((n,i)=>y(n.tag).localeCompare(y(i.tag),x(),{numeric:!0}));return`<ul class="summary-matrix-diets${t}">${s.map(n=>{const i=y(n.tag),m=Math.max(0,Math.floor(Number(n.count)||0)),o=m>1?`${i} (${m})`:i;return`<li>${e(o)}</li>`}).join("")}</ul>`}function y(a){const t=z(a);return/^\d+$/.test(t)?t:q(t)}function T(a,{compactActions:t=!1}={}){return a.names.length===0?p(r("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(s=>{const n=s.dietTags.map(c=>y(c)),i=V(s.phone),m=e(s.displayName),o=n.length?` <small>(${e(n.join(", "))})</small>`:"",l=`<span class="summary-matrix-person-name">${m}${o}</span>`,u=s.phoneConsent&&i?`<a class="summary-matrix-call" href="tel:${e(i)}" aria-label="${e(r("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",f=s.whatsappEnabled&&s.phoneConsent&&i?`<a class="summary-matrix-whatsapp" href="https://wa.me/${e(i.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${e(r("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(t&&(u||f)){const c=`summary-contact-popup-${++G}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${c}" aria-haspopup="dialog" aria-label="${e(r("summary.contactPerson",{name:s.displayName}))}" title="${e(r("summary.contactPerson",{name:s.displayName}))}">${l}</button>
            <span class="summary-matrix-contact-popover" id="${c}" popover role="dialog" aria-label="${e(r("summary.contactPerson",{name:s.displayName}))}">
              <span class="summary-matrix-contact-actions">${u}${f}</span>
            </span>
          </li>`}return`<li>${l}<span class="summary-matrix-contact-actions">${u}${f}</span></li>`}).join("")}</ul>`}function V(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function X(a,{kitchen:t,activeIndex:s}){const n=t?"kitchen":"summary",i=a.index===s;return`
    <section class="summary-matrix-screen summary-international-screen${Z(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${n}-screen="${a.index}" role="tabpanel" aria-hidden="${!i}">
      ${t?`<h2 class="sr-only">${e(`${r("kitchen.title")}: ${r(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${e(a.dateId)}">${e(R(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map(o=>aa(o,{kitchen:t})).join("")}
      </div>
      ${a.hasMassInformation?ta(a,t):""}
      ${t?B(a):""}
    </section>
  `}function Z(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function aa(a,{kitchen:t}){const s=t?N(a):k(a);return`
    <article class="summary-international-card summary-day-tone-${L(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${w(a.mealTypeId)}</span>
        <div><strong>${e(M(a))}</strong><time datetime="${e(a.dateId)}">${e(b(a.dateId))}</time></div>
        ${a.guestCount>0?`<span class="summary-international-mobile-guests">${e(r("summary.guests"))}: <strong>${a.guestCount}</strong></span>`:""}
      </header>
      <dl>
        ${a.guestCount>0?`<div class="summary-international-guest-row"><dt>${e(r("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${e(r("summary.diningMeals"))}</dt><dd>${C(a)}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${e(r("summary.includedDiets"))}</dt><dd>${s}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${e(r("summary.sickMeals"))}</dt><dd>${S(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${e(r("summary.sickDiets"))}</dt><dd>${D(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${e(r("summary.names"))}</h3>${T(a,{compactActions:!0})}</section>`}
    </article>
  `}function ta(a,t){const s=j(a);return s.length===0?"":`
    <section class="summary-international-mass${t?" summary-international-mass-kitchen":""}">
      <div class="summary-international-mass-segments">
        ${s.map((n,i)=>`
          <div class="summary-international-mass-group${i===0?" summary-international-mass-group-first":""}${$(n,a)}${I(n.massStatus)}" style="--mass-segment-span:${n.span}">
            ${i===0?`<strong class="summary-international-mass-title">${e(r("summary.mass"))}</strong>`:""}
            <div class="summary-international-mass-segment">
              ${A(n)}
            </div>
          </div>`).join("")}
      </div>
    </section>`}function j(a){return a.dateGroups.map(t=>{const s=a.columns.find(n=>n.dateId===t.dateId);return{...t,massStatus:s?.dayMassStatus||"UNKNOWN"}})}function B(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${e(r("kitchen.notes.title"))}">
      <h3>${e(r("kitchen.notes.title"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${e(t.dateId)}">${e(b(t.dateId))}</time>
          <ul>${t.notes.map(s=>`<li><p>${e(s.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function p(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${e(a)}</span>`}function sa(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function A(a){return`
    <span class="summary-mass-control">
      <span class="summary-mass-control-day">${e(P(a.dayIndex))}</span>
      <span class="summary-mass-control-state">${Y(a)}</span>
    </span>`}function $(a,t){return`${sa(a,t)} summary-day-tone-${L(a.dayIndex)}`}function L(a){return Math.max(0,Math.min(2,Number(a)||0))}function P(a){return[r("summary.today"),r("summary.tomorrow"),r("summary.dayAfterTomorrow")][a]||r("summary.followingDay")}function b(a){const[t,s,n]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(x(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,s-1,n))}function R(a){const[t,s,n]=String(a).split("-").map(Number);return!t||!s||!n?"":new Intl.DateTimeFormat(x(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,s-1,n))}function ea(a,t){const s=[...a.querySelectorAll(`[data-${t}-screen]`)];if(s.length===0)return 0;const n=s.reduce((i,m)=>Math.abs(m.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(i.getBoundingClientRect().left-a.getBoundingClientRect().left)?m:i);return Number(n.dataset[`${t}Screen`])===1?1:0}function K(a,t,s){a.querySelectorAll(`[data-${t}-screen]`).forEach(n=>{n.setAttribute("aria-hidden",String(Number(n.dataset[`${t}Screen`])!==s))})}export{oa as mountSummaryMatrix,O as scrollSummaryMatrix};

import{t as r,getLocale as x}from"./i18n/i18n.mjs?v=20260816b";import{escapeHtml as e}from"./html-utils.js?v=20260816b";import{formatDietLabel as y}from"./diet-utils.mjs?v=20260816b";import{buildKitchenMatrixScreens as R,buildSummaryMatrixScreens as q}from"./summary-matrix-model.js?v=20260816b";let E=0;function ra(a,{days:t=[],operationDays:s=[],kitchen:n=!1,layout:m="classic",activeIndex:i=0,onActiveIndexChange:o=()=>{}}={}){const l=n?R(t,s):q(t,[],s);if(l.every(c=>c.columns.length===0)){a.innerHTML=`<p class="empty-state">${e(r("summary.noMeal"))}</p>`;return}const u=n?"kitchen":"summary",f=m==="international"?_:G;a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${m}${n?" summary-layout-kitchen":" summary-layout-diners"}" data-${u}-matrix-track aria-label="${e(r("summary.screensLabel"))}">
      ${l.map(c=>f(c,{kitchen:n,activeIndex:i})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${e(r("summary.swipeHint"))}</p>
  `;const d=a.querySelector(`[data-${u}-matrix-track]`);let w=0;d.addEventListener("scroll",()=>{window.clearTimeout(w),w=window.setTimeout(()=>{const c=Z(d,u);K(a,u,c),o(c)},100)},{passive:!0}),window.requestAnimationFrame(()=>{z(a,i,{kitchen:n,smooth:!1})})}function z(a,t,{kitchen:s=!1,smooth:n=!0}={}){const m=s?"kitchen":"summary",i=Number(t)===1?1:0,o=a?.querySelector(`[data-${m}-matrix-track]`),l=o?.querySelector(`[data-${m}-screen="${i}"]`);return!o||!l?!1:(o.scrollTo({left:o.scrollLeft+l.getBoundingClientRect().left-o.getBoundingClientRect().left,behavior:n?"smooth":"auto"}),K(a,m,i),!0)}function G(a,{kitchen:t,activeIndex:s}){const n=t?"kitchen":"summary",m=a.index===s;return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${n}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
        <p class="empty-state">${e(r("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${n}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
      <table class="summary-matrix">
        ${H(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(i=>i.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${e(r("summary.item"))}</span></th>
            ${a.dateGroups.map(i=>`
              <th class="summary-matrix-date-heading${$(i,a)}" scope="colgroup" colspan="${i.span}">
                <span>${e(g(i.dayIndex))}</span>
                <time datetime="${e(i.dateId)}">${e(b(i.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(i=>`
              <th class="summary-matrix-meal-heading${$(i,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${S(i.mealTypeId)}</span><span class="summary-matrix-meal-label">${e(v(i))}</span>${W(i,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?h(r("summary.guests"),"summary-matrix-row-guests",a,i=>String(i.guestCount)):""}
          ${h(r("summary.diningMeals"),"summary-matrix-row-meals",a,C)}
          ${a.hasSpecialDiets?h(r("summary.includedDiets"),"summary-matrix-row-diets",a,t?T:N):""}
          ${a.hasSickMeals?h(r("summary.sickMeals"),"summary-matrix-row-sick",a,D):""}
          ${a.hasSickDiets?h(r("summary.sickDiets"),"summary-matrix-row-sick-diets",a,I):""}
          ${a.hasMassInformation?F(a):""}
          ${t?"":O(a)}
        </tbody>
      </table>
      ${t?L(a):""}
    </section>
  `}function H(a,t){return t?`<caption class="sr-only">${e(`${r("kitchen.title")}: ${r(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${e(a.dateId)}">${e(P(a.dateId))}</time>
    </caption>
  `}function S(a){return{breakfast:"☕",lunch:"🍝",dinner:"🍽"}[a]||"•"}function v(a){const t=String(a?.mealTypeId||"").trim().toLowerCase(),s=t?r(`meal.type.${t}`):"",n=String(a?.label||"").trim();return s&&s!==`meal.type.${t}`?s:n}function h(a,t,s,n){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${e(a)}</th>
      ${s.columns.map(m=>`<td class="${$(m,s).trim()}">${n(m)}</td>`).join("")}
    </tr>
  `}function C(a){const t=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${e(r(t))}</span>`}function D(a){if(a.sickCount===0)return p(r("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${e(r(t))}</span>`}function I(a){return a.sickDiets.length===0?p(r("summary.noDiet")):`<ul class="summary-matrix-diets">${a.sickDiets.map(t=>`<li>${e(y(t))}</li>`).join("")}</ul>`}function k(a){if(a.massStatus==="UNKNOWN")return p(r("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${e(r(t?"summary.yes":"summary.no"))}</span>`}function O(a){return`
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
      ${a.columns.map(t=>`<td class="${$(t,a).trim()}">${j(t,{compactActions:!0})}</td>`).join("")}
    </tr>
  `}function M(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function F(a){const t=B(a).map(s=>`<td class="summary-matrix-mass-band${$(s,a)}${M(s.massStatus)}" colspan="${s.span}"><span class="summary-matrix-mass-day">${e(g(s.dayIndex))}</span>${k(s)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${e(r("summary.mass"))}</th>
      ${t}
    </tr>
  `}function W(a,t){if(t||a.mealTypeId!=="breakfast")return"";const s=a.breakfastPlanned===!0,n=r(s?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${s?"yes":"no"}"><span aria-hidden="true">${s?"✓":"×"}</span>${e(n)}</span>`}function N(a){return a.specialDiets.participantCount===0?p(r("summary.noDiet")):`<ul class="summary-matrix-diets">${[...a.specialDiets.items].sort((s,n)=>y(s.tag).localeCompare(y(n.tag),x())).map(s=>`<li>${e(y(s.tag))}</li>`).join("")}</ul>`}function T(a){return a.specialDiets.participantCount===0?p(r("summary.noDiet")):`<ul class="summary-matrix-diets summary-matrix-kitchen-diets">${[...new Set(a.specialDiets.items.map(s=>U(s.tag)))].sort((s,n)=>s.localeCompare(n,x())).map(s=>`<li>${e(s)}</li>`).join("")}</ul>`}function U(a){const t=String(a||"").trim();return/^\d+$/.test(t)?t:y(t)}function j(a,{compactActions:t=!1}={}){return a.names.length===0?p(r("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(s=>{const n=s.dietTags.map(d=>y(d)),m=Y(s.phone),i=e(s.displayName),o=n.length?` <small>(${e(n.join(", "))})</small>`:"",l=`<span class="summary-matrix-person-name">${i}${o}</span>`,u=s.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${e(m)}" aria-label="${e(r("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",f=s.whatsappEnabled&&s.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${e(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${e(r("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(t&&(u||f)){const d=`summary-contact-popup-${++E}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${d}" aria-haspopup="dialog" aria-label="${e(r("summary.contactPerson",{name:s.displayName}))}" title="${e(r("summary.contactPerson",{name:s.displayName}))}">${l}</button>
            <span class="summary-matrix-contact-popover" id="${d}" popover role="dialog" aria-label="${e(r("summary.contactPerson",{name:s.displayName}))}">
              <span class="summary-matrix-contact-actions">${u}${f}</span>
            </span>
          </li>`}return`<li>${l}<span class="summary-matrix-contact-actions">${u}${f}</span></li>`}).join("")}</ul>`}function Y(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function _(a,{kitchen:t,activeIndex:s}){const n=t?"kitchen":"summary",m=a.index===s;return`
    <section class="summary-matrix-screen summary-international-screen${J(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${n}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
      ${t?`<h2 class="sr-only">${e(`${r("kitchen.title")}: ${r(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${e(a.dateId)}">${e(P(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map(o=>Q(o,{kitchen:t})).join("")}
      </div>
      ${a.hasMassInformation?V(a,t):""}
      ${t?L(a):""}
    </section>
  `}function J(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function Q(a,{kitchen:t}){const s=t?T(a):N(a);return`
    <article class="summary-international-card summary-day-tone-${A(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${S(a.mealTypeId)}</span>
        <div><strong>${e(v(a))}</strong><time datetime="${e(a.dateId)}">${e(b(a.dateId))}</time></div>
      </header>
      <dl>
        ${a.guestCount>0?`<div><dt>${e(r("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${e(r("summary.diningMeals"))}</dt><dd>${C(a)}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${e(r("summary.includedDiets"))}</dt><dd>${s}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${e(r("summary.sickMeals"))}</dt><dd>${D(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${e(r("summary.sickDiets"))}</dt><dd>${I(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${e(r("summary.names"))}</h3>${j(a)}</section>`}
    </article>
  `}function V(a,t){const s=B(a);return s.length===0?"":`
    <section class="summary-international-mass${t?" summary-international-mass-kitchen":""}">
      <div class="summary-international-mass-segments">
        ${s.map((n,m)=>`
          <div class="summary-international-mass-group${m===0?" summary-international-mass-group-first":""}${$(n,a)}${M(n.massStatus)}" style="--mass-segment-span:${n.span}">
            ${m===0?`<strong class="summary-international-mass-title">${e(r("summary.mass"))}</strong>`:""}
            <div class="summary-international-mass-segment">
              <span>${e(g(n.dayIndex))}</span>
              ${k(n)}
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
  `}function p(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${e(a)}</span>`}function X(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function $(a,t){return`${X(a,t)} summary-day-tone-${A(a.dayIndex)}`}function A(a){return Math.max(0,Math.min(2,Number(a)||0))}function g(a){return[r("summary.today"),r("summary.tomorrow"),r("summary.dayAfterTomorrow")][a]||r("summary.followingDay")}function b(a){const[t,s,n]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(x(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,s-1,n))}function P(a){const[t,s,n]=String(a).split("-").map(Number);return!t||!s||!n?"":new Intl.DateTimeFormat(x(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,s-1,n))}function Z(a,t){const s=[...a.querySelectorAll(`[data-${t}-screen]`)];if(s.length===0)return 0;const n=s.reduce((m,i)=>Math.abs(i.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(m.getBoundingClientRect().left-a.getBoundingClientRect().left)?i:m);return Number(n.dataset[`${t}Screen`])===1?1:0}function K(a,t,s){a.querySelectorAll(`[data-${t}-screen]`).forEach(n=>{n.setAttribute("aria-hidden",String(Number(n.dataset[`${t}Screen`])!==s))})}export{ra as mountSummaryMatrix,z as scrollSummaryMatrix};

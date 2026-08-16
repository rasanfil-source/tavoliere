import{t as n,getLocale as x}from"./i18n/i18n.mjs?v=20260816j";import{escapeHtml as e}from"./html-utils.js?v=20260816g";import{formatDietLabel as q,normalizeDietCode as E}from"./diet-utils.mjs?v=20260816g";import{buildKitchenMatrixScreens as z,buildSummaryMatrixScreens as G}from"./summary-matrix-model.js?v=20260816g";let H=0;function ia(a,{days:t=[],operationDays:s=[],kitchen:r=!1,layout:m="classic",activeIndex:i=0,onActiveIndexChange:o=()=>{}}={}){const l=r?z(t,s):G(t,[],s);if(l.every(c=>c.columns.length===0)){a.innerHTML=`<p class="empty-state">${e(n("summary.noMeal"))}</p>`;return}const u=r?"kitchen":"summary",f=m==="international"?V:F;a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${m}${r?" summary-layout-kitchen":" summary-layout-diners"}" data-${u}-matrix-track aria-label="${e(n("summary.screensLabel"))}">
      ${l.map(c=>f(c,{kitchen:r,activeIndex:i})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${e(n("summary.swipeHint"))}</p>
  `;const d=a.querySelector(`[data-${u}-matrix-track]`);let w=0;d.addEventListener("scroll",()=>{window.clearTimeout(w),w=window.setTimeout(()=>{const c=sa(d,u);K(a,u,c),o(c)},100)},{passive:!0}),window.requestAnimationFrame(()=>{O(a,i,{kitchen:r,smooth:!1})})}function O(a,t,{kitchen:s=!1,smooth:r=!0}={}){const m=s?"kitchen":"summary",i=Number(t)===1?1:0,o=a?.querySelector(`[data-${m}-matrix-track]`),l=o?.querySelector(`[data-${m}-screen="${i}"]`);return!o||!l?!1:(o.scrollTo({left:o.scrollLeft+l.getBoundingClientRect().left-o.getBoundingClientRect().left,behavior:r?"smooth":"auto"}),K(a,m,i),!0)}function F(a,{kitchen:t,activeIndex:s}){const r=t?"kitchen":"summary",m=a.index===s;return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${r}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
        <p class="empty-state">${e(n("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${r}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
      <table class="summary-matrix">
        ${W(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(i=>i.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${e(n("summary.item"))}</span></th>
            ${a.dateGroups.map(i=>`
              <th class="summary-matrix-date-heading${$(i,a)}" scope="colgroup" colspan="${i.span}">
                <span>${e(P(i.dayIndex))}</span>
                <time datetime="${e(i.dateId)}">${e(b(i.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(i=>`
              <th class="summary-matrix-meal-heading${$(i,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${v(i.mealTypeId)}</span><span class="summary-matrix-meal-label">${e(C(i))}</span>${J(i,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?h(n("summary.guests"),"summary-matrix-row-guests",a,i=>String(i.guestCount)):""}
          ${h(n("summary.diningMeals"),"summary-matrix-row-meals",a,D)}
          ${a.hasSpecialDiets?h(n("summary.includedDiets"),"summary-matrix-row-diets",a,t?N:M):""}
          ${a.hasSickMeals?h(n("summary.sickMeals"),"summary-matrix-row-sick",a,S):""}
          ${a.hasSickDiets?h(n("summary.sickDiets"),"summary-matrix-row-sick-diets",a,I):""}
          ${a.hasMassInformation?_(a):""}
          ${t?"":Y(a)}
        </tbody>
      </table>
      ${t?B(a):""}
    </section>
  `}function W(a,t){return t?`<caption class="sr-only">${e(`${n("kitchen.title")}: ${n(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${e(a.dateId)}">${e(R(a.dateId))}</time>
    </caption>
  `}function v(a){return{breakfast:"☕",lunch:"🍝",dinner:"🍲"}[a]||"•"}function C(a){const t=String(a?.mealTypeId||"").trim().toLowerCase(),s=t?n(`meal.type.${t}`):"",r=String(a?.label||"").trim();return s&&s!==`meal.type.${t}`?s:r}function h(a,t,s,r){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${e(a)}</th>
      ${s.columns.map(m=>`<td class="${$(m,s).trim()}">${r(m)}</td>`).join("")}
    </tr>
  `}function D(a){const t=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${e(n(t))}</span>`}function S(a){if(a.sickCount===0)return p(n("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${e(n(t))}</span>`}function I(a){return a.sickDiets.length===0?p(n("summary.noDiet")):g(a.sickDiets)}function U(a){if(a.massStatus==="UNKNOWN")return p(n("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${e(n(t?"summary.yes":"summary.no"))}</span>`}function Y(a){return`
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
        <span class="sr-only">${e(n("summary.names"))}</span>
      </th>
      ${a.columns.map(t=>`<td class="${$(t,a).trim()}">${T(t,{compactActions:!0})}</td>`).join("")}
    </tr>
  `}function k(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function _(a){const t=j(a).map(s=>`<td class="summary-matrix-mass-band${$(s,a)}${k(s.massStatus)}" colspan="${s.span}">${A(s)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${e(n("summary.mass"))}</th>
      ${t}
    </tr>
  `}function J(a,t){if(t||a.mealTypeId!=="breakfast")return"";const s=a.breakfastPlanned===!0,r=n(s?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${s?"yes":"no"}"><span aria-hidden="true">${s?"✓":"×"}</span>${e(r)}</span>`}function M(a){if(a.specialDiets.participantCount===0)return p(n("summary.noDiet"));const t=[...a.specialDiets.items].sort((s,r)=>y(s.tag).localeCompare(y(r.tag),x(),{numeric:!0}));return g(t)}function N(a){return a.specialDiets.participantCount===0?p(n("summary.noDiet")):g(a.specialDiets.items," summary-matrix-kitchen-diets")}function g(a,t=""){const s=[...a].sort((r,m)=>y(r.tag).localeCompare(y(m.tag),x(),{numeric:!0}));return`<ul class="summary-matrix-diets${t}">${s.map(r=>{const m=y(r.tag),i=Math.max(0,Math.floor(Number(r.count)||0)),o=i>1?`${m} (${i})`:m;return`<li>${e(o)}</li>`}).join("")}</ul>`}function y(a){const t=E(a);return/^\d+$/.test(t)?t:q(t)}function T(a,{compactActions:t=!1}={}){return a.names.length===0?p(n("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(s=>{const r=s.dietTags.map(d=>y(d)),m=Q(s.phone),i=e(s.displayName),o=r.length?` <small>(${e(r.join(", "))})</small>`:"",l=`<span class="summary-matrix-person-name">${i}${o}</span>`,u=s.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${e(m)}" aria-label="${e(n("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",f=s.whatsappEnabled&&s.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${e(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${e(n("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(t&&(u||f)){const d=`summary-contact-popup-${++H}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${d}" aria-haspopup="dialog" aria-label="${e(n("summary.contactPerson",{name:s.displayName}))}" title="${e(n("summary.contactPerson",{name:s.displayName}))}">${l}</button>
            <span class="summary-matrix-contact-popover" id="${d}" popover role="dialog" aria-label="${e(n("summary.contactPerson",{name:s.displayName}))}">
              <span class="summary-matrix-contact-actions">${u}${f}</span>
            </span>
          </li>`}return`<li>${l}<span class="summary-matrix-contact-actions">${u}${f}</span></li>`}).join("")}</ul>`}function Q(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function V(a,{kitchen:t,activeIndex:s}){const r=t?"kitchen":"summary",m=a.index===s;return`
    <section class="summary-matrix-screen summary-international-screen${X(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${r}-screen="${a.index}" role="tabpanel" aria-hidden="${!m}">
      ${t?`<h2 class="sr-only">${e(`${n("kitchen.title")}: ${n(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${e(a.dateId)}">${e(R(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map(o=>Z(o,{kitchen:t})).join("")}
      </div>
      ${a.hasMassInformation?aa(a,t):""}
      ${t?B(a):""}
    </section>
  `}function X(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function Z(a,{kitchen:t}){const s=t?N(a):M(a);return`
    <article class="summary-international-card summary-day-tone-${L(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${v(a.mealTypeId)}</span>
        <div><strong>${e(C(a))}</strong><time datetime="${e(a.dateId)}">${e(b(a.dateId))}</time></div>
      </header>
      <dl>
        ${a.guestCount>0?`<div><dt>${e(n("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${e(n("summary.diningMeals"))}</dt><dd>${D(a)}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${e(n("summary.includedDiets"))}</dt><dd>${s}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${e(n("summary.sickMeals"))}</dt><dd>${S(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${e(n("summary.sickDiets"))}</dt><dd>${I(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${e(n("summary.names"))}</h3>${T(a,{compactActions:!0})}</section>`}
    </article>
  `}function aa(a,t){const s=j(a);return s.length===0?"":`
    <section class="summary-international-mass${t?" summary-international-mass-kitchen":""}">
      <div class="summary-international-mass-segments">
        ${s.map((r,m)=>`
          <div class="summary-international-mass-group${m===0?" summary-international-mass-group-first":""}${$(r,a)}${k(r.massStatus)}" style="--mass-segment-span:${r.span}">
            ${m===0?`<strong class="summary-international-mass-title">${e(n("summary.mass"))}</strong>`:""}
            <div class="summary-international-mass-segment">
              ${A(r)}
            </div>
          </div>`).join("")}
      </div>
    </section>`}function j(a){return a.dateGroups.map(t=>{const s=a.columns.find(r=>r.dateId===t.dateId);return{...t,massStatus:s?.dayMassStatus||"UNKNOWN"}})}function B(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${e(n("kitchen.notes"))}">
      <h3>${e(n("kitchen.notes"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${e(t.dateId)}">${e(b(t.dateId))}</time>
          <ul>${t.notes.map(s=>`<li><p>${e(s.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function p(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${e(a)}</span>`}function ta(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function A(a){return`
    <span class="summary-mass-control">
      <span class="summary-mass-control-day">${e(P(a.dayIndex))}</span>
      <span class="summary-mass-control-state">${U(a)}</span>
    </span>`}function $(a,t){return`${ta(a,t)} summary-day-tone-${L(a.dayIndex)}`}function L(a){return Math.max(0,Math.min(2,Number(a)||0))}function P(a){return[n("summary.today"),n("summary.tomorrow"),n("summary.dayAfterTomorrow")][a]||n("summary.followingDay")}function b(a){const[t,s,r]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(x(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,s-1,r))}function R(a){const[t,s,r]=String(a).split("-").map(Number);return!t||!s||!r?"":new Intl.DateTimeFormat(x(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,s-1,r))}function sa(a,t){const s=[...a.querySelectorAll(`[data-${t}-screen]`)];if(s.length===0)return 0;const r=s.reduce((m,i)=>Math.abs(i.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(m.getBoundingClientRect().left-a.getBoundingClientRect().left)?i:m);return Number(r.dataset[`${t}Screen`])===1?1:0}function K(a,t,s){a.querySelectorAll(`[data-${t}-screen]`).forEach(r=>{r.setAttribute("aria-hidden",String(Number(r.dataset[`${t}Screen`])!==s))})}export{ia as mountSummaryMatrix,O as scrollSummaryMatrix};

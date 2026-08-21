import{t as n,getLocale as b}from"./i18n/i18n.mjs?v=20260821ae";import{escapeHtml as s}from"./html-utils.js?v=20260816g";import{formatDietLabel as H,normalizeDietCode as O}from"./diet-utils.mjs?v=20260818w";import{buildKitchenMatrixScreens as U,buildSummaryMatrixScreens as G}from"./summary-matrix-model.js?v=20260820i";let I=0;function $a(a,{days:t=[],operationDays:e=[],kitchen:r=!1,layout:m="classic",residentLabel:o="name",activeIndex:i=0,onActiveIndexChange:u=()=>{}}={}){const l=r?U(t,e):G(t,[],e);if(m==="future"&&!r){Y(a,l,o,i,u);return}if(l.every(d=>d.columns.length===0)){a.innerHTML=`<p class="empty-state">${s(n("summary.noMeal"))}</p>`;return}const c=r?"kitchen":"summary",w=m==="international"?na:X;a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${m}${r?" summary-layout-kitchen":" summary-layout-diners"}" data-${c}-matrix-track aria-label="${s(n("summary.screensLabel"))}">
      ${l.map(d=>w(d,{kitchen:r,activeIndex:i,residentLabel:o})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${s(n("summary.swipeHint"))}</p>
  `;const g=a.querySelector(`[data-${c}-matrix-track]`);let p=0;g.addEventListener("scroll",()=>{window.clearTimeout(p),p=window.setTimeout(()=>{const d=la(g,c);z(a,c,d),u(d)},100)},{passive:!0}),window.requestAnimationFrame(()=>{V(a,i,{kitchen:r,smooth:!1})})}function Y(a,t,e,r=0,m=()=>{}){a.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${t.map(u=>`
        <article class="summary-future-card" data-summary-future-screen="${u.index}" aria-hidden="${u.index!==r}">
          <header class="summary-future-card-head">
            <strong>${s(n(u.labelKey))}</strong>
            <time datetime="${s(u.dateId)}">${s(D(u.dateId))}</time>
          </header>
          <div class="summary-future-meals">
            ${u.columns.map(l=>_(l,e)).join("")}
          </div>
          ${Q(u)}
        </article>
      `).join("")}
    </div>
  `;const o=a.querySelector("[data-summary-future-track]");let i=0;o?.addEventListener("scroll",()=>{window.clearTimeout(i),i=window.setTimeout(()=>{const u=Math.max(0,Math.min(1,Math.round(o.scrollLeft/Math.max(1,o.clientWidth+14))));o.querySelectorAll("[data-summary-future-screen]").forEach(l=>{l.setAttribute("aria-hidden",String(Number(l.dataset.summaryFutureScreen)!==u))}),m(u)},100)},{passive:!0}),window.requestAnimationFrame(()=>{o&&o.scrollTo({left:Math.max(0,r)*(o.clientWidth+14),behavior:"auto"})})}function _(a,t){const e=Array.isArray(a.names)?a.names:[],r=Number(a.specialDiets?.participantCount||0),m=Number(a.guestCount||0),o=Number(a.sickCount||0),i=Array.isArray(a.sickDiets)?a.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${S(a.mealTypeId)}</span>
        <span class="summary-future-meal-name">${s(M(a))}</span>
        <strong class="summary-future-meal-total">${s(String(a.total||0))}</strong>
      </div>
      ${m>0?N("summary.guests",m,"guests"):""}
      ${r?`<p class="summary-future-diets">${s(n("week.operations.diet.count",{count:r}))}</p>`:""}
      ${o>0?N("summary.sickMeals",o,"sick"):""}
      ${i.length>0?`<div class="summary-future-special-row"><span>${s(n("summary.sickDiets"))}</span><div>${v(i," summary-future-diet-list")}</div></div>`:""}
      ${e.length?`<div class="summary-future-people">${e.map(u=>J(u,t)).join("")}</div>`:""}
    </section>
  `}function N(a,t,e){return e==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${s(String(t))}</strong><span>${s(n(a))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${s(e)}"><span>${s(n(a))}</span><strong>${s(String(t))}</strong></p>`}function J(a,t){const e=String(a.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(c=>c[0]).join("").toUpperCase(),r=t==="signature"?a.signature||a.displayName:t==="initials"?a.initials||e||a.signature:a.displayName,m=Array.isArray(a.dietTags)?a.dietTags.map(c=>y(c)).filter(Boolean):[],o=`${s(r||"–")}${m.length?`&nbsp;<small>(${s(m.join(", "))})</small>`:""}`,i=E(a.phone),u=a.phoneConsent&&i?`<a class="summary-matrix-call" href="tel:${s(i)}" aria-label="${s(n("summary.callPerson",{name:a.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",l=a.whatsappEnabled&&a.phoneConsent&&i?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(i.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(n("summary.messagePerson",{name:a.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(u||l){const c=`summary-contact-popup-${++I}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${c}" aria-haspopup="dialog" aria-label="${s(n("summary.contactPerson",{name:a.displayName}))}">${o}</button><span class="summary-matrix-contact-popover" id="${c}" popover role="dialog"><span class="summary-matrix-contact-actions">${u}${l}</span></span></span>`}return`<span class="summary-future-person" title="${s(a.displayName||r)}">${o}</span>`}function Q(a){const t=a.columns.find(m=>m.dayIndex===a.index)?.dayMassStatus;if(!t||t==="UNKNOWN")return"";const e=t==="YES",r=C(Math.min(2,Number(a.index||0)+1));return`<div class="summary-future-mass"><span>${s(n("summary.mass"))}</span><strong class="summary-future-mass-${e?"yes":"no"}">${s(n(e?"summary.yes":"summary.no"))}<small>(${s(r)})</small></strong></div>`}function V(a,t,{kitchen:e=!1,smooth:r=!0}={}){const m=e?"kitchen":"summary",o=Number(t)===1?1:0;if(!e){const l=a?.querySelector("[data-summary-future-track]");if(l)return l.scrollTo({left:o*(l.clientWidth+14),behavior:r?"smooth":"auto"}),l.querySelectorAll("[data-summary-future-screen]").forEach(c=>{c.setAttribute("aria-hidden",String(Number(c.dataset.summaryFutureScreen)!==o))}),!0}const i=a?.querySelector(`[data-${m}-matrix-track]`),u=i?.querySelector(`[data-${m}-screen="${o}"]`);return!i||!u?!1:(i.scrollTo({left:i.scrollLeft+u.getBoundingClientRect().left-i.getBoundingClientRect().left,behavior:r?"smooth":"auto"}),z(a,m,o),!0)}function X(a,{kitchen:t,activeIndex:e,residentLabel:r="name"}){const m=t?"kitchen":"summary",o=a.index===e;return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!o}">
        <p class="empty-state">${s(n("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!o}">
      <table class="summary-matrix">
        ${Z(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(i=>i.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${s(n("summary.item"))}</span></th>
            ${a.dateGroups.map(i=>`
              <th class="summary-matrix-date-heading${h(i,a)}" scope="colgroup" colspan="${i.span}">
                <span>${s(C(i.dayIndex))}</span>
                <time datetime="${s(i.dateId)}">${s(k(i.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(i=>`
              <th class="summary-matrix-meal-heading${h(i,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${S(i.mealTypeId)}</span><span class="summary-matrix-meal-label">${s(M(i))}</span>${ra(i,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?x(n("summary.guests"),"summary-matrix-row-guests",a,i=>String(i.guestCount)):""}
          ${x(n("summary.diningMeals"),"summary-matrix-row-meals",a,T)}
          ${a.hasSpecialDiets?x(n("summary.includedDiets"),"summary-matrix-row-diets",a,t?P:L):""}
          ${a.hasSickMeals?x(n("summary.sickMeals"),"summary-matrix-row-sick",a,A):""}
          ${a.hasSickDiets?x(n("summary.sickDiets"),"summary-matrix-row-sick-diets",a,j):""}
          ${a.hasMassInformation?ea(a):""}
          ${t?"":sa(a,r)}
        </tbody>
      </table>
      ${t?K(a):""}
    </section>
  `}function Z(a,t){return t?`<caption class="sr-only">${s(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${s(a.dateId)}">${s(D(a.dateId))}</time>
    </caption>
  `}function S(a){const t={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return aa({breakfast:"coffee",lunch:"sun",dinner:"moon"}[a],t[a]||"•")}function aa(a,t="•"){const e=document.documentElement.dataset.interfaceStyle;if(!(e==="cool"||e==="urban"||e==="future")||!a)return t;const o={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[a];return o?`<svg class="meal-line-icon meal-line-icon-${a}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${o}</svg>`:t}function M(a){const t=String(a?.mealTypeId||"").trim().toLowerCase(),e=t?n(`meal.type.${t}`):"",r=String(a?.label||"").trim();return e&&e!==`meal.type.${t}`?e:r}function x(a,t,e,r){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${s(a)}</th>
      ${e.columns.map(m=>`<td class="${h(m,e).trim()}">${r(m)}</td>`).join("")}
    </tr>
  `}function T(a){const t=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${s(n(t))}</span>`}function A(a){if(a.sickCount===0)return f(n("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${s(n(t))}</span>`}function j(a){return a.sickDiets.length===0?f(n("summary.noDiet")):v(a.sickDiets)}function ta(a){if(a.massStatus==="UNKNOWN")return f(n("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${s(n(t?"summary.yes":"summary.no"))}</span>`}function sa(a,t="name"){return`
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
      ${a.columns.map(e=>`<td class="${h(e,a).trim()}">${q(e,{compactActions:!0,residentLabel:t})}</td>`).join("")}
    </tr>
  `}function B(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function ea(a){const t=F(a).map(e=>`<td class="summary-matrix-mass-band${h(e,a)}${B(e.massStatus)}" colspan="${e.span}">${R(e)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${s(n("summary.mass"))}</th>
      ${t}
    </tr>
  `}function ra(a,t){if(t||a.mealTypeId!=="breakfast")return"";const e=a.breakfastPlanned===!0,r=n(e?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${e?"yes":"no"}"><span aria-hidden="true">${e?"✓":"×"}</span>${s(r)}</span>`}function L(a){if(a.specialDiets.participantCount===0)return f(n("summary.noDiet"));const t=[...a.specialDiets.items].sort((e,r)=>y(e.tag).localeCompare(y(r.tag),b(),{numeric:!0}));return v(t)}function P(a){return a.specialDiets.participantCount===0?f(n("summary.noDiet")):v(a.specialDiets.items," summary-matrix-kitchen-diets")}function v(a,t=""){const e=[...a].sort((r,m)=>y(r.tag).localeCompare(y(m.tag),b(),{numeric:!0}));return`<ul class="summary-matrix-diets${t}">${e.map(r=>{const m=y(r.tag),o=Math.max(0,Math.floor(Number(r.count)||0)),i=o>1?`${m} (${o})`:m;return`<li>${s(i)}</li>`}).join("")}</ul>`}function y(a){const t=O(a);return/^\d+$/.test(t)?t:H(t)}function q(a,{compactActions:t=!1,residentLabel:e="name"}={}){return a.names.length===0?f(n("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(r=>{const m=r.dietTags.map($=>y($)),o=E(r.phone),i=String(r.displayName||"").trim(),u=i.split(/\s+/).filter(Boolean).slice(0,3).map($=>$[0]).join("").toUpperCase(),l=e==="signature"?r.signature||i:e==="initials"&&(r.initials||u||r.signature)||i,c=s(l),w=m.length?` <small>(${s(m.join(", "))})</small>`:"",g=`<span class="summary-matrix-person-name">${c}${w}</span>`,p=r.phoneConsent&&o?`<a class="summary-matrix-call" href="tel:${s(o)}" aria-label="${s(n("summary.callPerson",{name:r.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",d=r.whatsappEnabled&&r.phoneConsent&&o?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(o.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(n("summary.messagePerson",{name:r.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(t&&(p||d)){const $=`summary-contact-popup-${++I}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${$}" aria-haspopup="dialog" aria-label="${s(n("summary.contactPerson",{name:r.displayName}))}" title="${s(n("summary.contactPerson",{name:r.displayName}))}">${g}</button>
            <span class="summary-matrix-contact-popover" id="${$}" popover role="dialog" aria-label="${s(n("summary.contactPerson",{name:r.displayName}))}">
              <span class="summary-matrix-contact-actions">${p}${d}</span>
            </span>
          </li>`}return`<li>${g}<span class="summary-matrix-contact-actions">${p}${d}</span></li>`}).join("")}</ul>`}function E(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function na(a,{kitchen:t,activeIndex:e,residentLabel:r="name"}){const m=t?"kitchen":"summary",o=a.index===e;return`
    <section class="summary-matrix-screen summary-international-screen${ia(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!o}">
      ${t?`<h2 class="sr-only">${s(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${s(a.dateId)}">${s(D(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map(u=>ma(u,{kitchen:t,residentLabel:r})).join("")}
      </div>
      ${a.hasMassInformation?oa(a,t):""}
      ${t?K(a):""}
    </section>
  `}function ia(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function ma(a,{kitchen:t,residentLabel:e="name"}){const r=t?P(a):L(a);return`
    <article class="summary-international-card summary-day-tone-${W(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${S(a.mealTypeId)}</span>
        <div><strong>${s(M(a))}</strong><time datetime="${s(a.dateId)}">${s(k(a.dateId))}</time></div>
        ${a.guestCount>0?`<span class="summary-international-mobile-guests">${s(n("summary.guests"))}: <strong>${a.guestCount}</strong></span>`:""}
      </header>
      <dl>
        ${a.guestCount>0?`<div class="summary-international-guest-row"><dt>${s(n("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${s(n("summary.diningMeals"))}</dt><dd>${T(a)}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${s(n("summary.includedDiets"))}</dt><dd>${r}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${s(n("summary.sickMeals"))}</dt><dd>${A(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${s(n("summary.sickDiets"))}</dt><dd>${j(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${s(n("summary.names"))}</h3>${q(a,{compactActions:!0,residentLabel:e})}</section>`}
    </article>
  `}function oa(a,t){const e=F(a);return e.length===0?"":`
    <section class="summary-international-mass${t?" summary-international-mass-kitchen":""}">
      <div class="summary-international-mass-segments">
        ${e.map((r,m)=>`
          <div class="summary-international-mass-group${m===0?" summary-international-mass-group-first":""}${h(r,a)}${B(r.massStatus)}" style="--mass-segment-span:${r.span}">
            ${m===0?`<strong class="summary-international-mass-title">${s(n("summary.mass"))}</strong>`:""}
            <div class="summary-international-mass-segment">
              ${R(r)}
            </div>
          </div>`).join("")}
      </div>
    </section>`}function F(a){return a.dateGroups.map(t=>{const e=a.columns.find(r=>r.dateId===t.dateId);return{...t,massStatus:e?.dayMassStatus||"UNKNOWN"}})}function K(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${s(n("kitchen.notes.title"))}">
      <h3>${s(n("kitchen.notes.title"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${s(t.dateId)}">${s(k(t.dateId))}</time>
          <ul>${t.notes.map(e=>`<li><p>${s(e.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function f(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${s(a)}</span>`}function ua(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function R(a){return`
    <span class="summary-mass-control">
      <span class="summary-mass-control-day">${s(C(a.dayIndex))}</span>
      <span class="summary-mass-control-state">${ta(a)}</span>
    </span>`}function h(a,t){return`${ua(a,t)} summary-day-tone-${W(a.dayIndex)}`}function W(a){return Math.max(0,Math.min(2,Number(a)||0))}function C(a){return[n("summary.today"),n("summary.tomorrow"),n("summary.dayAfterTomorrow")][a]||n("summary.followingDay")}function k(a){const[t,e,r]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(b(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,e-1,r))}function D(a){const[t,e,r]=String(a).split("-").map(Number);return!t||!e||!r?"":new Intl.DateTimeFormat(b(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,e-1,r))}function la(a,t){const e=[...a.querySelectorAll(`[data-${t}-screen]`)];if(e.length===0)return 0;const r=e.reduce((m,o)=>Math.abs(o.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(m.getBoundingClientRect().left-a.getBoundingClientRect().left)?o:m);return Number(r.dataset[`${t}Screen`])===1?1:0}function z(a,t,e){a.querySelectorAll(`[data-${t}-screen]`).forEach(r=>{r.setAttribute("aria-hidden",String(Number(r.dataset[`${t}Screen`])!==e))})}export{$a as mountSummaryMatrix,V as scrollSummaryMatrix};

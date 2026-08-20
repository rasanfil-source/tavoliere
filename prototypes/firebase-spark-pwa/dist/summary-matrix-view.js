import{t as n,getLocale as b}from"./i18n/i18n.mjs?v=20260818aa";import{escapeHtml as r}from"./html-utils.js?v=20260816g";import{formatDietLabel as z,normalizeDietCode as H}from"./diet-utils.mjs?v=20260818w";import{buildKitchenMatrixScreens as O,buildSummaryMatrixScreens as U}from"./summary-matrix-model.js?v=20260817h";let G=0;function $a(a,{days:t=[],operationDays:e=[],kitchen:s=!1,layout:i="classic",residentLabel:o="name",activeIndex:m=0,onActiveIndexChange:u=()=>{}}={}){const h=s?O(t,e):U(t,[],e);if(i==="future"&&!s){W(a,h,o);return}if(h.every(l=>l.columns.length===0)){a.innerHTML=`<p class="empty-state">${r(n("summary.noMeal"))}</p>`;return}const c=s?"kitchen":"summary",C=i==="international"?na:V;a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${i}${s?" summary-layout-kitchen":" summary-layout-diners"}" data-${c}-matrix-track aria-label="${r(n("summary.screensLabel"))}">
      ${h.map(l=>C(l,{kitchen:s,activeIndex:m,residentLabel:o})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${r(n("summary.swipeHint"))}</p>
  `;const g=a.querySelector(`[data-${c}-matrix-track]`);let d=0;g.addEventListener("scroll",()=>{window.clearTimeout(d),d=window.setTimeout(()=>{const l=la(g,c);q(a,c,l),u(l)},100)},{passive:!0}),window.requestAnimationFrame(()=>{Q(a,m,{kitchen:s,smooth:!1})})}function W(a,t,e){a.innerHTML=`
    <div class="summary-future-grid">
      ${t.map(s=>`
        <article class="summary-future-card">
          <header class="summary-future-card-head">
            <strong>${r(n(s.labelKey))}</strong>
            <time datetime="${r(s.dateId)}">${r(k(s.dateId))}</time>
          </header>
          <div class="summary-future-meals">
            ${s.columns.map(i=>Y(i,e)).join("")}
          </div>
          ${J(s)}
        </article>
      `).join("")}
    </div>
  `}function Y(a,t){const e=Array.isArray(a.names)?a.names:[],s=Number(a.specialDiets?.participantCount||0),i=Number(a.guestCount||0),o=Number(a.sickCount||0),m=Array.isArray(a.sickDiets)?a.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${S(a.mealTypeId)}</span>
        <span class="summary-future-meal-name">${r(M(a))}</span>
        <strong class="summary-future-meal-total">${r(String(a.total||0))}</strong>
      </div>
      ${i>0?w("summary.guests",i,"guests"):""}
      ${s?`<p class="summary-future-diets">${r(n("week.operations.diet.count",{count:s}))}</p>`:""}
      ${o>0?w("summary.sickMeals",o,"sick"):""}
      ${m.length>0?`<div class="summary-future-special-row"><span>${r(n("summary.sickDiets"))}</span><div>${v(m," summary-future-diet-list")}</div></div>`:""}
      ${e.length?`<div class="summary-future-people">${e.map(u=>_(u,t)).join("")}</div>`:""}
    </section>
  `}function w(a,t,e){return`<p class="summary-future-metric summary-future-metric-${r(e)}"><span>${r(n(a))}</span><strong>${r(String(t))}</strong></p>`}function _(a,t){const e=String(a.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(i=>i[0]).join("").toUpperCase(),s=t==="signature"?a.signature||a.displayName:t==="initials"?a.initials||e||a.signature:a.displayName;return`<span class="summary-future-person" title="${r(a.displayName||s)}">${r(s||"–")}</span>`}function J(a){const t=a.columns.find(s=>s.dayIndex===a.index)?.dayMassStatus;if(!t||t==="UNKNOWN")return"";const e=t==="YES";return`<div class="summary-future-mass"><span>${r(n("summary.mass"))}</span><strong class="summary-future-mass-${e?"yes":"no"}">${r(n(e?"summary.yes":"summary.no"))}</strong></div>`}function Q(a,t,{kitchen:e=!1,smooth:s=!0}={}){const i=e?"kitchen":"summary",o=Number(t)===1?1:0,m=a?.querySelector(`[data-${i}-matrix-track]`),u=m?.querySelector(`[data-${i}-screen="${o}"]`);return!m||!u?!1:(m.scrollTo({left:m.scrollLeft+u.getBoundingClientRect().left-m.getBoundingClientRect().left,behavior:s?"smooth":"auto"}),q(a,i,o),!0)}function V(a,{kitchen:t,activeIndex:e,residentLabel:s="name"}){const i=t?"kitchen":"summary",o=a.index===e;return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${i}-screen="${a.index}" role="tabpanel" aria-hidden="${!o}">
        <p class="empty-state">${r(n("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${i}-screen="${a.index}" role="tabpanel" aria-hidden="${!o}">
      <table class="summary-matrix">
        ${X(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(m=>m.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${r(n("summary.item"))}</span></th>
            ${a.dateGroups.map(m=>`
              <th class="summary-matrix-date-heading${f(m,a)}" scope="colgroup" colspan="${m.span}">
                <span>${r(F(m.dayIndex))}</span>
                <time datetime="${r(m.dateId)}">${r(I(m.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(m=>`
              <th class="summary-matrix-meal-heading${f(m,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${S(m.mealTypeId)}</span><span class="summary-matrix-meal-label">${r(M(m))}</span>${ea(m,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?x(n("summary.guests"),"summary-matrix-row-guests",a,m=>String(m.guestCount)):""}
          ${x(n("summary.diningMeals"),"summary-matrix-row-meals",a,D)}
          ${a.hasSpecialDiets?x(n("summary.includedDiets"),"summary-matrix-row-diets",a,t?B:A):""}
          ${a.hasSickMeals?x(n("summary.sickMeals"),"summary-matrix-row-sick",a,N):""}
          ${a.hasSickDiets?x(n("summary.sickDiets"),"summary-matrix-row-sick-diets",a,j):""}
          ${a.hasMassInformation?sa(a):""}
          ${t?"":ta(a,s)}
        </tbody>
      </table>
      ${t?K(a):""}
    </section>
  `}function X(a,t){return t?`<caption class="sr-only">${r(`${n("kitchen.title")}: ${n(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${r(a.dateId)}">${r(k(a.dateId))}</time>
    </caption>
  `}function S(a){const t={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return Z({breakfast:"coffee",lunch:"sun",dinner:"moon"}[a],t[a]||"•")}function Z(a,t="•"){const e=document.documentElement.dataset.interfaceStyle;if(!(e==="cool"||e==="urban")||!a)return t;const o={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[a];return o?`<svg class="meal-line-icon meal-line-icon-${a}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${o}</svg>`:t}function M(a){const t=String(a?.mealTypeId||"").trim().toLowerCase(),e=t?n(`meal.type.${t}`):"",s=String(a?.label||"").trim();return e&&e!==`meal.type.${t}`?e:s}function x(a,t,e,s){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${r(a)}</th>
      ${e.columns.map(i=>`<td class="${f(i,e).trim()}">${s(i)}</td>`).join("")}
    </tr>
  `}function D(a){const t=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${r(n(t))}</span>`}function N(a){if(a.sickCount===0)return $(n("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${r(n(t))}</span>`}function j(a){return a.sickDiets.length===0?$(n("summary.noDiet")):v(a.sickDiets)}function aa(a){if(a.massStatus==="UNKNOWN")return $(n("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${r(n(t?"summary.yes":"summary.no"))}</span>`}function ta(a,t="name"){return`
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
      ${a.columns.map(e=>`<td class="${f(e,a).trim()}">${L(e,{compactActions:!0,residentLabel:t})}</td>`).join("")}
    </tr>
  `}function T(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function sa(a){const t=P(a).map(e=>`<td class="summary-matrix-mass-band${f(e,a)}${T(e.massStatus)}" colspan="${e.span}">${R(e)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${r(n("summary.mass"))}</th>
      ${t}
    </tr>
  `}function ea(a,t){if(t||a.mealTypeId!=="breakfast")return"";const e=a.breakfastPlanned===!0,s=n(e?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${e?"yes":"no"}"><span aria-hidden="true">${e?"✓":"×"}</span>${r(s)}</span>`}function A(a){if(a.specialDiets.participantCount===0)return $(n("summary.noDiet"));const t=[...a.specialDiets.items].sort((e,s)=>p(e.tag).localeCompare(p(s.tag),b(),{numeric:!0}));return v(t)}function B(a){return a.specialDiets.participantCount===0?$(n("summary.noDiet")):v(a.specialDiets.items," summary-matrix-kitchen-diets")}function v(a,t=""){const e=[...a].sort((s,i)=>p(s.tag).localeCompare(p(i.tag),b(),{numeric:!0}));return`<ul class="summary-matrix-diets${t}">${e.map(s=>{const i=p(s.tag),o=Math.max(0,Math.floor(Number(s.count)||0)),m=o>1?`${i} (${o})`:i;return`<li>${r(m)}</li>`}).join("")}</ul>`}function p(a){const t=H(a);return/^\d+$/.test(t)?t:z(t)}function L(a,{compactActions:t=!1,residentLabel:e="name"}={}){return a.names.length===0?$(n("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(s=>{const i=s.dietTags.map(y=>p(y)),o=ra(s.phone),m=String(s.displayName||"").trim(),u=m.split(/\s+/).filter(Boolean).slice(0,3).map(y=>y[0]).join("").toUpperCase(),h=e==="signature"?s.signature||m:e==="initials"&&(s.initials||u||s.signature)||m,c=r(h),C=i.length?` <small>(${r(i.join(", "))})</small>`:"",g=`<span class="summary-matrix-person-name">${c}${C}</span>`,d=s.phoneConsent&&o?`<a class="summary-matrix-call" href="tel:${r(o)}" aria-label="${r(n("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",l=s.whatsappEnabled&&s.phoneConsent&&o?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(o.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(n("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(t&&(d||l)){const y=`summary-contact-popup-${++G}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${y}" aria-haspopup="dialog" aria-label="${r(n("summary.contactPerson",{name:s.displayName}))}" title="${r(n("summary.contactPerson",{name:s.displayName}))}">${g}</button>
            <span class="summary-matrix-contact-popover" id="${y}" popover role="dialog" aria-label="${r(n("summary.contactPerson",{name:s.displayName}))}">
              <span class="summary-matrix-contact-actions">${d}${l}</span>
            </span>
          </li>`}return`<li>${g}<span class="summary-matrix-contact-actions">${d}${l}</span></li>`}).join("")}</ul>`}function ra(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function na(a,{kitchen:t,activeIndex:e,residentLabel:s="name"}){const i=t?"kitchen":"summary",o=a.index===e;return`
    <section class="summary-matrix-screen summary-international-screen${ia(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${i}-screen="${a.index}" role="tabpanel" aria-hidden="${!o}">
      ${t?`<h2 class="sr-only">${r(`${n("kitchen.title")}: ${n(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${r(a.dateId)}">${r(k(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map(u=>ma(u,{kitchen:t,residentLabel:s})).join("")}
      </div>
      ${a.hasMassInformation?oa(a,t):""}
      ${t?K(a):""}
    </section>
  `}function ia(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function ma(a,{kitchen:t,residentLabel:e="name"}){const s=t?B(a):A(a);return`
    <article class="summary-international-card summary-day-tone-${E(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${S(a.mealTypeId)}</span>
        <div><strong>${r(M(a))}</strong><time datetime="${r(a.dateId)}">${r(I(a.dateId))}</time></div>
        ${a.guestCount>0?`<span class="summary-international-mobile-guests">${r(n("summary.guests"))}: <strong>${a.guestCount}</strong></span>`:""}
      </header>
      <dl>
        ${a.guestCount>0?`<div class="summary-international-guest-row"><dt>${r(n("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${r(n("summary.diningMeals"))}</dt><dd>${D(a)}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${r(n("summary.includedDiets"))}</dt><dd>${s}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${r(n("summary.sickMeals"))}</dt><dd>${N(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${r(n("summary.sickDiets"))}</dt><dd>${j(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${r(n("summary.names"))}</h3>${L(a,{compactActions:!0,residentLabel:e})}</section>`}
    </article>
  `}function oa(a,t){const e=P(a);return e.length===0?"":`
    <section class="summary-international-mass${t?" summary-international-mass-kitchen":""}">
      <div class="summary-international-mass-segments">
        ${e.map((s,i)=>`
          <div class="summary-international-mass-group${i===0?" summary-international-mass-group-first":""}${f(s,a)}${T(s.massStatus)}" style="--mass-segment-span:${s.span}">
            ${i===0?`<strong class="summary-international-mass-title">${r(n("summary.mass"))}</strong>`:""}
            <div class="summary-international-mass-segment">
              ${R(s)}
            </div>
          </div>`).join("")}
      </div>
    </section>`}function P(a){return a.dateGroups.map(t=>{const e=a.columns.find(s=>s.dateId===t.dateId);return{...t,massStatus:e?.dayMassStatus||"UNKNOWN"}})}function K(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${r(n("kitchen.notes.title"))}">
      <h3>${r(n("kitchen.notes.title"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${r(t.dateId)}">${r(I(t.dateId))}</time>
          <ul>${t.notes.map(e=>`<li><p>${r(e.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function $(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${r(a)}</span>`}function ua(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function R(a){return`
    <span class="summary-mass-control">
      <span class="summary-mass-control-day">${r(F(a.dayIndex))}</span>
      <span class="summary-mass-control-state">${aa(a)}</span>
    </span>`}function f(a,t){return`${ua(a,t)} summary-day-tone-${E(a.dayIndex)}`}function E(a){return Math.max(0,Math.min(2,Number(a)||0))}function F(a){return[n("summary.today"),n("summary.tomorrow"),n("summary.dayAfterTomorrow")][a]||n("summary.followingDay")}function I(a){const[t,e,s]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(b(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,e-1,s))}function k(a){const[t,e,s]=String(a).split("-").map(Number);return!t||!e||!s?"":new Intl.DateTimeFormat(b(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,e-1,s))}function la(a,t){const e=[...a.querySelectorAll(`[data-${t}-screen]`)];if(e.length===0)return 0;const s=e.reduce((i,o)=>Math.abs(o.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(i.getBoundingClientRect().left-a.getBoundingClientRect().left)?o:i);return Number(s.dataset[`${t}Screen`])===1?1:0}function q(a,t,e){a.querySelectorAll(`[data-${t}-screen]`).forEach(s=>{s.setAttribute("aria-hidden",String(Number(s.dataset[`${t}Screen`])!==e))})}export{$a as mountSummaryMatrix,Q as scrollSummaryMatrix};

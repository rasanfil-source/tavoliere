import{t as n,getLocale as b}from"./i18n/i18n.mjs?v=20260822a";import{escapeHtml as r}from"./html-utils.js?v=20260816g";import{formatDietLabel as O,normalizeDietCode as U}from"./diet-utils.mjs?v=20260818w";import{buildKitchenMatrixScreens as G,buildSummaryMatrixScreens as Y}from"./summary-matrix-model.js?v=20260820i";let T=0;function ha(a,{days:t=[],operationDays:s=[],kitchen:e=!1,layout:m="classic",residentLabel:o="name",activeIndex:i=0,onActiveIndexChange:u=()=>{}}={}){const l=e?G(t,s):Y(t,[],s);if(m==="future"&&!e){_(a,l,o,i,u);return}if(l.every(d=>d.columns.length===0)){a.innerHTML=`<p class="empty-state">${r(n("summary.noMeal"))}</p>`;return}const c=e?"kitchen":"summary",w=m==="international"?ma:Z;a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${m}${e?" summary-layout-kitchen":" summary-layout-diners"}" data-${c}-matrix-track aria-label="${r(n("summary.screensLabel"))}">
      ${l.map(d=>w(d,{kitchen:e,activeIndex:i,residentLabel:o})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${r(n("summary.swipeHint"))}</p>
  `;const g=a.querySelector(`[data-${c}-matrix-track]`);let p=0;g.addEventListener("scroll",()=>{window.clearTimeout(p),p=window.setTimeout(()=>{const d=da(g,c);z(a,c,d),u(d)},100)},{passive:!0}),window.requestAnimationFrame(()=>{X(a,i,{kitchen:e,smooth:!1})})}function _(a,t,s,e=0,m=()=>{}){a.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${t.map(u=>`
        <article class="summary-future-card" data-summary-future-screen="${u.index}" aria-hidden="${u.index!==e}">
          <header class="summary-future-card-head">
            <strong>${r(n(u.labelKey))}</strong>
            <time datetime="${r(u.dateId)}">${r(N(u.dateId))}</time>
          </header>
          <div class="summary-future-meals">
            ${u.columns.map(l=>J(l,s)).join("")}
          </div>
          ${V(u)}
        </article>
      `).join("")}
    </div>
  `;const o=a.querySelector("[data-summary-future-track]");let i=0;o?.addEventListener("scroll",()=>{window.clearTimeout(i),i=window.setTimeout(()=>{const u=Math.max(0,Math.min(1,Math.round(o.scrollLeft/Math.max(1,o.clientWidth+14))));o.querySelectorAll("[data-summary-future-screen]").forEach(l=>{l.setAttribute("aria-hidden",String(Number(l.dataset.summaryFutureScreen)!==u))}),m(u)},100)},{passive:!0}),window.requestAnimationFrame(()=>{o&&o.scrollTo({left:Math.max(0,e)*(o.clientWidth+14),behavior:"auto"})})}function J(a,t){const s=Array.isArray(a.names)?a.names:[],e=Number(a.specialDiets?.participantCount||0),m=Number(a.guestCount||0),o=Number(a.sickCount||0),i=Array.isArray(a.sickDiets)?a.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${S(a.mealTypeId)}</span>
        <span class="summary-future-meal-name">${r(M(a,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${r(String(a.total||0))}</strong>
      </div>
      ${j(a)}
      ${m>0?A("summary.guests",m,"guests"):""}
      ${e?`<p class="summary-future-diets">${r(n("week.operations.diet.count",{count:e}))}</p>`:""}
      ${o>0?A("summary.sickMeals",o,"sick"):""}
      ${i.length>0?`<div class="summary-future-special-row"><span>${r(n("summary.sickDiets"))}</span><div>${v(i," summary-future-diet-list")}</div></div>`:""}
      ${s.length?`<div class="summary-future-people">${s.map(u=>Q(u,t)).join("")}</div>`:""}
    </section>
  `}function A(a,t,s){return s==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${r(String(t))}</strong><span>${r(n(a))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${r(s)}"><span>${r(n(a))}</span><strong>${r(String(t))}</strong></p>`}function Q(a,t){const s=String(a.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(c=>c[0]).join("").toUpperCase(),e=t==="signature"?a.signature||a.displayName:t==="initials"?a.initials||s||a.signature:a.displayName,m=Array.isArray(a.dietTags)?a.dietTags.map(c=>y(c)).filter(Boolean):[],o=`${r(e||"–")}${m.length?`&nbsp;<small>(${r(m.join(", "))})</small>`:""}`,i=k(a.phone),u=a.phoneConsent&&i?`<a class="summary-matrix-call" href="tel:${r(i)}" aria-label="${r(n("summary.callPerson",{name:a.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",l=a.whatsappEnabled&&a.phoneConsent&&i?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(i.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(n("summary.messagePerson",{name:a.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(u||l){const c=`summary-contact-popup-${++T}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${c}" aria-haspopup="dialog" aria-label="${r(n("summary.contactPerson",{name:a.displayName}))}">${o}</button><span class="summary-matrix-contact-popover" id="${c}" popover role="dialog"><span class="summary-matrix-contact-actions">${u}${l}</span></span></span>`}return`<span class="summary-future-person" title="${r(a.displayName||e)}">${o}</span>`}function V(a){const t=a.columns.find(m=>m.dayIndex===a.index)?.dayMassStatus;if(!t||t==="UNKNOWN")return"";const s=t==="YES",e=D(Math.min(2,Number(a.index||0)+1));return`<div class="summary-future-mass"><span>${r(n("summary.mass"))}</span><strong class="summary-future-mass-${s?"yes":"no"}">${r(n(s?"summary.yes":"summary.no"))}<small>(${r(e)})</small></strong></div>`}function X(a,t,{kitchen:s=!1,smooth:e=!0}={}){const m=s?"kitchen":"summary",o=Number(t)===1?1:0;if(!s){const l=a?.querySelector("[data-summary-future-track]");if(l)return l.scrollTo({left:o*(l.clientWidth+14),behavior:e?"smooth":"auto"}),l.querySelectorAll("[data-summary-future-screen]").forEach(c=>{c.setAttribute("aria-hidden",String(Number(c.dataset.summaryFutureScreen)!==o))}),!0}const i=a?.querySelector(`[data-${m}-matrix-track]`),u=i?.querySelector(`[data-${m}-screen="${o}"]`);return!i||!u?!1:(i.scrollTo({left:i.scrollLeft+u.getBoundingClientRect().left-i.getBoundingClientRect().left,behavior:e?"smooth":"auto"}),z(a,m,o),!0)}function Z(a,{kitchen:t,activeIndex:s,residentLabel:e="name"}){const m=t?"kitchen":"summary",o=a.index===s;return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!o}">
        <p class="empty-state">${r(n("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!o}">
      <table class="summary-matrix">
        ${aa(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(i=>i.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${r(n("summary.item"))}</span></th>
            ${a.dateGroups.map(i=>`
              <th class="summary-matrix-date-heading${h(i,a)}" scope="colgroup" colspan="${i.span}">
                <span>${r(D(i.dayIndex))}</span>
                <time datetime="${r(i.dateId)}">${r(I(i.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(i=>`
              <th class="summary-matrix-meal-heading${h(i,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${S(i.mealTypeId)}</span><span class="summary-matrix-meal-label">${r(M(i))}</span>${ia(i,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?x(n("summary.guests"),"summary-matrix-row-guests",a,i=>String(i.guestCount)):""}
          ${x(n("summary.diningMeals"),"summary-matrix-row-meals",a,t?C:i=>C(i,{contactHint:!0}))}
          ${a.hasSpecialDiets?x(n("summary.includedDiets"),"summary-matrix-row-diets",a,t?E:q):""}
          ${a.hasSickMeals?x(n("summary.sickMeals"),"summary-matrix-row-sick",a,B):""}
          ${a.hasSickDiets?x(n("summary.sickDiets"),"summary-matrix-row-sick-diets",a,P):""}
          ${a.hasMassInformation?na(a):""}
          ${t?"":ra(a,e)}
        </tbody>
      </table>
      ${t?K(a):""}
    </section>
  `}function aa(a,t){return t?`<caption class="sr-only">${r(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${r(a.dateId)}">${r(N(a.dateId))}</time>
    </caption>
  `}function S(a){const t={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return ta({breakfast:"coffee",lunch:"sun",dinner:"moon"}[a],t[a]||"•")}function ta(a,t="•"){const s=document.documentElement.dataset.interfaceStyle;if(!(s==="cool"||s==="urban"||s==="future")||!a)return t;const o={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[a];return o?`<svg class="meal-line-icon meal-line-icon-${a}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${o}</svg>`:t}function M(a,{breakfastTomorrow:t=!1}={}){const s=String(a?.mealTypeId||"").trim().toLowerCase();if(t&&s==="breakfast")return n("summary.breakfastTomorrow");const e=s?n(`meal.type.${s}`):"",m=String(a?.label||"").trim();return e&&e!==`meal.type.${s}`?e:m}function x(a,t,s,e){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${r(a)}</th>
      ${s.columns.map(m=>`<td class="${h(m,s).trim()}">${e(m)}</td>`).join("")}
    </tr>
  `}function C(a,{contactHint:t=!1}={}){const s=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${r(n(s))}</span>${t?j(a):""}`}function sa(a){return Array.isArray(a?.names)&&a.names.some(t=>t?.phoneConsent&&k(t.phone))}function j(a){return sa(a)?`<small class="summary-contact-hint">${r(n("summary.contactHint"))}</small>`:""}function B(a){if(a.sickCount===0)return f(n("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${r(n(t))}</span>`}function P(a){return a.sickDiets.length===0?f(n("summary.noDiet")):v(a.sickDiets)}function ea(a){if(a.massStatus==="UNKNOWN")return f(n("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${r(n(t?"summary.yes":"summary.no"))}</span>`}function ra(a,t="name"){return`
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
      ${a.columns.map(s=>`<td class="${h(s,a).trim()}">${F(s,{compactActions:!0,residentLabel:t})}</td>`).join("")}
    </tr>
  `}function L(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function na(a){const t=H(a).map(s=>`<td class="summary-matrix-mass-band${h(s,a)}${L(s.massStatus)}" colspan="${s.span}">${R(s)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${r(n("summary.mass"))}</th>
      ${t}
    </tr>
  `}function ia(a,t){if(t||a.mealTypeId!=="breakfast")return"";const s=a.breakfastPlanned===!0,e=n(s?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${s?"yes":"no"}"><span aria-hidden="true">${s?"✓":"×"}</span>${r(e)}</span>`}function q(a){if(a.specialDiets.participantCount===0)return f(n("summary.noDiet"));const t=[...a.specialDiets.items].sort((s,e)=>y(s.tag).localeCompare(y(e.tag),b(),{numeric:!0}));return v(t)}function E(a){return a.specialDiets.participantCount===0?f(n("summary.noDiet")):v(a.specialDiets.items," summary-matrix-kitchen-diets")}function v(a,t=""){const s=[...a].sort((e,m)=>y(e.tag).localeCompare(y(m.tag),b(),{numeric:!0}));return`<ul class="summary-matrix-diets${t}">${s.map(e=>{const m=y(e.tag),o=Math.max(0,Math.floor(Number(e.count)||0)),i=o>1?`${m} (${o})`:m;return`<li>${r(i)}</li>`}).join("")}</ul>`}function y(a){const t=U(a);return/^\d+$/.test(t)?t:O(t)}function F(a,{compactActions:t=!1,residentLabel:s="name"}={}){return a.names.length===0?f(n("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(e=>{const m=e.dietTags.map($=>y($)),o=k(e.phone),i=String(e.displayName||"").trim(),u=i.split(/\s+/).filter(Boolean).slice(0,3).map($=>$[0]).join("").toUpperCase(),l=s==="signature"?e.signature||i:s==="initials"&&(e.initials||u||e.signature)||i,c=r(l),w=m.length?` <small>(${r(m.join(", "))})</small>`:"",g=`<span class="summary-matrix-person-name">${c}${w}</span>`,p=e.phoneConsent&&o?`<a class="summary-matrix-call" href="tel:${r(o)}" aria-label="${r(n("summary.callPerson",{name:e.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",d=e.whatsappEnabled&&e.phoneConsent&&o?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(o.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(n("summary.messagePerson",{name:e.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(t&&(p||d)){const $=`summary-contact-popup-${++T}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${$}" aria-haspopup="dialog" aria-label="${r(n("summary.contactPerson",{name:e.displayName}))}" title="${r(n("summary.contactPerson",{name:e.displayName}))}">${g}</button>
            <span class="summary-matrix-contact-popover" id="${$}" popover role="dialog" aria-label="${r(n("summary.contactPerson",{name:e.displayName}))}">
              <span class="summary-matrix-contact-actions">${p}${d}</span>
            </span>
          </li>`}return`<li>${g}<span class="summary-matrix-contact-actions">${p}${d}</span></li>`}).join("")}</ul>`}function k(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function ma(a,{kitchen:t,activeIndex:s,residentLabel:e="name"}){const m=t?"kitchen":"summary",o=a.index===s;return`
    <section class="summary-matrix-screen summary-international-screen${oa(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!o}">
      ${t?`<h2 class="sr-only">${r(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${r(a.dateId)}">${r(N(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map(u=>ua(u,{kitchen:t,residentLabel:e})).join("")}
      </div>
      ${a.hasMassInformation?la(a,t):""}
      ${t?K(a):""}
    </section>
  `}function oa(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function ua(a,{kitchen:t,residentLabel:s="name"}){const e=t?E(a):q(a);return`
    <article class="summary-international-card summary-day-tone-${W(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${S(a.mealTypeId)}</span>
        <div><strong>${r(M(a,{breakfastTomorrow:!0}))}</strong><time datetime="${r(a.dateId)}">${r(I(a.dateId))}</time></div>
        ${a.guestCount>0?`<span class="summary-international-mobile-guests">${r(n("summary.guests"))}: <strong>${a.guestCount}</strong></span>`:""}
      </header>
      <dl>
        ${a.guestCount>0?`<div class="summary-international-guest-row"><dt>${r(n("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${r(n("summary.diningMeals"))}</dt><dd>${C(a,{contactHint:!t})}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${r(n("summary.includedDiets"))}</dt><dd>${e}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${r(n("summary.sickMeals"))}</dt><dd>${B(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${r(n("summary.sickDiets"))}</dt><dd>${P(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${r(n("summary.names"))}</h3>${F(a,{compactActions:!0,residentLabel:s})}</section>`}
    </article>
  `}function la(a,t){const s=H(a);return s.length===0?"":`
    <section class="summary-international-mass${t?" summary-international-mass-kitchen":""}">
      <div class="summary-international-mass-segments">
        ${s.map((e,m)=>`
          <div class="summary-international-mass-group${m===0?" summary-international-mass-group-first":""}${h(e,a)}${L(e.massStatus)}" style="--mass-segment-span:${e.span}">
            ${m===0?`<strong class="summary-international-mass-title">${r(n("summary.mass"))}</strong>`:""}
            <div class="summary-international-mass-segment">
              ${R(e)}
            </div>
          </div>`).join("")}
      </div>
    </section>`}function H(a){return a.dateGroups.map(t=>{const s=a.columns.find(e=>e.dateId===t.dateId);return{...t,massStatus:s?.dayMassStatus||"UNKNOWN"}})}function K(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${r(n("kitchen.notes.title"))}">
      <h3>${r(n("kitchen.notes.title"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${r(t.dateId)}">${r(I(t.dateId))}</time>
          <ul>${t.notes.map(s=>`<li><p>${r(s.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function f(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${r(a)}</span>`}function ca(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function R(a){return`
    <span class="summary-mass-control">
      <span class="summary-mass-control-day">${r(D(a.dayIndex))}</span>
      <span class="summary-mass-control-state">${ea(a)}</span>
    </span>`}function h(a,t){return`${ca(a,t)} summary-day-tone-${W(a.dayIndex)}`}function W(a){return Math.max(0,Math.min(2,Number(a)||0))}function D(a){return[n("summary.today"),n("summary.tomorrow"),n("summary.dayAfterTomorrow")][a]||n("summary.followingDay")}function I(a){const[t,s,e]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(b(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,s-1,e))}function N(a){const[t,s,e]=String(a).split("-").map(Number);return!t||!s||!e?"":new Intl.DateTimeFormat(b(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,s-1,e))}function da(a,t){const s=[...a.querySelectorAll(`[data-${t}-screen]`)];if(s.length===0)return 0;const e=s.reduce((m,o)=>Math.abs(o.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(m.getBoundingClientRect().left-a.getBoundingClientRect().left)?o:m);return Number(e.dataset[`${t}Screen`])===1?1:0}function z(a,t,s){a.querySelectorAll(`[data-${t}-screen]`).forEach(e=>{e.setAttribute("aria-hidden",String(Number(e.dataset[`${t}Screen`])!==s))})}export{ha as mountSummaryMatrix,X as scrollSummaryMatrix};

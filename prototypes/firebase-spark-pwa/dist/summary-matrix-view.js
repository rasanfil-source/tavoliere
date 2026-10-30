import{t as n,getLocale as b}from"./i18n/i18n.mjs?v=20261014b";import{escapeHtml as r}from"./html-utils.js?v=20261014b";import{renderBlessing as L}from"./blessing-view.mjs?v=20261014b";import{formatDietLabel as Q,getDietBadgeTone as j,normalizeDietCode as B}from"./diet-utils.mjs?v=20261014b";import{normalizeKitchenDietLegend as V}from"./diet-legend.mjs?v=20261014b";import{buildKitchenMatrixScreens as X,buildSummaryMatrixScreens as Z}from"./summary-matrix-model.js?v=20261014b";let E=0;function Na(a,{days:t=[],operationDays:s=[],kitchen:e=!1,layout:i="classic",residentLabel:u="name",dietLegend:m=[],showContactHint:c=!0,activeIndex:l=0,monthSummary:o=null,onActiveIndexChange:h=()=>{}}={}){const $=e?X(t,s):Z(t,[],s);if(i==="future"&&!e){aa(a,$,u,l,h,c);return}if($.every(d=>d.columns.length===0)){a.innerHTML=`<p class="empty-state">${r(n("summary.noMeal"))}</p>`;return}const f=e?"kitchen":"summary",x=i==="international"?fa:na;if(a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${i}${e?" summary-layout-kitchen":" summary-layout-diners"}" data-${f}-matrix-track aria-label="${r(n("summary.screensLabel"))}">
      ${$.map(d=>x(d,{kitchen:e,activeIndex:l,residentLabel:u,showContactHint:c,dietLegend:m})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${r(n("summary.swipeHint"))}</p>
    ${e?ua(o):""}
  `,e&&o?.onLoad){const d=a.querySelector("[data-kitchen-monthly-summary]");d?.addEventListener("toggle",()=>{d.open&&d.dataset.loading!=="true"&&la(d,o)})}const y=a.querySelector(`[data-${f}-matrix-track]`);let A=0;y.addEventListener("scroll",()=>{window.clearTimeout(A),A=window.setTimeout(()=>{const d=va(y,f);J(a,f,d),h(d)},100)},{passive:!0}),window.requestAnimationFrame(()=>{ra(a,l,{kitchen:e,smooth:!1})})}function aa(a,t,s,e=0,i=()=>{},u=!0){a.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${t.map(l=>`
        <article class="summary-future-card" data-summary-future-screen="${l.index}" aria-hidden="${l.index!==e}">
          <header class="summary-future-card-head">
            <div><strong>${r(n(l.labelKey))}</strong><time datetime="${r(l.dateId)}">${r(T(l.dateId))}</time></div>
            ${ea(l)}
          </header>
          <div class="summary-future-meals">
            ${l.columns.map(o=>ta(o,s,u)).join("")}
          </div>
          ${N(l)}
        </article>
      `).join("")}
    </div>
  `;const m=a.querySelector("[data-summary-future-track]");let c=0;m?.addEventListener("scroll",()=>{window.clearTimeout(c),c=window.setTimeout(()=>{const l=Math.max(0,Math.min(1,Math.round(m.scrollLeft/Math.max(1,m.clientWidth+14))));m.querySelectorAll("[data-summary-future-screen]").forEach(o=>{o.setAttribute("aria-hidden",String(Number(o.dataset.summaryFutureScreen)!==l))}),i(l)},100)},{passive:!0}),window.requestAnimationFrame(()=>{m&&m.scrollTo({left:Math.max(0,e)*(m.clientWidth+14),behavior:"auto"})})}function ta(a,t,s=!0){const e=Array.isArray(a.names)?a.names:[],i=[...Array.isArray(a.specialDiets?.items)?a.specialDiets.items:[]].map(l=>p(l.tag)).filter(Boolean).sort((l,o)=>l.localeCompare(o,b(),{numeric:!0})),u=Number(a.guestCount||0),m=Number(a.sickCount||0),c=Array.isArray(a.sickDiets)?a.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${M(a.mealTypeId)}</span>
        <span class="summary-future-meal-name">${r(C(a,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${r(String(a.total||0))}</strong>
      </div>
      ${R(a,s)}
      ${u>0?K("summary.guests",u,"guests"):""}
      ${i.length?`<p class="summary-future-diets"><span>${r(n("summary.diets"))}:</span> <strong>${r(i.join(", "))}</strong></p>`:""}
      ${m>0?K("summary.sickMeals",m,"sick"):""}
      ${c.length>0?`<div class="summary-future-special-row"><span>${r(n("summary.sickDiets"))}</span><div>${S(c," summary-future-diet-list")}</div></div>`:""}
      ${e.length?`<div class="summary-future-people">${e.map(l=>sa(l,t)).join("")}</div>`:""}
    </section>
  `}function K(a,t,s){return s==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${r(String(t))}</strong><span>${r(n(a))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${r(s)}"><span>${r(n(a))}</span><strong>${r(String(t))}</strong></p>`}function sa(a,t){const s=String(a.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(o=>o[0]).join("").toUpperCase(),e=t==="signature"?a.signature||a.displayName:t==="initials"?a.initials||s||a.signature:a.displayName,i=Array.isArray(a.dietTags)?a.dietTags.map(o=>p(o)).filter(Boolean):[],u=`${r(e||"–")}${i.length?`&nbsp;<small>(${r(i.join(", "))})</small>`:""}`,m=I(a.phone),c=a.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${r(m)}" aria-label="${r(n("summary.callPerson",{name:a.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",l=a.whatsappEnabled&&a.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(n("summary.messagePerson",{name:a.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(c||l){const o=`summary-contact-popup-${++E}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${o}" aria-haspopup="dialog" aria-label="${r(n("summary.contactPerson",{name:a.displayName}))}">${u}</button><span class="summary-matrix-contact-popover" id="${o}" popover role="dialog"><span class="summary-matrix-contact-actions">${c}${l}</span></span></span>`}return`<span class="summary-future-person" title="${r(a.displayName||e)}">${u}</span>`}function ea(a){const t=a.columns.find(e=>e.dayIndex===a.index),s=t?.dayMassStatus;return!s||s==="UNKNOWN"?"":P(s,t.blessingTime)}function P(a,t=""){const s=a==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${s?"yes":"no"}"><span>${r(n("summary.mass"))}:</span><span class="mass-status-stack"><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${r(n(s?"summary.yes":"summary.no"))}</strong>${L(t)}</span></span>`}function ra(a,t,{kitchen:s=!1,smooth:e=!0}={}){const i=s?"kitchen":"summary",u=Number(t)===1?1:0;if(!s){const l=a?.querySelector("[data-summary-future-track]");if(l)return l.scrollTo({left:u*(l.clientWidth+14),behavior:e?"smooth":"auto"}),l.querySelectorAll("[data-summary-future-screen]").forEach(o=>{o.setAttribute("aria-hidden",String(Number(o.dataset.summaryFutureScreen)!==u))}),!0}const m=a?.querySelector(`[data-${i}-matrix-track]`),c=m?.querySelector(`[data-${i}-screen="${u}"]`);return!m||!c?!1:(m.scrollTo({left:m.scrollLeft+c.getBoundingClientRect().left-m.getBoundingClientRect().left,behavior:e?"smooth":"auto"}),J(a,i,u),!0)}function na(a,{kitchen:t,activeIndex:s,residentLabel:e="name",showContactHint:i=!0,dietLegend:u=[]}){const m=t?"kitchen":"summary",c=a.index===s,l=ia(a);return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!c}">
        <p class="empty-state">${r(n("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!c}">
      <table class="summary-matrix summary-matrix-optional-rows-${l}">
        ${ma(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(o=>o.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${r(n("summary.item"))}</span></th>
            ${a.dateGroups.map(o=>`
              <th class="summary-matrix-date-heading${v(o,a)}" scope="colgroup" colspan="${o.span}">
                <span>${r(_(o.dayIndex))}</span>
                <time datetime="${r(o.dateId)}">${r(k(o.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(o=>`
              <th class="summary-matrix-meal-heading${v(o,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${M(o.mealTypeId)}</span><span class="summary-matrix-meal-label">${r(C(o))}</span>${$a(o,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?w(n("summary.guests"),"summary-matrix-row-guests",a,o=>String(o.guestCount)):""}
          ${w(n("summary.diningMeals"),"summary-matrix-row-meals",a,q)}
          ${a.hasSpecialDiets?w(n("summary.includedDiets"),"summary-matrix-row-diets",a,t?G:z):""}
          ${a.hasSickMeals?w(n("summary.sickMeals"),"summary-matrix-row-sick",a,F):""}
          ${a.hasSickDiets?w(n("summary.sickDiets"),"summary-matrix-row-sick-diets",a,W):""}
          ${a.hasMassInformation?pa(a):""}
          ${t?"":da(a,e,i)}
        </tbody>
      </table>
      ${t?U(a,u):""}
      ${N(a)}
    </section>
  `}function ia(a){return[a.hasGuestGroup,a.hasSickMeals,a.hasSickDiets].filter(Boolean).length}function ma(a,t){return t?`<caption class="sr-only">${r(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${r(a.dateId)}">${r(T(a.dateId))}</time>
    </caption>
  `}function M(a){const t={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return oa({breakfast:"coffee",lunch:"sun",dinner:"moon"}[a],t[a]||"•")}function oa(a,t="•"){const s=document.documentElement.dataset.interfaceStyle;if(!(s==="cool"||s==="urban"||s==="future")||!a)return t;const u={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[a];return u?`<svg class="meal-line-icon meal-line-icon-${a}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${u}</svg>`:t}function C(a,{breakfastTomorrow:t=!1}={}){const s=String(a?.mealTypeId||"").trim().toLowerCase();if(t&&s==="breakfast")return n("summary.breakfastTomorrow");const e=s?n(`meal.type.${s}`):"",i=String(a?.label||"").trim();return e&&e!==`meal.type.${s}`?e:i}function w(a,t,s,e){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${r(a)}</th>
      ${s.columns.map(i=>`<td class="${v(i,s).trim()}">${e(i)}</td>`).join("")}
    </tr>
  `}function q(a,{contactHint:t=!1}={}){const s=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${r(n(s))}</span>${t?R(a):""}`}function H(a){return Array.isArray(a?.names)&&a.names.some(t=>t?.phoneConsent&&I(t.phone))}function ua(a){return typeof a?.onLoad!="function"?"":`
    <section class="kitchen-monthly-summary">
      <details data-kitchen-monthly-summary>
        <summary>${r(n("kitchen.monthly.title"))}</summary>
        <div class="kitchen-monthly-summary-content" data-kitchen-monthly-summary-content role="status" aria-live="polite"></div>
      </details>
    </section>
  `}async function la(a,t){const s=a.querySelector("[data-kitchen-monthly-summary-content]");if(s){a.dataset.loading="true",s.textContent=n("kitchen.monthly.loading");try{const e=await t.onLoad(a.dataset.monthId);if(!a.isConnected||!a.open)return;if(!e){s.textContent=n("kitchen.monthly.notReady");return}s.innerHTML=`
      <p><strong>${r(n("kitchen.monthly.period"))}</strong> ${r(k(e.periodStart))} – ${r(k(e.periodEnd))}</p>
      <dl>
        ${D("breakfast",e.counts.breakfast)}
        ${D("lunch",e.counts.lunch)}
        ${D("dinner",e.counts.dinner)}
      </dl>
    `}catch{if(!a.isConnected||!a.open)return;s.textContent=n("kitchen.monthly.unavailable")}finally{delete a.dataset.loading}}}function D(a,t){const s=n(`meal.type.${a}`);return`<div><dt>${r(s)}</dt><dd>${r(t)}</dd></div>`}function R(a,t=!0){return!t||!H(a)?"":`<small class="summary-contact-hint">${r(n("summary.contactHint"))}</small>`}function F(a){if(a.sickCount===0)return g(n("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${r(n(t))}</span>`}function W(a){return a.sickDiets.length===0?g(n("summary.noDiet")):S(a.sickDiets)}function ca(a){if(a.massStatus==="UNKNOWN")return g(n("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${r(n(t?"summary.yes":"summary.no"))}</span>`}function da(a,t="name",s=!0){return`
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
        ${s&&a.columns.some(H)?`<small class="summary-contact-hint">${r(n("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${r(n("summary.names"))}</span>
      </th>
      ${a.columns.map(i=>`<td class="${v(i,a).trim()}">${O(i,{compactActions:!0,residentLabel:t})}</td>`).join("")}
    </tr>
  `}function ya(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function pa(a){const t=xa(a).map(s=>`<td class="summary-matrix-mass-band${v(s,a)}${ya(s.massStatus)}" colspan="${s.span}">${wa(s)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${r(n("summary.mass"))}</th>
      ${t}
    </tr>
  `}function $a(a,t){if(t||a.mealTypeId!=="breakfast")return"";const s=a.breakfastPlanned===!0,e=n(s?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${s?"yes":"no"}"><span aria-hidden="true">${s?"✓":"×"}</span>${r(e)}</span>`}function z(a){if(a.specialDiets.participantCount===0)return g(n("summary.noDiet"));const t=[...a.specialDiets.items].sort((s,e)=>p(s.tag).localeCompare(p(e.tag),b(),{numeric:!0}));return S(t)}function G(a){return a.specialDiets.participantCount===0?g(n("summary.noDiet")):S(a.specialDiets.items," summary-matrix-kitchen-diets")}function S(a,t=""){const s=[...a].sort((e,i)=>p(e.tag).localeCompare(p(i.tag),b(),{numeric:!0}));return`<ul class="summary-matrix-diets${t}">${s.map(e=>{const i=p(e.tag),u=Math.max(0,Math.floor(Number(e.count)||0)),m=u>1?`<span class="diet-code-count">× ${u}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${j(e.tag)}">${r(i)}</span>${m}</li>`}).join("")}</ul>`}function p(a){return Q(B(a),n)}function O(a,{compactActions:t=!1,residentLabel:s="name"}={}){return a.names.length===0?g(n("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(e=>{const i=e.dietTags.map(y=>p(y)),u=I(e.phone),m=String(e.displayName||"").trim(),c=m.split(/\s+/).filter(Boolean).slice(0,3).map(y=>y[0]).join("").toUpperCase(),l=s==="signature"?e.signature||m:s==="initials"&&(e.initials||c||e.signature)||m,o=r(l),h=i.length?` <small>(${r(i.join(", "))})</small>`:"",$=`<span class="summary-matrix-person-name">${o}${h}</span>`,f=e.phoneConsent&&u?`<a class="summary-matrix-call" href="tel:${r(u)}" aria-label="${r(n("summary.callPerson",{name:e.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",x=e.whatsappEnabled&&e.phoneConsent&&u?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(u.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(n("summary.messagePerson",{name:e.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(t&&(f||x)){const y=`summary-contact-popup-${++E}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${y}" aria-haspopup="dialog" aria-label="${r(n("summary.contactPerson",{name:e.displayName}))}" title="${r(n("summary.contactPerson",{name:e.displayName}))}">${$}</button>
            <span class="summary-matrix-contact-popover" id="${y}" popover role="dialog" aria-label="${r(n("summary.contactPerson",{name:e.displayName}))}">
              <span class="summary-matrix-contact-actions">${f}${x}</span>
            </span>
          </li>`}return`<li>${$}<span class="summary-matrix-contact-actions">${f}${x}</span></li>`}).join("")}</ul>`}function I(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function fa(a,{kitchen:t,activeIndex:s,residentLabel:e="name",showContactHint:i=!0,dietLegend:u=[]}){const m=t?"kitchen":"summary",c=a.index===s;return`
    <section class="summary-matrix-screen summary-international-screen${ha(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!c}">
      ${t?`<h2 class="sr-only">${r(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${r(a.dateId)}">${r(T(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map((o,h,$)=>ga(o,{kitchen:t,residentLabel:e,showContactHint:i,showMassMetadata:h===0||$[h-1]?.dateId!==o.dateId})).join("")}
      </div>
      ${t?U(a,u):""}
      ${N(a)}
    </section>
  `}function ha(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function ga(a,{kitchen:t,residentLabel:s="name",showContactHint:e=!0,showMassMetadata:i=!1}){const u=t?G(a):z(a),m=i&&a.dayMassStatus!=="UNKNOWN"?P(a.dayMassStatus,a.blessingTime):"",c=a.guestCount>0?`<span class="summary-international-mobile-guests">${r(n("summary.guests"))}: <strong>${a.guestCount}</strong></span>`:"",l=m||c?`<div class="summary-international-card-actions">${m}${c}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${Y(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${M(a.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${r(C(a,{breakfastTomorrow:!0}))}</strong><time datetime="${r(a.dateId)}">${r(k(a.dateId))}</time></div>
        ${l}
      </header>
      <dl>
        ${a.guestCount>0?`<div class="summary-international-guest-row"><dt>${r(n("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${r(n("summary.diningMeals"))}</dt><dd>${q(a,{contactHint:!t&&e})}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${r(n("summary.includedDiets"))}</dt><dd>${u}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${r(n("summary.sickMeals"))}</dt><dd>${F(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${r(n("summary.sickDiets"))}</dt><dd>${W(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${r(n("summary.names"))}</h3>${O(a,{compactActions:!0,residentLabel:s})}</section>`}
    </article>
  `}function xa(a){return a.dateGroups.map(t=>{const s=a.columns.find(e=>e.dateId===t.dateId);return{...t,massStatus:s?.dayMassStatus||"UNKNOWN",blessingTime:s?.blessingTime||""}})}function N(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${r(n("kitchen.notes.title"))}">
      <h3>${r(n("kitchen.notes.title"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${r(t.dateId)}">${r(k(t.dateId))}</time>
          <ul>${t.notes.map(s=>`<li><p>${r(s.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function U(a,t){const s=new Set;a.columns.forEach(i=>{[...i.specialDiets?.items||[],...i.sickDiets||[]].forEach(u=>{const m=B(u?.tag);/^\d{1,3}$/.test(m)&&s.add(m)})});const e=V(t).filter(i=>s.has(i.code));return e.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${r(n("kitchen.dietLegend.title"))}">
      <h3>${r(n("kitchen.dietLegend.title"))}</h3>
      <ul>${e.map(i=>`<li><strong class="diet-code-badge diet-code-tone-${j(i.code)}">${r(p(i.code))}</strong><span aria-hidden="true">=</span><span>${r(i.label)}</span></li>`).join("")}</ul>
    </section>
  `}function g(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${r(a)}</span>`}function ba(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function wa(a){const t=/^([01]\d|2[0-3]):[0-5]\d$/.test(a.blessingTime||""),s=t&&Number(a.span)<2,e=t?s?" summary-mass-control-blessing-narrow":" summary-mass-control-blessing-wide":"",i=t?` mass-status-with-blessing${s?" mass-status-narrow":" mass-status-wide-blessing"}`:"",u=t?L(a.blessingTime,s?{narrow:!0}:{compact:!0}):"";return`
    <span class="summary-mass-control${e}">
      <span class="summary-mass-control-day">${r(_(a.dayIndex))}</span>
      <span class="summary-mass-control-state mass-status-stack${i}">${ca(a)}${u}</span>
    </span>`}function v(a,t){return`${ba(a,t)} summary-day-tone-${Y(a.dayIndex)}`}function Y(a){return Math.max(0,Math.min(2,Number(a)||0))}function _(a){return[n("summary.today"),n("summary.tomorrow"),n("summary.dayAfterTomorrow")][a]||n("summary.followingDay")}function k(a){const[t,s,e]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(b(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,s-1,e))}function T(a){const[t,s,e]=String(a).split("-").map(Number);return!t||!s||!e?"":new Intl.DateTimeFormat(b(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,s-1,e))}function va(a,t){const s=[...a.querySelectorAll(`[data-${t}-screen]`)];if(s.length===0)return 0;const e=s.reduce((i,u)=>Math.abs(u.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(i.getBoundingClientRect().left-a.getBoundingClientRect().left)?u:i);return Number(e.dataset[`${t}Screen`])===1?1:0}function J(a,t,s){a.querySelectorAll(`[data-${t}-screen]`).forEach(e=>{e.setAttribute("aria-hidden",String(Number(e.dataset[`${t}Screen`])!==s))})}export{Na as mountSummaryMatrix,ra as scrollSummaryMatrix};

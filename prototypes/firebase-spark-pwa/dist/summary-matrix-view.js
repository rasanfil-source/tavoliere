import{t as n,getLocale as b}from"./i18n/i18n.mjs?v=20261014b";import{escapeHtml as e}from"./html-utils.js?v=20261014b";import{renderBlessing as T}from"./blessing-view.mjs?v=20261014b";import{formatDietLabel as _,getDietBadgeTone as A,normalizeDietCode as j}from"./diet-utils.mjs?v=20261014b";import{normalizeKitchenDietLegend as J}from"./diet-legend.mjs?v=20261014b";import{buildKitchenMatrixScreens as Q,buildSummaryMatrixScreens as V}from"./summary-matrix-model.js?v=20261014b";let B=0;function ka(a,{days:t=[],operationDays:s=[],kitchen:r=!1,layout:i="classic",residentLabel:o="name",dietLegend:m=[],showContactHint:c=!0,activeIndex:l=0,onActiveIndexChange:u=()=>{}}={}){const $=r?Q(t,s):V(t,[],s);if(i==="future"&&!r){X(a,$,o,l,u,c);return}if($.every(h=>h.columns.length===0)){a.innerHTML=`<p class="empty-state">${e(n("summary.noMeal"))}</p>`;return}const d=r?"kitchen":"summary",x=i==="international"?da:ea;a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${i}${r?" summary-layout-kitchen":" summary-layout-diners"}" data-${d}-matrix-track aria-label="${e(n("summary.screensLabel"))}">
      ${$.map(h=>x(h,{kitchen:r,activeIndex:l,residentLabel:o,showContactHint:c,dietLegend:m})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${e(n("summary.swipeHint"))}</p>
  `;const f=a.querySelector(`[data-${d}-matrix-track]`);let p=0;f.addEventListener("scroll",()=>{window.clearTimeout(p),p=window.setTimeout(()=>{const h=ga(f,d);Y(a,d,h),u(h)},100)},{passive:!0}),window.requestAnimationFrame(()=>{sa(a,l,{kitchen:r,smooth:!1})})}function X(a,t,s,r=0,i=()=>{},o=!0){a.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${t.map(l=>`
        <article class="summary-future-card" data-summary-future-screen="${l.index}" aria-hidden="${l.index!==r}">
          <header class="summary-future-card-head">
            <div><strong>${e(n(l.labelKey))}</strong><time datetime="${e(l.dateId)}">${e(N(l.dateId))}</time></div>
            ${ta(l)}
          </header>
          <div class="summary-future-meals">
            ${l.columns.map(u=>Z(u,s,o)).join("")}
          </div>
          ${D(l)}
        </article>
      `).join("")}
    </div>
  `;const m=a.querySelector("[data-summary-future-track]");let c=0;m?.addEventListener("scroll",()=>{window.clearTimeout(c),c=window.setTimeout(()=>{const l=Math.max(0,Math.min(1,Math.round(m.scrollLeft/Math.max(1,m.clientWidth+14))));m.querySelectorAll("[data-summary-future-screen]").forEach(u=>{u.setAttribute("aria-hidden",String(Number(u.dataset.summaryFutureScreen)!==l))}),i(l)},100)},{passive:!0}),window.requestAnimationFrame(()=>{m&&m.scrollTo({left:Math.max(0,r)*(m.clientWidth+14),behavior:"auto"})})}function Z(a,t,s=!0){const r=Array.isArray(a.names)?a.names:[],i=[...Array.isArray(a.specialDiets?.items)?a.specialDiets.items:[]].map(l=>y(l.tag)).filter(Boolean).sort((l,u)=>l.localeCompare(u,b(),{numeric:!0})),o=Number(a.guestCount||0),m=Number(a.sickCount||0),c=Array.isArray(a.sickDiets)?a.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${M(a.mealTypeId)}</span>
        <span class="summary-future-meal-name">${e(k(a,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${e(String(a.total||0))}</strong>
      </div>
      ${K(a,s)}
      ${o>0?L("summary.guests",o,"guests"):""}
      ${i.length?`<p class="summary-future-diets"><span>${e(n("summary.diets"))}:</span> <strong>${e(i.join(", "))}</strong></p>`:""}
      ${m>0?L("summary.sickMeals",m,"sick"):""}
      ${c.length>0?`<div class="summary-future-special-row"><span>${e(n("summary.sickDiets"))}</span><div>${S(c," summary-future-diet-list")}</div></div>`:""}
      ${r.length?`<div class="summary-future-people">${r.map(l=>aa(l,t)).join("")}</div>`:""}
    </section>
  `}function L(a,t,s){return s==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${e(String(t))}</strong><span>${e(n(a))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${e(s)}"><span>${e(n(a))}</span><strong>${e(String(t))}</strong></p>`}function aa(a,t){const s=String(a.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(u=>u[0]).join("").toUpperCase(),r=t==="signature"?a.signature||a.displayName:t==="initials"?a.initials||s||a.signature:a.displayName,i=Array.isArray(a.dietTags)?a.dietTags.map(u=>y(u)).filter(Boolean):[],o=`${e(r||"–")}${i.length?`&nbsp;<small>(${e(i.join(", "))})</small>`:""}`,m=C(a.phone),c=a.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${e(m)}" aria-label="${e(n("summary.callPerson",{name:a.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",l=a.whatsappEnabled&&a.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${e(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${e(n("summary.messagePerson",{name:a.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(c||l){const u=`summary-contact-popup-${++B}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${u}" aria-haspopup="dialog" aria-label="${e(n("summary.contactPerson",{name:a.displayName}))}">${o}</button><span class="summary-matrix-contact-popover" id="${u}" popover role="dialog"><span class="summary-matrix-contact-actions">${c}${l}</span></span></span>`}return`<span class="summary-future-person" title="${e(a.displayName||r)}">${o}</span>`}function ta(a){const t=a.columns.find(r=>r.dayIndex===a.index),s=t?.dayMassStatus;return!s||s==="UNKNOWN"?"":E(s,t.blessingTime)}function E(a,t=""){const s=a==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${s?"yes":"no"}"><span>${e(n("summary.mass"))}:</span><span class="mass-status-stack"><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${e(n(s?"summary.yes":"summary.no"))}</strong>${T(t)}</span></span>`}function sa(a,t,{kitchen:s=!1,smooth:r=!0}={}){const i=s?"kitchen":"summary",o=Number(t)===1?1:0;if(!s){const l=a?.querySelector("[data-summary-future-track]");if(l)return l.scrollTo({left:o*(l.clientWidth+14),behavior:r?"smooth":"auto"}),l.querySelectorAll("[data-summary-future-screen]").forEach(u=>{u.setAttribute("aria-hidden",String(Number(u.dataset.summaryFutureScreen)!==o))}),!0}const m=a?.querySelector(`[data-${i}-matrix-track]`),c=m?.querySelector(`[data-${i}-screen="${o}"]`);return!m||!c?!1:(m.scrollTo({left:m.scrollLeft+c.getBoundingClientRect().left-m.getBoundingClientRect().left,behavior:r?"smooth":"auto"}),Y(a,i,o),!0)}function ea(a,{kitchen:t,activeIndex:s,residentLabel:r="name",showContactHint:i=!0,dietLegend:o=[]}){const m=t?"kitchen":"summary",c=a.index===s,l=ra(a);return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!c}">
        <p class="empty-state">${e(n("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!c}">
      <table class="summary-matrix summary-matrix-optional-rows-${l}">
        ${na(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(u=>u.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${e(n("summary.item"))}</span></th>
            ${a.dateGroups.map(u=>`
              <th class="summary-matrix-date-heading${v(u,a)}" scope="colgroup" colspan="${u.span}">
                <span>${e(U(u.dayIndex))}</span>
                <time datetime="${e(u.dateId)}">${e(I(u.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(u=>`
              <th class="summary-matrix-meal-heading${v(u,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${M(u.mealTypeId)}</span><span class="summary-matrix-meal-label">${e(k(u))}</span>${ca(u,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?w(n("summary.guests"),"summary-matrix-row-guests",a,u=>String(u.guestCount)):""}
          ${w(n("summary.diningMeals"),"summary-matrix-row-meals",a,P)}
          ${a.hasSpecialDiets?w(n("summary.includedDiets"),"summary-matrix-row-diets",a,t?W:R):""}
          ${a.hasSickMeals?w(n("summary.sickMeals"),"summary-matrix-row-sick",a,F):""}
          ${a.hasSickDiets?w(n("summary.sickDiets"),"summary-matrix-row-sick-diets",a,H):""}
          ${a.hasMassInformation?la(a):""}
          ${t?"":oa(a,r,i)}
        </tbody>
      </table>
      ${t?G(a,o):""}
      ${D(a)}
    </section>
  `}function ra(a){return[a.hasGuestGroup,a.hasSickMeals,a.hasSickDiets].filter(Boolean).length}function na(a,t){return t?`<caption class="sr-only">${e(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${e(a.dateId)}">${e(N(a.dateId))}</time>
    </caption>
  `}function M(a){const t={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return ia({breakfast:"coffee",lunch:"sun",dinner:"moon"}[a],t[a]||"•")}function ia(a,t="•"){const s=document.documentElement.dataset.interfaceStyle;if(!(s==="cool"||s==="urban"||s==="future")||!a)return t;const o={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[a];return o?`<svg class="meal-line-icon meal-line-icon-${a}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${o}</svg>`:t}function k(a,{breakfastTomorrow:t=!1}={}){const s=String(a?.mealTypeId||"").trim().toLowerCase();if(t&&s==="breakfast")return n("summary.breakfastTomorrow");const r=s?n(`meal.type.${s}`):"",i=String(a?.label||"").trim();return r&&r!==`meal.type.${s}`?r:i}function w(a,t,s,r){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${e(a)}</th>
      ${s.columns.map(i=>`<td class="${v(i,s).trim()}">${r(i)}</td>`).join("")}
    </tr>
  `}function P(a,{contactHint:t=!1}={}){const s=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${e(n(s))}</span>${t?K(a):""}`}function q(a){return Array.isArray(a?.names)&&a.names.some(t=>t?.phoneConsent&&C(t.phone))}function K(a,t=!0){return!t||!q(a)?"":`<small class="summary-contact-hint">${e(n("summary.contactHint"))}</small>`}function F(a){if(a.sickCount===0)return g(n("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${e(n(t))}</span>`}function H(a){return a.sickDiets.length===0?g(n("summary.noDiet")):S(a.sickDiets)}function ma(a){if(a.massStatus==="UNKNOWN")return g(n("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${e(n(t?"summary.yes":"summary.no"))}</span>`}function oa(a,t="name",s=!0){return`
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
        ${s&&a.columns.some(q)?`<small class="summary-contact-hint">${e(n("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${e(n("summary.names"))}</span>
      </th>
      ${a.columns.map(i=>`<td class="${v(i,a).trim()}">${z(i,{compactActions:!0,residentLabel:t})}</td>`).join("")}
    </tr>
  `}function ua(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function la(a){const t=$a(a).map(s=>`<td class="summary-matrix-mass-band${v(s,a)}${ua(s.massStatus)}" colspan="${s.span}">${ha(s)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${e(n("summary.mass"))}</th>
      ${t}
    </tr>
  `}function ca(a,t){if(t||a.mealTypeId!=="breakfast")return"";const s=a.breakfastPlanned===!0,r=n(s?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${s?"yes":"no"}"><span aria-hidden="true">${s?"✓":"×"}</span>${e(r)}</span>`}function R(a){if(a.specialDiets.participantCount===0)return g(n("summary.noDiet"));const t=[...a.specialDiets.items].sort((s,r)=>y(s.tag).localeCompare(y(r.tag),b(),{numeric:!0}));return S(t)}function W(a){return a.specialDiets.participantCount===0?g(n("summary.noDiet")):S(a.specialDiets.items," summary-matrix-kitchen-diets")}function S(a,t=""){const s=[...a].sort((r,i)=>y(r.tag).localeCompare(y(i.tag),b(),{numeric:!0}));return`<ul class="summary-matrix-diets${t}">${s.map(r=>{const i=y(r.tag),o=Math.max(0,Math.floor(Number(r.count)||0)),m=o>1?`<span class="diet-code-count">× ${o}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${A(r.tag)}">${e(i)}</span>${m}</li>`}).join("")}</ul>`}function y(a){return _(j(a),n)}function z(a,{compactActions:t=!1,residentLabel:s="name"}={}){return a.names.length===0?g(n("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(r=>{const i=r.dietTags.map(p=>y(p)),o=C(r.phone),m=String(r.displayName||"").trim(),c=m.split(/\s+/).filter(Boolean).slice(0,3).map(p=>p[0]).join("").toUpperCase(),l=s==="signature"?r.signature||m:s==="initials"&&(r.initials||c||r.signature)||m,u=e(l),$=i.length?` <small>(${e(i.join(", "))})</small>`:"",d=`<span class="summary-matrix-person-name">${u}${$}</span>`,x=r.phoneConsent&&o?`<a class="summary-matrix-call" href="tel:${e(o)}" aria-label="${e(n("summary.callPerson",{name:r.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",f=r.whatsappEnabled&&r.phoneConsent&&o?`<a class="summary-matrix-whatsapp" href="https://wa.me/${e(o.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${e(n("summary.messagePerson",{name:r.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(t&&(x||f)){const p=`summary-contact-popup-${++B}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${p}" aria-haspopup="dialog" aria-label="${e(n("summary.contactPerson",{name:r.displayName}))}" title="${e(n("summary.contactPerson",{name:r.displayName}))}">${d}</button>
            <span class="summary-matrix-contact-popover" id="${p}" popover role="dialog" aria-label="${e(n("summary.contactPerson",{name:r.displayName}))}">
              <span class="summary-matrix-contact-actions">${x}${f}</span>
            </span>
          </li>`}return`<li>${d}<span class="summary-matrix-contact-actions">${x}${f}</span></li>`}).join("")}</ul>`}function C(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function da(a,{kitchen:t,activeIndex:s,residentLabel:r="name",showContactHint:i=!0,dietLegend:o=[]}){const m=t?"kitchen":"summary",c=a.index===s;return`
    <section class="summary-matrix-screen summary-international-screen${pa(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${m}-screen="${a.index}" role="tabpanel" aria-hidden="${!c}">
      ${t?`<h2 class="sr-only">${e(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${e(a.dateId)}">${e(N(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map((u,$,d)=>ya(u,{kitchen:t,residentLabel:r,showContactHint:i,showMassMetadata:$===0||d[$-1]?.dateId!==u.dateId})).join("")}
      </div>
      ${t?G(a,o):""}
      ${D(a)}
    </section>
  `}function pa(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function ya(a,{kitchen:t,residentLabel:s="name",showContactHint:r=!0,showMassMetadata:i=!1}){const o=t?W(a):R(a),m=i&&a.dayMassStatus!=="UNKNOWN"?E(a.dayMassStatus,a.blessingTime):"",c=a.guestCount>0?`<span class="summary-international-mobile-guests">${e(n("summary.guests"))}: <strong>${a.guestCount}</strong></span>`:"",l=m||c?`<div class="summary-international-card-actions">${m}${c}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${O(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${M(a.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${e(k(a,{breakfastTomorrow:!0}))}</strong><time datetime="${e(a.dateId)}">${e(I(a.dateId))}</time></div>
        ${l}
      </header>
      <dl>
        ${a.guestCount>0?`<div class="summary-international-guest-row"><dt>${e(n("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${e(n("summary.diningMeals"))}</dt><dd>${P(a,{contactHint:!t&&r})}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${e(n("summary.includedDiets"))}</dt><dd>${o}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${e(n("summary.sickMeals"))}</dt><dd>${F(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${e(n("summary.sickDiets"))}</dt><dd>${H(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${e(n("summary.names"))}</h3>${z(a,{compactActions:!0,residentLabel:s})}</section>`}
    </article>
  `}function $a(a){return a.dateGroups.map(t=>{const s=a.columns.find(r=>r.dateId===t.dateId);return{...t,massStatus:s?.dayMassStatus||"UNKNOWN",blessingTime:s?.blessingTime||""}})}function D(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${e(n("kitchen.notes.title"))}">
      <h3>${e(n("kitchen.notes.title"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${e(t.dateId)}">${e(I(t.dateId))}</time>
          <ul>${t.notes.map(s=>`<li><p>${e(s.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function G(a,t){const s=new Set;a.columns.forEach(i=>{[...i.specialDiets?.items||[],...i.sickDiets||[]].forEach(o=>{const m=j(o?.tag);/^\d{1,3}$/.test(m)&&s.add(m)})});const r=J(t).filter(i=>s.has(i.code));return r.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${e(n("kitchen.dietLegend.title"))}">
      <h3>${e(n("kitchen.dietLegend.title"))}</h3>
      <ul>${r.map(i=>`<li><strong class="diet-code-badge diet-code-tone-${A(i.code)}">${e(y(i.code))}</strong><span aria-hidden="true">=</span><span>${e(i.label)}</span></li>`).join("")}</ul>
    </section>
  `}function g(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${e(a)}</span>`}function fa(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function ha(a){const t=/^([01]\d|2[0-3]):[0-5]\d$/.test(a.blessingTime||""),s=t&&Number(a.span)<2,r=t?s?" summary-mass-control-blessing-narrow":" summary-mass-control-blessing-wide":"",i=t?` mass-status-with-blessing${s?" mass-status-narrow":" mass-status-wide-blessing"}`:"",o=t?T(a.blessingTime,s?{narrow:!0}:{compact:!0}):"";return`
    <span class="summary-mass-control${r}">
      <span class="summary-mass-control-day">${e(U(a.dayIndex))}</span>
      <span class="summary-mass-control-state mass-status-stack${i}">${ma(a)}${o}</span>
    </span>`}function v(a,t){return`${fa(a,t)} summary-day-tone-${O(a.dayIndex)}`}function O(a){return Math.max(0,Math.min(2,Number(a)||0))}function U(a){return[n("summary.today"),n("summary.tomorrow"),n("summary.dayAfterTomorrow")][a]||n("summary.followingDay")}function I(a){const[t,s,r]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(b(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,s-1,r))}function N(a){const[t,s,r]=String(a).split("-").map(Number);return!t||!s||!r?"":new Intl.DateTimeFormat(b(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,s-1,r))}function ga(a,t){const s=[...a.querySelectorAll(`[data-${t}-screen]`)];if(s.length===0)return 0;const r=s.reduce((i,o)=>Math.abs(o.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(i.getBoundingClientRect().left-a.getBoundingClientRect().left)?o:i);return Number(r.dataset[`${t}Screen`])===1?1:0}function Y(a,t,s){a.querySelectorAll(`[data-${t}-screen]`).forEach(r=>{r.setAttribute("aria-hidden",String(Number(r.dataset[`${t}Screen`])!==s))})}export{ka as mountSummaryMatrix,sa as scrollSummaryMatrix};

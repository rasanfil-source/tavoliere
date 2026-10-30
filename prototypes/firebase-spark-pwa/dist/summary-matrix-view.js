import{t as n,getLocale as b}from"./i18n/i18n.mjs?v=20261014b";import{escapeHtml as e}from"./html-utils.js?v=20261014b";import{renderBlessing as j}from"./blessing-view.mjs?v=20261014b";import{formatDietLabel as V,getDietBadgeTone as B,normalizeDietCode as E}from"./diet-utils.mjs?v=20261014b";import{normalizeKitchenDietLegend as X}from"./diet-legend.mjs?v=20261014b";import{buildKitchenMatrixScreens as Z,buildSummaryMatrixScreens as aa}from"./summary-matrix-model.js?v=20261014b";let K=0;function Aa(a,{days:t=[],operationDays:s=[],screenReady:r=()=>!0,kitchen:i=!1,layout:o="classic",residentLabel:u="name",dietLegend:l=[],showContactHint:c=!0,activeIndex:m=0,monthSummary:d=null,onActiveIndexChange:h=()=>{}}={}){const g=i?Z(t,s):aa(t,[],s);if(o==="future"&&!i){ta(a,g,u,m,h,c,r);return}if(g.every(y=>y.columns.length===0)){a.innerHTML=`<p class="empty-state">${e(n("summary.noMeal"))}</p>`;return}const $=i?"kitchen":"summary",f=o==="international"?ga:ma;if(a.innerHTML=`
    <div class="summary-matrix-track summary-layout-${o}${i?" summary-layout-kitchen":" summary-layout-diners"}" data-${$}-matrix-track aria-label="${e(n("summary.screensLabel"))}">
      ${g.map(y=>r(y.index)?f(y,{kitchen:i,activeIndex:m,residentLabel:u,showContactHint:c,dietLegend:l}):sa(y,{kitchen:i,activeIndex:m,layout:o})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${e(n("summary.swipeHint"))}</p>
    ${i?ca(d):""}
  `,i&&d?.onLoad){const y=a.querySelector("[data-kitchen-monthly-summary]");y?.addEventListener("toggle",()=>{y.open&&y.dataset.loading!=="true"&&da(y,d)})}const A=a.querySelector(`[data-${$}-matrix-track]`);let L=0;A.addEventListener("scroll",()=>{window.clearTimeout(L),L=window.setTimeout(()=>{const y=Sa(A,$);Q(a,$,y),h(y)},100)},{passive:!0}),window.requestAnimationFrame(()=>{ia(a,m,{kitchen:i,smooth:!1})})}function ta(a,t,s="name",r=0,i=()=>{},o=!0,u=()=>!0){a.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${t.map(m=>u(m.index)?`
        <article class="summary-future-card" data-summary-future-screen="${m.index}" aria-hidden="${m.index!==r}">
          <header class="summary-future-card-head">
            <div><strong>${e(n(m.labelKey))}</strong><time datetime="${e(m.dateId)}">${e(M(m.dateId))}</time></div>
            ${na(m)}
          </header>
          <div class="summary-future-meals">
            ${m.columns.map(d=>ea(d,s,o)).join("")}
          </div>
          ${T(m)}
        </article>
      `:`
        <article class="summary-future-card" data-summary-future-screen="${m.index}" aria-hidden="${m.index!==r}" aria-busy="true">
          <header class="summary-future-card-head"><div><strong>${e(n(m.labelKey))}</strong><time datetime="${e(m.dateId)}">${e(M(m.dateId))}</time></div></header>
          <p class="empty-state" role="status">${e(n("common.status.loading"))}</p>
        </article>
      `).join("")}
    </div>
  `;const l=a.querySelector("[data-summary-future-track]");let c=0;l?.addEventListener("scroll",()=>{window.clearTimeout(c),c=window.setTimeout(()=>{const m=Math.max(0,Math.min(1,Math.round(l.scrollLeft/Math.max(1,l.clientWidth+14))));l.querySelectorAll("[data-summary-future-screen]").forEach(d=>{d.setAttribute("aria-hidden",String(Number(d.dataset.summaryFutureScreen)!==m))}),i(m)},100)},{passive:!0}),window.requestAnimationFrame(()=>{l&&l.scrollTo({left:Math.max(0,r)*(l.clientWidth+14),behavior:"auto"})})}function sa(a,{kitchen:t,activeIndex:s,layout:r}){return`
    <section class="summary-matrix-screen${r==="international"?" summary-international-screen summary-screen-ordinary":""}" data-${t?"kitchen":"summary"}-screen="${a.index}" role="tabpanel" aria-hidden="${a.index!==s}" aria-busy="true">
      <p class="empty-state" role="status">${e(n("common.status.loading"))}</p>
    </section>
  `}function ea(a,t,s=!0){const r=Array.isArray(a.names)?a.names:[],i=[...Array.isArray(a.specialDiets?.items)?a.specialDiets.items:[]].map(c=>p(c.tag)).filter(Boolean).sort((c,m)=>c.localeCompare(m,b(),{numeric:!0})),o=Number(a.guestCount||0),u=Number(a.sickCount||0),l=Array.isArray(a.sickDiets)?a.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${C(a.mealTypeId)}</span>
        <span class="summary-future-meal-name">${e(D(a,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${e(String(a.total||0))}</strong>
      </div>
      ${R(a,s)}
      ${o>0?P("summary.guests",o,"guests"):""}
      ${i.length?`<p class="summary-future-diets"><span>${e(n("summary.diets"))}:</span> <strong>${e(i.join(", "))}</strong></p>`:""}
      ${u>0?P("summary.sickMeals",u,"sick"):""}
      ${l.length>0?`<div class="summary-future-special-row"><span>${e(n("summary.sickDiets"))}</span><div>${S(l," summary-future-diet-list")}</div></div>`:""}
      ${r.length?`<div class="summary-future-people">${r.map(c=>ra(c,t)).join("")}</div>`:""}
    </section>
  `}function P(a,t,s){return s==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${e(String(t))}</strong><span>${e(n(a))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${e(s)}"><span>${e(n(a))}</span><strong>${e(String(t))}</strong></p>`}function ra(a,t){const s=String(a.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(m=>m[0]).join("").toUpperCase(),r=t==="signature"?a.signature||a.displayName:t==="initials"?a.initials||s||a.signature:a.displayName,i=Array.isArray(a.dietTags)?a.dietTags.map(m=>p(m)).filter(Boolean):[],o=`${e(r||"–")}${i.length?`&nbsp;<small>(${e(i.join(", "))})</small>`:""}`,u=N(a.phone),l=a.phoneConsent&&u?`<a class="summary-matrix-call" href="tel:${e(u)}" aria-label="${e(n("summary.callPerson",{name:a.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",c=a.whatsappEnabled&&a.phoneConsent&&u?`<a class="summary-matrix-whatsapp" href="https://wa.me/${e(u.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${e(n("summary.messagePerson",{name:a.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(l||c){const m=`summary-contact-popup-${++K}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${m}" aria-haspopup="dialog" aria-label="${e(n("summary.contactPerson",{name:a.displayName}))}">${o}</button><span class="summary-matrix-contact-popover" id="${m}" popover role="dialog"><span class="summary-matrix-contact-actions">${l}${c}</span></span></span>`}return`<span class="summary-future-person" title="${e(a.displayName||r)}">${o}</span>`}function na(a){const t=a.columns.find(r=>r.dayIndex===a.index),s=t?.dayMassStatus;return!s||s==="UNKNOWN"?"":q(s,t.blessingTime)}function q(a,t=""){const s=a==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${s?"yes":"no"}"><span>${e(n("summary.mass"))}:</span><span class="mass-status-stack"><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${e(n(s?"summary.yes":"summary.no"))}</strong>${j(t)}</span></span>`}function ia(a,t,{kitchen:s=!1,smooth:r=!0}={}){const i=s?"kitchen":"summary",o=Number(t)===1?1:0;if(!s){const c=a?.querySelector("[data-summary-future-track]");if(c)return c.scrollTo({left:o*(c.clientWidth+14),behavior:r?"smooth":"auto"}),c.querySelectorAll("[data-summary-future-screen]").forEach(m=>{m.setAttribute("aria-hidden",String(Number(m.dataset.summaryFutureScreen)!==o))}),!0}const u=a?.querySelector(`[data-${i}-matrix-track]`),l=u?.querySelector(`[data-${i}-screen="${o}"]`);return!u||!l?!1:(u.scrollTo({left:u.scrollLeft+l.getBoundingClientRect().left-u.getBoundingClientRect().left,behavior:r?"smooth":"auto"}),Q(a,i,o),!0)}function ma(a,{kitchen:t,activeIndex:s,residentLabel:r="name",showContactHint:i=!0,dietLegend:o=[]}){const u=t?"kitchen":"summary",l=a.index===s,c=oa(a);return a.columns.length===0?`
      <section class="summary-matrix-screen" data-${u}-screen="${a.index}" role="tabpanel" aria-hidden="${!l}">
        <p class="empty-state">${e(n("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${u}-screen="${a.index}" role="tabpanel" aria-hidden="${!l}">
      <table class="summary-matrix summary-matrix-optional-rows-${c}">
        ${ua(a,t)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${a.columns.map(m=>m.dayIndex>a.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${e(n("summary.item"))}</span></th>
            ${a.dateGroups.map(m=>`
              <th class="summary-matrix-date-heading${v(m,a)}" scope="colgroup" colspan="${m.span}">
                <span>${e(J(m.dayIndex))}</span>
                <time datetime="${e(m.dateId)}">${e(k(m.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${a.columns.map(m=>`
              <th class="summary-matrix-meal-heading${v(m,a)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${C(m.mealTypeId)}</span><span class="summary-matrix-meal-label">${e(D(m))}</span>${ha(m,t)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${a.hasGuestGroup?w(n("summary.guests"),"summary-matrix-row-guests",a,m=>String(m.guestCount)):""}
          ${w(n("summary.diningMeals"),"summary-matrix-row-meals",a,H)}
          ${a.hasSpecialDiets?w(n("summary.includedDiets"),"summary-matrix-row-diets",a,t?O:G):""}
          ${a.hasSickMeals?w(n("summary.sickMeals"),"summary-matrix-row-sick",a,W):""}
          ${a.hasSickDiets?w(n("summary.sickDiets"),"summary-matrix-row-sick-diets",a,z):""}
          ${a.hasMassInformation?fa(a):""}
          ${t?"":pa(a,r,i)}
        </tbody>
      </table>
      ${t?Y(a,o):""}
      ${T(a)}
    </section>
  `}function oa(a){return[a.hasGuestGroup,a.hasSickMeals,a.hasSickDiets].filter(Boolean).length}function ua(a,t){return t?`<caption class="sr-only">${e(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${e(a.dateId)}">${e(M(a.dateId))}</time>
    </caption>
  `}function C(a){const t={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return la({breakfast:"coffee",lunch:"sun",dinner:"moon"}[a],t[a]||"•")}function la(a,t="•"){const s=document.documentElement.dataset.interfaceStyle;if(!(s==="cool"||s==="urban"||s==="future")||!a)return t;const o={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[a];return o?`<svg class="meal-line-icon meal-line-icon-${a}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${o}</svg>`:t}function D(a,{breakfastTomorrow:t=!1}={}){const s=String(a?.mealTypeId||"").trim().toLowerCase();if(t&&s==="breakfast")return n("summary.breakfastTomorrow");const r=s?n(`meal.type.${s}`):"",i=String(a?.label||"").trim();return r&&r!==`meal.type.${s}`?r:i}function w(a,t,s,r){return`
    <tr class="${t}">
      <th class="summary-matrix-label" scope="row">${e(a)}</th>
      ${s.columns.map(i=>`<td class="${v(i,s).trim()}">${r(i)}</td>`).join("")}
    </tr>
  `}function H(a,{contactHint:t=!1}={}){const s=a.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${a.total}</span><span class="summary-matrix-unit">${e(n(s))}</span>${t?R(a):""}`}function F(a){return Array.isArray(a?.names)&&a.names.some(t=>t?.phoneConsent&&N(t.phone))}function ca(a){return typeof a?.onLoad!="function"?"":`
    <section class="kitchen-monthly-summary">
      <details data-kitchen-monthly-summary>
        <summary>${e(n("kitchen.monthly.title"))}</summary>
        <div class="kitchen-monthly-summary-content" data-kitchen-monthly-summary-content role="status" aria-live="polite"></div>
      </details>
    </section>
  `}async function da(a,t){const s=a.querySelector("[data-kitchen-monthly-summary-content]");if(s){a.dataset.loading="true",s.textContent=n("kitchen.monthly.loading");try{const r=await t.onLoad(a.dataset.monthId);if(!a.isConnected||!a.open)return;if(!r){s.textContent=n("kitchen.monthly.notReady");return}s.innerHTML=`
      <p><strong>${e(n("kitchen.monthly.period"))}</strong> ${e(k(r.periodStart))} – ${e(k(r.periodEnd))}</p>
      <dl>
        ${I("breakfast",r.counts.breakfast)}
        ${I("lunch",r.counts.lunch)}
        ${I("dinner",r.counts.dinner)}
      </dl>
    `}catch{if(!a.isConnected||!a.open)return;s.textContent=n("kitchen.monthly.unavailable")}finally{delete a.dataset.loading}}}function I(a,t){const s=n(`meal.type.${a}`);return`<div><dt>${e(s)}</dt><dd>${e(t)}</dd></div>`}function R(a,t=!0){return!t||!F(a)?"":`<small class="summary-contact-hint">${e(n("summary.contactHint"))}</small>`}function W(a){if(a.sickCount===0)return x(n("summary.sickMeals"));const t=a.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${a.sickCount}</span><span class="summary-matrix-unit">${e(n(t))}</span>`}function z(a){return a.sickDiets.length===0?x(n("summary.noDiet")):S(a.sickDiets)}function ya(a){if(a.massStatus==="UNKNOWN")return x(n("summary.notSet"));const t=a.massStatus==="YES";return`<span class="summary-matrix-mass-${t?"yes":"no"}">${e(n(t?"summary.yes":"summary.no"))}</span>`}function pa(a,t="name",s=!0){return`
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
        ${s&&a.columns.some(F)?`<small class="summary-contact-hint">${e(n("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${e(n("summary.names"))}</span>
      </th>
      ${a.columns.map(i=>`<td class="${v(i,a).trim()}">${U(i,{compactActions:!0,residentLabel:t})}</td>`).join("")}
    </tr>
  `}function $a(a){return a==="YES"?" summary-mass-state-yes":a==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function fa(a){const t=wa(a).map(s=>`<td class="summary-matrix-mass-band${v(s,a)}${$a(s.massStatus)}" colspan="${s.span}">${ka(s)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${e(n("summary.mass"))}</th>
      ${t}
    </tr>
  `}function ha(a,t){if(t||a.mealTypeId!=="breakfast")return"";const s=a.breakfastPlanned===!0,r=n(s?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${s?"yes":"no"}"><span aria-hidden="true">${s?"✓":"×"}</span>${e(r)}</span>`}function G(a){if(a.specialDiets.participantCount===0)return x(n("summary.noDiet"));const t=[...a.specialDiets.items].sort((s,r)=>p(s.tag).localeCompare(p(r.tag),b(),{numeric:!0}));return S(t)}function O(a){return a.specialDiets.participantCount===0?x(n("summary.noDiet")):S(a.specialDiets.items," summary-matrix-kitchen-diets")}function S(a,t=""){const s=[...a].sort((r,i)=>p(r.tag).localeCompare(p(i.tag),b(),{numeric:!0}));return`<ul class="summary-matrix-diets${t}">${s.map(r=>{const i=p(r.tag),o=Math.max(0,Math.floor(Number(r.count)||0)),u=o>1?`<span class="diet-code-count">× ${o}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${B(r.tag)}">${e(i)}</span>${u}</li>`}).join("")}</ul>`}function p(a){return V(E(a),n)}function U(a,{compactActions:t=!1,residentLabel:s="name"}={}){return a.names.length===0?x(n("summary.noName")):`<ul class="summary-matrix-names">${a.names.map(r=>{const i=r.dietTags.map(f=>p(f)),o=N(r.phone),u=String(r.displayName||"").trim(),l=u.split(/\s+/).filter(Boolean).slice(0,3).map(f=>f[0]).join("").toUpperCase(),c=s==="signature"?r.signature||u:s==="initials"&&(r.initials||l||r.signature)||u,m=e(c),d=i.length?` <small>(${e(i.join(", "))})</small>`:"",h=`<span class="summary-matrix-person-name">${m}${d}</span>`,g=r.phoneConsent&&o?`<a class="summary-matrix-call" href="tel:${e(o)}" aria-label="${e(n("summary.callPerson",{name:r.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",$=r.whatsappEnabled&&r.phoneConsent&&o?`<a class="summary-matrix-whatsapp" href="https://wa.me/${e(o.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${e(n("summary.messagePerson",{name:r.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(t&&(g||$)){const f=`summary-contact-popup-${++K}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${f}" aria-haspopup="dialog" aria-label="${e(n("summary.contactPerson",{name:r.displayName}))}" title="${e(n("summary.contactPerson",{name:r.displayName}))}">${h}</button>
            <span class="summary-matrix-contact-popover" id="${f}" popover role="dialog" aria-label="${e(n("summary.contactPerson",{name:r.displayName}))}">
              <span class="summary-matrix-contact-actions">${g}${$}</span>
            </span>
          </li>`}return`<li>${h}<span class="summary-matrix-contact-actions">${g}${$}</span></li>`}).join("")}</ul>`}function N(a){const t=String(a||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(t)?t:""}function ga(a,{kitchen:t,activeIndex:s,residentLabel:r="name",showContactHint:i=!0,dietLegend:o=[]}){const u=t?"kitchen":"summary",l=a.index===s;return`
    <section class="summary-matrix-screen summary-international-screen${xa(a)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${u}-screen="${a.index}" role="tabpanel" aria-hidden="${!l}">
      ${t?`<h2 class="sr-only">${e(`${n("kitchen.view.title")}: ${n(a.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${e(a.dateId)}">${e(M(a.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${a.columns.map((m,d,h)=>ba(m,{kitchen:t,residentLabel:r,showContactHint:i,showMassMetadata:d===0||h[d-1]?.dateId!==m.dateId})).join("")}
      </div>
      ${t?Y(a,o):""}
      ${T(a)}
    </section>
  `}function xa(a){return a.columns.some(t=>t.guestCount>0||t.specialDiets.participantCount>0||t.sickCount>0||t.sickDiets.length>0)||a.notesByDate.length>0}function ba(a,{kitchen:t,residentLabel:s="name",showContactHint:r=!0,showMassMetadata:i=!1}){const o=t?O(a):G(a),u=i&&a.dayMassStatus!=="UNKNOWN"?q(a.dayMassStatus,a.blessingTime):"",l=a.guestCount>0?`<span class="summary-international-mobile-guests">${e(n("summary.guests"))}: <strong>${a.guestCount}</strong></span>`:"",c=u||l?`<div class="summary-international-card-actions">${u}${l}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${_(a.dayIndex)}${a.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${C(a.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${e(D(a,{breakfastTomorrow:!0}))}</strong><time datetime="${e(a.dateId)}">${e(k(a.dateId))}</time></div>
        ${c}
      </header>
      <dl>
        ${a.guestCount>0?`<div class="summary-international-guest-row"><dt>${e(n("summary.guests"))}</dt><dd>${a.guestCount}</dd></div>`:""}
        <div><dt>${e(n("summary.diningMeals"))}</dt><dd>${H(a,{contactHint:!t&&r})}</dd></div>
        ${a.specialDiets.participantCount>0?`<div><dt>${e(n("summary.includedDiets"))}</dt><dd>${o}</dd></div>`:""}
        ${a.sickCount>0?`<div><dt>${e(n("summary.sickMeals"))}</dt><dd>${W(a)}</dd></div>`:""}
        ${a.sickDiets.length>0?`<div><dt>${e(n("summary.sickDiets"))}</dt><dd>${z(a)}</dd></div>`:""}
      </dl>
      ${t?"":`<section class="summary-international-names"><h3>${e(n("summary.names"))}</h3>${U(a,{compactActions:!0,residentLabel:s})}</section>`}
    </article>
  `}function wa(a){return a.dateGroups.map(t=>{const s=a.columns.find(r=>r.dateId===t.dateId);return{...t,massStatus:s?.dayMassStatus||"UNKNOWN",blessingTime:s?.blessingTime||""}})}function T(a){return a.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${e(n("kitchen.notes.title"))}">
      <h3>${e(n("kitchen.notes.title"))}</h3>
      ${a.notesByDate.map(t=>`
        <div class="kitchen-notes-group">
          <time datetime="${e(t.dateId)}">${e(k(t.dateId))}</time>
          <ul>${t.notes.map(s=>`<li><p>${e(s.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function Y(a,t){const s=new Set;a.columns.forEach(i=>{[...i.specialDiets?.items||[],...i.sickDiets||[]].forEach(o=>{const u=E(o?.tag);/^\d{1,3}$/.test(u)&&s.add(u)})});const r=X(t).filter(i=>s.has(i.code));return r.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${e(n("kitchen.dietLegend.title"))}">
      <h3>${e(n("kitchen.dietLegend.title"))}</h3>
      <ul>${r.map(i=>`<li><strong class="diet-code-badge diet-code-tone-${B(i.code)}">${e(p(i.code))}</strong><span aria-hidden="true">=</span><span>${e(i.label)}</span></li>`).join("")}</ul>
    </section>
  `}function x(a){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${e(a)}</span>`}function va(a,t){return a.dayIndex>t.index?" summary-matrix-next-date":""}function ka(a){const t=/^([01]\d|2[0-3]):[0-5]\d$/.test(a.blessingTime||""),s=t&&Number(a.span)<2,r=t?s?" summary-mass-control-blessing-narrow":" summary-mass-control-blessing-wide":"",i=t?` mass-status-with-blessing${s?" mass-status-narrow":" mass-status-wide-blessing"}`:"",o=t?j(a.blessingTime,s?{narrow:!0}:{compact:!0}):"";return`
    <span class="summary-mass-control${r}">
      <span class="summary-mass-control-day">${e(J(a.dayIndex))}</span>
      <span class="summary-mass-control-state mass-status-stack${i}">${ya(a)}${o}</span>
    </span>`}function v(a,t){return`${va(a,t)} summary-day-tone-${_(a.dayIndex)}`}function _(a){return Math.max(0,Math.min(2,Number(a)||0))}function J(a){return[n("summary.today"),n("summary.tomorrow"),n("summary.dayAfterTomorrow")][a]||n("summary.followingDay")}function k(a){const[t,s,r]=String(a).split("-").map(Number);return new Intl.DateTimeFormat(b(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(t,s-1,r))}function M(a){const[t,s,r]=String(a).split("-").map(Number);return!t||!s||!r?"":new Intl.DateTimeFormat(b(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(t,s-1,r))}function Sa(a,t){const s=[...a.querySelectorAll(`[data-${t}-screen]`)];if(s.length===0)return 0;const r=s.reduce((i,o)=>Math.abs(o.getBoundingClientRect().left-a.getBoundingClientRect().left)<Math.abs(i.getBoundingClientRect().left-a.getBoundingClientRect().left)?o:i);return Number(r.dataset[`${t}Screen`])===1?1:0}function Q(a,t,s){a.querySelectorAll(`[data-${t}-screen]`).forEach(r=>{r.setAttribute("aria-hidden",String(Number(r.dataset[`${t}Screen`])!==s))})}export{Aa as mountSummaryMatrix,ia as scrollSummaryMatrix};

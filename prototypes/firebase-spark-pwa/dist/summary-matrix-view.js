import{t as r,getLocale as v}from"./i18n/i18n.mjs?v=20261031b";import{escapeHtml as s}from"./html-utils.js?v=20261014b";import{renderBlessing as z}from"./blessing-view.mjs?v=20261031b";import{formatDietLabel as it,getDietBadgeTone as H,normalizeDietCode as F}from"./diet-utils.mjs?v=20261014b";import{normalizeKitchenDietLegend as ot}from"./diet-legend.mjs?v=20261014b";import{buildKitchenMatrixScreens as mt,buildSummaryMatrixScreens as lt}from"./summary-matrix-model.js?v=20261014b";let R=0;const W=new WeakMap;function Rt(t,{days:e=[],operationDays:a=[],screenReady:n=()=>!0,kitchen:o=!1,layout:i="classic",residentLabel:l="name",dietLegend:u=[],showContactHint:d=!0,activeIndex:m=0,monthSummary:y=null,onActiveIndexChange:h=()=>{}}={}){const b=o?mt(e,a):lt(e,[],a);if(i==="future"&&!o){ut(t,b,l,m,h,d,n);return}if(b.every(p=>p.columns.length===0)&&!(o&&y?.onLoad)){t.innerHTML=`<p class="empty-state">${s(r("summary.noMeal"))}</p>`;return}const f=o?"kitchen":"summary",g=i==="international"?Tt:$t;if(t.innerHTML=`
    <div class="summary-matrix-track summary-layout-${i}${o?" summary-layout-kitchen":" summary-layout-diners"}" data-${f}-matrix-track aria-label="${s(r("summary.screensLabel"))}">
      ${b.map(p=>n(p.index)?g(p,{kitchen:o,activeIndex:m,residentLabel:l,showContactHint:d,dietLegend:u}):dt(p,{kitchen:o,activeIndex:m,layout:i})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${s(r("summary.swipeHint"))}</p>
    ${o?xt(y):""}
  `,o&&y?.onLoad){const p=t.querySelector("[data-kitchen-monthly-summary]"),N=p?.querySelector("[data-kitchen-monthly-summary-content]");if(p&&N){const q=y.centerId||"";let c=W.get(t);(!c||c.centerId!==q)&&(c={centerId:q,open:!1,latestMonthId:null,earliestMonthId:null,selectedMonthId:null,latestSummary:null,summaries:new Map,loading:!1,details:null},W.set(t,c)),c.details=p,p.open=c.open,N.addEventListener("click",rt=>{const T=rt.target?.closest?.("[data-kitchen-month-step]");if(!T||T.disabled||!p.open||c.loading)return;const k=Mt(c.selectedMonthId,Number(T.dataset.kitchenMonthStep));!k||k<c.earliestMonthId||k>c.latestMonthId||(c.selectedMonthId=k,_(p,y,c,k))}),p.addEventListener("toggle",()=>{c.details!==p||c.open===p.open||(c.open=p.open,p.open&&!c.loading&&(c.latestMonthId=null,_(p,y,c)))}),c.open&&L(N,c,{summary:c.summaries.get(c.selectedMonthId),message:c.message||"",loading:c.loading})}}const K=t.querySelector(`[data-${f}-matrix-track]`);let P=0;K.addEventListener("scroll",()=>{window.clearTimeout(P),P=window.setTimeout(()=>{const p=Et(K,f);nt(t,f,p),h(p)},100)},{passive:!0}),window.requestAnimationFrame(()=>{ht(t,m,{kitchen:o,smooth:!1})})}function ut(t,e,a="name",n=0,o=()=>{},i=!0,l=()=>!0){t.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${e.map(m=>l(m.index)?`
        <article class="summary-future-card" data-summary-future-screen="${m.index}" aria-hidden="${m.index!==n}">
          <header class="summary-future-card-head">
            <div><strong>${s(r(m.labelKey))}</strong><time datetime="${s(m.dateId)}">${s(D(m.dateId))}</time></div>
            ${yt(m)}
          </header>
          <div class="summary-future-meals">
            ${m.columns.map(y=>ct(y,a,i)).join("")}
          </div>
          ${E(m)}
        </article>
      `:`
        <article class="summary-future-card" data-summary-future-screen="${m.index}" aria-hidden="${m.index!==n}" aria-busy="true">
          <header class="summary-future-card-head"><div><strong>${s(r(m.labelKey))}</strong><time datetime="${s(m.dateId)}">${s(D(m.dateId))}</time></div></header>
          <p class="empty-state" role="status">${s(r("common.status.loading"))}</p>
        </article>
      `).join("")}
    </div>
  `;const u=t.querySelector("[data-summary-future-track]");let d=0;u?.addEventListener("scroll",()=>{window.clearTimeout(d),d=window.setTimeout(()=>{const m=Math.max(0,Math.min(1,Math.round(u.scrollLeft/Math.max(1,u.clientWidth+14))));u.querySelectorAll("[data-summary-future-screen]").forEach(y=>{y.setAttribute("aria-hidden",String(Number(y.dataset.summaryFutureScreen)!==m))}),o(m)},100)},{passive:!0}),window.requestAnimationFrame(()=>{u&&u.scrollTo({left:Math.max(0,n)*(u.clientWidth+14),behavior:"auto"})})}function dt(t,{kitchen:e,activeIndex:a,layout:n}){return`
    <section class="summary-matrix-screen${n==="international"?" summary-international-screen summary-screen-ordinary":""}" data-${e?"kitchen":"summary"}-screen="${t.index}" role="tabpanel" aria-hidden="${t.index!==a}" aria-busy="true">
      <p class="empty-state" role="status">${s(r("common.status.loading"))}</p>
    </section>
  `}function ct(t,e,a=!0){const n=Array.isArray(t.names)?t.names:[],o=[...Array.isArray(t.specialDiets?.items)?t.specialDiets.items:[]].map(d=>$(d.tag)).filter(Boolean).sort((d,m)=>d.localeCompare(m,v(),{numeric:!0})),i=Number(t.guestCount||0),l=Number(t.sickCount||0),u=Array.isArray(t.sickDiets)?t.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${S(t.mealTypeId)}</span>
        <span class="summary-future-meal-name">${s(A(t,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${s(String(t.total||0))}</strong>
      </div>
      ${J(t,a)}
      ${i>0?U("summary.guests",i,"guests"):""}
      ${o.length?`<p class="summary-future-diets"><span>${s(r("summary.diets"))}:</span> <strong>${s(o.join(", "))}</strong></p>`:""}
      ${l>0?U("summary.sickMeals",l,"sick"):""}
      ${u.length>0?`<div class="summary-future-special-row"><span>${s(r("summary.sickDiets"))}</span><div>${C(u," summary-future-diet-list")}</div></div>`:""}
      ${n.length?`<div class="summary-future-people">${n.map(d=>pt(d,e)).join("")}</div>`:""}
    </section>
  `}function U(t,e,a){return a==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${s(String(e))}</strong><span>${s(r(t))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${s(a)}"><span>${s(r(t))}</span><strong>${s(String(e))}</strong></p>`}function pt(t,e){const a=String(t.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(m=>m[0]).join("").toUpperCase(),n=e==="signature"?t.signature||t.displayName:e==="initials"?t.initials||a||t.signature:t.displayName,o=Array.isArray(t.dietTags)?t.dietTags.map(m=>$(m)).filter(Boolean):[],i=`${s(n||"–")}${o.length?`&nbsp;<small>(${s(o.join(", "))})</small>`:""}`,l=j(t.phone),u=t.phoneConsent&&l?`<a class="summary-matrix-call" href="tel:${s(l)}" aria-label="${s(r("summary.callPerson",{name:t.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",d=t.whatsappEnabled&&t.phoneConsent&&l?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(l.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(r("summary.messagePerson",{name:t.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(u||d){const m=`summary-contact-popup-${++R}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${m}" aria-haspopup="dialog" aria-label="${s(r("summary.contactPerson",{name:t.displayName}))}">${i}</button><span class="summary-matrix-contact-popover" id="${m}" popover role="dialog"><span class="summary-matrix-contact-actions">${u}${d}</span></span></span>`}return`<span class="summary-future-person" title="${s(t.displayName||n)}">${i}</span>`}function yt(t){const e=t.columns.find(n=>n.dayIndex===t.index),a=e?.dayMassStatus;return!a||a==="UNKNOWN"?"":G(a,e.blessingTime)}function G(t,e=""){const a=t==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${a?"yes":"no"}"><span>${s(r("summary.mass"))}:</span><span class="mass-status-stack"><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${s(r(a?"summary.yes":"summary.no"))}</strong>${z(e)}</span></span>`}function ht(t,e,{kitchen:a=!1,smooth:n=!0}={}){const o=a?"kitchen":"summary",i=Number(e)===1?1:0;if(!a){const d=t?.querySelector("[data-summary-future-track]");if(d)return d.scrollTo({left:i*(d.clientWidth+14),behavior:n?"smooth":"auto"}),d.querySelectorAll("[data-summary-future-screen]").forEach(m=>{m.setAttribute("aria-hidden",String(Number(m.dataset.summaryFutureScreen)!==i))}),!0}const l=t?.querySelector(`[data-${o}-matrix-track]`),u=l?.querySelector(`[data-${o}-screen="${i}"]`);return!l||!u?!1:(l.scrollTo({left:l.scrollLeft+u.getBoundingClientRect().left-l.getBoundingClientRect().left,behavior:n?"smooth":"auto"}),nt(t,o,i),!0)}function $t(t,{kitchen:e,activeIndex:a,residentLabel:n="name",showContactHint:o=!0,dietLegend:i=[]}){const l=e?"kitchen":"summary",u=t.index===a,d=ft(t);return t.columns.length===0?`
      <section class="summary-matrix-screen" data-${l}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
        <p class="empty-state">${s(r("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${l}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      <table class="summary-matrix summary-matrix-optional-rows-${d}">
        ${gt(t,e)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${t.columns.map(m=>m.dayIndex>t.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${s(r("summary.item"))}</span></th>
            ${t.dateGroups.map(m=>`
              <th class="summary-matrix-date-heading${w(m,t)}" scope="colgroup" colspan="${m.span}">
                <span>${s(st(m.dayIndex))}</span>
                <time datetime="${s(m.dateId)}">${s(x(m.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${t.columns.map(m=>`
              <th class="summary-matrix-meal-heading${w(m,t)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${S(m.mealTypeId)}</span><span class="summary-matrix-meal-label">${s(A(m))}</span>${Nt(m,e)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${t.hasGuestGroup?I(r("summary.guests"),"summary-matrix-row-guests",t,m=>String(m.guestCount)):""}
          ${I(r("summary.diningMeals"),"summary-matrix-row-meals",t,O)}
          ${t.hasSpecialDiets?I(r("summary.includedDiets"),"summary-matrix-row-diets",t,e?Z:X):""}
          ${t.hasSickMeals?I(r("summary.sickMeals"),"summary-matrix-row-sick",t,Q):""}
          ${t.hasSickDiets?I(r("summary.sickDiets"),"summary-matrix-row-sick-diets",t,V):""}
          ${t.hasMassInformation?Dt(t):""}
          ${e?"":wt(t,n,o)}
        </tbody>
      </table>
      ${e?at(t,i):""}
      ${E(t)}
    </section>
  `}function ft(t){return[t.hasGuestGroup,t.hasSickMeals,t.hasSickDiets].filter(Boolean).length}function gt(t,e){return e?`<caption class="sr-only">${s(`${r("kitchen.view.title")}: ${r(t.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${s(t.dateId)}">${s(D(t.dateId))}</time>
    </caption>
  `}function S(t){const e={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return bt({breakfast:"coffee",lunch:"sun",dinner:"moon"}[t],e[t]||"•")}function bt(t,e="•"){const a=document.documentElement.dataset.interfaceStyle;if(!(a==="cool"||a==="urban"||a==="future")||!t)return e;const i={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[t];return i?`<svg class="meal-line-icon meal-line-icon-${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${i}</svg>`:e}function A(t,{breakfastTomorrow:e=!1}={}){const a=String(t?.mealTypeId||"").trim().toLowerCase();if(e&&a==="breakfast")return r("summary.breakfastTomorrow");const n=a?r(`meal.type.${a}`):"",o=String(t?.label||"").trim();return n&&n!==`meal.type.${a}`?n:o}function I(t,e,a,n){return`
    <tr class="${e}">
      <th class="summary-matrix-label" scope="row">${s(t)}</th>
      ${a.columns.map(o=>`<td class="${w(o,a).trim()}">${n(o)}</td>`).join("")}
    </tr>
  `}function O(t,{contactHint:e=!1}={}){const a=t.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${t.total}</span><span class="summary-matrix-unit">${s(r(a))}</span>${e?J(t):""}`}function Y(t){return Array.isArray(t?.names)&&t.names.some(e=>e?.phoneConsent&&j(e.phone))}function xt(t){return typeof t?.onLoad!="function"?"":`
    <section class="kitchen-monthly-summary">
      <details data-kitchen-monthly-summary>
        <summary>${s(r("kitchen.monthly.title"))}</summary>
        <div class="kitchen-monthly-summary-content" data-kitchen-monthly-summary-content role="status" aria-live="polite"></div>
      </details>
    </section>
  `}async function _(t,e,a,n=null){const o=t.querySelector("[data-kitchen-monthly-summary-content]");if(!(!o||a.loading)){a.loading=!0,a.message=r("kitchen.monthly.loading"),t.dataset.loading="true",a.latestMonthId===null?o.textContent=r("kitchen.monthly.loading"):L(o,a,{message:r("kitchen.monthly.loading"),loading:!0});try{let i=null;if(a.latestMonthId===null){if(i=await e.onLoad(),i?.monthId){a.latestMonthId=i.monthId,a.earliestMonthId=i.earliestMonthId||i.monthId,a.latestSummary=i,a.summaries=new Map([...a.summaries].filter(([,u])=>u.finalized===!0)),a.summaries.set(i.monthId,i);const l=n||a.selectedMonthId;a.selectedMonthId=l&&l>=a.earliestMonthId&&l<=a.latestMonthId?l:i.monthId,a.selectedMonthId!==i.monthId&&(i=await e.onLoad(a.selectedMonthId),i&&a.summaries.set(a.selectedMonthId,i))}}else{const l=n||a.selectedMonthId||a.latestMonthId;a.selectedMonthId=l,l===a.latestMonthId?i=a.latestSummary:a.summaries.has(l)?i=a.summaries.get(l):(i=await e.onLoad(l),i&&a.summaries.set(l,i))}if(!i){a.message=r(a.latestMonthId===null?"kitchen.monthly.firstAvailable":"kitchen.monthly.notReady");return}a.message=""}catch{a.message=r("kitchen.monthly.unavailable")}finally{a.loading=!1,delete t.dataset.loading;const i=a.details,l=i?.querySelector("[data-kitchen-monthly-summary-content]");i?.isConnected&&i.open&&l&&L(l,a,{summary:a.summaries.get(a.selectedMonthId),message:a.message})}}}function L(t,e,{summary:a=null,message:n="",loading:o=!1}={}){const i=e.selectedMonthId;if(!i){t.textContent=n;return}const l=a?.periodStart||`${i}-01`,u=a?.periodEnd||kt(i),d=o||!e.earliestMonthId||i<=e.earliestMonthId,m=o||!e.latestMonthId||i>=e.latestMonthId,y=n?s(n):`${vt(a)}<dl>
        ${B("breakfast",a.counts.breakfast)}
        ${B("lunch",a.counts.lunch)}
        ${B("dinner",a.counts.dinner)}
      </dl>
      <div class="kitchen-monthly-guest-total">
        <span>${s(r("kitchen.monthly.guests"))}</span>
        <strong>${s(a.invitedTotal)}</strong>
      </div>${a.missingDates?.length?`
      <p class="kitchen-monthly-missing-days"><strong>${s(r("kitchen.monthly.missingDays"))}</strong> ${a.missingDates.map(h=>s(x(h))).join(", ")}</p>
      <p class="kitchen-monthly-partial-note">${s(r("kitchen.monthly.partial"))}</p>`:""}`;t.innerHTML=`
    <div class="kitchen-monthly-period">
      <button class="kitchen-monthly-nav-button" type="button"
        data-kitchen-month-step="-1"
        aria-label="${s(r("kitchen.monthly.previous"))}"
        ${d?"disabled":""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 6 12l9 8z"></path></svg>
      </button>
      <p><strong>${s(r("kitchen.monthly.period"))}</strong> ${s(x(l))} – ${s(x(u))}</p>
      <button class="kitchen-monthly-nav-button" type="button"
        data-kitchen-month-step="1"
        aria-label="${s(r("kitchen.monthly.next"))}"
        ${m?"disabled":""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 9 8-9 8z"></path></svg>
      </button>
    </div>
    <div class="kitchen-monthly-summary-status" role="status" aria-live="polite">${y}</div>
  `}function Mt(t,e){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(t||"")||!Number.isInteger(e))return null;const[a,n]=t.split("-").map(Number),o=a*12+n-1+e;if(o<0)return null;const i=Math.floor(o/12),l=o%12+1;return`${String(i).padStart(4,"0")}-${String(l).padStart(2,"0")}`}function kt(t){const[e,a]=t.split("-").map(Number),n=new Date(Date.UTC(e,a,0)).getUTCDate();return`${t}-${String(n).padStart(2,"0")}`}function B(t,e){const a=r(`meal.type.${t}`);return`<div><dt>${s(a)}</dt><dd>${s(e)}</dd></div>`}function vt(t){let e;return t.finalized?e=r("kitchen.monthly.finalized"):t.closedThrough?t.closedThrough===t.periodEnd?e=r("kitchen.monthly.incomplete"):e=r("kitchen.monthly.progress",{date:x(t.closedThrough)}):e=r("kitchen.monthly.noClosedDays"),`<p class="kitchen-monthly-progress">${s(e)}</p>`}function J(t,e=!0){return!e||!Y(t)?"":`<small class="summary-contact-hint">${s(r("summary.contactHint"))}</small>`}function Q(t){if(t.sickCount===0)return M(r("summary.sickMeals"));const e=t.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${t.sickCount}</span><span class="summary-matrix-unit">${s(r(e))}</span>`}function V(t){return t.sickDiets.length===0?M(r("summary.noDiet")):C(t.sickDiets)}function It(t){if(t.massStatus==="UNKNOWN")return M(r("summary.notSet"));const e=t.massStatus==="YES";return`<span class="summary-matrix-mass-${e?"yes":"no"}">${s(r(e?"summary.yes":"summary.no"))}</span>`}function wt(t,e="name",a=!0){return`
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
        ${a&&t.columns.some(Y)?`<small class="summary-contact-hint">${s(r("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${s(r("summary.names"))}</span>
      </th>
      ${t.columns.map(o=>`<td class="${w(o,t).trim()}">${tt(o,{compactActions:!0,residentLabel:e})}</td>`).join("")}
    </tr>
  `}function Ct(t){return t==="YES"?" summary-mass-state-yes":t==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function Dt(t){const e=Lt(t).map(a=>`<td class="summary-matrix-mass-band${w(a,t)}${Ct(a.massStatus)}" colspan="${a.span}">${jt(a)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${s(r("summary.mass"))}</th>
      ${e}
    </tr>
  `}function Nt(t,e){if(e||t.mealTypeId!=="breakfast")return"";const a=t.breakfastPlanned===!0,n=r(a?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${a?"yes":"no"}"><span aria-hidden="true">${a?"✓":"×"}</span>${s(n)}</span>`}function X(t){if(t.specialDiets.participantCount===0)return M(r("summary.noDiet"));const e=[...t.specialDiets.items].sort((a,n)=>$(a.tag).localeCompare($(n.tag),v(),{numeric:!0}));return C(e)}function Z(t){return t.specialDiets.participantCount===0?M(r("summary.noDiet")):C(t.specialDiets.items," summary-matrix-kitchen-diets")}function C(t,e=""){const a=[...t].sort((n,o)=>$(n.tag).localeCompare($(o.tag),v(),{numeric:!0}));return`<ul class="summary-matrix-diets${e}">${a.map(n=>{const o=$(n.tag),i=Math.max(0,Math.floor(Number(n.count)||0)),l=i>1?`<span class="diet-code-count">× ${i}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${H(n.tag)}">${s(o)}</span>${l}</li>`}).join("")}</ul>`}function $(t){return it(F(t),r)}function tt(t,{compactActions:e=!1,residentLabel:a="name"}={}){return t.names.length===0?M(r("summary.noName")):`<ul class="summary-matrix-names">${t.names.map(n=>{const o=n.dietTags.map(g=>$(g)),i=j(n.phone),l=String(n.displayName||"").trim(),u=l.split(/\s+/).filter(Boolean).slice(0,3).map(g=>g[0]).join("").toUpperCase(),d=a==="signature"?n.signature||l:a==="initials"&&(n.initials||u||n.signature)||l,m=s(d),y=o.length?` <small>(${s(o.join(", "))})</small>`:"",h=`<span class="summary-matrix-person-name">${m}${y}</span>`,b=n.phoneConsent&&i?`<a class="summary-matrix-call" href="tel:${s(i)}" aria-label="${s(r("summary.callPerson",{name:n.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",f=n.whatsappEnabled&&n.phoneConsent&&i?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(i.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(r("summary.messagePerson",{name:n.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(e&&(b||f)){const g=`summary-contact-popup-${++R}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${g}" aria-haspopup="dialog" aria-label="${s(r("summary.contactPerson",{name:n.displayName}))}" title="${s(r("summary.contactPerson",{name:n.displayName}))}">${h}</button>
            <span class="summary-matrix-contact-popover" id="${g}" popover role="dialog" aria-label="${s(r("summary.contactPerson",{name:n.displayName}))}">
              <span class="summary-matrix-contact-actions">${b}${f}</span>
            </span>
          </li>`}return`<li>${h}<span class="summary-matrix-contact-actions">${b}${f}</span></li>`}).join("")}</ul>`}function j(t){const e=String(t||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(e)?e:""}function Tt(t,{kitchen:e,activeIndex:a,residentLabel:n="name",showContactHint:o=!0,dietLegend:i=[]}){const l=e?"kitchen":"summary",u=t.index===a;return`
    <section class="summary-matrix-screen summary-international-screen${St(t)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${l}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      ${e?`<h2 class="sr-only">${s(`${r("kitchen.view.title")}: ${r(t.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${s(t.dateId)}">${s(D(t.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${t.columns.map((m,y,h)=>At(m,{kitchen:e,residentLabel:n,showContactHint:o,showMassMetadata:y===0||h[y-1]?.dateId!==m.dateId})).join("")}
      </div>
      ${e?at(t,i):""}
      ${E(t)}
    </section>
  `}function St(t){return t.columns.some(e=>e.guestCount>0||e.specialDiets.participantCount>0||e.sickCount>0||e.sickDiets.length>0)||t.notesByDate.length>0}function At(t,{kitchen:e,residentLabel:a="name",showContactHint:n=!0,showMassMetadata:o=!1}){const i=e?Z(t):X(t),l=o&&t.dayMassStatus!=="UNKNOWN"?G(t.dayMassStatus,t.blessingTime):"",u=t.guestCount>0?`<span class="summary-international-mobile-guests">${s(r("summary.guests"))}: <strong>${t.guestCount}</strong></span>`:"",d=l||u?`<div class="summary-international-card-actions">${l}${u}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${et(t.dayIndex)}${t.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${S(t.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${s(A(t,{breakfastTomorrow:!0}))}</strong><time datetime="${s(t.dateId)}">${s(x(t.dateId))}</time></div>
        ${d}
      </header>
      <dl>
        ${t.guestCount>0?`<div class="summary-international-guest-row"><dt>${s(r("summary.guests"))}</dt><dd>${t.guestCount}</dd></div>`:""}
        <div><dt>${s(r("summary.diningMeals"))}</dt><dd>${O(t,{contactHint:!e&&n})}</dd></div>
        ${t.specialDiets.participantCount>0?`<div><dt>${s(r("summary.includedDiets"))}</dt><dd>${i}</dd></div>`:""}
        ${t.sickCount>0?`<div><dt>${s(r("summary.sickMeals"))}</dt><dd>${Q(t)}</dd></div>`:""}
        ${t.sickDiets.length>0?`<div><dt>${s(r("summary.sickDiets"))}</dt><dd>${V(t)}</dd></div>`:""}
      </dl>
      ${e?"":`<section class="summary-international-names"><h3>${s(r("summary.names"))}</h3>${tt(t,{compactActions:!0,residentLabel:a})}</section>`}
    </article>
  `}function Lt(t){return t.dateGroups.map(e=>{const a=t.columns.find(n=>n.dateId===e.dateId);return{...e,massStatus:a?.dayMassStatus||"UNKNOWN",blessingTime:a?.blessingTime||""}})}function E(t){return t.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${s(r("kitchen.notes.title"))}">
      <h3>${s(r("kitchen.notes.title"))}</h3>
      ${t.notesByDate.map(e=>`
        <div class="kitchen-notes-group">
          <time datetime="${s(e.dateId)}">${s(x(e.dateId))}</time>
          <ul>${e.notes.map(a=>`<li><p>${s(a.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function at(t,e){const a=new Set;t.columns.forEach(o=>{[...o.specialDiets?.items||[],...o.sickDiets||[]].forEach(i=>{const l=F(i?.tag);/^\d{1,3}$/.test(l)&&a.add(l)})});const n=ot(e).filter(o=>a.has(o.code));return n.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${s(r("kitchen.dietLegend.title"))}">
      <h3>${s(r("kitchen.dietLegend.title"))}</h3>
      <ul>${n.map(o=>`<li><strong class="diet-code-badge diet-code-tone-${H(o.code)}">${s($(o.code))}</strong><span aria-hidden="true">=</span><span>${s(o.label)}</span></li>`).join("")}</ul>
    </section>
  `}function M(t){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${s(t)}</span>`}function Bt(t,e){return t.dayIndex>e.index?" summary-matrix-next-date":""}function jt(t){const e=/^([01]\d|2[0-3]):[0-5]\d$/.test(t.blessingTime||""),a=e&&Number(t.span)<2,n=e?a?" summary-mass-control-blessing-narrow":" summary-mass-control-blessing-wide":"",o=e?` mass-status-with-blessing${a?" mass-status-narrow":" mass-status-wide-blessing"}`:"",i=e?z(t.blessingTime,a?{narrow:!0}:{compact:!0}):"";return`
    <span class="summary-mass-control${n}">
      <span class="summary-mass-control-day">${s(st(t.dayIndex))}</span>
      <span class="summary-mass-control-state mass-status-stack${o}">${It(t)}${i}</span>
    </span>`}function w(t,e){return`${Bt(t,e)} summary-day-tone-${et(t.dayIndex)}`}function et(t){return Math.max(0,Math.min(2,Number(t)||0))}function st(t){return[r("summary.today"),r("summary.tomorrow"),r("summary.dayAfterTomorrow")][t]||r("summary.followingDay")}function x(t){const[e,a,n]=String(t).split("-").map(Number);return new Intl.DateTimeFormat(v(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(e,a-1,n))}function D(t){const[e,a,n]=String(t).split("-").map(Number);return!e||!a||!n?"":new Intl.DateTimeFormat(v(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(e,a-1,n))}function Et(t,e){const a=[...t.querySelectorAll(`[data-${e}-screen]`)];if(a.length===0)return 0;const n=a.reduce((o,i)=>Math.abs(i.getBoundingClientRect().left-t.getBoundingClientRect().left)<Math.abs(o.getBoundingClientRect().left-t.getBoundingClientRect().left)?i:o);return Number(n.dataset[`${e}Screen`])===1?1:0}function nt(t,e,a){t.querySelectorAll(`[data-${e}-screen]`).forEach(n=>{n.setAttribute("aria-hidden",String(Number(n.dataset[`${e}Screen`])!==a))})}export{Rt as mountSummaryMatrix,ht as scrollSummaryMatrix};

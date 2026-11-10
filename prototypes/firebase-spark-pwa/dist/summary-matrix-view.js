import{t as r,getLocale as k}from"./i18n/i18n.mjs?v=20261031b";import{escapeHtml as s}from"./html-utils.js?v=20261014b";import{renderBlessing as F}from"./blessing-view.mjs?v=20261031b";import{formatDietLabel as it,getDietBadgeTone as R,normalizeDietCode as z}from"./diet-utils.mjs?v=20261014b";import{normalizeKitchenDietLegend as ot}from"./diet-legend.mjs?v=20261014b";import{buildKitchenMatrixScreens as mt,buildSummaryMatrixScreens as lt}from"./summary-matrix-model.js?v=20261014b";let W=0;const U=new WeakMap;function Rt(t,{days:e=[],operationDays:a=[],screenReady:n=()=>!0,kitchen:i=!1,layout:o="classic",residentLabel:l="name",dietLegend:u=[],showContactHint:d=!0,activeIndex:m=0,monthSummary:p=null,onActiveIndexChange:h=()=>{}}={}){const b=i?mt(e,a):lt(e,[],a);if(o==="future"&&!i){ut(t,b,l,m,h,d,n);return}if(b.every(c=>c.columns.length===0)&&!(i&&p?.onLoad)){t.innerHTML=`<p class="empty-state">${s(r("summary.noMeal"))}</p>`;return}const f=i?"kitchen":"summary",g=o==="international"?Nt:$t;if(t.innerHTML=`
    <div class="summary-matrix-track summary-layout-${o}${i?" summary-layout-kitchen":" summary-layout-diners"}" data-${f}-matrix-track aria-label="${s(r("summary.screensLabel"))}">
      ${b.map(c=>n(c.index)?g(c,{kitchen:i,activeIndex:m,residentLabel:l,showContactHint:d,dietLegend:u}):dt(c,{kitchen:i,activeIndex:m,layout:o})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${s(r("summary.swipeHint"))}</p>
    ${i?xt(p):""}
  `,i&&p?.onLoad){const c=t.querySelector("[data-kitchen-monthly-summary]"),q=c?.querySelector("[data-kitchen-monthly-summary-content]");if(c&&q){const H=p.centerId||"";let y=U.get(t);!y||y.centerId!==H?(y={centerId:H,open:!1,latestMonthId:null,earliestMonthId:null,selectedMonthId:null,latestSummary:null,summaries:new Map},U.set(t,y)):(y.latestMonthId=null,y.earliestMonthId=null,y.latestSummary=null,y.summaries=new Map),c.open=y.open,q.addEventListener("click",rt=>{const S=rt.target?.closest?.("[data-kitchen-month-step]");if(!S||S.disabled||!c.open||c.dataset.loading==="true")return;const v=Mt(y.selectedMonthId,Number(S.dataset.kitchenMonthStep));!v||v<y.earliestMonthId||v>y.latestMonthId||(y.selectedMonthId=v,L(c,p,y,v))}),c.addEventListener("toggle",()=>{y.open=c.open,c.open&&c.dataset.loading!=="true"&&L(c,p,y)}),y.open&&L(c,p,y,y.selectedMonthId)}}const K=t.querySelector(`[data-${f}-matrix-track]`);let P=0;K.addEventListener("scroll",()=>{window.clearTimeout(P),P=window.setTimeout(()=>{const c=jt(K,f);nt(t,f,c),h(c)},100)},{passive:!0}),window.requestAnimationFrame(()=>{ht(t,m,{kitchen:i,smooth:!1})})}function ut(t,e,a="name",n=0,i=()=>{},o=!0,l=()=>!0){t.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${e.map(m=>l(m.index)?`
        <article class="summary-future-card" data-summary-future-screen="${m.index}" aria-hidden="${m.index!==n}">
          <header class="summary-future-card-head">
            <div><strong>${s(r(m.labelKey))}</strong><time datetime="${s(m.dateId)}">${s(N(m.dateId))}</time></div>
            ${yt(m)}
          </header>
          <div class="summary-future-meals">
            ${m.columns.map(p=>ct(p,a,o)).join("")}
          </div>
          ${E(m)}
        </article>
      `:`
        <article class="summary-future-card" data-summary-future-screen="${m.index}" aria-hidden="${m.index!==n}" aria-busy="true">
          <header class="summary-future-card-head"><div><strong>${s(r(m.labelKey))}</strong><time datetime="${s(m.dateId)}">${s(N(m.dateId))}</time></div></header>
          <p class="empty-state" role="status">${s(r("common.status.loading"))}</p>
        </article>
      `).join("")}
    </div>
  `;const u=t.querySelector("[data-summary-future-track]");let d=0;u?.addEventListener("scroll",()=>{window.clearTimeout(d),d=window.setTimeout(()=>{const m=Math.max(0,Math.min(1,Math.round(u.scrollLeft/Math.max(1,u.clientWidth+14))));u.querySelectorAll("[data-summary-future-screen]").forEach(p=>{p.setAttribute("aria-hidden",String(Number(p.dataset.summaryFutureScreen)!==m))}),i(m)},100)},{passive:!0}),window.requestAnimationFrame(()=>{u&&u.scrollTo({left:Math.max(0,n)*(u.clientWidth+14),behavior:"auto"})})}function dt(t,{kitchen:e,activeIndex:a,layout:n}){return`
    <section class="summary-matrix-screen${n==="international"?" summary-international-screen summary-screen-ordinary":""}" data-${e?"kitchen":"summary"}-screen="${t.index}" role="tabpanel" aria-hidden="${t.index!==a}" aria-busy="true">
      <p class="empty-state" role="status">${s(r("common.status.loading"))}</p>
    </section>
  `}function ct(t,e,a=!0){const n=Array.isArray(t.names)?t.names:[],i=[...Array.isArray(t.specialDiets?.items)?t.specialDiets.items:[]].map(d=>$(d.tag)).filter(Boolean).sort((d,m)=>d.localeCompare(m,k(),{numeric:!0})),o=Number(t.guestCount||0),l=Number(t.sickCount||0),u=Array.isArray(t.sickDiets)?t.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${T(t.mealTypeId)}</span>
        <span class="summary-future-meal-name">${s(A(t,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${s(String(t.total||0))}</strong>
      </div>
      ${J(t,a)}
      ${o>0?G("summary.guests",o,"guests"):""}
      ${i.length?`<p class="summary-future-diets"><span>${s(r("summary.diets"))}:</span> <strong>${s(i.join(", "))}</strong></p>`:""}
      ${l>0?G("summary.sickMeals",l,"sick"):""}
      ${u.length>0?`<div class="summary-future-special-row"><span>${s(r("summary.sickDiets"))}</span><div>${D(u," summary-future-diet-list")}</div></div>`:""}
      ${n.length?`<div class="summary-future-people">${n.map(d=>pt(d,e)).join("")}</div>`:""}
    </section>
  `}function G(t,e,a){return a==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${s(String(e))}</strong><span>${s(r(t))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${s(a)}"><span>${s(r(t))}</span><strong>${s(String(e))}</strong></p>`}function pt(t,e){const a=String(t.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(m=>m[0]).join("").toUpperCase(),n=e==="signature"?t.signature||t.displayName:e==="initials"?t.initials||a||t.signature:t.displayName,i=Array.isArray(t.dietTags)?t.dietTags.map(m=>$(m)).filter(Boolean):[],o=`${s(n||"–")}${i.length?`&nbsp;<small>(${s(i.join(", "))})</small>`:""}`,l=j(t.phone),u=t.phoneConsent&&l?`<a class="summary-matrix-call" href="tel:${s(l)}" aria-label="${s(r("summary.callPerson",{name:t.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",d=t.whatsappEnabled&&t.phoneConsent&&l?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(l.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(r("summary.messagePerson",{name:t.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(u||d){const m=`summary-contact-popup-${++W}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${m}" aria-haspopup="dialog" aria-label="${s(r("summary.contactPerson",{name:t.displayName}))}">${o}</button><span class="summary-matrix-contact-popover" id="${m}" popover role="dialog"><span class="summary-matrix-contact-actions">${u}${d}</span></span></span>`}return`<span class="summary-future-person" title="${s(t.displayName||n)}">${o}</span>`}function yt(t){const e=t.columns.find(n=>n.dayIndex===t.index),a=e?.dayMassStatus;return!a||a==="UNKNOWN"?"":O(a,e.blessingTime)}function O(t,e=""){const a=t==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${a?"yes":"no"}"><span>${s(r("summary.mass"))}:</span><span class="mass-status-stack"><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${s(r(a?"summary.yes":"summary.no"))}</strong>${F(e)}</span></span>`}function ht(t,e,{kitchen:a=!1,smooth:n=!0}={}){const i=a?"kitchen":"summary",o=Number(e)===1?1:0;if(!a){const d=t?.querySelector("[data-summary-future-track]");if(d)return d.scrollTo({left:o*(d.clientWidth+14),behavior:n?"smooth":"auto"}),d.querySelectorAll("[data-summary-future-screen]").forEach(m=>{m.setAttribute("aria-hidden",String(Number(m.dataset.summaryFutureScreen)!==o))}),!0}const l=t?.querySelector(`[data-${i}-matrix-track]`),u=l?.querySelector(`[data-${i}-screen="${o}"]`);return!l||!u?!1:(l.scrollTo({left:l.scrollLeft+u.getBoundingClientRect().left-l.getBoundingClientRect().left,behavior:n?"smooth":"auto"}),nt(t,i,o),!0)}function $t(t,{kitchen:e,activeIndex:a,residentLabel:n="name",showContactHint:i=!0,dietLegend:o=[]}){const l=e?"kitchen":"summary",u=t.index===a,d=ft(t);return t.columns.length===0?`
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
                <time datetime="${s(m.dateId)}">${s(M(m.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${t.columns.map(m=>`
              <th class="summary-matrix-meal-heading${w(m,t)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${T(m.mealTypeId)}</span><span class="summary-matrix-meal-label">${s(A(m))}</span>${Dt(m,e)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${t.hasGuestGroup?I(r("summary.guests"),"summary-matrix-row-guests",t,m=>String(m.guestCount)):""}
          ${I(r("summary.diningMeals"),"summary-matrix-row-meals",t,Y)}
          ${t.hasSpecialDiets?I(r("summary.includedDiets"),"summary-matrix-row-diets",t,e?Z:X):""}
          ${t.hasSickMeals?I(r("summary.sickMeals"),"summary-matrix-row-sick",t,Q):""}
          ${t.hasSickDiets?I(r("summary.sickDiets"),"summary-matrix-row-sick-diets",t,V):""}
          ${t.hasMassInformation?Ct(t):""}
          ${e?"":It(t,n,i)}
        </tbody>
      </table>
      ${e?at(t,o):""}
      ${E(t)}
    </section>
  `}function ft(t){return[t.hasGuestGroup,t.hasSickMeals,t.hasSickDiets].filter(Boolean).length}function gt(t,e){return e?`<caption class="sr-only">${s(`${r("kitchen.view.title")}: ${r(t.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${s(t.dateId)}">${s(N(t.dateId))}</time>
    </caption>
  `}function T(t){const e={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return bt({breakfast:"coffee",lunch:"sun",dinner:"moon"}[t],e[t]||"•")}function bt(t,e="•"){const a=document.documentElement.dataset.interfaceStyle;if(!(a==="cool"||a==="urban"||a==="future")||!t)return e;const o={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[t];return o?`<svg class="meal-line-icon meal-line-icon-${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${o}</svg>`:e}function A(t,{breakfastTomorrow:e=!1}={}){const a=String(t?.mealTypeId||"").trim().toLowerCase();if(e&&a==="breakfast")return r("summary.breakfastTomorrow");const n=a?r(`meal.type.${a}`):"",i=String(t?.label||"").trim();return n&&n!==`meal.type.${a}`?n:i}function I(t,e,a,n){return`
    <tr class="${e}">
      <th class="summary-matrix-label" scope="row">${s(t)}</th>
      ${a.columns.map(i=>`<td class="${w(i,a).trim()}">${n(i)}</td>`).join("")}
    </tr>
  `}function Y(t,{contactHint:e=!1}={}){const a=t.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${t.total}</span><span class="summary-matrix-unit">${s(r(a))}</span>${e?J(t):""}`}function _(t){return Array.isArray(t?.names)&&t.names.some(e=>e?.phoneConsent&&j(e.phone))}function xt(t){return typeof t?.onLoad!="function"?"":`
    <section class="kitchen-monthly-summary">
      <details data-kitchen-monthly-summary>
        <summary>${s(r("kitchen.monthly.title"))}</summary>
        <div class="kitchen-monthly-summary-content" data-kitchen-monthly-summary-content role="status" aria-live="polite"></div>
      </details>
    </section>
  `}async function L(t,e,a,n=null){const i=t.querySelector("[data-kitchen-monthly-summary-content]");if(!(!i||t.dataset.loading==="true")){t.dataset.loading="true",a.latestMonthId===null?i.textContent=r("kitchen.monthly.loading"):C(i,a,{message:r("kitchen.monthly.loading"),loading:!0});try{let o=null;if(a.latestMonthId===null){if(o=await e.onLoad(),o?.monthId){a.latestMonthId=o.monthId,a.earliestMonthId=o.earliestMonthId||o.monthId,a.latestSummary=o,a.summaries.set(o.monthId,o);const l=n||a.selectedMonthId;a.selectedMonthId=l&&l>=a.earliestMonthId&&l<=a.latestMonthId?l:o.monthId,a.selectedMonthId!==o.monthId&&(o=await e.onLoad(a.selectedMonthId),o&&a.summaries.set(a.selectedMonthId,o))}}else{const l=n||a.selectedMonthId||a.latestMonthId;a.selectedMonthId=l,l===a.latestMonthId?o=a.latestSummary:a.summaries.has(l)?o=a.summaries.get(l):(o=await e.onLoad(l),o&&a.summaries.set(l,o))}if(!t.isConnected||!t.open)return;if(!o){C(i,a,{message:r(a.latestMonthId===null?"kitchen.monthly.firstAvailable":"kitchen.monthly.notReady")});return}C(i,a,{summary:o})}catch{if(!t.isConnected||!t.open)return;C(i,a,{message:r("kitchen.monthly.unavailable")})}finally{delete t.dataset.loading}}}function C(t,e,{summary:a=null,message:n="",loading:i=!1}={}){const o=e.selectedMonthId;if(!o){t.textContent=n;return}const l=a?.periodStart||`${o}-01`,u=a?.periodEnd||vt(o),d=i||!e.earliestMonthId||o<=e.earliestMonthId,m=i||!e.latestMonthId||o>=e.latestMonthId,p=n?s(n):`<dl>
        ${B("breakfast",a.counts.breakfast)}
        ${B("lunch",a.counts.lunch)}
        ${B("dinner",a.counts.dinner)}
      </dl>
      <div class="kitchen-monthly-guest-total">
        <span>${s(r("kitchen.monthly.guests"))}</span>
        <strong>${s(a.invitedTotal)}</strong>
      </div>${a.missingDates?.length?`
      <p class="kitchen-monthly-missing-days"><strong>${s(r("kitchen.monthly.missingDays"))}</strong> ${a.missingDates.map(h=>s(M(h))).join(", ")}</p>
      <p class="kitchen-monthly-partial-note">${s(r("kitchen.monthly.partial"))}</p>`:""}`;t.innerHTML=`
    <div class="kitchen-monthly-period">
      <button class="kitchen-monthly-nav-button" type="button"
        data-kitchen-month-step="-1"
        aria-label="${s(r("kitchen.monthly.previous"))}"
        ${d?"disabled":""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 6 12l9 8z"></path></svg>
      </button>
      <p><strong>${s(r("kitchen.monthly.period"))}</strong> ${s(M(l))} – ${s(M(u))}</p>
      <button class="kitchen-monthly-nav-button" type="button"
        data-kitchen-month-step="1"
        aria-label="${s(r("kitchen.monthly.next"))}"
        ${m?"disabled":""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 9 8-9 8z"></path></svg>
      </button>
    </div>
    <div class="kitchen-monthly-summary-status" role="status" aria-live="polite">${p}</div>
  `}function Mt(t,e){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(t||"")||!Number.isInteger(e))return null;const[a,n]=t.split("-").map(Number),i=a*12+n-1+e;if(i<0)return null;const o=Math.floor(i/12),l=i%12+1;return`${String(o).padStart(4,"0")}-${String(l).padStart(2,"0")}`}function vt(t){const[e,a]=t.split("-").map(Number),n=new Date(Date.UTC(e,a,0)).getUTCDate();return`${t}-${String(n).padStart(2,"0")}`}function B(t,e){const a=r(`meal.type.${t}`);return`<div><dt>${s(a)}</dt><dd>${s(e)}</dd></div>`}function J(t,e=!0){return!e||!_(t)?"":`<small class="summary-contact-hint">${s(r("summary.contactHint"))}</small>`}function Q(t){if(t.sickCount===0)return x(r("summary.sickMeals"));const e=t.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${t.sickCount}</span><span class="summary-matrix-unit">${s(r(e))}</span>`}function V(t){return t.sickDiets.length===0?x(r("summary.noDiet")):D(t.sickDiets)}function kt(t){if(t.massStatus==="UNKNOWN")return x(r("summary.notSet"));const e=t.massStatus==="YES";return`<span class="summary-matrix-mass-${e?"yes":"no"}">${s(r(e?"summary.yes":"summary.no"))}</span>`}function It(t,e="name",a=!0){return`
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
        ${a&&t.columns.some(_)?`<small class="summary-contact-hint">${s(r("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${s(r("summary.names"))}</span>
      </th>
      ${t.columns.map(i=>`<td class="${w(i,t).trim()}">${tt(i,{compactActions:!0,residentLabel:e})}</td>`).join("")}
    </tr>
  `}function wt(t){return t==="YES"?" summary-mass-state-yes":t==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function Ct(t){const e=At(t).map(a=>`<td class="summary-matrix-mass-band${w(a,t)}${wt(a.massStatus)}" colspan="${a.span}">${Bt(a)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${s(r("summary.mass"))}</th>
      ${e}
    </tr>
  `}function Dt(t,e){if(e||t.mealTypeId!=="breakfast")return"";const a=t.breakfastPlanned===!0,n=r(a?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${a?"yes":"no"}"><span aria-hidden="true">${a?"✓":"×"}</span>${s(n)}</span>`}function X(t){if(t.specialDiets.participantCount===0)return x(r("summary.noDiet"));const e=[...t.specialDiets.items].sort((a,n)=>$(a.tag).localeCompare($(n.tag),k(),{numeric:!0}));return D(e)}function Z(t){return t.specialDiets.participantCount===0?x(r("summary.noDiet")):D(t.specialDiets.items," summary-matrix-kitchen-diets")}function D(t,e=""){const a=[...t].sort((n,i)=>$(n.tag).localeCompare($(i.tag),k(),{numeric:!0}));return`<ul class="summary-matrix-diets${e}">${a.map(n=>{const i=$(n.tag),o=Math.max(0,Math.floor(Number(n.count)||0)),l=o>1?`<span class="diet-code-count">× ${o}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${R(n.tag)}">${s(i)}</span>${l}</li>`}).join("")}</ul>`}function $(t){return it(z(t),r)}function tt(t,{compactActions:e=!1,residentLabel:a="name"}={}){return t.names.length===0?x(r("summary.noName")):`<ul class="summary-matrix-names">${t.names.map(n=>{const i=n.dietTags.map(g=>$(g)),o=j(n.phone),l=String(n.displayName||"").trim(),u=l.split(/\s+/).filter(Boolean).slice(0,3).map(g=>g[0]).join("").toUpperCase(),d=a==="signature"?n.signature||l:a==="initials"&&(n.initials||u||n.signature)||l,m=s(d),p=i.length?` <small>(${s(i.join(", "))})</small>`:"",h=`<span class="summary-matrix-person-name">${m}${p}</span>`,b=n.phoneConsent&&o?`<a class="summary-matrix-call" href="tel:${s(o)}" aria-label="${s(r("summary.callPerson",{name:n.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",f=n.whatsappEnabled&&n.phoneConsent&&o?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(o.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(r("summary.messagePerson",{name:n.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(e&&(b||f)){const g=`summary-contact-popup-${++W}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${g}" aria-haspopup="dialog" aria-label="${s(r("summary.contactPerson",{name:n.displayName}))}" title="${s(r("summary.contactPerson",{name:n.displayName}))}">${h}</button>
            <span class="summary-matrix-contact-popover" id="${g}" popover role="dialog" aria-label="${s(r("summary.contactPerson",{name:n.displayName}))}">
              <span class="summary-matrix-contact-actions">${b}${f}</span>
            </span>
          </li>`}return`<li>${h}<span class="summary-matrix-contact-actions">${b}${f}</span></li>`}).join("")}</ul>`}function j(t){const e=String(t||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(e)?e:""}function Nt(t,{kitchen:e,activeIndex:a,residentLabel:n="name",showContactHint:i=!0,dietLegend:o=[]}){const l=e?"kitchen":"summary",u=t.index===a;return`
    <section class="summary-matrix-screen summary-international-screen${St(t)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${l}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      ${e?`<h2 class="sr-only">${s(`${r("kitchen.view.title")}: ${r(t.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${s(t.dateId)}">${s(N(t.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${t.columns.map((m,p,h)=>Tt(m,{kitchen:e,residentLabel:n,showContactHint:i,showMassMetadata:p===0||h[p-1]?.dateId!==m.dateId})).join("")}
      </div>
      ${e?at(t,o):""}
      ${E(t)}
    </section>
  `}function St(t){return t.columns.some(e=>e.guestCount>0||e.specialDiets.participantCount>0||e.sickCount>0||e.sickDiets.length>0)||t.notesByDate.length>0}function Tt(t,{kitchen:e,residentLabel:a="name",showContactHint:n=!0,showMassMetadata:i=!1}){const o=e?Z(t):X(t),l=i&&t.dayMassStatus!=="UNKNOWN"?O(t.dayMassStatus,t.blessingTime):"",u=t.guestCount>0?`<span class="summary-international-mobile-guests">${s(r("summary.guests"))}: <strong>${t.guestCount}</strong></span>`:"",d=l||u?`<div class="summary-international-card-actions">${l}${u}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${et(t.dayIndex)}${t.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${T(t.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${s(A(t,{breakfastTomorrow:!0}))}</strong><time datetime="${s(t.dateId)}">${s(M(t.dateId))}</time></div>
        ${d}
      </header>
      <dl>
        ${t.guestCount>0?`<div class="summary-international-guest-row"><dt>${s(r("summary.guests"))}</dt><dd>${t.guestCount}</dd></div>`:""}
        <div><dt>${s(r("summary.diningMeals"))}</dt><dd>${Y(t,{contactHint:!e&&n})}</dd></div>
        ${t.specialDiets.participantCount>0?`<div><dt>${s(r("summary.includedDiets"))}</dt><dd>${o}</dd></div>`:""}
        ${t.sickCount>0?`<div><dt>${s(r("summary.sickMeals"))}</dt><dd>${Q(t)}</dd></div>`:""}
        ${t.sickDiets.length>0?`<div><dt>${s(r("summary.sickDiets"))}</dt><dd>${V(t)}</dd></div>`:""}
      </dl>
      ${e?"":`<section class="summary-international-names"><h3>${s(r("summary.names"))}</h3>${tt(t,{compactActions:!0,residentLabel:a})}</section>`}
    </article>
  `}function At(t){return t.dateGroups.map(e=>{const a=t.columns.find(n=>n.dateId===e.dateId);return{...e,massStatus:a?.dayMassStatus||"UNKNOWN",blessingTime:a?.blessingTime||""}})}function E(t){return t.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${s(r("kitchen.notes.title"))}">
      <h3>${s(r("kitchen.notes.title"))}</h3>
      ${t.notesByDate.map(e=>`
        <div class="kitchen-notes-group">
          <time datetime="${s(e.dateId)}">${s(M(e.dateId))}</time>
          <ul>${e.notes.map(a=>`<li><p>${s(a.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function at(t,e){const a=new Set;t.columns.forEach(i=>{[...i.specialDiets?.items||[],...i.sickDiets||[]].forEach(o=>{const l=z(o?.tag);/^\d{1,3}$/.test(l)&&a.add(l)})});const n=ot(e).filter(i=>a.has(i.code));return n.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${s(r("kitchen.dietLegend.title"))}">
      <h3>${s(r("kitchen.dietLegend.title"))}</h3>
      <ul>${n.map(i=>`<li><strong class="diet-code-badge diet-code-tone-${R(i.code)}">${s($(i.code))}</strong><span aria-hidden="true">=</span><span>${s(i.label)}</span></li>`).join("")}</ul>
    </section>
  `}function x(t){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${s(t)}</span>`}function Lt(t,e){return t.dayIndex>e.index?" summary-matrix-next-date":""}function Bt(t){const e=/^([01]\d|2[0-3]):[0-5]\d$/.test(t.blessingTime||""),a=e&&Number(t.span)<2,n=e?a?" summary-mass-control-blessing-narrow":" summary-mass-control-blessing-wide":"",i=e?` mass-status-with-blessing${a?" mass-status-narrow":" mass-status-wide-blessing"}`:"",o=e?F(t.blessingTime,a?{narrow:!0}:{compact:!0}):"";return`
    <span class="summary-mass-control${n}">
      <span class="summary-mass-control-day">${s(st(t.dayIndex))}</span>
      <span class="summary-mass-control-state mass-status-stack${i}">${kt(t)}${o}</span>
    </span>`}function w(t,e){return`${Lt(t,e)} summary-day-tone-${et(t.dayIndex)}`}function et(t){return Math.max(0,Math.min(2,Number(t)||0))}function st(t){return[r("summary.today"),r("summary.tomorrow"),r("summary.dayAfterTomorrow")][t]||r("summary.followingDay")}function M(t){const[e,a,n]=String(t).split("-").map(Number);return new Intl.DateTimeFormat(k(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(e,a-1,n))}function N(t){const[e,a,n]=String(t).split("-").map(Number);return!e||!a||!n?"":new Intl.DateTimeFormat(k(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(e,a-1,n))}function jt(t,e){const a=[...t.querySelectorAll(`[data-${e}-screen]`)];if(a.length===0)return 0;const n=a.reduce((i,o)=>Math.abs(o.getBoundingClientRect().left-t.getBoundingClientRect().left)<Math.abs(i.getBoundingClientRect().left-t.getBoundingClientRect().left)?o:i);return Number(n.dataset[`${e}Screen`])===1?1:0}function nt(t,e,a){t.querySelectorAll(`[data-${e}-screen]`).forEach(n=>{n.setAttribute("aria-hidden",String(Number(n.dataset[`${e}Screen`])!==a))})}export{Rt as mountSummaryMatrix,ht as scrollSummaryMatrix};

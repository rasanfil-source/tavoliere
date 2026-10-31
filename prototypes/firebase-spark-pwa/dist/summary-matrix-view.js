import{t as r,getLocale as v}from"./i18n/i18n.mjs?v=20261031b";import{escapeHtml as s}from"./html-utils.js?v=20261014b";import{renderBlessing as P}from"./blessing-view.mjs?v=20261031b";import{formatDietLabel as nt,getDietBadgeTone as H,normalizeDietCode as F}from"./diet-utils.mjs?v=20261014b";import{normalizeKitchenDietLegend as rt}from"./diet-legend.mjs?v=20261014b";import{buildKitchenMatrixScreens as it,buildSummaryMatrixScreens as ot}from"./summary-matrix-model.js?v=20261014b";let R=0;function Ht(t,{days:a=[],operationDays:e=[],screenReady:n=()=>!0,kitchen:i=!1,layout:o="classic",residentLabel:l="name",dietLegend:u=[],showContactHint:d=!0,activeIndex:m=0,monthSummary:p=null,onActiveIndexChange:f=()=>{}}={}){const g=i?it(a,e):ot(a,[],e);if(o==="future"&&!i){mt(t,g,l,m,f,d,n);return}if(g.every(c=>c.columns.length===0)&&!(i&&p?.onLoad)){t.innerHTML=`<p class="empty-state">${s(r("summary.noMeal"))}</p>`;return}const h=i?"kitchen":"summary",$=o==="international"?Ct:yt;if(t.innerHTML=`
    <div class="summary-matrix-track summary-layout-${o}${i?" summary-layout-kitchen":" summary-layout-diners"}" data-${h}-matrix-track aria-label="${s(r("summary.screensLabel"))}">
      ${g.map(c=>n(c.index)?$(c,{kitchen:i,activeIndex:m,residentLabel:l,showContactHint:d,dietLegend:u}):lt(c,{kitchen:i,activeIndex:m,layout:o})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${s(r("summary.swipeHint"))}</p>
    ${i?gt(p):""}
  `,i&&p?.onLoad){const c=t.querySelector("[data-kitchen-monthly-summary]"),q=c?.querySelector("[data-kitchen-monthly-summary-content]");if(c&&q){const b={latestMonthId:null,earliestMonthId:null,selectedMonthId:null,latestSummary:null,summaries:new Map};q.addEventListener("click",st=>{const N=st.target?.closest?.("[data-kitchen-month-step]");if(!N||N.disabled||!c.open||c.dataset.loading==="true")return;const M=bt(b.selectedMonthId,Number(N.dataset.kitchenMonthStep));!M||M<b.earliestMonthId||M>b.latestMonthId||(b.selectedMonthId=M,O(c,p,b,M))}),c.addEventListener("toggle",()=>{c.open&&c.dataset.loading!=="true"&&O(c,p,b)})}}const E=t.querySelector(`[data-${h}-matrix-track]`);let K=0;E.addEventListener("scroll",()=>{window.clearTimeout(K),K=window.setTimeout(()=>{const c=Lt(E,h);et(t,h,c),f(c)},100)},{passive:!0}),window.requestAnimationFrame(()=>{pt(t,m,{kitchen:i,smooth:!1})})}function mt(t,a,e="name",n=0,i=()=>{},o=!0,l=()=>!0){t.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${a.map(m=>l(m.index)?`
        <article class="summary-future-card" data-summary-future-screen="${m.index}" aria-hidden="${m.index!==n}">
          <header class="summary-future-card-head">
            <div><strong>${s(r(m.labelKey))}</strong><time datetime="${s(m.dateId)}">${s(S(m.dateId))}</time></div>
            ${ct(m)}
          </header>
          <div class="summary-future-meals">
            ${m.columns.map(p=>ut(p,e,o)).join("")}
          </div>
          ${j(m)}
        </article>
      `:`
        <article class="summary-future-card" data-summary-future-screen="${m.index}" aria-hidden="${m.index!==n}" aria-busy="true">
          <header class="summary-future-card-head"><div><strong>${s(r(m.labelKey))}</strong><time datetime="${s(m.dateId)}">${s(S(m.dateId))}</time></div></header>
          <p class="empty-state" role="status">${s(r("common.status.loading"))}</p>
        </article>
      `).join("")}
    </div>
  `;const u=t.querySelector("[data-summary-future-track]");let d=0;u?.addEventListener("scroll",()=>{window.clearTimeout(d),d=window.setTimeout(()=>{const m=Math.max(0,Math.min(1,Math.round(u.scrollLeft/Math.max(1,u.clientWidth+14))));u.querySelectorAll("[data-summary-future-screen]").forEach(p=>{p.setAttribute("aria-hidden",String(Number(p.dataset.summaryFutureScreen)!==m))}),i(m)},100)},{passive:!0}),window.requestAnimationFrame(()=>{u&&u.scrollTo({left:Math.max(0,n)*(u.clientWidth+14),behavior:"auto"})})}function lt(t,{kitchen:a,activeIndex:e,layout:n}){return`
    <section class="summary-matrix-screen${n==="international"?" summary-international-screen summary-screen-ordinary":""}" data-${a?"kitchen":"summary"}-screen="${t.index}" role="tabpanel" aria-hidden="${t.index!==e}" aria-busy="true">
      <p class="empty-state" role="status">${s(r("common.status.loading"))}</p>
    </section>
  `}function ut(t,a,e=!0){const n=Array.isArray(t.names)?t.names:[],i=[...Array.isArray(t.specialDiets?.items)?t.specialDiets.items:[]].map(d=>y(d.tag)).filter(Boolean).sort((d,m)=>d.localeCompare(m,v(),{numeric:!0})),o=Number(t.guestCount||0),l=Number(t.sickCount||0),u=Array.isArray(t.sickDiets)?t.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${T(t.mealTypeId)}</span>
        <span class="summary-future-meal-name">${s(A(t,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${s(String(t.total||0))}</strong>
      </div>
      ${Y(t,e)}
      ${o>0?z("summary.guests",o,"guests"):""}
      ${i.length?`<p class="summary-future-diets"><span>${s(r("summary.diets"))}:</span> <strong>${s(i.join(", "))}</strong></p>`:""}
      ${l>0?z("summary.sickMeals",l,"sick"):""}
      ${u.length>0?`<div class="summary-future-special-row"><span>${s(r("summary.sickDiets"))}</span><div>${D(u," summary-future-diet-list")}</div></div>`:""}
      ${n.length?`<div class="summary-future-people">${n.map(d=>dt(d,a)).join("")}</div>`:""}
    </section>
  `}function z(t,a,e){return e==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${s(String(a))}</strong><span>${s(r(t))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${s(e)}"><span>${s(r(t))}</span><strong>${s(String(a))}</strong></p>`}function dt(t,a){const e=String(t.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(m=>m[0]).join("").toUpperCase(),n=a==="signature"?t.signature||t.displayName:a==="initials"?t.initials||e||t.signature:t.displayName,i=Array.isArray(t.dietTags)?t.dietTags.map(m=>y(m)).filter(Boolean):[],o=`${s(n||"–")}${i.length?`&nbsp;<small>(${s(i.join(", "))})</small>`:""}`,l=B(t.phone),u=t.phoneConsent&&l?`<a class="summary-matrix-call" href="tel:${s(l)}" aria-label="${s(r("summary.callPerson",{name:t.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",d=t.whatsappEnabled&&t.phoneConsent&&l?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(l.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(r("summary.messagePerson",{name:t.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(u||d){const m=`summary-contact-popup-${++R}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${m}" aria-haspopup="dialog" aria-label="${s(r("summary.contactPerson",{name:t.displayName}))}">${o}</button><span class="summary-matrix-contact-popover" id="${m}" popover role="dialog"><span class="summary-matrix-contact-actions">${u}${d}</span></span></span>`}return`<span class="summary-future-person" title="${s(t.displayName||n)}">${o}</span>`}function ct(t){const a=t.columns.find(n=>n.dayIndex===t.index),e=a?.dayMassStatus;return!e||e==="UNKNOWN"?"":W(e,a.blessingTime)}function W(t,a=""){const e=t==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${e?"yes":"no"}"><span>${s(r("summary.mass"))}:</span><span class="mass-status-stack"><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${s(r(e?"summary.yes":"summary.no"))}</strong>${P(a)}</span></span>`}function pt(t,a,{kitchen:e=!1,smooth:n=!0}={}){const i=e?"kitchen":"summary",o=Number(a)===1?1:0;if(!e){const d=t?.querySelector("[data-summary-future-track]");if(d)return d.scrollTo({left:o*(d.clientWidth+14),behavior:n?"smooth":"auto"}),d.querySelectorAll("[data-summary-future-screen]").forEach(m=>{m.setAttribute("aria-hidden",String(Number(m.dataset.summaryFutureScreen)!==o))}),!0}const l=t?.querySelector(`[data-${i}-matrix-track]`),u=l?.querySelector(`[data-${i}-screen="${o}"]`);return!l||!u?!1:(l.scrollTo({left:l.scrollLeft+u.getBoundingClientRect().left-l.getBoundingClientRect().left,behavior:n?"smooth":"auto"}),et(t,i,o),!0)}function yt(t,{kitchen:a,activeIndex:e,residentLabel:n="name",showContactHint:i=!0,dietLegend:o=[]}){const l=a?"kitchen":"summary",u=t.index===e,d=ht(t);return t.columns.length===0?`
      <section class="summary-matrix-screen" data-${l}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
        <p class="empty-state">${s(r("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${l}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      <table class="summary-matrix summary-matrix-optional-rows-${d}">
        ${$t(t,a)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${t.columns.map(m=>m.dayIndex>t.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${s(r("summary.item"))}</span></th>
            ${t.dateGroups.map(m=>`
              <th class="summary-matrix-date-heading${w(m,t)}" scope="colgroup" colspan="${m.span}">
                <span>${s(at(m.dayIndex))}</span>
                <time datetime="${s(m.dateId)}">${s(I(m.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${t.columns.map(m=>`
              <th class="summary-matrix-meal-heading${w(m,t)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${T(m.mealTypeId)}</span><span class="summary-matrix-meal-label">${s(A(m))}</span>${It(m,a)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${t.hasGuestGroup?k(r("summary.guests"),"summary-matrix-row-guests",t,m=>String(m.guestCount)):""}
          ${k(r("summary.diningMeals"),"summary-matrix-row-meals",t,U)}
          ${t.hasSpecialDiets?k(r("summary.includedDiets"),"summary-matrix-row-diets",t,a?V:Q):""}
          ${t.hasSickMeals?k(r("summary.sickMeals"),"summary-matrix-row-sick",t,_):""}
          ${t.hasSickDiets?k(r("summary.sickDiets"),"summary-matrix-row-sick-diets",t,J):""}
          ${t.hasMassInformation?wt(t):""}
          ${a?"":vt(t,n,i)}
        </tbody>
      </table>
      ${a?Z(t,o):""}
      ${j(t)}
    </section>
  `}function ht(t){return[t.hasGuestGroup,t.hasSickMeals,t.hasSickDiets].filter(Boolean).length}function $t(t,a){return a?`<caption class="sr-only">${s(`${r("kitchen.view.title")}: ${r(t.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${s(t.dateId)}">${s(S(t.dateId))}</time>
    </caption>
  `}function T(t){const a={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return ft({breakfast:"coffee",lunch:"sun",dinner:"moon"}[t],a[t]||"•")}function ft(t,a="•"){const e=document.documentElement.dataset.interfaceStyle;if(!(e==="cool"||e==="urban"||e==="future")||!t)return a;const o={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[t];return o?`<svg class="meal-line-icon meal-line-icon-${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${o}</svg>`:a}function A(t,{breakfastTomorrow:a=!1}={}){const e=String(t?.mealTypeId||"").trim().toLowerCase();if(a&&e==="breakfast")return r("summary.breakfastTomorrow");const n=e?r(`meal.type.${e}`):"",i=String(t?.label||"").trim();return n&&n!==`meal.type.${e}`?n:i}function k(t,a,e,n){return`
    <tr class="${a}">
      <th class="summary-matrix-label" scope="row">${s(t)}</th>
      ${e.columns.map(i=>`<td class="${w(i,e).trim()}">${n(i)}</td>`).join("")}
    </tr>
  `}function U(t,{contactHint:a=!1}={}){const e=t.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${t.total}</span><span class="summary-matrix-unit">${s(r(e))}</span>${a?Y(t):""}`}function G(t){return Array.isArray(t?.names)&&t.names.some(a=>a?.phoneConsent&&B(a.phone))}function gt(t){return typeof t?.onLoad!="function"?"":`
    <section class="kitchen-monthly-summary">
      <details data-kitchen-monthly-summary>
        <summary>${s(r("kitchen.monthly.title"))}</summary>
        <div class="kitchen-monthly-summary-content" data-kitchen-monthly-summary-content role="status" aria-live="polite"></div>
      </details>
    </section>
  `}async function O(t,a,e,n=null){const i=t.querySelector("[data-kitchen-monthly-summary-content]");if(!(!i||t.dataset.loading==="true")){t.dataset.loading="true",e.latestMonthId===null?i.textContent=r("kitchen.monthly.loading"):C(i,e,{message:r("kitchen.monthly.loading"),loading:!0});try{let o=null;if(e.latestMonthId===null)o=await a.onLoad(),o?.monthId&&(e.latestMonthId=o.monthId,e.earliestMonthId=o.earliestMonthId||o.monthId,e.selectedMonthId=o.monthId,e.latestSummary=o,e.summaries.set(o.monthId,o));else{const l=n||e.selectedMonthId||e.latestMonthId;e.selectedMonthId=l,l===e.latestMonthId?o=e.latestSummary:e.summaries.has(l)?o=e.summaries.get(l):(o=await a.onLoad(l),o&&e.summaries.set(l,o))}if(!t.isConnected||!t.open)return;if(!o){C(i,e,{message:r(e.latestMonthId===null?"kitchen.monthly.firstAvailable":"kitchen.monthly.notReady")});return}C(i,e,{summary:o})}catch{if(!t.isConnected||!t.open)return;C(i,e,{message:r("kitchen.monthly.unavailable")})}finally{delete t.dataset.loading}}}function C(t,a,{summary:e=null,message:n="",loading:i=!1}={}){const o=a.selectedMonthId;if(!o){t.textContent=n;return}const l=e?.periodStart||`${o}-01`,u=e?.periodEnd||xt(o),d=i||!a.earliestMonthId||o<=a.earliestMonthId,m=i||!a.latestMonthId||o>=a.latestMonthId,p=n?s(n):`<dl>
        ${L("breakfast",e.counts.breakfast)}
        ${L("lunch",e.counts.lunch)}
        ${L("dinner",e.counts.dinner)}
      </dl>
      <div class="kitchen-monthly-guest-total">
        <span>${s(r("kitchen.monthly.guests"))}</span>
        <strong>${s(e.invitedTotal)}</strong>
      </div>`;t.innerHTML=`
    <div class="kitchen-monthly-period">
      <button class="kitchen-monthly-nav-button" type="button"
        data-kitchen-month-step="-1"
        aria-label="${s(r("kitchen.monthly.previous"))}"
        ${d?"disabled":""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 6 12l9 8z"></path></svg>
      </button>
      <p><strong>${s(r("kitchen.monthly.period"))}</strong> ${s(I(l))} – ${s(I(u))}</p>
      <button class="kitchen-monthly-nav-button" type="button"
        data-kitchen-month-step="1"
        aria-label="${s(r("kitchen.monthly.next"))}"
        ${m?"disabled":""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 9 8-9 8z"></path></svg>
      </button>
    </div>
    <div class="kitchen-monthly-summary-status" role="status" aria-live="polite">${p}</div>
  `}function bt(t,a){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(t||"")||!Number.isInteger(a))return null;const[e,n]=t.split("-").map(Number),i=e*12+n-1+a;if(i<0)return null;const o=Math.floor(i/12),l=i%12+1;return`${String(o).padStart(4,"0")}-${String(l).padStart(2,"0")}`}function xt(t){const[a,e]=t.split("-").map(Number),n=new Date(Date.UTC(a,e,0)).getUTCDate();return`${t}-${String(n).padStart(2,"0")}`}function L(t,a){const e=r(`meal.type.${t}`);return`<div><dt>${s(e)}</dt><dd>${s(a)}</dd></div>`}function Y(t,a=!0){return!a||!G(t)?"":`<small class="summary-contact-hint">${s(r("summary.contactHint"))}</small>`}function _(t){if(t.sickCount===0)return x(r("summary.sickMeals"));const a=t.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${t.sickCount}</span><span class="summary-matrix-unit">${s(r(a))}</span>`}function J(t){return t.sickDiets.length===0?x(r("summary.noDiet")):D(t.sickDiets)}function Mt(t){if(t.massStatus==="UNKNOWN")return x(r("summary.notSet"));const a=t.massStatus==="YES";return`<span class="summary-matrix-mass-${a?"yes":"no"}">${s(r(a?"summary.yes":"summary.no"))}</span>`}function vt(t,a="name",e=!0){return`
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
        ${e&&t.columns.some(G)?`<small class="summary-contact-hint">${s(r("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${s(r("summary.names"))}</span>
      </th>
      ${t.columns.map(i=>`<td class="${w(i,t).trim()}">${X(i,{compactActions:!0,residentLabel:a})}</td>`).join("")}
    </tr>
  `}function kt(t){return t==="YES"?" summary-mass-state-yes":t==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function wt(t){const a=Nt(t).map(e=>`<td class="summary-matrix-mass-band${w(e,t)}${kt(e.massStatus)}" colspan="${e.span}">${At(e)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${s(r("summary.mass"))}</th>
      ${a}
    </tr>
  `}function It(t,a){if(a||t.mealTypeId!=="breakfast")return"";const e=t.breakfastPlanned===!0,n=r(e?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${e?"yes":"no"}"><span aria-hidden="true">${e?"✓":"×"}</span>${s(n)}</span>`}function Q(t){if(t.specialDiets.participantCount===0)return x(r("summary.noDiet"));const a=[...t.specialDiets.items].sort((e,n)=>y(e.tag).localeCompare(y(n.tag),v(),{numeric:!0}));return D(a)}function V(t){return t.specialDiets.participantCount===0?x(r("summary.noDiet")):D(t.specialDiets.items," summary-matrix-kitchen-diets")}function D(t,a=""){const e=[...t].sort((n,i)=>y(n.tag).localeCompare(y(i.tag),v(),{numeric:!0}));return`<ul class="summary-matrix-diets${a}">${e.map(n=>{const i=y(n.tag),o=Math.max(0,Math.floor(Number(n.count)||0)),l=o>1?`<span class="diet-code-count">× ${o}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${H(n.tag)}">${s(i)}</span>${l}</li>`}).join("")}</ul>`}function y(t){return nt(F(t),r)}function X(t,{compactActions:a=!1,residentLabel:e="name"}={}){return t.names.length===0?x(r("summary.noName")):`<ul class="summary-matrix-names">${t.names.map(n=>{const i=n.dietTags.map($=>y($)),o=B(n.phone),l=String(n.displayName||"").trim(),u=l.split(/\s+/).filter(Boolean).slice(0,3).map($=>$[0]).join("").toUpperCase(),d=e==="signature"?n.signature||l:e==="initials"&&(n.initials||u||n.signature)||l,m=s(d),p=i.length?` <small>(${s(i.join(", "))})</small>`:"",f=`<span class="summary-matrix-person-name">${m}${p}</span>`,g=n.phoneConsent&&o?`<a class="summary-matrix-call" href="tel:${s(o)}" aria-label="${s(r("summary.callPerson",{name:n.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",h=n.whatsappEnabled&&n.phoneConsent&&o?`<a class="summary-matrix-whatsapp" href="https://wa.me/${s(o.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${s(r("summary.messagePerson",{name:n.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(a&&(g||h)){const $=`summary-contact-popup-${++R}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${$}" aria-haspopup="dialog" aria-label="${s(r("summary.contactPerson",{name:n.displayName}))}" title="${s(r("summary.contactPerson",{name:n.displayName}))}">${f}</button>
            <span class="summary-matrix-contact-popover" id="${$}" popover role="dialog" aria-label="${s(r("summary.contactPerson",{name:n.displayName}))}">
              <span class="summary-matrix-contact-actions">${g}${h}</span>
            </span>
          </li>`}return`<li>${f}<span class="summary-matrix-contact-actions">${g}${h}</span></li>`}).join("")}</ul>`}function B(t){const a=String(t||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(a)?a:""}function Ct(t,{kitchen:a,activeIndex:e,residentLabel:n="name",showContactHint:i=!0,dietLegend:o=[]}){const l=a?"kitchen":"summary",u=t.index===e;return`
    <section class="summary-matrix-screen summary-international-screen${Dt(t)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${l}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      ${a?`<h2 class="sr-only">${s(`${r("kitchen.view.title")}: ${r(t.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${s(t.dateId)}">${s(S(t.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${t.columns.map((m,p,f)=>St(m,{kitchen:a,residentLabel:n,showContactHint:i,showMassMetadata:p===0||f[p-1]?.dateId!==m.dateId})).join("")}
      </div>
      ${a?Z(t,o):""}
      ${j(t)}
    </section>
  `}function Dt(t){return t.columns.some(a=>a.guestCount>0||a.specialDiets.participantCount>0||a.sickCount>0||a.sickDiets.length>0)||t.notesByDate.length>0}function St(t,{kitchen:a,residentLabel:e="name",showContactHint:n=!0,showMassMetadata:i=!1}){const o=a?V(t):Q(t),l=i&&t.dayMassStatus!=="UNKNOWN"?W(t.dayMassStatus,t.blessingTime):"",u=t.guestCount>0?`<span class="summary-international-mobile-guests">${s(r("summary.guests"))}: <strong>${t.guestCount}</strong></span>`:"",d=l||u?`<div class="summary-international-card-actions">${l}${u}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${tt(t.dayIndex)}${t.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${T(t.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${s(A(t,{breakfastTomorrow:!0}))}</strong><time datetime="${s(t.dateId)}">${s(I(t.dateId))}</time></div>
        ${d}
      </header>
      <dl>
        ${t.guestCount>0?`<div class="summary-international-guest-row"><dt>${s(r("summary.guests"))}</dt><dd>${t.guestCount}</dd></div>`:""}
        <div><dt>${s(r("summary.diningMeals"))}</dt><dd>${U(t,{contactHint:!a&&n})}</dd></div>
        ${t.specialDiets.participantCount>0?`<div><dt>${s(r("summary.includedDiets"))}</dt><dd>${o}</dd></div>`:""}
        ${t.sickCount>0?`<div><dt>${s(r("summary.sickMeals"))}</dt><dd>${_(t)}</dd></div>`:""}
        ${t.sickDiets.length>0?`<div><dt>${s(r("summary.sickDiets"))}</dt><dd>${J(t)}</dd></div>`:""}
      </dl>
      ${a?"":`<section class="summary-international-names"><h3>${s(r("summary.names"))}</h3>${X(t,{compactActions:!0,residentLabel:e})}</section>`}
    </article>
  `}function Nt(t){return t.dateGroups.map(a=>{const e=t.columns.find(n=>n.dateId===a.dateId);return{...a,massStatus:e?.dayMassStatus||"UNKNOWN",blessingTime:e?.blessingTime||""}})}function j(t){return t.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${s(r("kitchen.notes.title"))}">
      <h3>${s(r("kitchen.notes.title"))}</h3>
      ${t.notesByDate.map(a=>`
        <div class="kitchen-notes-group">
          <time datetime="${s(a.dateId)}">${s(I(a.dateId))}</time>
          <ul>${a.notes.map(e=>`<li><p>${s(e.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function Z(t,a){const e=new Set;t.columns.forEach(i=>{[...i.specialDiets?.items||[],...i.sickDiets||[]].forEach(o=>{const l=F(o?.tag);/^\d{1,3}$/.test(l)&&e.add(l)})});const n=rt(a).filter(i=>e.has(i.code));return n.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${s(r("kitchen.dietLegend.title"))}">
      <h3>${s(r("kitchen.dietLegend.title"))}</h3>
      <ul>${n.map(i=>`<li><strong class="diet-code-badge diet-code-tone-${H(i.code)}">${s(y(i.code))}</strong><span aria-hidden="true">=</span><span>${s(i.label)}</span></li>`).join("")}</ul>
    </section>
  `}function x(t){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${s(t)}</span>`}function Tt(t,a){return t.dayIndex>a.index?" summary-matrix-next-date":""}function At(t){const a=/^([01]\d|2[0-3]):[0-5]\d$/.test(t.blessingTime||""),e=a&&Number(t.span)<2,n=a?e?" summary-mass-control-blessing-narrow":" summary-mass-control-blessing-wide":"",i=a?` mass-status-with-blessing${e?" mass-status-narrow":" mass-status-wide-blessing"}`:"",o=a?P(t.blessingTime,e?{narrow:!0}:{compact:!0}):"";return`
    <span class="summary-mass-control${n}">
      <span class="summary-mass-control-day">${s(at(t.dayIndex))}</span>
      <span class="summary-mass-control-state mass-status-stack${i}">${Mt(t)}${o}</span>
    </span>`}function w(t,a){return`${Tt(t,a)} summary-day-tone-${tt(t.dayIndex)}`}function tt(t){return Math.max(0,Math.min(2,Number(t)||0))}function at(t){return[r("summary.today"),r("summary.tomorrow"),r("summary.dayAfterTomorrow")][t]||r("summary.followingDay")}function I(t){const[a,e,n]=String(t).split("-").map(Number);return new Intl.DateTimeFormat(v(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(a,e-1,n))}function S(t){const[a,e,n]=String(t).split("-").map(Number);return!a||!e||!n?"":new Intl.DateTimeFormat(v(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(a,e-1,n))}function Lt(t,a){const e=[...t.querySelectorAll(`[data-${a}-screen]`)];if(e.length===0)return 0;const n=e.reduce((i,o)=>Math.abs(o.getBoundingClientRect().left-t.getBoundingClientRect().left)<Math.abs(i.getBoundingClientRect().left-t.getBoundingClientRect().left)?o:i);return Number(n.dataset[`${a}Screen`])===1?1:0}function et(t,a,e){t.querySelectorAll(`[data-${a}-screen]`).forEach(n=>{n.setAttribute("aria-hidden",String(Number(n.dataset[`${a}Screen`])!==e))})}export{Ht as mountSummaryMatrix,pt as scrollSummaryMatrix};

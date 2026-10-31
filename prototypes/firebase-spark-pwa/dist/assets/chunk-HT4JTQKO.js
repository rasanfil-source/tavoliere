import{a as L}from"./chunk-VIZ4VPBU.js";import{a as r}from"./chunk-JUUUUMHC.js";import{c as U}from"./chunk-7ZENLLVJ.js";import{e as I,f as o}from"./chunk-7FY4MGIF.js";import{a as B,c as F,d as O}from"./chunk-DZJEM4PC.js";import"./chunk-O2XFH626.js";var P="breakfast",Y="STANDARD";function _(t,a=[],e=[]){return J(t,a,e,!0)}function V(t,a=[]){return J(t,[],a,!1)}function J(t,a,e,s){let n=Array.isArray(t)?t:[],i=Array.isArray(e)?e:[],m=new Map(i.map(p=>[p.dateId,p])),u=gt(a),d=$t(n),l=d.findIndex(p=>p.mealTypeId===P),c=l>=0?d.slice(l+1):d,y=l>=0?d.slice(0,l+1):[];return[0,1].map(p=>{let h=[...c.map($=>W(n,p,$,m,u,s)),...y.map($=>W(n,p+1,$,m,u,s))].filter(Boolean),g=wt(h);return{index:p,dateId:n[p]?.dateId||h[0]?.dateId||"",labelKey:p===0?"summary.today":"summary.tomorrow",label:p===0?"Oggi":"Domani",columns:h,dateGroups:g,hasGuestGroup:h.some($=>$.guestCount>0),hasSpecialDiets:h.some($=>$.specialDiets.participantCount>0),hasSickMeals:h.some($=>$.sickCount>0),hasSickDiets:h.some($=>$.sickDiets.length>0),hasMassInformation:g.length>0,notesByDate:g.map($=>({dateId:$.dateId,notes:vt(m.get($.dateId))})).filter($=>$.notes.length>0)}})}function $t(t){let a=t.find(e=>Array.isArray(e.meals)&&e.meals.length>0);return a?a.meals.map(e=>({mealTypeId:e.mealTypeId,label:e.label})):[]}function gt(t){let a=new Map,e=s=>{s?.participantId&&a.set(s.participantId,{...a.get(s.participantId),...s})};return(Array.isArray(t)?t:[]).forEach(e),a}function W(t,a,e,s,n,i){let m=t[a];if(!m)return null;let u=m.meals?.find(b=>b.mealTypeId===e.mealTypeId)||{mealTypeId:e.mealTypeId,label:e.label,present:[]},d=s.get(m.dateId)||{},l=Array.isArray(u.present)?u.present:Array.isArray(u.dietParticipants)?u.dietParticipants:[],c=Q(l,Z(d),u.mealTypeId),y=X(d),p=new Set(y.map(b=>b.participantId)),h=c.filter(b=>!p.has(b.participantId)),g=Mt(d,u.mealTypeId,n,[...Array.isArray(u.participantDiets)?u.participantDiets:[],...Array.isArray(u.absent)?u.absent:[],...c]),$=Math.max(0,Math.floor(Number(u.count)||0)),v=Array.isArray(u.present)?h.length:Math.max(0,$-g.count),f=kt(d,u.mealTypeId);return{dayIndex:a,dateId:m.dateId,mealTypeId:u.mealTypeId,label:u.label,total:v+f,guestCount:f,specialDiets:bt(h),sickCount:g.count,sickDiets:g.diets,massStatus:xt(d.dailyOperation,u.mealTypeId),dayMassStatus:It(d.dailyOperation),blessingTime:(d.dailyOperation?.dailyOperation||d.dailyOperation)?.blessingTime||"",breakfastPlanned:u.mealTypeId===P&&v+f+g.count>0,names:i?h.map(b=>({participantId:b.participantId,displayName:b.displayName,signature:b.signature||"",initials:b.initials||"",dietTags:j(b),phone:b.phone||"",phoneConsent:b.phoneConsent===!0,whatsappEnabled:b.whatsappEnabled===!0})):[]}}function Q(t,a,e){let s=new Map;return(Array.isArray(a)?a:[]).forEach(n=>{let i=Array.isArray(n.mealTypeIds)?n.mealTypeIds:[];if(n.status==="REMOVED"||i.length>0&&!i.includes(e))return;let m=String(n.dietLabel||n.dietTag||"").trim();if(!n.participantId||!m)return;let u=s.get(n.participantId)||[];u.push(m),s.set(n.participantId,u)}),t.map(n=>{let i=s.get(n.participantId);return i?{...n,dietTags:[...new Set(i)]}:n})}function bt(t){let a=new Map,e=0;return t.forEach(s=>{let n=j(s);n.length!==0&&(e+=1,n.forEach(i=>a.set(i,(a.get(i)||0)+1)))}),{participantCount:e,items:[...a.entries()].map(([s,n])=>({tag:s,count:n}))}}function j(t){let a=Array.isArray(t.dietTags)?t.dietTags:[];return[...new Set(a.map(e=>String(e||"").trim()).filter(e=>e&&e.toUpperCase()!==Y))]}function Mt(t,a,e,s){let n=t?.dailyHealth||t,m=(Array.isArray(n?.sickMeals)?n.sickMeals:[]).find(y=>y.mealTypeId===a);if(m){let y=Array.isArray(m.dietLabels)?m.dietLabels:[];return{count:Math.max(0,Math.floor(Number(m.count)||0)),diets:G(y)}}let u=Z(t),d=new Map((Array.isArray(s)?s:[]).map(y=>[y.participantId,y])),l=X(t),c=[];return l.forEach(y=>{let p=d.get(y.participantId)||e.get(y.participantId)||y,[h]=Q([p],u,a);j(h).forEach(g=>c.push(g))}),{count:l.length,diets:G(c)}}function G(t){let a=new Map;return(Array.isArray(t)?t:[]).forEach(e=>{let s=String(e||"").trim();!s||s.toUpperCase()===Y||a.set(s,(a.get(s)||0)+1)}),[...a.entries()].map(([e,s])=>({tag:e,count:s}))}function xt(t,a){let e=t?.dailyOperation||t,s=e?.massByMeal?.[a];return s==="YES"||s==="NO"?s:e&&typeof e.massScheduled=="boolean"?e.massScheduled?"YES":"NO":"UNKNOWN"}function It(t){let a=t?.dailyOperation||t,e=Object.entries(a?.massByMeal||{}).filter(([s])=>s!==P).map(([,s])=>s);return e.includes("YES")?"YES":e.includes("NO")?"NO":a&&typeof a.massScheduled=="boolean"?a.massScheduled?"YES":"NO":"UNKNOWN"}function X(t){let a=t?.dailyHealth||t;return Array.isArray(a?.sickPeople)?a.sickPeople:[]}function Z(t){let a=t?.dailyHealth||t;return Array.isArray(t?.occasionalDiets)?t.occasionalDiets:Array.isArray(a?.dietAssignments)?a.dietAssignments:[]}function kt(t,a){let s=(t?.dailyHealth||t)?.invitedMeals||t?.invitedMeals||t?.dailyOperation?.invitedMeals||{};return Math.min(999,Math.max(0,Math.floor(Number(s[a])||0)))}function vt(t){return(Array.isArray(t?.notes)?t.notes:t?.note?[t.note]:[]).filter(e=>e&&e.status!=="REMOVED"&&e.text)}function wt(t){return t.reduce((a,e)=>{let s=a[a.length-1];return s&&s.dateId===e.dateId?(s.span+=1,a):(a.push({dayIndex:e.dayIndex,dateId:e.dateId,span:1}),a)},[])}var et=0;function na(t,{days:a=[],operationDays:e=[],screenReady:s=()=>!0,kitchen:n=!1,layout:i="classic",residentLabel:m="name",dietLegend:u=[],showContactHint:d=!0,activeIndex:l=0,monthSummary:c=null,onActiveIndexChange:y=()=>{}}={}){let p=n?V(a,e):_(a,[],e);if(i==="future"&&!n){St(t,p,m,l,y,d,s);return}if(p.every(f=>f.columns.length===0)&&!(n&&c?.onLoad)){t.innerHTML=`<p class="empty-state">${r(o("summary.noMeal"))}</p>`;return}let h=n?"kitchen":"summary",g=i==="international"?Ut:Et;if(t.innerHTML=`
    <div class="summary-matrix-track summary-layout-${i}${n?" summary-layout-kitchen":" summary-layout-diners"}" data-${h}-matrix-track aria-label="${r(o("summary.screensLabel"))}">
      ${p.map(f=>s(f.index)?g(f,{kitchen:n,activeIndex:l,residentLabel:m,showContactHint:d,dietLegend:u}):Ct(f,{kitchen:n,activeIndex:l,layout:i})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${r(o("summary.swipeHint"))}</p>
    ${n?Pt(c):""}
  `,n&&c?.onLoad){let f=t.querySelector("[data-kitchen-monthly-summary]"),b=f?.querySelector("[data-kitchen-monthly-summary-content]");if(f&&b){let x={latestMonthId:null,earliestMonthId:null,selectedMonthId:null,latestSummary:null,summaries:new Map};b.addEventListener("click",ft=>{let E=ft.target?.closest?.("[data-kitchen-month-step]");if(!E||E.disabled||!f.open||f.dataset.loading==="true")return;let w=jt(x.selectedMonthId,Number(E.dataset.kitchenMonthStep));!w||w<x.earliestMonthId||w>x.latestMonthId||(x.selectedMonthId=w,at(f,c,x,w))}),f.addEventListener("toggle",()=>{f.open&&f.dataset.loading!=="true"&&at(f,c,x)})}}let $=t.querySelector(`[data-${h}-matrix-track]`),v=0;$.addEventListener("scroll",()=>{window.clearTimeout(v),v=window.setTimeout(()=>{let f=Jt($,h);ht(t,h,f),y(f)},100)},{passive:!0}),window.requestAnimationFrame(()=>{Nt(t,l,{kitchen:n,smooth:!1})})}function St(t,a,e="name",s=0,n=()=>{},i=!0,m=()=>!0){t.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${a.map(l=>m(l.index)?`
        <article class="summary-future-card" data-summary-future-screen="${l.index}" aria-hidden="${l.index!==s}">
          <header class="summary-future-card-head">
            <div><strong>${r(o(l.labelKey))}</strong><time datetime="${r(l.dateId)}">${r(T(l.dateId))}</time></div>
            ${Tt(l)}
          </header>
          <div class="summary-future-meals">
            ${l.columns.map(c=>Dt(c,e,i)).join("")}
          </div>
          ${q(l)}
        </article>
      `:`
        <article class="summary-future-card" data-summary-future-screen="${l.index}" aria-hidden="${l.index!==s}" aria-busy="true">
          <header class="summary-future-card-head"><div><strong>${r(o(l.labelKey))}</strong><time datetime="${r(l.dateId)}">${r(T(l.dateId))}</time></div></header>
          <p class="empty-state" role="status">${r(o("common.status.loading"))}</p>
        </article>
      `).join("")}
    </div>
  `;let u=t.querySelector("[data-summary-future-track]"),d=0;u?.addEventListener("scroll",()=>{window.clearTimeout(d),d=window.setTimeout(()=>{let l=Math.max(0,Math.min(1,Math.round(u.scrollLeft/Math.max(1,u.clientWidth+14))));u.querySelectorAll("[data-summary-future-screen]").forEach(c=>{c.setAttribute("aria-hidden",String(Number(c.dataset.summaryFutureScreen)!==l))}),n(l)},100)},{passive:!0}),window.requestAnimationFrame(()=>{u&&u.scrollTo({left:Math.max(0,s)*(u.clientWidth+14),behavior:"auto"})})}function Ct(t,{kitchen:a,activeIndex:e,layout:s}){return`
    <section class="summary-matrix-screen${s==="international"?" summary-international-screen summary-screen-ordinary":""}" data-${a?"kitchen":"summary"}-screen="${t.index}" role="tabpanel" aria-hidden="${t.index!==e}" aria-busy="true">
      <p class="empty-state" role="status">${r(o("common.status.loading"))}</p>
    </section>
  `}function Dt(t,a,e=!0){let s=Array.isArray(t.names)?t.names:[],n=[...Array.isArray(t.specialDiets?.items)?t.specialDiets.items:[]].map(d=>M(d.tag)).filter(Boolean).sort((d,l)=>d.localeCompare(l,I(),{numeric:!0})),i=Number(t.guestCount||0),m=Number(t.sickCount||0),u=Array.isArray(t.sickDiets)?t.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${H(t.mealTypeId)}</span>
        <span class="summary-future-meal-name">${r(z(t,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${r(String(t.total||0))}</strong>
      </div>
      ${it(t,e)}
      ${i>0?tt("summary.guests",i,"guests"):""}
      ${n.length?`<p class="summary-future-diets"><span>${r(o("summary.diets"))}:</span> <strong>${r(n.join(", "))}</strong></p>`:""}
      ${m>0?tt("summary.sickMeals",m,"sick"):""}
      ${u.length>0?`<div class="summary-future-special-row"><span>${r(o("summary.sickDiets"))}</span><div>${N(u," summary-future-diet-list")}</div></div>`:""}
      ${s.length?`<div class="summary-future-people">${s.map(d=>At(d,a)).join("")}</div>`:""}
    </section>
  `}function tt(t,a,e){return e==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${r(String(a))}</strong><span>${r(o(t))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${r(e)}"><span>${r(o(t))}</span><strong>${r(String(a))}</strong></p>`}function At(t,a){let e=String(t.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(l=>l[0]).join("").toUpperCase(),s=a==="signature"?t.signature||t.displayName:a==="initials"?t.initials||e||t.signature:t.displayName,n=Array.isArray(t.dietTags)?t.dietTags.map(l=>M(l)).filter(Boolean):[],i=`${r(s||"–")}${n.length?`&nbsp;<small>(${r(n.join(", "))})</small>`:""}`,m=R(t.phone),u=t.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${r(m)}" aria-label="${r(o("summary.callPerson",{name:t.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",d=t.whatsappEnabled&&t.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(o("summary.messagePerson",{name:t.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(u||d){let l=`summary-contact-popup-${++et}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${l}" aria-haspopup="dialog" aria-label="${r(o("summary.contactPerson",{name:t.displayName}))}">${i}</button><span class="summary-matrix-contact-popover" id="${l}" popover role="dialog"><span class="summary-matrix-contact-actions">${u}${d}</span></span></span>`}return`<span class="summary-future-person" title="${r(t.displayName||s)}">${i}</span>`}function Tt(t){let a=t.columns.find(s=>s.dayIndex===t.index),e=a?.dayMassStatus;return!e||e==="UNKNOWN"?"":st(e,a.blessingTime)}function st(t,a=""){let e=t==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${e?"yes":"no"}"><span>${r(o("summary.mass"))}:</span><span class="mass-status-stack"><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${r(o(e?"summary.yes":"summary.no"))}</strong>${L(a)}</span></span>`}function Nt(t,a,{kitchen:e=!1,smooth:s=!0}={}){let n=e?"kitchen":"summary",i=Number(a)===1?1:0;if(!e){let d=t?.querySelector("[data-summary-future-track]");if(d)return d.scrollTo({left:i*(d.clientWidth+14),behavior:s?"smooth":"auto"}),d.querySelectorAll("[data-summary-future-screen]").forEach(l=>{l.setAttribute("aria-hidden",String(Number(l.dataset.summaryFutureScreen)!==i))}),!0}let m=t?.querySelector(`[data-${n}-matrix-track]`),u=m?.querySelector(`[data-${n}-screen="${i}"]`);return!m||!u?!1:(m.scrollTo({left:m.scrollLeft+u.getBoundingClientRect().left-m.getBoundingClientRect().left,behavior:s?"smooth":"auto"}),ht(t,n,i),!0)}function Et(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:n=!0,dietLegend:i=[]}){let m=a?"kitchen":"summary",u=t.index===e,d=Lt(t);return t.columns.length===0?`
      <section class="summary-matrix-screen" data-${m}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
        <p class="empty-state">${r(o("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${m}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      <table class="summary-matrix summary-matrix-optional-rows-${d}">
        ${Bt(t,a)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${t.columns.map(l=>l.dayIndex>t.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${r(o("summary.item"))}</span></th>
            ${t.dateGroups.map(l=>`
              <th class="summary-matrix-date-heading${C(l,t)}" scope="colgroup" colspan="${l.span}">
                <span>${r(yt(l.dayIndex))}</span>
                <time datetime="${r(l.dateId)}">${r(D(l.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${t.columns.map(l=>`
              <th class="summary-matrix-meal-heading${C(l,t)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${H(l.mealTypeId)}</span><span class="summary-matrix-meal-label">${r(z(l))}</span>${Ft(l,a)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${t.hasGuestGroup?S(o("summary.guests"),"summary-matrix-row-guests",t,l=>String(l.guestCount)):""}
          ${S(o("summary.diningMeals"),"summary-matrix-row-meals",t,nt)}
          ${t.hasSpecialDiets?S(o("summary.includedDiets"),"summary-matrix-row-diets",t,a?ut:mt):""}
          ${t.hasSickMeals?S(o("summary.sickMeals"),"summary-matrix-row-sick",t,ot):""}
          ${t.hasSickDiets?S(o("summary.sickDiets"),"summary-matrix-row-sick-diets",t,lt):""}
          ${t.hasMassInformation?qt(t):""}
          ${a?"":zt(t,s,n)}
        </tbody>
      </table>
      ${a?ct(t,i):""}
      ${q(t)}
    </section>
  `}function Lt(t){return[t.hasGuestGroup,t.hasSickMeals,t.hasSickDiets].filter(Boolean).length}function Bt(t,a){return a?`<caption class="sr-only">${r(`${o("kitchen.view.title")}: ${o(t.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${r(t.dateId)}">${r(T(t.dateId))}</time>
    </caption>
  `}function H(t){let a={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return Ot({breakfast:"coffee",lunch:"sun",dinner:"moon"}[t],a[t]||"•")}function Ot(t,a="•"){let e=document.documentElement.dataset.interfaceStyle;if(!(e==="cool"||e==="urban"||e==="future")||!t)return a;let i={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[t];return i?`<svg class="meal-line-icon meal-line-icon-${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${i}</svg>`:a}function z(t,{breakfastTomorrow:a=!1}={}){let e=String(t?.mealTypeId||"").trim().toLowerCase();if(a&&e==="breakfast")return o("summary.breakfastTomorrow");let s=e?o(`meal.type.${e}`):"",n=String(t?.label||"").trim();return s&&s!==`meal.type.${e}`?s:n}function S(t,a,e,s){return`
    <tr class="${a}">
      <th class="summary-matrix-label" scope="row">${r(t)}</th>
      ${e.columns.map(n=>`<td class="${C(n,e).trim()}">${s(n)}</td>`).join("")}
    </tr>
  `}function nt(t,{contactHint:a=!1}={}){let e=t.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${t.total}</span><span class="summary-matrix-unit">${r(o(e))}</span>${a?it(t):""}`}function rt(t){return Array.isArray(t?.names)&&t.names.some(a=>a?.phoneConsent&&R(a.phone))}function Pt(t){return typeof t?.onLoad!="function"?"":`
    <section class="kitchen-monthly-summary">
      <details data-kitchen-monthly-summary>
        <summary>${r(o("kitchen.monthly.title"))}</summary>
        <div class="kitchen-monthly-summary-content" data-kitchen-monthly-summary-content role="status" aria-live="polite"></div>
      </details>
    </section>
  `}async function at(t,a,e,s=null){let n=t.querySelector("[data-kitchen-monthly-summary-content]");if(!(!n||t.dataset.loading==="true")){t.dataset.loading="true",e.latestMonthId===null?n.textContent=o("kitchen.monthly.loading"):A(n,e,{message:o("kitchen.monthly.loading"),loading:!0});try{let i=null;if(e.latestMonthId===null)i=await a.onLoad(),i?.monthId&&(e.latestMonthId=i.monthId,e.earliestMonthId=i.earliestMonthId||i.monthId,e.selectedMonthId=i.monthId,e.latestSummary=i,e.summaries.set(i.monthId,i));else{let m=s||e.selectedMonthId||e.latestMonthId;e.selectedMonthId=m,m===e.latestMonthId?i=e.latestSummary:e.summaries.has(m)?i=e.summaries.get(m):(i=await a.onLoad(m),i&&e.summaries.set(m,i))}if(!t.isConnected||!t.open)return;if(!i){A(n,e,{message:o(e.latestMonthId===null?"kitchen.monthly.firstAvailable":"kitchen.monthly.notReady")});return}A(n,e,{summary:i})}catch{if(!t.isConnected||!t.open)return;A(n,e,{message:o("kitchen.monthly.unavailable")})}finally{delete t.dataset.loading}}}function A(t,a,{summary:e=null,message:s="",loading:n=!1}={}){let i=a.selectedMonthId;if(!i){t.textContent=s;return}let m=e?.periodStart||`${i}-01`,u=e?.periodEnd||Kt(i),d=n||!a.earliestMonthId||i<=a.earliestMonthId,l=n||!a.latestMonthId||i>=a.latestMonthId,c=s?r(s):`<dl>
        ${K("breakfast",e.counts.breakfast)}
        ${K("lunch",e.counts.lunch)}
        ${K("dinner",e.counts.dinner)}
      </dl>
      <div class="kitchen-monthly-guest-total">
        <span>${r(o("kitchen.monthly.guests"))}</span>
        <strong>${r(e.invitedTotal)}</strong>
      </div>`;t.innerHTML=`
    <div class="kitchen-monthly-period">
      <button class="kitchen-monthly-nav-button" type="button"
        data-kitchen-month-step="-1"
        aria-label="${r(o("kitchen.monthly.previous"))}"
        ${d?"disabled":""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 6 12l9 8z"></path></svg>
      </button>
      <p><strong>${r(o("kitchen.monthly.period"))}</strong> ${r(D(m))} – ${r(D(u))}</p>
      <button class="kitchen-monthly-nav-button" type="button"
        data-kitchen-month-step="1"
        aria-label="${r(o("kitchen.monthly.next"))}"
        ${l?"disabled":""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 9 8-9 8z"></path></svg>
      </button>
    </div>
    <div class="kitchen-monthly-summary-status" role="status" aria-live="polite">${c}</div>
  `}function jt(t,a){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(t||"")||!Number.isInteger(a))return null;let[e,s]=t.split("-").map(Number),n=e*12+s-1+a;if(n<0)return null;let i=Math.floor(n/12),m=n%12+1;return`${String(i).padStart(4,"0")}-${String(m).padStart(2,"0")}`}function Kt(t){let[a,e]=t.split("-").map(Number),s=new Date(Date.UTC(a,e,0)).getUTCDate();return`${t}-${String(s).padStart(2,"0")}`}function K(t,a){let e=o(`meal.type.${t}`);return`<div><dt>${r(e)}</dt><dd>${r(a)}</dd></div>`}function it(t,a=!0){return!a||!rt(t)?"":`<small class="summary-contact-hint">${r(o("summary.contactHint"))}</small>`}function ot(t){if(t.sickCount===0)return k(o("summary.sickMeals"));let a=t.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${t.sickCount}</span><span class="summary-matrix-unit">${r(o(a))}</span>`}function lt(t){return t.sickDiets.length===0?k(o("summary.noDiet")):N(t.sickDiets)}function Ht(t){if(t.massStatus==="UNKNOWN")return k(o("summary.notSet"));let a=t.massStatus==="YES";return`<span class="summary-matrix-mass-${a?"yes":"no"}">${r(o(a?"summary.yes":"summary.no"))}</span>`}function zt(t,a="name",e=!0){return`
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
        ${e&&t.columns.some(rt)?`<small class="summary-contact-hint">${r(o("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${r(o("summary.names"))}</span>
      </th>
      ${t.columns.map(n=>`<td class="${C(n,t).trim()}">${dt(n,{compactActions:!0,residentLabel:a})}</td>`).join("")}
    </tr>
  `}function Rt(t){return t==="YES"?" summary-mass-state-yes":t==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function qt(t){let a=Yt(t).map(e=>`<td class="summary-matrix-mass-band${C(e,t)}${Rt(e.massStatus)}" colspan="${e.span}">${Vt(e)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${r(o("summary.mass"))}</th>
      ${a}
    </tr>
  `}function Ft(t,a){if(a||t.mealTypeId!=="breakfast")return"";let e=t.breakfastPlanned===!0,s=o(e?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${e?"yes":"no"}"><span aria-hidden="true">${e?"✓":"×"}</span>${r(s)}</span>`}function mt(t){if(t.specialDiets.participantCount===0)return k(o("summary.noDiet"));let a=[...t.specialDiets.items].sort((e,s)=>M(e.tag).localeCompare(M(s.tag),I(),{numeric:!0}));return N(a)}function ut(t){return t.specialDiets.participantCount===0?k(o("summary.noDiet")):N(t.specialDiets.items," summary-matrix-kitchen-diets")}function N(t,a=""){let e=[...t].sort((s,n)=>M(s.tag).localeCompare(M(n.tag),I(),{numeric:!0}));return`<ul class="summary-matrix-diets${a}">${e.map(s=>{let n=M(s.tag),i=Math.max(0,Math.floor(Number(s.count)||0)),m=i>1?`<span class="diet-code-count">× ${i}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${O(s.tag)}">${r(n)}</span>${m}</li>`}).join("")}</ul>`}function M(t){return F(B(t),o)}function dt(t,{compactActions:a=!1,residentLabel:e="name"}={}){return t.names.length===0?k(o("summary.noName")):`<ul class="summary-matrix-names">${t.names.map(s=>{let n=s.dietTags.map(g=>M(g)),i=R(s.phone),m=String(s.displayName||"").trim(),u=m.split(/\s+/).filter(Boolean).slice(0,3).map(g=>g[0]).join("").toUpperCase(),d=e==="signature"?s.signature||m:e==="initials"&&(s.initials||u||s.signature)||m,l=r(d),c=n.length?` <small>(${r(n.join(", "))})</small>`:"",y=`<span class="summary-matrix-person-name">${l}${c}</span>`,p=s.phoneConsent&&i?`<a class="summary-matrix-call" href="tel:${r(i)}" aria-label="${r(o("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",h=s.whatsappEnabled&&s.phoneConsent&&i?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(i.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(o("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(a&&(p||h)){let g=`summary-contact-popup-${++et}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${g}" aria-haspopup="dialog" aria-label="${r(o("summary.contactPerson",{name:s.displayName}))}" title="${r(o("summary.contactPerson",{name:s.displayName}))}">${y}</button>
            <span class="summary-matrix-contact-popover" id="${g}" popover role="dialog" aria-label="${r(o("summary.contactPerson",{name:s.displayName}))}">
              <span class="summary-matrix-contact-actions">${p}${h}</span>
            </span>
          </li>`}return`<li>${y}<span class="summary-matrix-contact-actions">${p}${h}</span></li>`}).join("")}</ul>`}function R(t){let a=String(t||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(a)?a:""}function Ut(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:n=!0,dietLegend:i=[]}){let m=a?"kitchen":"summary",u=t.index===e;return`
    <section class="summary-matrix-screen summary-international-screen${Wt(t)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${m}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      ${a?`<h2 class="sr-only">${r(`${o("kitchen.view.title")}: ${o(t.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${r(t.dateId)}">${r(T(t.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${t.columns.map((l,c,y)=>Gt(l,{kitchen:a,residentLabel:s,showContactHint:n,showMassMetadata:c===0||y[c-1]?.dateId!==l.dateId})).join("")}
      </div>
      ${a?ct(t,i):""}
      ${q(t)}
    </section>
  `}function Wt(t){return t.columns.some(a=>a.guestCount>0||a.specialDiets.participantCount>0||a.sickCount>0||a.sickDiets.length>0)||t.notesByDate.length>0}function Gt(t,{kitchen:a,residentLabel:e="name",showContactHint:s=!0,showMassMetadata:n=!1}){let i=a?ut(t):mt(t),m=n&&t.dayMassStatus!=="UNKNOWN"?st(t.dayMassStatus,t.blessingTime):"",u=t.guestCount>0?`<span class="summary-international-mobile-guests">${r(o("summary.guests"))}: <strong>${t.guestCount}</strong></span>`:"",d=m||u?`<div class="summary-international-card-actions">${m}${u}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${pt(t.dayIndex)}${t.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${H(t.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${r(z(t,{breakfastTomorrow:!0}))}</strong><time datetime="${r(t.dateId)}">${r(D(t.dateId))}</time></div>
        ${d}
      </header>
      <dl>
        ${t.guestCount>0?`<div class="summary-international-guest-row"><dt>${r(o("summary.guests"))}</dt><dd>${t.guestCount}</dd></div>`:""}
        <div><dt>${r(o("summary.diningMeals"))}</dt><dd>${nt(t,{contactHint:!a&&s})}</dd></div>
        ${t.specialDiets.participantCount>0?`<div><dt>${r(o("summary.includedDiets"))}</dt><dd>${i}</dd></div>`:""}
        ${t.sickCount>0?`<div><dt>${r(o("summary.sickMeals"))}</dt><dd>${ot(t)}</dd></div>`:""}
        ${t.sickDiets.length>0?`<div><dt>${r(o("summary.sickDiets"))}</dt><dd>${lt(t)}</dd></div>`:""}
      </dl>
      ${a?"":`<section class="summary-international-names"><h3>${r(o("summary.names"))}</h3>${dt(t,{compactActions:!0,residentLabel:e})}</section>`}
    </article>
  `}function Yt(t){return t.dateGroups.map(a=>{let e=t.columns.find(s=>s.dateId===a.dateId);return{...a,massStatus:e?.dayMassStatus||"UNKNOWN",blessingTime:e?.blessingTime||""}})}function q(t){return t.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${r(o("kitchen.notes.title"))}">
      <h3>${r(o("kitchen.notes.title"))}</h3>
      ${t.notesByDate.map(a=>`
        <div class="kitchen-notes-group">
          <time datetime="${r(a.dateId)}">${r(D(a.dateId))}</time>
          <ul>${a.notes.map(e=>`<li><p>${r(e.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function ct(t,a){let e=new Set;t.columns.forEach(n=>{[...n.specialDiets?.items||[],...n.sickDiets||[]].forEach(i=>{let m=B(i?.tag);/^\d{1,3}$/.test(m)&&e.add(m)})});let s=U(a).filter(n=>e.has(n.code));return s.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${r(o("kitchen.dietLegend.title"))}">
      <h3>${r(o("kitchen.dietLegend.title"))}</h3>
      <ul>${s.map(n=>`<li><strong class="diet-code-badge diet-code-tone-${O(n.code)}">${r(M(n.code))}</strong><span aria-hidden="true">=</span><span>${r(n.label)}</span></li>`).join("")}</ul>
    </section>
  `}function k(t){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${r(t)}</span>`}function _t(t,a){return t.dayIndex>a.index?" summary-matrix-next-date":""}function Vt(t){let a=/^([01]\d|2[0-3]):[0-5]\d$/.test(t.blessingTime||""),e=a&&Number(t.span)<2,s=a?e?" summary-mass-control-blessing-narrow":" summary-mass-control-blessing-wide":"",n=a?` mass-status-with-blessing${e?" mass-status-narrow":" mass-status-wide-blessing"}`:"",i=a?L(t.blessingTime,e?{narrow:!0}:{compact:!0}):"";return`
    <span class="summary-mass-control${s}">
      <span class="summary-mass-control-day">${r(yt(t.dayIndex))}</span>
      <span class="summary-mass-control-state mass-status-stack${n}">${Ht(t)}${i}</span>
    </span>`}function C(t,a){return`${_t(t,a)} summary-day-tone-${pt(t.dayIndex)}`}function pt(t){return Math.max(0,Math.min(2,Number(t)||0))}function yt(t){return[o("summary.today"),o("summary.tomorrow"),o("summary.dayAfterTomorrow")][t]||o("summary.followingDay")}function D(t){let[a,e,s]=String(t).split("-").map(Number);return new Intl.DateTimeFormat(I(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(a,e-1,s))}function T(t){let[a,e,s]=String(t).split("-").map(Number);return!a||!e||!s?"":new Intl.DateTimeFormat(I(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(a,e-1,s))}function Jt(t,a){let e=[...t.querySelectorAll(`[data-${a}-screen]`)];if(e.length===0)return 0;let s=e.reduce((n,i)=>Math.abs(i.getBoundingClientRect().left-t.getBoundingClientRect().left)<Math.abs(n.getBoundingClientRect().left-t.getBoundingClientRect().left)?i:n);return Number(s.dataset[`${a}Screen`])===1?1:0}function ht(t,a,e){t.querySelectorAll(`[data-${a}-screen]`).forEach(s=>{s.setAttribute("aria-hidden",String(Number(s.dataset[`${a}Screen`])!==e))})}export{na as mountSummaryMatrix,Nt as scrollSummaryMatrix};

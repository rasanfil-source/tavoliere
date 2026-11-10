import{a as E}from"./chunk-7ZLQ3PP2.js";import{a as n}from"./chunk-JUUUUMHC.js";import{c as U}from"./chunk-7ZENLLVJ.js";import{e as k,f as o}from"./chunk-5VGNMWJG.js";import{a as L,c as F,d as B}from"./chunk-DZJEM4PC.js";import"./chunk-O2XFH626.js";var O="breakfast",_="STANDARD";function V(t,e=[],a=[]){return Q(t,e,a,!0)}function J(t,e=[]){return Q(t,[],e,!1)}function Q(t,e,a,s){let r=Array.isArray(t)?t:[],i=Array.isArray(a)?a:[],l=new Map(i.map(f=>[f.dateId,f])),u=Mt(e),d=bt(r),m=d.findIndex(f=>f.mealTypeId===O),c=m>=0?d.slice(m+1):d,y=m>=0?d.slice(0,m+1):[];return[0,1].map(f=>{let $=[...c.map(g=>G(r,f,g,l,u,s)),...y.map(g=>G(r,f+1,g,l,u,s))].filter(Boolean),b=Ct($);return{index:f,dateId:r[f]?.dateId||$[0]?.dateId||"",labelKey:f===0?"summary.today":"summary.tomorrow",label:f===0?"Oggi":"Domani",columns:$,dateGroups:b,hasGuestGroup:$.some(g=>g.guestCount>0),hasSpecialDiets:$.some(g=>g.specialDiets.participantCount>0),hasSickMeals:$.some(g=>g.sickCount>0),hasSickDiets:$.some(g=>g.sickDiets.length>0),hasMassInformation:b.length>0,notesByDate:b.map(g=>({dateId:g.dateId,notes:Dt(l.get(g.dateId))})).filter(g=>g.notes.length>0)}})}function bt(t){let e=t.find(a=>Array.isArray(a.meals)&&a.meals.length>0);return e?e.meals.map(a=>({mealTypeId:a.mealTypeId,label:a.label})):[]}function Mt(t){let e=new Map,a=s=>{s?.participantId&&e.set(s.participantId,{...e.get(s.participantId),...s})};return(Array.isArray(t)?t:[]).forEach(a),e}function G(t,e,a,s,r,i){let l=t[e];if(!l)return null;let u=l.meals?.find(M=>M.mealTypeId===a.mealTypeId)||{mealTypeId:a.mealTypeId,label:a.label,present:[]},d=s.get(l.dateId)||{},m=Array.isArray(u.present)?u.present:Array.isArray(u.dietParticipants)?u.dietParticipants:[],c=X(m,tt(d),u.mealTypeId),y=Z(d),f=new Set(y.map(M=>M.participantId)),$=c.filter(M=>!f.has(M.participantId)),b=xt(d,u.mealTypeId,r,[...Array.isArray(u.participantDiets)?u.participantDiets:[],...Array.isArray(u.absent)?u.absent:[],...c]),g=Math.max(0,Math.floor(Number(u.count)||0)),w=Array.isArray(u.present)?$.length:Math.max(0,g-b.count),p=wt(d,u.mealTypeId);return{dayIndex:e,dateId:l.dateId,mealTypeId:u.mealTypeId,label:u.label,total:w+p,guestCount:p,specialDiets:It($),sickCount:b.count,sickDiets:b.diets,massStatus:kt(d.dailyOperation,u.mealTypeId),dayMassStatus:vt(d.dailyOperation),blessingTime:(d.dailyOperation?.dailyOperation||d.dailyOperation)?.blessingTime||"",breakfastPlanned:u.mealTypeId===O&&w+p+b.count>0,names:i?$.map(M=>({participantId:M.participantId,displayName:M.displayName,signature:M.signature||"",initials:M.initials||"",dietTags:P(M),phone:M.phone||"",phoneConsent:M.phoneConsent===!0,whatsappEnabled:M.whatsappEnabled===!0})):[]}}function X(t,e,a){let s=new Map;return(Array.isArray(e)?e:[]).forEach(r=>{let i=Array.isArray(r.mealTypeIds)?r.mealTypeIds:[];if(r.status==="REMOVED"||i.length>0&&!i.includes(a))return;let l=String(r.dietLabel||r.dietTag||"").trim();if(!r.participantId||!l)return;let u=s.get(r.participantId)||[];u.push(l),s.set(r.participantId,u)}),t.map(r=>{let i=s.get(r.participantId);return i?{...r,dietTags:[...new Set(i)]}:r})}function It(t){let e=new Map,a=0;return t.forEach(s=>{let r=P(s);r.length!==0&&(a+=1,r.forEach(i=>e.set(i,(e.get(i)||0)+1)))}),{participantCount:a,items:[...e.entries()].map(([s,r])=>({tag:s,count:r}))}}function P(t){let e=Array.isArray(t.dietTags)?t.dietTags:[];return[...new Set(e.map(a=>String(a||"").trim()).filter(a=>a&&a.toUpperCase()!==_))]}function xt(t,e,a,s){let r=t?.dailyHealth||t,l=(Array.isArray(r?.sickMeals)?r.sickMeals:[]).find(y=>y.mealTypeId===e);if(l){let y=Array.isArray(l.dietLabels)?l.dietLabels:[];return{count:Math.max(0,Math.floor(Number(l.count)||0)),diets:Y(y)}}let u=tt(t),d=new Map((Array.isArray(s)?s:[]).map(y=>[y.participantId,y])),m=Z(t),c=[];return m.forEach(y=>{let f=d.get(y.participantId)||a.get(y.participantId)||y,[$]=X([f],u,e);P($).forEach(b=>c.push(b))}),{count:m.length,diets:Y(c)}}function Y(t){let e=new Map;return(Array.isArray(t)?t:[]).forEach(a=>{let s=String(a||"").trim();!s||s.toUpperCase()===_||e.set(s,(e.get(s)||0)+1)}),[...e.entries()].map(([a,s])=>({tag:a,count:s}))}function kt(t,e){let a=t?.dailyOperation||t,s=a?.massByMeal?.[e];return s==="YES"||s==="NO"?s:a&&typeof a.massScheduled=="boolean"?a.massScheduled?"YES":"NO":"UNKNOWN"}function vt(t){let e=t?.dailyOperation||t,a=Object.entries(e?.massByMeal||{}).filter(([s])=>s!==O).map(([,s])=>s);return a.includes("YES")?"YES":a.includes("NO")?"NO":e&&typeof e.massScheduled=="boolean"?e.massScheduled?"YES":"NO":"UNKNOWN"}function Z(t){let e=t?.dailyHealth||t;return Array.isArray(e?.sickPeople)?e.sickPeople:[]}function tt(t){let e=t?.dailyHealth||t;return Array.isArray(t?.occasionalDiets)?t.occasionalDiets:Array.isArray(e?.dietAssignments)?e.dietAssignments:[]}function wt(t,e){let s=(t?.dailyHealth||t)?.invitedMeals||t?.invitedMeals||t?.dailyOperation?.invitedMeals||{};return Math.min(999,Math.max(0,Math.floor(Number(s[e])||0)))}function Dt(t){return(Array.isArray(t?.notes)?t.notes:t?.note?[t.note]:[]).filter(a=>a&&a.status!=="REMOVED"&&a.text)}function Ct(t){return t.reduce((e,a)=>{let s=e[e.length-1];return s&&s.dateId===a.dateId?(s.span+=1,e):(e.push({dayIndex:a.dayIndex,dateId:a.dateId,span:1}),e)},[])}var nt=0,at=new WeakMap;function oa(t,{days:e=[],operationDays:a=[],screenReady:s=()=>!0,kitchen:r=!1,layout:i="classic",residentLabel:l="name",dietLegend:u=[],showContactHint:d=!0,activeIndex:m=0,monthSummary:c=null,onActiveIndexChange:y=()=>{}}={}){let f=r?J(e,a):V(e,[],a);if(i==="future"&&!r){At(t,f,l,m,y,d,s);return}if(f.every(p=>p.columns.length===0)&&!(r&&c?.onLoad)){t.innerHTML=`<p class="empty-state">${n(o("summary.noMeal"))}</p>`;return}let $=r?"kitchen":"summary",b=i==="international"?Yt:Bt;if(t.innerHTML=`
    <div class="summary-matrix-track summary-layout-${i}${r?" summary-layout-kitchen":" summary-layout-diners"}" data-${$}-matrix-track aria-label="${n(o("summary.screensLabel"))}">
      ${f.map(p=>s(p.index)?b(p,{kitchen:r,activeIndex:m,residentLabel:l,showContactHint:d,dietLegend:u}):Tt(p,{kitchen:r,activeIndex:m,layout:i})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${n(o("summary.swipeHint"))}</p>
    ${r?Kt(c):""}
  `,r&&c?.onLoad){let p=t.querySelector("[data-kitchen-monthly-summary]"),M=p?.querySelector("[data-kitchen-monthly-summary-content]");if(p&&M){let W=c.centerId||"",h=at.get(t);(!h||h.centerId!==W)&&(h={centerId:W,open:!1,latestMonthId:null,earliestMonthId:null,selectedMonthId:null,latestSummary:null,summaries:new Map,loading:!1,details:null},at.set(t,h)),h.details=p,p.open=h.open,M.addEventListener("click",gt=>{let N=gt.target?.closest?.("[data-kitchen-month-step]");if(!N||N.disabled||!p.open||h.loading)return;let D=Ht(h.selectedMonthId,Number(N.dataset.kitchenMonthStep));!D||D<h.earliestMonthId||D>h.latestMonthId||(h.selectedMonthId=D,st(p,c,h,D))}),p.addEventListener("toggle",()=>{h.details!==p||h.open===p.open||(h.open=p.open,p.open&&!h.loading&&(h.latestMonthId=null,st(p,c,h)))}),h.open&&K(M,h,{summary:h.summaries.get(h.selectedMonthId),message:h.message||"",loading:h.loading})}}let g=t.querySelector(`[data-${$}-matrix-track]`),w=0;g.addEventListener("scroll",()=>{window.clearTimeout(w),w=window.setTimeout(()=>{let p=Zt(g,$);$t(t,$,p),y(p)},100)},{passive:!0}),window.requestAnimationFrame(()=>{Lt(t,m,{kitchen:r,smooth:!1})})}function At(t,e,a="name",s=0,r=()=>{},i=!0,l=()=>!0){t.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${e.map(m=>l(m.index)?`
        <article class="summary-future-card" data-summary-future-screen="${m.index}" aria-hidden="${m.index!==s}">
          <header class="summary-future-card-head">
            <div><strong>${n(o(m.labelKey))}</strong><time datetime="${n(m.dateId)}">${n(T(m.dateId))}</time></div>
            ${Et(m)}
          </header>
          <div class="summary-future-meals">
            ${m.columns.map(c=>St(c,a,i)).join("")}
          </div>
          ${q(m)}
        </article>
      `:`
        <article class="summary-future-card" data-summary-future-screen="${m.index}" aria-hidden="${m.index!==s}" aria-busy="true">
          <header class="summary-future-card-head"><div><strong>${n(o(m.labelKey))}</strong><time datetime="${n(m.dateId)}">${n(T(m.dateId))}</time></div></header>
          <p class="empty-state" role="status">${n(o("common.status.loading"))}</p>
        </article>
      `).join("")}
    </div>
  `;let u=t.querySelector("[data-summary-future-track]"),d=0;u?.addEventListener("scroll",()=>{window.clearTimeout(d),d=window.setTimeout(()=>{let m=Math.max(0,Math.min(1,Math.round(u.scrollLeft/Math.max(1,u.clientWidth+14))));u.querySelectorAll("[data-summary-future-screen]").forEach(c=>{c.setAttribute("aria-hidden",String(Number(c.dataset.summaryFutureScreen)!==m))}),r(m)},100)},{passive:!0}),window.requestAnimationFrame(()=>{u&&u.scrollTo({left:Math.max(0,s)*(u.clientWidth+14),behavior:"auto"})})}function Tt(t,{kitchen:e,activeIndex:a,layout:s}){return`
    <section class="summary-matrix-screen${s==="international"?" summary-international-screen summary-screen-ordinary":""}" data-${e?"kitchen":"summary"}-screen="${t.index}" role="tabpanel" aria-hidden="${t.index!==a}" aria-busy="true">
      <p class="empty-state" role="status">${n(o("common.status.loading"))}</p>
    </section>
  `}function St(t,e,a=!0){let s=Array.isArray(t.names)?t.names:[],r=[...Array.isArray(t.specialDiets?.items)?t.specialDiets.items:[]].map(d=>I(d.tag)).filter(Boolean).sort((d,m)=>d.localeCompare(m,k(),{numeric:!0})),i=Number(t.guestCount||0),l=Number(t.sickCount||0),u=Array.isArray(t.sickDiets)?t.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${H(t.mealTypeId)}</span>
        <span class="summary-future-meal-name">${n(z(t,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${n(String(t.total||0))}</strong>
      </div>
      ${lt(t,a)}
      ${i>0?et("summary.guests",i,"guests"):""}
      ${r.length?`<p class="summary-future-diets"><span>${n(o("summary.diets"))}:</span> <strong>${n(r.join(", "))}</strong></p>`:""}
      ${l>0?et("summary.sickMeals",l,"sick"):""}
      ${u.length>0?`<div class="summary-future-special-row"><span>${n(o("summary.sickDiets"))}</span><div>${S(u," summary-future-diet-list")}</div></div>`:""}
      ${s.length?`<div class="summary-future-people">${s.map(d=>Nt(d,e)).join("")}</div>`:""}
    </section>
  `}function et(t,e,a){return a==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${n(String(e))}</strong><span>${n(o(t))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${n(a)}"><span>${n(o(t))}</span><strong>${n(String(e))}</strong></p>`}function Nt(t,e){let a=String(t.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(m=>m[0]).join("").toUpperCase(),s=e==="signature"?t.signature||t.displayName:e==="initials"?t.initials||a||t.signature:t.displayName,r=Array.isArray(t.dietTags)?t.dietTags.map(m=>I(m)).filter(Boolean):[],i=`${n(s||"–")}${r.length?`&nbsp;<small>(${n(r.join(", "))})</small>`:""}`,l=R(t.phone),u=t.phoneConsent&&l?`<a class="summary-matrix-call" href="tel:${n(l)}" aria-label="${n(o("summary.callPerson",{name:t.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",d=t.whatsappEnabled&&t.phoneConsent&&l?`<a class="summary-matrix-whatsapp" href="https://wa.me/${n(l.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${n(o("summary.messagePerson",{name:t.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(u||d){let m=`summary-contact-popup-${++nt}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${m}" aria-haspopup="dialog" aria-label="${n(o("summary.contactPerson",{name:t.displayName}))}">${i}</button><span class="summary-matrix-contact-popover" id="${m}" popover role="dialog"><span class="summary-matrix-contact-actions">${u}${d}</span></span></span>`}return`<span class="summary-future-person" title="${n(t.displayName||s)}">${i}</span>`}function Et(t){let e=t.columns.find(s=>s.dayIndex===t.index),a=e?.dayMassStatus;return!a||a==="UNKNOWN"?"":rt(a,e.blessingTime)}function rt(t,e=""){let a=t==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${a?"yes":"no"}"><span>${n(o("summary.mass"))}:</span><span class="mass-status-stack"><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${n(o(a?"summary.yes":"summary.no"))}</strong>${E(e)}</span></span>`}function Lt(t,e,{kitchen:a=!1,smooth:s=!0}={}){let r=a?"kitchen":"summary",i=Number(e)===1?1:0;if(!a){let d=t?.querySelector("[data-summary-future-track]");if(d)return d.scrollTo({left:i*(d.clientWidth+14),behavior:s?"smooth":"auto"}),d.querySelectorAll("[data-summary-future-screen]").forEach(m=>{m.setAttribute("aria-hidden",String(Number(m.dataset.summaryFutureScreen)!==i))}),!0}let l=t?.querySelector(`[data-${r}-matrix-track]`),u=l?.querySelector(`[data-${r}-screen="${i}"]`);return!l||!u?!1:(l.scrollTo({left:l.scrollLeft+u.getBoundingClientRect().left-l.getBoundingClientRect().left,behavior:s?"smooth":"auto"}),$t(t,r,i),!0)}function Bt(t,{kitchen:e,activeIndex:a,residentLabel:s="name",showContactHint:r=!0,dietLegend:i=[]}){let l=e?"kitchen":"summary",u=t.index===a,d=Ot(t);return t.columns.length===0?`
      <section class="summary-matrix-screen" data-${l}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
        <p class="empty-state">${n(o("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${l}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      <table class="summary-matrix summary-matrix-optional-rows-${d}">
        ${Pt(t,e)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${t.columns.map(m=>m.dayIndex>t.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${n(o("summary.item"))}</span></th>
            ${t.dateGroups.map(m=>`
              <th class="summary-matrix-date-heading${A(m,t)}" scope="colgroup" colspan="${m.span}">
                <span>${n(ft(m.dayIndex))}</span>
                <time datetime="${n(m.dateId)}">${n(x(m.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${t.columns.map(m=>`
              <th class="summary-matrix-meal-heading${A(m,t)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${H(m.mealTypeId)}</span><span class="summary-matrix-meal-label">${n(z(m))}</span>${Gt(m,e)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${t.hasGuestGroup?C(o("summary.guests"),"summary-matrix-row-guests",t,m=>String(m.guestCount)):""}
          ${C(o("summary.diningMeals"),"summary-matrix-row-meals",t,it)}
          ${t.hasSpecialDiets?C(o("summary.includedDiets"),"summary-matrix-row-diets",t,e?ct:dt):""}
          ${t.hasSickMeals?C(o("summary.sickMeals"),"summary-matrix-row-sick",t,mt):""}
          ${t.hasSickDiets?C(o("summary.sickDiets"),"summary-matrix-row-sick-diets",t,ut):""}
          ${t.hasMassInformation?Ut(t):""}
          ${e?"":Wt(t,s,r)}
        </tbody>
      </table>
      ${e?yt(t,i):""}
      ${q(t)}
    </section>
  `}function Ot(t){return[t.hasGuestGroup,t.hasSickMeals,t.hasSickDiets].filter(Boolean).length}function Pt(t,e){return e?`<caption class="sr-only">${n(`${o("kitchen.view.title")}: ${o(t.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${n(t.dateId)}">${n(T(t.dateId))}</time>
    </caption>
  `}function H(t){let e={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return jt({breakfast:"coffee",lunch:"sun",dinner:"moon"}[t],e[t]||"•")}function jt(t,e="•"){let a=document.documentElement.dataset.interfaceStyle;if(!(a==="cool"||a==="urban"||a==="future")||!t)return e;let i={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[t];return i?`<svg class="meal-line-icon meal-line-icon-${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${i}</svg>`:e}function z(t,{breakfastTomorrow:e=!1}={}){let a=String(t?.mealTypeId||"").trim().toLowerCase();if(e&&a==="breakfast")return o("summary.breakfastTomorrow");let s=a?o(`meal.type.${a}`):"",r=String(t?.label||"").trim();return s&&s!==`meal.type.${a}`?s:r}function C(t,e,a,s){return`
    <tr class="${e}">
      <th class="summary-matrix-label" scope="row">${n(t)}</th>
      ${a.columns.map(r=>`<td class="${A(r,a).trim()}">${s(r)}</td>`).join("")}
    </tr>
  `}function it(t,{contactHint:e=!1}={}){let a=t.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${t.total}</span><span class="summary-matrix-unit">${n(o(a))}</span>${e?lt(t):""}`}function ot(t){return Array.isArray(t?.names)&&t.names.some(e=>e?.phoneConsent&&R(e.phone))}function Kt(t){return typeof t?.onLoad!="function"?"":`
    <section class="kitchen-monthly-summary">
      <details data-kitchen-monthly-summary>
        <summary>${n(o("kitchen.monthly.title"))}</summary>
        <div class="kitchen-monthly-summary-content" data-kitchen-monthly-summary-content role="status" aria-live="polite"></div>
      </details>
    </section>
  `}async function st(t,e,a,s=null){let r=t.querySelector("[data-kitchen-monthly-summary-content]");if(!(!r||a.loading)){a.loading=!0,a.message=o("kitchen.monthly.loading"),t.dataset.loading="true",a.latestMonthId===null?r.textContent=o("kitchen.monthly.loading"):K(r,a,{message:o("kitchen.monthly.loading"),loading:!0});try{let i=null;if(a.latestMonthId===null){if(i=await e.onLoad(),i?.monthId){a.latestMonthId=i.monthId,a.earliestMonthId=i.earliestMonthId||i.monthId,a.latestSummary=i,a.summaries=new Map([...a.summaries].filter(([,u])=>u.finalized===!0)),a.summaries.set(i.monthId,i);let l=s||a.selectedMonthId;a.selectedMonthId=l&&l>=a.earliestMonthId&&l<=a.latestMonthId?l:i.monthId,a.selectedMonthId!==i.monthId&&(i=await e.onLoad(a.selectedMonthId),i&&a.summaries.set(a.selectedMonthId,i))}}else{let l=s||a.selectedMonthId||a.latestMonthId;a.selectedMonthId=l,l===a.latestMonthId?i=a.latestSummary:a.summaries.has(l)?i=a.summaries.get(l):(i=await e.onLoad(l),i&&a.summaries.set(l,i))}if(!i){a.message=o(a.latestMonthId===null?"kitchen.monthly.firstAvailable":"kitchen.monthly.notReady");return}a.message=""}catch{a.message=o("kitchen.monthly.unavailable")}finally{a.loading=!1,delete t.dataset.loading;let i=a.details,l=i?.querySelector("[data-kitchen-monthly-summary-content]");i?.isConnected&&i.open&&l&&K(l,a,{summary:a.summaries.get(a.selectedMonthId),message:a.message})}}}function K(t,e,{summary:a=null,message:s="",loading:r=!1}={}){let i=e.selectedMonthId;if(!i){t.textContent=s;return}let l=a?.periodStart||`${i}-01`,u=a?.periodEnd||zt(i),d=r||!e.earliestMonthId||i<=e.earliestMonthId,m=r||!e.latestMonthId||i>=e.latestMonthId,c=s?n(s):`${Rt(a)}<dl>
        ${j("breakfast",a.counts.breakfast)}
        ${j("lunch",a.counts.lunch)}
        ${j("dinner",a.counts.dinner)}
      </dl>
      <div class="kitchen-monthly-guest-total">
        <span>${n(o("kitchen.monthly.guests"))}</span>
        <strong>${n(a.invitedTotal)}</strong>
      </div>${a.missingDates?.length?`
      <p class="kitchen-monthly-missing-days"><strong>${n(o("kitchen.monthly.missingDays"))}</strong> ${a.missingDates.map(y=>n(x(y))).join(", ")}</p>
      <p class="kitchen-monthly-partial-note">${n(o("kitchen.monthly.partial"))}</p>`:""}`;t.innerHTML=`
    <div class="kitchen-monthly-period">
      <button class="kitchen-monthly-nav-button" type="button"
        data-kitchen-month-step="-1"
        aria-label="${n(o("kitchen.monthly.previous"))}"
        ${d?"disabled":""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 6 12l9 8z"></path></svg>
      </button>
      <p><strong>${n(o("kitchen.monthly.period"))}</strong> ${n(x(l))} – ${n(x(u))}</p>
      <button class="kitchen-monthly-nav-button" type="button"
        data-kitchen-month-step="1"
        aria-label="${n(o("kitchen.monthly.next"))}"
        ${m?"disabled":""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 9 8-9 8z"></path></svg>
      </button>
    </div>
    <div class="kitchen-monthly-summary-status" role="status" aria-live="polite">${c}</div>
  `}function Ht(t,e){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(t||"")||!Number.isInteger(e))return null;let[a,s]=t.split("-").map(Number),r=a*12+s-1+e;if(r<0)return null;let i=Math.floor(r/12),l=r%12+1;return`${String(i).padStart(4,"0")}-${String(l).padStart(2,"0")}`}function zt(t){let[e,a]=t.split("-").map(Number),s=new Date(Date.UTC(e,a,0)).getUTCDate();return`${t}-${String(s).padStart(2,"0")}`}function j(t,e){let a=o(`meal.type.${t}`);return`<div><dt>${n(a)}</dt><dd>${n(e)}</dd></div>`}function Rt(t){let e;return t.finalized?e=o("kitchen.monthly.finalized"):t.closedThrough?t.closedThrough===t.periodEnd?e=o("kitchen.monthly.incomplete"):e=o("kitchen.monthly.progress",{date:x(t.closedThrough)}):e=o("kitchen.monthly.noClosedDays"),`<p class="kitchen-monthly-progress">${n(e)}</p>`}function lt(t,e=!0){return!e||!ot(t)?"":`<small class="summary-contact-hint">${n(o("summary.contactHint"))}</small>`}function mt(t){if(t.sickCount===0)return v(o("summary.sickMeals"));let e=t.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${t.sickCount}</span><span class="summary-matrix-unit">${n(o(e))}</span>`}function ut(t){return t.sickDiets.length===0?v(o("summary.noDiet")):S(t.sickDiets)}function qt(t){if(t.massStatus==="UNKNOWN")return v(o("summary.notSet"));let e=t.massStatus==="YES";return`<span class="summary-matrix-mass-${e?"yes":"no"}">${n(o(e?"summary.yes":"summary.no"))}</span>`}function Wt(t,e="name",a=!0){return`
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
        ${a&&t.columns.some(ot)?`<small class="summary-contact-hint">${n(o("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${n(o("summary.names"))}</span>
      </th>
      ${t.columns.map(r=>`<td class="${A(r,t).trim()}">${pt(r,{compactActions:!0,residentLabel:e})}</td>`).join("")}
    </tr>
  `}function Ft(t){return t==="YES"?" summary-mass-state-yes":t==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function Ut(t){let e=Jt(t).map(a=>`<td class="summary-matrix-mass-band${A(a,t)}${Ft(a.massStatus)}" colspan="${a.span}">${Xt(a)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${n(o("summary.mass"))}</th>
      ${e}
    </tr>
  `}function Gt(t,e){if(e||t.mealTypeId!=="breakfast")return"";let a=t.breakfastPlanned===!0,s=o(a?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${a?"yes":"no"}"><span aria-hidden="true">${a?"✓":"×"}</span>${n(s)}</span>`}function dt(t){if(t.specialDiets.participantCount===0)return v(o("summary.noDiet"));let e=[...t.specialDiets.items].sort((a,s)=>I(a.tag).localeCompare(I(s.tag),k(),{numeric:!0}));return S(e)}function ct(t){return t.specialDiets.participantCount===0?v(o("summary.noDiet")):S(t.specialDiets.items," summary-matrix-kitchen-diets")}function S(t,e=""){let a=[...t].sort((s,r)=>I(s.tag).localeCompare(I(r.tag),k(),{numeric:!0}));return`<ul class="summary-matrix-diets${e}">${a.map(s=>{let r=I(s.tag),i=Math.max(0,Math.floor(Number(s.count)||0)),l=i>1?`<span class="diet-code-count">× ${i}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${B(s.tag)}">${n(r)}</span>${l}</li>`}).join("")}</ul>`}function I(t){return F(L(t),o)}function pt(t,{compactActions:e=!1,residentLabel:a="name"}={}){return t.names.length===0?v(o("summary.noName")):`<ul class="summary-matrix-names">${t.names.map(s=>{let r=s.dietTags.map(b=>I(b)),i=R(s.phone),l=String(s.displayName||"").trim(),u=l.split(/\s+/).filter(Boolean).slice(0,3).map(b=>b[0]).join("").toUpperCase(),d=a==="signature"?s.signature||l:a==="initials"&&(s.initials||u||s.signature)||l,m=n(d),c=r.length?` <small>(${n(r.join(", "))})</small>`:"",y=`<span class="summary-matrix-person-name">${m}${c}</span>`,f=s.phoneConsent&&i?`<a class="summary-matrix-call" href="tel:${n(i)}" aria-label="${n(o("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",$=s.whatsappEnabled&&s.phoneConsent&&i?`<a class="summary-matrix-whatsapp" href="https://wa.me/${n(i.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${n(o("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(e&&(f||$)){let b=`summary-contact-popup-${++nt}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${b}" aria-haspopup="dialog" aria-label="${n(o("summary.contactPerson",{name:s.displayName}))}" title="${n(o("summary.contactPerson",{name:s.displayName}))}">${y}</button>
            <span class="summary-matrix-contact-popover" id="${b}" popover role="dialog" aria-label="${n(o("summary.contactPerson",{name:s.displayName}))}">
              <span class="summary-matrix-contact-actions">${f}${$}</span>
            </span>
          </li>`}return`<li>${y}<span class="summary-matrix-contact-actions">${f}${$}</span></li>`}).join("")}</ul>`}function R(t){let e=String(t||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(e)?e:""}function Yt(t,{kitchen:e,activeIndex:a,residentLabel:s="name",showContactHint:r=!0,dietLegend:i=[]}){let l=e?"kitchen":"summary",u=t.index===a;return`
    <section class="summary-matrix-screen summary-international-screen${_t(t)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${l}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      ${e?`<h2 class="sr-only">${n(`${o("kitchen.view.title")}: ${o(t.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${n(t.dateId)}">${n(T(t.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${t.columns.map((m,c,y)=>Vt(m,{kitchen:e,residentLabel:s,showContactHint:r,showMassMetadata:c===0||y[c-1]?.dateId!==m.dateId})).join("")}
      </div>
      ${e?yt(t,i):""}
      ${q(t)}
    </section>
  `}function _t(t){return t.columns.some(e=>e.guestCount>0||e.specialDiets.participantCount>0||e.sickCount>0||e.sickDiets.length>0)||t.notesByDate.length>0}function Vt(t,{kitchen:e,residentLabel:a="name",showContactHint:s=!0,showMassMetadata:r=!1}){let i=e?ct(t):dt(t),l=r&&t.dayMassStatus!=="UNKNOWN"?rt(t.dayMassStatus,t.blessingTime):"",u=t.guestCount>0?`<span class="summary-international-mobile-guests">${n(o("summary.guests"))}: <strong>${t.guestCount}</strong></span>`:"",d=l||u?`<div class="summary-international-card-actions">${l}${u}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${ht(t.dayIndex)}${t.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${H(t.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${n(z(t,{breakfastTomorrow:!0}))}</strong><time datetime="${n(t.dateId)}">${n(x(t.dateId))}</time></div>
        ${d}
      </header>
      <dl>
        ${t.guestCount>0?`<div class="summary-international-guest-row"><dt>${n(o("summary.guests"))}</dt><dd>${t.guestCount}</dd></div>`:""}
        <div><dt>${n(o("summary.diningMeals"))}</dt><dd>${it(t,{contactHint:!e&&s})}</dd></div>
        ${t.specialDiets.participantCount>0?`<div><dt>${n(o("summary.includedDiets"))}</dt><dd>${i}</dd></div>`:""}
        ${t.sickCount>0?`<div><dt>${n(o("summary.sickMeals"))}</dt><dd>${mt(t)}</dd></div>`:""}
        ${t.sickDiets.length>0?`<div><dt>${n(o("summary.sickDiets"))}</dt><dd>${ut(t)}</dd></div>`:""}
      </dl>
      ${e?"":`<section class="summary-international-names"><h3>${n(o("summary.names"))}</h3>${pt(t,{compactActions:!0,residentLabel:a})}</section>`}
    </article>
  `}function Jt(t){return t.dateGroups.map(e=>{let a=t.columns.find(s=>s.dateId===e.dateId);return{...e,massStatus:a?.dayMassStatus||"UNKNOWN",blessingTime:a?.blessingTime||""}})}function q(t){return t.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${n(o("kitchen.notes.title"))}">
      <h3>${n(o("kitchen.notes.title"))}</h3>
      ${t.notesByDate.map(e=>`
        <div class="kitchen-notes-group">
          <time datetime="${n(e.dateId)}">${n(x(e.dateId))}</time>
          <ul>${e.notes.map(a=>`<li><p>${n(a.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function yt(t,e){let a=new Set;t.columns.forEach(r=>{[...r.specialDiets?.items||[],...r.sickDiets||[]].forEach(i=>{let l=L(i?.tag);/^\d{1,3}$/.test(l)&&a.add(l)})});let s=U(e).filter(r=>a.has(r.code));return s.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${n(o("kitchen.dietLegend.title"))}">
      <h3>${n(o("kitchen.dietLegend.title"))}</h3>
      <ul>${s.map(r=>`<li><strong class="diet-code-badge diet-code-tone-${B(r.code)}">${n(I(r.code))}</strong><span aria-hidden="true">=</span><span>${n(r.label)}</span></li>`).join("")}</ul>
    </section>
  `}function v(t){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${n(t)}</span>`}function Qt(t,e){return t.dayIndex>e.index?" summary-matrix-next-date":""}function Xt(t){let e=/^([01]\d|2[0-3]):[0-5]\d$/.test(t.blessingTime||""),a=e&&Number(t.span)<2,s=e?a?" summary-mass-control-blessing-narrow":" summary-mass-control-blessing-wide":"",r=e?` mass-status-with-blessing${a?" mass-status-narrow":" mass-status-wide-blessing"}`:"",i=e?E(t.blessingTime,a?{narrow:!0}:{compact:!0}):"";return`
    <span class="summary-mass-control${s}">
      <span class="summary-mass-control-day">${n(ft(t.dayIndex))}</span>
      <span class="summary-mass-control-state mass-status-stack${r}">${qt(t)}${i}</span>
    </span>`}function A(t,e){return`${Qt(t,e)} summary-day-tone-${ht(t.dayIndex)}`}function ht(t){return Math.max(0,Math.min(2,Number(t)||0))}function ft(t){return[o("summary.today"),o("summary.tomorrow"),o("summary.dayAfterTomorrow")][t]||o("summary.followingDay")}function x(t){let[e,a,s]=String(t).split("-").map(Number);return new Intl.DateTimeFormat(k(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(e,a-1,s))}function T(t){let[e,a,s]=String(t).split("-").map(Number);return!e||!a||!s?"":new Intl.DateTimeFormat(k(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(e,a-1,s))}function Zt(t,e){let a=[...t.querySelectorAll(`[data-${e}-screen]`)];if(a.length===0)return 0;let s=a.reduce((r,i)=>Math.abs(i.getBoundingClientRect().left-t.getBoundingClientRect().left)<Math.abs(r.getBoundingClientRect().left-t.getBoundingClientRect().left)?i:r);return Number(s.dataset[`${e}Screen`])===1?1:0}function $t(t,e,a){t.querySelectorAll(`[data-${e}-screen]`).forEach(s=>{s.setAttribute("aria-hidden",String(Number(s.dataset[`${e}Screen`])!==a))})}export{oa as mountSummaryMatrix,Lt as scrollSummaryMatrix};

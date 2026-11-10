import{a as L}from"./chunk-5BA36XBM.js";import{a as r}from"./chunk-JUUUUMHC.js";import{c as Y}from"./chunk-7ZENLLVJ.js";import{e as k,f as o}from"./chunk-TG27BU64.js";import{a as B,c as G,d as O}from"./chunk-DZJEM4PC.js";import"./chunk-O2XFH626.js";var P="breakfast",J="STANDARD";function Q(t,a=[],e=[]){return Z(t,a,e,!0)}function X(t,a=[]){return Z(t,[],a,!1)}function Z(t,a,e,s){let n=Array.isArray(t)?t:[],i=Array.isArray(e)?e:[],l=new Map(i.map(f=>[f.dateId,f])),u=It(a),d=Mt(n),m=d.findIndex(f=>f.mealTypeId===P),p=m>=0?d.slice(m+1):d,y=m>=0?d.slice(0,m+1):[];return[0,1].map(f=>{let $=[...p.map(g=>_(n,f,g,l,u,s)),...y.map(g=>_(n,f+1,g,l,u,s))].filter(Boolean),b=At($);return{index:f,dateId:n[f]?.dateId||$[0]?.dateId||"",labelKey:f===0?"summary.today":"summary.tomorrow",label:f===0?"Oggi":"Domani",columns:$,dateGroups:b,hasGuestGroup:$.some(g=>g.guestCount>0),hasSpecialDiets:$.some(g=>g.specialDiets.participantCount>0),hasSickMeals:$.some(g=>g.sickCount>0),hasSickDiets:$.some(g=>g.sickDiets.length>0),hasMassInformation:b.length>0,notesByDate:b.map(g=>({dateId:g.dateId,notes:Ct(l.get(g.dateId))})).filter(g=>g.notes.length>0)}})}function Mt(t){let a=t.find(e=>Array.isArray(e.meals)&&e.meals.length>0);return a?a.meals.map(e=>({mealTypeId:e.mealTypeId,label:e.label})):[]}function It(t){let a=new Map,e=s=>{s?.participantId&&a.set(s.participantId,{...a.get(s.participantId),...s})};return(Array.isArray(t)?t:[]).forEach(e),a}function _(t,a,e,s,n,i){let l=t[a];if(!l)return null;let u=l.meals?.find(c=>c.mealTypeId===e.mealTypeId)||{mealTypeId:e.mealTypeId,label:e.label,present:[]},d=s.get(l.dateId)||{},m=Array.isArray(u.present)?u.present:Array.isArray(u.dietParticipants)?u.dietParticipants:[],p=tt(m,at(d),u.mealTypeId),y=et(d),f=new Set(y.map(c=>c.participantId)),$=p.filter(c=>!f.has(c.participantId)),b=kt(d,u.mealTypeId,n,[...Array.isArray(u.participantDiets)?u.participantDiets:[],...Array.isArray(u.absent)?u.absent:[],...p]),g=Math.max(0,Math.floor(Number(u.count)||0)),w=Array.isArray(u.present)?$.length:Math.max(0,g-b.count),x=Dt(d,u.mealTypeId);return{dayIndex:a,dateId:l.dateId,mealTypeId:u.mealTypeId,label:u.label,total:w+x,guestCount:x,specialDiets:xt($),sickCount:b.count,sickDiets:b.diets,massStatus:vt(d.dailyOperation,u.mealTypeId),dayMassStatus:wt(d.dailyOperation),blessingTime:(d.dailyOperation?.dailyOperation||d.dailyOperation)?.blessingTime||"",breakfastPlanned:u.mealTypeId===P&&w+x+b.count>0,names:i?$.map(c=>({participantId:c.participantId,displayName:c.displayName,signature:c.signature||"",initials:c.initials||"",dietTags:j(c),phone:c.phone||"",phoneConsent:c.phoneConsent===!0,whatsappEnabled:c.whatsappEnabled===!0})):[]}}function tt(t,a,e){let s=new Map;return(Array.isArray(a)?a:[]).forEach(n=>{let i=Array.isArray(n.mealTypeIds)?n.mealTypeIds:[];if(n.status==="REMOVED"||i.length>0&&!i.includes(e))return;let l=String(n.dietLabel||n.dietTag||"").trim();if(!n.participantId||!l)return;let u=s.get(n.participantId)||[];u.push(l),s.set(n.participantId,u)}),t.map(n=>{let i=s.get(n.participantId);return i?{...n,dietTags:[...new Set(i)]}:n})}function xt(t){let a=new Map,e=0;return t.forEach(s=>{let n=j(s);n.length!==0&&(e+=1,n.forEach(i=>a.set(i,(a.get(i)||0)+1)))}),{participantCount:e,items:[...a.entries()].map(([s,n])=>({tag:s,count:n}))}}function j(t){let a=Array.isArray(t.dietTags)?t.dietTags:[];return[...new Set(a.map(e=>String(e||"").trim()).filter(e=>e&&e.toUpperCase()!==J))]}function kt(t,a,e,s){let n=t?.dailyHealth||t,l=(Array.isArray(n?.sickMeals)?n.sickMeals:[]).find(y=>y.mealTypeId===a);if(l){let y=Array.isArray(l.dietLabels)?l.dietLabels:[];return{count:Math.max(0,Math.floor(Number(l.count)||0)),diets:V(y)}}let u=at(t),d=new Map((Array.isArray(s)?s:[]).map(y=>[y.participantId,y])),m=et(t),p=[];return m.forEach(y=>{let f=d.get(y.participantId)||e.get(y.participantId)||y,[$]=tt([f],u,a);j($).forEach(b=>p.push(b))}),{count:m.length,diets:V(p)}}function V(t){let a=new Map;return(Array.isArray(t)?t:[]).forEach(e=>{let s=String(e||"").trim();!s||s.toUpperCase()===J||a.set(s,(a.get(s)||0)+1)}),[...a.entries()].map(([e,s])=>({tag:e,count:s}))}function vt(t,a){let e=t?.dailyOperation||t,s=e?.massByMeal?.[a];return s==="YES"||s==="NO"?s:e&&typeof e.massScheduled=="boolean"?e.massScheduled?"YES":"NO":"UNKNOWN"}function wt(t){let a=t?.dailyOperation||t,e=Object.entries(a?.massByMeal||{}).filter(([s])=>s!==P).map(([,s])=>s);return e.includes("YES")?"YES":e.includes("NO")?"NO":a&&typeof a.massScheduled=="boolean"?a.massScheduled?"YES":"NO":"UNKNOWN"}function et(t){let a=t?.dailyHealth||t;return Array.isArray(a?.sickPeople)?a.sickPeople:[]}function at(t){let a=t?.dailyHealth||t;return Array.isArray(t?.occasionalDiets)?t.occasionalDiets:Array.isArray(a?.dietAssignments)?a.dietAssignments:[]}function Dt(t,a){let s=(t?.dailyHealth||t)?.invitedMeals||t?.invitedMeals||t?.dailyOperation?.invitedMeals||{};return Math.min(999,Math.max(0,Math.floor(Number(s[a])||0)))}function Ct(t){return(Array.isArray(t?.notes)?t.notes:t?.note?[t.note]:[]).filter(e=>e&&e.status!=="REMOVED"&&e.text)}function At(t){return t.reduce((a,e)=>{let s=a[a.length-1];return s&&s.dateId===e.dateId?(s.span+=1,a):(a.push({dayIndex:e.dayIndex,dateId:e.dateId,span:1}),a)},[])}var rt=0,K=new WeakMap;function le(t,{days:a=[],operationDays:e=[],screenReady:s=()=>!0,kitchen:n=!1,layout:i="classic",residentLabel:l="name",dietLegend:u=[],showContactHint:d=!0,activeIndex:m=0,monthSummary:p=null,onActiveIndexChange:y=()=>{}}={}){let f=n?X(a,e):Q(a,[],e);if(i==="future"&&!n){Tt(t,f,l,m,y,d,s);return}if(f.every(c=>c.columns.length===0)&&!(n&&p?.onLoad)){t.innerHTML=`<p class="empty-state">${r(o("summary.noMeal"))}</p>`;return}let $=n?"kitchen":"summary",b=i==="international"?_t:Ot,g=n?K.get(t):null;if(g?.details?.isConnected&&(g.open=g.details.open),t.innerHTML=`
    <div class="summary-matrix-track summary-layout-${i}${n?" summary-layout-kitchen":" summary-layout-diners"}" data-${$}-matrix-track aria-label="${r(o("summary.screensLabel"))}">
      ${f.map(c=>s(c.index)?b(c,{kitchen:n,activeIndex:m,residentLabel:l,showContactHint:d,dietLegend:u}):St(c,{kitchen:n,activeIndex:m,layout:i})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${r(o("summary.swipeHint"))}</p>
    ${n?Ht(p):""}
  `,n&&p?.onLoad){let c=t.querySelector("[data-kitchen-monthly-summary]"),N=c?.querySelector("[data-kitchen-monthly-summary-content]");if(c&&N){let U=p.centerId||"",h=K.get(t);(!h||h.centerId!==U)&&(h={centerId:U,open:!1,latestMonthId:null,earliestMonthId:null,selectedMonthId:null,latestSummary:null,summaries:new Map,loading:!1,details:null},K.set(t,h)),h.details=c,c.open=h.open,N.addEventListener("click",bt=>{let E=bt.target?.closest?.("[data-kitchen-month-step]");if(!E||E.disabled||!c.open||h.loading)return;let D=zt(h.selectedMonthId,Number(E.dataset.kitchenMonthStep));!D||D<h.earliestMonthId||D>h.latestMonthId||(h.selectedMonthId=D,nt(c,p,h,D))}),c.addEventListener("toggle",()=>{h.details!==c||h.open===c.open||(h.open=c.open,c.open&&!h.loading&&(h.latestMonthId=null,nt(c,p,h)))}),h.open&&z(N,h,{summary:h.summaries.get(h.selectedMonthId),message:h.message||"",loading:h.loading})}}let w=t.querySelector(`[data-${$}-matrix-track]`),x=0;w.addEventListener("scroll",()=>{window.clearTimeout(x),x=window.setTimeout(()=>{let c=te(w,$);gt(t,$,c),y(c)},100)},{passive:!0}),window.requestAnimationFrame(()=>{Bt(t,m,{kitchen:n,smooth:!1})})}function Tt(t,a,e="name",s=0,n=()=>{},i=!0,l=()=>!0){t.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${a.map(m=>l(m.index)?`
        <article class="summary-future-card" data-summary-future-screen="${m.index}" aria-hidden="${m.index!==s}">
          <header class="summary-future-card-head">
            <div><strong>${r(o(m.labelKey))}</strong><time datetime="${r(m.dateId)}">${r(T(m.dateId))}</time></div>
            ${Lt(m)}
          </header>
          <div class="summary-future-meals">
            ${m.columns.map(p=>Nt(p,e,i)).join("")}
          </div>
          ${F(m)}
        </article>
      `:`
        <article class="summary-future-card" data-summary-future-screen="${m.index}" aria-hidden="${m.index!==s}" aria-busy="true">
          <header class="summary-future-card-head"><div><strong>${r(o(m.labelKey))}</strong><time datetime="${r(m.dateId)}">${r(T(m.dateId))}</time></div></header>
          <p class="empty-state" role="status">${r(o("common.status.loading"))}</p>
        </article>
      `).join("")}
    </div>
  `;let u=t.querySelector("[data-summary-future-track]"),d=0;u?.addEventListener("scroll",()=>{window.clearTimeout(d),d=window.setTimeout(()=>{let m=Math.max(0,Math.min(1,Math.round(u.scrollLeft/Math.max(1,u.clientWidth+14))));u.querySelectorAll("[data-summary-future-screen]").forEach(p=>{p.setAttribute("aria-hidden",String(Number(p.dataset.summaryFutureScreen)!==m))}),n(m)},100)},{passive:!0}),window.requestAnimationFrame(()=>{u&&u.scrollTo({left:Math.max(0,s)*(u.clientWidth+14),behavior:"auto"})})}function St(t,{kitchen:a,activeIndex:e,layout:s}){return`
    <section class="summary-matrix-screen${s==="international"?" summary-international-screen summary-screen-ordinary":""}" data-${a?"kitchen":"summary"}-screen="${t.index}" role="tabpanel" aria-hidden="${t.index!==e}" aria-busy="true">
      <p class="empty-state" role="status">${r(o("common.status.loading"))}</p>
    </section>
  `}function Nt(t,a,e=!0){let s=Array.isArray(t.names)?t.names:[],n=[...Array.isArray(t.specialDiets?.items)?t.specialDiets.items:[]].map(d=>M(d.tag)).filter(Boolean).sort((d,m)=>d.localeCompare(m,k(),{numeric:!0})),i=Number(t.guestCount||0),l=Number(t.sickCount||0),u=Array.isArray(t.sickDiets)?t.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${R(t.mealTypeId)}</span>
        <span class="summary-future-meal-name">${r(q(t,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${r(String(t.total||0))}</strong>
      </div>
      ${mt(t,e)}
      ${i>0?st("summary.guests",i,"guests"):""}
      ${n.length?`<p class="summary-future-diets"><span>${r(o("summary.diets"))}:</span> <strong>${r(n.join(", "))}</strong></p>`:""}
      ${l>0?st("summary.sickMeals",l,"sick"):""}
      ${u.length>0?`<div class="summary-future-special-row"><span>${r(o("summary.sickDiets"))}</span><div>${S(u," summary-future-diet-list")}</div></div>`:""}
      ${s.length?`<div class="summary-future-people">${s.map(d=>Et(d,a)).join("")}</div>`:""}
    </section>
  `}function st(t,a,e){return e==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${r(String(a))}</strong><span>${r(o(t))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${r(e)}"><span>${r(o(t))}</span><strong>${r(String(a))}</strong></p>`}function Et(t,a){let e=String(t.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(m=>m[0]).join("").toUpperCase(),s=a==="signature"?t.signature||t.displayName:a==="initials"?t.initials||e||t.signature:t.displayName,n=Array.isArray(t.dietTags)?t.dietTags.map(m=>M(m)).filter(Boolean):[],i=`${r(s||"–")}${n.length?`&nbsp;<small>(${r(n.join(", "))})</small>`:""}`,l=W(t.phone),u=t.phoneConsent&&l?`<a class="summary-matrix-call" href="tel:${r(l)}" aria-label="${r(o("summary.callPerson",{name:t.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",d=t.whatsappEnabled&&t.phoneConsent&&l?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(l.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(o("summary.messagePerson",{name:t.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(u||d){let m=`summary-contact-popup-${++rt}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${m}" aria-haspopup="dialog" aria-label="${r(o("summary.contactPerson",{name:t.displayName}))}">${i}</button><span class="summary-matrix-contact-popover" id="${m}" popover role="dialog"><span class="summary-matrix-contact-actions">${u}${d}</span></span></span>`}return`<span class="summary-future-person" title="${r(t.displayName||s)}">${i}</span>`}function Lt(t){let a=t.columns.find(s=>s.dayIndex===t.index),e=a?.dayMassStatus;return!e||e==="UNKNOWN"?"":it(e,a.blessingTime)}function it(t,a=""){let e=t==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${e?"yes":"no"}"><span>${r(o("summary.mass"))}:</span><span class="mass-status-stack"><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${r(o(e?"summary.yes":"summary.no"))}</strong>${L(a)}</span></span>`}function Bt(t,a,{kitchen:e=!1,smooth:s=!0}={}){let n=e?"kitchen":"summary",i=Number(a)===1?1:0;if(!e){let d=t?.querySelector("[data-summary-future-track]");if(d)return d.scrollTo({left:i*(d.clientWidth+14),behavior:s?"smooth":"auto"}),d.querySelectorAll("[data-summary-future-screen]").forEach(m=>{m.setAttribute("aria-hidden",String(Number(m.dataset.summaryFutureScreen)!==i))}),!0}let l=t?.querySelector(`[data-${n}-matrix-track]`),u=l?.querySelector(`[data-${n}-screen="${i}"]`);return!l||!u?!1:(l.scrollTo({left:l.scrollLeft+u.getBoundingClientRect().left-l.getBoundingClientRect().left,behavior:s?"smooth":"auto"}),gt(t,n,i),!0)}function Ot(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:n=!0,dietLegend:i=[]}){let l=a?"kitchen":"summary",u=t.index===e,d=Pt(t);return t.columns.length===0?`
      <section class="summary-matrix-screen" data-${l}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
        <p class="empty-state">${r(o("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${l}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      <table class="summary-matrix summary-matrix-optional-rows-${d}">
        ${jt(t,a)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${t.columns.map(m=>m.dayIndex>t.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${r(o("summary.item"))}</span></th>
            ${t.dateGroups.map(m=>`
              <th class="summary-matrix-date-heading${A(m,t)}" scope="colgroup" colspan="${m.span}">
                <span>${r($t(m.dayIndex))}</span>
                <time datetime="${r(m.dateId)}">${r(I(m.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${t.columns.map(m=>`
              <th class="summary-matrix-meal-heading${A(m,t)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${R(m.mealTypeId)}</span><span class="summary-matrix-meal-label">${r(q(m))}</span>${Yt(m,a)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${t.hasGuestGroup?C(o("summary.guests"),"summary-matrix-row-guests",t,m=>String(m.guestCount)):""}
          ${C(o("summary.diningMeals"),"summary-matrix-row-meals",t,ot)}
          ${t.hasSpecialDiets?C(o("summary.includedDiets"),"summary-matrix-row-diets",t,a?pt:ct):""}
          ${t.hasSickMeals?C(o("summary.sickMeals"),"summary-matrix-row-sick",t,ut):""}
          ${t.hasSickDiets?C(o("summary.sickDiets"),"summary-matrix-row-sick-diets",t,dt):""}
          ${t.hasMassInformation?Gt(t):""}
          ${a?"":Ft(t,s,n)}
        </tbody>
      </table>
      ${a?ht(t,i):""}
      ${F(t)}
    </section>
  `}function Pt(t){return[t.hasGuestGroup,t.hasSickMeals,t.hasSickDiets].filter(Boolean).length}function jt(t,a){return a?`<caption class="sr-only">${r(`${o("kitchen.view.title")}: ${o(t.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${r(t.dateId)}">${r(T(t.dateId))}</time>
    </caption>
  `}function R(t){let a={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return Kt({breakfast:"coffee",lunch:"sun",dinner:"moon"}[t],a[t]||"•")}function Kt(t,a="•"){let e=document.documentElement.dataset.interfaceStyle;if(!(e==="cool"||e==="urban"||e==="future")||!t)return a;let i={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[t];return i?`<svg class="meal-line-icon meal-line-icon-${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${i}</svg>`:a}function q(t,{breakfastTomorrow:a=!1}={}){let e=String(t?.mealTypeId||"").trim().toLowerCase();if(a&&e==="breakfast")return o("summary.breakfastTomorrow");let s=e?o(`meal.type.${e}`):"",n=String(t?.label||"").trim();return s&&s!==`meal.type.${e}`?s:n}function C(t,a,e,s){return`
    <tr class="${a}">
      <th class="summary-matrix-label" scope="row">${r(t)}</th>
      ${e.columns.map(n=>`<td class="${A(n,e).trim()}">${s(n)}</td>`).join("")}
    </tr>
  `}function ot(t,{contactHint:a=!1}={}){let e=t.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${t.total}</span><span class="summary-matrix-unit">${r(o(e))}</span>${a?mt(t):""}`}function lt(t){return Array.isArray(t?.names)&&t.names.some(a=>a?.phoneConsent&&W(a.phone))}function Ht(t){return typeof t?.onLoad!="function"?"":`
    <section class="kitchen-monthly-summary">
      <details data-kitchen-monthly-summary>
        <summary>${r(o("kitchen.monthly.title"))}</summary>
        <div class="kitchen-monthly-summary-content" data-kitchen-monthly-summary-content role="status" aria-live="polite"></div>
      </details>
    </section>
  `}async function nt(t,a,e,s=null){let n=t.querySelector("[data-kitchen-monthly-summary-content]");if(!(!n||e.loading)){e.loading=!0,e.message=o("kitchen.monthly.loading"),t.dataset.loading="true",e.latestMonthId===null?n.textContent=o("kitchen.monthly.loading"):z(n,e,{message:o("kitchen.monthly.loading"),loading:!0});try{let i=null;if(e.latestMonthId===null){if(i=await a.onLoad(),i?.monthId){e.latestMonthId=i.monthId,e.earliestMonthId=i.earliestMonthId||i.monthId,e.latestSummary=i,e.summaries=new Map([...e.summaries].filter(([,u])=>u.finalized===!0)),e.summaries.set(i.monthId,i);let l=s||e.selectedMonthId;e.selectedMonthId=l&&l>=e.earliestMonthId&&l<=e.latestMonthId?l:i.monthId,e.selectedMonthId!==i.monthId&&(i=await a.onLoad(e.selectedMonthId),i&&e.summaries.set(e.selectedMonthId,i))}}else{let l=s||e.selectedMonthId||e.latestMonthId;e.selectedMonthId=l,l===e.latestMonthId?i=e.latestSummary:e.summaries.has(l)?i=e.summaries.get(l):(i=await a.onLoad(l),i&&e.summaries.set(l,i))}if(!i){e.message=o(e.latestMonthId===null?"kitchen.monthly.firstAvailable":"kitchen.monthly.notReady");return}e.message=""}catch{e.message=o("kitchen.monthly.unavailable")}finally{e.loading=!1,delete t.dataset.loading;let i=e.details,l=i?.querySelector("[data-kitchen-monthly-summary-content]");i?.isConnected&&i.open&&l&&z(l,e,{summary:e.summaries.get(e.selectedMonthId),message:e.message})}}}function z(t,a,{summary:e=null,message:s="",loading:n=!1}={}){let i=a.selectedMonthId;if(!i){t.textContent=s;return}let l=e?.periodStart||`${i}-01`,u=e?.periodEnd||Rt(i),d=n||!a.earliestMonthId||i<=a.earliestMonthId,m=n||!a.latestMonthId||i>=a.latestMonthId,p=s?r(s):`${qt(e)}<dl>
        ${H("breakfast",e.counts.breakfast,e.invitedCounts?.breakfast)}
        ${H("lunch",e.counts.lunch,e.invitedCounts?.lunch)}
        ${H("dinner",e.counts.dinner,e.invitedCounts?.dinner)}
      </dl>
      <div class="kitchen-monthly-guest-total">
        <span>${r(o("kitchen.monthly.guestsTotal"))}</span>
        <strong>${r(e.invitedTotal)}</strong>
      </div>${e.missingDates?.length?`
      <p class="kitchen-monthly-missing-days"><strong>${r(o("kitchen.monthly.missingDays"))}</strong> ${e.missingDates.map(y=>r(I(y))).join(", ")}</p>
      <p class="kitchen-monthly-partial-note">${r(o("kitchen.monthly.partial"))}</p>`:""}`;t.innerHTML=`
    <div class="kitchen-monthly-period">
      <button class="kitchen-monthly-nav-button" type="button"
        data-kitchen-month-step="-1"
        aria-label="${r(o("kitchen.monthly.previous"))}"
        ${d?"disabled":""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 6 12l9 8z"></path></svg>
      </button>
      <p><strong>${r(o("kitchen.monthly.period"))}</strong> ${r(I(l))} – ${r(I(u))}</p>
      <button class="kitchen-monthly-nav-button" type="button"
        data-kitchen-month-step="1"
        aria-label="${r(o("kitchen.monthly.next"))}"
        ${m?"disabled":""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 9 8-9 8z"></path></svg>
      </button>
    </div>
    <div class="kitchen-monthly-summary-status" role="status" aria-live="polite">${p}</div>
  `}function zt(t,a){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(t||"")||!Number.isInteger(a))return null;let[e,s]=t.split("-").map(Number),n=e*12+s-1+a;if(n<0)return null;let i=Math.floor(n/12),l=n%12+1;return`${String(i).padStart(4,"0")}-${String(l).padStart(2,"0")}`}function Rt(t){let[a,e]=t.split("-").map(Number),s=new Date(Date.UTC(a,e,0)).getUTCDate();return`${t}-${String(s).padStart(2,"0")}`}function H(t,a,e){let s=o(`meal.type.${t}`),n=Number.isInteger(e)?`<small class="kitchen-monthly-meal-guests">${r(o("kitchen.monthly.guests"))}: <strong>${r(e)}</strong></small>`:"";return`<div><dt>${r(s)}</dt><dd><span class="kitchen-monthly-meal-count">${r(a)}</span>${n}</dd></div>`}function qt(t){let a;return t.finalized?a=o("kitchen.monthly.finalized"):t.closedThrough?t.closedThrough===t.periodEnd?a=o("kitchen.monthly.incomplete"):a=o("kitchen.monthly.progress",{date:I(t.closedThrough)}):a=o("kitchen.monthly.noClosedDays"),`<p class="kitchen-monthly-progress">${r(a)}</p>`}function mt(t,a=!0){return!a||!lt(t)?"":`<small class="summary-contact-hint">${r(o("summary.contactHint"))}</small>`}function ut(t){if(t.sickCount===0)return v(o("summary.sickMeals"));let a=t.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${t.sickCount}</span><span class="summary-matrix-unit">${r(o(a))}</span>`}function dt(t){return t.sickDiets.length===0?v(o("summary.noDiet")):S(t.sickDiets)}function Wt(t){if(t.massStatus==="UNKNOWN")return v(o("summary.notSet"));let a=t.massStatus==="YES";return`<span class="summary-matrix-mass-${a?"yes":"no"}">${r(o(a?"summary.yes":"summary.no"))}</span>`}function Ft(t,a="name",e=!0){return`
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
        ${e&&t.columns.some(lt)?`<small class="summary-contact-hint">${r(o("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${r(o("summary.names"))}</span>
      </th>
      ${t.columns.map(n=>`<td class="${A(n,t).trim()}">${yt(n,{compactActions:!0,residentLabel:a})}</td>`).join("")}
    </tr>
  `}function Ut(t){return t==="YES"?" summary-mass-state-yes":t==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function Gt(t){let a=Qt(t).map(e=>`<td class="summary-matrix-mass-band${A(e,t)}${Ut(e.massStatus)}" colspan="${e.span}">${Zt(e)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${r(o("summary.mass"))}</th>
      ${a}
    </tr>
  `}function Yt(t,a){if(a||t.mealTypeId!=="breakfast")return"";let e=t.breakfastPlanned===!0,s=o(e?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${e?"yes":"no"}"><span aria-hidden="true">${e?"✓":"×"}</span>${r(s)}</span>`}function ct(t){if(t.specialDiets.participantCount===0)return v(o("summary.noDiet"));let a=[...t.specialDiets.items].sort((e,s)=>M(e.tag).localeCompare(M(s.tag),k(),{numeric:!0}));return S(a)}function pt(t){return t.specialDiets.participantCount===0?v(o("summary.noDiet")):S(t.specialDiets.items," summary-matrix-kitchen-diets")}function S(t,a=""){let e=[...t].sort((s,n)=>M(s.tag).localeCompare(M(n.tag),k(),{numeric:!0}));return`<ul class="summary-matrix-diets${a}">${e.map(s=>{let n=M(s.tag),i=Math.max(0,Math.floor(Number(s.count)||0)),l=i>1?`<span class="diet-code-count">× ${i}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${O(s.tag)}">${r(n)}</span>${l}</li>`}).join("")}</ul>`}function M(t){return G(B(t),o)}function yt(t,{compactActions:a=!1,residentLabel:e="name"}={}){return t.names.length===0?v(o("summary.noName")):`<ul class="summary-matrix-names">${t.names.map(s=>{let n=s.dietTags.map(b=>M(b)),i=W(s.phone),l=String(s.displayName||"").trim(),u=l.split(/\s+/).filter(Boolean).slice(0,3).map(b=>b[0]).join("").toUpperCase(),d=e==="signature"?s.signature||l:e==="initials"&&(s.initials||u||s.signature)||l,m=r(d),p=n.length?` <small>(${r(n.join(", "))})</small>`:"",y=`<span class="summary-matrix-person-name">${m}${p}</span>`,f=s.phoneConsent&&i?`<a class="summary-matrix-call" href="tel:${r(i)}" aria-label="${r(o("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",$=s.whatsappEnabled&&s.phoneConsent&&i?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(i.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(o("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(a&&(f||$)){let b=`summary-contact-popup-${++rt}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${b}" aria-haspopup="dialog" aria-label="${r(o("summary.contactPerson",{name:s.displayName}))}" title="${r(o("summary.contactPerson",{name:s.displayName}))}">${y}</button>
            <span class="summary-matrix-contact-popover" id="${b}" popover role="dialog" aria-label="${r(o("summary.contactPerson",{name:s.displayName}))}">
              <span class="summary-matrix-contact-actions">${f}${$}</span>
            </span>
          </li>`}return`<li>${y}<span class="summary-matrix-contact-actions">${f}${$}</span></li>`}).join("")}</ul>`}function W(t){let a=String(t||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(a)?a:""}function _t(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:n=!0,dietLegend:i=[]}){let l=a?"kitchen":"summary",u=t.index===e;return`
    <section class="summary-matrix-screen summary-international-screen${Vt(t)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${l}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      ${a?`<h2 class="sr-only">${r(`${o("kitchen.view.title")}: ${o(t.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${r(t.dateId)}">${r(T(t.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${t.columns.map((m,p,y)=>Jt(m,{kitchen:a,residentLabel:s,showContactHint:n,showMassMetadata:p===0||y[p-1]?.dateId!==m.dateId})).join("")}
      </div>
      ${a?ht(t,i):""}
      ${F(t)}
    </section>
  `}function Vt(t){return t.columns.some(a=>a.guestCount>0||a.specialDiets.participantCount>0||a.sickCount>0||a.sickDiets.length>0)||t.notesByDate.length>0}function Jt(t,{kitchen:a,residentLabel:e="name",showContactHint:s=!0,showMassMetadata:n=!1}){let i=a?pt(t):ct(t),l=n&&t.dayMassStatus!=="UNKNOWN"?it(t.dayMassStatus,t.blessingTime):"",u=t.guestCount>0?`<span class="summary-international-mobile-guests">${r(o("summary.guests"))}: <strong>${t.guestCount}</strong></span>`:"",d=l||u?`<div class="summary-international-card-actions">${l}${u}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${ft(t.dayIndex)}${t.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${R(t.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${r(q(t,{breakfastTomorrow:!0}))}</strong><time datetime="${r(t.dateId)}">${r(I(t.dateId))}</time></div>
        ${d}
      </header>
      <dl>
        ${t.guestCount>0?`<div class="summary-international-guest-row"><dt>${r(o("summary.guests"))}</dt><dd>${t.guestCount}</dd></div>`:""}
        <div><dt>${r(o("summary.diningMeals"))}</dt><dd>${ot(t,{contactHint:!a&&s})}</dd></div>
        ${t.specialDiets.participantCount>0?`<div><dt>${r(o("summary.includedDiets"))}</dt><dd>${i}</dd></div>`:""}
        ${t.sickCount>0?`<div><dt>${r(o("summary.sickMeals"))}</dt><dd>${ut(t)}</dd></div>`:""}
        ${t.sickDiets.length>0?`<div><dt>${r(o("summary.sickDiets"))}</dt><dd>${dt(t)}</dd></div>`:""}
      </dl>
      ${a?"":`<section class="summary-international-names"><h3>${r(o("summary.names"))}</h3>${yt(t,{compactActions:!0,residentLabel:e})}</section>`}
    </article>
  `}function Qt(t){return t.dateGroups.map(a=>{let e=t.columns.find(s=>s.dateId===a.dateId);return{...a,massStatus:e?.dayMassStatus||"UNKNOWN",blessingTime:e?.blessingTime||""}})}function F(t){return t.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${r(o("kitchen.notes.title"))}">
      <h3>${r(o("kitchen.notes.title"))}</h3>
      ${t.notesByDate.map(a=>`
        <div class="kitchen-notes-group">
          <time datetime="${r(a.dateId)}">${r(I(a.dateId))}</time>
          <ul>${a.notes.map(e=>`<li><p>${r(e.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function ht(t,a){let e=new Set;t.columns.forEach(n=>{[...n.specialDiets?.items||[],...n.sickDiets||[]].forEach(i=>{let l=B(i?.tag);/^\d{1,3}$/.test(l)&&e.add(l)})});let s=Y(a).filter(n=>e.has(n.code));return s.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${r(o("kitchen.dietLegend.title"))}">
      <h3>${r(o("kitchen.dietLegend.title"))}</h3>
      <ul>${s.map(n=>`<li><strong class="diet-code-badge diet-code-tone-${O(n.code)}">${r(M(n.code))}</strong><span aria-hidden="true">=</span><span>${r(n.label)}</span></li>`).join("")}</ul>
    </section>
  `}function v(t){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${r(t)}</span>`}function Xt(t,a){return t.dayIndex>a.index?" summary-matrix-next-date":""}function Zt(t){let a=/^([01]\d|2[0-3]):[0-5]\d$/.test(t.blessingTime||""),e=a&&Number(t.span)<2,s=a?e?" summary-mass-control-blessing-narrow":" summary-mass-control-blessing-wide":"",n=a?` mass-status-with-blessing${e?" mass-status-narrow":" mass-status-wide-blessing"}`:"",i=a?L(t.blessingTime,e?{narrow:!0}:{compact:!0}):"";return`
    <span class="summary-mass-control${s}">
      <span class="summary-mass-control-day">${r($t(t.dayIndex))}</span>
      <span class="summary-mass-control-state mass-status-stack${n}">${Wt(t)}${i}</span>
    </span>`}function A(t,a){return`${Xt(t,a)} summary-day-tone-${ft(t.dayIndex)}`}function ft(t){return Math.max(0,Math.min(2,Number(t)||0))}function $t(t){return[o("summary.today"),o("summary.tomorrow"),o("summary.dayAfterTomorrow")][t]||o("summary.followingDay")}function I(t){let[a,e,s]=String(t).split("-").map(Number);return new Intl.DateTimeFormat(k(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(a,e-1,s))}function T(t){let[a,e,s]=String(t).split("-").map(Number);return!a||!e||!s?"":new Intl.DateTimeFormat(k(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(a,e-1,s))}function te(t,a){let e=[...t.querySelectorAll(`[data-${a}-screen]`)];if(e.length===0)return 0;let s=e.reduce((n,i)=>Math.abs(i.getBoundingClientRect().left-t.getBoundingClientRect().left)<Math.abs(n.getBoundingClientRect().left-t.getBoundingClientRect().left)?i:n);return Number(s.dataset[`${a}Screen`])===1?1:0}function gt(t,a,e){t.querySelectorAll(`[data-${a}-screen]`).forEach(s=>{s.setAttribute("aria-hidden",String(Number(s.dataset[`${a}Screen`])!==e))})}export{le as mountSummaryMatrix,Bt as scrollSummaryMatrix};

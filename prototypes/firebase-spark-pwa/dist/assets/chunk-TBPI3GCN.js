import{a as D}from"./chunk-D6K33BE5.js";import{a as r}from"./chunk-JUUUUMHC.js";import{c as R}from"./chunk-7ZENLLVJ.js";import{e as M,f as i}from"./chunk-XP5SQWO6.js";import{a as T,c as K,d as N}from"./chunk-DZJEM4PC.js";import"./chunk-O2XFH626.js";var E="breakfast",F="STANDARD";function W(t,a=[],e=[]){return U(t,a,e,!0)}function G(t,a=[]){return U(t,[],a,!1)}function U(t,a,e,s){let n=Array.isArray(t)?t:[],m=Array.isArray(e)?e:[],u=new Map(m.map(d=>[d.dateId,d])),l=dt(a),c=ct(n),o=c.findIndex(d=>d.mealTypeId===E),f=o>=0?c.slice(o+1):c,y=o>=0?c.slice(0,o+1):[];return[0,1].map(d=>{let p=[...f.map(h=>z(n,d,h,u,l,s)),...y.map(h=>z(n,d+1,h,u,l,s))].filter(Boolean),$=bt(p);return{index:d,dateId:n[d]?.dateId||p[0]?.dateId||"",labelKey:d===0?"summary.today":"summary.tomorrow",label:d===0?"Oggi":"Domani",columns:p,dateGroups:$,hasGuestGroup:p.some(h=>h.guestCount>0),hasSpecialDiets:p.some(h=>h.specialDiets.participantCount>0),hasSickMeals:p.some(h=>h.sickCount>0),hasSickDiets:p.some(h=>h.sickDiets.length>0),hasMassInformation:$.length>0,notesByDate:$.map(h=>({dateId:h.dateId,notes:gt(u.get(h.dateId))})).filter(h=>h.notes.length>0)}})}function ct(t){let a=t.find(e=>Array.isArray(e.meals)&&e.meals.length>0);return a?a.meals.map(e=>({mealTypeId:e.mealTypeId,label:e.label})):[]}function dt(t){let a=new Map,e=s=>{s?.participantId&&a.set(s.participantId,{...a.get(s.participantId),...s})};return(Array.isArray(t)?t:[]).forEach(e),a}function z(t,a,e,s,n,m){let u=t[a];if(!u)return null;let l=u.meals?.find(b=>b.mealTypeId===e.mealTypeId)||{mealTypeId:e.mealTypeId,label:e.label,present:[]},c=s.get(u.dateId)||{},o=Array.isArray(l.present)?l.present:Array.isArray(l.dietParticipants)?l.dietParticipants:[],f=Y(o,V(c),l.mealTypeId),y=_(c),d=new Set(y.map(b=>b.participantId)),p=f.filter(b=>!d.has(b.participantId)),$=pt(c,l.mealTypeId,n,[...Array.isArray(l.participantDiets)?l.participantDiets:[],...Array.isArray(l.absent)?l.absent:[],...f]),h=Math.max(0,Math.floor(Number(l.count)||0)),I=Array.isArray(l.present)?p.length:Math.max(0,h-$.count),g=$t(c,l.mealTypeId);return{dayIndex:a,dateId:u.dateId,mealTypeId:l.mealTypeId,label:l.label,total:I+g,guestCount:g,specialDiets:yt(p),sickCount:$.count,sickDiets:$.diets,massStatus:ft(c.dailyOperation,l.mealTypeId),dayMassStatus:ht(c.dailyOperation),blessingTime:(c.dailyOperation?.dailyOperation||c.dailyOperation)?.blessingTime||"",breakfastPlanned:l.mealTypeId===E&&I+g+$.count>0,names:m?p.map(b=>({participantId:b.participantId,displayName:b.displayName,signature:b.signature||"",initials:b.initials||"",dietTags:L(b),phone:b.phone||"",phoneConsent:b.phoneConsent===!0,whatsappEnabled:b.whatsappEnabled===!0})):[]}}function Y(t,a,e){let s=new Map;return(Array.isArray(a)?a:[]).forEach(n=>{let m=Array.isArray(n.mealTypeIds)?n.mealTypeIds:[];if(n.status==="REMOVED"||m.length>0&&!m.includes(e))return;let u=String(n.dietLabel||n.dietTag||"").trim();if(!n.participantId||!u)return;let l=s.get(n.participantId)||[];l.push(u),s.set(n.participantId,l)}),t.map(n=>{let m=s.get(n.participantId);return m?{...n,dietTags:[...new Set(m)]}:n})}function yt(t){let a=new Map,e=0;return t.forEach(s=>{let n=L(s);n.length!==0&&(e+=1,n.forEach(m=>a.set(m,(a.get(m)||0)+1)))}),{participantCount:e,items:[...a.entries()].map(([s,n])=>({tag:s,count:n}))}}function L(t){let a=Array.isArray(t.dietTags)?t.dietTags:[];return[...new Set(a.map(e=>String(e||"").trim()).filter(e=>e&&e.toUpperCase()!==F))]}function pt(t,a,e,s){let n=t?.dailyHealth||t,u=(Array.isArray(n?.sickMeals)?n.sickMeals:[]).find(y=>y.mealTypeId===a);if(u){let y=Array.isArray(u.dietLabels)?u.dietLabels:[];return{count:Math.max(0,Math.floor(Number(u.count)||0)),diets:q(y)}}let l=V(t),c=new Map((Array.isArray(s)?s:[]).map(y=>[y.participantId,y])),o=_(t),f=[];return o.forEach(y=>{let d=c.get(y.participantId)||e.get(y.participantId)||y,[p]=Y([d],l,a);L(p).forEach($=>f.push($))}),{count:o.length,diets:q(f)}}function q(t){let a=new Map;return(Array.isArray(t)?t:[]).forEach(e=>{let s=String(e||"").trim();!s||s.toUpperCase()===F||a.set(s,(a.get(s)||0)+1)}),[...a.entries()].map(([e,s])=>({tag:e,count:s}))}function ft(t,a){let e=t?.dailyOperation||t,s=e?.massByMeal?.[a];return s==="YES"||s==="NO"?s:e&&typeof e.massScheduled=="boolean"?e.massScheduled?"YES":"NO":"UNKNOWN"}function ht(t){let a=t?.dailyOperation||t,e=Object.entries(a?.massByMeal||{}).filter(([s])=>s!==E).map(([,s])=>s);return e.includes("YES")?"YES":e.includes("NO")?"NO":a&&typeof a.massScheduled=="boolean"?a.massScheduled?"YES":"NO":"UNKNOWN"}function _(t){let a=t?.dailyHealth||t;return Array.isArray(a?.sickPeople)?a.sickPeople:[]}function V(t){let a=t?.dailyHealth||t;return Array.isArray(t?.occasionalDiets)?t.occasionalDiets:Array.isArray(a?.dietAssignments)?a.dietAssignments:[]}function $t(t,a){let s=(t?.dailyHealth||t)?.invitedMeals||t?.invitedMeals||t?.dailyOperation?.invitedMeals||{};return Math.min(999,Math.max(0,Math.floor(Number(s[a])||0)))}function gt(t){return(Array.isArray(t?.notes)?t.notes:t?.note?[t.note]:[]).filter(e=>e&&e.status!=="REMOVED"&&e.text)}function bt(t){return t.reduce((a,e)=>{let s=a[a.length-1];return s&&s.dateId===e.dateId?(s.span+=1,a):(a.push({dayIndex:e.dayIndex,dateId:e.dateId,span:1}),a)},[])}var Q=0;function Qt(t,{days:a=[],operationDays:e=[],screenReady:s=()=>!0,kitchen:n=!1,layout:m="classic",residentLabel:u="name",dietLegend:l=[],showContactHint:c=!0,activeIndex:o=0,monthSummary:f=null,onActiveIndexChange:y=()=>{}}={}){let d=n?G(a,e):W(a,[],e);if(m==="future"&&!n){xt(t,d,u,o,y,c,s);return}if(d.every(g=>g.columns.length===0)){t.innerHTML=`<p class="empty-state">${r(i("summary.noMeal"))}</p>`;return}let p=n?"kitchen":"summary",$=m==="international"?jt:vt;if(t.innerHTML=`
    <div class="summary-matrix-track summary-layout-${m}${n?" summary-layout-kitchen":" summary-layout-diners"}" data-${p}-matrix-track aria-label="${r(i("summary.screensLabel"))}">
      ${d.map(g=>s(g.index)?$(g,{kitchen:n,activeIndex:o,residentLabel:u,showContactHint:c,dietLegend:l}):Mt(g,{kitchen:n,activeIndex:o,layout:m})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${r(i("summary.swipeHint"))}</p>
    ${n?Tt(f):""}
  `,n&&f?.onLoad){let g=t.querySelector("[data-kitchen-monthly-summary]");g?.addEventListener("toggle",()=>{g.open&&g.dataset.loading!=="true"&&Nt(g,f)})}let h=t.querySelector(`[data-${p}-matrix-track]`),I=0;h.addEventListener("scroll",()=>{window.clearTimeout(I),I=window.setTimeout(()=>{let g=Ft(h,p);ut(t,p,g),y(g)},100)},{passive:!0}),window.requestAnimationFrame(()=>{wt(t,o,{kitchen:n,smooth:!1})})}function xt(t,a,e="name",s=0,n=()=>{},m=!0,u=()=>!0){t.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${a.map(o=>u(o.index)?`
        <article class="summary-future-card" data-summary-future-screen="${o.index}" aria-hidden="${o.index!==s}">
          <header class="summary-future-card-head">
            <div><strong>${r(i(o.labelKey))}</strong><time datetime="${r(o.dateId)}">${r(A(o.dateId))}</time></div>
            ${kt(o)}
          </header>
          <div class="summary-future-meals">
            ${o.columns.map(f=>St(f,e,m)).join("")}
          </div>
          ${H(o)}
        </article>
      `:`
        <article class="summary-future-card" data-summary-future-screen="${o.index}" aria-hidden="${o.index!==s}" aria-busy="true">
          <header class="summary-future-card-head"><div><strong>${r(i(o.labelKey))}</strong><time datetime="${r(o.dateId)}">${r(A(o.dateId))}</time></div></header>
          <p class="empty-state" role="status">${r(i("common.status.loading"))}</p>
        </article>
      `).join("")}
    </div>
  `;let l=t.querySelector("[data-summary-future-track]"),c=0;l?.addEventListener("scroll",()=>{window.clearTimeout(c),c=window.setTimeout(()=>{let o=Math.max(0,Math.min(1,Math.round(l.scrollLeft/Math.max(1,l.clientWidth+14))));l.querySelectorAll("[data-summary-future-screen]").forEach(f=>{f.setAttribute("aria-hidden",String(Number(f.dataset.summaryFutureScreen)!==o))}),n(o)},100)},{passive:!0}),window.requestAnimationFrame(()=>{l&&l.scrollTo({left:Math.max(0,s)*(l.clientWidth+14),behavior:"auto"})})}function Mt(t,{kitchen:a,activeIndex:e,layout:s}){return`
    <section class="summary-matrix-screen${s==="international"?" summary-international-screen summary-screen-ordinary":""}" data-${a?"kitchen":"summary"}-screen="${t.index}" role="tabpanel" aria-hidden="${t.index!==e}" aria-busy="true">
      <p class="empty-state" role="status">${r(i("common.status.loading"))}</p>
    </section>
  `}function St(t,a,e=!0){let s=Array.isArray(t.names)?t.names:[],n=[...Array.isArray(t.specialDiets?.items)?t.specialDiets.items:[]].map(c=>x(c.tag)).filter(Boolean).sort((c,o)=>c.localeCompare(o,M(),{numeric:!0})),m=Number(t.guestCount||0),u=Number(t.sickCount||0),l=Array.isArray(t.sickDiets)?t.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${O(t.mealTypeId)}</span>
        <span class="summary-future-meal-name">${r(P(t,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${r(String(t.total||0))}</strong>
      </div>
      ${at(t,e)}
      ${m>0?J("summary.guests",m,"guests"):""}
      ${n.length?`<p class="summary-future-diets"><span>${r(i("summary.diets"))}:</span> <strong>${r(n.join(", "))}</strong></p>`:""}
      ${u>0?J("summary.sickMeals",u,"sick"):""}
      ${l.length>0?`<div class="summary-future-special-row"><span>${r(i("summary.sickDiets"))}</span><div>${C(l," summary-future-diet-list")}</div></div>`:""}
      ${s.length?`<div class="summary-future-people">${s.map(c=>It(c,a)).join("")}</div>`:""}
    </section>
  `}function J(t,a,e){return e==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${r(String(a))}</strong><span>${r(i(t))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${r(e)}"><span>${r(i(t))}</span><strong>${r(String(a))}</strong></p>`}function It(t,a){let e=String(t.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(o=>o[0]).join("").toUpperCase(),s=a==="signature"?t.signature||t.displayName:a==="initials"?t.initials||e||t.signature:t.displayName,n=Array.isArray(t.dietTags)?t.dietTags.map(o=>x(o)).filter(Boolean):[],m=`${r(s||"–")}${n.length?`&nbsp;<small>(${r(n.join(", "))})</small>`:""}`,u=j(t.phone),l=t.phoneConsent&&u?`<a class="summary-matrix-call" href="tel:${r(u)}" aria-label="${r(i("summary.callPerson",{name:t.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",c=t.whatsappEnabled&&t.phoneConsent&&u?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(u.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(i("summary.messagePerson",{name:t.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(l||c){let o=`summary-contact-popup-${++Q}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${o}" aria-haspopup="dialog" aria-label="${r(i("summary.contactPerson",{name:t.displayName}))}">${m}</button><span class="summary-matrix-contact-popover" id="${o}" popover role="dialog"><span class="summary-matrix-contact-actions">${l}${c}</span></span></span>`}return`<span class="summary-future-person" title="${r(t.displayName||s)}">${m}</span>`}function kt(t){let a=t.columns.find(s=>s.dayIndex===t.index),e=a?.dayMassStatus;return!e||e==="UNKNOWN"?"":X(e,a.blessingTime)}function X(t,a=""){let e=t==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${e?"yes":"no"}"><span>${r(i("summary.mass"))}:</span><span class="mass-status-stack"><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${r(i(e?"summary.yes":"summary.no"))}</strong>${D(a)}</span></span>`}function wt(t,a,{kitchen:e=!1,smooth:s=!0}={}){let n=e?"kitchen":"summary",m=Number(a)===1?1:0;if(!e){let c=t?.querySelector("[data-summary-future-track]");if(c)return c.scrollTo({left:m*(c.clientWidth+14),behavior:s?"smooth":"auto"}),c.querySelectorAll("[data-summary-future-screen]").forEach(o=>{o.setAttribute("aria-hidden",String(Number(o.dataset.summaryFutureScreen)!==m))}),!0}let u=t?.querySelector(`[data-${n}-matrix-track]`),l=u?.querySelector(`[data-${n}-screen="${m}"]`);return!u||!l?!1:(u.scrollTo({left:u.scrollLeft+l.getBoundingClientRect().left-u.getBoundingClientRect().left,behavior:s?"smooth":"auto"}),ut(t,n,m),!0)}function vt(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:n=!0,dietLegend:m=[]}){let u=a?"kitchen":"summary",l=t.index===e,c=At(t);return t.columns.length===0?`
      <section class="summary-matrix-screen" data-${u}-screen="${t.index}" role="tabpanel" aria-hidden="${!l}">
        <p class="empty-state">${r(i("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${u}-screen="${t.index}" role="tabpanel" aria-hidden="${!l}">
      <table class="summary-matrix summary-matrix-optional-rows-${c}">
        ${Ct(t,a)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${t.columns.map(o=>o.dayIndex>t.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${r(i("summary.item"))}</span></th>
            ${t.dateGroups.map(o=>`
              <th class="summary-matrix-date-heading${w(o,t)}" scope="colgroup" colspan="${o.span}">
                <span>${r(lt(o.dayIndex))}</span>
                <time datetime="${r(o.dateId)}">${r(v(o.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${t.columns.map(o=>`
              <th class="summary-matrix-meal-heading${w(o,t)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${O(o.mealTypeId)}</span><span class="summary-matrix-meal-label">${r(P(o))}</span>${Pt(o,a)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${t.hasGuestGroup?k(i("summary.guests"),"summary-matrix-row-guests",t,o=>String(o.guestCount)):""}
          ${k(i("summary.diningMeals"),"summary-matrix-row-meals",t,Z)}
          ${t.hasSpecialDiets?k(i("summary.includedDiets"),"summary-matrix-row-diets",t,a?nt:rt):""}
          ${t.hasSickMeals?k(i("summary.sickMeals"),"summary-matrix-row-sick",t,et):""}
          ${t.hasSickDiets?k(i("summary.sickDiets"),"summary-matrix-row-sick-diets",t,st):""}
          ${t.hasMassInformation?Ot(t):""}
          ${a?"":Lt(t,s,n)}
        </tbody>
      </table>
      ${a?ot(t,m):""}
      ${H(t)}
    </section>
  `}function At(t){return[t.hasGuestGroup,t.hasSickMeals,t.hasSickDiets].filter(Boolean).length}function Ct(t,a){return a?`<caption class="sr-only">${r(`${i("kitchen.view.title")}: ${i(t.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${r(t.dateId)}">${r(A(t.dateId))}</time>
    </caption>
  `}function O(t){let a={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return Dt({breakfast:"coffee",lunch:"sun",dinner:"moon"}[t],a[t]||"•")}function Dt(t,a="•"){let e=document.documentElement.dataset.interfaceStyle;if(!(e==="cool"||e==="urban"||e==="future")||!t)return a;let m={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[t];return m?`<svg class="meal-line-icon meal-line-icon-${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${m}</svg>`:a}function P(t,{breakfastTomorrow:a=!1}={}){let e=String(t?.mealTypeId||"").trim().toLowerCase();if(a&&e==="breakfast")return i("summary.breakfastTomorrow");let s=e?i(`meal.type.${e}`):"",n=String(t?.label||"").trim();return s&&s!==`meal.type.${e}`?s:n}function k(t,a,e,s){return`
    <tr class="${a}">
      <th class="summary-matrix-label" scope="row">${r(t)}</th>
      ${e.columns.map(n=>`<td class="${w(n,e).trim()}">${s(n)}</td>`).join("")}
    </tr>
  `}function Z(t,{contactHint:a=!1}={}){let e=t.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${t.total}</span><span class="summary-matrix-unit">${r(i(e))}</span>${a?at(t):""}`}function tt(t){return Array.isArray(t?.names)&&t.names.some(a=>a?.phoneConsent&&j(a.phone))}function Tt(t){return typeof t?.onLoad!="function"?"":`
    <section class="kitchen-monthly-summary">
      <details data-kitchen-monthly-summary>
        <summary>${r(i("kitchen.monthly.title"))}</summary>
        <div class="kitchen-monthly-summary-content" data-kitchen-monthly-summary-content role="status" aria-live="polite"></div>
      </details>
    </section>
  `}async function Nt(t,a){let e=t.querySelector("[data-kitchen-monthly-summary-content]");if(e){t.dataset.loading="true",e.textContent=i("kitchen.monthly.loading");try{let s=await a.onLoad(t.dataset.monthId);if(!t.isConnected||!t.open)return;if(!s){e.textContent=i("kitchen.monthly.notReady");return}e.innerHTML=`
      <p><strong>${r(i("kitchen.monthly.period"))}</strong> ${r(v(s.periodStart))} – ${r(v(s.periodEnd))}</p>
      <dl>
        ${B("breakfast",s.counts.breakfast)}
        ${B("lunch",s.counts.lunch)}
        ${B("dinner",s.counts.dinner)}
      </dl>
    `}catch{if(!t.isConnected||!t.open)return;e.textContent=i("kitchen.monthly.unavailable")}finally{delete t.dataset.loading}}}function B(t,a){let e=i(`meal.type.${t}`);return`<div><dt>${r(e)}</dt><dd>${r(a)}</dd></div>`}function at(t,a=!0){return!a||!tt(t)?"":`<small class="summary-contact-hint">${r(i("summary.contactHint"))}</small>`}function et(t){if(t.sickCount===0)return S(i("summary.sickMeals"));let a=t.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${t.sickCount}</span><span class="summary-matrix-unit">${r(i(a))}</span>`}function st(t){return t.sickDiets.length===0?S(i("summary.noDiet")):C(t.sickDiets)}function Et(t){if(t.massStatus==="UNKNOWN")return S(i("summary.notSet"));let a=t.massStatus==="YES";return`<span class="summary-matrix-mass-${a?"yes":"no"}">${r(i(a?"summary.yes":"summary.no"))}</span>`}function Lt(t,a="name",e=!0){return`
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
        ${e&&t.columns.some(tt)?`<small class="summary-contact-hint">${r(i("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${r(i("summary.names"))}</span>
      </th>
      ${t.columns.map(n=>`<td class="${w(n,t).trim()}">${it(n,{compactActions:!0,residentLabel:a})}</td>`).join("")}
    </tr>
  `}function Bt(t){return t==="YES"?" summary-mass-state-yes":t==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function Ot(t){let a=Rt(t).map(e=>`<td class="summary-matrix-mass-band${w(e,t)}${Bt(e.massStatus)}" colspan="${e.span}">${qt(e)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${r(i("summary.mass"))}</th>
      ${a}
    </tr>
  `}function Pt(t,a){if(a||t.mealTypeId!=="breakfast")return"";let e=t.breakfastPlanned===!0,s=i(e?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${e?"yes":"no"}"><span aria-hidden="true">${e?"✓":"×"}</span>${r(s)}</span>`}function rt(t){if(t.specialDiets.participantCount===0)return S(i("summary.noDiet"));let a=[...t.specialDiets.items].sort((e,s)=>x(e.tag).localeCompare(x(s.tag),M(),{numeric:!0}));return C(a)}function nt(t){return t.specialDiets.participantCount===0?S(i("summary.noDiet")):C(t.specialDiets.items," summary-matrix-kitchen-diets")}function C(t,a=""){let e=[...t].sort((s,n)=>x(s.tag).localeCompare(x(n.tag),M(),{numeric:!0}));return`<ul class="summary-matrix-diets${a}">${e.map(s=>{let n=x(s.tag),m=Math.max(0,Math.floor(Number(s.count)||0)),u=m>1?`<span class="diet-code-count">× ${m}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${N(s.tag)}">${r(n)}</span>${u}</li>`}).join("")}</ul>`}function x(t){return K(T(t),i)}function it(t,{compactActions:a=!1,residentLabel:e="name"}={}){return t.names.length===0?S(i("summary.noName")):`<ul class="summary-matrix-names">${t.names.map(s=>{let n=s.dietTags.map($=>x($)),m=j(s.phone),u=String(s.displayName||"").trim(),l=u.split(/\s+/).filter(Boolean).slice(0,3).map($=>$[0]).join("").toUpperCase(),c=e==="signature"?s.signature||u:e==="initials"&&(s.initials||l||s.signature)||u,o=r(c),f=n.length?` <small>(${r(n.join(", "))})</small>`:"",y=`<span class="summary-matrix-person-name">${o}${f}</span>`,d=s.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${r(m)}" aria-label="${r(i("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",p=s.whatsappEnabled&&s.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(i("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(a&&(d||p)){let $=`summary-contact-popup-${++Q}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${$}" aria-haspopup="dialog" aria-label="${r(i("summary.contactPerson",{name:s.displayName}))}" title="${r(i("summary.contactPerson",{name:s.displayName}))}">${y}</button>
            <span class="summary-matrix-contact-popover" id="${$}" popover role="dialog" aria-label="${r(i("summary.contactPerson",{name:s.displayName}))}">
              <span class="summary-matrix-contact-actions">${d}${p}</span>
            </span>
          </li>`}return`<li>${y}<span class="summary-matrix-contact-actions">${d}${p}</span></li>`}).join("")}</ul>`}function j(t){let a=String(t||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(a)?a:""}function jt(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:n=!0,dietLegend:m=[]}){let u=a?"kitchen":"summary",l=t.index===e;return`
    <section class="summary-matrix-screen summary-international-screen${Ht(t)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${u}-screen="${t.index}" role="tabpanel" aria-hidden="${!l}">
      ${a?`<h2 class="sr-only">${r(`${i("kitchen.view.title")}: ${i(t.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${r(t.dateId)}">${r(A(t.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${t.columns.map((o,f,y)=>Kt(o,{kitchen:a,residentLabel:s,showContactHint:n,showMassMetadata:f===0||y[f-1]?.dateId!==o.dateId})).join("")}
      </div>
      ${a?ot(t,m):""}
      ${H(t)}
    </section>
  `}function Ht(t){return t.columns.some(a=>a.guestCount>0||a.specialDiets.participantCount>0||a.sickCount>0||a.sickDiets.length>0)||t.notesByDate.length>0}function Kt(t,{kitchen:a,residentLabel:e="name",showContactHint:s=!0,showMassMetadata:n=!1}){let m=a?nt(t):rt(t),u=n&&t.dayMassStatus!=="UNKNOWN"?X(t.dayMassStatus,t.blessingTime):"",l=t.guestCount>0?`<span class="summary-international-mobile-guests">${r(i("summary.guests"))}: <strong>${t.guestCount}</strong></span>`:"",c=u||l?`<div class="summary-international-card-actions">${u}${l}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${mt(t.dayIndex)}${t.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${O(t.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${r(P(t,{breakfastTomorrow:!0}))}</strong><time datetime="${r(t.dateId)}">${r(v(t.dateId))}</time></div>
        ${c}
      </header>
      <dl>
        ${t.guestCount>0?`<div class="summary-international-guest-row"><dt>${r(i("summary.guests"))}</dt><dd>${t.guestCount}</dd></div>`:""}
        <div><dt>${r(i("summary.diningMeals"))}</dt><dd>${Z(t,{contactHint:!a&&s})}</dd></div>
        ${t.specialDiets.participantCount>0?`<div><dt>${r(i("summary.includedDiets"))}</dt><dd>${m}</dd></div>`:""}
        ${t.sickCount>0?`<div><dt>${r(i("summary.sickMeals"))}</dt><dd>${et(t)}</dd></div>`:""}
        ${t.sickDiets.length>0?`<div><dt>${r(i("summary.sickDiets"))}</dt><dd>${st(t)}</dd></div>`:""}
      </dl>
      ${a?"":`<section class="summary-international-names"><h3>${r(i("summary.names"))}</h3>${it(t,{compactActions:!0,residentLabel:e})}</section>`}
    </article>
  `}function Rt(t){return t.dateGroups.map(a=>{let e=t.columns.find(s=>s.dateId===a.dateId);return{...a,massStatus:e?.dayMassStatus||"UNKNOWN",blessingTime:e?.blessingTime||""}})}function H(t){return t.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${r(i("kitchen.notes.title"))}">
      <h3>${r(i("kitchen.notes.title"))}</h3>
      ${t.notesByDate.map(a=>`
        <div class="kitchen-notes-group">
          <time datetime="${r(a.dateId)}">${r(v(a.dateId))}</time>
          <ul>${a.notes.map(e=>`<li><p>${r(e.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function ot(t,a){let e=new Set;t.columns.forEach(n=>{[...n.specialDiets?.items||[],...n.sickDiets||[]].forEach(m=>{let u=T(m?.tag);/^\d{1,3}$/.test(u)&&e.add(u)})});let s=R(a).filter(n=>e.has(n.code));return s.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${r(i("kitchen.dietLegend.title"))}">
      <h3>${r(i("kitchen.dietLegend.title"))}</h3>
      <ul>${s.map(n=>`<li><strong class="diet-code-badge diet-code-tone-${N(n.code)}">${r(x(n.code))}</strong><span aria-hidden="true">=</span><span>${r(n.label)}</span></li>`).join("")}</ul>
    </section>
  `}function S(t){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${r(t)}</span>`}function zt(t,a){return t.dayIndex>a.index?" summary-matrix-next-date":""}function qt(t){let a=/^([01]\d|2[0-3]):[0-5]\d$/.test(t.blessingTime||""),e=a&&Number(t.span)<2,s=a?e?" summary-mass-control-blessing-narrow":" summary-mass-control-blessing-wide":"",n=a?` mass-status-with-blessing${e?" mass-status-narrow":" mass-status-wide-blessing"}`:"",m=a?D(t.blessingTime,e?{narrow:!0}:{compact:!0}):"";return`
    <span class="summary-mass-control${s}">
      <span class="summary-mass-control-day">${r(lt(t.dayIndex))}</span>
      <span class="summary-mass-control-state mass-status-stack${n}">${Et(t)}${m}</span>
    </span>`}function w(t,a){return`${zt(t,a)} summary-day-tone-${mt(t.dayIndex)}`}function mt(t){return Math.max(0,Math.min(2,Number(t)||0))}function lt(t){return[i("summary.today"),i("summary.tomorrow"),i("summary.dayAfterTomorrow")][t]||i("summary.followingDay")}function v(t){let[a,e,s]=String(t).split("-").map(Number);return new Intl.DateTimeFormat(M(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(a,e-1,s))}function A(t){let[a,e,s]=String(t).split("-").map(Number);return!a||!e||!s?"":new Intl.DateTimeFormat(M(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(a,e-1,s))}function Ft(t,a){let e=[...t.querySelectorAll(`[data-${a}-screen]`)];if(e.length===0)return 0;let s=e.reduce((n,m)=>Math.abs(m.getBoundingClientRect().left-t.getBoundingClientRect().left)<Math.abs(n.getBoundingClientRect().left-t.getBoundingClientRect().left)?m:n);return Number(s.dataset[`${a}Screen`])===1?1:0}function ut(t,a,e){t.querySelectorAll(`[data-${a}-screen]`).forEach(s=>{s.setAttribute("aria-hidden",String(Number(s.dataset[`${a}Screen`])!==e))})}export{Qt as mountSummaryMatrix,wt as scrollSummaryMatrix};

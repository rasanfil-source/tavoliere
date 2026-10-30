import{a as C}from"./chunk-D6K33BE5.js";import{a as r}from"./chunk-JUUUUMHC.js";import{c as R}from"./chunk-7ZENLLVJ.js";import{e as M,f as i}from"./chunk-XP5SQWO6.js";import{a as D,c as K,d as T}from"./chunk-DZJEM4PC.js";import"./chunk-O2XFH626.js";var N="breakfast",F="STANDARD";function W(t,a=[],e=[]){return U(t,a,e,!0)}function G(t,a=[]){return U(t,[],a,!1)}function U(t,a,e,s){let n=Array.isArray(t)?t:[],m=Array.isArray(e)?e:[],o=new Map(m.map(d=>[d.dateId,d])),u=dt(a),l=ct(n),c=l.findIndex(d=>d.mealTypeId===N),$=c>=0?l.slice(c+1):l,y=c>=0?l.slice(0,c+1):[];return[0,1].map(d=>{let h=[...$.map(p=>z(n,d,p,o,u,s)),...y.map(p=>z(n,d+1,p,o,u,s))].filter(Boolean),f=bt(h);return{index:d,dateId:n[d]?.dateId||h[0]?.dateId||"",labelKey:d===0?"summary.today":"summary.tomorrow",label:d===0?"Oggi":"Domani",columns:h,dateGroups:f,hasGuestGroup:h.some(p=>p.guestCount>0),hasSpecialDiets:h.some(p=>p.specialDiets.participantCount>0),hasSickMeals:h.some(p=>p.sickCount>0),hasSickDiets:h.some(p=>p.sickDiets.length>0),hasMassInformation:f.length>0,notesByDate:f.map(p=>({dateId:p.dateId,notes:gt(o.get(p.dateId))})).filter(p=>p.notes.length>0)}})}function ct(t){let a=t.find(e=>Array.isArray(e.meals)&&e.meals.length>0);return a?a.meals.map(e=>({mealTypeId:e.mealTypeId,label:e.label})):[]}function dt(t){let a=new Map,e=s=>{s?.participantId&&a.set(s.participantId,{...a.get(s.participantId),...s})};return(Array.isArray(t)?t:[]).forEach(e),a}function z(t,a,e,s,n,m){let o=t[a];if(!o)return null;let u=o.meals?.find(b=>b.mealTypeId===e.mealTypeId)||{mealTypeId:e.mealTypeId,label:e.label,present:[]},l=s.get(o.dateId)||{},c=Array.isArray(u.present)?u.present:Array.isArray(u.dietParticipants)?u.dietParticipants:[],$=Y(c,V(l),u.mealTypeId),y=_(l),d=new Set(y.map(b=>b.participantId)),h=$.filter(b=>!d.has(b.participantId)),f=pt(l,u.mealTypeId,n,[...Array.isArray(u.participantDiets)?u.participantDiets:[],...Array.isArray(u.absent)?u.absent:[],...$]),p=Math.max(0,Math.floor(Number(u.count)||0)),g=Array.isArray(u.present)?h.length:Math.max(0,p-f.count),A=$t(l,u.mealTypeId);return{dayIndex:a,dateId:o.dateId,mealTypeId:u.mealTypeId,label:u.label,total:g+A,guestCount:A,specialDiets:yt(h),sickCount:f.count,sickDiets:f.diets,massStatus:ft(l.dailyOperation,u.mealTypeId),dayMassStatus:ht(l.dailyOperation),blessingTime:(l.dailyOperation?.dailyOperation||l.dailyOperation)?.blessingTime||"",breakfastPlanned:u.mealTypeId===N&&g+A+f.count>0,names:m?h.map(b=>({participantId:b.participantId,displayName:b.displayName,signature:b.signature||"",initials:b.initials||"",dietTags:E(b),phone:b.phone||"",phoneConsent:b.phoneConsent===!0,whatsappEnabled:b.whatsappEnabled===!0})):[]}}function Y(t,a,e){let s=new Map;return(Array.isArray(a)?a:[]).forEach(n=>{let m=Array.isArray(n.mealTypeIds)?n.mealTypeIds:[];if(n.status==="REMOVED"||m.length>0&&!m.includes(e))return;let o=String(n.dietLabel||n.dietTag||"").trim();if(!n.participantId||!o)return;let u=s.get(n.participantId)||[];u.push(o),s.set(n.participantId,u)}),t.map(n=>{let m=s.get(n.participantId);return m?{...n,dietTags:[...new Set(m)]}:n})}function yt(t){let a=new Map,e=0;return t.forEach(s=>{let n=E(s);n.length!==0&&(e+=1,n.forEach(m=>a.set(m,(a.get(m)||0)+1)))}),{participantCount:e,items:[...a.entries()].map(([s,n])=>({tag:s,count:n}))}}function E(t){let a=Array.isArray(t.dietTags)?t.dietTags:[];return[...new Set(a.map(e=>String(e||"").trim()).filter(e=>e&&e.toUpperCase()!==F))]}function pt(t,a,e,s){let n=t?.dailyHealth||t,o=(Array.isArray(n?.sickMeals)?n.sickMeals:[]).find(y=>y.mealTypeId===a);if(o){let y=Array.isArray(o.dietLabels)?o.dietLabels:[];return{count:Math.max(0,Math.floor(Number(o.count)||0)),diets:q(y)}}let u=V(t),l=new Map((Array.isArray(s)?s:[]).map(y=>[y.participantId,y])),c=_(t),$=[];return c.forEach(y=>{let d=l.get(y.participantId)||e.get(y.participantId)||y,[h]=Y([d],u,a);E(h).forEach(f=>$.push(f))}),{count:c.length,diets:q($)}}function q(t){let a=new Map;return(Array.isArray(t)?t:[]).forEach(e=>{let s=String(e||"").trim();!s||s.toUpperCase()===F||a.set(s,(a.get(s)||0)+1)}),[...a.entries()].map(([e,s])=>({tag:e,count:s}))}function ft(t,a){let e=t?.dailyOperation||t,s=e?.massByMeal?.[a];return s==="YES"||s==="NO"?s:e&&typeof e.massScheduled=="boolean"?e.massScheduled?"YES":"NO":"UNKNOWN"}function ht(t){let a=t?.dailyOperation||t,e=Object.entries(a?.massByMeal||{}).filter(([s])=>s!==N).map(([,s])=>s);return e.includes("YES")?"YES":e.includes("NO")?"NO":a&&typeof a.massScheduled=="boolean"?a.massScheduled?"YES":"NO":"UNKNOWN"}function _(t){let a=t?.dailyHealth||t;return Array.isArray(a?.sickPeople)?a.sickPeople:[]}function V(t){let a=t?.dailyHealth||t;return Array.isArray(t?.occasionalDiets)?t.occasionalDiets:Array.isArray(a?.dietAssignments)?a.dietAssignments:[]}function $t(t,a){let s=(t?.dailyHealth||t)?.invitedMeals||t?.invitedMeals||t?.dailyOperation?.invitedMeals||{};return Math.min(999,Math.max(0,Math.floor(Number(s[a])||0)))}function gt(t){return(Array.isArray(t?.notes)?t.notes:t?.note?[t.note]:[]).filter(e=>e&&e.status!=="REMOVED"&&e.text)}function bt(t){return t.reduce((a,e)=>{let s=a[a.length-1];return s&&s.dateId===e.dateId?(s.span+=1,a):(a.push({dayIndex:e.dayIndex,dateId:e.dateId,span:1}),a)},[])}var Q=0;function Jt(t,{days:a=[],operationDays:e=[],kitchen:s=!1,layout:n="classic",residentLabel:m="name",dietLegend:o=[],showContactHint:u=!0,activeIndex:l=0,monthSummary:c=null,onActiveIndexChange:$=()=>{}}={}){let y=s?G(a,e):W(a,[],e);if(n==="future"&&!s){xt(t,y,m,l,$,u);return}if(y.every(g=>g.columns.length===0)){t.innerHTML=`<p class="empty-state">${r(i("summary.noMeal"))}</p>`;return}let d=s?"kitchen":"summary",h=n==="international"?Pt:wt;if(t.innerHTML=`
    <div class="summary-matrix-track summary-layout-${n}${s?" summary-layout-kitchen":" summary-layout-diners"}" data-${d}-matrix-track aria-label="${r(i("summary.screensLabel"))}">
      ${y.map(g=>h(g,{kitchen:s,activeIndex:l,residentLabel:m,showContactHint:u,dietLegend:o})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${r(i("summary.swipeHint"))}</p>
    ${s?Dt(c):""}
  `,s&&c?.onLoad){let g=t.querySelector("[data-kitchen-monthly-summary]");g?.addEventListener("toggle",()=>{g.open&&g.dataset.loaded!=="true"&&g.dataset.loading!=="true"&&Tt(g,c)})}let f=t.querySelector(`[data-${d}-matrix-track]`),p=0;f.addEventListener("scroll",()=>{window.clearTimeout(p),p=window.setTimeout(()=>{let g=qt(f,d);ut(t,d,g),$(g)},100)},{passive:!0}),window.requestAnimationFrame(()=>{kt(t,l,{kitchen:s,smooth:!1})})}function xt(t,a,e,s=0,n=()=>{},m=!0){t.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${a.map(l=>`
        <article class="summary-future-card" data-summary-future-screen="${l.index}" aria-hidden="${l.index!==s}">
          <header class="summary-future-card-head">
            <div><strong>${r(i(l.labelKey))}</strong><time datetime="${r(l.dateId)}">${r(H(l.dateId))}</time></div>
            ${It(l)}
          </header>
          <div class="summary-future-meals">
            ${l.columns.map(c=>Mt(c,e,m)).join("")}
          </div>
          ${j(l)}
        </article>
      `).join("")}
    </div>
  `;let o=t.querySelector("[data-summary-future-track]"),u=0;o?.addEventListener("scroll",()=>{window.clearTimeout(u),u=window.setTimeout(()=>{let l=Math.max(0,Math.min(1,Math.round(o.scrollLeft/Math.max(1,o.clientWidth+14))));o.querySelectorAll("[data-summary-future-screen]").forEach(c=>{c.setAttribute("aria-hidden",String(Number(c.dataset.summaryFutureScreen)!==l))}),n(l)},100)},{passive:!0}),window.requestAnimationFrame(()=>{o&&o.scrollTo({left:Math.max(0,s)*(o.clientWidth+14),behavior:"auto"})})}function Mt(t,a,e=!0){let s=Array.isArray(t.names)?t.names:[],n=[...Array.isArray(t.specialDiets?.items)?t.specialDiets.items:[]].map(l=>x(l.tag)).filter(Boolean).sort((l,c)=>l.localeCompare(c,M(),{numeric:!0})),m=Number(t.guestCount||0),o=Number(t.sickCount||0),u=Array.isArray(t.sickDiets)?t.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${L(t.mealTypeId)}</span>
        <span class="summary-future-meal-name">${r(O(t,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${r(String(t.total||0))}</strong>
      </div>
      ${at(t,e)}
      ${m>0?J("summary.guests",m,"guests"):""}
      ${n.length?`<p class="summary-future-diets"><span>${r(i("summary.diets"))}:</span> <strong>${r(n.join(", "))}</strong></p>`:""}
      ${o>0?J("summary.sickMeals",o,"sick"):""}
      ${u.length>0?`<div class="summary-future-special-row"><span>${r(i("summary.sickDiets"))}</span><div>${v(u," summary-future-diet-list")}</div></div>`:""}
      ${s.length?`<div class="summary-future-people">${s.map(l=>St(l,a)).join("")}</div>`:""}
    </section>
  `}function J(t,a,e){return e==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${r(String(a))}</strong><span>${r(i(t))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${r(e)}"><span>${r(i(t))}</span><strong>${r(String(a))}</strong></p>`}function St(t,a){let e=String(t.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(c=>c[0]).join("").toUpperCase(),s=a==="signature"?t.signature||t.displayName:a==="initials"?t.initials||e||t.signature:t.displayName,n=Array.isArray(t.dietTags)?t.dietTags.map(c=>x(c)).filter(Boolean):[],m=`${r(s||"–")}${n.length?`&nbsp;<small>(${r(n.join(", "))})</small>`:""}`,o=P(t.phone),u=t.phoneConsent&&o?`<a class="summary-matrix-call" href="tel:${r(o)}" aria-label="${r(i("summary.callPerson",{name:t.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",l=t.whatsappEnabled&&t.phoneConsent&&o?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(o.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(i("summary.messagePerson",{name:t.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(u||l){let c=`summary-contact-popup-${++Q}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${c}" aria-haspopup="dialog" aria-label="${r(i("summary.contactPerson",{name:t.displayName}))}">${m}</button><span class="summary-matrix-contact-popover" id="${c}" popover role="dialog"><span class="summary-matrix-contact-actions">${u}${l}</span></span></span>`}return`<span class="summary-future-person" title="${r(t.displayName||s)}">${m}</span>`}function It(t){let a=t.columns.find(s=>s.dayIndex===t.index),e=a?.dayMassStatus;return!e||e==="UNKNOWN"?"":X(e,a.blessingTime)}function X(t,a=""){let e=t==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${e?"yes":"no"}"><span>${r(i("summary.mass"))}:</span><span class="mass-status-stack"><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${r(i(e?"summary.yes":"summary.no"))}</strong>${C(a)}</span></span>`}function kt(t,a,{kitchen:e=!1,smooth:s=!0}={}){let n=e?"kitchen":"summary",m=Number(a)===1?1:0;if(!e){let l=t?.querySelector("[data-summary-future-track]");if(l)return l.scrollTo({left:m*(l.clientWidth+14),behavior:s?"smooth":"auto"}),l.querySelectorAll("[data-summary-future-screen]").forEach(c=>{c.setAttribute("aria-hidden",String(Number(c.dataset.summaryFutureScreen)!==m))}),!0}let o=t?.querySelector(`[data-${n}-matrix-track]`),u=o?.querySelector(`[data-${n}-screen="${m}"]`);return!o||!u?!1:(o.scrollTo({left:o.scrollLeft+u.getBoundingClientRect().left-o.getBoundingClientRect().left,behavior:s?"smooth":"auto"}),ut(t,n,m),!0)}function wt(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:n=!0,dietLegend:m=[]}){let o=a?"kitchen":"summary",u=t.index===e,l=vt(t);return t.columns.length===0?`
      <section class="summary-matrix-screen" data-${o}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
        <p class="empty-state">${r(i("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${o}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      <table class="summary-matrix summary-matrix-optional-rows-${l}">
        ${At(t,a)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${t.columns.map(c=>c.dayIndex>t.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${r(i("summary.item"))}</span></th>
            ${t.dateGroups.map(c=>`
              <th class="summary-matrix-date-heading${k(c,t)}" scope="colgroup" colspan="${c.span}">
                <span>${r(lt(c.dayIndex))}</span>
                <time datetime="${r(c.dateId)}">${r(w(c.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${t.columns.map(c=>`
              <th class="summary-matrix-meal-heading${k(c,t)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${L(c.mealTypeId)}</span><span class="summary-matrix-meal-label">${r(O(c))}</span>${Ot(c,a)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${t.hasGuestGroup?I(i("summary.guests"),"summary-matrix-row-guests",t,c=>String(c.guestCount)):""}
          ${I(i("summary.diningMeals"),"summary-matrix-row-meals",t,Z)}
          ${t.hasSpecialDiets?I(i("summary.includedDiets"),"summary-matrix-row-diets",t,a?nt:rt):""}
          ${t.hasSickMeals?I(i("summary.sickMeals"),"summary-matrix-row-sick",t,et):""}
          ${t.hasSickDiets?I(i("summary.sickDiets"),"summary-matrix-row-sick-diets",t,st):""}
          ${t.hasMassInformation?Lt(t):""}
          ${a?"":Et(t,s,n)}
        </tbody>
      </table>
      ${a?ot(t,m):""}
      ${j(t)}
    </section>
  `}function vt(t){return[t.hasGuestGroup,t.hasSickMeals,t.hasSickDiets].filter(Boolean).length}function At(t,a){return a?`<caption class="sr-only">${r(`${i("kitchen.view.title")}: ${i(t.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${r(t.dateId)}">${r(H(t.dateId))}</time>
    </caption>
  `}function L(t){let a={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return Ct({breakfast:"coffee",lunch:"sun",dinner:"moon"}[t],a[t]||"•")}function Ct(t,a="•"){let e=document.documentElement.dataset.interfaceStyle;if(!(e==="cool"||e==="urban"||e==="future")||!t)return a;let m={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[t];return m?`<svg class="meal-line-icon meal-line-icon-${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${m}</svg>`:a}function O(t,{breakfastTomorrow:a=!1}={}){let e=String(t?.mealTypeId||"").trim().toLowerCase();if(a&&e==="breakfast")return i("summary.breakfastTomorrow");let s=e?i(`meal.type.${e}`):"",n=String(t?.label||"").trim();return s&&s!==`meal.type.${e}`?s:n}function I(t,a,e,s){return`
    <tr class="${a}">
      <th class="summary-matrix-label" scope="row">${r(t)}</th>
      ${e.columns.map(n=>`<td class="${k(n,e).trim()}">${s(n)}</td>`).join("")}
    </tr>
  `}function Z(t,{contactHint:a=!1}={}){let e=t.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${t.total}</span><span class="summary-matrix-unit">${r(i(e))}</span>${a?at(t):""}`}function tt(t){return Array.isArray(t?.names)&&t.names.some(a=>a?.phoneConsent&&P(a.phone))}function Dt(t){return!t?.monthId||typeof t.onLoad!="function"?"":`
    <section class="kitchen-monthly-summary">
      <details data-kitchen-monthly-summary data-month-id="${r(t.monthId)}">
        <summary>${r(i("kitchen.monthly.title"))}</summary>
        <div class="kitchen-monthly-summary-content" data-kitchen-monthly-summary-content role="status" aria-live="polite"></div>
      </details>
    </section>
  `}async function Tt(t,a){let e=t.querySelector("[data-kitchen-monthly-summary-content]");if(e){t.dataset.loading="true",e.textContent=i("kitchen.monthly.loading");try{let s=await a.onLoad(t.dataset.monthId);if(!t.isConnected||!t.open)return;if(!s){e.textContent=i("kitchen.monthly.notReady");return}e.innerHTML=`
      <p><strong>${r(i("kitchen.monthly.period"))}</strong> ${r(w(s.periodStart))} – ${r(w(s.periodEnd))}</p>
      <dl>
        ${B("breakfast",s.counts.breakfast)}
        ${B("lunch",s.counts.lunch)}
        ${B("dinner",s.counts.dinner)}
      </dl>
    `,t.dataset.loaded="true"}catch{if(!t.isConnected||!t.open)return;e.textContent=i("kitchen.monthly.unavailable")}finally{delete t.dataset.loading}}}function B(t,a){let e=i(`meal.type.${t}`);return`<div><dt>${r(e)}</dt><dd>${r(a)}</dd></div>`}function at(t,a=!0){return!a||!tt(t)?"":`<small class="summary-contact-hint">${r(i("summary.contactHint"))}</small>`}function et(t){if(t.sickCount===0)return S(i("summary.sickMeals"));let a=t.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${t.sickCount}</span><span class="summary-matrix-unit">${r(i(a))}</span>`}function st(t){return t.sickDiets.length===0?S(i("summary.noDiet")):v(t.sickDiets)}function Nt(t){if(t.massStatus==="UNKNOWN")return S(i("summary.notSet"));let a=t.massStatus==="YES";return`<span class="summary-matrix-mass-${a?"yes":"no"}">${r(i(a?"summary.yes":"summary.no"))}</span>`}function Et(t,a="name",e=!0){return`
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
      ${t.columns.map(n=>`<td class="${k(n,t).trim()}">${it(n,{compactActions:!0,residentLabel:a})}</td>`).join("")}
    </tr>
  `}function Bt(t){return t==="YES"?" summary-mass-state-yes":t==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function Lt(t){let a=Kt(t).map(e=>`<td class="summary-matrix-mass-band${k(e,t)}${Bt(e.massStatus)}" colspan="${e.span}">${zt(e)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${r(i("summary.mass"))}</th>
      ${a}
    </tr>
  `}function Ot(t,a){if(a||t.mealTypeId!=="breakfast")return"";let e=t.breakfastPlanned===!0,s=i(e?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${e?"yes":"no"}"><span aria-hidden="true">${e?"✓":"×"}</span>${r(s)}</span>`}function rt(t){if(t.specialDiets.participantCount===0)return S(i("summary.noDiet"));let a=[...t.specialDiets.items].sort((e,s)=>x(e.tag).localeCompare(x(s.tag),M(),{numeric:!0}));return v(a)}function nt(t){return t.specialDiets.participantCount===0?S(i("summary.noDiet")):v(t.specialDiets.items," summary-matrix-kitchen-diets")}function v(t,a=""){let e=[...t].sort((s,n)=>x(s.tag).localeCompare(x(n.tag),M(),{numeric:!0}));return`<ul class="summary-matrix-diets${a}">${e.map(s=>{let n=x(s.tag),m=Math.max(0,Math.floor(Number(s.count)||0)),o=m>1?`<span class="diet-code-count">× ${m}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${T(s.tag)}">${r(n)}</span>${o}</li>`}).join("")}</ul>`}function x(t){return K(D(t),i)}function it(t,{compactActions:a=!1,residentLabel:e="name"}={}){return t.names.length===0?S(i("summary.noName")):`<ul class="summary-matrix-names">${t.names.map(s=>{let n=s.dietTags.map(f=>x(f)),m=P(s.phone),o=String(s.displayName||"").trim(),u=o.split(/\s+/).filter(Boolean).slice(0,3).map(f=>f[0]).join("").toUpperCase(),l=e==="signature"?s.signature||o:e==="initials"&&(s.initials||u||s.signature)||o,c=r(l),$=n.length?` <small>(${r(n.join(", "))})</small>`:"",y=`<span class="summary-matrix-person-name">${c}${$}</span>`,d=s.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${r(m)}" aria-label="${r(i("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",h=s.whatsappEnabled&&s.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(i("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(a&&(d||h)){let f=`summary-contact-popup-${++Q}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${f}" aria-haspopup="dialog" aria-label="${r(i("summary.contactPerson",{name:s.displayName}))}" title="${r(i("summary.contactPerson",{name:s.displayName}))}">${y}</button>
            <span class="summary-matrix-contact-popover" id="${f}" popover role="dialog" aria-label="${r(i("summary.contactPerson",{name:s.displayName}))}">
              <span class="summary-matrix-contact-actions">${d}${h}</span>
            </span>
          </li>`}return`<li>${y}<span class="summary-matrix-contact-actions">${d}${h}</span></li>`}).join("")}</ul>`}function P(t){let a=String(t||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(a)?a:""}function Pt(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:n=!0,dietLegend:m=[]}){let o=a?"kitchen":"summary",u=t.index===e;return`
    <section class="summary-matrix-screen summary-international-screen${jt(t)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${o}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      ${a?`<h2 class="sr-only">${r(`${i("kitchen.view.title")}: ${i(t.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${r(t.dateId)}">${r(H(t.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${t.columns.map((c,$,y)=>Ht(c,{kitchen:a,residentLabel:s,showContactHint:n,showMassMetadata:$===0||y[$-1]?.dateId!==c.dateId})).join("")}
      </div>
      ${a?ot(t,m):""}
      ${j(t)}
    </section>
  `}function jt(t){return t.columns.some(a=>a.guestCount>0||a.specialDiets.participantCount>0||a.sickCount>0||a.sickDiets.length>0)||t.notesByDate.length>0}function Ht(t,{kitchen:a,residentLabel:e="name",showContactHint:s=!0,showMassMetadata:n=!1}){let m=a?nt(t):rt(t),o=n&&t.dayMassStatus!=="UNKNOWN"?X(t.dayMassStatus,t.blessingTime):"",u=t.guestCount>0?`<span class="summary-international-mobile-guests">${r(i("summary.guests"))}: <strong>${t.guestCount}</strong></span>`:"",l=o||u?`<div class="summary-international-card-actions">${o}${u}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${mt(t.dayIndex)}${t.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${L(t.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${r(O(t,{breakfastTomorrow:!0}))}</strong><time datetime="${r(t.dateId)}">${r(w(t.dateId))}</time></div>
        ${l}
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
  `}function Kt(t){return t.dateGroups.map(a=>{let e=t.columns.find(s=>s.dateId===a.dateId);return{...a,massStatus:e?.dayMassStatus||"UNKNOWN",blessingTime:e?.blessingTime||""}})}function j(t){return t.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${r(i("kitchen.notes.title"))}">
      <h3>${r(i("kitchen.notes.title"))}</h3>
      ${t.notesByDate.map(a=>`
        <div class="kitchen-notes-group">
          <time datetime="${r(a.dateId)}">${r(w(a.dateId))}</time>
          <ul>${a.notes.map(e=>`<li><p>${r(e.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function ot(t,a){let e=new Set;t.columns.forEach(n=>{[...n.specialDiets?.items||[],...n.sickDiets||[]].forEach(m=>{let o=D(m?.tag);/^\d{1,3}$/.test(o)&&e.add(o)})});let s=R(a).filter(n=>e.has(n.code));return s.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${r(i("kitchen.dietLegend.title"))}">
      <h3>${r(i("kitchen.dietLegend.title"))}</h3>
      <ul>${s.map(n=>`<li><strong class="diet-code-badge diet-code-tone-${T(n.code)}">${r(x(n.code))}</strong><span aria-hidden="true">=</span><span>${r(n.label)}</span></li>`).join("")}</ul>
    </section>
  `}function S(t){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${r(t)}</span>`}function Rt(t,a){return t.dayIndex>a.index?" summary-matrix-next-date":""}function zt(t){let a=/^([01]\d|2[0-3]):[0-5]\d$/.test(t.blessingTime||""),e=a&&Number(t.span)<2,s=a?e?" summary-mass-control-blessing-narrow":" summary-mass-control-blessing-wide":"",n=a?` mass-status-with-blessing${e?" mass-status-narrow":" mass-status-wide-blessing"}`:"",m=a?C(t.blessingTime,e?{narrow:!0}:{compact:!0}):"";return`
    <span class="summary-mass-control${s}">
      <span class="summary-mass-control-day">${r(lt(t.dayIndex))}</span>
      <span class="summary-mass-control-state mass-status-stack${n}">${Nt(t)}${m}</span>
    </span>`}function k(t,a){return`${Rt(t,a)} summary-day-tone-${mt(t.dayIndex)}`}function mt(t){return Math.max(0,Math.min(2,Number(t)||0))}function lt(t){return[i("summary.today"),i("summary.tomorrow"),i("summary.dayAfterTomorrow")][t]||i("summary.followingDay")}function w(t){let[a,e,s]=String(t).split("-").map(Number);return new Intl.DateTimeFormat(M(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(a,e-1,s))}function H(t){let[a,e,s]=String(t).split("-").map(Number);return!a||!e||!s?"":new Intl.DateTimeFormat(M(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(a,e-1,s))}function qt(t,a){let e=[...t.querySelectorAll(`[data-${a}-screen]`)];if(e.length===0)return 0;let s=e.reduce((n,m)=>Math.abs(m.getBoundingClientRect().left-t.getBoundingClientRect().left)<Math.abs(n.getBoundingClientRect().left-t.getBoundingClientRect().left)?m:n);return Number(s.dataset[`${a}Screen`])===1?1:0}function ut(t,a,e){t.querySelectorAll(`[data-${a}-screen]`).forEach(s=>{s.setAttribute("aria-hidden",String(Number(s.dataset[`${a}Screen`])!==e))})}export{Jt as mountSummaryMatrix,kt as scrollSummaryMatrix};

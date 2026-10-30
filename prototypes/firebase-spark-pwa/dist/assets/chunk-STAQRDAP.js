import{a as k}from"./chunk-TAP6D5VT.js";import{a as r}from"./chunk-JUUUUMHC.js";import{c as K}from"./chunk-7ZENLLVJ.js";import{e as x,f as i}from"./chunk-ODQCGOXC.js";import{a as v,c as H,d as D}from"./chunk-DZJEM4PC.js";import"./chunk-O2XFH626.js";var C="breakfast",q="STANDARD";function F(t,a=[],e=[]){return G(t,a,e,!0)}function W(t,a=[]){return G(t,[],a,!1)}function G(t,a,e,s){let n=Array.isArray(t)?t:[],l=Array.isArray(e)?e:[],m=new Map(l.map(y=>[y.dateId,y])),u=ct(a),o=ut(n),c=o.findIndex(y=>y.mealTypeId===C),$=c>=0?o.slice(c+1):o,p=c>=0?o.slice(0,c+1):[];return[0,1].map(y=>{let f=[...$.map(d=>R(n,y,d,m,u,s)),...p.map(d=>R(n,y+1,d,m,u,s))].filter(Boolean),h=gt(f);return{index:y,dateId:n[y]?.dateId||f[0]?.dateId||"",labelKey:y===0?"summary.today":"summary.tomorrow",label:y===0?"Oggi":"Domani",columns:f,dateGroups:h,hasGuestGroup:f.some(d=>d.guestCount>0),hasSpecialDiets:f.some(d=>d.specialDiets.participantCount>0),hasSickMeals:f.some(d=>d.sickCount>0),hasSickDiets:f.some(d=>d.sickDiets.length>0),hasMassInformation:h.length>0,notesByDate:h.map(d=>({dateId:d.dateId,notes:$t(m.get(d.dateId))})).filter(d=>d.notes.length>0)}})}function ut(t){let a=t.find(e=>Array.isArray(e.meals)&&e.meals.length>0);return a?a.meals.map(e=>({mealTypeId:e.mealTypeId,label:e.label})):[]}function ct(t){let a=new Map,e=s=>{s?.participantId&&a.set(s.participantId,{...a.get(s.participantId),...s})};return(Array.isArray(t)?t:[]).forEach(e),a}function R(t,a,e,s,n,l){let m=t[a];if(!m)return null;let u=m.meals?.find(g=>g.mealTypeId===e.mealTypeId)||{mealTypeId:e.mealTypeId,label:e.label,present:[]},o=s.get(m.dateId)||{},c=Array.isArray(u.present)?u.present:Array.isArray(u.dietParticipants)?u.dietParticipants:[],$=U(c,_(o),u.mealTypeId),p=Y(o),y=new Set(p.map(g=>g.participantId)),f=$.filter(g=>!y.has(g.participantId)),h=pt(o,u.mealTypeId,n,[...Array.isArray(u.participantDiets)?u.participantDiets:[],...Array.isArray(u.absent)?u.absent:[],...$]),d=Math.max(0,Math.floor(Number(u.count)||0)),j=Array.isArray(u.present)?f.length:Math.max(0,d-h.count),A=ht(o,u.mealTypeId);return{dayIndex:a,dateId:m.dateId,mealTypeId:u.mealTypeId,label:u.label,total:j+A,guestCount:A,specialDiets:dt(f),sickCount:h.count,sickDiets:h.diets,massStatus:yt(o.dailyOperation,u.mealTypeId),dayMassStatus:ft(o.dailyOperation),blessingTime:(o.dailyOperation?.dailyOperation||o.dailyOperation)?.blessingTime||"",breakfastPlanned:u.mealTypeId===C&&j+A+h.count>0,names:l?f.map(g=>({participantId:g.participantId,displayName:g.displayName,signature:g.signature||"",initials:g.initials||"",dietTags:T(g),phone:g.phone||"",phoneConsent:g.phoneConsent===!0,whatsappEnabled:g.whatsappEnabled===!0})):[]}}function U(t,a,e){let s=new Map;return(Array.isArray(a)?a:[]).forEach(n=>{let l=Array.isArray(n.mealTypeIds)?n.mealTypeIds:[];if(n.status==="REMOVED"||l.length>0&&!l.includes(e))return;let m=String(n.dietLabel||n.dietTag||"").trim();if(!n.participantId||!m)return;let u=s.get(n.participantId)||[];u.push(m),s.set(n.participantId,u)}),t.map(n=>{let l=s.get(n.participantId);return l?{...n,dietTags:[...new Set(l)]}:n})}function dt(t){let a=new Map,e=0;return t.forEach(s=>{let n=T(s);n.length!==0&&(e+=1,n.forEach(l=>a.set(l,(a.get(l)||0)+1)))}),{participantCount:e,items:[...a.entries()].map(([s,n])=>({tag:s,count:n}))}}function T(t){let a=Array.isArray(t.dietTags)?t.dietTags:[];return[...new Set(a.map(e=>String(e||"").trim()).filter(e=>e&&e.toUpperCase()!==q))]}function pt(t,a,e,s){let n=t?.dailyHealth||t,m=(Array.isArray(n?.sickMeals)?n.sickMeals:[]).find(p=>p.mealTypeId===a);if(m){let p=Array.isArray(m.dietLabels)?m.dietLabels:[];return{count:Math.max(0,Math.floor(Number(m.count)||0)),diets:z(p)}}let u=_(t),o=new Map((Array.isArray(s)?s:[]).map(p=>[p.participantId,p])),c=Y(t),$=[];return c.forEach(p=>{let y=o.get(p.participantId)||e.get(p.participantId)||p,[f]=U([y],u,a);T(f).forEach(h=>$.push(h))}),{count:c.length,diets:z($)}}function z(t){let a=new Map;return(Array.isArray(t)?t:[]).forEach(e=>{let s=String(e||"").trim();!s||s.toUpperCase()===q||a.set(s,(a.get(s)||0)+1)}),[...a.entries()].map(([e,s])=>({tag:e,count:s}))}function yt(t,a){let e=t?.dailyOperation||t,s=e?.massByMeal?.[a];return s==="YES"||s==="NO"?s:e&&typeof e.massScheduled=="boolean"?e.massScheduled?"YES":"NO":"UNKNOWN"}function ft(t){let a=t?.dailyOperation||t,e=Object.entries(a?.massByMeal||{}).filter(([s])=>s!==C).map(([,s])=>s);return e.includes("YES")?"YES":e.includes("NO")?"NO":a&&typeof a.massScheduled=="boolean"?a.massScheduled?"YES":"NO":"UNKNOWN"}function Y(t){let a=t?.dailyHealth||t;return Array.isArray(a?.sickPeople)?a.sickPeople:[]}function _(t){let a=t?.dailyHealth||t;return Array.isArray(t?.occasionalDiets)?t.occasionalDiets:Array.isArray(a?.dietAssignments)?a.dietAssignments:[]}function ht(t,a){let s=(t?.dailyHealth||t)?.invitedMeals||t?.invitedMeals||t?.dailyOperation?.invitedMeals||{};return Math.min(999,Math.max(0,Math.floor(Number(s[a])||0)))}function $t(t){return(Array.isArray(t?.notes)?t.notes:t?.note?[t.note]:[]).filter(e=>e&&e.status!=="REMOVED"&&e.text)}function gt(t){return t.reduce((a,e)=>{let s=a[a.length-1];return s&&s.dateId===e.dateId?(s.span+=1,a):(a.push({dayIndex:e.dayIndex,dateId:e.dateId,span:1}),a)},[])}var J=0;function Yt(t,{days:a=[],operationDays:e=[],kitchen:s=!1,layout:n="classic",residentLabel:l="name",dietLegend:m=[],showContactHint:u=!0,activeIndex:o=0,onActiveIndexChange:c=()=>{}}={}){let $=s?W(a,e):F(a,[],e);if(n==="future"&&!s){bt(t,$,l,o,c,u);return}if($.every(d=>d.columns.length===0)){t.innerHTML=`<p class="empty-state">${r(i("summary.noMeal"))}</p>`;return}let p=s?"kitchen":"summary",y=n==="international"?Ot:wt;t.innerHTML=`
    <div class="summary-matrix-track summary-layout-${n}${s?" summary-layout-kitchen":" summary-layout-diners"}" data-${p}-matrix-track aria-label="${r(i("summary.screensLabel"))}">
      ${$.map(d=>y(d,{kitchen:s,activeIndex:o,residentLabel:l,showContactHint:u,dietLegend:m})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${r(i("summary.swipeHint"))}</p>
  `;let f=t.querySelector(`[data-${p}-matrix-track]`),h=0;f.addEventListener("scroll",()=>{window.clearTimeout(h),h=window.setTimeout(()=>{let d=Kt(f,p);lt(t,p,d),c(d)},100)},{passive:!0}),window.requestAnimationFrame(()=>{It(t,o,{kitchen:s,smooth:!1})})}function bt(t,a,e,s=0,n=()=>{},l=!0){t.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${a.map(o=>`
        <article class="summary-future-card" data-summary-future-screen="${o.index}" aria-hidden="${o.index!==s}">
          <header class="summary-future-card-head">
            <div><strong>${r(i(o.labelKey))}</strong><time datetime="${r(o.dateId)}">${r(L(o.dateId))}</time></div>
            ${St(o)}
          </header>
          <div class="summary-future-meals">
            ${o.columns.map(c=>xt(c,e,l)).join("")}
          </div>
          ${B(o)}
        </article>
      `).join("")}
    </div>
  `;let m=t.querySelector("[data-summary-future-track]"),u=0;m?.addEventListener("scroll",()=>{window.clearTimeout(u),u=window.setTimeout(()=>{let o=Math.max(0,Math.min(1,Math.round(m.scrollLeft/Math.max(1,m.clientWidth+14))));m.querySelectorAll("[data-summary-future-screen]").forEach(c=>{c.setAttribute("aria-hidden",String(Number(c.dataset.summaryFutureScreen)!==o))}),n(o)},100)},{passive:!0}),window.requestAnimationFrame(()=>{m&&m.scrollTo({left:Math.max(0,s)*(m.clientWidth+14),behavior:"auto"})})}function xt(t,a,e=!0){let s=Array.isArray(t.names)?t.names:[],n=[...Array.isArray(t.specialDiets?.items)?t.specialDiets.items:[]].map(o=>b(o.tag)).filter(Boolean).sort((o,c)=>o.localeCompare(c,x(),{numeric:!0})),l=Number(t.guestCount||0),m=Number(t.sickCount||0),u=Array.isArray(t.sickDiets)?t.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${N(t.mealTypeId)}</span>
        <span class="summary-future-meal-name">${r(E(t,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${r(String(t.total||0))}</strong>
      </div>
      ${tt(t,e)}
      ${l>0?V("summary.guests",l,"guests"):""}
      ${n.length?`<p class="summary-future-diets"><span>${r(i("summary.diets"))}:</span> <strong>${r(n.join(", "))}</strong></p>`:""}
      ${m>0?V("summary.sickMeals",m,"sick"):""}
      ${u.length>0?`<div class="summary-future-special-row"><span>${r(i("summary.sickDiets"))}</span><div>${w(u," summary-future-diet-list")}</div></div>`:""}
      ${s.length?`<div class="summary-future-people">${s.map(o=>Mt(o,a)).join("")}</div>`:""}
    </section>
  `}function V(t,a,e){return e==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${r(String(a))}</strong><span>${r(i(t))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${r(e)}"><span>${r(i(t))}</span><strong>${r(String(a))}</strong></p>`}function Mt(t,a){let e=String(t.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(c=>c[0]).join("").toUpperCase(),s=a==="signature"?t.signature||t.displayName:a==="initials"?t.initials||e||t.signature:t.displayName,n=Array.isArray(t.dietTags)?t.dietTags.map(c=>b(c)).filter(Boolean):[],l=`${r(s||"–")}${n.length?`&nbsp;<small>(${r(n.join(", "))})</small>`:""}`,m=O(t.phone),u=t.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${r(m)}" aria-label="${r(i("summary.callPerson",{name:t.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",o=t.whatsappEnabled&&t.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(i("summary.messagePerson",{name:t.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(u||o){let c=`summary-contact-popup-${++J}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${c}" aria-haspopup="dialog" aria-label="${r(i("summary.contactPerson",{name:t.displayName}))}">${l}</button><span class="summary-matrix-contact-popover" id="${c}" popover role="dialog"><span class="summary-matrix-contact-actions">${u}${o}</span></span></span>`}return`<span class="summary-future-person" title="${r(t.displayName||s)}">${l}</span>`}function St(t){let a=t.columns.find(s=>s.dayIndex===t.index),e=a?.dayMassStatus;return!e||e==="UNKNOWN"?"":Q(e,a.blessingTime)}function Q(t,a=""){let e=t==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${e?"yes":"no"}"><span>${r(i("summary.mass"))}:</span><span class="mass-status-stack"><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${r(i(e?"summary.yes":"summary.no"))}</strong>${k(a)}</span></span>`}function It(t,a,{kitchen:e=!1,smooth:s=!0}={}){let n=e?"kitchen":"summary",l=Number(a)===1?1:0;if(!e){let o=t?.querySelector("[data-summary-future-track]");if(o)return o.scrollTo({left:l*(o.clientWidth+14),behavior:s?"smooth":"auto"}),o.querySelectorAll("[data-summary-future-screen]").forEach(c=>{c.setAttribute("aria-hidden",String(Number(c.dataset.summaryFutureScreen)!==l))}),!0}let m=t?.querySelector(`[data-${n}-matrix-track]`),u=m?.querySelector(`[data-${n}-screen="${l}"]`);return!m||!u?!1:(m.scrollTo({left:m.scrollLeft+u.getBoundingClientRect().left-m.getBoundingClientRect().left,behavior:s?"smooth":"auto"}),lt(t,n,l),!0)}function wt(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:n=!0,dietLegend:l=[]}){let m=a?"kitchen":"summary",u=t.index===e,o=At(t);return t.columns.length===0?`
      <section class="summary-matrix-screen" data-${m}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
        <p class="empty-state">${r(i("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${m}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      <table class="summary-matrix summary-matrix-optional-rows-${o}">
        ${kt(t,a)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${t.columns.map(c=>c.dayIndex>t.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${r(i("summary.item"))}</span></th>
            ${t.dateGroups.map(c=>`
              <th class="summary-matrix-date-heading${I(c,t)}" scope="colgroup" colspan="${c.span}">
                <span>${r(ot(c.dayIndex))}</span>
                <time datetime="${r(c.dateId)}">${r(P(c.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${t.columns.map(c=>`
              <th class="summary-matrix-meal-heading${I(c,t)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${N(c.mealTypeId)}</span><span class="summary-matrix-meal-label">${r(E(c))}</span>${Et(c,a)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${t.hasGuestGroup?S(i("summary.guests"),"summary-matrix-row-guests",t,c=>String(c.guestCount)):""}
          ${S(i("summary.diningMeals"),"summary-matrix-row-meals",t,X)}
          ${t.hasSpecialDiets?S(i("summary.includedDiets"),"summary-matrix-row-diets",t,a?rt:st):""}
          ${t.hasSickMeals?S(i("summary.sickMeals"),"summary-matrix-row-sick",t,at):""}
          ${t.hasSickDiets?S(i("summary.sickDiets"),"summary-matrix-row-sick-diets",t,et):""}
          ${t.hasMassInformation?Nt(t):""}
          ${a?"":Ct(t,s,n)}
        </tbody>
      </table>
      ${a?it(t,l):""}
      ${B(t)}
    </section>
  `}function At(t){return[t.hasGuestGroup,t.hasSickMeals,t.hasSickDiets].filter(Boolean).length}function kt(t,a){return a?`<caption class="sr-only">${r(`${i("kitchen.view.title")}: ${i(t.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${r(t.dateId)}">${r(L(t.dateId))}</time>
    </caption>
  `}function N(t){let a={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return vt({breakfast:"coffee",lunch:"sun",dinner:"moon"}[t],a[t]||"•")}function vt(t,a="•"){let e=document.documentElement.dataset.interfaceStyle;if(!(e==="cool"||e==="urban"||e==="future")||!t)return a;let l={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[t];return l?`<svg class="meal-line-icon meal-line-icon-${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${l}</svg>`:a}function E(t,{breakfastTomorrow:a=!1}={}){let e=String(t?.mealTypeId||"").trim().toLowerCase();if(a&&e==="breakfast")return i("summary.breakfastTomorrow");let s=e?i(`meal.type.${e}`):"",n=String(t?.label||"").trim();return s&&s!==`meal.type.${e}`?s:n}function S(t,a,e,s){return`
    <tr class="${a}">
      <th class="summary-matrix-label" scope="row">${r(t)}</th>
      ${e.columns.map(n=>`<td class="${I(n,e).trim()}">${s(n)}</td>`).join("")}
    </tr>
  `}function X(t,{contactHint:a=!1}={}){let e=t.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${t.total}</span><span class="summary-matrix-unit">${r(i(e))}</span>${a?tt(t):""}`}function Z(t){return Array.isArray(t?.names)&&t.names.some(a=>a?.phoneConsent&&O(a.phone))}function tt(t,a=!0){return!a||!Z(t)?"":`<small class="summary-contact-hint">${r(i("summary.contactHint"))}</small>`}function at(t){if(t.sickCount===0)return M(i("summary.sickMeals"));let a=t.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${t.sickCount}</span><span class="summary-matrix-unit">${r(i(a))}</span>`}function et(t){return t.sickDiets.length===0?M(i("summary.noDiet")):w(t.sickDiets)}function Dt(t){if(t.massStatus==="UNKNOWN")return M(i("summary.notSet"));let a=t.massStatus==="YES";return`<span class="summary-matrix-mass-${a?"yes":"no"}">${r(i(a?"summary.yes":"summary.no"))}</span>`}function Ct(t,a="name",e=!0){return`
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
        ${e&&t.columns.some(Z)?`<small class="summary-contact-hint">${r(i("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${r(i("summary.names"))}</span>
      </th>
      ${t.columns.map(n=>`<td class="${I(n,t).trim()}">${nt(n,{compactActions:!0,residentLabel:a})}</td>`).join("")}
    </tr>
  `}function Tt(t){return t==="YES"?" summary-mass-state-yes":t==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function Nt(t){let a=Lt(t).map(e=>`<td class="summary-matrix-mass-band${I(e,t)}${Tt(e.massStatus)}" colspan="${e.span}">${Ht(e)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${r(i("summary.mass"))}</th>
      ${a}
    </tr>
  `}function Et(t,a){if(a||t.mealTypeId!=="breakfast")return"";let e=t.breakfastPlanned===!0,s=i(e?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${e?"yes":"no"}"><span aria-hidden="true">${e?"✓":"×"}</span>${r(s)}</span>`}function st(t){if(t.specialDiets.participantCount===0)return M(i("summary.noDiet"));let a=[...t.specialDiets.items].sort((e,s)=>b(e.tag).localeCompare(b(s.tag),x(),{numeric:!0}));return w(a)}function rt(t){return t.specialDiets.participantCount===0?M(i("summary.noDiet")):w(t.specialDiets.items," summary-matrix-kitchen-diets")}function w(t,a=""){let e=[...t].sort((s,n)=>b(s.tag).localeCompare(b(n.tag),x(),{numeric:!0}));return`<ul class="summary-matrix-diets${a}">${e.map(s=>{let n=b(s.tag),l=Math.max(0,Math.floor(Number(s.count)||0)),m=l>1?`<span class="diet-code-count">× ${l}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${D(s.tag)}">${r(n)}</span>${m}</li>`}).join("")}</ul>`}function b(t){return H(v(t),i)}function nt(t,{compactActions:a=!1,residentLabel:e="name"}={}){return t.names.length===0?M(i("summary.noName")):`<ul class="summary-matrix-names">${t.names.map(s=>{let n=s.dietTags.map(h=>b(h)),l=O(s.phone),m=String(s.displayName||"").trim(),u=m.split(/\s+/).filter(Boolean).slice(0,3).map(h=>h[0]).join("").toUpperCase(),o=e==="signature"?s.signature||m:e==="initials"&&(s.initials||u||s.signature)||m,c=r(o),$=n.length?` <small>(${r(n.join(", "))})</small>`:"",p=`<span class="summary-matrix-person-name">${c}${$}</span>`,y=s.phoneConsent&&l?`<a class="summary-matrix-call" href="tel:${r(l)}" aria-label="${r(i("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",f=s.whatsappEnabled&&s.phoneConsent&&l?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(l.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(i("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(a&&(y||f)){let h=`summary-contact-popup-${++J}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${h}" aria-haspopup="dialog" aria-label="${r(i("summary.contactPerson",{name:s.displayName}))}" title="${r(i("summary.contactPerson",{name:s.displayName}))}">${p}</button>
            <span class="summary-matrix-contact-popover" id="${h}" popover role="dialog" aria-label="${r(i("summary.contactPerson",{name:s.displayName}))}">
              <span class="summary-matrix-contact-actions">${y}${f}</span>
            </span>
          </li>`}return`<li>${p}<span class="summary-matrix-contact-actions">${y}${f}</span></li>`}).join("")}</ul>`}function O(t){let a=String(t||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(a)?a:""}function Ot(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:n=!0,dietLegend:l=[]}){let m=a?"kitchen":"summary",u=t.index===e;return`
    <section class="summary-matrix-screen summary-international-screen${Bt(t)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${m}-screen="${t.index}" role="tabpanel" aria-hidden="${!u}">
      ${a?`<h2 class="sr-only">${r(`${i("kitchen.view.title")}: ${i(t.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${r(t.dateId)}">${r(L(t.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${t.columns.map((c,$,p)=>Pt(c,{kitchen:a,residentLabel:s,showContactHint:n,showMassMetadata:$===0||p[$-1]?.dateId!==c.dateId})).join("")}
      </div>
      ${a?it(t,l):""}
      ${B(t)}
    </section>
  `}function Bt(t){return t.columns.some(a=>a.guestCount>0||a.specialDiets.participantCount>0||a.sickCount>0||a.sickDiets.length>0)||t.notesByDate.length>0}function Pt(t,{kitchen:a,residentLabel:e="name",showContactHint:s=!0,showMassMetadata:n=!1}){let l=a?rt(t):st(t),m=n&&t.dayMassStatus!=="UNKNOWN"?Q(t.dayMassStatus,t.blessingTime):"",u=t.guestCount>0?`<span class="summary-international-mobile-guests">${r(i("summary.guests"))}: <strong>${t.guestCount}</strong></span>`:"",o=m||u?`<div class="summary-international-card-actions">${m}${u}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${mt(t.dayIndex)}${t.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${N(t.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${r(E(t,{breakfastTomorrow:!0}))}</strong><time datetime="${r(t.dateId)}">${r(P(t.dateId))}</time></div>
        ${o}
      </header>
      <dl>
        ${t.guestCount>0?`<div class="summary-international-guest-row"><dt>${r(i("summary.guests"))}</dt><dd>${t.guestCount}</dd></div>`:""}
        <div><dt>${r(i("summary.diningMeals"))}</dt><dd>${X(t,{contactHint:!a&&s})}</dd></div>
        ${t.specialDiets.participantCount>0?`<div><dt>${r(i("summary.includedDiets"))}</dt><dd>${l}</dd></div>`:""}
        ${t.sickCount>0?`<div><dt>${r(i("summary.sickMeals"))}</dt><dd>${at(t)}</dd></div>`:""}
        ${t.sickDiets.length>0?`<div><dt>${r(i("summary.sickDiets"))}</dt><dd>${et(t)}</dd></div>`:""}
      </dl>
      ${a?"":`<section class="summary-international-names"><h3>${r(i("summary.names"))}</h3>${nt(t,{compactActions:!0,residentLabel:e})}</section>`}
    </article>
  `}function Lt(t){return t.dateGroups.map(a=>{let e=t.columns.find(s=>s.dateId===a.dateId);return{...a,massStatus:e?.dayMassStatus||"UNKNOWN",blessingTime:e?.blessingTime||""}})}function B(t){return t.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${r(i("kitchen.notes.title"))}">
      <h3>${r(i("kitchen.notes.title"))}</h3>
      ${t.notesByDate.map(a=>`
        <div class="kitchen-notes-group">
          <time datetime="${r(a.dateId)}">${r(P(a.dateId))}</time>
          <ul>${a.notes.map(e=>`<li><p>${r(e.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function it(t,a){let e=new Set;t.columns.forEach(n=>{[...n.specialDiets?.items||[],...n.sickDiets||[]].forEach(l=>{let m=v(l?.tag);/^\d{1,3}$/.test(m)&&e.add(m)})});let s=K(a).filter(n=>e.has(n.code));return s.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${r(i("kitchen.dietLegend.title"))}">
      <h3>${r(i("kitchen.dietLegend.title"))}</h3>
      <ul>${s.map(n=>`<li><strong class="diet-code-badge diet-code-tone-${D(n.code)}">${r(b(n.code))}</strong><span aria-hidden="true">=</span><span>${r(n.label)}</span></li>`).join("")}</ul>
    </section>
  `}function M(t){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${r(t)}</span>`}function jt(t,a){return t.dayIndex>a.index?" summary-matrix-next-date":""}function Ht(t){return`
    <span class="summary-mass-control">
      <span class="summary-mass-control-day">${r(ot(t.dayIndex))}</span>
      <span class="summary-mass-control-state mass-status-stack">${Dt(t)}${k(t.blessingTime)}</span>
    </span>`}function I(t,a){return`${jt(t,a)} summary-day-tone-${mt(t.dayIndex)}`}function mt(t){return Math.max(0,Math.min(2,Number(t)||0))}function ot(t){return[i("summary.today"),i("summary.tomorrow"),i("summary.dayAfterTomorrow")][t]||i("summary.followingDay")}function P(t){let[a,e,s]=String(t).split("-").map(Number);return new Intl.DateTimeFormat(x(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(a,e-1,s))}function L(t){let[a,e,s]=String(t).split("-").map(Number);return!a||!e||!s?"":new Intl.DateTimeFormat(x(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(a,e-1,s))}function Kt(t,a){let e=[...t.querySelectorAll(`[data-${a}-screen]`)];if(e.length===0)return 0;let s=e.reduce((n,l)=>Math.abs(l.getBoundingClientRect().left-t.getBoundingClientRect().left)<Math.abs(n.getBoundingClientRect().left-t.getBoundingClientRect().left)?l:n);return Number(s.dataset[`${a}Screen`])===1?1:0}function lt(t,a,e){t.querySelectorAll(`[data-${a}-screen]`).forEach(s=>{s.setAttribute("aria-hidden",String(Number(s.dataset[`${a}Screen`])!==e))})}export{Yt as mountSummaryMatrix,It as scrollSummaryMatrix};

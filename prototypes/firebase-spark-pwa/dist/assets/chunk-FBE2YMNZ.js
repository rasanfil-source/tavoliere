import{a as n}from"./chunk-JUUUUMHC.js";import{c as j}from"./chunk-7ZENLLVJ.js";import{e as x,f as i}from"./chunk-6VU4LDKD.js";import{a as v,c as L,d as k}from"./chunk-DZJEM4PC.js";import"./chunk-O2XFH626.js";var D="breakfast",R="STANDARD";function z(t,a=[],e=[]){return F(t,a,e,!0)}function q(t,a=[]){return F(t,[],a,!1)}function F(t,a,e,s){let r=Array.isArray(t)?t:[],o=Array.isArray(e)?e:[],m=new Map(o.map(y=>[y.dateId,y])),c=ut(r,a),l=lt(r),u=l.findIndex(y=>y.mealTypeId===D),$=u>=0?l.slice(u+1):l,p=u>=0?l.slice(0,u+1):[];return[0,1].map(y=>{let f=[...$.map(d=>H(r,y,d,m,c,s)),...p.map(d=>H(r,y+1,d,m,c,s))].filter(Boolean),h=$t(f);return{index:y,dateId:r[y]?.dateId||f[0]?.dateId||"",labelKey:y===0?"summary.today":"summary.tomorrow",label:y===0?"Oggi":"Domani",columns:f,dateGroups:h,hasGuestGroup:f.some(d=>d.guestCount>0),hasSpecialDiets:f.some(d=>d.specialDiets.participantCount>0),hasSickMeals:f.some(d=>d.sickCount>0),hasSickDiets:f.some(d=>d.sickDiets.length>0),hasMassInformation:h.length>0,notesByDate:h.map(d=>({dateId:d.dateId,notes:ht(m.get(d.dateId))})).filter(d=>d.notes.length>0)}})}function lt(t){let a=t.find(e=>Array.isArray(e.meals)&&e.meals.length>0);return a?a.meals.map(e=>({mealTypeId:e.mealTypeId,label:e.label})):[]}function ut(t,a){let e=new Map,s=r=>{r?.participantId&&e.set(r.participantId,{...e.get(r.participantId),...r})};return(Array.isArray(a)?a:[]).forEach(s),t.forEach(r=>r.meals?.forEach(o=>{(Array.isArray(o.present)?o.present:[]).forEach(s),(Array.isArray(o.absent)?o.absent:[]).forEach(s),(Array.isArray(o.dietParticipants)?o.dietParticipants:[]).forEach(s)})),e}function H(t,a,e,s,r,o){let m=t[a];if(!m)return null;let c=m.meals?.find(g=>g.mealTypeId===e.mealTypeId)||{mealTypeId:e.mealTypeId,label:e.label,present:[]},l=s.get(m.dateId)||{},u=Array.isArray(c.present)?c.present:Array.isArray(c.dietParticipants)?c.dietParticipants:[],$=W(u,U(l),c.mealTypeId),p=G(l),y=new Set(p.map(g=>g.participantId)),f=$.filter(g=>!y.has(g.participantId)),h=dt(l,c.mealTypeId,r,$),d=Math.max(0,Math.floor(Number(c.count)||0)),O=Array.isArray(c.present)?f.length:Math.max(0,d-h.count),w=ft(l,c.mealTypeId);return{dayIndex:a,dateId:m.dateId,mealTypeId:c.mealTypeId,label:c.label,total:O+w,guestCount:w,specialDiets:ct(f),sickCount:h.count,sickDiets:h.diets,massStatus:pt(l.dailyOperation,c.mealTypeId),dayMassStatus:yt(l.dailyOperation),breakfastPlanned:c.mealTypeId===D&&O+w+h.count>0,names:o?f.map(g=>({participantId:g.participantId,displayName:g.displayName,signature:g.signature||"",initials:g.initials||"",dietTags:C(g),phone:g.phone||"",phoneConsent:g.phoneConsent===!0,whatsappEnabled:g.whatsappEnabled===!0})):[]}}function W(t,a,e){let s=new Map;return(Array.isArray(a)?a:[]).forEach(r=>{let o=Array.isArray(r.mealTypeIds)?r.mealTypeIds:[];if(r.status==="REMOVED"||o.length>0&&!o.includes(e))return;let m=String(r.dietLabel||r.dietTag||"").trim();if(!r.participantId||!m)return;let c=s.get(r.participantId)||[];c.push(m),s.set(r.participantId,c)}),t.map(r=>{let o=s.get(r.participantId);return o?{...r,dietTags:[...new Set(o)]}:r})}function ct(t){let a=new Map,e=0;return t.forEach(s=>{let r=C(s);r.length!==0&&(e+=1,r.forEach(o=>a.set(o,(a.get(o)||0)+1)))}),{participantCount:e,items:[...a.entries()].map(([s,r])=>({tag:s,count:r}))}}function C(t){let a=Array.isArray(t.dietTags)?t.dietTags:[];return[...new Set(a.map(e=>String(e||"").trim()).filter(e=>e&&e.toUpperCase()!==R))]}function dt(t,a,e,s){let r=t?.dailyHealth||t,m=(Array.isArray(r?.sickMeals)?r.sickMeals:[]).find(p=>p.mealTypeId===a);if(m){let p=Array.isArray(m.dietLabels)?m.dietLabels:[];return{count:Math.max(0,Math.floor(Number(m.count)||0)),diets:K(p)}}let c=U(t),l=new Map((Array.isArray(s)?s:[]).map(p=>[p.participantId,p])),u=G(t),$=[];return u.forEach(p=>{let y=l.get(p.participantId)||e.get(p.participantId)||p,[f]=W([y],c,a);C(f).forEach(h=>$.push(h))}),{count:u.length,diets:K($)}}function K(t){let a=new Map;return(Array.isArray(t)?t:[]).forEach(e=>{let s=String(e||"").trim();!s||s.toUpperCase()===R||a.set(s,(a.get(s)||0)+1)}),[...a.entries()].map(([e,s])=>({tag:e,count:s}))}function pt(t,a){let e=t?.dailyOperation||t,s=e?.massByMeal?.[a];return s==="YES"||s==="NO"?s:e&&typeof e.massScheduled=="boolean"?e.massScheduled?"YES":"NO":"UNKNOWN"}function yt(t){let a=t?.dailyOperation||t,e=Object.entries(a?.massByMeal||{}).filter(([s])=>s!==D).map(([,s])=>s);return e.includes("YES")?"YES":e.includes("NO")?"NO":a&&typeof a.massScheduled=="boolean"?a.massScheduled?"YES":"NO":"UNKNOWN"}function G(t){let a=t?.dailyHealth||t;return Array.isArray(a?.sickPeople)?a.sickPeople:[]}function U(t){let a=t?.dailyHealth||t;return Array.isArray(t?.occasionalDiets)?t.occasionalDiets:Array.isArray(a?.dietAssignments)?a.dietAssignments:[]}function ft(t,a){let s=(t?.dailyHealth||t)?.invitedMeals||t?.invitedMeals||t?.dailyOperation?.invitedMeals||{};return Math.min(999,Math.max(0,Math.floor(Number(s[a])||0)))}function ht(t){return(Array.isArray(t?.notes)?t.notes:t?.note?[t.note]:[]).filter(e=>e&&e.status!=="REMOVED"&&e.text)}function $t(t){return t.reduce((a,e)=>{let s=a[a.length-1];return s&&s.dateId===e.dateId?(s.span+=1,a):(a.push({dayIndex:e.dayIndex,dateId:e.dateId,span:1}),a)},[])}var _=0;function Gt(t,{days:a=[],operationDays:e=[],kitchen:s=!1,layout:r="classic",residentLabel:o="name",dietLegend:m=[],showContactHint:c=!0,activeIndex:l=0,onActiveIndexChange:u=()=>{}}={}){let $=s?q(a,e):z(a,[],e);if(r==="future"&&!s){gt(t,$,o,l,u,c);return}if($.every(d=>d.columns.length===0)){t.innerHTML=`<p class="empty-state">${n(i("summary.noMeal"))}</p>`;return}let p=s?"kitchen":"summary",y=r==="international"?Et:It;t.innerHTML=`
    <div class="summary-matrix-track summary-layout-${r}${s?" summary-layout-kitchen":" summary-layout-diners"}" data-${p}-matrix-track aria-label="${n(i("summary.screensLabel"))}">
      ${$.map(d=>y(d,{kitchen:s,activeIndex:l,residentLabel:o,showContactHint:c,dietLegend:m})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${n(i("summary.swipeHint"))}</p>
  `;let f=t.querySelector(`[data-${p}-matrix-track]`),h=0;f.addEventListener("scroll",()=>{window.clearTimeout(h),h=window.setTimeout(()=>{let d=Ht(f,p);mt(t,p,d),u(d)},100)},{passive:!0}),window.requestAnimationFrame(()=>{St(t,l,{kitchen:s,smooth:!1})})}function gt(t,a,e,s=0,r=()=>{},o=!0){t.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${a.map(l=>`
        <article class="summary-future-card" data-summary-future-screen="${l.index}" aria-hidden="${l.index!==s}">
          <header class="summary-future-card-head">
            <div><strong>${n(i(l.labelKey))}</strong><time datetime="${n(l.dateId)}">${n(B(l.dateId))}</time></div>
            ${Mt(l)}
          </header>
          <div class="summary-future-meals">
            ${l.columns.map(u=>bt(u,e,o)).join("")}
          </div>
        </article>
      `).join("")}
    </div>
  `;let m=t.querySelector("[data-summary-future-track]"),c=0;m?.addEventListener("scroll",()=>{window.clearTimeout(c),c=window.setTimeout(()=>{let l=Math.max(0,Math.min(1,Math.round(m.scrollLeft/Math.max(1,m.clientWidth+14))));m.querySelectorAll("[data-summary-future-screen]").forEach(u=>{u.setAttribute("aria-hidden",String(Number(u.dataset.summaryFutureScreen)!==l))}),r(l)},100)},{passive:!0}),window.requestAnimationFrame(()=>{m&&m.scrollTo({left:Math.max(0,s)*(m.clientWidth+14),behavior:"auto"})})}function bt(t,a,e=!0){let s=Array.isArray(t.names)?t.names:[],r=[...Array.isArray(t.specialDiets?.items)?t.specialDiets.items:[]].map(l=>b(l.tag)).filter(Boolean).sort((l,u)=>l.localeCompare(u,x(),{numeric:!0})),o=Number(t.guestCount||0),m=Number(t.sickCount||0),c=Array.isArray(t.sickDiets)?t.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${N(t.mealTypeId)}</span>
        <span class="summary-future-meal-name">${n(T(t,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${n(String(t.total||0))}</strong>
      </div>
      ${X(t,e)}
      ${o>0?Y("summary.guests",o,"guests"):""}
      ${r.length?`<p class="summary-future-diets"><span>${n(i("summary.diets"))}:</span> <strong>${n(r.join(", "))}</strong></p>`:""}
      ${m>0?Y("summary.sickMeals",m,"sick"):""}
      ${c.length>0?`<div class="summary-future-special-row"><span>${n(i("summary.sickDiets"))}</span><div>${A(c," summary-future-diet-list")}</div></div>`:""}
      ${s.length?`<div class="summary-future-people">${s.map(l=>xt(l,a)).join("")}</div>`:""}
    </section>
  `}function Y(t,a,e){return e==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${n(String(a))}</strong><span>${n(i(t))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${n(e)}"><span>${n(i(t))}</span><strong>${n(String(a))}</strong></p>`}function xt(t,a){let e=String(t.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(u=>u[0]).join("").toUpperCase(),s=a==="signature"?t.signature||t.displayName:a==="initials"?t.initials||e||t.signature:t.displayName,r=Array.isArray(t.dietTags)?t.dietTags.map(u=>b(u)).filter(Boolean):[],o=`${n(s||"–")}${r.length?`&nbsp;<small>(${n(r.join(", "))})</small>`:""}`,m=E(t.phone),c=t.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${n(m)}" aria-label="${n(i("summary.callPerson",{name:t.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",l=t.whatsappEnabled&&t.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${n(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${n(i("summary.messagePerson",{name:t.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(c||l){let u=`summary-contact-popup-${++_}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${u}" aria-haspopup="dialog" aria-label="${n(i("summary.contactPerson",{name:t.displayName}))}">${o}</button><span class="summary-matrix-contact-popover" id="${u}" popover role="dialog"><span class="summary-matrix-contact-actions">${c}${l}</span></span></span>`}return`<span class="summary-future-person" title="${n(t.displayName||s)}">${o}</span>`}function Mt(t){let a=t.columns.find(e=>e.dayIndex===t.index)?.dayMassStatus;return!a||a==="UNKNOWN"?"":V(a)}function V(t){let a=t==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${a?"yes":"no"}"><span>${n(i("summary.mass"))}:</span><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${n(i(a?"summary.yes":"summary.no"))}</strong></span>`}function St(t,a,{kitchen:e=!1,smooth:s=!0}={}){let r=e?"kitchen":"summary",o=Number(a)===1?1:0;if(!e){let l=t?.querySelector("[data-summary-future-track]");if(l)return l.scrollTo({left:o*(l.clientWidth+14),behavior:s?"smooth":"auto"}),l.querySelectorAll("[data-summary-future-screen]").forEach(u=>{u.setAttribute("aria-hidden",String(Number(u.dataset.summaryFutureScreen)!==o))}),!0}let m=t?.querySelector(`[data-${r}-matrix-track]`),c=m?.querySelector(`[data-${r}-screen="${o}"]`);return!m||!c?!1:(m.scrollTo({left:m.scrollLeft+c.getBoundingClientRect().left-m.getBoundingClientRect().left,behavior:s?"smooth":"auto"}),mt(t,r,o),!0)}function It(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:r=!0,dietLegend:o=[]}){let m=a?"kitchen":"summary",c=t.index===e,l=At(t);return t.columns.length===0?`
      <section class="summary-matrix-screen" data-${m}-screen="${t.index}" role="tabpanel" aria-hidden="${!c}">
        <p class="empty-state">${n(i("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${m}-screen="${t.index}" role="tabpanel" aria-hidden="${!c}">
      <table class="summary-matrix summary-matrix-optional-rows-${l}">
        ${wt(t,a)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${t.columns.map(u=>u.dayIndex>t.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${n(i("summary.item"))}</span></th>
            ${t.dateGroups.map(u=>`
              <th class="summary-matrix-date-heading${I(u,t)}" scope="colgroup" colspan="${u.span}">
                <span>${n(ot(u.dayIndex))}</span>
                <time datetime="${n(u.dateId)}">${n(P(u.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${t.columns.map(u=>`
              <th class="summary-matrix-meal-heading${I(u,t)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${N(u.mealTypeId)}</span><span class="summary-matrix-meal-label">${n(T(u))}</span>${Tt(u,a)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${t.hasGuestGroup?S(i("summary.guests"),"summary-matrix-row-guests",t,u=>String(u.guestCount)):""}
          ${S(i("summary.diningMeals"),"summary-matrix-row-meals",t,J)}
          ${t.hasSpecialDiets?S(i("summary.includedDiets"),"summary-matrix-row-diets",t,a?et:at):""}
          ${t.hasSickMeals?S(i("summary.sickMeals"),"summary-matrix-row-sick",t,Z):""}
          ${t.hasSickDiets?S(i("summary.sickDiets"),"summary-matrix-row-sick-diets",t,tt):""}
          ${t.hasMassInformation?Nt(t):""}
          ${a?"":Dt(t,s,r)}
        </tbody>
      </table>
      ${a?nt(t,o):""}
      ${a?rt(t):""}
    </section>
  `}function At(t){return[t.hasGuestGroup,t.hasSickMeals,t.hasSickDiets].filter(Boolean).length}function wt(t,a){return a?`<caption class="sr-only">${n(`${i("kitchen.view.title")}: ${i(t.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${n(t.dateId)}">${n(B(t.dateId))}</time>
    </caption>
  `}function N(t){let a={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return vt({breakfast:"coffee",lunch:"sun",dinner:"moon"}[t],a[t]||"•")}function vt(t,a="•"){let e=document.documentElement.dataset.interfaceStyle;if(!(e==="cool"||e==="urban"||e==="future")||!t)return a;let o={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[t];return o?`<svg class="meal-line-icon meal-line-icon-${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${o}</svg>`:a}function T(t,{breakfastTomorrow:a=!1}={}){let e=String(t?.mealTypeId||"").trim().toLowerCase();if(a&&e==="breakfast")return i("summary.breakfastTomorrow");let s=e?i(`meal.type.${e}`):"",r=String(t?.label||"").trim();return s&&s!==`meal.type.${e}`?s:r}function S(t,a,e,s){return`
    <tr class="${a}">
      <th class="summary-matrix-label" scope="row">${n(t)}</th>
      ${e.columns.map(r=>`<td class="${I(r,e).trim()}">${s(r)}</td>`).join("")}
    </tr>
  `}function J(t,{contactHint:a=!1}={}){let e=t.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${t.total}</span><span class="summary-matrix-unit">${n(i(e))}</span>${a?X(t):""}`}function Q(t){return Array.isArray(t?.names)&&t.names.some(a=>a?.phoneConsent&&E(a.phone))}function X(t,a=!0){return!a||!Q(t)?"":`<small class="summary-contact-hint">${n(i("summary.contactHint"))}</small>`}function Z(t){if(t.sickCount===0)return M(i("summary.sickMeals"));let a=t.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${t.sickCount}</span><span class="summary-matrix-unit">${n(i(a))}</span>`}function tt(t){return t.sickDiets.length===0?M(i("summary.noDiet")):A(t.sickDiets)}function kt(t){if(t.massStatus==="UNKNOWN")return M(i("summary.notSet"));let a=t.massStatus==="YES";return`<span class="summary-matrix-mass-${a?"yes":"no"}">${n(i(a?"summary.yes":"summary.no"))}</span>`}function Dt(t,a="name",e=!0){return`
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
        ${e&&t.columns.some(Q)?`<small class="summary-contact-hint">${n(i("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${n(i("summary.names"))}</span>
      </th>
      ${t.columns.map(r=>`<td class="${I(r,t).trim()}">${st(r,{compactActions:!0,residentLabel:a})}</td>`).join("")}
    </tr>
  `}function Ct(t){return t==="YES"?" summary-mass-state-yes":t==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function Nt(t){let a=Ot(t).map(e=>`<td class="summary-matrix-mass-band${I(e,t)}${Ct(e.massStatus)}" colspan="${e.span}">${jt(e)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${n(i("summary.mass"))}</th>
      ${a}
    </tr>
  `}function Tt(t,a){if(a||t.mealTypeId!=="breakfast")return"";let e=t.breakfastPlanned===!0,s=i(e?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${e?"yes":"no"}"><span aria-hidden="true">${e?"✓":"×"}</span>${n(s)}</span>`}function at(t){if(t.specialDiets.participantCount===0)return M(i("summary.noDiet"));let a=[...t.specialDiets.items].sort((e,s)=>b(e.tag).localeCompare(b(s.tag),x(),{numeric:!0}));return A(a)}function et(t){return t.specialDiets.participantCount===0?M(i("summary.noDiet")):A(t.specialDiets.items," summary-matrix-kitchen-diets")}function A(t,a=""){let e=[...t].sort((s,r)=>b(s.tag).localeCompare(b(r.tag),x(),{numeric:!0}));return`<ul class="summary-matrix-diets${a}">${e.map(s=>{let r=b(s.tag),o=Math.max(0,Math.floor(Number(s.count)||0)),m=o>1?`<span class="diet-code-count">× ${o}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${k(s.tag)}">${n(r)}</span>${m}</li>`}).join("")}</ul>`}function b(t){return L(v(t),i)}function st(t,{compactActions:a=!1,residentLabel:e="name"}={}){return t.names.length===0?M(i("summary.noName")):`<ul class="summary-matrix-names">${t.names.map(s=>{let r=s.dietTags.map(h=>b(h)),o=E(s.phone),m=String(s.displayName||"").trim(),c=m.split(/\s+/).filter(Boolean).slice(0,3).map(h=>h[0]).join("").toUpperCase(),l=e==="signature"?s.signature||m:e==="initials"&&(s.initials||c||s.signature)||m,u=n(l),$=r.length?` <small>(${n(r.join(", "))})</small>`:"",p=`<span class="summary-matrix-person-name">${u}${$}</span>`,y=s.phoneConsent&&o?`<a class="summary-matrix-call" href="tel:${n(o)}" aria-label="${n(i("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",f=s.whatsappEnabled&&s.phoneConsent&&o?`<a class="summary-matrix-whatsapp" href="https://wa.me/${n(o.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${n(i("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(a&&(y||f)){let h=`summary-contact-popup-${++_}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${h}" aria-haspopup="dialog" aria-label="${n(i("summary.contactPerson",{name:s.displayName}))}" title="${n(i("summary.contactPerson",{name:s.displayName}))}">${p}</button>
            <span class="summary-matrix-contact-popover" id="${h}" popover role="dialog" aria-label="${n(i("summary.contactPerson",{name:s.displayName}))}">
              <span class="summary-matrix-contact-actions">${y}${f}</span>
            </span>
          </li>`}return`<li>${p}<span class="summary-matrix-contact-actions">${y}${f}</span></li>`}).join("")}</ul>`}function E(t){let a=String(t||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(a)?a:""}function Et(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:r=!0,dietLegend:o=[]}){let m=a?"kitchen":"summary",c=t.index===e;return`
    <section class="summary-matrix-screen summary-international-screen${Pt(t)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${m}-screen="${t.index}" role="tabpanel" aria-hidden="${!c}">
      ${a?`<h2 class="sr-only">${n(`${i("kitchen.view.title")}: ${i(t.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${n(t.dateId)}">${n(B(t.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${t.columns.map((u,$,p)=>Bt(u,{kitchen:a,residentLabel:s,showContactHint:r,showMassMetadata:$===0||p[$-1]?.dateId!==u.dateId})).join("")}
      </div>
      ${a?nt(t,o):""}
      ${a?rt(t):""}
    </section>
  `}function Pt(t){return t.columns.some(a=>a.guestCount>0||a.specialDiets.participantCount>0||a.sickCount>0||a.sickDiets.length>0)||t.notesByDate.length>0}function Bt(t,{kitchen:a,residentLabel:e="name",showContactHint:s=!0,showMassMetadata:r=!1}){let o=a?et(t):at(t),m=r&&t.dayMassStatus!=="UNKNOWN"?V(t.dayMassStatus):"",c=t.guestCount>0?`<span class="summary-international-mobile-guests">${n(i("summary.guests"))}: <strong>${t.guestCount}</strong></span>`:"",l=m||c?`<div class="summary-international-card-actions">${m}${c}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${it(t.dayIndex)}${t.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${N(t.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${n(T(t,{breakfastTomorrow:!0}))}</strong><time datetime="${n(t.dateId)}">${n(P(t.dateId))}</time></div>
        ${l}
      </header>
      <dl>
        ${t.guestCount>0?`<div class="summary-international-guest-row"><dt>${n(i("summary.guests"))}</dt><dd>${t.guestCount}</dd></div>`:""}
        <div><dt>${n(i("summary.diningMeals"))}</dt><dd>${J(t,{contactHint:!a&&s})}</dd></div>
        ${t.specialDiets.participantCount>0?`<div><dt>${n(i("summary.includedDiets"))}</dt><dd>${o}</dd></div>`:""}
        ${t.sickCount>0?`<div><dt>${n(i("summary.sickMeals"))}</dt><dd>${Z(t)}</dd></div>`:""}
        ${t.sickDiets.length>0?`<div><dt>${n(i("summary.sickDiets"))}</dt><dd>${tt(t)}</dd></div>`:""}
      </dl>
      ${a?"":`<section class="summary-international-names"><h3>${n(i("summary.names"))}</h3>${st(t,{compactActions:!0,residentLabel:e})}</section>`}
    </article>
  `}function Ot(t){return t.dateGroups.map(a=>{let e=t.columns.find(s=>s.dateId===a.dateId);return{...a,massStatus:e?.dayMassStatus||"UNKNOWN"}})}function rt(t){return t.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${n(i("kitchen.notes.title"))}">
      <h3>${n(i("kitchen.notes.title"))}</h3>
      ${t.notesByDate.map(a=>`
        <div class="kitchen-notes-group">
          <time datetime="${n(a.dateId)}">${n(P(a.dateId))}</time>
          <ul>${a.notes.map(e=>`<li><p>${n(e.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function nt(t,a){let e=new Set;t.columns.forEach(r=>{[...r.specialDiets?.items||[],...r.sickDiets||[]].forEach(o=>{let m=v(o?.tag);/^\d{1,3}$/.test(m)&&e.add(m)})});let s=j(a).filter(r=>e.has(r.code));return s.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${n(i("kitchen.dietLegend.title"))}">
      <h3>${n(i("kitchen.dietLegend.title"))}</h3>
      <ul>${s.map(r=>`<li><strong class="diet-code-badge diet-code-tone-${k(r.code)}">${n(b(r.code))}</strong><span aria-hidden="true">=</span><span>${n(r.label)}</span></li>`).join("")}</ul>
    </section>
  `}function M(t){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${n(t)}</span>`}function Lt(t,a){return t.dayIndex>a.index?" summary-matrix-next-date":""}function jt(t){return`
    <span class="summary-mass-control">
      <span class="summary-mass-control-day">${n(ot(t.dayIndex))}</span>
      <span class="summary-mass-control-state">${kt(t)}</span>
    </span>`}function I(t,a){return`${Lt(t,a)} summary-day-tone-${it(t.dayIndex)}`}function it(t){return Math.max(0,Math.min(2,Number(t)||0))}function ot(t){return[i("summary.today"),i("summary.tomorrow"),i("summary.dayAfterTomorrow")][t]||i("summary.followingDay")}function P(t){let[a,e,s]=String(t).split("-").map(Number);return new Intl.DateTimeFormat(x(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(a,e-1,s))}function B(t){let[a,e,s]=String(t).split("-").map(Number);return!a||!e||!s?"":new Intl.DateTimeFormat(x(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(a,e-1,s))}function Ht(t,a){let e=[...t.querySelectorAll(`[data-${a}-screen]`)];if(e.length===0)return 0;let s=e.reduce((r,o)=>Math.abs(o.getBoundingClientRect().left-t.getBoundingClientRect().left)<Math.abs(r.getBoundingClientRect().left-t.getBoundingClientRect().left)?o:r);return Number(s.dataset[`${a}Screen`])===1?1:0}function mt(t,a,e){t.querySelectorAll(`[data-${a}-screen]`).forEach(s=>{s.setAttribute("aria-hidden",String(Number(s.dataset[`${a}Screen`])!==e))})}export{Gt as mountSummaryMatrix,St as scrollSummaryMatrix};

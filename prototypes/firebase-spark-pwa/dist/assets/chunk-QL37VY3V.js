import{a as r}from"./chunk-JUUUUMHC.js";import{c as H}from"./chunk-7ZENLLVJ.js";import{e as x,f as i}from"./chunk-DGUTLQW5.js";import{a as k,c as j,d as v}from"./chunk-DZJEM4PC.js";import"./chunk-O2XFH626.js";var D="breakfast",z="STANDARD";function q(t,a=[],e=[]){return W(t,a,e,!0)}function F(t,a=[]){return W(t,[],a,!1)}function W(t,a,e,s){let n=Array.isArray(t)?t:[],o=Array.isArray(e)?e:[],m=new Map(o.map(y=>[y.dateId,y])),l=ut(a),u=lt(n),c=u.findIndex(y=>y.mealTypeId===D),$=c>=0?u.slice(c+1):u,p=c>=0?u.slice(0,c+1):[];return[0,1].map(y=>{let f=[...$.map(d=>K(n,y,d,m,l,s)),...p.map(d=>K(n,y+1,d,m,l,s))].filter(Boolean),h=$t(f);return{index:y,dateId:n[y]?.dateId||f[0]?.dateId||"",labelKey:y===0?"summary.today":"summary.tomorrow",label:y===0?"Oggi":"Domani",columns:f,dateGroups:h,hasGuestGroup:f.some(d=>d.guestCount>0),hasSpecialDiets:f.some(d=>d.specialDiets.participantCount>0),hasSickMeals:f.some(d=>d.sickCount>0),hasSickDiets:f.some(d=>d.sickDiets.length>0),hasMassInformation:h.length>0,notesByDate:h.map(d=>({dateId:d.dateId,notes:ht(m.get(d.dateId))})).filter(d=>d.notes.length>0)}})}function lt(t){let a=t.find(e=>Array.isArray(e.meals)&&e.meals.length>0);return a?a.meals.map(e=>({mealTypeId:e.mealTypeId,label:e.label})):[]}function ut(t){let a=new Map,e=s=>{s?.participantId&&a.set(s.participantId,{...a.get(s.participantId),...s})};return(Array.isArray(t)?t:[]).forEach(e),a}function K(t,a,e,s,n,o){let m=t[a];if(!m)return null;let l=m.meals?.find(g=>g.mealTypeId===e.mealTypeId)||{mealTypeId:e.mealTypeId,label:e.label,present:[]},u=s.get(m.dateId)||{},c=Array.isArray(l.present)?l.present:Array.isArray(l.dietParticipants)?l.dietParticipants:[],$=G(c,Y(u),l.mealTypeId),p=U(u),y=new Set(p.map(g=>g.participantId)),f=$.filter(g=>!y.has(g.participantId)),h=dt(u,l.mealTypeId,n,[...Array.isArray(l.participantDiets)?l.participantDiets:[],...Array.isArray(l.absent)?l.absent:[],...$]),d=Math.max(0,Math.floor(Number(l.count)||0)),L=Array.isArray(l.present)?f.length:Math.max(0,d-h.count),A=ft(u,l.mealTypeId);return{dayIndex:a,dateId:m.dateId,mealTypeId:l.mealTypeId,label:l.label,total:L+A,guestCount:A,specialDiets:ct(f),sickCount:h.count,sickDiets:h.diets,massStatus:pt(u.dailyOperation,l.mealTypeId),dayMassStatus:yt(u.dailyOperation),breakfastPlanned:l.mealTypeId===D&&L+A+h.count>0,names:o?f.map(g=>({participantId:g.participantId,displayName:g.displayName,signature:g.signature||"",initials:g.initials||"",dietTags:C(g),phone:g.phone||"",phoneConsent:g.phoneConsent===!0,whatsappEnabled:g.whatsappEnabled===!0})):[]}}function G(t,a,e){let s=new Map;return(Array.isArray(a)?a:[]).forEach(n=>{let o=Array.isArray(n.mealTypeIds)?n.mealTypeIds:[];if(n.status==="REMOVED"||o.length>0&&!o.includes(e))return;let m=String(n.dietLabel||n.dietTag||"").trim();if(!n.participantId||!m)return;let l=s.get(n.participantId)||[];l.push(m),s.set(n.participantId,l)}),t.map(n=>{let o=s.get(n.participantId);return o?{...n,dietTags:[...new Set(o)]}:n})}function ct(t){let a=new Map,e=0;return t.forEach(s=>{let n=C(s);n.length!==0&&(e+=1,n.forEach(o=>a.set(o,(a.get(o)||0)+1)))}),{participantCount:e,items:[...a.entries()].map(([s,n])=>({tag:s,count:n}))}}function C(t){let a=Array.isArray(t.dietTags)?t.dietTags:[];return[...new Set(a.map(e=>String(e||"").trim()).filter(e=>e&&e.toUpperCase()!==z))]}function dt(t,a,e,s){let n=t?.dailyHealth||t,m=(Array.isArray(n?.sickMeals)?n.sickMeals:[]).find(p=>p.mealTypeId===a);if(m){let p=Array.isArray(m.dietLabels)?m.dietLabels:[];return{count:Math.max(0,Math.floor(Number(m.count)||0)),diets:R(p)}}let l=Y(t),u=new Map((Array.isArray(s)?s:[]).map(p=>[p.participantId,p])),c=U(t),$=[];return c.forEach(p=>{let y=u.get(p.participantId)||e.get(p.participantId)||p,[f]=G([y],l,a);C(f).forEach(h=>$.push(h))}),{count:c.length,diets:R($)}}function R(t){let a=new Map;return(Array.isArray(t)?t:[]).forEach(e=>{let s=String(e||"").trim();!s||s.toUpperCase()===z||a.set(s,(a.get(s)||0)+1)}),[...a.entries()].map(([e,s])=>({tag:e,count:s}))}function pt(t,a){let e=t?.dailyOperation||t,s=e?.massByMeal?.[a];return s==="YES"||s==="NO"?s:e&&typeof e.massScheduled=="boolean"?e.massScheduled?"YES":"NO":"UNKNOWN"}function yt(t){let a=t?.dailyOperation||t,e=Object.entries(a?.massByMeal||{}).filter(([s])=>s!==D).map(([,s])=>s);return e.includes("YES")?"YES":e.includes("NO")?"NO":a&&typeof a.massScheduled=="boolean"?a.massScheduled?"YES":"NO":"UNKNOWN"}function U(t){let a=t?.dailyHealth||t;return Array.isArray(a?.sickPeople)?a.sickPeople:[]}function Y(t){let a=t?.dailyHealth||t;return Array.isArray(t?.occasionalDiets)?t.occasionalDiets:Array.isArray(a?.dietAssignments)?a.dietAssignments:[]}function ft(t,a){let s=(t?.dailyHealth||t)?.invitedMeals||t?.invitedMeals||t?.dailyOperation?.invitedMeals||{};return Math.min(999,Math.max(0,Math.floor(Number(s[a])||0)))}function ht(t){return(Array.isArray(t?.notes)?t.notes:t?.note?[t.note]:[]).filter(e=>e&&e.status!=="REMOVED"&&e.text)}function $t(t){return t.reduce((a,e)=>{let s=a[a.length-1];return s&&s.dateId===e.dateId?(s.span+=1,a):(a.push({dayIndex:e.dayIndex,dateId:e.dateId,span:1}),a)},[])}var V=0;function Gt(t,{days:a=[],operationDays:e=[],kitchen:s=!1,layout:n="classic",residentLabel:o="name",dietLegend:m=[],showContactHint:l=!0,activeIndex:u=0,onActiveIndexChange:c=()=>{}}={}){let $=s?F(a,e):q(a,[],e);if(n==="future"&&!s){gt(t,$,o,u,c,l);return}if($.every(d=>d.columns.length===0)){t.innerHTML=`<p class="empty-state">${r(i("summary.noMeal"))}</p>`;return}let p=s?"kitchen":"summary",y=n==="international"?Et:It;t.innerHTML=`
    <div class="summary-matrix-track summary-layout-${n}${s?" summary-layout-kitchen":" summary-layout-diners"}" data-${p}-matrix-track aria-label="${r(i("summary.screensLabel"))}">
      ${$.map(d=>y(d,{kitchen:s,activeIndex:u,residentLabel:o,showContactHint:l,dietLegend:m})).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${r(i("summary.swipeHint"))}</p>
  `;let f=t.querySelector(`[data-${p}-matrix-track]`),h=0;f.addEventListener("scroll",()=>{window.clearTimeout(h),h=window.setTimeout(()=>{let d=Ht(f,p);ot(t,p,d),c(d)},100)},{passive:!0}),window.requestAnimationFrame(()=>{St(t,u,{kitchen:s,smooth:!1})})}function gt(t,a,e,s=0,n=()=>{},o=!0){t.innerHTML=`
    <div class="summary-future-grid" data-summary-future-track>
      ${a.map(u=>`
        <article class="summary-future-card" data-summary-future-screen="${u.index}" aria-hidden="${u.index!==s}">
          <header class="summary-future-card-head">
            <div><strong>${r(i(u.labelKey))}</strong><time datetime="${r(u.dateId)}">${r(P(u.dateId))}</time></div>
            ${Mt(u)}
          </header>
          <div class="summary-future-meals">
            ${u.columns.map(c=>bt(c,e,o)).join("")}
          </div>
          ${B(u)}
        </article>
      `).join("")}
    </div>
  `;let m=t.querySelector("[data-summary-future-track]"),l=0;m?.addEventListener("scroll",()=>{window.clearTimeout(l),l=window.setTimeout(()=>{let u=Math.max(0,Math.min(1,Math.round(m.scrollLeft/Math.max(1,m.clientWidth+14))));m.querySelectorAll("[data-summary-future-screen]").forEach(c=>{c.setAttribute("aria-hidden",String(Number(c.dataset.summaryFutureScreen)!==u))}),n(u)},100)},{passive:!0}),window.requestAnimationFrame(()=>{m&&m.scrollTo({left:Math.max(0,s)*(m.clientWidth+14),behavior:"auto"})})}function bt(t,a,e=!0){let s=Array.isArray(t.names)?t.names:[],n=[...Array.isArray(t.specialDiets?.items)?t.specialDiets.items:[]].map(u=>b(u.tag)).filter(Boolean).sort((u,c)=>u.localeCompare(c,x(),{numeric:!0})),o=Number(t.guestCount||0),m=Number(t.sickCount||0),l=Array.isArray(t.sickDiets)?t.sickDiets:[];return`
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${N(t.mealTypeId)}</span>
        <span class="summary-future-meal-name">${r(T(t,{breakfastTomorrow:!0}))}</span>
        <strong class="summary-future-meal-total">${r(String(t.total||0))}</strong>
      </div>
      ${Z(t,e)}
      ${o>0?_("summary.guests",o,"guests"):""}
      ${n.length?`<p class="summary-future-diets"><span>${r(i("summary.diets"))}:</span> <strong>${r(n.join(", "))}</strong></p>`:""}
      ${m>0?_("summary.sickMeals",m,"sick"):""}
      ${l.length>0?`<div class="summary-future-special-row"><span>${r(i("summary.sickDiets"))}</span><div>${w(l," summary-future-diet-list")}</div></div>`:""}
      ${s.length?`<div class="summary-future-people">${s.map(u=>xt(u,a)).join("")}</div>`:""}
    </section>
  `}function _(t,a,e){return e==="guests"?`<p class="summary-future-metric summary-future-metric-guests"><strong>${r(String(a))}</strong><span>${r(i(t))}</span></p>`:`<p class="summary-future-metric summary-future-metric-${r(e)}"><span>${r(i(t))}</span><strong>${r(String(a))}</strong></p>`}function xt(t,a){let e=String(t.displayName||"").trim().split(/\s+/).filter(Boolean).slice(0,3).map(c=>c[0]).join("").toUpperCase(),s=a==="signature"?t.signature||t.displayName:a==="initials"?t.initials||e||t.signature:t.displayName,n=Array.isArray(t.dietTags)?t.dietTags.map(c=>b(c)).filter(Boolean):[],o=`${r(s||"–")}${n.length?`&nbsp;<small>(${r(n.join(", "))})</small>`:""}`,m=E(t.phone),l=t.phoneConsent&&m?`<a class="summary-matrix-call" href="tel:${r(m)}" aria-label="${r(i("summary.callPerson",{name:t.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",u=t.whatsappEnabled&&t.phoneConsent&&m?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(m.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(i("summary.messagePerson",{name:t.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(l||u){let c=`summary-contact-popup-${++V}`;return`<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${c}" aria-haspopup="dialog" aria-label="${r(i("summary.contactPerson",{name:t.displayName}))}">${o}</button><span class="summary-matrix-contact-popover" id="${c}" popover role="dialog"><span class="summary-matrix-contact-actions">${l}${u}</span></span></span>`}return`<span class="summary-future-person" title="${r(t.displayName||s)}">${o}</span>`}function Mt(t){let a=t.columns.find(e=>e.dayIndex===t.index)?.dayMassStatus;return!a||a==="UNKNOWN"?"":J(a)}function J(t){let a=t==="YES";return`<span class="summary-mass-metadata summary-mass-metadata-${a?"yes":"no"}"><span>${r(i("summary.mass"))}:</span><span class="summary-mass-metadata-dot" aria-hidden="true"></span><strong>${r(i(a?"summary.yes":"summary.no"))}</strong></span>`}function St(t,a,{kitchen:e=!1,smooth:s=!0}={}){let n=e?"kitchen":"summary",o=Number(a)===1?1:0;if(!e){let u=t?.querySelector("[data-summary-future-track]");if(u)return u.scrollTo({left:o*(u.clientWidth+14),behavior:s?"smooth":"auto"}),u.querySelectorAll("[data-summary-future-screen]").forEach(c=>{c.setAttribute("aria-hidden",String(Number(c.dataset.summaryFutureScreen)!==o))}),!0}let m=t?.querySelector(`[data-${n}-matrix-track]`),l=m?.querySelector(`[data-${n}-screen="${o}"]`);return!m||!l?!1:(m.scrollTo({left:m.scrollLeft+l.getBoundingClientRect().left-m.getBoundingClientRect().left,behavior:s?"smooth":"auto"}),ot(t,n,o),!0)}function It(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:n=!0,dietLegend:o=[]}){let m=a?"kitchen":"summary",l=t.index===e,u=wt(t);return t.columns.length===0?`
      <section class="summary-matrix-screen" data-${m}-screen="${t.index}" role="tabpanel" aria-hidden="${!l}">
        <p class="empty-state">${r(i("summary.noMeal"))}</p>
      </section>
    `:`
    <section class="summary-matrix-screen" data-${m}-screen="${t.index}" role="tabpanel" aria-hidden="${!l}">
      <table class="summary-matrix summary-matrix-optional-rows-${u}">
        ${At(t,a)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${t.columns.map(c=>c.dayIndex>t.index?'<col class="summary-matrix-next-date-column">':"<col>").join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${r(i("summary.item"))}</span></th>
            ${t.dateGroups.map(c=>`
              <th class="summary-matrix-date-heading${I(c,t)}" scope="colgroup" colspan="${c.span}">
                <span>${r(mt(c.dayIndex))}</span>
                <time datetime="${r(c.dateId)}">${r(O(c.dateId))}</time>
              </th>
            `).join("")}
          </tr>
          <tr>
            ${t.columns.map(c=>`
              <th class="summary-matrix-meal-heading${I(c,t)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${N(c.mealTypeId)}</span><span class="summary-matrix-meal-label">${r(T(c))}</span>${Tt(c,a)}</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${t.hasGuestGroup?S(i("summary.guests"),"summary-matrix-row-guests",t,c=>String(c.guestCount)):""}
          ${S(i("summary.diningMeals"),"summary-matrix-row-meals",t,Q)}
          ${t.hasSpecialDiets?S(i("summary.includedDiets"),"summary-matrix-row-diets",t,a?st:et):""}
          ${t.hasSickMeals?S(i("summary.sickMeals"),"summary-matrix-row-sick",t,tt):""}
          ${t.hasSickDiets?S(i("summary.sickDiets"),"summary-matrix-row-sick-diets",t,at):""}
          ${t.hasMassInformation?Nt(t):""}
          ${a?"":Dt(t,s,n)}
        </tbody>
      </table>
      ${a?nt(t,o):""}
      ${B(t)}
    </section>
  `}function wt(t){return[t.hasGuestGroup,t.hasSickMeals,t.hasSickDiets].filter(Boolean).length}function At(t,a){return a?`<caption class="sr-only">${r(`${i("kitchen.view.title")}: ${i(t.labelKey)}`)}</caption>`:`
    <caption class="summary-matrix-caption">
      <time datetime="${r(t.dateId)}">${r(P(t.dateId))}</time>
    </caption>
  `}function N(t){let a={breakfast:"☕",lunch:"🍝",dinner:"🍲"};return kt({breakfast:"coffee",lunch:"sun",dinner:"moon"}[t],a[t]||"•")}function kt(t,a="•"){let e=document.documentElement.dataset.interfaceStyle;if(!(e==="cool"||e==="urban"||e==="future")||!t)return a;let o={coffee:'<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'}[t];return o?`<svg class="meal-line-icon meal-line-icon-${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${o}</svg>`:a}function T(t,{breakfastTomorrow:a=!1}={}){let e=String(t?.mealTypeId||"").trim().toLowerCase();if(a&&e==="breakfast")return i("summary.breakfastTomorrow");let s=e?i(`meal.type.${e}`):"",n=String(t?.label||"").trim();return s&&s!==`meal.type.${e}`?s:n}function S(t,a,e,s){return`
    <tr class="${a}">
      <th class="summary-matrix-label" scope="row">${r(t)}</th>
      ${e.columns.map(n=>`<td class="${I(n,e).trim()}">${s(n)}</td>`).join("")}
    </tr>
  `}function Q(t,{contactHint:a=!1}={}){let e=t.total===1?"summary.cover.one":"summary.cover.other";return`<span class="summary-matrix-total">${t.total}</span><span class="summary-matrix-unit">${r(i(e))}</span>${a?Z(t):""}`}function X(t){return Array.isArray(t?.names)&&t.names.some(a=>a?.phoneConsent&&E(a.phone))}function Z(t,a=!0){return!a||!X(t)?"":`<small class="summary-contact-hint">${r(i("summary.contactHint"))}</small>`}function tt(t){if(t.sickCount===0)return M(i("summary.sickMeals"));let a=t.sickCount===1?"summary.tray.one":"summary.tray.other";return`<span class="summary-matrix-diet-total">${t.sickCount}</span><span class="summary-matrix-unit">${r(i(a))}</span>`}function at(t){return t.sickDiets.length===0?M(i("summary.noDiet")):w(t.sickDiets)}function vt(t){if(t.massStatus==="UNKNOWN")return M(i("summary.notSet"));let a=t.massStatus==="YES";return`<span class="summary-matrix-mass-${a?"yes":"no"}">${r(i(a?"summary.yes":"summary.no"))}</span>`}function Dt(t,a="name",e=!0){return`
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
        ${e&&t.columns.some(X)?`<small class="summary-contact-hint">${r(i("summary.contactHint"))}</small>`:""}
        <span class="sr-only">${r(i("summary.names"))}</span>
      </th>
      ${t.columns.map(n=>`<td class="${I(n,t).trim()}">${rt(n,{compactActions:!0,residentLabel:a})}</td>`).join("")}
    </tr>
  `}function Ct(t){return t==="YES"?" summary-mass-state-yes":t==="NO"?" summary-mass-state-no":" summary-mass-state-unknown"}function Nt(t){let a=Pt(t).map(e=>`<td class="summary-matrix-mass-band${I(e,t)}${Ct(e.massStatus)}" colspan="${e.span}">${jt(e)}</td>`).join("");return`
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${r(i("summary.mass"))}</th>
      ${a}
    </tr>
  `}function Tt(t,a){if(a||t.mealTypeId!=="breakfast")return"";let e=t.breakfastPlanned===!0,s=i(e?"summary.breakfastPlanned":"summary.breakfastNotPlanned");return`<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${e?"yes":"no"}"><span aria-hidden="true">${e?"✓":"×"}</span>${r(s)}</span>`}function et(t){if(t.specialDiets.participantCount===0)return M(i("summary.noDiet"));let a=[...t.specialDiets.items].sort((e,s)=>b(e.tag).localeCompare(b(s.tag),x(),{numeric:!0}));return w(a)}function st(t){return t.specialDiets.participantCount===0?M(i("summary.noDiet")):w(t.specialDiets.items," summary-matrix-kitchen-diets")}function w(t,a=""){let e=[...t].sort((s,n)=>b(s.tag).localeCompare(b(n.tag),x(),{numeric:!0}));return`<ul class="summary-matrix-diets${a}">${e.map(s=>{let n=b(s.tag),o=Math.max(0,Math.floor(Number(s.count)||0)),m=o>1?`<span class="diet-code-count">× ${o}</span>`:"";return`<li><span class="diet-code-badge diet-code-tone-${v(s.tag)}">${r(n)}</span>${m}</li>`}).join("")}</ul>`}function b(t){return j(k(t),i)}function rt(t,{compactActions:a=!1,residentLabel:e="name"}={}){return t.names.length===0?M(i("summary.noName")):`<ul class="summary-matrix-names">${t.names.map(s=>{let n=s.dietTags.map(h=>b(h)),o=E(s.phone),m=String(s.displayName||"").trim(),l=m.split(/\s+/).filter(Boolean).slice(0,3).map(h=>h[0]).join("").toUpperCase(),u=e==="signature"?s.signature||m:e==="initials"&&(s.initials||l||s.signature)||m,c=r(u),$=n.length?` <small>(${r(n.join(", "))})</small>`:"",p=`<span class="summary-matrix-person-name">${c}${$}</span>`,y=s.phoneConsent&&o?`<a class="summary-matrix-call" href="tel:${r(o)}" aria-label="${r(i("summary.callPerson",{name:s.displayName}))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`:"",f=s.whatsappEnabled&&s.phoneConsent&&o?`<a class="summary-matrix-whatsapp" href="https://wa.me/${r(o.replace(/\D/g,""))}" target="_blank" rel="noopener noreferrer" aria-label="${r(i("summary.messagePerson",{name:s.displayName}))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`:"";if(a&&(y||f)){let h=`summary-contact-popup-${++V}`;return`
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${h}" aria-haspopup="dialog" aria-label="${r(i("summary.contactPerson",{name:s.displayName}))}" title="${r(i("summary.contactPerson",{name:s.displayName}))}">${p}</button>
            <span class="summary-matrix-contact-popover" id="${h}" popover role="dialog" aria-label="${r(i("summary.contactPerson",{name:s.displayName}))}">
              <span class="summary-matrix-contact-actions">${y}${f}</span>
            </span>
          </li>`}return`<li>${p}<span class="summary-matrix-contact-actions">${y}${f}</span></li>`}).join("")}</ul>`}function E(t){let a=String(t||"").trim();return/^[+\d][\d\s()./-]{5,}$/.test(a)?a:""}function Et(t,{kitchen:a,activeIndex:e,residentLabel:s="name",showContactHint:n=!0,dietLegend:o=[]}){let m=a?"kitchen":"summary",l=t.index===e;return`
    <section class="summary-matrix-screen summary-international-screen${Bt(t)?" summary-screen-has-special":" summary-screen-ordinary"}" data-${m}-screen="${t.index}" role="tabpanel" aria-hidden="${!l}">
      ${a?`<h2 class="sr-only">${r(`${i("kitchen.view.title")}: ${i(t.labelKey)}`)}</h2>`:`<header class="summary-international-title"><time datetime="${r(t.dateId)}">${r(P(t.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${t.columns.map((c,$,p)=>Ot(c,{kitchen:a,residentLabel:s,showContactHint:n,showMassMetadata:$===0||p[$-1]?.dateId!==c.dateId})).join("")}
      </div>
      ${a?nt(t,o):""}
      ${B(t)}
    </section>
  `}function Bt(t){return t.columns.some(a=>a.guestCount>0||a.specialDiets.participantCount>0||a.sickCount>0||a.sickDiets.length>0)||t.notesByDate.length>0}function Ot(t,{kitchen:a,residentLabel:e="name",showContactHint:s=!0,showMassMetadata:n=!1}){let o=a?st(t):et(t),m=n&&t.dayMassStatus!=="UNKNOWN"?J(t.dayMassStatus):"",l=t.guestCount>0?`<span class="summary-international-mobile-guests">${r(i("summary.guests"))}: <strong>${t.guestCount}</strong></span>`:"",u=m||l?`<div class="summary-international-card-actions">${m}${l}</div>`:"";return`
    <article class="summary-international-card summary-day-tone-${it(t.dayIndex)}${t.mealTypeId==="breakfast"?" summary-international-card-next":""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${N(t.mealTypeId)}</span>
        <div class="summary-international-card-copy"><strong>${r(T(t,{breakfastTomorrow:!0}))}</strong><time datetime="${r(t.dateId)}">${r(O(t.dateId))}</time></div>
        ${u}
      </header>
      <dl>
        ${t.guestCount>0?`<div class="summary-international-guest-row"><dt>${r(i("summary.guests"))}</dt><dd>${t.guestCount}</dd></div>`:""}
        <div><dt>${r(i("summary.diningMeals"))}</dt><dd>${Q(t,{contactHint:!a&&s})}</dd></div>
        ${t.specialDiets.participantCount>0?`<div><dt>${r(i("summary.includedDiets"))}</dt><dd>${o}</dd></div>`:""}
        ${t.sickCount>0?`<div><dt>${r(i("summary.sickMeals"))}</dt><dd>${tt(t)}</dd></div>`:""}
        ${t.sickDiets.length>0?`<div><dt>${r(i("summary.sickDiets"))}</dt><dd>${at(t)}</dd></div>`:""}
      </dl>
      ${a?"":`<section class="summary-international-names"><h3>${r(i("summary.names"))}</h3>${rt(t,{compactActions:!0,residentLabel:e})}</section>`}
    </article>
  `}function Pt(t){return t.dateGroups.map(a=>{let e=t.columns.find(s=>s.dateId===a.dateId);return{...a,massStatus:e?.dayMassStatus||"UNKNOWN"}})}function B(t){return t.notesByDate.length===0?"":`
    <section class="kitchen-notes" aria-label="${r(i("kitchen.notes.title"))}">
      <h3>${r(i("kitchen.notes.title"))}</h3>
      ${t.notesByDate.map(a=>`
        <div class="kitchen-notes-group">
          <time datetime="${r(a.dateId)}">${r(O(a.dateId))}</time>
          <ul>${a.notes.map(e=>`<li><p>${r(e.text)}</p></li>`).join("")}</ul>
        </div>
      `).join("")}
    </section>
  `}function nt(t,a){let e=new Set;t.columns.forEach(n=>{[...n.specialDiets?.items||[],...n.sickDiets||[]].forEach(o=>{let m=k(o?.tag);/^\d{1,3}$/.test(m)&&e.add(m)})});let s=H(a).filter(n=>e.has(n.code));return s.length===0?"":`
    <section class="kitchen-diet-legend" aria-label="${r(i("kitchen.dietLegend.title"))}">
      <h3>${r(i("kitchen.dietLegend.title"))}</h3>
      <ul>${s.map(n=>`<li><strong class="diet-code-badge diet-code-tone-${v(n.code)}">${r(b(n.code))}</strong><span aria-hidden="true">=</span><span>${r(n.label)}</span></li>`).join("")}</ul>
    </section>
  `}function M(t){return`<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${r(t)}</span>`}function Lt(t,a){return t.dayIndex>a.index?" summary-matrix-next-date":""}function jt(t){return`
    <span class="summary-mass-control">
      <span class="summary-mass-control-day">${r(mt(t.dayIndex))}</span>
      <span class="summary-mass-control-state">${vt(t)}</span>
    </span>`}function I(t,a){return`${Lt(t,a)} summary-day-tone-${it(t.dayIndex)}`}function it(t){return Math.max(0,Math.min(2,Number(t)||0))}function mt(t){return[i("summary.today"),i("summary.tomorrow"),i("summary.dayAfterTomorrow")][t]||i("summary.followingDay")}function O(t){let[a,e,s]=String(t).split("-").map(Number);return new Intl.DateTimeFormat(x(),{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(a,e-1,s))}function P(t){let[a,e,s]=String(t).split("-").map(Number);return!a||!e||!s?"":new Intl.DateTimeFormat(x(),{weekday:"long",day:"numeric",month:"long"}).format(new Date(a,e-1,s))}function Ht(t,a){let e=[...t.querySelectorAll(`[data-${a}-screen]`)];if(e.length===0)return 0;let s=e.reduce((n,o)=>Math.abs(o.getBoundingClientRect().left-t.getBoundingClientRect().left)<Math.abs(n.getBoundingClientRect().left-t.getBoundingClientRect().left)?o:n);return Number(s.dataset[`${a}Screen`])===1?1:0}function ot(t,a,e){t.querySelectorAll(`[data-${a}-screen]`).forEach(s=>{s.setAttribute("aria-hidden",String(Number(s.dataset[`${a}Screen`])!==e))})}export{Gt as mountSummaryMatrix,St as scrollSummaryMatrix};

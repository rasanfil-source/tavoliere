import{t as n,setLocale as p,getLocale as v,formatDate as u,formatTime as m,formatNumber as b,applyTranslations as f,SUPPORTED_LOCALES as g,DEFAULT_LOCALE as h}from"./i18n/i18n.mjs";async function C(){const e=v();console.log(`Lingua corrente: ${e}`),f(document),c(),d()}function M(e,t){const o={saving:n("common.status.saving"),saved:n("common.status.saved"),error:n("common.status.error")};e.textContent=o[t]||t}function N(e,t){e.textContent=n("meal.cutoff",{time:t})}function q(e,t){e.textContent=n("participant.meal.selectedCount",{count:t})}function R(e,t){e.textContent=u(t,{weekday:"long",year:"numeric",month:"long",day:"numeric"})}function k(e,t){e.textContent=m(t,{hour:"2-digit",minute:"2-digit"})}function B(e,t){e.textContent=b(t)}function c(){const e=document.querySelector("[data-participant-status]"),t=document.querySelector("[data-participant-status-name]");e.textContent=n("participant.status.loading");const o="Mario Rossi";t.textContent=o,t.hidden=!1}function d(){const e=document.querySelector("[data-admin-overview]");e.querySelector("[data-admin-overview-title]").textContent=n("admin.overview.title");const t=42;e.querySelector("[data-admin-overview-active]").textContent=n("admin.overview.activePeople",{count:t})}function S(e){let t;e.code==="network-error"?t=n("errors.network.generic"):e.code==="unauthorized"?t=n("errors.auth.unauthorized"):e.code==="validation-error"?t=n("errors.validation.invalid"):t=n("errors.generic"),A(t)}function A(e){const t=document.querySelector("[data-error-banner]");t.textContent=e,t.hidden=!1,t.setAttribute("aria-live","polite")}function $(e){const t=n("confirm.delete.title"),o=n("confirm.delete.message"),a=n("confirm.delete.confirm"),r=n("confirm.delete.cancel"),i=document.createElement("dialog");i.innerHTML=`
    <h2>${l(t)}</h2>
    <p>${l(o)}</p>
    <button class="save-button" data-confirm>${l(a)}</button>
    <button class="tertiary-action" data-cancel>${l(r)}</button>
  `,i.querySelector("[data-confirm]").addEventListener("click",()=>{i.close(),e()}),i.querySelector("[data-cancel]").addEventListener("click",()=>{i.close()}),i.showModal()}function l(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}async function y(e){g.includes(e)||(console.warn(`Lingua non supportata: ${e}`),e=h),await p(e),f(document),O();const t=document.querySelector("[data-admin-language-select]");t&&(t.value=e),console.log(`Lingua cambiata a: ${e}`)}function O(){c(),d(),renderWeekView(),renderSummaryView(),renderKitchenView()}function D(e,t){const o=[{value:"STANDARD",label:n("diet.option.STANDARD")},{value:"BIANCO",label:n("diet.option.BIANCO")},{value:"DIAB",label:n("diet.option.DIAB")},{value:"IPO",label:n("diet.option.IPO")},{value:"CARDIO",label:n("diet.option.CARDIO")},{value:"CUSTOM",label:n("diet.option.CUSTOM")}],a=document.createDocumentFragment();if(t){const r=document.createElement("option");r.value="",r.textContent=t,a.append(r)}for(const{value:r,label:i}of o){const s=document.createElement("option");s.value=r,s.textContent=i,a.append(s)}e.replaceChildren(a)}function P(e){return{administrator:n("role.administrator"),participant:n("role.participant"),resident:n("role.resident"),kitchen:n("role.kitchen"),guest:n("role.guest")}[e]||e}function T(e){const t=[];return(!e.name||e.name.trim()==="")&&t.push({field:"name",message:n("errors.validation.required")}),e.name&&e.name.length<2&&t.push({field:"name",message:n("errors.validation.tooShort")}),e.name&&e.name.length>120&&t.push({field:"name",message:n("errors.validation.tooLong")}),e.dietNumber&&!/^\d+$/.test(e.dietNumber)&&t.push({field:"dietNumber",message:n("diet.validation.invalidNumber")}),t}function V(e){for(const{field:t,message:o}of e){const a=document.querySelector(`[data-error-${t}]`);a&&(a.textContent=o,a.hidden=!1)}}function x(e){const t=document.createElement("article");t.className="meal-card";const o=new Date>e.cutoff;return t.innerHTML=`
    <header class="meal-header">
      <h3 class="meal-type">${E(e.type)}</h3>
      <time class="meal-date" datetime="${e.date}">${u(e.date)}</time>
    </header>
    
    <div class="meal-body">
      <label class="diet-select-label">
        ${n("diet.option.label")}
        <select class="diet-select" data-diet="${e.id}">
          ${I(e.selectedDiet)}
        </select>
      </label>
      
      <p class="meal-cutoff ${o?"cutoff-passed":""}">
        ${o?n("meal.cutoff.passed"):n("meal.cutoff",{time:m(e.cutoff)})}
      </p>
      
      <p class="meal-status" data-status="${e.status}">
        ${w(e.status)}
      </p>
    </header>
    
    <footer class="meal-footer">
      <button 
        class="save-button" 
        data-save-meal="${e.id}"
        ${o?"disabled":""}
      >
        ${n("common.actions.save")}
      </button>
    </footer>
  `,t}function E(e){return{breakfast:n("meal.type.breakfast"),lunch:n("meal.type.lunch"),dinner:n("meal.type.dinner")}[e]||e}function w(e){return{selected:n("meal.status.selected"),notSelected:n("meal.status.notSelected"),closed:n("meal.status.closed")}[e]||e}function I(e){return[{value:"STANDARD",label:n("diet.option.STANDARD")},{value:"BIANCO",label:n("diet.option.BIANCO")},{value:"DIAB",label:n("diet.option.DIAB")},{value:"IPO",label:n("diet.option.IPO")},{value:"CARDIO",label:n("diet.option.CARDIO")},{value:"CUSTOM",label:n("diet.option.CUSTOM")}].map(o=>`<option value="${o.value}" ${o.value===e?"selected":""}>${o.label}</option>`).join("")}export{$ as confirmDelete,y as handleLanguageChange,S as handleSaveError,C as initializeApp,d as renderAdminView,x as renderMealCard,c as renderParticipantView,T as validateParticipantForm};

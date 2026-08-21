import { t, getLocale } from "./i18n/i18n.mjs?v=20260821ad";
import { escapeHtml } from "./html-utils.js?v=20260816g";
import { formatDietLabel, normalizeDietCode } from "./diet-utils.mjs?v=20260818w";
import {
  buildKitchenMatrixScreens,
  buildSummaryMatrixScreens,
} from "./summary-matrix-model.js?v=20260820i";

let contactPopupSequence = 0;

export function mountSummaryMatrix(
  container,
  {
    days = [],
    operationDays = [],
    kitchen = false,
    layout = "classic",
    residentLabel = "name",
    activeIndex = 0,
    onActiveIndexChange = () => {},
  } = {},
) {
  const screens = kitchen
    ? buildKitchenMatrixScreens(days, operationDays)
    : buildSummaryMatrixScreens(days, [], operationDays);

  if (layout === "future" && !kitchen) {
    renderFutureSummary(container, screens, residentLabel, activeIndex, onActiveIndexChange);
    return;
  }

  if (screens.every((screen) => screen.columns.length === 0)) {
    container.innerHTML = `<p class="empty-state">${escapeHtml(t("summary.noMeal"))}</p>`;
    return;
  }

  const prefix = kitchen ? "kitchen" : "summary";
  const render = layout === "international" ? renderInternationalScreen : renderScreen;
  container.innerHTML = `
    <div class="summary-matrix-track summary-layout-${layout}${kitchen ? " summary-layout-kitchen" : " summary-layout-diners"}" data-${prefix}-matrix-track aria-label="${escapeHtml(t("summary.screensLabel"))}">
      ${screens.map((screen) => render(screen, { kitchen, activeIndex, residentLabel })).join("")}
    </div>
    <p class="summary-matrix-swipe-hint" aria-hidden="true">${escapeHtml(t("summary.swipeHint"))}</p>
  `;

  const track = container.querySelector(`[data-${prefix}-matrix-track]`);
  let scrollTimer = 0;
  track.addEventListener(
    "scroll",
    () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        const nextIndex = getNearestScreenIndex(track, prefix);
        syncAccessibility(container, prefix, nextIndex);
        onActiveIndexChange(nextIndex);
      }, 100);
    },
    { passive: true },
  );

  window.requestAnimationFrame(() => {
    scrollSummaryMatrix(container, activeIndex, { kitchen, smooth: false });
  });
}

function renderFutureSummary(container, screens, residentLabel, activeIndex = 0, onActiveIndexChange = () => {}) {
  container.innerHTML = `
    <div class="summary-future-grid" data-summary-future-track>
      ${screens.map((screen) => `
        <article class="summary-future-card" data-summary-future-screen="${screen.index}" aria-hidden="${screen.index !== activeIndex}">
          <header class="summary-future-card-head">
            <strong>${escapeHtml(t(screen.labelKey))}</strong>
            <time datetime="${escapeHtml(screen.dateId)}">${escapeHtml(formatLongDate(screen.dateId))}</time>
          </header>
          <div class="summary-future-meals">
            ${screen.columns.map((column) => renderFutureMeal(column, residentLabel)).join("")}
          </div>
          ${renderFutureMass(screen)}
        </article>
      `).join("")}
    </div>
  `;
  const track = container.querySelector('[data-summary-future-track]');
  let scrollTimer = 0;
  track?.addEventListener('scroll', () => {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      const index = Math.max(0, Math.min(1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth + 14))));
      track.querySelectorAll('[data-summary-future-screen]').forEach((screen) => {
        screen.setAttribute('aria-hidden', String(Number(screen.dataset.summaryFutureScreen) !== index));
      });
      onActiveIndexChange(index);
    }, 100);
  }, { passive: true });
  window.requestAnimationFrame(() => {
    if (track) track.scrollTo({ left: Math.max(0, activeIndex) * (track.clientWidth + 14), behavior: 'auto' });
  });
}

function renderFutureMeal(column, residentLabel) {
  const names = Array.isArray(column.names) ? column.names : [];
  const dietCount = Number(column.specialDiets?.participantCount || 0);
  const guestCount = Number(column.guestCount || 0);
  const sickCount = Number(column.sickCount || 0);
  const sickDiets = Array.isArray(column.sickDiets) ? column.sickDiets : [];
  return `
    <section class="summary-future-meal">
      <div class="summary-future-meal-main">
        <span class="summary-future-meal-icon" aria-hidden="true">${mealIcon(column.mealTypeId)}</span>
        <span class="summary-future-meal-name">${escapeHtml(localizedMealLabel(column))}</span>
        <strong class="summary-future-meal-total">${escapeHtml(String(column.total || 0))}</strong>
      </div>
      ${guestCount > 0 ? renderFutureMetric("summary.guests", guestCount, "guests") : ""}
      ${dietCount ? `<p class="summary-future-diets">${escapeHtml(t("week.operations.diet.count", { count: dietCount }))}</p>` : ""}
      ${sickCount > 0 ? renderFutureMetric("summary.sickMeals", sickCount, "sick") : ""}
      ${sickDiets.length > 0 ? `<div class="summary-future-special-row"><span>${escapeHtml(t("summary.sickDiets"))}</span><div>${renderDietItems(sickDiets, " summary-future-diet-list")}</div></div>` : ""}
      ${names.length ? `<div class="summary-future-people">${names.map((person) => renderFuturePerson(person, residentLabel)).join("")}</div>` : ""}
    </section>
  `;
}

function renderFutureMetric(labelKey, count, kind) {
  if (kind === "guests") {
    return `<p class="summary-future-metric summary-future-metric-guests"><strong>${escapeHtml(String(count))}</strong><span>${escapeHtml(t(labelKey))}</span></p>`;
  }
  return `<p class="summary-future-metric summary-future-metric-${escapeHtml(kind)}"><span>${escapeHtml(t(labelKey))}</span><strong>${escapeHtml(String(count))}</strong></p>`;
}

function renderFuturePerson(person, residentLabel) {
  const fallbackInitials = String(person.displayName || "")
    .trim().split(/\s+/).filter(Boolean).slice(0, 3).map((part) => part[0]).join("").toUpperCase();
  const text = residentLabel === "signature"
    ? person.signature || person.displayName
    : residentLabel === "initials"
      ? person.initials || fallbackInitials || person.signature
      : person.displayName;
  const diets = Array.isArray(person.dietTags)
    ? person.dietTags.map((tag) => formatDietIdentifier(tag)).filter(Boolean)
    : [];
  const label = `${escapeHtml(text || "–")}${diets.length ? `&nbsp;<small>(${escapeHtml(diets.join(", "))})</small>` : ""}`;
  const phone = normalizePhone(person.phone);
  const call = person.phoneConsent && phone
    ? `<a class="summary-matrix-call" href="tel:${escapeHtml(phone)}" aria-label="${escapeHtml(t("summary.callPerson", { name: person.displayName }))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`
    : "";
  const whatsapp = person.whatsappEnabled && person.phoneConsent && phone
    ? `<a class="summary-matrix-whatsapp" href="https://wa.me/${escapeHtml(phone.replace(/\D/g, ""))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(t("summary.messagePerson", { name: person.displayName }))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`
    : "";
  if (call || whatsapp) {
    const popupId = `summary-contact-popup-${++contactPopupSequence}`;
    return `<span class="summary-future-person summary-matrix-name-with-popup"><button type="button" class="summary-matrix-person-trigger" popovertarget="${popupId}" aria-haspopup="dialog" aria-label="${escapeHtml(t("summary.contactPerson", { name: person.displayName }))}">${label}</button><span class="summary-matrix-contact-popover" id="${popupId}" popover role="dialog"><span class="summary-matrix-contact-actions">${call}${whatsapp}</span></span></span>`;
  }
  return `<span class="summary-future-person" title="${escapeHtml(person.displayName || text)}">${label}</span>`;
}

function renderFutureMass(screen) {
  const status = screen.columns.find((column) => column.dayIndex === screen.index)?.dayMassStatus;
  if (!status || status === "UNKNOWN") return "";
  const yes = status === "YES";
  const massDayLabel = relativeDayLabel(Math.min(2, Number(screen.index || 0) + 1));
  return `<div class="summary-future-mass"><span>${escapeHtml(t("summary.mass"))}</span><strong class="summary-future-mass-${yes ? "yes" : "no"}">${escapeHtml(t(yes ? "summary.yes" : "summary.no"))}<small>(${escapeHtml(massDayLabel)})</small></strong></div>`;
}

export function scrollSummaryMatrix(
  container,
  index,
  { kitchen = false, smooth = true } = {},
) {
  const prefix = kitchen ? "kitchen" : "summary";
  const normalizedIndex = Number(index) === 1 ? 1 : 0;
  if (!kitchen) {
    const futureTrack = container?.querySelector('[data-summary-future-track]');
    if (futureTrack) {
      futureTrack.scrollTo({
        left: normalizedIndex * (futureTrack.clientWidth + 14),
        behavior: smooth ? 'smooth' : 'auto',
      });
      futureTrack.querySelectorAll('[data-summary-future-screen]').forEach((screen) => {
        screen.setAttribute('aria-hidden', String(Number(screen.dataset.summaryFutureScreen) !== normalizedIndex));
      });
      return true;
    }
  }
  const track = container?.querySelector(`[data-${prefix}-matrix-track]`);
  const screen = track?.querySelector(
    `[data-${prefix}-screen="${normalizedIndex}"]`,
  );
  if (!track || !screen) return false;

  track.scrollTo({
    left:
      track.scrollLeft +
      screen.getBoundingClientRect().left -
      track.getBoundingClientRect().left,
    behavior: smooth ? "smooth" : "auto",
  });
  syncAccessibility(container, prefix, normalizedIndex);
  return true;
}

function renderScreen(screen, { kitchen, activeIndex, residentLabel = "name" }) {
  const prefix = kitchen ? "kitchen" : "summary";
  const isActive = screen.index === activeIndex;
  if (screen.columns.length === 0) {
    return `
      <section class="summary-matrix-screen" data-${prefix}-screen="${screen.index}" role="tabpanel" aria-hidden="${!isActive}">
        <p class="empty-state">${escapeHtml(t("summary.noMeal"))}</p>
      </section>
    `;
  }

  return `
    <section class="summary-matrix-screen" data-${prefix}-screen="${screen.index}" role="tabpanel" aria-hidden="${!isActive}">
      <table class="summary-matrix">
        ${renderCaption(screen, kitchen)}
        <colgroup>
          <col class="summary-matrix-label-column">
          ${screen.columns.map((column) => (column.dayIndex > screen.index ? '<col class="summary-matrix-next-date-column">' : "<col>")).join("")}
        </colgroup>
        <thead>
          <tr class="summary-matrix-date-row">
            <th class="summary-matrix-corner" rowspan="2"><span class="sr-only">${escapeHtml(t("summary.item"))}</span></th>
            ${screen.dateGroups
              .map(
                (group) => `
              <th class="summary-matrix-date-heading${dateClasses(group, screen)}" scope="colgroup" colspan="${group.span}">
                <span>${escapeHtml(relativeDayLabel(group.dayIndex))}</span>
                <time datetime="${escapeHtml(group.dateId)}">${escapeHtml(formatDate(group.dateId))}</time>
              </th>
            `,
              )
              .join("")}
          </tr>
          <tr>
            ${screen.columns
              .map(
                (column) => `
              <th class="summary-matrix-meal-heading${dateClasses(column, screen)}" scope="col"><span class="summary-matrix-meal-icon" aria-hidden="true">${mealIcon(column.mealTypeId)}</span><span class="summary-matrix-meal-label">${escapeHtml(localizedMealLabel(column))}</span>${renderBreakfastStatus(column, kitchen)}</th>
            `,
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${screen.hasGuestGroup ? renderRow(t("summary.guests"), "summary-matrix-row-guests", screen, (column) => String(column.guestCount)) : ""}
          ${renderRow(t("summary.diningMeals"), "summary-matrix-row-meals", screen, renderDiningTotal)}
          ${screen.hasSpecialDiets ? renderRow(t("summary.includedDiets"), "summary-matrix-row-diets", screen, kitchen ? renderKitchenDietCell : renderDietCell) : ""}
          ${screen.hasSickMeals ? renderRow(t("summary.sickMeals"), "summary-matrix-row-sick", screen, renderSickMealCell) : ""}
          ${screen.hasSickDiets ? renderRow(t("summary.sickDiets"), "summary-matrix-row-sick-diets", screen, renderSickDietCell) : ""}
          ${screen.hasMassInformation ? renderMassBandRow(screen) : ""}
          ${kitchen ? "" : renderClassicNamesRow(screen, residentLabel)}
        </tbody>
      </table>
      ${kitchen ? renderNotes(screen) : ""}
    </section>
  `;
}

function renderCaption(screen, kitchen) {
  if (kitchen) {
    return `<caption class="sr-only">${escapeHtml(`${t("kitchen.view.title")}: ${t(screen.labelKey)}`)}</caption>`;
  }
  return `
    <caption class="summary-matrix-caption">
      <time datetime="${escapeHtml(screen.dateId)}">${escapeHtml(formatLongDate(screen.dateId))}</time>
    </caption>
  `;
}

function mealIcon(mealTypeId) {
  const originalIcons = { breakfast: "☕", lunch: "🍝", dinner: "🍲" };
  const coolIcons = { breakfast: "coffee", lunch: "sun", dinner: "moon" };
  return interfaceIcon(coolIcons[mealTypeId], originalIcons[mealTypeId] || "•");
}

function interfaceIcon(kind, fallback = "•") {
  const interfaceStyle = document.documentElement.dataset.interfaceStyle;
  const usesLineIcons = interfaceStyle === "cool" || interfaceStyle === "urban" || interfaceStyle === "future";
  if (!usesLineIcons || !kind) {
    return fallback;
  }
  const paths = {
    coffee: '<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',
    sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',
    moon: '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>'
  };
  const path = paths[kind];
  if (!path) return fallback;
  return `<svg class="meal-line-icon meal-line-icon-${kind}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${path}</svg>`;
}

function localizedMealLabel(column) {
  const mealTypeId = String(column?.mealTypeId || "").trim().toLowerCase();
  const translated = mealTypeId ? t(`meal.type.${mealTypeId}`) : "";
  const raw = String(column?.label || "").trim();
  return translated && translated !== `meal.type.${mealTypeId}` ? translated : raw;
}

function renderRow(label, className, screen, renderCell) {
  return `
    <tr class="${className}">
      <th class="summary-matrix-label" scope="row">${escapeHtml(label)}</th>
      ${screen.columns.map((column) => `<td class="${dateClasses(column, screen).trim()}">${renderCell(column)}</td>`).join("")}
    </tr>
  `;
}

function renderDiningTotal(column) {
  const unitKey =
    column.total === 1 ? "summary.cover.one" : "summary.cover.other";
  return `<span class="summary-matrix-total">${column.total}</span><span class="summary-matrix-unit">${escapeHtml(t(unitKey))}</span>`;
}

function renderSickMealCell(column) {
  if (column.sickCount === 0) return renderEmpty(t("summary.sickMeals"));
  const unitKey =
    column.sickCount === 1 ? "summary.tray.one" : "summary.tray.other";
  return `<span class="summary-matrix-diet-total">${column.sickCount}</span><span class="summary-matrix-unit">${escapeHtml(t(unitKey))}</span>`;
}

function renderSickDietCell(column) {
  if (column.sickDiets.length === 0) return renderEmpty(t("summary.noDiet"));
  return renderDietItems(column.sickDiets);
}

function renderMassCell(column) {
  if (column.massStatus === "UNKNOWN") return renderEmpty(t("summary.notSet"));
  const yes = column.massStatus === "YES";
  return `<span class="summary-matrix-mass-${yes ? "yes" : "no"}">${escapeHtml(t(yes ? "summary.yes" : "summary.no"))}</span>`;
}

function renderClassicNamesRow(screen, residentLabel = "name") {
  return `
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
        <span class="sr-only">${escapeHtml(t("summary.names"))}</span>
      </th>
      ${screen.columns.map((column) => `<td class="${dateClasses(column, screen).trim()}">${renderNamesCell(column, { compactActions: true, residentLabel })}</td>`).join("")}
    </tr>
  `;
}

function massStateClass(status) {
  if (status === "YES") return " summary-mass-state-yes";
  if (status === "NO") return " summary-mass-state-no";
  return " summary-mass-state-unknown";
}

function renderMassBandRow(screen) {
  const cells = getMassDateGroups(screen)
    .map(
      (group) =>
        `<td class="summary-matrix-mass-band${dateClasses(group, screen)}${massStateClass(group.massStatus)}" colspan="${group.span}">${renderMassControl(group)}</td>`,
    )
    .join("");
  return `
    <tr class="summary-matrix-row-mass summary-matrix-row-mass-band">
      <th class="summary-matrix-label" scope="row">${escapeHtml(t("summary.mass"))}</th>
      ${cells}
    </tr>
  `;
}

function renderBreakfastStatus(column, kitchen) {
  if (kitchen || column.mealTypeId !== "breakfast") return "";
  const planned = column.breakfastPlanned === true;
  const label = t(
    planned ? "summary.breakfastPlanned" : "summary.breakfastNotPlanned",
  );
  return `<span class="summary-matrix-breakfast-status summary-matrix-breakfast-${planned ? "yes" : "no"}"><span aria-hidden="true">${planned ? "✓" : "×"}</span>${escapeHtml(label)}</span>`;
}

function renderDietCell(column) {
  if (column.specialDiets.participantCount === 0)
    return renderEmpty(t("summary.noDiet"));
  const diets = [...column.specialDiets.items].sort((left, right) =>
    formatDietIdentifier(left.tag).localeCompare(
      formatDietIdentifier(right.tag),
      getLocale(),
      { numeric: true },
    ),
  );
  return renderDietItems(diets);
}

function renderKitchenDietCell(column) {
  if (column.specialDiets.participantCount === 0)
    return renderEmpty(t("summary.noDiet"));
  return renderDietItems(column.specialDiets.items, " summary-matrix-kitchen-diets");
}

function renderDietItems(items, extraClass = "") {
  const sorted = [...items].sort((left, right) =>
    formatDietIdentifier(left.tag).localeCompare(
      formatDietIdentifier(right.tag),
      getLocale(),
      { numeric: true },
    ),
  );
  return `<ul class="summary-matrix-diets${extraClass}">${sorted.map((diet) => {
    const identifier = formatDietIdentifier(diet.tag);
    const count = Math.max(0, Math.floor(Number(diet.count) || 0));
    const label = count > 1 ? `${identifier} (${count})` : identifier;
    return `<li>${escapeHtml(label)}</li>`;
  }).join("")}</ul>`;
}

function formatDietIdentifier(tag) {
  const value = normalizeDietCode(tag);
  return /^\d+$/.test(value) ? value : formatDietLabel(value);
}

function renderNamesCell(column, { compactActions = false, residentLabel = "name" } = {}) {
  if (column.names.length === 0) return renderEmpty(t("summary.noName"));
  return `<ul class="summary-matrix-names">${column.names
    .map((participant) => {
      const diets = participant.dietTags.map((tag) => formatDietIdentifier(tag));
      const phone = normalizePhone(participant.phone);
      const fullName = String(participant.displayName || "").trim();
      const fallbackInitials = fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
      const residentText = residentLabel === "signature"
        ? participant.signature || fullName
        : residentLabel === "initials"
          ? participant.initials || fallbackInitials || participant.signature || fullName
          : fullName;
      const displayName = escapeHtml(residentText);
      const dietSuffix = diets.length
        ? ` <small>(${escapeHtml(diets.join(", "))})</small>`
        : "";
      const personName = `<span class="summary-matrix-person-name">${displayName}${dietSuffix}</span>`;
      const call = participant.phoneConsent && phone
        ? `<a class="summary-matrix-call" href="tel:${escapeHtml(phone)}" aria-label="${escapeHtml(t("summary.callPerson", { name: participant.displayName }))}"><span class="summary-matrix-phone-icon" aria-hidden="true">☎</span></a>`
        : "";
      const whatsapp = participant.whatsappEnabled && participant.phoneConsent && phone
        ? `<a class="summary-matrix-whatsapp" href="https://wa.me/${escapeHtml(phone.replace(/\D/g, ""))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(t("summary.messagePerson", { name: participant.displayName }))}" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`
        : "";
      if (compactActions && (call || whatsapp)) {
        const popupId = `summary-contact-popup-${++contactPopupSequence}`;
        return `
          <li class="summary-matrix-name-with-popup">
            <button type="button" class="summary-matrix-person-trigger" popovertarget="${popupId}" aria-haspopup="dialog" aria-label="${escapeHtml(t("summary.contactPerson", { name: participant.displayName }))}" title="${escapeHtml(t("summary.contactPerson", { name: participant.displayName }))}">${personName}</button>
            <span class="summary-matrix-contact-popover" id="${popupId}" popover role="dialog" aria-label="${escapeHtml(t("summary.contactPerson", { name: participant.displayName }))}">
              <span class="summary-matrix-contact-actions">${call}${whatsapp}</span>
            </span>
          </li>`;
      }
      return `<li>${personName}<span class="summary-matrix-contact-actions">${call}${whatsapp}</span></li>`;
    })
    .join("")}</ul>`;
}

function normalizePhone(value) {
  const phone = String(value || "").trim();
  return /^[+\d][\d\s()./-]{5,}$/.test(phone) ? phone : "";
}

function renderInternationalScreen(screen, { kitchen, activeIndex, residentLabel = "name" }) {
  const prefix = kitchen ? "kitchen" : "summary";
  const isActive = screen.index === activeIndex;
  const densityClass = hasSpecialOperationalContent(screen)
    ? " summary-screen-has-special"
    : " summary-screen-ordinary";
  return `
    <section class="summary-matrix-screen summary-international-screen${densityClass}" data-${prefix}-screen="${screen.index}" role="tabpanel" aria-hidden="${!isActive}">
      ${kitchen ? `<h2 class="sr-only">${escapeHtml(`${t("kitchen.view.title")}: ${t(screen.labelKey)}`)}</h2>` : `<header class="summary-international-title"><time datetime="${escapeHtml(screen.dateId)}">${escapeHtml(formatLongDate(screen.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${screen.columns.map((column) => renderInternationalCard(column, { kitchen, residentLabel })).join("")}
      </div>
      ${screen.hasMassInformation ? renderInternationalMass(screen, kitchen) : ""}
      ${kitchen ? renderNotes(screen) : ""}
    </section>
  `;
}

function hasSpecialOperationalContent(screen) {
  return screen.columns.some((column) =>
    column.guestCount > 0
    || column.specialDiets.participantCount > 0
    || column.sickCount > 0
    || column.sickDiets.length > 0
  ) || screen.notesByDate.length > 0;
}

function renderInternationalCard(column, { kitchen, residentLabel = "name" }) {
  const diets = kitchen ? renderKitchenDietCell(column) : renderDietCell(column);
  return `
    <article class="summary-international-card summary-day-tone-${normalizeDayTone(column.dayIndex)}${column.mealTypeId === "breakfast" ? " summary-international-card-next" : ""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${mealIcon(column.mealTypeId)}</span>
        <div><strong>${escapeHtml(localizedMealLabel(column))}</strong><time datetime="${escapeHtml(column.dateId)}">${escapeHtml(formatDate(column.dateId))}</time></div>
        ${column.guestCount > 0 ? `<span class="summary-international-mobile-guests">${escapeHtml(t("summary.guests"))}: <strong>${column.guestCount}</strong></span>` : ""}
      </header>
      <dl>
        ${column.guestCount > 0 ? `<div class="summary-international-guest-row"><dt>${escapeHtml(t("summary.guests"))}</dt><dd>${column.guestCount}</dd></div>` : ""}
        <div><dt>${escapeHtml(t("summary.diningMeals"))}</dt><dd>${renderDiningTotal(column)}</dd></div>
        ${column.specialDiets.participantCount > 0 ? `<div><dt>${escapeHtml(t("summary.includedDiets"))}</dt><dd>${diets}</dd></div>` : ""}
        ${column.sickCount > 0 ? `<div><dt>${escapeHtml(t("summary.sickMeals"))}</dt><dd>${renderSickMealCell(column)}</dd></div>` : ""}
        ${column.sickDiets.length > 0 ? `<div><dt>${escapeHtml(t("summary.sickDiets"))}</dt><dd>${renderSickDietCell(column)}</dd></div>` : ""}
      </dl>
      ${kitchen ? "" : `<section class="summary-international-names"><h3>${escapeHtml(t("summary.names"))}</h3>${renderNamesCell(column, { compactActions: true, residentLabel })}</section>`}
    </article>
  `;
}

function renderInternationalMass(screen, kitchen) {
  const groups = getMassDateGroups(screen);
  if (groups.length === 0) return "";
  return `
    <section class="summary-international-mass${kitchen ? " summary-international-mass-kitchen" : ""}">
      <div class="summary-international-mass-segments">
        ${groups
          .map(
            (group, index) => `
          <div class="summary-international-mass-group${index === 0 ? " summary-international-mass-group-first" : ""}${dateClasses(group, screen)}${massStateClass(group.massStatus)}" style="--mass-segment-span:${group.span}">
            ${index === 0 ? `<strong class="summary-international-mass-title">${escapeHtml(t("summary.mass"))}</strong>` : ""}
            <div class="summary-international-mass-segment">
              ${renderMassControl(group)}
            </div>
          </div>`,
          )
          .join("")}
      </div>
    </section>`;
}

function getMassDateGroups(screen) {
  return screen.dateGroups.map((dateGroup) => {
    const column = screen.columns.find(
      (item) => item.dateId === dateGroup.dateId,
    );
    return {
      ...dateGroup,
      massStatus: column?.dayMassStatus || "UNKNOWN",
    };
  });
}

function renderNotes(screen) {
  if (screen.notesByDate.length === 0) return "";
  return `
    <section class="kitchen-notes" aria-label="${escapeHtml(t("kitchen.notes.title"))}">
      <h3>${escapeHtml(t("kitchen.notes.title"))}</h3>
      ${screen.notesByDate
        .map(
          (group) => `
        <div class="kitchen-notes-group">
          <time datetime="${escapeHtml(group.dateId)}">${escapeHtml(formatDate(group.dateId))}</time>
          <ul>${group.notes.map((note) => `<li><p>${escapeHtml(note.text)}</p></li>`).join("")}</ul>
        </div>
      `,
        )
        .join("")}
    </section>
  `;
}

function renderEmpty(label) {
  return `<span class="summary-matrix-empty" aria-hidden="true">—</span><span class="sr-only">${escapeHtml(label)}</span>`;
}

function nextDateClass(column, screen) {
  return column.dayIndex > screen.index ? " summary-matrix-next-date" : "";
}

function renderMassControl(group) {
  return `
    <span class="summary-mass-control">
      <span class="summary-mass-control-day">${escapeHtml(relativeDayLabel(group.dayIndex))}</span>
      <span class="summary-mass-control-state">${renderMassCell(group)}</span>
    </span>`;
}

function dateClasses(item, screen) {
  return `${nextDateClass(item, screen)} summary-day-tone-${normalizeDayTone(item.dayIndex)}`;
}

function normalizeDayTone(dayIndex) {
  return Math.max(0, Math.min(2, Number(dayIndex) || 0));
}

function relativeDayLabel(dayIndex) {
  return (
    [t("summary.today"), t("summary.tomorrow"), t("summary.dayAfterTomorrow")][
      dayIndex
    ] || t("summary.followingDay")
  );
}

function formatDate(dateId) {
  const [year, month, day] = String(dateId).split("-").map(Number);
  return new Intl.DateTimeFormat(getLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatLongDate(dateId) {
  const [year, month, day] = String(dateId).split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Intl.DateTimeFormat(getLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));
}

function getNearestScreenIndex(track, prefix) {
  const screens = [...track.querySelectorAll(`[data-${prefix}-screen]`)];
  if (screens.length === 0) return 0;
  const nearest = screens.reduce((best, screen) =>
    Math.abs(
      screen.getBoundingClientRect().left - track.getBoundingClientRect().left,
    ) <
    Math.abs(
      best.getBoundingClientRect().left - track.getBoundingClientRect().left,
    )
      ? screen
      : best,
  );
  return Number(nearest.dataset[`${prefix}Screen`]) === 1 ? 1 : 0;
}

function syncAccessibility(container, prefix, activeIndex) {
  container.querySelectorAll(`[data-${prefix}-screen]`).forEach((screen) => {
    screen.setAttribute(
      "aria-hidden",
      String(Number(screen.dataset[`${prefix}Screen`]) !== activeIndex),
    );
  });
}

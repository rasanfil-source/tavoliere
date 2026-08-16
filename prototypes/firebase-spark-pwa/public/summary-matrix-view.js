import { t, getLocale } from "./i18n/i18n.mjs?v=20260816d";
import { escapeHtml } from "./html-utils.js?v=20260816d";
import { formatDietLabel } from "./diet-utils.mjs?v=20260816d";
import {
  buildKitchenMatrixScreens,
  buildSummaryMatrixScreens,
} from "./summary-matrix-model.js?v=20260816d";

let contactPopupSequence = 0;

export function mountSummaryMatrix(
  container,
  {
    days = [],
    operationDays = [],
    kitchen = false,
    layout = "classic",
    activeIndex = 0,
    onActiveIndexChange = () => {},
  } = {},
) {
  const screens = kitchen
    ? buildKitchenMatrixScreens(days, operationDays)
    : buildSummaryMatrixScreens(days, [], operationDays);

  if (screens.every((screen) => screen.columns.length === 0)) {
    container.innerHTML = `<p class="empty-state">${escapeHtml(t("summary.noMeal"))}</p>`;
    return;
  }

  const prefix = kitchen ? "kitchen" : "summary";
  const render = layout === "international" ? renderInternationalScreen : renderScreen;
  container.innerHTML = `
    <div class="summary-matrix-track summary-layout-${layout}${kitchen ? " summary-layout-kitchen" : " summary-layout-diners"}" data-${prefix}-matrix-track aria-label="${escapeHtml(t("summary.screensLabel"))}">
      ${screens.map((screen) => render(screen, { kitchen, activeIndex })).join("")}
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

export function scrollSummaryMatrix(
  container,
  index,
  { kitchen = false, smooth = true } = {},
) {
  const prefix = kitchen ? "kitchen" : "summary";
  const normalizedIndex = Number(index) === 1 ? 1 : 0;
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

function renderScreen(screen, { kitchen, activeIndex }) {
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
          ${kitchen ? "" : renderClassicNamesRow(screen)}
        </tbody>
      </table>
      ${kitchen ? renderNotes(screen) : ""}
    </section>
  `;
}

function renderCaption(screen, kitchen) {
  if (kitchen) {
    return `<caption class="sr-only">${escapeHtml(`${t("kitchen.title")}: ${t(screen.labelKey)}`)}</caption>`;
  }
  return `
    <caption class="summary-matrix-caption">
      <time datetime="${escapeHtml(screen.dateId)}">${escapeHtml(formatLongDate(screen.dateId))}</time>
    </caption>
  `;
}

function mealIcon(mealTypeId) {
  return { breakfast: "☕", lunch: "🍝", dinner: "🍽" }[mealTypeId] || "•";
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
  return `<ul class="summary-matrix-diets">${column.sickDiets.map((tag) => `<li>${escapeHtml(formatDietLabel(tag))}</li>`).join("")}</ul>`;
}

function renderMassCell(column) {
  if (column.massStatus === "UNKNOWN") return renderEmpty(t("summary.notSet"));
  const yes = column.massStatus === "YES";
  return `<span class="summary-matrix-mass-${yes ? "yes" : "no"}">${escapeHtml(t(yes ? "summary.yes" : "summary.no"))}</span>`;
}

function renderClassicNamesRow(screen) {
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
      ${screen.columns.map((column) => `<td class="${dateClasses(column, screen).trim()}">${renderNamesCell(column, { compactActions: true })}</td>`).join("")}
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
        `<td class="summary-matrix-mass-band${dateClasses(group, screen)}${massStateClass(group.massStatus)}" colspan="${group.span}"><span class="summary-matrix-mass-day">${escapeHtml(relativeDayLabel(group.dayIndex))}</span>${renderMassCell(group)}</td>`,
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
    formatDietLabel(left.tag).localeCompare(
      formatDietLabel(right.tag),
      getLocale(),
    ),
  );
  return `<ul class="summary-matrix-diets">${diets.map((diet) => `<li>${escapeHtml(formatDietLabel(diet.tag))}</li>`).join("")}</ul>`;
}

function renderKitchenDietCell(column) {
  if (column.specialDiets.participantCount === 0)
    return renderEmpty(t("summary.noDiet"));
  const labels = [...new Set(column.specialDiets.items.map((diet) => formatKitchenDietLabel(diet.tag)))].sort(
    (left, right) => left.localeCompare(right, getLocale()),
  );
  return `<ul class="summary-matrix-diets summary-matrix-kitchen-diets">${labels.map((label) => `<li>${escapeHtml(label)}</li>`).join("")}</ul>`;
}

function formatKitchenDietLabel(tag) {
  const value = String(tag || "").trim();
  return /^\d+$/.test(value) ? value : formatDietLabel(value);
}

function renderNamesCell(column, { compactActions = false } = {}) {
  if (column.names.length === 0) return renderEmpty(t("summary.noName"));
  return `<ul class="summary-matrix-names">${column.names
    .map((participant) => {
      const diets = participant.dietTags.map((tag) => formatDietLabel(tag));
      const phone = normalizePhone(participant.phone);
      const displayName = escapeHtml(participant.displayName);
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

function renderInternationalScreen(screen, { kitchen, activeIndex }) {
  const prefix = kitchen ? "kitchen" : "summary";
  const isActive = screen.index === activeIndex;
  const densityClass = hasSpecialOperationalContent(screen)
    ? " summary-screen-has-special"
    : " summary-screen-ordinary";
  return `
    <section class="summary-matrix-screen summary-international-screen${densityClass}" data-${prefix}-screen="${screen.index}" role="tabpanel" aria-hidden="${!isActive}">
      ${kitchen ? `<h2 class="sr-only">${escapeHtml(`${t("kitchen.title")}: ${t(screen.labelKey)}`)}</h2>` : `<header class="summary-international-title"><time datetime="${escapeHtml(screen.dateId)}">${escapeHtml(formatLongDate(screen.dateId))}</time></header>`}
      <div class="summary-international-grid">
        ${screen.columns.map((column) => renderInternationalCard(column, { kitchen })).join("")}
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

function renderInternationalCard(column, { kitchen }) {
  const diets = kitchen ? renderKitchenDietCell(column) : renderDietCell(column);
  return `
    <article class="summary-international-card summary-day-tone-${normalizeDayTone(column.dayIndex)}${column.mealTypeId === "breakfast" ? " summary-international-card-next" : ""}">
      <header>
        <span class="summary-international-card-icon" aria-hidden="true">${mealIcon(column.mealTypeId)}</span>
        <div><strong>${escapeHtml(localizedMealLabel(column))}</strong><time datetime="${escapeHtml(column.dateId)}">${escapeHtml(formatDate(column.dateId))}</time></div>
      </header>
      <dl>
        ${column.guestCount > 0 ? `<div><dt>${escapeHtml(t("summary.guests"))}</dt><dd>${column.guestCount}</dd></div>` : ""}
        <div><dt>${escapeHtml(t("summary.diningMeals"))}</dt><dd>${renderDiningTotal(column)}</dd></div>
        ${column.specialDiets.participantCount > 0 ? `<div><dt>${escapeHtml(t("summary.includedDiets"))}</dt><dd>${diets}</dd></div>` : ""}
        ${column.sickCount > 0 ? `<div><dt>${escapeHtml(t("summary.sickMeals"))}</dt><dd>${renderSickMealCell(column)}</dd></div>` : ""}
        ${column.sickDiets.length > 0 ? `<div><dt>${escapeHtml(t("summary.sickDiets"))}</dt><dd>${renderSickDietCell(column)}</dd></div>` : ""}
      </dl>
      ${kitchen ? "" : `<section class="summary-international-names"><h3>${escapeHtml(t("summary.names"))}</h3>${renderNamesCell(column, { compactActions: true })}</section>`}
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
              <span>${escapeHtml(relativeDayLabel(group.dayIndex))}</span>
              ${renderMassCell(group)}
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
    <section class="kitchen-notes" aria-label="${escapeHtml(t("kitchen.notes"))}">
      <h3>${escapeHtml(t("kitchen.notes"))}</h3>
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

const { chromium } = require('C:/Users/romolo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const { functionSource } = await import('../tests/helpers/app-functions.mjs');
  const source = ['refreshWeekInvited', 'handleWeekInvitedSave'].map(functionSource).join('\n');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<select id="day"><option value="0">Oggi</option></select><input data-week-invited-meal="lunch"><input data-week-invited-meal="dinner"><input data-week-invited-meal="breakfast"><button id="save"></button><p id="status"></p>');
    console.log(await page.evaluate(async source => {
      const elements = { weekInvitedInputs: document.querySelectorAll('[data-week-invited-meal]'),
        weekInvitedDay: document.querySelector('#day'), weekInvitedSave: document.querySelector('#save'),
        weekInvitedStatus: document.querySelector('#status'), weekOperationsDate: {} };
      const saves = [];
      const dependencies = { elements, state: { weekOperationalDateId: '2026-10-18' },
        weekInvitedTodayId: null, weekInvitedRequest: 0, weekInvitedLoaded: null,
        getCenterToday: () => new Date('2026-10-18T12:00:00'), formatDateId: d => d.toISOString().slice(0, 10),
        getActiveCenterId: () => 'center', getWeekInvitedDates: () => ({ date: new Date('2026-10-18T12:00:00'), breakfast: new Date('2026-10-19T12:00:00') }),
        loadDailyHealth: async () => ({ invitedMeals: {} }), t: key => key, renderWeekInvitedStatus: () => {},
        friendlyErrorMessage: e => e.message, blockOfflineAction: () => false, canManageDailyOperations: () => true,
        saveInvitedMeals: async (_, values) => saves.push(values), refreshWeekInvitedOnNewDay: async () => {}, document };
      const h = new Function(...Object.keys(dependencies), source + ';return {refreshWeekInvited,handleWeekInvitedSave};')(...Object.values(dependencies));
      if (!(elements.weekInvitedInputs instanceof NodeList)) throw new Error('Not a real NodeList');
      await h.refreshWeekInvited();
      if (elements.weekInvitedSave.disabled) throw new Error(elements.weekInvitedStatus.textContent);
      elements.weekInvitedInputs[0].value = '17';
      await h.refreshWeekInvited(true);
      if (elements.weekInvitedInputs[0].value !== '17') throw new Error('Draft lost');
      await h.handleWeekInvitedSave();
      if (saves[0]?.lunch !== 17 || elements.weekInvitedSave.disabled) throw new Error('Save failed');
      return 'Real browser NodeList: load, dirty refresh and save passed';
    }, source));
  } finally { await browser.close(); }
})();

const path = require('node:path');
const { createDomainPreviewRecords, extendEntertainmentDomainPreview } = require('./domain-preview-records.cjs');

// Run the actual development-preview source route and shared UI. Every account,
// request and storage operation belongs to the local browser fixture.
module.exports = async function checkDomainPreviewUI({ page, origin, out, width, expect, entertainmentOnly = false }) {
  const prefix = 'ottlog-mini-preview-v1:';
  const domainKey = `${prefix}ottlog-mini-tool-v1:guest:domains`;
  const habitKey = `${prefix}ottlog-mini-tool-v1:guest:reminders`;
  const draftKey = `${prefix}ottlog-mini-entry-draft-v1:guest`;
  const previewNow = Date.parse('2026-10-08T12:00:00');
  await page.clock.install({ time: new Date(previewNow) });
  const samples = createDomainPreviewRecords(previewNow);
  const expectedDomains = extendEntertainmentDomainPreview(samples).domains;
  const ordinaryGuest = structuredClone(samples), ordinaryAccount = structuredClone(samples);
  ordinaryGuest.domains[0].name = '普通游客哨兵';
  ordinaryAccount.domains[0].name = '普通账号哨兵';
  const sentinels = {
    'ottlog-mini-tool-v1:guest:domains': JSON.stringify({ data: ordinaryGuest, pending: false, revision: 12 }),
    'ottlog-mini-tool-v1:reader:preview-sentinel:domains': JSON.stringify({ data: ordinaryAccount, pending: true, revision: 17 }),
    'ottlog-mini-tool-v1:guest:reminders': JSON.stringify({ data: { version: 1, items: [], done: {}, sentinel: '普通游客习惯' }, pending: false, revision: 3 }),
    'ottlog-mini-tool-v1:reader:preview-sentinel:reminders': JSON.stringify({ data: { version: 1, items: [], done: {}, sentinel: '普通账号习惯' }, pending: true, revision: 8 }),
    'ottlog-mini-entry-draft-v1:guest': JSON.stringify({ sentinel: '普通游客草稿' }),
    'ottlog-mini-entry-draft-v1:reader:preview-sentinel': JSON.stringify({ sentinel: '普通账号草稿' }),
    'ottlog-mini-tool-identity-v1': JSON.stringify({ owner: 'reader:preview-sentinel', fingerprint: 'fixture-account-cookie' }),
    'ottlog.cookies': JSON.stringify({ session: 'fixture-account-cookie' }),
  };
  await page.addInitScript(values => {
    for (const [key, value] of Object.entries(values)) if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
  }, sentinels);
  const screen = () => page.locator('.domains-page');
  const column = kind => page.locator(`.domain-record-column.is-${kind}`);
  const composer = () => page.locator('.entry-composer');
  const recordInput = () => composer().getByRole('textbox', { name: '记录内容', exact: true });
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), domainKey);
  const savedHabits = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), habitKey);
  const scroll = () => screen().locator('xpath=ancestor::*[contains(@class,"page-scroll")]').first();
  const ordinaryUntouched = async () => {
    const actual = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(sentinels));
    expect(actual, 'Preview initialization and editing preserve all ordinary account/guest/cache/draft sentinels').toEqual(sentinels);
    const accesses = await page.evaluate(() => ({
      reads: window.__miniFixture.storageReads || [],
      writes: window.__miniFixture.storageWrites || [],
      removals: window.__miniFixture.storageRemovals || [],
      requests: window.__miniRequests,
    }));
    for (const kind of ['reads', 'writes', 'removals']) expect(accesses[kind].filter(key => Object.hasOwn(sentinels, key)), `Ordinary sentinels are never accessed by preview ${kind}`).toEqual([]);
    expect(accesses.requests.filter(request => request.path === '/account/session' || request.path.startsWith('/personal-tools/')), 'Preview tools never call account-session or account-data APIs').toEqual([]);
    expect(accesses.writes.filter(key => key.startsWith('ottlog-mini-tool-v1:') || key.startsWith('ottlog-mini-entry-draft-v1:')), 'Preview saves only the isolated tool/draft namespace').toEqual([]);
  };
  await page.goto(`${origin}/#/pages/preview-data/index`);
  await expect(page).toHaveURL(/#\/pages\/domains\/index$/);
  await expect(screen().locator('.domain-first-grid').getByRole('button', { name: /^打开.+领域$/ })).toHaveCount(8);
  const seeded = await saved();
  expect(seeded.pending).toBe(false);
  expect(seeded.revision).toBe(0);
  expect(seeded.data.domains.map(domain => [domain.id, domain.name, domain.iconId])).toEqual(expectedDomains.map(domain => [domain.id, domain.name, domain.iconId]));
  expect(seeded.data.domains.map(domain => [domain.positiveRecords.length, domain.negativeRecords.length, domain.habits.length])).toEqual(expectedDomains.map(domain => domain.id === 'entertainment' ? [0, 0, 0] : [7, ['growth', 'work', 'life', 'media'].includes(domain.id) ? 5 : 4, 0]));
  await expect(screen().locator('.domain-record-column.is-negative .domain-record')).toHaveCount(4);
  await expect(screen().locator('.domain-record-column.is-positive .domain-record')).toHaveCount(6);
  expect(seeded.data.completedGoals).toHaveLength(36);
  const expectedCounts = [[3, 6, 1], [2, 4, 1], [1, 3, 1], [2, 2, 2], [0, 5, 1], [1, 1, 1], [0, 1, 0], [2, 3, 1]];
  const domainCards = screen().getByRole('button', { name: /^打开.+领域$/ });
  for (let index = 0; index < 8; index++) {
    await expect(domainCards.nth(index).locator('.domain-progress-counts > span')).toHaveText(expectedCounts[index].map(String));
    await expect(domainCards.nth(index).locator('.domain-progress-card-goal .domain-progress-goal-content')).toHaveText(samples.domains[index].shortTermGoal.content);
    await expect(domainCards.nth(index).locator('.domain-progress-long-goal,.domain-progress-goals')).toHaveCount(0);
  }
  await expect(screen().locator('.domains-recent-records .domains-recent-record')).toHaveCount(10);
  await expect(screen().locator('.domains-recent-records .section-title,.domains-recent-records .domain-record-add,.domains-recent-records .domains-recent-meta'), 'The preview uses the same content-only recent panel').toHaveCount(0);
  const indexViewport = await screen().evaluate(node => {
    const outer = node.closest('.page-scroll'), recent = node.querySelector('.domains-recent-records').getBoundingClientRect(), grid = node.querySelector('.domain-first-grid').getBoundingClientRect();
    return { recentBottom: recent.bottom, gridTop: grid.top, outerOverflow: outer.scrollHeight - outer.clientHeight, outerTop: outer.scrollTop };
  });
  expect(indexViewport.recentBottom).toBeLessThanOrEqual(indexViewport.gridTop);
  expect(indexViewport.outerOverflow, 'The domain page remains fixed').toBeLessThanOrEqual(1); expect(indexViewport.outerTop).toBe(0);
  expect(await screen().locator('.domain-entry-scroll').evaluate(node => node.scrollHeight - node.clientHeight)).toBeGreaterThan(40);
  expect(await page.evaluate(() => window.__miniFixture.guestToolStates), 'Source seed route owns preview data instead of the ordinary guest fixture shortcut').toBeUndefined();
  const cards = await screen().locator('.domain-first-grid').getByRole('button', { name: /^打开.+领域$/ }).evaluateAll(nodes => {
    const viewport = document.querySelector('.preview-content').getBoundingClientRect();
    return nodes.map(node => { const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, height: box.height, viewport: { left: viewport.left, right: viewport.right, top: viewport.top, bottom: viewport.bottom } }; });
  });
  for (const card of cards) {
    expect(card.top).toBeGreaterThanOrEqual(card.viewport.top - 1);
    expect(card.bottom, `${width}: all eight default domain cards are complete in the initial viewport`).toBeLessThanOrEqual(card.viewport.bottom + 1);
    expect(card.left).toBeGreaterThanOrEqual(card.viewport.left - 1);
    expect(card.right).toBeLessThanOrEqual(card.viewport.right + 1);
    expect(card.height).toBeGreaterThan(40);
  }
  await ordinaryUntouched();
  await page.screenshot({ path: path.join(out, `domain-preview-index-${width}.png`) });
  const entertainment = screen().locator('.domain-continuation-grid').getByRole('button', { name: '打开娱乐领域', exact: true });
  await expect(screen().locator('.domain-first-grid').getByRole('button', { name: '打开娱乐领域', exact: true })).toHaveCount(0);
  const entertainmentTop = await entertainment.evaluate(node => ({ top: node.getBoundingClientRect().top, viewportBottom: document.querySelector('.domain-entry-scroll').getBoundingClientRect().bottom }));
  expect(entertainmentTop.top, 'Entertainment starts after the first-screen eight cards').toBeGreaterThanOrEqual(entertainmentTop.viewportBottom - 1);
  await entertainment.scrollIntoViewIfNeeded(); await expect(entertainment).toBeInViewport();
  await page.screenshot({ path: path.join(out, `domain-preview-entertainment-second-${width}.png`) });
  await entertainment.click();
  await expect(page).toHaveURL(/domain-detail\/index\?id=entertainment$/);
  await expect(screen().locator('.domain-goal-card.has-goal,.domain-record')).toHaveCount(0);
  await expect(screen().locator('.domain-goal-content')).toHaveText(['设置长期目标', '设置短期目标']);
  expect((await saved()).data, 'Reading the empty entertainment card does not write preview records').toEqual(seeded.data);
  await page.getByRole('button', { name: '返回领域列表', exact: true }).click();
  await expect(page).toHaveURL(/#\/pages\/domains\/index$/);
  if (entertainmentOnly) {
    await page.evaluate(() => { location.hash = '#/pages/preview-data/index'; });
    await expect(page).toHaveURL(/#\/pages\/domains\/index$/);
    expect(await saved(), 'Repeated seed-route access keeps the empty card and original archive unchanged').toEqual(seeded);
    await expect(screen().getByRole('button', { name: '打开娱乐领域', exact: true })).toHaveCount(1);
    await ordinaryUntouched();
    return;
  }
  await scroll().evaluate(node => { node.scrollTop = 0; });
  await screen().getByRole('button', { name: '打开工作领域', exact: true }).click();
  await expect(screen().locator('.domain-card')).toHaveCount(1);
  const sample = seeded.data.domains.find(domain => domain.id === 'work');
  await expect(screen().locator('.domain-goal-content')).toHaveText([sample.longTermGoal.content, sample.shortTermGoal.content]);
  await expect(screen().getByRole('button', { name: '查看习惯：正事番茄钟', exact: true }), 'The domain still displays the original shared reminders habit').toHaveCount(1);
  await page.getByRole('button', { name: '查看工作已完成目标', exact: true }).click();
  const history = samples.completedGoals.filter(goal => goal.domainId === 'work').slice().reverse();
  await expect(page.locator('.domain-history-item')).toHaveCount(history.length);
  await expect(page.locator('.domain-history-item')).toContainText(history.map(goal => goal.content));
  await page.locator('.domain-sheet').getByRole('button', { name: '关闭编辑', exact: true }).click();
  const storedBeforeReading = (await saved()).data;
  await expect(screen().locator('.domain-record-add')).toHaveCount(0);
  for (const kind of ['positive', 'negative']) {
    const expected = sample[`${kind}Records`].slice().reverse().map(record => record.content);
    await expect(column(kind).locator('.domain-record-content')).toHaveText(expected);
    const typography = await column(kind).evaluate(node => {
      const title = getComputedStyle(node);
      return { size: title.fontSize, color: title.color, overflow: getComputedStyle(node).overflowY, records: [...node.querySelectorAll('.domain-record-plain')].map(child => ({ size: getComputedStyle(child).fontSize, color: getComputedStyle(child).color })) };
    });
    expect(typography.records.length).toBe(expected.length);
    for (const record of typography.records) {
      expect(record.size).toBe(typography.size);
      expect(record.color).toBe(typography.color);
    }
    expect(typography.overflow).toBe('visible');
  }
  await scroll().evaluate(node => { node.scrollTop = 0; });
  await page.screenshot({ path: path.join(out, `domain-preview-detail-${width}.png`) });
  await column('positive').evaluate(node => {
    const scroll = node.closest('.page-scroll');
    scroll.scrollTop += node.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
  });
  await page.screenshot({ path: path.join(out, `domain-preview-records-${width}.png`) });
  await column('positive').locator('.domain-record').last().scrollIntoViewIfNeeded();
  await expect(column('positive').locator('.domain-record').last()).toBeInViewport();
  const recordScroll = await scroll().evaluate(node => ({ top: node.scrollTop, overflow: node.scrollHeight - node.clientHeight }));
  if (recordScroll.overflow > 1) expect(recordScroll.top, 'Older samples use the original PageScroll when the content exceeds the screen').toBeGreaterThan(0);
  await page.screenshot({ path: path.join(out, `domain-preview-history-bottom-${width}.png`) });
  expect((await saved()).data, 'Sorting for reading does not rewrite the original appended sample arrays').toEqual(storedBeforeReading);
  await ordinaryUntouched();
  const draftText = `领域预览草稿 ${width}`;
  const createdText = `领域预览新增记录 ${width}`;
  await column('positive').dispatchEvent('click');
  await expect(composer()).toBeVisible();
  await expect(composer().getByRole('button', { name: '选择记录领域', exact: true })).toHaveText('工作');
  await recordInput().fill(draftText);
  await composer().getByRole('button', { name: '关闭编辑', exact: true }).click();
  await expect(composer()).toHaveCount(0);
  const localDraft = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), draftKey);
  expect(localDraft.progress.positive.content).toBe(draftText);
  expect((await saved()).data).toEqual(storedBeforeReading);
  await ordinaryUntouched();
  await page.reload();
  await expect(screen().locator('.domain-card')).toHaveCount(1);
  await column('positive').dispatchEvent('click');
  await expect(recordInput(), 'Preview draft resumes after refreshing the actual page').toHaveValue(draftText);
  await recordInput().fill(createdText);
  await composer().getByRole('button', { name: '保存记录', exact: true }).click();
  await expect(composer()).toHaveCount(0);
  await expect(column('positive').locator('.domain-record-content').first()).toHaveText(createdText);
  await expect(column('positive').locator('.domain-record')).toHaveCount(sample.positiveRecords.length + 1);
  const added = (await saved()).data;
  expect(added.domains.find(domain => domain.id === 'work').positiveRecords.filter(record => record.content === createdText)).toHaveLength(1);
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey), 'Successful save removes only the isolated preview draft').toBeNull();
  await ordinaryUntouched();
  await page.reload();
  await expect(column('positive').locator('.domain-record-content').first()).toHaveText(createdText);
  expect((await saved()).data).toEqual(added);
  await page.getByRole('button', { name: `编辑正记录：${createdText}`, exact: true }).click();
  await page.getByRole('button', { name: `删除正记录：${createdText}`, exact: true }).click();
  await expect(page.locator('.domain-sheet-record-edit')).toHaveCount(0);
  await expect(column('positive').locator('.domain-record')).toHaveCount(sample.positiveRecords.length);
  await expect(composer(), 'Record deletion does not bubble into the creation entry').toHaveCount(0);
  await page.reload();
  await expect(column('positive').locator('.domain-record-content')).toHaveText(sample.positiveRecords.slice().reverse().map(record => record.content));
  expect((await saved()).data).toEqual(storedBeforeReading);
  await page.evaluate(() => { location.hash = '#/pages/preview-data/index'; });
  await expect(page).toHaveURL(/#\/pages\/domains\/index$/);
  expect((await saved()).data, 'Returning through the seed route preserves the existing preview instead of replacing its dates or IDs').toEqual(storedBeforeReading);
  await ordinaryUntouched();

  // The actual isolated seed route owns the comment history, not an injected UI fixture.
  const writingId = 'preview-v3-habit-morning-writing', seededHabits = await savedHabits();
  expect(seededHabits.data.items.filter(item => item.id === writingId)).toHaveLength(1);
  expect(seededHabits.data.items.find(item => item.id === writingId).title).toBe('晨间书写');
  const completedDays = Object.entries(seededHabits.data.done).filter(([, ids]) => ids.includes(writingId)).map(([day]) => day);
  expect(completedDays.filter(day => day.startsWith('2026-09-'))).toHaveLength(26);
  expect(completedDays.filter(day => day.startsWith('2026-10-'))).toHaveLength(7);
  expect(completedDays.every(day => day < '2026-10-08'), 'Preview samples never fabricate today/future completion').toBe(true);
  const writingComments = seededHabits.data.reflections.filter(item => item.habitId === writingId);
  const previousComments = writingComments.filter(item => item.day.startsWith('2026-09-')).sort((a, b) => b.day.localeCompare(a.day));
  expect(previousComments).toHaveLength(23);
  expect(writingComments.filter(item => item.day.startsWith('2026-10-'))).toHaveLength(4);
  expect(writingComments.every(item => item.createdAt <= previewNow && completedDays.includes(item.day))).toBe(true);
  expect(await page.evaluate(prefix => [localStorage.getItem(`${prefix}ottlog-domain-preview-seed-v2`), localStorage.getItem(`${prefix}ottlog-habit-comment-preview-seed-v3`)].map(JSON.parse), prefix)).toEqual([2, 3]);
  await page.evaluate(() => { location.hash = '#/pages/domain-detail/index?id=mind'; });
  await page.getByRole('button', { name: '查看习惯：晨间书写', exact: true }).click();
  const habitSheet = page.locator('.domain-sheet-habit-detail'), calendar = habitSheet.locator('.habit-calendar');
  const log = calendar.locator('.habit-calendar-log'), rows = log.locator('.habit-calendar-log-row');
  const more = () => log.getByRole('button', { name: '更多', exact: true });
  const commentText = entry => entry.text.replace(/\s+/g, ' ').trim();
  await expect(calendar.locator('.habit-calendar-month')).toHaveText('2026年10月');
  await expect(rows).toHaveCount(4);
  await expect(calendar.locator('.habit-calendar-stat-number').first()).toHaveText('7天');
  await expect(calendar.locator('.habit-calendar-day.is-future.is-completed')).toHaveCount(0);
  for (const day of await calendar.locator('button.habit-calendar-day.is-future').all()) await expect(day).toBeDisabled();
  await calendar.getByRole('button', { name: '查看上个月打卡', exact: true }).click();
  await expect(calendar.locator('.habit-calendar-month')).toHaveText('2026年9月');
  await expect(calendar.locator('.habit-calendar-stat-number').first()).toHaveText('26天');
  await expect(log.locator('.habit-calendar-log-heading')).toContainText('23 条');
  await expect(rows).toHaveCount(10);
  await expect(rows.locator('.habit-calendar-log-text')).toHaveText(previousComments.slice(0, 10).map(commentText));
  await expect(calendar.locator('.habit-calendar-log-toggle')).toHaveCount(0);
  await expect(rows.locator('button'), 'Month comments are shown directly without per-record expansion').toHaveCount(0);
  await log.evaluate(node => {
    const viewport = node.closest('.domain-sheet-scroll');
    viewport.scrollTop += node.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
  });
  await page.screenshot({ path: path.join(out, `habit-comment-preview-initial-${width}.png`) });
  async function checkMore() {
    await expect(more()).toHaveClass(/ui-button/);
    const geometry = await more().evaluate(node => {
      const box = node.getBoundingClientRect(), parent = node.parentElement.getBoundingClientRect(), css = getComputedStyle(node);
      return { height: box.height, left: box.left, right: box.right, parentLeft: parent.left, parentRight: parent.right, minHeight: css.minHeight };
    });
    expect(geometry.height).toBeGreaterThanOrEqual(40);
    expect(geometry.minHeight).toBe('40px');
    expect(Math.abs(geometry.left - geometry.parentLeft)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.right - geometry.parentRight)).toBeLessThanOrEqual(1);
    await more().scrollIntoViewIfNeeded();
    await expect(more()).toBeInViewport({ ratio: 1 });
  }
  await checkMore();
  await more().click();
  await expect(rows).toHaveCount(20);
  await expect(rows.locator('.habit-calendar-log-text')).toHaveText(previousComments.slice(0, 20).map(commentText));
  await checkMore();
  await page.screenshot({ path: path.join(out, `habit-comment-preview-more-${width}.png`) });
  await more().click();
  await expect(rows).toHaveCount(23);
  await expect(more()).toHaveCount(0);
  await expect(rows.locator('.habit-calendar-log-text')).toHaveText(previousComments.map(commentText));
  const fullText = await rows.locator('.habit-calendar-log-text').evaluateAll(nodes => nodes.map(node => {
    const css = getComputedStyle(node);
    return { text: node.textContent, clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, clamp: css.webkitLineClamp };
  }));
  for (const text of fullText) {
    expect(text.text.trim()).not.toBe('');
    expect(text.scrollHeight).toBeLessThanOrEqual(text.clientHeight + 1);
    expect(text.clamp).toBe('none');
  }
  for (const day of [22, 23, 24]) await expect(rows.locator('.habit-calendar-log-copy > div').filter({ hasText: `9月${day}日` }), 'Checked dates without comments are absent from the log').toHaveCount(0);
  await rows.last().scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, `habit-comment-preview-complete-${width}.png`) });
  expect((await savedHabits()).data, 'Month selection and pagination only read the seeded archive').toEqual(seededHabits.data);
  await calendar.getByRole('button', { name: '回到本月打卡', exact: true }).click();
  await expect(rows).toHaveCount(4);
  await calendar.getByRole('button', { name: '查看上个月打卡', exact: true }).click();
  await expect(rows).toHaveCount(10);
  await ordinaryUntouched();

  // Real editing/deletion and repeated initialization must retain the original ID and user changes.
  await habitSheet.getByRole('button', { name: '编辑习惯', exact: true }).click();
  const habitEditor = page.getByRole('dialog', { name: '编辑习惯', exact: true });
  const updatedTitle = `晨间书写修改 ${width}`, updatedNote = `保留预览编辑 ${width}`;
  await habitEditor.getByRole('textbox', { name: '习惯名称', exact: true }).fill(updatedTitle);
  await habitEditor.getByRole('textbox', { name: '提醒自己的话', exact: true }).fill(updatedNote);
  await habitEditor.getByRole('button', { name: '保存', exact: true }).click();
  await expect(habitEditor).toHaveCount(0);
  await habitSheet.getByRole('button', { name: '关闭习惯详情', exact: true }).click();
  const editedHabits = (await savedHabits()).data;
  expect(editedHabits.items.find(item => item.id === writingId)).toMatchObject({ title: updatedTitle, note: updatedNote });
  await page.evaluate(() => { location.hash = '#/pages/preview-data/index'; });
  await expect(page).toHaveURL(/#\/pages\/domains\/index$/);
  expect((await savedHabits()).data, 'Reopening the seed page retains an edited v3 habit and every original comment').toEqual(editedHabits);
  await page.evaluate(() => { location.hash = '#/pages/domain-detail/index?id=mind'; });
  await page.getByRole('button', { name: `查看习惯：${updatedTitle}`, exact: true }).click();
  await habitSheet.getByRole('button', { name: '编辑习惯', exact: true }).click();
  await habitEditor.getByRole('button', { name: '删除习惯', exact: true }).click();
  await page.getByRole('dialog', { name: '确认删除习惯', exact: true }).getByRole('button', { name: '确认删除习惯', exact: true }).click();
  await expect(habitEditor).toHaveCount(0);
  await expect(page.getByRole('button', { name: `查看习惯：${updatedTitle}`, exact: true })).toHaveCount(0);
  const deletedHabits = (await savedHabits()).data;
  expect(deletedHabits.items.some(item => item.id === writingId)).toBe(false);
  expect(deletedHabits.reflections.some(item => item.habitId === writingId)).toBe(false);
  expect(Object.values(deletedHabits.done).some(ids => ids.includes(writingId))).toBe(false);
  await page.evaluate(() => { location.hash = '#/pages/preview-data/index'; });
  await expect(page).toHaveURL(/#\/pages\/domains\/index$/);
  expect((await savedHabits()).data, 'The v3 marker prevents restoring a deleted sample, check-ins or comments').toEqual(deletedHabits);
  expect((await saved()).data, 'Habit preview reading and edits leave the domain archive intact').toEqual(storedBeforeReading);
  await ordinaryUntouched();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(2);
  console.log(`${width}: source domain preview, v3 comments 10/20/23, complete calendar/full text/full-width more, edit/delete/reseed preservation and ordinary storage/API isolation passed`);
};

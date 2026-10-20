const path = require('node:path');
const checkHabitCore = require('./check-habit-detail-layout.cjs');
const domainChoice = require('./check-progress-domain-choice.cjs');
const habitFilterControls = require('./habit-filter-test-helpers.cjs');

// Real React interactions with local Taro/storage/API adapters. This is a
// browser regression check, not a substitute for WeChat developer-tool review.
module.exports = async function checkDomainWorkflow({ page, origin, out, width, expect, checkCreateButton }) {
  const habitFilter = habitFilterControls({ page, expect });
  const screen = () => page.locator('.domains-page');
  const sheet = () => page.locator('.domain-sheet');
  const card = name => screen().locator('.domain-card').filter({ has: page.locator('.domain-name', { hasText: new RegExp(`^${name}$`) }) });
  const click = name => page.getByRole('button', { name, exact: true }).click();
  const deleteRecord = async (sign, content) => { await click(`编辑${sign}记录：${content}`); await click(`删除${sign}记录：${content}`); await expect(page.locator('.domain-sheet-record-edit')).toHaveCount(0); };
  const openDomain = async (name = '工作') => {
    if (!page.url().includes('/pages/domain-detail/index')) await click(`打开${name}领域`);
    await expect(screen().locator('.domain-card')).toHaveCount(1);
  };
  const historyButton = () => page.getByRole('button', { name: '查看工作已完成目标', exact: true });
  async function checkCount(value) {
    await expect(historyButton()).toHaveText('已完成目标');
    const route = await page.evaluate(() => location.hash);
    await page.evaluate(() => { location.hash = '#/pages/statistics/index?panel=domains'; });
    const choice = page.getByRole('button', { name: '查看工作统计', exact: true });
    await expect(choice.locator('.statistics-domain-goals')).toHaveText(String(value));
    await page.evaluate(hash => { location.hash = hash; }, route);
    await expect(historyButton()).toHaveText('已完成目标');
  }
  const goalInput = () => sheet().getByRole('textbox', { name: '目标内容', exact: true });
  const recordSheet = () => page.locator('.entry-composer');
  const habitEditor = () => page.locator('.daily-editor-sheet');
  const reminderState = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:reminders'))?.data);
  const recordInput = () => recordSheet().getByRole('textbox', { name: '记录内容', exact: true });
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:domains'))?.data);
  const domainOrder = () => screen().locator('.domain-progress-name').evaluateAll(nodes => nodes.map(node => `打开${node.textContent}领域`));
  async function indexSummary({ long, short, habit = 0, longGoal, shortGoal, longCompleted = false, shortCompleted = false }) {
    const route = await page.evaluate(() => location.hash);
    await page.evaluate(() => { location.hash = '#/pages/domains/index'; });
    const entry = screen().getByRole('button', { name: '打开工作领域', exact: true });
    await expect(entry.locator('.domain-progress-track'), 'Domain list reuses the same one-line progress summary').toHaveCount(1);
    for (const [kind, value] of [['long', long], ['short', short], ['habit', habit]]) await expect(entry.locator(`.domain-progress-${kind}-count`)).toHaveText(String(value));
    await expect(entry.locator('.domain-progress-goals,.domain-progress-long-goal'), 'The full two-goal summary stays in detail').toHaveCount(0);
    await expect(entry.locator('.domain-progress-card-goal .domain-progress-goal-content')).toHaveText(shortGoal || '未设置');
    if (shortCompleted) await expect(entry.locator('.domain-progress-card-goal')).toHaveClass(/is-completed/);
    else await expect(entry.locator('.domain-progress-card-goal')).not.toHaveClass(/is-completed/);
    const segments = await entry.locator('.domain-progress-track').evaluate(node => {
      const box = node.getBoundingClientRect();
      return [...node.querySelectorAll('.domain-progress-segment')].map(segment => { const rect = segment.getBoundingClientRect(); return { left: rect.left - box.left, right: rect.right - box.left, fraction: rect.width / box.width, color: getComputedStyle(segment).backgroundColor }; });
    });
    const expected = [[long, 6, 'rgb(131, 181, 234)'], [short, 3, 'rgb(232, 149, 154)'], [habit, 1, 'rgb(157, 211, 173)']].filter(([value]) => value);
    expect(segments).toHaveLength(expected.length);
    const scale = Math.max(1, long * 6 + short * 3 + habit);
    let end = 0;
    for (const [index, [value, weight, color]] of expected.entries()) {
      expect(segments[index].fraction).toBeCloseTo(value * weight / scale, 2);
      expect(segments[index].color).toBe(color);
      expect(segments[index].left, 'List progress segments are continuous').toBeCloseTo(end, 1);
      end = segments[index].right;
    }
    if (habit) await page.screenshot({ path: path.join(out, `domains-progress-populated-${width}.png`) });
    if (longCompleted) await page.screenshot({ path: path.join(out, `domains-progress-completed-${width}.png`) });
    await page.evaluate(hash => { location.hash = hash; }, route);
  }
  async function checkDefaultIndex(count = 8) {
    const geometry = await screen().evaluate(node => {
      const scroll = node.closest('.page-scroll'), viewport = document.querySelector('.preview-content').getBoundingClientRect();
      const recent = node.querySelector('.domains-recent-records');
      const grid = node.querySelector('.domain-first-grid').getBoundingClientRect();
      return { overflow: scroll.scrollHeight - scroll.clientHeight, scrollTop: scroll.scrollTop, recent: !!recent, recentBottom: recent?.getBoundingClientRect().bottom, gridTop: grid.top, gridBottom: grid.bottom, viewportTop: viewport.top, viewportBottom: viewport.bottom,
        rows: [...node.querySelectorAll('.domain-entry')].map(entry => {
          const box = entry.getBoundingClientRect();
          const icon = entry.querySelector('.domain-progress-icon'), iconBox = icon.getBoundingClientRect(), iconStyle = getComputedStyle(icon);
          const bodyBox = entry.querySelector('.domain-progress-body').getBoundingClientRect();
          return { left: box.left, top: box.top - viewport.top, bottom: box.bottom - viewport.bottom, height: box.height, width: box.width,
            iconWidth: iconBox.width, iconHeight: iconBox.height, iconLeftGap: iconBox.left - box.left, iconGap: bodyBox.left - iconBox.right,
            iconVisible: iconStyle.display !== 'none' && iconStyle.visibility === 'visible' && Number(iconStyle.opacity) > 0,
            tracks: entry.querySelectorAll('.domain-progress-track').length, clipped: [...entry.querySelectorAll('.domain-progress-icon,.domain-progress-name,.domain-progress-counts,.domain-progress-counts > *,.domain-progress-track,.domain-progress-goal')].some(child => { const rect = child.getBoundingClientRect(); return rect.top < box.top - 1 || rect.bottom > box.bottom + 1 || rect.left < box.left - 1 || rect.right > box.right + 1; }) };
        }) };
    });
    expect(geometry.rows).toHaveLength(count);
    expect(geometry.recent, 'The recent-record window precedes the domain grid').toBe(true);
    expect(geometry.recentBottom).toBeLessThanOrEqual(geometry.gridTop);
    expect(geometry.overflow, 'The domain page remains fixed').toBeLessThanOrEqual(1);
    expect(await screen().locator('.domain-entry-scroll').evaluate(node => node.scrollHeight - node.clientHeight), 'Further domains remain reachable inside the card window').toBeGreaterThan(40);
    expect(geometry.scrollTop).toBe(0);
    expect(new Set(geometry.rows.map(row => Math.round(row.left))).size, 'Main domains use two card columns at every width').toBe(2);
    for (const [index, row] of geometry.rows.entries()) {
      expect(row.tracks).toBe(1);
      expect(row.top).toBeGreaterThanOrEqual(-1);
      if (index < 8) expect(row.bottom, 'The first eight main-list cards are fully visible').toBeLessThanOrEqual(1);
      else expect(row.top + geometry.viewportTop, 'Further cards start below the card viewport').toBeGreaterThanOrEqual(geometry.gridBottom - 1);
      expect(row.height).toBeGreaterThanOrEqual(40);
      expect(Math.abs(row.width - geometry.rows[0].width), 'Domain cards have equal column widths').toBeLessThanOrEqual(1);
      expect(row.iconWidth, 'Main domain icons use the larger fixed size at every width').toBeCloseTo(40, 1);
      expect(row.iconHeight, 'Main domain icons retain a square aspect').toBeCloseTo(40, 1);
      expect(row.iconVisible, 'Every main domain icon is visible').toBe(true);
      expect(row.iconLeftGap, 'Icons retain the card inner left inset').toBeCloseTo(12, 1);
      expect(row.iconGap, 'Icons leave equal space before the name, counts and progress').toBeCloseTo(row.iconLeftGap, 1);
      expect(row.clipped, 'Larger icons and the original name, counts and progress remain inside each card').toBe(false);
    }
  }
  async function close() {
    await page.keyboard.press('Escape');
    await expect(sheet()).toHaveCount(0);
  }
  async function checkLayout() {
    const layout = await screen().evaluate(node => ({
      outer: document.documentElement.scrollWidth - innerWidth,
      screen: node.scrollWidth - node.clientWidth,
      cards: [...node.querySelectorAll('.domain-card,.domain-entry')].map(card => card.scrollWidth - card.clientWidth),
    }));
    expect(layout.outer, `${width}: document horizontal overflow`).toBeLessThanOrEqual(2);
    expect(layout.screen, `${width}: domain page horizontal overflow`).toBeLessThanOrEqual(2);
    expect(Math.max(0, ...layout.cards), `${width}: domain cards horizontal overflow`).toBeLessThanOrEqual(2);
  }
  async function checkSheet() {
    await expect(sheet()).toBeVisible();
    const layout = await sheet().evaluate(node => {
      const rect = node.getBoundingClientRect(), viewport = document.querySelector('.preview-content').getBoundingClientRect();
      return { top: rect.top - viewport.top, bottom: rect.bottom - viewport.bottom, overflow: node.scrollWidth - node.clientWidth };
    });
    expect(layout.top, `${width}: sheet avoids native header`).toBeGreaterThanOrEqual(-2);
    expect(layout.bottom, `${width}: sheet fits visible page`).toBeLessThanOrEqual(2);
    expect(layout.overflow, `${width}: sheet horizontal overflow`).toBeLessThanOrEqual(2);
  }
  async function checkHabitPriority(selected) {
    const editor = page.locator('.daily-editor-sheet');
    await require('./check-habit-editor-fields.cjs')(editor, expect, `domains/${width}`);
    const trigger = editor.getByRole('button', { name: '选择习惯优先度', exact: true });
    await expect(editor.locator('select'), 'Habit fields use floating choices').toHaveCount(0);
    await expect(editor.getByRole('button', { name: '选择习惯图标', exact: true })).toHaveCount(1);
    await expect(editor.getByRole('textbox', { name: '提醒自己的话', exact: true })).toBeVisible();
    await expect(trigger).toHaveText('');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const fields = await editor.evaluate(node => {
      const box = selector => node.querySelector(selector).getBoundingClientRect();
      const icon = box('[aria-label="选择习惯图标"]'), title = box('[aria-label="习惯名称"]'), priority = box('[aria-label="选择习惯优先度"]');
      const row = box('.daily-title-row'), note = box('[aria-label="提醒自己的话"]'), domain = box('[aria-label="选择习惯领域"]');
      return { iconEnd: icon.right - title.left, titleEnd: title.right - priority.left, priorityEnd: row.right - priority.right, noteStart: note.top - row.bottom, domainEnd: domain.bottom - row.top };
    });
    expect(fields.iconEnd, `${width}: icon is left of the title`).toBeLessThanOrEqual(1);
    expect(fields.titleEnd, `${width}: priority is right of the title`).toBeLessThanOrEqual(1);
    expect(fields.priorityEnd, `${width}: priority is the rightmost title control`).toBeLessThanOrEqual(2);
    expect(fields.noteStart, `${width}: remarks follow the title`).toBeGreaterThanOrEqual(-1);
    expect(fields.domainEnd, `${width}: domain precedes the title`).toBeLessThanOrEqual(1);
    await trigger.click();
    const popup = editor.locator('.form-popover-panel');
    await expect(popup).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const options = popup.locator('.priority-options');
    await expect(options.locator('.priority-option')).toHaveText(['高优先度', '中优先度', '低优先度', '无优先度']);
    await expect(options.locator('[aria-pressed="true"]')).toHaveCount(1);
    await options.scrollIntoViewIfNeeded();
    for (const label of ['高', '中', '低', '无']) {
      const button = options.getByRole('button', { name: `优先度${label}`, exact: true });
      await expect(button).toHaveAttribute('aria-pressed', String(label === selected));
      await expect(button).toBeInViewport();
    }
    const layout = await options.evaluate(node => {
      const box = node.getBoundingClientRect(), panel = node.closest('.form-popover-panel').getBoundingClientRect();
      const viewport = document.querySelector('.preview-content').getBoundingClientRect(), trigger = document.querySelector('[aria-label="选择习惯优先度"]').getBoundingClientRect();
      return { overflow: node.scrollWidth - node.clientWidth, width: panel.width, top: panel.top - viewport.top, bottom: panel.bottom - viewport.bottom,
        left: panel.left - viewport.left, right: panel.right - viewport.right, anchorGap: panel.top >= trigger.bottom ? panel.top - trigger.bottom : trigger.top - panel.bottom,
        buttons: [...node.querySelectorAll('.priority-option')].map(button => {
        const rect = button.getBoundingClientRect(), flag = button.querySelector('.priority-flag').getBoundingClientRect(), text = button.querySelector(':scope > span');
        const range = document.createRange(); range.selectNodeContents(text);
        const label = range.getBoundingClientRect(), style = getComputedStyle(text);
        return { left: rect.left - box.left, right: rect.right - box.right, overflow: button.scrollWidth - button.clientWidth,
          height: rect.height, font: parseFloat(style.fontSize), lines: range.getClientRects().length, textHeight: label.height, lineHeight: parseFloat(style.lineHeight),
          flagEnd: flag.right - label.left, rightSpace: rect.right - label.right, textTop: label.top - rect.top, textBottom: label.bottom - rect.bottom };
      }) };
    });
    expect(layout.width, `${width}: full priority labels use a compact panel on every screen`).toBeLessThanOrEqual(137);
    expect(layout.top, `${width}: priority panel stays below native navigation`).toBeGreaterThanOrEqual(-1);
    expect(layout.bottom, `${width}: priority panel stays above the native bottom boundary`).toBeLessThanOrEqual(1);
    expect(layout.left, `${width}: priority panel stays within the left page boundary`).toBeGreaterThanOrEqual(-1);
    expect(layout.right, `${width}: priority panel stays within the right page boundary`).toBeLessThanOrEqual(1);
    expect(layout.anchorGap, `${width}: priority choices remain adjacent to their trigger`).toBeCloseTo(8, 0);
    expect(layout.overflow, `${width}: priority options horizontal overflow`).toBeLessThanOrEqual(2);
    for (const button of layout.buttons) {
      expect(button.left, `${width}: priority option starts within its row`).toBeGreaterThanOrEqual(-2);
      expect(button.right, `${width}: priority option ends within its row`).toBeLessThanOrEqual(2);
      expect(button.overflow, `${width}: full priority label fits`).toBeLessThanOrEqual(2);
      expect(button.height, `${width}: priority choice has a complete touch target`).toBeGreaterThanOrEqual(40);
      expect(button.font, `${width}: priority label retains the shared font size`).toBeCloseTo(14, 1);
      expect(button.lines, `${width}: full priority label stays on one line`).toBe(1);
      expect(button.textHeight, `${width}: full priority label is not wrapped`).toBeLessThanOrEqual(button.lineHeight + 1);
      expect(button.flagEnd, `${width}: flag does not overlap its label`).toBeLessThanOrEqual(-1);
      expect(button.rightSpace, `${width}: full label is visible inside the button`).toBeGreaterThanOrEqual(9);
      expect(button.rightSpace, `${width}: priority row has compact space after the label`).toBeLessThanOrEqual(24);
      expect(button.textTop, `${width}: full label top stays inside the button`).toBeGreaterThanOrEqual(-1);
      expect(button.textBottom, `${width}: full label bottom stays inside the button`).toBeLessThanOrEqual(1);
    }
    await page.screenshot({ path: path.join(out, `domains-priority-options-${selected}-${width}.png`) });
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await expect(editor).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  }
  async function chooseHabitPriority(label) {
    const editor = page.locator('.daily-editor-sheet');
    const trigger = editor.getByRole('button', { name: '选择习惯优先度', exact: true });
    await trigger.click();
    await editor.locator('.form-popover-panel').getByRole('button', { name: `优先度${label}`, exact: true }).click();
    await expect(editor.locator('.form-popover-panel')).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveText('');
  }
  async function chooseHabitDomain(label) {
    const editor = page.locator('.daily-editor-sheet');
    const trigger = editor.getByRole('button', { name: '选择习惯领域', exact: true });
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await editor.locator('.form-popover-panel').getByRole('button', { name: label, exact: true }).click();
    await expect(editor.locator('.form-popover-panel')).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveText(label);
  }
  async function editGoal(kind, content, editing = false) {
    if (!editing) await checkCreateButton(page.getByRole('button', { name: `创建工作${kind}目标`, exact: true }), '创建目标', expect, { iconOnly: true });
    await click(`${editing ? '编辑' : '创建'}工作${kind}目标`);
    await checkSheet();
    await goalInput().fill(content);
    await sheet().getByRole('button', { name: editing ? '保存' : '创建目标', exact: true }).click();
    await expect(sheet()).toHaveCount(0);
  }
  async function addRecord(kind, content) {
    await click(`添加工作${kind}记录`);
    await expect(recordSheet()).toBeVisible();
    await expect(recordSheet().getByRole('button', { name: '选择记录领域', exact: true })).toHaveText('工作');
    await recordInput(kind).fill(content);
    await recordSheet().getByRole('button', { name: `第一条记录类型：${kind}记录`, exact: true }).click();
    await recordSheet().getByRole('button', { name: '保存记录', exact: true }).click();
    await expect(recordSheet()).toHaveCount(0);
    await expect(card('工作')).toContainText(content);
  }
  async function checkRecordHistory() {
    const key = 'ottlog-mini-tool-v1:guest:domains';
    const originalCache = await page.evaluate(key => localStorage.getItem(key), key);
    const fixture = await page.evaluate(key => {
      const cache = JSON.parse(localStorage.getItem(key)), domain = cache.data.domains.find(row => row.id === 'work');
      const image = { id: 'record-history-image', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==' };
      const dates = ['2026-09-02T12:00:00.000Z', '2026-10-02T12:00:00.000Z', '2026-09-30T12:00:00.000Z', '2026-09-20T12:00:00.000Z', '2026-09-30T12:00:00.000Z', '2026-09-01T12:00:00.000Z'];
      const names = ['较早记录', '最新记录', '同时间先插入', '中间记录', '同时间后插入', '最早记录'];
      for (const [kind, sign] of [['positive', '正'], ['negative', '负']]) {
        domain[`${kind}Records`] = names.map((name, index) => ({ id: `record-history-${kind}-${index}`, createdAt: dates[index],
          content: index === 1 ? `# ${sign}${name}\n\n${sign}正文与**强调**、*斜体*、[链接](https://example.com)和\`行内代码\`。\n\n> ${sign}引用\n\n- ${sign}列表\n\n\`\`\`txt\n${sign}代码块\n\`\`\`\n\n| ${sign}表头 | 内容 |\n| --- | --- |\n| ${sign}表格 | 记录 |` : `${sign}${name}\n\n${'保留完整历史内容，可以向下滑动阅读。'.repeat(index === 5 ? 12 : 3)}`,
          ...(index === 5 ? { images: [image] } : {}) }));
      }
      localStorage.setItem(key, JSON.stringify(cache));
      return { data: cache.data, order: [1, 4, 2, 3, 0, 5], names };
    }, key);
    await page.reload();
    await openDomain();
    const columns = { positive: card('工作').locator('.domain-record-column.is-positive'), negative: card('工作').locator('.domain-record-column.is-negative') };
    for (const [kind, sign] of [['positive', '正'], ['negative', '负']]) {
      const column = columns[kind], records = column.locator('.domain-record');
      await expect(records, 'All signed records render without a two-record truncation').toHaveCount(6);
      const names = await records.locator('.domain-record-content').evaluateAll(nodes => nodes.map(node => node.textContent.trim().split('\n')[0]));
      expect(names, 'Newest createdAt comes first; equal timestamps retain reverse insertion order').toEqual(fixture.order.map(index => `${index === 1 ? '# ' : ''}${sign}${fixture.names[index]}`));
      const typography = await column.evaluate(node => {
        const expected = getComputedStyle(node);
        return { expected: { size: expected.fontSize, color: expected.color }, nodes: [...node.querySelectorAll('.domain-record-plain')].map(child => ({ tag: child.tagName, size: getComputedStyle(child).fontSize, color: getComputedStyle(child).color })), overflowY: getComputedStyle(node).overflowY };
      });
      expect(typography.nodes.length, 'Every historical record renders as plain text').toBe(6);
      await expect(column.locator('h1,strong,em,a,code,pre,table')).toHaveCount(0);
      for (const child of typography.nodes) {
        expect(child.size, `${width}: ${kind} ${child.tag} body size matches its signed title`).toBe(typography.expected.size);
        expect(child.color, `${width}: ${kind} ${child.tag} body color matches its signed title`).toBe(typography.expected.color);
      }
      expect(typography.overflowY, 'Each fixed record column clips its own scroll viewport').toBe('hidden');
      await expect(column.locator('.domain-record-scroll')).toHaveCSS('overflow-y', /auto|scroll/);
      await expect(column.locator('.domain-record-add')).toHaveCount(0);
      await column.locator('.domain-record').first().hover();
      expect(await column.locator('.domain-record-plain').first().evaluate(node => getComputedStyle(node).color), 'Hover feedback retains the signed record color').toBe(typography.expected.color);
    }
    expect(await columns.positive.evaluate(node => getComputedStyle(node).color), 'Positive and negative record colors remain distinct').not.toBe(await columns.negative.evaluate(node => getComputedStyle(node).color));
    await expect(card('工作').locator('.domain-record-more'), 'Full history needs no expand/collapse gate').toHaveCount(0);
    expect(await state(), 'Viewing sorted copies never rewrites the stored record arrays').toEqual(fixture.data);
    const scroll = screen().locator('xpath=ancestor::*[contains(@class,"page-scroll")]').first();
    expect(await scroll.evaluate(node => node.scrollHeight - node.clientHeight), 'Long histories keep the outer detail page fixed').toBeLessThanOrEqual(1);
    await columns.negative.locator('.domain-record').last().scrollIntoViewIfNeeded();
    await expect(columns.negative.locator('.domain-record-images img')).toBeInViewport();
    expect(await columns.negative.locator('.domain-record-scroll').evaluate(node => node.scrollTop), 'Older records are reached inside their own column').toBeGreaterThan(100);
    expect(await columns.positive.locator('.domain-record-scroll').evaluate(node => node.scrollTop), 'The other signed column remains at its original position').toBe(0);
    expect(await scroll.evaluate(node => node.scrollTop), 'Reading history does not move the detail page').toBe(0);
    await page.screenshot({ path: path.join(out, `domains-record-history-bottom-${width}.png`) });
    await columns.negative.locator('.domain-record-images img').click();
    await expect.poll(() => page.evaluate(() => window.__miniFixture.imagePreview?.current)).toBe('/preview-user-files/ottlog-memo-preview-0');
    await expect(recordSheet(), 'Image preview does not bubble into record creation').toHaveCount(0);
    const oldest = fixture.data.domains.find(row => row.id === 'work').negativeRecords[5];
    await deleteRecord('负', oldest.content);
    await expect(columns.negative.locator('.domain-record')).toHaveCount(5);
    await expect(recordSheet(), 'Record deletion does not bubble into record creation').toHaveCount(0);
    await page.reload();
    await openDomain();
    await expect(columns.negative.locator('.domain-record')).toHaveCount(5);
    await expect(columns.positive.locator('.domain-record')).toHaveCount(6);
    const refreshed = await columns.positive.locator('.domain-record-content').evaluateAll(nodes => nodes.map(node => node.textContent.trim().split('\n')[0]));
    expect(refreshed, 'Refresh retains chronological presentation').toEqual(fixture.order.map(index => `正${fixture.names[index]}`));
    await columns.positive.locator('.domain-record-scroll').evaluate(node => { node.scrollTop = 0; });
    await page.screenshot({ path: path.join(out, `domains-record-history-top-${width}.png`) });
    await page.evaluate(({ key, cache }) => localStorage.setItem(key, cache), { key, cache: originalCache });
    await page.reload();
    await openDomain();
    expect(await state(), 'History fixtures are removed before the original persistence/account tests continue').toEqual(JSON.parse(originalCache).data);
  }
  async function manageDomains() {
    const originalOrder = await domainOrder();
    await click('排序领域');
    await click('上移工作领域');
    expect((await state()).domains.slice(0, 2).map(domain => domain.name)).toEqual(['工作', '成长']);
    await click('下移工作领域');
    expect(await domainOrder()).toEqual(originalOrder);
    await click('排序领域');
    await expect(page.getByRole('button', { name: '管理领域', exact: true })).toHaveCount(0);
    await screen().locator('.domain-create-card').click();
    const definition = page.locator('.domain-definition-sheet');
    await definition.getByRole('textbox', { name: '领域名称', exact: true }).fill('旅行');
    await click('选择领域图标');
    const library = page.locator('.icon-library-sheet');
    await expect(library).toBeVisible();
    await library.getByRole('textbox', { name: '搜索图标', exact: true }).fill('旅行');
    await library.getByRole('button', { name: '选择图标：旅行', exact: true }).click();
    await definition.getByRole('button', { name: '创建领域', exact: true }).click();
    await expect(screen().locator('.domain-entry')).toHaveCount(9);
    const created = (await state()).domains.find(domain => domain.name === '旅行');
    expect(created?.iconId).toBe('travel');

    await openDomain('旅行'); await click('编辑旅行领域');
    await definition.getByRole('textbox', { name: '领域名称', exact: true }).fill('远行');
    await definition.getByRole('button', { name: '保存', exact: true }).click();
    expect((await state()).domains.find(domain => domain.id === created.id).name).toBe('远行');
    await click('返回领域列表');
    await page.reload();
    await expect(screen().locator('.domain-entry')).toHaveCount(9);
    expect((await state()).domains.find(domain => domain.id === created.id).iconId).toBe('travel');
    await openDomain('远行'); await click('删除远行领域');
    await page.locator('.domain-delete-sheet').getByRole('button', { name: '取消', exact: true }).click();
    expect((await state()).domains).toHaveLength(9);
    await click('删除远行领域');
    await page.locator('.domain-delete-sheet').getByRole('button', { name: '删除', exact: true }).click();
    await expect(screen().locator('.domain-entry')).toHaveCount(8);
    expect((await state()).domains.some(domain => domain.id === created.id)).toBe(false);
    await page.reload();
    await expect(screen().locator('.domain-entry')).toHaveCount(8);
    expect(await domainOrder()).toEqual(originalOrder);
  }
  async function quickRecord() {
    await click('记录进展');
    const quick = recordSheet();
    const input = recordInput();
    const domainTrigger = quick.getByRole('button', { name: '选择记录领域', exact: true });
    async function chooseDomain(label) {
      await domainTrigger.click();
      await quick.locator('.form-popover-panel').getByRole('button', { name: `记录到${label}`, exact: true }).click();
      await expect(domainTrigger).toHaveText(label);
    }
    await expect(quick).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', '有什么需要记录的？');
    await expect(input).toHaveCount(1);
    await expect(quick.getByRole('button', { name: '选择记录类型', exact: true })).toHaveCount(0);
    await expect(quick.getByRole('button', { name: '保存记录', exact: true })).toBeDisabled();
    await expect(domainTrigger).toHaveText('未分类');
    await domainChoice.checkTrigger({ composer: quick, expect, label: '未分类', asset: '/assets/habits/notes.png', out, width, scenario: 'domain-list-default' });
    const options = [
      ['成长', '/assets/habits/plant.png'], ['工作', '/assets/icons/work.png'], ['英语', '/assets/habits/language.png'],
      ['健身', '/assets/habits/exercise.png'], ['生活', '/assets/icons/home.png'], ['心理', '/assets/habits/breathe.png'],
      ['摄影', '/assets/habits/camera.png'], ['自媒体', '/assets/habits/film.png'], ['未分类', '/assets/habits/notes.png'],
    ];
    await domainChoice.checkMenu({ composer: quick, expect, options, selected: '未分类' });
    await expect(quick.locator('.form-popover-panel').getByRole('button', { name: '记录到未分类', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: path.join(out, `domains-progress-domain-options-${width}.png`) });
    await domainChoice.dismissOutside({ composer: quick, expect, label: '未分类' });
    await domainTrigger.click();
    await page.keyboard.press('Escape');
    await expect(quick.locator('.form-popover-panel')).toHaveCount(0); await expect(quick).toBeVisible();
    await expect(domainTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(domainTrigger.locator('.select-chevron.is-expanded')).toHaveCount(0);
    await chooseDomain('工作');
    await domainChoice.checkTrigger({ composer: quick, expect, label: '工作', asset: '/assets/icons/work.png', out, width, scenario: 'domain-list-work' });
    await recordInput('负').fill('想到就写下的一句话');
    await quick.getByRole('button', { name: '第一条记录类型：负记录', exact: true }).click();
    await expect(quick.getByRole('button', { name: '保存记录', exact: true })).toBeInViewport();
    await page.screenshot({ path: path.join(out, `domains-quick-record-${width}.png`) });
    await quick.getByRole('button', { name: '保存记录', exact: true }).click(); await expect(quick).toHaveCount(0);
    expect((await state()).domains.find(domain => domain.id === 'work').negativeRecords.map(record => record.content)).toContain('想到就写下的一句话');
    await openDomain(); await expect(card('工作')).toContainText('想到就写下的一句话');
    await deleteRecord('负', '想到就写下的一句话'); await click('返回领域列表');
    await click('记录进展'); await input.fill('关闭前的进展草稿'); await page.keyboard.press('Escape'); await expect(quick).toHaveCount(0);
    expect(JSON.stringify(await state())).not.toContain('关闭前的进展草稿');
    expect((await state()).domains.some(domain => domain.name === '未分类')).toBe(false);
    await click('记录进展'); await expect(input).toHaveValue('关闭前的进展草稿');
    await chooseDomain('未分类'); await input.fill('还没想好分类的问题');
    await quick.getByRole('button', { name: '保存记录', exact: true }).click(); await expect(quick).toHaveCount(0);
    await page.reload();
    const fallback = (await state()).domains.find(domain => domain.name === '未分类');
    expect(fallback.positiveRecords.map(record => record.content)).toContain('还没想好分类的问题');
    await openDomain('未分类'); await expect(card('未分类')).toContainText('还没想好分类的问题');
    await click('返回领域列表'); await click('记录进展'); await expect(domainTrigger).toHaveText('未分类');
    await input.fill('第二条未分类进展');
    await quick.getByRole('button', { name: '保存记录', exact: true }).click(); await expect(quick).toHaveCount(0);
    expect((await state()).domains.find(domain => domain.id === fallback.id).positiveRecords).toHaveLength(2);
    await openDomain('未分类'); await expect(page.getByRole('button', { name: '编辑未分类领域', exact: true })).toBeDisabled(); await expect(page.getByRole('button', { name: '删除未分类领域', exact: true })).toBeDisabled(); await click('返回领域列表'); await expect(screen().locator('.domain-entry')).toHaveCount(9);
  }

  await page.clock.install({ time: new Date('2026-10-03T12:00:00') });
  await page.goto(`${origin}/?domains-${width}#/pages/domains/index`);
  await expect(screen().locator('.domain-entry')).toHaveCount(8);
  expect(await domainOrder()).toEqual(['成长', '工作', '英语', '健身', '生活', '心理', '摄影', '自媒体'].map(name => `打开${name}领域`));
  await expect(screen().locator('.domain-card')).toHaveCount(0);
  await expect(screen().locator('.domain-record')).toHaveCount(0);
  await expect(screen().locator('.domains-page-toolbar').getByRole('button', { name: '创建领域', exact: true })).toHaveCount(0);
  await expect(screen().locator('.domains-page-toolbar').getByRole('button', { name: '记录进展', exact: true })).toBeVisible();
  await checkLayout();
  await checkDefaultIndex();
  await expect(screen().locator('.domain-progress-card-goal .domain-progress-goal-content')).toHaveText(Array(8).fill('未设置'));
  await expect(screen().locator('.domain-progress-long-goal,.domain-progress-goals')).toHaveCount(0);
  const darkBackground = await screen().evaluate(node => getComputedStyle(node).backgroundColor);
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await screen().evaluate(node => getComputedStyle(node).backgroundColor), 'domains retain the existing dark palette').toEqual(darkBackground);
  await page.screenshot({ path: path.join(out, `domains-empty-${width}.png`) });
  await manageDomains();
  await quickRecord();
  await openDomain();
  await expect(screen().locator('.domain-card')).toHaveCount(1);
  await checkCount(0);

  await click('创建工作长期目标');
  await goalInput().fill('   ');
  await expect(sheet().getByRole('button', { name: '创建目标', exact: true })).toBeDisabled();
  await goalInput().fill('这条草稿将取消');
  await close();
  await expect(card('工作')).not.toContainText('这条草稿将取消');
  await editGoal('长期', '找到适合自己的长期发展方向');
  const longGoal = '持续记录真实工作反馈，找到适合自己的长期发展方向，并建立能够反复回顾的方法与作品集';
  await editGoal('长期', longGoal, true);
  await editGoal('短期', '完成简历并开始投递');
  await expect(card('工作')).toContainText(longGoal);
  await expect(card('工作')).toContainText('完成简历并开始投递');
  const goalLayout = await card('工作').locator('.domain-goal-card').first().locator('.domain-goal-content').evaluate(node => ({ height: node.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(node).lineHeight) }));
  expect(goalLayout.height, `${width}: long goals occupy at most two lines`).toBeLessThanOrEqual(goalLayout.lineHeight * 2 + 2);
  await click('完成工作长期目标');
  await expect(sheet()).toHaveCount(0);
  await checkCount(1);
  await expect(card('工作')).toContainText(longGoal);
  await expect(card('工作').locator('.domain-goal-card').first()).toHaveClass(/is-completed/);
  await indexSummary({ long: 1, short: 0, longGoal, shortGoal: '完成简历并开始投递', longCompleted: true });
  await click('撤销完成工作长期目标');
  await checkCount(0);
  await expect(card('工作').locator('.domain-goal-card').first()).not.toHaveClass(/is-completed/);
  await indexSummary({ long: 0, short: 0, longGoal, shortGoal: '完成简历并开始投递' });
  await click('完成工作长期目标');
  await checkCount(1);
  await historyButton().click();
  await checkSheet();
  await expect(sheet()).toContainText(longGoal);
  await page.screenshot({ path: path.join(out, `domains-history-${width}.png`) });
  await close();
  await editGoal('长期', '在新的方向持续积累作品');
  await click('完成工作短期目标');
  await click('撤销完成工作短期目标');
  await checkCount(1);
  await click('完成工作短期目标');
  await checkCount(2);
  await editGoal('短期', '收集三个真实反馈');
  await indexSummary({ long: 1, short: 1, longGoal: '在新的方向持续积累作品', shortGoal: '收集三个真实反馈' });

  // Domain creation uses the shared editor and the original reminders store.
  const legacyHabits = (await state()).domains.find(domain => domain.id === 'work').habits;
  const createHabit = () => page.getByRole('button', { name: '创建工作习惯', exact: true });
  await expect(page.getByRole('button', { name: '管理工作习惯', exact: true })).toHaveCount(0);
  await expect(card('工作').locator('.domain-habits-heading button')).toHaveCount(0);
  async function checkHabitCreationCard(count) {
    const grid = card('工作').locator('.domain-habit-grid');
    await expect(grid).toHaveCount(1);
    await expect(card('工作').locator('.domain-habit-card')).toHaveCount(count);
    await expect(card('工作').locator('.domain-habit-create-card')).toHaveCount(1);
    await expect(grid.locator(':scope > .daily-suggestion').last()).toHaveClass(/domain-habit-create-card/);
    await checkCreateButton(createHabit(), '创建习惯', expect, { iconOnly: true });
    const layout = await createHabit().evaluate(node => {
      const rect = node.getBoundingClientRect(), cell = node.closest('.domain-habit-create-card').getBoundingClientRect();
      return { width: rect.width, height: rect.height, cellWidth: cell.width, cellHeight: cell.height,
        centerX: (rect.left + rect.right - cell.left - cell.right) / 2,
        centerY: (rect.top + rect.bottom - cell.top - cell.bottom) / 2 };
    });
    expect(layout.width, 'The whole placeholder card is clickable').toBeGreaterThanOrEqual(layout.cellWidth - 2);
    expect(layout.height, 'The whole placeholder card is clickable').toBeGreaterThanOrEqual(layout.cellHeight - 2);
    expect(layout.centerX).toBeCloseTo(0, 0);
    expect(layout.centerY).toBeCloseTo(0, 0);
    if (count <= 1) await expect(card('工作').locator('.domain-habit-scroll')).toHaveClass(/is-single-row/);
  }
  await checkHabitCreationCard(0);
  await page.screenshot({ path: path.join(out, `domains-habit-create-entry-${width}.png`) });
  const beforeCreation = await reminderState();
  await createHabit().click();
  await expect(habitEditor().getByRole('button', { name: '选择习惯领域', exact: true })).toHaveText('工作');
  await expect(habitEditor().getByRole('textbox', { name: '习惯名称', exact: true })).toHaveValue('');
  await expect(habitEditor().locator('.daily-editor-lifecycle')).toHaveCount(0);
  await habitEditor().getByRole('textbox', { name: '习惯名称', exact: true }).fill('取消创建的领域习惯');
  await click('关闭习惯编辑');
  await expect(habitEditor()).toHaveCount(0);
  expect(await reminderState(), 'Cancel creates no reminder or history records').toEqual(beforeCreation);
  let failedCreationTime = 0;
  for (const [index, title] of ['打开一个岗位', '验证共享习惯1', '验证共享习惯2', '验证共享习惯3', '验证共享习惯4'].entries()) {
    await createHabit().click();
    await expect(habitEditor().getByRole('button', { name: '选择习惯领域', exact: true })).toHaveText('工作');
    await expect(habitEditor().getByRole('textbox', { name: '习惯名称', exact: true })).toHaveValue('');
    await page.getByPlaceholder('想多做什么？', { exact: true }).fill(title);
    if (index === 0) await chooseHabitPriority('高');
    if (index === 0) {
      await page.evaluate(() => { window.__miniFixture.failToolWrites = ['reminders']; });
      await habitEditor().locator('.daily-editor-footer .ui-button-primary').click();
      await expect(habitEditor().getByRole('alert')).toContainText('尚未保存');
      await expect(habitEditor().getByRole('textbox', { name: '习惯名称', exact: true })).toHaveValue(title);
      await expect(habitEditor().getByRole('button', { name: '选择习惯领域', exact: true })).toHaveText('工作');
      expect(await reminderState(), 'Failed creation cannot report a durable record').toEqual(beforeCreation);
      failedCreationTime = await page.evaluate(() => Date.now());
      await page.clock.runFor(500);
      await page.evaluate(() => { window.__miniFixture.failToolWrites = []; });
    }
    await page.locator('.daily-editor-footer .ui-button-primary').click();
    await expect(page.locator('.daily-editor-sheet')).toHaveCount(0);
    expect((await reminderState()).items.filter(item => item.title === title), 'Failure retry and later saves create exactly one original reminder').toHaveLength(1);
    await checkHabitCreationCard(index + 1);
    if (index === 3) {
      await card('工作').locator('.domain-habit-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
      await expect(createHabit()).toBeInViewport();
      await page.screenshot({ path: path.join(out, `domains-habit-full-page-add-${width}.png`) });
    }
  }
  const sharedHabits = (await reminderState()).items;
  const sharedHabit = sharedHabits.find(habit => habit.title === '打开一个岗位');
  expect(sharedHabit.domainId).toBe('work');
  expect(sharedHabit.id).toMatch(/^habit-mini-/);
  expect(sharedHabit.createdAt, 'Retry retains the original creation time after the clock advances').toBeLessThanOrEqual(failedCreationTime);
  expect((await reminderState()).done, 'Creating habits keeps all previous check-ins').toEqual(beforeCreation?.done || {});
  expect((await reminderState()).completionHistory, 'Creating habits keeps all previous history').toEqual(beforeCreation?.completionHistory || {});
  await page.reload();
  await page.evaluate(() => { location.hash = '#/pages/domains/index'; });
  await openDomain();
  expect((await reminderState()).items.find(item => item.id === sharedHabit.id), 'Reload preserves the same created reminder ID and fields').toEqual(sharedHabit);
  expect((await state()).domains.find(domain => domain.id === 'work').habits).toEqual(legacyHabits);
  await expect(page.getByRole('button', { name: '添加习惯', exact: true })).toHaveCount(0);
  const habitCards = card('工作').locator('.domain-habit-card');
  expect(await habitCards.count()).toBe(sharedHabits.filter(habit => habit.domainId === 'work' && habit.enabled).length);
  await expect(habitCards.first().locator('.daily-suggestion-title')).toHaveText('打开一个岗位');
  await expect(habitCards.first().locator('.habit-priority')).toHaveAttribute('aria-label', '优先度高');
  await expect(habitCards.first().locator('.habit-progress-total')).toHaveText('0 天');
  await expect(habitCards.first().locator('.habit-progress-streak')).toHaveText('0 天');
  await expect.poll(() => habitCards.locator('.habit-progress img').evaluateAll(nodes => nodes.every(node => node.complete && node.naturalWidth > 0))).toBe(true);
  const habitLayout = await card('工作').locator('.domain-habit-scroll').evaluate(node => {
    const cards = [...node.querySelectorAll('.domain-habit-card')];
    return { overflow: node.scrollHeight - node.clientHeight, horizontal: node.scrollWidth - node.clientWidth, boxes: cards.map(card => {
      const rect = card.getBoundingClientRect(); return { top: rect.top, left: rect.left, width: rect.width };
    }) };
  });
  expect(habitLayout.overflow).toBeGreaterThan(0);
  expect(habitLayout.horizontal).toBeLessThanOrEqual(1);
  const boxes = habitLayout.boxes;
  expect(Math.abs(boxes[0].top - boxes[1].top)).toBeLessThan(2);
  expect(Math.abs(boxes[2].top - boxes[3].top)).toBeLessThan(2);
  expect(boxes[2].top).toBeGreaterThan(boxes[0].top + 40);
  expect(Math.abs(boxes[0].left - boxes[2].left)).toBeLessThan(2);
  expect(Math.abs(boxes[1].left - boxes[3].left)).toBeLessThan(2);
  expect(Math.abs(boxes[4].left - boxes[0].left)).toBeLessThan(2);
  expect(boxes[4].top).toBeGreaterThan(boxes[2].top + 40);
  await expect(page.getByRole('button', { name: '返回领域列表', exact: true })).toHaveText('返回');
  await card('工作').locator('.domain-habit-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(habitCards.nth(4)).toBeInViewport();
  await page.screenshot({ path: path.join(out, `domains-habit-next-page-${width}.png`) });
  await card('工作').locator('.domain-habit-scroll').evaluate(node => { node.scrollTop = 0; });
  await click('查看习惯：打开一个岗位');
  await checkSheet();
  const habitCalendar = sheet().locator('.habit-calendar');
  await expect(habitCalendar).toBeVisible();
  await expect(habitCalendar.locator('.habit-calendar-stat-number')).toHaveText(['0天', '0天', '0%', '0天']);
  await expect(habitCalendar.locator('.habit-calendar-day')).toHaveCount(42);
  await expect(habitCalendar.locator('.habit-calendar-day.is-today')).toContainText('3');
  await checkHabitCore({ page, sheetSelector: '.domain-sheet-habit-detail', footerSelector: '.domain-sheet-actions', phase: 'initial open, zero safe area', width, expect });
  await expect(habitCalendar.locator('.habit-calendar-log')).toHaveCount(1);
  await expect(habitCalendar.locator('.habit-calendar-log-toggle')).toHaveCount(0);
  await expect(habitCalendar.locator('.habit-calendar-log-heading')).toContainText('月打卡日志');
  await expect(habitCalendar.locator('.habit-calendar-log-empty')).toBeVisible();
  const beforeCalendarNavigation = await reminderState();
  await habitCalendar.getByRole('button', { name: '查看上个月打卡', exact: true }).click();
  await expect(habitCalendar.locator('.habit-calendar-month')).toHaveText('2026年9月');
  await habitCalendar.getByRole('button', { name: '回到本月打卡', exact: true }).click();
  await expect(habitCalendar.locator('.habit-calendar-month')).toHaveText('2026年10月');
  await expect(habitCalendar.getByRole('button', { name: '查看下个月打卡', exact: true })).toBeDisabled();
  await checkHabitCore({ page, sheetSelector: '.domain-sheet-habit-detail', footerSelector: '.domain-sheet-actions', phase: 'returned to this month', width, expect });
  expect(await reminderState(), 'Domain month navigation only reads the original habit state').toEqual(beforeCalendarNavigation);
  await expect(sheet().locator('.domain-sheet-actions').getByRole('button', { name: '已完成', exact: true })).toBeInViewport();
  await page.screenshot({ path: path.join(out, `domains-habit-detail-calendar-${width}.png`) });
  await expect(sheet()).toContainText('打开一个岗位');
  await page.locator('.domain-backdrop').click({ position: { x: 8, y: 6 } });
  await expect(page.locator('.domain-sheet-habit-detail')).toHaveCount(0);
  expect(await reminderState(), 'Outside dismissal keeps shared habit records intact').toEqual(beforeCalendarNavigation);
  const habitRoute = await page.evaluate(() => location.hash);
  await page.evaluate(() => { location.hash = '#/pages/statistics/index?panel=habits'; });
  await click('查看打开一个岗位统计');
  await expect(page.locator('.habit-calendar')).toBeVisible();
  await page.evaluate(hash => { location.hash = hash; }, habitRoute);
  await click('打开一个岗位 今天打卡');
  await expect(page.getByRole('button', { name: '打开一个岗位 今天撤销打卡', exact: true })).toBeVisible();
  await expect(habitCards.first().locator('.habit-progress-total')).toHaveText('1 天');
  await expect(habitCards.first().locator('.habit-progress-streak')).toHaveText('1 天');
  await click('查看习惯：打开一个岗位');
  await expect(habitCalendar.locator('.habit-calendar-stat-number')).toHaveText(['1天', '1天', '3%', '1天']);
  await expect(habitCalendar.locator('.habit-calendar-day.is-today')).toHaveClass(/is-completed/);
  await expect(habitCalendar.locator('.habit-calendar-log-toggle')).toHaveCount(0);
  await expect(habitCalendar.locator('.habit-calendar-log-row')).toHaveCount(0);
  await expect(habitCalendar.locator('.habit-calendar-log-empty')).toBeVisible();
  await close();
  await checkCount(2); // Habit completion does not count as a goal.
  await indexSummary({ long: 1, short: 1, habit: 1, longGoal: '在新的方向持续积累作品', shortGoal: '收集三个真实反馈' });
  expect((await reminderState()).done['2026-10-03']).toContain(sharedHabit.id);
  await page.evaluate(() => { location.hash = '#/pages/daily/index'; });
  await habitFilter.select('已完成');
  const sharedDailyCard = page.locator('.daily-habit-scroll .daily-suggestion').filter({ has: page.locator('.daily-suggestion-title', { hasText: '打开一个岗位' }) });
  await expect(sharedDailyCard).toHaveClass(/is-done/);
  await expect(sharedDailyCard.locator('.habit-progress-total')).toHaveText('1 天');
  await expect(sharedDailyCard.locator('.habit-progress-streak')).toHaveText('1 天');
  await sharedDailyCard.locator('.daily-suggestion-check').click();
  await habitFilter.select('进行中');
  await expect(sharedDailyCard).not.toHaveClass(/is-done/);
  await expect(sharedDailyCard.locator('.habit-progress-total')).toHaveText('0 天');
  await expect(sharedDailyCard.locator('.habit-progress-streak')).toHaveText('0 天');
  await page.evaluate(() => { location.hash = '#/pages/domains/index'; });
  await openDomain();
  await expect(page.getByRole('button', { name: '打开一个岗位 今天打卡', exact: true })).toBeVisible();
  await expect(habitCards.first().locator('.habit-progress-total')).toHaveText('0 天');
  await expect(habitCards.first().locator('.habit-progress-streak')).toHaveText('0 天');
  await click('查看习惯：打开一个岗位');
  await expect(habitCalendar.locator('.habit-calendar-stat-number')).toHaveText(['0天', '0天', '0%', '0天']);
  await expect(habitCalendar.locator('.habit-calendar-log-toggle')).toHaveCount(0);
  await expect(habitCalendar.locator('.habit-calendar-log-empty')).toBeVisible();
  await close();
  await click('打开一个岗位 今天打卡');
  await page.screenshot({ path: path.join(out, `domains-habit-cards-${width}.png`) });

  // Editing in a domain changes the original shared reminder and keeps history.
  const beforeEdit = await reminderState();
  const editedTitle = '打开一个岗位并记录进展';
  await click('查看习惯：打开一个岗位');
  await sheet().getByRole('button', { name: '编辑习惯', exact: true }).click();
  await expect(habitEditor()).toBeVisible();
  await expect(habitEditor().locator('.daily-field-label').filter({ hasText: '提醒自己的话' })).toHaveCount(0);
  await expect(habitEditor()).not.toContainText('可选');
  await checkHabitPriority('高');
  await habitEditor().getByRole('textbox', { name: '习惯名称', exact: true }).fill('取消这次修改');
  await chooseHabitPriority('低');
  await checkHabitPriority('低');
  await click('关闭习惯编辑');
  await expect(sheet()).toContainText('打开一个岗位');
  expect(await reminderState()).toEqual(beforeEdit);
  await sheet().getByRole('button', { name: '编辑习惯', exact: true }).click();
  await checkHabitPriority('高');
  await habitEditor().getByRole('textbox', { name: '习惯名称', exact: true }).fill(editedTitle);
  await habitEditor().getByRole('textbox', { name: '提醒自己的话', exact: true }).fill('先完成一小步，再记录今天的进展。');
  await expect(habitEditor().getByRole('spinbutton', { name: '专注分钟', exact: true })).toHaveCount(0);
  await chooseHabitPriority('中');
  await checkHabitPriority('中');
  await habitEditor().getByRole('button', { name: '选择习惯图标', exact: true }).click();
  await page.locator('.icon-library-option').first().click();
  await expect(page.locator('.icon-library-sheet')).toHaveCount(0);
  const editorLayout = await habitEditor().evaluate(node => {
    const box = node.getBoundingClientRect(), viewport = document.querySelector('.preview-content').getBoundingClientRect();
    return { top: box.top - viewport.top, bottom: box.bottom - viewport.bottom, overflow: node.scrollWidth - node.clientWidth };
  });
  expect(editorLayout.top).toBeGreaterThanOrEqual(-2);
  expect(editorLayout.bottom).toBeLessThanOrEqual(2);
  expect(editorLayout.overflow).toBeLessThanOrEqual(2);
  await expect(habitEditor().locator('.daily-editor-footer .ui-button-primary')).toBeInViewport();
  await page.screenshot({ path: path.join(out, `domains-habit-editor-${width}.png`) });
  await habitEditor().locator('.daily-editor-footer .ui-button-primary').click();
  await expect(habitEditor()).toHaveCount(0);
  await expect(sheet()).toContainText(editedTitle);
  await expect(sheet()).toContainText('先完成一小步，再记录今天的进展。');
  const afterEdit = await reminderState();
  const editedHabit = afterEdit.items.find(item => item.id === sharedHabit.id);
  expect(afterEdit.items.length).toBe(beforeEdit.items.length);
  expect(editedHabit.createdAt).toBe(sharedHabit.createdAt);
  expect(editedHabit.priority).toBe('medium');
  expect(editedHabit.minutes).toBe(sharedHabit.minutes);
  expect(editedHabit.iconId).toBeTruthy();
  expect(afterEdit.done).toEqual(beforeEdit.done);
  expect(afterEdit.completionHistory).toEqual(beforeEdit.completionHistory);
  expect((await state()).domains.find(domain => domain.id === 'work').habits).toEqual(legacyHabits);
  await close();
  await click(`查看习惯：${editedTitle}`);
  await sheet().getByRole('button', { name: '编辑习惯', exact: true }).click();
  await expect(habitEditor().getByRole('textbox', { name: '习惯名称', exact: true })).toHaveValue(editedTitle);
  await expect(habitEditor().getByRole('spinbutton', { name: '专注分钟', exact: true })).toHaveCount(0);
  await checkHabitPriority('中');
  await habitEditor().getByRole('textbox', { name: '习惯名称', exact: true }).fill('打开一个岗位');
  await expect(habitEditor()).not.toContainText('可选');
  await habitEditor().getByRole('textbox', { name: '提醒自己的话', exact: true }).fill('');
  await habitEditor().locator('.daily-editor-footer .ui-button-primary').click();
  await expect(habitEditor()).toHaveCount(0);
  expect((await reminderState()).items.find(item => item.id === sharedHabit.id).note, 'Blank habit notes remain valid after label cleanup').toBe('');
  await close();
  // Restore the test's note through the same shared editor; history stays untouched.
  await click('查看习惯：打开一个岗位');
  await sheet().getByRole('button', { name: '编辑习惯', exact: true }).click();
  await habitEditor().getByRole('textbox', { name: '提醒自己的话', exact: true }).fill('先完成一小步，再记录今天的进展。');
  await habitEditor().locator('.daily-editor-footer .ui-button-primary').click();
  await expect(habitEditor()).toHaveCount(0);
  await close();
  await page.evaluate(() => { location.hash = '#/pages/domains/index'; });
  await openDomain();
  await expect(page.getByRole('button', { name: '打开一个岗位 今天撤销打卡', exact: true })).toBeVisible();

  // Changing the domain moves the same card; editing remains available there.
  const movedId = afterEdit.items.find(item => item.title === '验证共享习惯1').id;
  await click('查看习惯：验证共享习惯1');
  await sheet().getByRole('button', { name: '编辑习惯', exact: true }).click();
  await chooseHabitDomain('英语');
  await habitEditor().locator('.daily-editor-footer .ui-button-primary').click();
  await expect(habitEditor()).toHaveCount(0);
  await expect(page.getByRole('button', { name: '查看习惯：验证共享习惯1', exact: true })).toHaveCount(0);
  expect((await reminderState()).items.find(item => item.id === movedId).domainId).toBe('english');
  await click('返回领域列表');
  await openDomain('英语');
  await click('查看习惯：验证共享习惯1');
  await sheet().getByRole('button', { name: '编辑习惯', exact: true }).click();
  await chooseHabitDomain('工作');
  await habitEditor().locator('.daily-editor-footer .ui-button-primary').click();
  await expect(habitEditor()).toHaveCount(0);
  await click('返回领域列表');
  await openDomain();
  expect((await reminderState()).items.length).toBe(beforeEdit.items.length);

  await addRecord('负', '今天看到招聘网站有点回避', true);
  await addRecord('正', '打开了招聘网站', true);
  await addRecord('正', '整理了一段简历');
  await deleteRecord('正', '整理了一段简历');
  await expect(card('工作')).not.toContainText('整理了一段简历');
  await addRecord('负', '没有继续看岗位');
  await deleteRecord('负', '没有继续看岗位');
  await expect(card('工作')).not.toContainText('没有继续看岗位');
  await page.locator('.domain-record-column.is-positive').dispatchEvent('click');
  await recordInput().fill('取消的记录');
  await close();
  await expect(card('工作')).not.toContainText('取消的记录');
  await checkLayout();
  await card('工作').scrollIntoViewIfNeeded();
  const decoration = await card('工作').locator('.domain-record-content,.domain-habit > span').evaluateAll(nodes => nodes.flatMap(node => {
    const values = [];
    for (let current = node; current; current = current.parentElement) values.push(getComputedStyle(current).textDecorationLine);
    return values;
  }));
  expect(decoration.every(value => value === 'none'), 'habits/records never look like completed, struck-out tasks').toBe(true);
  await page.screenshot({ path: path.join(out, `domains-populated-${width}.png`) });

  const saved = await state();
  expect(saved).toBeTruthy();
  await page.reload();
  await openDomain();
  await checkCount(2);
  await expect(card('工作')).toContainText('在新的方向持续积累作品');
  await expect(card('工作')).toContainText('收集三个真实反馈');
  await expect(card('工作')).toContainText('打开了招聘网站');
  await expect(card('工作')).toContainText('今天看到招聘网站有点回避');
  await expect(page.getByRole('button', { name: '打开一个岗位 今天撤销打卡', exact: true })).toBeVisible();
  expect(await state()).toEqual(saved);

  await addRecord('正', '把一个问题写下来');
  await addRecord('正', '为明天留出十分钟');
  await expect(card('工作')).toContainText('打开了招聘网站');
  await checkRecordHistory();
  await deleteRecord('正', '把一个问题写下来');
  await deleteRecord('正', '为明天留出十分钟');

  // A new local calendar day resets only the habit's presentation, never goals.
  await page.clock.setSystemTime(new Date('2026-10-04T00:01:00'));
  await page.clock.runFor(15001);
  await expect(page.getByRole('button', { name: '打开一个岗位 今天打卡', exact: true })).toBeVisible();
  await checkCount(2);
  await page.reload();
  await openDomain();
  await expect(page.getByRole('button', { name: '打开一个岗位 今天打卡', exact: true })).toBeVisible();
  await checkCount(2);

  // Login has an independent state and can sync; logout restores the guest.
  await createHabit().click();
  await habitEditor().getByRole('textbox', { name: '习惯名称', exact: true }).fill('不能串到账号的创建草稿');
  await page.evaluate(() => { location.hash = '#/pages/favorites/index'; });
  await page.getByPlaceholder('输入博客账号').fill('preview-reader');
  await page.getByPlaceholder('输入密码', { exact: true }).fill('fixture-only-password');
  await click('登录并同步');
  await expect(page.locator('.account-user-name')).toHaveText('preview-reader');
  await page.evaluate(() => { location.hash = '#/pages/domains/index'; });
  await openDomain();
  await checkCount(0);
  await expect(card('工作')).not.toContainText('收集三个真实反馈');
  await expect(page.getByRole('button', { name: '查看习惯：打开一个岗位', exact: true })).toHaveCount(0);
  const accountHabitTitle = await card('工作').locator('.daily-suggestion-title').first().textContent();
  await createHabit().click();
  await expect(habitEditor().getByRole('textbox', { name: '习惯名称', exact: true })).toHaveValue('');
  await expect(habitEditor().getByRole('button', { name: '选择习惯领域', exact: true })).toHaveText('工作');
  await habitEditor().getByRole('textbox', { name: '习惯名称', exact: true }).fill('账号创建的领域习惯');
  await habitEditor().locator('.daily-editor-footer .ui-button-primary').click();
  await expect(habitEditor()).toHaveCount(0);
  await expect(page.getByRole('button', { name: '查看习惯：账号创建的领域习惯', exact: true })).toBeVisible();
  expect((await reminderState()).items.some(item => item.title === '账号创建的领域习惯'), 'Account creation leaves guest records untouched').toBe(false);
  await click(`查看习惯：${accountHabitTitle}`);
  await sheet().getByRole('button', { name: '编辑习惯', exact: true }).click();
  await habitEditor().getByRole('textbox', { name: '习惯名称', exact: true }).fill('仅属于账号的习惯');
  await habitEditor().locator('.daily-editor-footer .ui-button-primary').click();
  await expect(habitEditor()).toHaveCount(0);
  await close();
  await expect.poll(() => page.evaluate(() => window.__miniRequests.some(request => request.path === '/personal-tools/reminders' && request.method === 'PUT'))).toBe(true);
  // The browser fixture resets login on a full reload; return within this session.
  await click('返回领域列表');
  await openDomain();
  await expect(page.getByRole('button', { name: '查看习惯：仅属于账号的习惯', exact: true })).toBeVisible();
  await editGoal('短期', '仅属于账号的目标');
  await expect.poll(() => page.evaluate(() => window.__miniRequests.some(request => request.path === '/personal-tools/domains' && request.method === 'PUT'))).toBe(true);
  await page.evaluate(() => { window.__miniFixture.failDomainSync = true; });
  await editGoal('短期', '网络恢复后同步这个目标', true);
  await expect(screen()).toContainText('已在本机暂存');
  await page.evaluate(() => { location.hash = '#/pages/favorites/index'; });
  await click('退出');
  await page.evaluate(() => { location.hash = '#/pages/domains/index'; });
  await openDomain();
  await checkCount(2);
  await expect(card('工作')).toContainText('收集三个真实反馈');
  await expect(card('工作')).not.toContainText('网络恢复后同步这个目标');
  await expect(page.getByRole('button', { name: '查看习惯：仅属于账号的习惯', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '查看习惯：账号创建的领域习惯', exact: true })).toHaveCount(0);
  expect((await reminderState()).items.some(item => item.title === '不能串到账号的创建草稿'), 'Owner change never saves an unsubmitted guest draft').toBe(false);
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem('ottlog-mini-tool-v1:guest:reminders')).data.items.find(item => item.id === id).note, sharedHabit.id)).toBe('先完成一小步，再记录今天的进展。');

  // A failed local write must be shown honestly while retaining the open draft.
  await page.evaluate(() => { window.__miniFixture.failDomainWrites = true; });
  await page.locator('.domain-record-column.is-positive').dispatchEvent('click');
  await recordInput().fill('存储暂不可用时仍保留当前记录');
  await recordSheet().getByRole('button', { name: '保存记录', exact: true }).click();
  await expect(recordSheet().getByRole('alert')).toContainText('本机存储不可用');
  await expect(recordInput()).toHaveValue('存储暂不可用时仍保留当前记录');
  await page.evaluate(() => { window.__miniFixture.failDomainWrites = false; });
  await recordSheet().getByRole('button', { name: '保存记录', exact: true }).click();
  await expect(recordSheet()).toHaveCount(0);
  await addRecord('正', '存储恢复后保存全部记录');
  await page.reload();
  await openDomain();
  await expect(card('工作')).toContainText('存储暂不可用时仍保留当前记录');
  await expect(card('工作')).toContainText('存储恢复后保存全部记录');
  await checkLayout();

  if (width === 375) {
    // Seed a long real history so both sheet scroll and pinned actions are tested.
    await page.evaluate(() => {
      const key = 'ottlog-mini-tool-v1:guest:domains', cache = JSON.parse(localStorage.getItem(key));
      const original = cache.data.completedGoals[0];
      for (let index = 1; index <= 24; index++) cache.data.completedGoals.push({ ...original, id: `preview-history-${index}`, content: `历史目标滚动验证${index}` });
      localStorage.setItem(key, JSON.stringify(cache));
    });
    await page.reload();
    await openDomain();
    await checkCount(26);
    await historyButton().click();
    await checkSheet();
    await sheet().locator('.domain-history-item').last().scrollIntoViewIfNeeded();
    await expect(sheet().locator('.domain-history-item').last()).toBeInViewport();
    await expect(sheet().getByRole('button', { name: '返回领域', exact: true })).toBeInViewport();
    await page.screenshot({ path: path.join(out, `domains-history-scroll-${width}.png`) });
    await close();
  }

  if (width === 768) {
    await click('返回领域列表');
    await expect(screen().locator('.domain-entry')).toHaveCount(9);
    await page.setViewportSize({ width: 1280, height: 960 });
    await checkLayout();
    await checkDefaultIndex(9);
    const rows = await screen().locator('.domain-entry').evaluateAll(cards => cards.map(card => Math.round(card.getBoundingClientRect().top)));
    expect(new Set(rows).size, 'Wide domain cards retain two columns with the preserved uncategorized domain').toBe(5);
    await page.screenshot({ path: path.join(out, 'domains-wide-1280.png') });
  }
  if (width === 360) {
    // Invalid habit data must not turn into fabricated zero counts on the new index summary.
    await page.goto(`${origin}/?domains-invalid-progress#/pages/posts/index`);
    const invalid = { version: 99, items: [{ id: 'preserved', title: '不可覆盖的旧习惯格式' }], done: {} };
    await page.evaluate(({ domainState, reminderState }) => { localStorage.clear(); window.__miniFixture.guestToolStates = { domains: domainState, reminders: reminderState }; location.hash = '#/pages/domains/index'; }, { domainState: saved, reminderState: invalid });
    await expect(screen().locator('.domain-entry')).toHaveCount(9);
    await expect(screen().locator('.domain-entry .domain-progress-long-count')).toHaveText(Array(9).fill('—'));
    await expect(screen().locator('.domain-entry .domain-progress-short-count')).toHaveText(Array(9).fill('—'));
    await expect(screen().locator('.domain-entry .domain-progress-habit-count')).toHaveText(Array(9).fill('—'));
    await expect(screen().locator('.domain-progress-segment')).toHaveCount(0);
    await expect(screen().locator('.domains-status')).toContainText('习惯记录暂不可用');
    await expect(screen().getByRole('button', { name: '重试', exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.__miniFixture.guestToolStates.reminders)).toEqual(invalid);
    expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/') && request.method !== 'GET'))).toEqual([]);
  }
  console.log(`${width}: complete two-column domain cards, shared weighted lines and card short-goal summaries with long goals hidden, customization, completion/undo/history, shared habit creation/editing, quick records, persistence, account separation and storage failures passed`);
};

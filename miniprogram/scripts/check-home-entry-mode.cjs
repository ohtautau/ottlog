const confirmUnsavedClose = require('./confirm-unsaved-close.cjs');
/* Exercise successful type memory through real creation entrances and storage.
   The same scenario can use the actual isolated preview compilation. */
const path = require('node:path');
const { storageKey: shortcutKey, legacyLayout } = require('./home-shortcut-test-helpers.cjs');

module.exports = async function checkHomeEntryMode({ page, origin, out, width, expect, preview = false }) {
  const prefix = preview ? 'ottlog-mini-preview-v1:' : '';
  const key = (owner = 'guest') => `${prefix}ottlog-mini-home-entry-mode-v1:${owner}`;
  const draftKey = (owner = 'guest') => `${prefix}ottlog-mini-entry-draft-v1:${owner}`;
  const toolKey = (tool, owner = 'guest') => `${prefix}ottlog-mini-tool-v1:${owner}:${tool}`;
  const seed = { todos: { version: 1, tasks: [], categories: [] }, memos: { version: 1, notes: [] },
    domains: { version: 1, domains: [{ id: 'work', name: '工作', iconId: 'work', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] }], completedGoals: [] } };
  const composer = () => page.locator('.entry-composer');
  const mode = name => composer().getByRole('button', { name: `创建类型：${name}`, exact: true });
  const selected = name => expect(mode(name)).toHaveAttribute('aria-pressed', 'true');
  const taskTitle = () => composer().locator('.todo-title-input');
  const memoTitle = () => composer().locator('.memo-title-input');
  const record = () => composer().getByRole('textbox', { name: '记录内容', exact: true });
  const stored = storageKey => page.evaluate(storageKey => window.__miniPreviewControl.readStorage(storageKey), storageKey);
  const preference = (owner = 'guest') => stored(key(owner));
  const business = async (tool, owner = 'guest') => (await stored(toolKey(tool, owner))).data;
  const go = route => page.evaluate(route => { location.hash = `#/pages/${route}/index`; }, route);
  const close = async () => { await composer().getByRole('button', { name: '关闭编辑', exact: true }).click(); await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0); };
  const save = async (name, sign = 'positive') => {
    if (name === '进展') await composer().getByRole('button', { name: `第一条记录类型：${sign === 'positive' ? '正' : '负'}记录`, exact: true }).click();
    await composer().getByRole('button', { name: name === '任务' ? '创建任务' : name === '备忘' ? '创建便签' : '保存记录', exact: true }).click();
    await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
  };
  async function home(text = '', keyboard = false) {
    await go('index'); await expect(page.locator('.today-capture')).toBeVisible();
    const input = page.getByRole('textbox', { name: '创建内容', exact: true });
    await input.fill(text);
    if (keyboard) await input.press('Enter');
    else await page.locator('.today-capture').getByRole('button', { name: '创建', exact: true }).click();
    await expect(composer()).toBeVisible();
    const firstField = composer().locator('.todo-title-input,.memo-title-input,.progress-record-field textarea[aria-label="记录内容"]');
    await expect(firstField).toBeVisible();
    if (text.length) {
      await page.waitForTimeout(200);
      await expect(composer().locator('input:focus,textarea:focus'), 'Prefilled home capture does not reopen the keyboard').toHaveCount(0);
    } else if (!(await composer().getByRole('button', { name: '清空所有输入', exact: true }).isDisabled())) await expect(firstField, 'Empty creation retains its initial first-field focus').toBeFocused();
  }
  async function explicitTask() {
    await go('todos'); await page.getByRole('button', { name: '创建高优先级任务', exact: true }).click(); await selected('任务'); await expect(taskTitle()).toBeFocused();
  }
  async function explicitMemo() {
    await go('memos'); await page.getByRole('button', { name: '创建便签', exact: true }).click(); await selected('备忘'); await expect(memoTitle()).toBeFocused();
  }
  async function explicitProgress() {
    await go('domains'); await page.getByRole('button', { name: '记录进展', exact: true }).click(); await selected('进展'); await expect(record()).toBeFocused();
  }
  async function setPreference(value, owner = 'guest') {
    await page.evaluate(({ storageKey, value }) => localStorage.setItem(storageKey, JSON.stringify(value)), { storageKey: key(owner), value });
    await page.reload(); await expect(page.locator('.today-capture')).toBeVisible();
  }
  await page.goto(`${origin}/?home-entry-memory-${preview ? 'preview' : 'normal'}-${width}#/pages/posts/index`);
  const normalSentinels = await page.evaluate(({ prefix, seed, shortcutKey, layout }) => {
    localStorage.clear(); window.__miniFixture.persistEntryTools = true;
    window.__miniFixture.sessionProfile = { authenticated: false, userName: null, isAdmin: false };
    window.__miniFixture.guestToolStates = structuredClone(seed);
    localStorage.setItem(shortcutKey, JSON.stringify(layout));
    for (const [tool, data] of Object.entries(seed)) localStorage.setItem(`${prefix}ottlog-mini-tool-v1:guest:${tool}`, JSON.stringify({ data, pending: false, revision: 0 }));
    const normal = {};
    if (prefix) {
      for (const [tool, data] of Object.entries(seed)) normal[`ottlog-mini-tool-v1:guest:${tool}`] = JSON.stringify({ data, pending: false, revision: 7 });
      normal['ottlog-mini-home-entry-mode-v1:guest'] = JSON.stringify('progress');
      normal['ottlog-mini-home-entry-mode-v1:reader:memory-a'] = JSON.stringify('memo');
      normal['ottlog-mini-entry-draft-v1:guest'] = JSON.stringify({ untouchedNormalDraft: true });
      for (const [storageKey, value] of Object.entries(normal)) localStorage.setItem(storageKey, value);
    }
    location.hash = '#/pages/index/index'; return normal;
  }, { prefix, seed, shortcutKey, layout: legacyLayout(true) });

  // A draft's last viewed type is not a successful creation preference.
  await home(); await selected('任务'); expect(await preference()).toBeUndefined();
  await mode('备忘').click(); await close(); expect(await preference()).toBeUndefined();
  await home(); await selected('任务');
  await taskTitle().fill('校验失败不会记住类型');
  await composer().getByRole('button', { name: '选择现有标签', exact: true }).click();
  await composer().getByRole('textbox', { name: '任务标签', exact: true }).fill('一，二，三，四，五，六');
  await expect.poll(() => stored(draftKey()).then(draft => draft.tagsText), 'All six raw tags reach the draft before validation').toBe('一，二，三，四，五，六');
  await composer().locator('.form-popover-panel').getByRole('button', { name: '完成', exact: true }).click();
  await composer().getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(composer().getByRole('alert')).toContainText('最多 5 个标签');
  expect(await preference()).toBeUndefined();
  await composer().getByRole('button', { name: '清空所有输入', exact: true }).click();
  await expect(taskTitle()).toHaveValue(''); expect(await preference()).toBeUndefined(); await close();

  // Successful creation anywhere updates the local owner; only home capture reads it.
  await explicitMemo(); await memoTitle().fill('成功创建的便签'); await save('备忘'); expect(await preference()).toBe('memo');
  await home('加号继续创建便签'); await selected('备忘'); await expect(memoTitle()).toHaveValue('加号继续创建便签'); await save('备忘');
  await page.reload(); await home('键盘继续创建便签', true); await selected('备忘'); await expect(memoTitle()).toHaveValue('键盘继续创建便签'); await close();
  const memoCount = (await business('memos')).notes.length;
  await page.locator('#home-sort-create').click(); await selected('任务'); await close();
  await page.locator('#home-sort-memos').click(); await selected('备忘'); await close();
  await explicitTask(); await close(); await explicitMemo(); await close(); await explicitProgress(); await close();
  expect(await preference(), 'Explicit entrances and cancellation do not replace the successful preference').toBe('memo');
  expect((await business('memos')).notes).toHaveLength(memoCount);
  await explicitTask(); await taskTitle().fill('成功创建的任务'); await save('任务'); expect(await preference()).toBe('task');
  await home('键盘继续创建任务', true); await selected('任务'); await expect(taskTitle()).toHaveValue('键盘继续创建任务'); await close();
  await explicitProgress(); await record().fill('成功创建的正记录'); await save('进展'); expect(await preference()).toBe('progress');
  await home('首页直接创建负记录'); await selected('进展'); await expect(record()).toHaveValue('首页直接创建负记录'); await save('进展', 'negative');
  expect(await preference()).toBe('progress');
  const records = (await business('domains')).domains.flatMap(domain => [...domain.positiveRecords, ...domain.negativeRecords]);
  expect(records.some(item => item.content === '首页直接创建负记录')).toBe(true);
  await page.reload(); await home('键盘进展', true); await selected('进展'); await expect(record()).toHaveValue('键盘进展'); await close();
  await home('新快捷文本'); await selected('进展'); await expect(record()).toHaveValue('键盘进展\n新快捷文本');
  const appended = await stored(draftKey()); await close(); await home('新快捷文本');
  await expect(record(), 'Reopening the same capture appends it only once').toHaveValue('键盘进展\n新快捷文本');
  expect((await stored(draftKey())).progress.positive.id).toBe(appended.progress.positive.id);
  await page.screenshot({ path: path.join(out, `home-entry-progress-${preview ? 'preview' : 'normal'}-${width}.png`) }); await close();

  // A preference write failure cannot undo a successfully stored business record.
  await explicitTask(); await taskTitle().fill('类型偏好写入失败但任务已保存');
  await page.evaluate(() => { window.__miniFixture.failHomeEntryModeWrites = true; });
  await save('任务'); expect(await preference()).toBe('progress');
  expect((await business('todos')).tasks.filter(task => task.title === '类型偏好写入失败但任务已保存')).toHaveLength(1);
  await expect(page.locator('.app-message')).toContainText('默认类型未记住');
  expect(await page.evaluate(() => window.__miniNotices)).toEqual([]);
  await page.evaluate(() => { window.__miniFixture.failHomeEntryModeWrites = false; });

  // Volatile saves keep their type and original payload ahead of remembered type/new capture.
  await explicitTask(); await taskTitle().fill('未持久化任务原ID');
  const retry = await stored(draftKey());
  await page.evaluate(() => { window.__miniFixture.failToolWrites = ['todos']; });
  await composer().getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(composer().getByRole('alert')).toContainText('本机存储不可用'); expect(await preference()).toBe('progress'); await close();
  await home('重试时的新输入'); await selected('任务');
  await expect(taskTitle()).toHaveValue('未持久化任务原ID'); await expect(mode('备忘')).toBeDisabled();
  const pending = await stored(draftKey()); expect(pending.pendingSave).toBe('task'); expect(pending.task).toEqual(retry.task); expect(pending.captureText).toBe(retry.captureText);
  expect(await preference()).toBe('progress');
  await page.evaluate(() => { window.__miniFixture.failToolWrites = []; }); await save('任务');
  expect(await preference()).toBe('task'); expect((await business('todos')).tasks.filter(task => task.id === retry.task.id)).toHaveLength(1);
  await expect.poll(() => page.evaluate(() => location.hash), 'Successful task retries follow C246 into the todo page').toBe('#/pages/todos/index');
  expect((await business('todos')).tasks.some(task => task.title === '重试时的新输入'), 'A same-ID retry does not submit the newer capture').toBe(false);
  await go('index');
  await page.getByRole('textbox', { name: '创建内容', exact: true }).fill('重试时的新输入');
  await page.locator('.today-capture').getByRole('button', { name: '创建', exact: true }).click(); await selected('任务');
  await expect(taskTitle()).toHaveValue('重试时的新输入'); await save('任务');
  await go('index');
  await expect(page.getByRole('textbox', { name: '创建内容', exact: true })).toHaveValue('');
  expect((await business('todos')).tasks.filter(task => task.id === retry.task.id)).toHaveLength(1);
  await home(); await selected('任务'); await close();

  for (const invalid of ['unknown', { mode: 'memo' }, null]) {
    await setPreference(invalid); await home(); await selected('任务'); await close();
    expect(await preference(), 'Reading an invalid preference uses task without rewriting it').toEqual(invalid);
  }
  if (!preview) {
    await setPreference('progress');
    const login = async name => {
      await page.evaluate(({ name, seed }) => {
        window.__miniFixture.accountToolStates ||= {};
        if (name && !window.__miniFixture.accountToolStates[name]) window.__miniFixture.accountToolStates[name] = structuredClone(seed);
        window.__miniFixture.sessionProfile = { authenticated: !!name, userName: name || null, isAdmin: false };
        window.__miniPreviewControl.emit('ottlog-session');
      }, { name, seed });
      await confirmUnsavedClose(page); await expect(composer()).toHaveCount(0);
    };
    await login('memory-a'); await home(); await selected('任务'); await mode('备忘').click(); await memoTitle().fill('账号甲便签'); await save('备忘');
    expect(await preference('reader:memory-a')).toBe('memo'); expect(await preference()).toBe('progress');
    await expect.poll(() => stored(toolKey('memos', 'reader:memory-a')).then(cache => cache.pending), 'Account A sync finishes before deliberately switching its server session').toBe(false);
    expect(await page.evaluate(() => window.__miniFixture.accountToolStates['memory-a'].memos.notes)).toHaveLength(1);
    await login('memory-b'); await home(); await selected('任务'); await mode('进展').click(); await record().fill('账号乙进展'); await save('进展');
    expect(await preference('reader:memory-b')).toBe('progress'); expect(await preference('reader:memory-a')).toBe('memo');
    expect((await business('domains', 'reader:memory-b')).domains.flatMap(domain => domain.positiveRecords)).toHaveLength(1);
    await expect.poll(() => stored(toolKey('domains', 'reader:memory-b')).then(cache => cache.pending), 'Account B sync finishes before deliberately switching its server session').toBe(false);
    expect(await page.evaluate(() => window.__miniFixture.accountToolStates['memory-b'].domains.domains.flatMap(domain => domain.positiveRecords))).toHaveLength(1);
    await login('memory-a'); await home(); await selected('备忘'); await memoTitle().fill('账号切换前未保存');
    await login('memory-b'); await home(); await selected('进展'); await close();
    await login(''); await home(); await selected('进展'); await close();
    expect((await business('memos', 'reader:memory-a')).notes).toHaveLength(1);
    expect((await business('domains', 'reader:memory-b')).domains.flatMap(domain => domain.positiveRecords)).toHaveLength(1);
  } else {
    await setPreference('progress');
    await page.evaluate(() => { window.__miniFixture.sessionProfile = { authenticated: true, userName: 'memory-a', isAdmin: false }; window.__miniPreviewControl.emit('ottlog-session'); });
    await home(); await selected('进展'); await close();
    const untouched = await page.evaluate(keys => Object.fromEntries(keys.map(storageKey => [storageKey, localStorage.getItem(storageKey)])), Object.keys(normalSentinels));
    expect(untouched, 'Real preview compilation leaves normal tools, drafts and all normal owner preferences unchanged').toEqual(normalSentinels);
    expect(await page.evaluate(() => window.__miniRequests.filter(request => request.path.startsWith('/personal-tools/')))).toEqual([]);
  }
  expect(await page.evaluate(() => window.__miniRequests.filter(request => request.method === 'PUT').some(request => JSON.stringify(request.data).includes('home-entry-mode'))), 'The local preference is never included in business synchronization').toBe(false);
  await page.evaluate(() => { localStorage.clear(); });
};

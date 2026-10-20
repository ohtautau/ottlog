const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const previewFactory = require('./domain-preview-records.cjs');
const { createDomainPreviewRecords, createReminderPreviewRecords, createHabitCommentPreviewRecords } = previewFactory;

// Evaluate the real adapters and seed page with in-memory Taro/React/API mocks.
// No real account, network, device storage or user data is accessed.
const root = path.resolve(__dirname, '..');
const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const PREVIEW_PREFIX = 'ottlog-mini-preview-v1:';
const CACHE_PREFIX = 'ottlog-mini-tool-v1:';
const FIXED_NOW = Date.parse('2026-10-07T12:00:00.000Z');
const cacheKey = owner => `${CACHE_PREFIX}${owner}:domains`;
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

function fixture(mode, storage = new Map()) {
  const modules = new Map(), calls = [], reads = [], writes = [], effects = [], launches = [], stateChanges = [], navigation = [];
  const remote = new Map();
  let owner = 'reader:preview-check', store, failWrite = false;
  const taro = {
    getStorageSync(key) { reads.push(key); return copy(storage.get(key)); },
    setStorageSync(key, value) {
      if (failWrite === true || failWrite === key) throw new Error('mock storage full');
      writes.push(key); storage.set(key, copy(value));
    },
    async switchTab(options) { navigation.push({ type: 'tab', ...options }); },
    async navigateTo(options) { navigation.push({ type: 'page', ...options }); },
    useDidShow() {},
    useLaunch(callback) { launches.push(callback); },
    eventCenter: { on() {}, off() {} },
  };
  const react = {
    useCallback: callback => callback,
    useEffect: callback => effects.push(callback),
    useRef: current => ({ current }),
    useState: initial => [initial, value => stateChanges.push(value)],
  };
  const jsx = (type, props) => ({ type, props });
  async function api(route, method = 'GET', body, expectedOwner) {
    calls.push({ route, method, body: copy(body), expectedOwner });
    if (route === '/account/session') {
      const [role, userName] = owner.split(':');
      return { authenticated: owner !== 'guest', isAdmin: role === 'admin', userName, csrfToken: 'mock-only' };
    }
    assert.equal(route, '/personal-tools/domains', 'Only the mocked domain API is expected');
    if (method === 'PUT') {
      assert.equal(expectedOwner, owner);
      remote.set(owner, copy(body.data));
      return {};
    }
    return { data: copy(remote.get(owner)) ?? null };
  }
  function load(filename) {
    const resolved = path.resolve(root, filename);
    if (modules.has(resolved)) return modules.get(resolved).exports;
    const module = { exports: {} };
    modules.set(resolved, module);
    const source = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: resolved,
    }).outputText;
    const resolveImport = name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
      if (name === '@tarojs/taro') return taro;
      if (name === '@tarojs/components') return { View: 'view', Text: 'text' };
      assert.ok(name.startsWith('.'), `Unexpected external module: ${name}`);
      const target = path.resolve(path.dirname(resolved), name);
      if (target === path.join(root, 'src', 'api')) return { api };
      if (target === path.join(root, 'src', 'components', 'ui-button')) return { __esModule: true, default: 'ActionButton' };
      if (target.endsWith('.css')) return {};
      if (target.endsWith('.cjs')) {
        assert.equal(target, path.join(root, 'scripts', 'domain-preview-records.cjs'));
        return previewFactory;
      }
      const file = fs.existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`;
      const exports = load(file);
      if (resolved.endsWith(`${path.sep}use-personal-tool-state.ts`) && target.endsWith(`${path.sep}tool-state-store`)) {
        return { ...exports, createPersonalToolStore(adapter) { store = exports.createPersonalToolStore(adapter); return store; } };
      }
      return exports;
    };
    const globals = { exports: module.exports, module, require: resolveImport, Date, Error, TypeError, Promise, Map, Set, JSON, console, defineAppConfig: value => value };
    if (mode !== undefined) globals.MINIPROGRAM_PREVIEW = mode;
    vm.runInNewContext(source, globals, { filename: resolved });
    return module.exports;
  }
  function adapterStore() { load('src/lib/use-personal-tool-state.ts'); assert.ok(store); return store; }
  async function seed() {
    const previous = effects.length;
    load('src/pages/preview-data/index.tsx').default();
    effects.slice(previous).forEach(effect => effect());
    await nextTurn();
  }
  return { load, adapterStore, seed, storage, remote, calls, reads, writes, navigation, launches, stateChanges,
    readStorage: taro.getStorageSync, writeStorage: taro.setStorageSync,
    setOwner: value => { owner = value; }, failWrite: value => { failWrite = value; } };
}

function checkSamples() {
  const f = fixture(false), { isDomainState, initialDomainState } = f.load('src/lib/domain-data.ts');
  const before = copy(initialDomainState), samples = createDomainPreviewRecords(FIXED_NOW);
  assert.ok(isDomainState(samples), 'Preview samples must satisfy the actual domain-state validator');
  assert.deepEqual(samples.domains.map(domain => domain.id), copy(initialDomainState.domains.map(domain => domain.id)), 'Preview domains use the existing stable domain IDs');
  assert.equal(samples.domains.length, 8);
  assert.equal(samples.completedGoals.length, 36);
  const completedCounts = samples.domains.map(domain => ['longTerm', 'shortTerm'].map(kind => samples.completedGoals.filter(goal => goal.domainId === domain.id && goal.kind === kind).length));
  assert.deepEqual(completedCounts, [[3, 6], [2, 4], [1, 3], [2, 2], [0, 5], [1, 1], [0, 1], [2, 3]], 'Domains contain varied real long/short completion histories');
  const ids = samples.domains.flatMap(domain => [domain.longTermGoal.id, domain.shortTermGoal.id, ...domain.positiveRecords.map(record => record.id), ...domain.negativeRecords.map(record => record.id)]).concat(samples.completedGoals.map(goal => goal.id));
  assert.equal(new Set(ids).size, ids.length, 'Sample goals and records have globally unique IDs');
  for (const domain of samples.domains) {
    const original = initialDomainState.domains.find(item => item.id === domain.id);
    assert.equal(domain.name, original.name);
    assert.equal(domain.iconId, original.iconId);
    assert.deepEqual(domain.habits, [], 'Preview domains do not duplicate the shared reminders habits');
    assert.equal(domain.positiveRecords.length, 7, 'Each domain has enough positive history for downward reading');
    assert.equal(domain.negativeRecords.length, 4);
    for (const records of [domain.positiveRecords, domain.negativeRecords]) {
      assert.ok(records.every(record => Date.parse(record.createdAt) <= FIXED_NOW && record.content.trim()));
      assert.ok(records.every((record, index) => !index || Date.parse(records[index - 1].createdAt) < Date.parse(record.createdAt)), 'Sample storage retains normal oldest-first append order');
    }
  }
  const again = createDomainPreviewRecords(FIXED_NOW), later = createDomainPreviewRecords(FIXED_NOW + 86400000);
  assert.deepEqual(again, samples, 'A fixed preview clock produces repeatable samples');
  assert.deepEqual(later.domains.flatMap(domain => domain.positiveRecords.map(record => record.id)), samples.domains.flatMap(domain => domain.positiveRecords.map(record => record.id)), 'Sample IDs stay stable when the preview date changes');
  assert.equal(Date.parse(later.domains[0].positiveRecords[0].createdAt) - Date.parse(samples.domains[0].positiveRecords[0].createdAt), 86400000);
  samples.domains[0].positiveRecords[0].content = 'Modified test sample';
  samples.domains[0].longTermGoal.content = 'Modified goal';
  assert.notDeepEqual(samples, again);
  assert.deepEqual(createDomainPreviewRecords(FIXED_NOW), again, 'Every factory call returns fresh nested objects');
  assert.deepEqual(copy(initialDomainState), before, 'Preview generation never mutates production defaults');
  assert.throws(() => createDomainPreviewRecords(NaN), /finite/);
  const { initialReminders, isReminderState, cleanState, localDate, habitDayIndex, hasHabitDay } = f.load('src/lib/reminder-data.ts');
  const beforeReminders = copy(initialReminders), reminders = createReminderPreviewRecords(initialReminders, FIXED_NOW);
  assert.ok(isReminderState(reminders));
  assert.equal(reminders.items.length, initialReminders.items.length + 9);
  assert.deepEqual(copy(initialReminders), beforeReminders);
  assert.deepEqual(reminders.items.slice(0, initialReminders.items.length), beforeReminders.items, 'Default shared habits retain their original identities and metadata');
  assert.equal(new Set(reminders.items.map(item => item.id)).size, reminders.items.length);
  const counts = copy(f.load('src/lib/domain-completion.ts').domainCompletionCounts(again, reminders, new Date(FIXED_NOW)));
  assert.deepEqual(counts.map(count => [count.longTermGoals, count.shortTermGoals, count.habits]), [[3, 6, 1], [2, 4, 1], [1, 3, 1], [2, 2, 2], [0, 5, 1], [1, 1, 1], [0, 1, 0], [2, 3, 1]], 'Card counts come from the original shared goal and habit selectors');
  const normalized = cleanState(reminders), today = localDate(new Date(FIXED_NOW));
  assert.equal(reminders.done[today].length, 8);
  for (const [day, times] of Object.entries(reminders.checkInTimes)) for (const [id, stamp] of Object.entries(times)) {
    assert.equal(localDate(new Date(stamp)), day); assert.ok(stamp <= FIXED_NOW);
    assert.ok(hasHabitDay(normalized.completionHistory[id], habitDayIndex(day)));
  }
  const orphan = copy(initialReminders), orphanId = reminders.items[initialReminders.items.length].id;
  orphan.done[today] = [orphanId]; orphan.completionHistory = { [orphanId]: [[habitDayIndex(today), habitDayIndex(today)]] };
  const extended = previewFactory.extendReminderPreview(orphan, reminders, again);
  assert.equal(extended.items.some(item => item.id === orphanId), false, 'New sample habits never inherit an old orphan identity or history');
  assert.deepEqual(extended.completionHistory, orphan.completionHistory);
}

function checkHabitCommentSamples() {
  const f = fixture(false), { initialReminders, isReminderState, cleanState, localDate, habitDayIndex, hasHabitDay } = f.load('src/lib/reminder-data.ts');
  const before = copy(initialReminders), samples = createHabitCommentPreviewRecords(initialReminders, FIXED_NOW);
  assert.ok(isReminderState(samples));
  assert.deepEqual(copy(initialReminders), before, 'Comment samples never mutate ordinary default habits');
  assert.deepEqual(samples.items.slice(0, before.items.length), before.items);
  const habit = samples.items.at(-1), today = localDate(new Date(FIXED_NOW));
  assert.equal(habit.id, 'preview-v3-habit-morning-writing');
  assert.equal(habit.title, '晨间书写');
  assert.equal(habit.domainId, 'mind');
  assert.equal(samples.done[today]?.includes(habit.id) ?? false, false, 'New comment samples do not alter existing today-completion previews');
  const previousMonth = localDate(new Date(new Date(FIXED_NOW).getFullYear(), new Date(FIXED_NOW).getMonth() - 1, 1)).slice(0, 7);
  const comments = samples.reflections.filter(item => item.day.startsWith(previousMonth));
  assert.equal(comments.length, 23, 'A complete previous month supports 10, 20 and final-page comment reading');
  assert.equal(new Set(samples.reflections.map(item => item.id)).size, samples.reflections.length);
  assert.ok(comments.some(item => Array.from(item.text).length > 80), 'A real-length long comment exercises full-text wrapping');
  assert.ok(comments.some(item => item.text.includes('\n')), 'Raw multiline storage is included without changing the formal normalization');
  const normalized = cleanState(samples);
  for (const [day, times] of Object.entries(samples.checkInTimes)) for (const [id, stamp] of Object.entries(times)) {
    assert.equal(localDate(new Date(stamp)), day);
    assert.ok(stamp <= FIXED_NOW, 'Preview check-ins are never in the future');
    assert.ok(hasHabitDay(normalized.completionHistory[id], habitDayIndex(day)));
  }
  for (const reflection of samples.reflections) {
    assert.ok(reflection.text.trim());
    assert.ok(Array.from(reflection.text).length <= 120);
    assert.ok(reflection.createdAt <= FIXED_NOW);
    assert.equal(samples.checkInTimes[reflection.day][habit.id], reflection.createdAt);
    assert.ok(normalized.reflections.some(item => item.id === reflection.id), 'Every seeded comment survives the existing read validator');
  }
  assert.ok(Object.entries(samples.done).some(([day, ids]) => ids.includes(habit.id) && !samples.reflections.some(item => item.day === day)), 'No-comment check-ins remain available for calendar and totals');
  const invalidComments = { ...samples, reflections: [...samples.reflections,
    { id: 'blank-preview-comment', habitId: habit.id, day: `${previousMonth}-22`, text: ' \n\t ', createdAt: FIXED_NOW - 1 },
    { id: 'unchecked-preview-comment', habitId: habit.id, day: `${previousMonth}-27`, text: '未打卡的孤立留言', createdAt: FIXED_NOW - 1 },
  ] };
  assert.equal(cleanState(invalidComments).reflections.length, normalized.reflections.length, 'Blank and unchecked legacy comments are excluded by the original read guard');
  assert.deepEqual(createHabitCommentPreviewRecords(initialReminders, FIXED_NOW), samples, 'The injected clock produces stable habit/comment identities and timestamps');
  assert.throws(() => createHabitCommentPreviewRecords(initialReminders, NaN), /finite/);
  for (const stamp of ['2026-03-01T00:01:00.000Z', '2026-01-01T00:01:00.000Z', '2026-10-08T12:00:00.000Z']) {
    const now = Date.parse(stamp), dated = createHabitCommentPreviewRecords(initialReminders, now);
    assert.equal(dated.items.at(-1).id, habit.id, 'Habit identity remains stable across local month/year changes');
    assert.ok(isReminderState(dated));
    assert.ok(dated.reflections.every(item => item.createdAt <= now));
    for (const [day, times] of Object.entries(dated.checkInTimes)) for (const checkIn of Object.values(times)) {
      assert.equal(localDate(new Date(checkIn)), day);
      assert.ok(checkIn <= now);
    }
  }
  const domains = createDomainPreviewRecords(FIXED_NOW);
  for (const field of ['done', 'completionHistory', 'reflections', 'checkInTimes']) {
    const orphan = copy(initialReminders);
    if (field === 'done') orphan.done[today] = [habit.id];
    if (field === 'completionHistory') orphan.completionHistory = { [habit.id]: [[habitDayIndex(today), habitDayIndex(today)]] };
    if (field === 'reflections') orphan.reflections = [{ id: 'old-orphan', habitId: habit.id, day: today, text: '保留旧引用', createdAt: FIXED_NOW }];
    if (field === 'checkInTimes') orphan.checkInTimes = { [today]: { [habit.id]: FIXED_NOW } };
    const extended = previewFactory.extendHabitCommentPreview(orphan, samples, domains);
    assert.equal(extended.items.some(item => item.id === habit.id), false, `New habits never inherit an orphan ${field} identity`);
    assert.deepEqual(extended[field], orphan[field]);
  }
  const removedDomain = { ...domains, domains: domains.domains.filter(item => item.id !== habit.domainId) };
  assert.equal(previewFactory.extendHabitCommentPreview(initialReminders, samples, removedDomain).items.length, before.items.length, 'A deleted domain is never recreated or associated with new comment samples');
}

function productionStorage() {
  const value = createDomainPreviewRecords(FIXED_NOW), realGuest = copy(value), realAccount = copy(value);
  realGuest.domains[0].positiveRecords[0].content = 'Untouched ordinary guest record';
  realAccount.domains[0].positiveRecords[0].content = 'Untouched ordinary account record';
  return new Map([
    [cacheKey('guest'), { data: realGuest, pending: false, revision: 5 }],
    [cacheKey('reader:preview-check'), { data: realAccount, pending: true, revision: 7 }],
    ['ottlog-mini-tool-identity-v1', { owner: 'reader:preview-check', fingerprint: 'ordinary-cookie=mock' }],
    ['ottlog.cookies', { session: 'ordinary-cookie=mock' }],
    ['ottlog-mini-entry-draft-v1:guest', { content: 'ordinary guest draft' }],
    ['ottlog-mini-entry-draft-v1:reader:preview-check', { content: 'ordinary account draft' }],
    ['ottlog.habit-openings.v1.guest', { version: 1, opened: { exercise: [FIXED_NOW - 86400000], retainedGuestHabit: [FIXED_NOW - 172800000] } }],
    ['ottlog.habit-openings.v1.reader%3Apreview-check', { version: 1, opened: { exercise: [FIXED_NOW - 259200000], retainedAccountHabit: [FIXED_NOW - 345600000] } }],
  ]);
}

async function checkPreviewIsolation() {
  const storage = productionStorage(), before = copy([...storage]);
  const f = fixture(true, storage), helper = f.load('src/lib/development-preview.ts');
  assert.equal(helper.previewMode, true);
  assert.equal(helper.previewStorageKey(cacheKey('guest')), PREVIEW_PREFIX + cacheKey('guest'));
  const { entryDraftKey } = f.load('src/lib/entry-draft.ts');
  assert.equal(entryDraftKey('guest'), `${PREVIEW_PREFIX}ottlog-mini-entry-draft-v1:guest`);
  assert.equal(entryDraftKey('reader:preview-check'), `${PREVIEW_PREFIX}ottlog-mini-entry-draft-v1:reader:preview-check`);
  const openings = f.load('src/lib/habit-recommendations.ts');
  for (const owner of ['guest', 'reader:preview-check']) {
    const key = openings.habitOpenKey(owner);
    assert.equal(key, `${PREVIEW_PREFIX}ottlog.habit-openings.v1.${encodeURIComponent(owner)}`);
    const cleaned = openings.cleanHabitOpenLog(f.readStorage(key), ['exercise'], FIXED_NOW);
    assert.deepEqual(copy(cleaned), { version: 1, opened: {} }, 'Preview log cleanup never reads an ordinary habit-opening log');
    f.writeStorage(key, cleaned);
    f.writeStorage(key, openings.recordHabitOpening(cleaned, 'exercise', FIXED_NOW));
    assert.deepEqual(storage.get(key), { version: 1, opened: { exercise: [FIXED_NOW] } }, 'Preview deliberate openings save only the isolated log');
  }
  await f.seed();
  assert.equal(f.navigation.at(-1).url, '/pages/domains/index');
  const previewKey = helper.previewStorageKey(cacheKey('guest')), seeded = copy(storage.get(previewKey));
  assert.ok(f.load('src/lib/domain-data.ts').isDomainState(seeded.data));
  assert.equal(seeded.pending, false);
  assert.equal(seeded.revision, 0);
  const store = f.adapterStore(), loaded = await store.load('domains', {});
  assert.equal(loaded.owner, 'guest');
  assert.equal(loaded.cloud, false);
  assert.equal(loaded.fingerprint, '');
  assert.deepEqual(copy(loaded.value), seeded.data);
  const changed = store.edit('domains', loaded, previous => {
    const result = copy(previous);
    result.domains[0].positiveRecords.push({ id: 'preview-edited-record', content: 'Test-only edited preview', createdAt: new Date(FIXED_NOW).toISOString() });
    return result;
  });
  assert.deepEqual(storage.get(previewKey).data, copy(changed));
  storage.set('ottlog.cookies', { session: 'another-cookie=mock' });
  f.setOwner('reader:another-check');
  const reloaded = await store.load('domains', {});
  assert.equal(reloaded.owner, 'guest', 'Preview remains isolated when ordinary account credentials change');
  assert.deepEqual(copy(reloaded.value), copy(changed));
  const reopened = fixture(true, storage);
  await reopened.seed();
  assert.deepEqual(storage.get(previewKey).data, copy(changed), 'Reopening the seed page never replaces an existing edited preview cache');
  assert.deepEqual(copy((await reopened.adapterStore().load('domains', {})).value), copy(changed), 'Preview edits survive a new adapter/store instance');
  const reopenedOpenings = reopened.load('src/lib/habit-recommendations.ts');
  assert.deepEqual(reopened.readStorage(reopenedOpenings.habitOpenKey('guest')), { version: 1, opened: { exercise: [FIXED_NOW] } }, 'Preview habit-opening logs survive refresh under their isolated key');
  for (const [key, value] of before) if (key !== 'ottlog.cookies') assert.deepEqual(storage.get(key), value, `Preview must preserve ordinary storage: ${key}`);
  assert.ok([...f.reads, ...f.writes, ...reopened.reads, ...reopened.writes].every(key => key.startsWith(PREVIEW_PREFIX)), 'Preview adapter and seed page access only prefixed storage');
  assert.equal(f.calls.length + reopened.calls.length, 0, 'Preview must not call the real session or personal-tools API');
  const invalid = fixture(true, new Map([[previewKey, { data: { invalid: true }, pending: false, revision: 9 }]]));
  await invalid.seed();
  assert.deepEqual(invalid.storage.get(previewKey), { data: { invalid: true }, pending: false, revision: 9 }, 'Even invalid existing preview caches are retained for the original error/retry path');
  assert.equal(invalid.writes.length, 0);
  const failure = fixture(true);
  failure.failWrite(true); await failure.seed();
  assert.equal(failure.storage.size, 0);
  assert.equal(failure.navigation.length, 0, 'Failed sample persistence does not navigate as if initialization succeeded');
  assert.ok(failure.stateChanges.some(message => message === 'mock storage full'));
  failure.failWrite(false); await failure.seed();
  assert.ok(failure.storage.has(previewKey), 'A failed initialization can retry without touching ordinary data');
}

async function checkNegativePreviewUpgrade() {
  const { initialReminders } = fixture(true).load('src/lib/reminder-data.ts');
  const domainKey = PREVIEW_PREFIX + cacheKey('guest'), habitKey = `${PREVIEW_PREFIX}${CACHE_PREFIX}guest:reminders`;
  const marker = `${PREVIEW_PREFIX}ottlog-domain-negative-preview-seed-v4`;
  const base = createDomainPreviewRecords(FIXED_NOW), before = JSON.stringify(base);
  const extended = previewFactory.extendNegativeRecordPreview(base, FIXED_NOW);
  assert.equal(JSON.stringify(base), before, 'Negative samples do not mutate the input archive');
  const samples = extended.domains.flatMap(domain => domain.negativeRecords.filter(record => record.id.startsWith('preview-v4-')));
  assert.equal(samples.length, 4);
  assert.ok(samples.every(record => record.content.trim() && Date.parse(record.createdAt) < FIXED_NOW));
  assert.deepEqual(previewFactory.extendNegativeRecordPreview(extended, FIXED_NOW + 86400000), extended, 'Partial-write retries keep stable IDs and the original dates');
  assert.throws(() => previewFactory.extendNegativeRecordPreview(base, NaN), TypeError);
  const state = copy(base);
  state.domains = state.domains.filter(domain => domain.id !== 'life');
  state.completedGoals = state.completedGoals.filter(goal => goal.domainId !== 'life');
  state.domains[0].name = '保留我的领域';
  state.domains[0].positiveRecords.pop(); state.domains[0].negativeRecords.shift();
  const initialStorage = () => new Map([...productionStorage(),
    [domainKey, { data: copy(state), pending: true, revision: 17 }],
    [habitKey, { data: copy(initialReminders), pending: false, revision: 9 }],
    [`${PREVIEW_PREFIX}ottlog-domain-preview-seed-v2`, 2],
    [`${PREVIEW_PREFIX}ottlog-habit-comment-preview-seed-v3`, 3],
    [`${PREVIEW_PREFIX}ottlog-domain-entertainment-preview-seed-v5`, 5],
  ]);
  const storage = initialStorage(), original = copy([...storage]), upgrade = fixture(true, storage);
  await upgrade.seed();
  assert.equal(storage.get(marker), 4);
  const result = storage.get(domainKey);
  assert.equal(result.pending, true); assert.equal(result.revision, 18);
  assert.deepEqual(result.data.completedGoals, state.completedGoals);
  assert.equal(result.data.domains.some(domain => domain.id === 'life'), false, 'A deleted domain is never recreated');
  for (const domain of state.domains) {
    const next = result.data.domains.find(item => item.id === domain.id);
    assert.deepEqual(next.positiveRecords, domain.positiveRecords);
    assert.deepEqual(next.negativeRecords.slice(0, domain.negativeRecords.length), domain.negativeRecords, 'All old edits and deletions stay intact');
  }
  for (const [key, value] of original) if (key !== domainKey) assert.deepEqual(storage.get(key), value, 'Only the isolated domain candidate changes');
  assert.equal(upgrade.writes.at(-1), marker); assert.equal(upgrade.calls.length, 0);
  const recent = upgrade.load('src/lib/domain-data.ts').recentDomainRecords(result.data);
  assert.equal(recent.length, 10); assert.equal(recent.filter(item => item.kind === 'negative').length, 3);
  result.data.domains[0].negativeRecords = result.data.domains[0].negativeRecords.filter(record => !record.id.startsWith('preview-v4-'));
  const edited = copy([...storage]), reopen = fixture(true, storage); await reopen.seed();
  assert.deepEqual(copy([...storage]), edited, 'Deleting a v4 record after seeding is preserved on later launches');
  assert.equal(reopen.writes.length, 0);
  for (const failingKey of [domainKey, marker]) {
    const retryStorage = initialStorage(), retry = fixture(true, retryStorage);
    retry.failWrite(failingKey); await retry.seed();
    assert.equal(retryStorage.has(marker), false); assert.equal(retry.navigation.length, 0);
    const persisted = copy(retryStorage.get(domainKey));
    retry.failWrite(false); await retry.seed();
    assert.equal(retryStorage.get(marker), 4);
    const records = retryStorage.get(domainKey).data.domains.flatMap(domain => domain.negativeRecords);
    assert.equal(records.filter(record => record.id.startsWith('preview-v4-')).length, 3);
    assert.equal(new Set(records.map(record => record.id)).size, records.length);
    if (failingKey === marker) assert.deepEqual(retryStorage.get(domainKey), persisted, 'Marker-only retry never replaces saved dates or increments the revision again');
  }
}

async function checkEntertainmentPreviewUpgrade() {
  const { initialReminders } = fixture(true).load('src/lib/reminder-data.ts');
  const domainKey = PREVIEW_PREFIX + cacheKey('guest'), habitKey = `${PREVIEW_PREFIX}${CACHE_PREFIX}guest:reminders`;
  const marker = `${PREVIEW_PREFIX}ottlog-domain-entertainment-preview-seed-v5`;
  const originalDomains = createDomainPreviewRecords(FIXED_NOW);
  originalDomains.domains[0].name = '保留我的成长领域';
  originalDomains.domains[0].positiveRecords[0].content = '保留我的旧记录';
  const initialStorage = () => new Map([...productionStorage(),
    [domainKey, { data: copy(originalDomains), pending: true, revision: 17, retainedEnvelopeField: '保留缓存扩展字段' }],
    [habitKey, { data: copy(initialReminders), pending: false, revision: 9 }],
    [`${PREVIEW_PREFIX}ottlog-domain-preview-seed-v2`, 2],
    [`${PREVIEW_PREFIX}ottlog-habit-comment-preview-seed-v3`, 3],
    [`${PREVIEW_PREFIX}ottlog-domain-negative-preview-seed-v4`, 4],
  ]);
  const storage = initialStorage(), before = copy([...storage]), upgrade = fixture(true, storage);
  await upgrade.seed();
  const result = storage.get(domainKey), entertainment = result.data.domains.at(-1);
  assert.equal(storage.get(marker), 5);
  assert.equal(result.pending, true); assert.equal(result.revision, 18);
  assert.equal(result.retainedEnvelopeField, '保留缓存扩展字段');
  assert.deepEqual(result.data.domains.slice(0, 8), originalDomains.domains, 'The existing eight retain their order and every goal, record and edit');
  assert.deepEqual(result.data.completedGoals, originalDomains.completedGoals);
  assert.deepEqual(entertainment, {
    id: 'entertainment', name: '娱乐', iconId: 'game',
    longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [],
  }, 'The ninth card starts empty in the ordinary-domain continuation');
  assert.ok(upgrade.load('src/lib/domain-data.ts').isDomainState(result.data));
  for (const [key, value] of before) if (key !== domainKey) assert.deepEqual(storage.get(key), value, 'The entertainment upgrade preserves reminders, prior markers and all ordinary storage');
  assert.deepEqual(upgrade.writes, [domainKey, marker], 'Only the isolated candidate and its marker are written, with the marker last');
  assert.ok([...upgrade.reads, ...upgrade.writes].every(key => key.startsWith(PREVIEW_PREFIX)));
  assert.equal(upgrade.calls.length, 0);
  assert.equal(upgrade.navigation.at(-1).url, '/pages/domains/index');

  for (const transform of [
    state => { const domain = state.domains.find(item => item.id === 'entertainment'); domain.name = '我修改后的娱乐'; domain.iconId = 'camera'; },
    state => { state.domains = state.domains.filter(item => item.id !== 'entertainment'); },
  ]) {
    const editedStorage = new Map(copy([...storage]));
    transform(editedStorage.get(domainKey).data);
    const editedBefore = copy([...editedStorage]), reopened = fixture(true, editedStorage);
    await reopened.seed();
    assert.deepEqual(copy([...editedStorage]), editedBefore, 'The v5 marker preserves later renaming and deletion without re-adding the card');
    assert.equal(reopened.writes.length, 0);
  }
  for (const failingKey of [domainKey, marker]) {
    const retryStorage = initialStorage(), retry = fixture(true, retryStorage), retryBefore = copy([...retryStorage]);
    retry.failWrite(failingKey); await retry.seed();
    assert.equal(retryStorage.has(marker), false);
    assert.equal(retry.navigation.length, 0, 'A failed entertainment write never navigates as if the upgrade succeeded');
    assert.ok(retry.stateChanges.some(message => message === 'mock storage full'));
    if (failingKey === domainKey) assert.deepEqual(copy([...retryStorage]), retryBefore, 'Failed candidate persistence leaves the original cache unchanged');
    const persisted = copy(retryStorage.get(domainKey));
    retry.failWrite(false); await retry.seed();
    assert.equal(retryStorage.get(marker), 5);
    const retried = retryStorage.get(domainKey);
    assert.equal(retried.data.domains.filter(domain => domain.id === 'entertainment').length, 1);
    assert.equal(retried.pending, true); assert.equal(retried.revision, 18);
    assert.deepEqual(retried.data.domains.slice(0, 8), originalDomains.domains);
    if (failingKey === marker) assert.deepEqual(retried, persisted, 'Marker-only retry retains the already-persisted candidate and does not increment revision again');
    assert.equal(retry.writes.at(-1), marker);
  }
  const fullStorage = initialStorage(), full = fullStorage.get(domainKey);
  while (full.data.domains.length < 24) full.data.domains.push({
    id: `full-preview-${full.data.domains.length}`, name: `额外领域${full.data.domains.length}`, iconId: 'star',
    longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [],
  });
  const capacity = fixture(true, fullStorage), capacityBefore = copy([...fullStorage]);
  assert.ok(capacity.load('src/lib/domain-data.ts').isDomainState(full.data), 'The capacity fixture is a valid existing 24-domain archive');
  await capacity.seed();
  assert.deepEqual(copy([...fullStorage]), capacityBefore, 'A full archive retains all original data instead of forcing a twenty-fifth domain');
  assert.equal(fullStorage.has(marker), false); assert.equal(capacity.writes.length, 0); assert.equal(capacity.navigation.length, 0);
  assert.ok(capacity.stateChanges.some(message => message === '预览样本无法追加，已有数据已保留'));
}

async function checkOrdinaryMode() {
  for (const mode of [false, undefined]) {
    const storage = productionStorage(), f = fixture(mode, storage), helper = f.load('src/lib/development-preview.ts');
    assert.equal(helper.previewMode, false);
    assert.equal(helper.previewStorageKey(cacheKey('guest')), cacheKey('guest'));
    const entry = f.load('src/lib/entry-draft.ts');
    assert.equal(entry.entryDraftKey('guest'), 'ottlog-mini-entry-draft-v1:guest');
    const openings = f.load('src/lib/habit-recommendations.ts');
    for (const owner of ['guest', 'reader:preview-check', 'reader:a/b']) assert.equal(openings.habitOpenKey(owner), `ottlog.habit-openings.v1.${encodeURIComponent(owner)}`, 'Ordinary and undefined-preview builds keep the original habit-log keys');
    const seedBefore = copy([...storage]);
    await f.seed();
    assert.deepEqual(copy([...storage]), seedBefore, 'Ordinary builds never seed preview records');
    assert.equal(f.navigation.length, 0);
    f.remote.set('reader:preview-check', createDomainPreviewRecords(FIXED_NOW));
    const store = f.adapterStore(), loaded = await store.load('domains', {});
    assert.equal(loaded.owner, 'reader:preview-check');
    assert.equal(loaded.cloud, true);
    const changed = store.edit('domains', loaded, previous => ({ ...previous, domains: previous.domains.map((domain, index) => index ? domain : { ...domain, name: 'Ordinary account edit' }) }));
    await store.flush('domains', loaded.owner);
    assert.deepEqual(f.remote.get(loaded.owner), copy(changed), 'Ordinary mode retains the original account save queue');
    assert.ok(f.calls.some(call => call.route === '/account/session'));
    assert.ok(f.calls.some(call => call.route === '/personal-tools/domains' && call.method === 'GET'));
    assert.ok(f.calls.some(call => call.route === '/personal-tools/domains' && call.method === 'PUT' && call.expectedOwner === loaded.owner));
    assert.ok([...storage.keys()].every(key => !key.startsWith(PREVIEW_PREFIX)), 'Ordinary builds do not create preview storage keys');
  }
}

async function checkPreviewUpgrade() {
  const f = fixture(false), { initialReminders, cleanState, localDate, habitDayIndex, hasHabitDay } = f.load('src/lib/reminder-data.ts');
  const domainKey = PREVIEW_PREFIX + cacheKey('guest');
  const habitKey = `${PREVIEW_PREFIX}${CACHE_PREFIX}guest:reminders`, markerKey = `${PREVIEW_PREFIX}ottlog-domain-preview-seed-v2`;
  const today = localDate(new Date()), day = habitDayIndex(today);
  const oldDomains = createDomainPreviewRecords(FIXED_NOW);
  oldDomains.completedGoals = oldDomains.completedGoals.filter(goal => !goal.id.startsWith('preview-v2-') && goal.domainId !== 'photo' && goal.domainId !== 'growth');
  oldDomains.domains = oldDomains.domains.filter(domain => domain.id !== 'photo').map(domain => ({ ...domain, positiveRecords: domain.positiveRecords.slice(0, 5), negativeRecords: domain.negativeRecords.slice(0, 3) }));
  oldDomains.domains[0].positiveRecords.shift();
  const work = oldDomains.domains.find(domain => domain.id === 'work');
  work.name = '保留已编辑领域'; work.longTermGoal.content = '保留已编辑目标'; work.positiveRecords[0].content = '保留已编辑记录';
  const oldHabits = copy(initialReminders);
  oldHabits.items = oldHabits.items.filter(item => item.id !== 'exercise').map(item => item.id === 'focus-work' ? { ...item, note: '保留习惯编辑', priority: 'high' } : item);
  oldHabits.done = { [today]: ['pause'] };
  oldHabits.completionHistory = { 'focus-work': [[day - 1, day - 1]] };
  const initialStorage = () => new Map([
    ...productionStorage(),
    [domainKey, { data: copy(oldDomains), pending: false, revision: 12 }],
    [habitKey, { data: copy(oldHabits), pending: false, revision: 8 }],
    [`${PREVIEW_PREFIX}ottlog-domain-negative-preview-seed-v4`, 4],
    [`${PREVIEW_PREFIX}ottlog-domain-entertainment-preview-seed-v5`, 5],
  ]);
  const storage = initialStorage(), originalOrdinary = copy([...storage].filter(([key]) => !key.startsWith(PREVIEW_PREFIX)));
  const upgrade = fixture(true, storage); await upgrade.seed();
  assert.equal(storage.get(markerKey), 2);
  const expanded = storage.get(domainKey).data, habits = storage.get(habitKey).data;
  assert.ok(f.load('src/lib/domain-data.ts').isDomainState(expanded)); assert.ok(f.load('src/lib/reminder-data.ts').isReminderState(habits));
  assert.equal(storage.get(domainKey).revision, 13); assert.equal(storage.get(habitKey).revision, 9);
  assert.equal(expanded.domains.some(domain => domain.id === 'photo'), false, 'A deleted preview domain is never restored');
  assert.equal(expanded.completedGoals.some(goal => goal.id === 'preview-growth-completed'), false, 'Deleted old samples are never restored');
  for (const original of oldDomains.domains) {
    const current = expanded.domains.find(domain => domain.id === original.id);
    for (const field of ['name', 'iconId', 'longTermGoal', 'shortTermGoal', 'habits']) assert.deepEqual(current[field], original[field]);
    assert.deepEqual(current.positiveRecords.slice(0, original.positiveRecords.length), original.positiveRecords);
    assert.deepEqual(current.negativeRecords.slice(0, original.negativeRecords.length), original.negativeRecords);
    assert.equal(current.positiveRecords.length, original.positiveRecords.length + 2);
    assert.equal(current.negativeRecords.length, original.negativeRecords.length + 1);
  }
  assert.equal(expanded.domains[0].positiveRecords.some(record => record.id === 'preview-growth-positive-1'), false);
  for (const original of oldDomains.completedGoals) assert.deepEqual(expanded.completedGoals.find(goal => goal.id === original.id), original);
  assert.deepEqual(habits.items.slice(0, oldHabits.items.length), oldHabits.items);
  assert.equal(habits.items.length, oldHabits.items.length + 9, 'New habits skip the removed domain and append the separate comment preview once');
  assert.equal(habits.items.some(item => item.id === 'exercise'), false, 'Deleted original shared habits are not restored');
  assert.ok(habits.done[today].includes('pause'));
  assert.ok(hasHabitDay(cleanState(habits).completionHistory['focus-work'], day - 1), 'New calendar rows retain old archived completions even without a done row');
  assert.deepEqual(habits.completionHistory, oldHabits.completionHistory, 'The existing archive itself remains unchanged');
  assert.deepEqual(copy([...storage].filter(([key]) => !key.startsWith(PREVIEW_PREFIX))), originalOrdinary);
  assert.equal(upgrade.calls.length, 0);

  // Deletion and undo after the one-time upgrade must not be re-seeded on launch.
  expanded.completedGoals = expanded.completedGoals.filter(goal => goal.id !== 'preview-v2-work-longTerm-1');
  expanded.domains.find(domain => domain.id === 'work').positiveRecords.pop();
  const removedHabit = habits.items.find(item => item.id.startsWith('preview-v2-habit-work-'));
  habits.items = habits.items.filter(item => item.id !== removedHabit.id);
  habits.done[today] = habits.done[today].filter(id => !id.startsWith('preview-v2-habit-'));
  const beforeReopen = copy([...storage]), reopened = fixture(true, storage); await reopened.seed();
  assert.deepEqual(copy([...storage]), beforeReopen, 'The version marker preserves subsequent edit/delete/undo');
  assert.equal(reopened.writes.length, 0);

  for (const failingKey of [habitKey, markerKey]) {
    const retryStorage = initialStorage(), retry = fixture(true, retryStorage);
    retry.failWrite(failingKey); await retry.seed();
    assert.equal(retryStorage.has(markerKey), false); assert.equal(retry.navigation.length, 0);
    assert.ok(retry.stateChanges.some(message => message === 'mock storage full'));
    const writtenGoals = copy(retryStorage.get(domainKey).data.completedGoals);
    retry.failWrite(false); await retry.seed();
    assert.equal(retryStorage.get(markerKey), 2); assert.equal(retry.navigation.at(-1).url, '/pages/domains/index');
    assert.deepEqual(retryStorage.get(domainKey).data.completedGoals, writtenGoals, 'Retry preserves already-written goal IDs and timestamps');
    const retried = retryStorage.get(habitKey).data;
    assert.equal(retried.items.length, oldHabits.items.length + 9);
    for (const ids of Object.values(retried.done)) assert.equal(new Set(ids).size, ids.length, 'Partial-write retry never duplicates a check-in');
  }
  const invalidStorage = initialStorage(); invalidStorage.set(habitKey, { data: { invalid: true }, pending: false, revision: 3 });
  const invalid = fixture(true, invalidStorage), beforeInvalid = copy([...invalidStorage]); await invalid.seed();
  assert.deepEqual(copy([...invalidStorage]), beforeInvalid); assert.equal(invalid.writes.length, 0);
  const fullStorage = initialStorage(), full = copy(oldHabits);
  while (full.items.length < 80) full.items.push({ ...full.items[0], id: `full-${full.items.length}` });
  fullStorage.set(habitKey, { data: full, pending: false, revision: 3 });
  const capacity = fixture(true, fullStorage), beforeCapacity = copy([...fullStorage]); await capacity.seed();
  assert.deepEqual(copy([...fullStorage]), beforeCapacity, 'Both candidates are validated before either cache is written');
  assert.equal(capacity.navigation.length, 0); assert.equal(capacity.writes.length, 0);
}

async function checkHabitCommentUpgrade() {
  const f = fixture(false), { initialReminders, cleanState, localDate, habitDayIndex, hasHabitDay } = f.load('src/lib/reminder-data.ts');
  const domainKey = PREVIEW_PREFIX + cacheKey('guest'), habitKey = `${PREVIEW_PREFIX}${CACHE_PREFIX}guest:reminders`;
  const previousMarker = `${PREVIEW_PREFIX}ottlog-domain-preview-seed-v2`, marker = `${PREVIEW_PREFIX}ottlog-habit-comment-preview-seed-v3`;
  const domain = createDomainPreviewRecords(FIXED_NOW), habits = createReminderPreviewRecords(initialReminders, FIXED_NOW);
  domain.domains.find(item => item.id === 'work').positiveRecords.pop();
  habits.items = habits.items.filter(item => !item.id.startsWith('preview-v2-habit-work-'));
  habits.items[0].note = '保留预览习惯编辑';
  const today = localDate(new Date()), ordinal = habitDayIndex(today);
  habits.completionHistory = { exercise: [[ordinal - 45, ordinal - 45]] };
  const seedStorage = () => new Map([...productionStorage(),
    [domainKey, { data: copy(domain), pending: false, revision: 13 }],
    [habitKey, { data: copy(habits), pending: false, revision: 9 }], [previousMarker, 2],
    [`${PREVIEW_PREFIX}ottlog-domain-negative-preview-seed-v4`, 4],
    [`${PREVIEW_PREFIX}ottlog-domain-entertainment-preview-seed-v5`, 5],
  ]);
  const storage = seedStorage(), upgrade = fixture(true, storage), original = copy([...storage]);
  await upgrade.seed();
  assert.equal(storage.get(marker), 3);
  assert.deepEqual(storage.get(domainKey), original.find(([key]) => key === domainKey)[1], 'Comment upgrade never re-runs the old domain upgrade or restores deleted v2 records');
  const added = storage.get(habitKey).data, habitId = 'preview-v3-habit-morning-writing';
  assert.equal(storage.get(habitKey).revision, 10);
  assert.equal(added.items.length, habits.items.length + 1);
  assert.deepEqual(added.items.slice(0, habits.items.length), habits.items, 'All previously edited/deleted habits retain their metadata and identities');
  assert.deepEqual(added.completionHistory, habits.completionHistory);
  assert.ok(hasHabitDay(cleanState(added).completionHistory.exercise, ordinal - 45));
  assert.equal(added.items.some(item => item.id.startsWith('preview-v2-habit-work-')), false);
  assert.ok(added.reflections.filter(item => item.habitId === habitId).length >= 23);
  assert.equal(upgrade.writes.at(-1), marker, 'The v3 marker is persisted after the complete reminder candidate');
  for (const [key, value] of original) if (!key.startsWith(PREVIEW_PREFIX)) assert.deepEqual(storage.get(key), value);
  assert.equal(upgrade.calls.length, 0);
  added.items = added.items.filter(item => item.id !== habitId);
  const beforeReopen = copy([...storage]), reopened = fixture(true, storage); await reopened.seed();
  assert.deepEqual(copy([...storage]), beforeReopen, 'Deleting the v3 habit after seeding never restores its item or comments on a later launch');
  assert.equal(reopened.writes.length, 0);
  for (const failingKey of [habitKey, marker]) {
    const retryStorage = seedStorage(), retry = fixture(true, retryStorage);
    retry.failWrite(failingKey); await retry.seed();
    assert.equal(retryStorage.has(marker), false);
    assert.equal(retryStorage.get(previousMarker), 2);
    assert.equal(retry.navigation.length, 0);
    const persisted = copy(retryStorage.get(habitKey));
    retry.failWrite(false); await retry.seed();
    const result = retryStorage.get(habitKey);
    assert.equal(retryStorage.get(marker), 3);
    assert.equal(result.data.items.filter(item => item.id === habitId).length, 1);
    assert.equal(new Set(result.data.reflections.map(item => item.id)).size, result.data.reflections.length);
    if (failingKey === marker) assert.deepEqual(result, persisted, 'Marker-only failure retries the same persisted comment target without resetting dates or adding duplicates');
    assert.deepEqual(retryStorage.get(domainKey).data, domain);
  }
  const fullStorage = seedStorage(), full = fullStorage.get(habitKey);
  while (full.data.items.length < 80) full.data.items.push({ ...full.data.items[0], id: `comment-full-${full.data.items.length}` });
  const beforeFull = copy([...fullStorage]), capacity = fixture(true, fullStorage); await capacity.seed();
  assert.deepEqual(copy([...fullStorage]), beforeFull, 'Comment samples respect the original shared-habit capacity without modifying either candidate');
  assert.equal(capacity.writes.length, 0);
  assert.equal(capacity.navigation.length, 0);
}

function checkLaunchAndRoutes() {
  const ordinary = fixture(false), preview = fixture(true);
  const normalConfig = ordinary.load('src/app.config.ts').default, previewConfig = preview.load('src/app.config.ts').default;
  assert.equal(normalConfig.subPackages.some(pkg => pkg.root === 'pages/preview-data'), false, 'Production page configuration excludes the sample-seeding subpackage');
  assert.equal(previewConfig.subPackages.filter(pkg => pkg.root === 'pages/preview-data').length, 1);
  assert.deepEqual(copy(previewConfig.subPackages.filter(pkg => pkg.root !== 'pages/preview-data')), copy(normalConfig.subPackages));
  assert.deepEqual(copy(previewConfig.pages), copy(normalConfig.pages));
  for (const f of [ordinary, preview]) {
    const children = { test: true };
    assert.equal(f.load('src/app.tsx').default({ children }), children);
    f.launches.forEach(callback => callback());
  }
  assert.equal(ordinary.navigation.length, 0, 'Normal launch behavior remains unchanged');
  assert.deepEqual(preview.navigation, [{ type: 'page', url: '/pages/preview-data/index' }]);
}

(async () => {
  checkSamples();
  checkHabitCommentSamples();
  await checkPreviewIsolation();
  await checkPreviewUpgrade();
  await checkHabitCommentUpgrade();
  await checkNegativePreviewUpgrade();
  await checkEntertainmentPreviewUpgrade();
  await checkOrdinaryMode();
  checkLaunchAndRoutes();
  console.log('PASS isolated domain preview: varied completion and v3 comment samples, v5 empty entertainment continuation card, 23 prior-month comments, no future days, one-time additive upgrades, edit/delete/undo preservation, archived check-ins, partial-write/capacity retry, storage/draft/account isolation, ordinary API behavior and preview-only route');
})().catch(error => { console.error(error); process.exitCode = 1; });

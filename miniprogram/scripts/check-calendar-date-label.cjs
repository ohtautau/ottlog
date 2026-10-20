const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const loaded = new Map();
function load(file) {
  if (loaded.has(file)) return loaded.get(file);
  const exports = {}; loaded.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', code)(exports, name => load(path.resolve(path.dirname(file), name + '.ts')));
  return exports;
}
const { lunarDate, calendarDateLabel, holidayRegions } = load(path.join(__dirname, '../src/lib/calendar-date-label.ts'));
for (const [date, month, day, leap] of [
  ['1901-01-01', 11, 11, false], ['2025-01-29', 1, 1, false],
  ['2025-07-25', 6, 1, true], ['2025-08-23', 7, 1, false],
  ['2026-02-17', 1, 1, false], ['2033-12-22', 11, 1, true],
  ['2034-01-01', 11, 11, true],
]) {
  const actual = lunarDate(date);
  assert.deepEqual([actual.month, actual.day, actual.leap], [month, day, leap], date);
}
assert.equal(lunarDate('2025-07-25').label, '闰六月');
assert.equal(lunarDate('2025-07-26').label, '初二');
assert(lunarDate('2024-02-29'));
assert(lunarDate('2100-12-31'));
for (const invalid of ['2026-02-29', '2100-02-29', '2026-13-01', 'bad', '', '1900-12-31', '2101-01-01']) assert.equal(lunarDate(invalid), null, invalid);
const expected = {
  2025: [
    '01-01 01-28 01-29 04-04 05-01 05-31 10-01 10-06',
    '01-01 01-29 01-30 03-31 04-18 05-01 05-03 05-12 06-07 08-09 10-20 12-25',
    '01-01 04-18 04-21 05-05 05-26 08-25 12-25 12-26',
    '01-01 01-20 02-17 05-26 06-19 07-04 09-01 10-13 11-11 11-27 12-25',
  ],
  2026: [
    '01-01 02-16 02-17 04-05 05-01 06-19 09-25 10-01',
    '01-01 02-17 02-18 03-21 04-03 05-01 05-27 05-31 08-09 11-08 12-25',
    '01-01 04-03 04-06 05-04 05-25 08-31 12-25 12-26',
    '01-01 01-19 02-16 05-25 06-19 07-04 09-07 10-12 11-11 11-26 12-25',
  ],
  2027: [
    '01-01 02-05 02-06 04-05 05-01 06-09 09-15 10-01',
    '01-01 02-06 02-07 03-10 03-26 05-01 05-17 05-20 08-09 10-28 12-25',
    '01-01 03-26 03-29 05-03 05-31 08-30 12-25 12-26',
    '01-01 01-18 02-15 05-31 06-19 07-04 09-06 10-11 11-11 11-25 12-25',
  ],
};
for (const year of [2025, 2026, 2027]) {
  const actual = holidayRegions.map(() => []);
  for (let stamp = Date.UTC(year, 0, 1); stamp < Date.UTC(year + 1, 0, 1); stamp += 86400000) {
    const iso = new Date(stamp).toISOString().slice(0, 10), info = calendarDateLabel(iso);
    assert(info.covered); assert(info.label);
    for (const holiday of info.holidays) for (const region of holiday.regions) actual[holidayRegions.indexOf(region)].push(iso.slice(5));
  }
  actual.forEach((dates, i) => assert.deepEqual(dates, expected[year][i].split(' '), `${year} ${holidayRegions[i]} actual dates`));
}
for (const day of ['2026-07-03', '2026-06-01', '2026-08-10', '2026-11-09', '2026-12-28', '2026-10-02', '2026-10-03', '2026-10-04', '2026-05-02', '2026-02-19', '2026-02-14']) assert.equal(calendarDateLabel(day).holidays.length, 0, `${day}: actual festival only, no breaks, substitutes or ordinary festivals`);
assert.equal(calendarDateLabel('2026-01-01').holidays.length, 1);
assert.equal(calendarDateLabel('2026-01-01').holidays[0].regions.length, 4);
assert.equal(calendarDateLabel('2026-05-25').holidays.length, 2);
assert(calendarDateLabel('2026-05-25').description.includes('阵亡将士纪念日'));
assert.equal(calendarDateLabel('2028-01-01').covered, false);
assert.equal(calendarDateLabel('2028-01-01').label, lunarDate('2028-01-01').label);
const sample = calendarDateLabel('2026-04-05');
for (const zone of ['UTC', 'Asia/Singapore', 'America/Los_Angeles', 'Europe/London']) { process.env.TZ = zone; assert.deepEqual(calendarDateLabel('2026-04-05'), sample); }
console.log('PASS lunar leap/month/year boundaries, actual 2025–2027 holiday sets for four regions, no substitutes, deduplication, coverage fallback and timezone independence.');

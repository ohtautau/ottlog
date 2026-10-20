import { lunarYearData, qingmingDayData } from './calendar-lunar-data';

export const holidayYears = [2025, 2026, 2027];
export const holidayRegions = ['中国大陆', '新加坡', '英格兰／威尔士', '美国联邦'];
const months = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const digits = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function parseDay(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number), stamp = Date.UTC(year, month - 1, day);
  return new Date(stamp).toISOString().slice(0, 10) === iso ? { year, month, day, stamp } : null;
}
export function lunarDate(iso: string) {
  const date = parseDay(iso);
  if (!date || date.year < 1901 || date.year > 2100) return null;
  const code = parseInt(lunarYearData.slice((date.year - 1901) * 6, (date.year - 1900) * 6), 36);
  let month = code & 15, day = (code >>> 4 & 31) - 1 + (date.stamp - Date.UTC(date.year, 0, 1)) / 86400000, segment = 0;
  const leapSegment = code >>> 9 & 15;
  while (day >= 29 + (code >>> (13 + segment) & 1)) {
    day -= 29 + (code >>> (13 + segment) & 1); segment++;
    if (segment + 1 !== leapSegment) month = month % 12 + 1;
  }
  day++;
  const leap = segment + 1 === leapSegment, monthName = `${leap ? '闰' : ''}${months[month - 1]}月`;
  const dayName = day <= 10 ? `初${digits[day - 1]}` : day < 20 ? `十${digits[day - 11]}` : day === 20 ? '二十' : day < 30 ? `廿${digits[day - 21]}` : '三十';
  return { month, day, leap, label: day === 1 ? monthName : dayName, full: `${monthName}${dayName}` };
}
type Holiday = { name: string; short: string; regions: string[] };
// Official actual dates only; substitutes and adjusted breaks are excluded.
// Published religious dates are stored by year rather than predicted.
const sgDates = [
  ['01-29', '01-30', '03-31', '04-18', '05-12', '06-07', '10-20'],
  ['02-17', '02-18', '03-21', '04-03', '05-31', '05-27', '11-08'],
  ['02-06', '02-07', '03-10', '03-26', '05-20', '05-17', '10-28'],
];
const ukDates = [
  ['04-18', '04-21', '05-05', '05-26', '08-25'],
  ['04-03', '04-06', '05-04', '05-25', '08-31'],
  ['03-26', '03-29', '05-03', '05-31', '08-30'],
];
const usDates = [
  ['01-20', '02-17', '05-26', '09-01', '10-13', '11-27'],
  ['01-19', '02-16', '05-25', '09-07', '10-12', '11-26'],
  ['01-18', '02-15', '05-31', '09-06', '10-11', '11-25'],
];
export function calendarDateLabel(iso: string) {
  const date = parseDay(iso), lunar = lunarDate(iso), holidays: Holiday[] = [];
  const covered = !!date && holidayYears.includes(date.year);
  if (date && covered) {
    const md = iso.slice(5), index = date.year - 2025;
    const add = (region: number, name: string, short = name) => {
      const found = holidays.find(item => item.name === name);
      if (found) found.regions.push(holidayRegions[region]);
      else holidays.push({ name, short, regions: [holidayRegions[region]] });
    };
    const chinese = (name: string) => add(0, name);
    if (md === '01-01') chinese('元旦');
    if (md === '05-01') chinese('劳动节');
    if (md === '10-01') chinese('国庆节');
    if (md === `04-0${qingmingDayData[date.year - 1901]}`) chinese('清明节');
    if (lunar && !lunar.leap) {
      if (lunar.month === 1 && lunar.day === 1) chinese('春节');
      if (lunar.month === 5 && lunar.day === 5) chinese('端午节');
      if (lunar.month === 8 && lunar.day === 15) chinese('中秋节');
      const next = lunarDate(new Date(date.stamp + 86400000).toISOString().slice(0, 10));
      if (next?.month === 1 && next.day === 1 && !next.leap) chinese('除夕');
    }
    const sg = sgDates[index];
    if (md === '01-01') add(1, '元旦');
    if (md === sg[0] || md === sg[1]) add(1, '春节');
    ['开斋节', '耶稣受难日', '卫塞节', '哈芝节', '屠妖节'].forEach((name, i) => { if (md === sg[i + 2]) add(1, name, name === '耶稣受难日' ? '受难日' : name); });
    if (md === '05-01') add(1, '劳动节');
    if (md === '08-09') add(1, '新加坡国庆节', '国庆节');
    if (md === '12-25') add(1, '圣诞节');
    if (iso === '2025-05-03') add(1, '投票日');
    if (md === '01-01') add(2, '元旦');
    ['耶稣受难日', '复活节星期一', '五月初银行假日', '春季银行假日', '夏季银行假日'].forEach((name, i) => {
      if (md === ukDates[index][i]) add(2, name, ['受难日', '复活节周一', '五月初假日', '春季假日', '夏季假日'][i]);
    });
    if (md === '12-25') add(2, '圣诞节');
    if (md === '12-26') add(2, '节礼日');
    if (md === '01-01') add(3, '元旦');
    ['马丁·路德·金纪念日', '华盛顿诞辰', '阵亡将士纪念日', '劳动节', '哥伦布日', '感恩节'].forEach((name, i) => {
      if (md === usDates[index][i]) add(3, name, ['马丁纪念日', '华盛顿日', '阵亡纪念日', '劳动节', '哥伦布日', '感恩节'][i]);
    });
    if (md === '06-19') add(3, '六月节');
    if (md === '07-04') add(3, '独立日');
    if (md === '11-11') add(3, '退伍军人节');
    if (md === '12-25') add(3, '圣诞节');
  }
  const label = holidays.length ? `${holidays[0].short}${holidays.length > 1 ? '…' : ''}` : lunar?.label || '';
  const description = [lunar?.full, ...holidays.map(item => `${item.name}（${item.regions.join('、')}）`)].filter(Boolean).join('；');
  return { label, lunar, holidays, covered, description };
}

/** Calendar dates are local dates, not UTC timestamps. */
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return year >= 1000 && year <= 9999 && localDay(new Date(year, month - 1, day, 12)) === value;
}
export function monthDays(month: string): string[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const [year, index] = month.split("-").map(Number);
  if (year < 1000 || year > 9999) return [];
  return Array.from({ length: new Date(year, index, 0, 12).getDate() }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}
export function shiftMonth(month: string, offset: number): string {
  if (!monthDays(month).length) return localDay().slice(0, 7);
  const [year, index] = month.split("-").map(Number);
  const next = new Date(year, index - 1 + offset, 1, 12);
  if (next.getFullYear() < 1000 || next.getFullYear() > 9999) return month;
  return localDay(next).slice(0, 7);
}

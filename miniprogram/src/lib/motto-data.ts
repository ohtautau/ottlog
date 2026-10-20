export type PersonalMottos = { version: 1; mottos: string[] | null; rotationSeconds?: number };
export const initialPersonalMottos: PersonalMottos = { version: 1, mottos: null };
export const MAX_MOTTO_LENGTH = 120;
export const MOTTO_ROTATION_MS = 15000;
export const isMottoRotationSeconds = (seconds: unknown): seconds is number => typeof seconds === 'number' && Number.isInteger(seconds) && seconds > 0 && seconds <= 2147483;

export function isPersonalMottos(value: unknown): value is PersonalMottos {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as PersonalMottos;
  return state.version === 1 && (state.rotationSeconds === undefined || isMottoRotationSeconds(state.rotationSeconds)) && (state.mottos === null || Array.isArray(state.mottos)
    && state.mottos.every(text => typeof text === 'string' && !!text.trim() && text.length <= MAX_MOTTO_LENGTH));
}
export function mottoRotationMs(value: unknown): number {
  return isPersonalMottos(value) ? (value.rotationSeconds ?? 15) * 1000 : MOTTO_ROTATION_MS;
}
export function displayedMottos(value: unknown, defaults: string[]): string[] {
  return isPersonalMottos(value) && value.mottos !== null ? value.mottos : defaults;
}
export function writeMotto(value: PersonalMottos, defaults: string[], text: string, previous: string | null): PersonalMottos {
  const next = text.trim();
  if (!next || next.length > MAX_MOTTO_LENGTH) throw new Error(`请输入 1–${MAX_MOTTO_LENGTH} 个字符的格言`);
  const mottos = displayedMottos(value, defaults);
  const index = previous === null ? -1 : mottos.indexOf(previous);
  if (previous !== null && index < 0) throw new Error('这句格言已被修改，请关闭后重新打开');
  if (mottos.some((motto, i) => i !== index && motto === next)) throw new Error('这句格言已经存在');
  return { ...value, version: 1, mottos: previous === null ? [...mottos, next] : mottos.map((motto, i) => i === index ? next : motto) };
}
export function removeMotto(value: PersonalMottos, defaults: string[], text: string): PersonalMottos {
  const mottos = displayedMottos(value, defaults);
  if (!mottos.includes(text)) throw new Error('这句格言已被修改，请关闭后重新打开');
  return { ...value, version: 1, mottos: mottos.filter(motto => motto !== text) };
}

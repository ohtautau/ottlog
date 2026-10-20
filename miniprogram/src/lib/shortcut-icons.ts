import { getLibraryIcon, type LibraryIconId } from './icon-library';
import { homeFeatureCatalog } from './home-feature-catalog';

export type ShortcutIconKey = `library:${LibraryIconId}`;
export const libraryShortcutIcon = (id: LibraryIconId): ShortcutIconKey => `library:${id}`;

// Read-only aliases for previously saved preferences; no legacy artwork or picker.
const legacyShortcutIcons: Readonly<Record<string, LibraryIconId>> = {
  create: 'goal', pomodoro: 'focus', daily: 'plant', memos: 'notes', choose: 'explore', growth: 'goal', todos: 'calendar', posts: 'book',
  meals: 'food', categories: 'tidy', favorites: 'star', journal: 'write', statistics: 'measure', eat: 'cook', home: 'home', book: 'book',
  pen: 'write', calendar: 'calendar', alarm: 'focus', target: 'goal', flag: 'goal', folder: 'work', archive: 'tidy', tag: 'notes',
  bell: 'calendar', heart: 'connect', leaf: 'plant', sun: 'sun', moon: 'moon', cloud: 'relax', coffee: 'coffee', apple: 'fruit',
  dumbbell: 'exercise', bike: 'cycle', music: 'music', headphones: 'music', camera: 'camera', image: 'camera', video: 'film', briefcase: 'work',
  lightbulb: 'idea', compass: 'explore', map: 'travel', palette: 'write', code: 'code', chat: 'meeting', settings: 'work', bolt: 'exercise',
};
export function shortcutLibraryIcon(value: unknown): LibraryIconId | undefined {
  if (typeof value !== 'string') return undefined;
  if (value.startsWith('library:')) return getLibraryIcon(value.slice(8))?.id;
  return Object.prototype.hasOwnProperty.call(legacyShortcutIcons, value) ? legacyShortcutIcons[value] : undefined;
}
export function normalizeShortcutIcon(value: unknown): ShortcutIconKey | undefined {
  const id = shortcutLibraryIcon(value);
  return id ? libraryShortcutIcon(id) : undefined;
}
export const isShortcutIcon = (value: unknown): value is ShortcutIconKey => typeof value === 'string' && value.startsWith('library:') && !!shortcutLibraryIcon(value);

export const defaultShortcutIcon = (name: string): ShortcutIconKey => libraryShortcutIcon(homeFeatureCatalog.find(feature => feature.key === name)?.icon ?? 'goal');

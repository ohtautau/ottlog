/** Read-only suggestions; no business writes. */
export const focusActivities = [
  {title:'拉伸',iconId:'stretch'}, {title:'准备补剂',iconId:'supplement'},
  {title:'准备蛋白粉',iconId:'water'}, {title:'喝咖啡',iconId:'coffee'},
  {title:'整理房间',iconId:'tidy'}, {title:'洗衣服',iconId:'laundry'},
  {title:'看风景',iconId:'sun'}, {title:'听音乐',iconId:'music'},
  {title:'洗澡',iconId:'shower'}, {title:'散步',iconId:'walk'}, {title:'切水果',iconId:'fruit'},
] as const;

// Memory belongs to this UI session, survives route remounts, never enters tool data.
let seenOwner = '';
const seen = new Set<string>();
export function claimFocusSuggestions(owner:string,id:string) {
  if (seenOwner !== owner) { seenOwner=owner; seen.clear(); }
  if (!owner || !id || seen.has(id)) return false;
  seen.add(id); return true;
}
export function resetFocusSuggestionsOwner(owner:string) {
  if(seenOwner!==owner){seenOwner=owner;seen.clear();}
}

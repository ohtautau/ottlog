export type SavedFood = { id: string; name: string; english: string; dishes: string; location1: string; location2: string; location3: string; tags: string[] };
// Tau's supplied records are kept verbatim, including unresolved locations.
const rows = [
  ['田鸡粥','Frog Porridge','田鸡粥','新加坡','待确认','店名不明确，暂时无法定位','中餐、粥、田鸡、夜宵'],
  ['四指炸鸡','4FINGERS Crispy Chicken','炸鸡','新加坡','Dhoby Ghaut MRT','Plaza Singapura，68 Orchard Road','韩式炸鸡、快餐、连锁'],
  ['真佳韩食','JINJJA Chicken','韩式炸鸡','新加坡','Bugis MRT','Bugis+ #01-11，201 Victoria Street','韩式、炸鸡、快餐、连锁'],
  ['87泰国菜','87 Just Thai','打包饭、香兰炸鸡、冬阴功汤','新加坡','Maxwell MRT','26 Tanjong Pagar Road','泰国菜、炸鸡、汤、外带'],
  ['Bay Bay','Bay Bay','油焖鸡','待确认','待确认','暂时无法定位','中餐、鸡肉'],
  ['阿甘锅盔','A Gan Guo Kui','锅盔','新加坡','City Hall MRT','Funan B2-K05，107 North Bridge Road','中式小吃、锅盔、商场'],
  ['怡丰城食阁烤鱼','VivoCity Food Court Grilled Fish','烤鱼','新加坡','HarbourFront MRT','VivoCity Food Republic，Level 3，1 HarbourFront Walk','中餐、烤鱼、食阁'],
  ['香港传奇经典','Legendary Classics','港式料理','新加坡','Buona Vista MRT','Rochester Commons，10A Rochester Park','港式、茶餐厅、点心'],
  ['NB Snacks','NB Snacks','豆花','新加坡','Potong Pasir MRT','具体铺位待确认','甜品、豆花、小吃'],
  ['聚湘阁','Ju Xiang Ge','爆浆小豆腐','新加坡','Potong Pasir MRT','The Poiz Centre','湘菜、中餐、豆腐'],
  ['Maya餐厅','MaYa Asian Fusion Restaurant','日式及亚洲融合料理','马来西亚·新山','Taman Century','60 Jalan Harimau Tarum','日餐、亚洲融合、正餐'],
  ['Verrona Hills','Verrona Hills Bread & Pâtisserie','酥酥面包','马来西亚·新山','Tebrau','AEON Mall Tebrau City','面包、烘焙、商场'],
  ['安佳帕','Anjappar','印度菜','新加坡','Changi Airport MRT','Terminal 1 Public Area #03-20，80 Airport Boulevard','印度菜、Chettinad、机场、清真'],
  ['天使麻辣烫','Angel Malatang','麻辣烫','新加坡','Chinatown MRT','具体地址待确认','中餐、川味、麻辣烫'],
  ['湖南大碗菜','Hunan Da Wan Cai','湖南菜','待确认','待确认','名称过于通用，暂时无法定位','湘菜、中餐'],
  ['宽宽干锅','Kuan Kuan Dry Pot','干锅','新加坡','Bugis MRT','32 Liang Seah Street','川菜、干锅、夜宵'],
  ['G2甜品','G2 Dessert','榴莲黑糯米、手打冰','新加坡','Farrer Park MRT','City Square Mall B3-03，180 Kitchener Road','中式甜品、刨冰、榴莲'],
  ['99老树','99 Old Trees Durian','榴莲、榴莲甜品','新加坡','Outram Park MRT','1 Teo Hong Road','榴莲、甜品、水果'],
];
export const tauFoods: SavedFood[] = rows.map(([name, english, dishes, location1, location2, location3, tags], i) => ({ id: `tau-${i + 1}`, name, english, dishes, location1, location2, location3, tags: tags.split('、') }));
export type FoodRecord = { id: string; name: string; english: string; foodId: string; mode: 'compare' | 'questions'; at: string; early: boolean; answers: string[] };
export type DiningState = { version: 1; customFoods: SavedFood[]; history: FoodRecord[] };
export const initialDiningState: DiningState = { version: 1, customFoods: [], history: [] };
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' ? v as Record<string, unknown> : {};
const validText = (v: unknown, max = 200): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
export function normalizeDiningState(value: unknown): DiningState {
  const v = object(value), seen = new Set(tauFoods.map(f => f.id)), historyIds = new Set<string>();
  const customFoods = (Array.isArray(v.customFoods) ? v.customFoods : []).flatMap(item => {
    const f = object(item);
    if (!['id','name','english','dishes','location1','location2','location3'].every(key => validText(f[key])) || seen.has(f.id as string) || !Array.isArray(f.tags) || f.tags.length > 20 || !f.tags.every(t => validText(t, 30))) return [];
    seen.add(f.id as string); return [f as SavedFood];
  }).slice(0, 132);
  const history = (Array.isArray(v.history) ? v.history : []).flatMap(item => {
    const h = object(item);
    if (!['id','foodId','name','english','at'].every(key => validText(h[key])) || historyIds.has(h.id as string) || !Number.isFinite(Date.parse(h.at as string)) || !['compare','questions'].includes(h.mode as string)) return [];
    historyIds.add(h.id as string);
    return [{ ...h, early: h.early === true, answers: Array.isArray(h.answers) ? h.answers.filter(a => validText(a, 100)).slice(0, 20) : [] } as FoodRecord];
  }).slice(0, 500);
  return { version: 1, customFoods, history };
}
export type Comparison = { pair: [string, string]; remaining: string[]; rounds: number };
export function startComparison(foods: SavedFood[]): Comparison {
  return { pair: [foods[0].id, foods[1].id], remaining: foods.slice(2).map(f => f.id), rounds: 0 };
}
export function advanceComparison(current: Comparison, winner: string): Comparison | null {
  if (!current.pair.includes(winner)) throw new Error('Food is not in this pair');
  if (!current.remaining.length) return null;
  const pair: [string, string] = [...current.pair];
  pair[current.pair[0] === winner ? 1 : 0] = current.remaining[0];
  return { pair, remaining: current.remaining.slice(1), rounds: current.rounds + 1 };
}

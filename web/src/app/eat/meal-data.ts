export type Occasion = "breakfast" | "lunch" | "dinner" | "snack";
export type MealKind = "noodles" | "rice" | "bread" | "hotpot" | "light";

export type Meal = {
  id: string;
  name: string;
  place: string;
  note: string;
  price: number;
  minutes: number;
  spicy: boolean;
  vegetarian: boolean;
  occasions: Occasion[];
  kind: MealKind;
};

export type NutritionEntry = { id: string; date: string; name: string; carbs: number; protein: number; fat: number };
export type MealLibrary = { version: 1; meals: Meal[]; nutrition?: NutritionEntry[] };

export function isNutritionEntries(value: unknown): value is NutritionEntry[] {
  if (!Array.isArray(value) || value.length > 300) return false;
  const ids = new Set<string>();
  return value.every(entry => {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string" || !entry.id || entry.id.length > 100 || ids.has(entry.id)) return false;
    ids.add(entry.id);
    return typeof entry.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && !Number.isNaN(Date.parse(entry.date)) && new Date(entry.date).toISOString().slice(0, 10) === entry.date
      && typeof entry.name === "string" && entry.name.trim().length > 0 && entry.name.length <= 80
      && [entry.carbs, entry.protein, entry.fat].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 2000);
  });
}
export type MealPreferences = {
  occasion: Occasion | "any";
  flavor: "any" | "mild" | "spicy";
  budget: number;
  minutes: number;
  vegetarian: boolean;
};

export const occasionLabels: Record<Occasion, string> = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐" };
export const kindLabels: Record<MealKind, string> = { noodles: "面与粉", rice: "饭与小炒", bread: "饼与面包", hotpot: "热锅热汤", light: "清爽小食" };
export const defaultPreferences: MealPreferences = { occasion: "any", flavor: "any", budget: 0, minutes: 0, vegetarian: false };

function meal(id: string, name: string, kind: MealKind, price: number, minutes: number, spicy: boolean, vegetarian: boolean, occasions: Occasion[], note: string): Meal {
  return { id, name, kind, price, minutes, spicy, vegetarian, occasions, note, place: "示例餐单 · 可替换为常去的店" };
}

export const initialMealLibrary: MealLibrary = {
  version: 1,
  meals: [
    meal("example-01", "番茄鸡蛋面", "noodles", 16, 15, false, true, ["lunch", "dinner"], "一碗热汤面，番茄和鸡蛋就很够味。"),
    meal("example-02", "牛肉拉面", "noodles", 22, 15, false, false, ["lunch", "dinner"], "清汤、面条、牛肉，简单又踏实。"),
    meal("example-03", "重庆小面", "noodles", 15, 10, true, true, ["breakfast", "lunch", "dinner"], "花椒的香气，配一口有劲道的面。"),
    meal("example-04", "螺蛳粉", "noodles", 22, 20, true, false, ["lunch", "dinner"], "酸笋、腐竹和米粉，酸辣热乎。"),
    meal("example-05", "鸡丝凉面", "noodles", 20, 15, false, false, ["lunch", "dinner"], "想吃得清爽一点，可以从一碗凉面开始。"),
    meal("example-06", "越南河粉", "noodles", 32, 20, false, false, ["lunch", "dinner"], "热汤、香草和顺滑的河粉。"),
    meal("example-07", "照烧鸡腿饭", "rice", 26, 20, false, false, ["lunch", "dinner"], "鸡腿配米饭，今天的满足感很具体。"),
    meal("example-08", "麻婆豆腐饭", "rice", 19, 20, true, false, ["lunch", "dinner"], "麻辣豆腐和米饭，记得留一点汤汁拌饭。"),
    meal("example-09", "咖喱牛肉饭", "rice", 30, 25, false, false, ["lunch", "dinner"], "咖喱的浓香，适合认真吃完一整盘。"),
    meal("example-10", "扬州炒饭", "rice", 18, 15, false, false, ["lunch", "dinner"], "粒粒分明，吃一盘熟悉的味道。"),
    meal("example-11", "番茄炒蛋盖饭", "rice", 16, 15, false, true, ["lunch", "dinner"], "酸甜的番茄汁，最适合拌进米饭里。"),
    meal("example-12", "辣椒炒肉饭", "rice", 25, 20, true, false, ["lunch", "dinner"], "锅气和辣椒香，把这一餐吃得热热闹闹。"),
    meal("example-13", "菌菇蔬菜饭", "rice", 23, 20, false, true, ["lunch", "dinner"], "菌菇、时蔬、米饭，清淡也可以有滋有味。"),
    meal("example-14", "韩式拌饭", "rice", 28, 20, true, false, ["lunch", "dinner"], "把喜欢的配菜拌在一起，大口吃饭。"),
    meal("example-15", "煎饼果子", "bread", 12, 10, false, true, ["breakfast", "snack"], "薄脆、鸡蛋、热煎饼，拿在手里就能出发。"),
    meal("example-16", "鸡蛋三明治", "bread", 18, 10, false, true, ["breakfast", "lunch", "snack"], "面包夹上鸡蛋，给忙碌留一点从容。"),
    meal("example-17", "鲜肉包与豆浆", "bread", 12, 5, false, false, ["breakfast", "snack"], "一笼热包子，加一杯温豆浆。"),
    meal("example-18", "香辣鸡腿汉堡", "bread", 28, 15, true, false, ["lunch", "dinner", "snack"], "酥脆的外皮，一口咬下的快乐。"),
    meal("example-19", "番茄小火锅", "hotpot", 45, 35, false, false, ["lunch", "dinner"], "让喜欢的食材在番茄汤里慢慢咕嘟。"),
    meal("example-20", "麻辣烫", "hotpot", 28, 20, true, false, ["lunch", "dinner"], "挑几样喜欢的配菜，凑成一碗热辣。"),
    meal("example-21", "菌菇豆腐锅", "hotpot", 35, 30, false, true, ["lunch", "dinner"], "豆腐和菌菇在热汤里相遇。"),
    meal("example-22", "砂锅粥", "hotpot", 32, 30, false, false, ["breakfast", "dinner"], "细细熬开的米粒，暖暖的一锅。"),
    meal("example-23", "鸡肉沙拉", "light", 30, 15, false, false, ["lunch", "dinner"], "新鲜蔬菜、鸡肉和一点喜欢的酱汁。"),
    meal("example-24", "酸奶水果碗", "light", 20, 10, false, true, ["breakfast", "snack"], "水果铺在酸奶上，颜色和心情都轻快一点。"),
    meal("example-25", "红薯与玉米", "light", 10, 5, false, true, ["breakfast", "snack"], "热乎乎的粗粮，朴素又香甜。"),
    meal("example-26", "蔬菜水饺", "light", 20, 20, false, true, ["lunch", "dinner"], "热水饺蘸一点醋，慢慢吃完这一餐。"),
  ],
};

const occasions = new Set(Object.keys(occasionLabels));
const kinds = new Set(Object.keys(kindLabels));

export function isMealLibrary(value: unknown): value is MealLibrary {
  if (value && typeof value === "object" && "nutrition" in value && value.nutrition !== undefined && !isNutritionEntries(value.nutrition)) return false;
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 || !("meals" in value) || !Array.isArray(value.meals) || value.meals.length > 150) return false;
  const ids = new Set<string>();
  return value.meals.every((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const m = item as Record<string, unknown>;
    if (typeof m.id !== "string" || !m.id || m.id.length > 100 || ids.has(m.id)) return false;
    ids.add(m.id);
    return typeof m.name === "string" && m.name.trim().length > 0 && m.name.length <= 60
      && typeof m.place === "string" && m.place.length <= 100 && typeof m.note === "string" && m.note.length <= 200
      && typeof m.price === "number" && Number.isFinite(m.price) && m.price >= 0 && m.price <= 10000
      && typeof m.minutes === "number" && Number.isInteger(m.minutes) && m.minutes >= 1 && m.minutes <= 1440
      && typeof m.spicy === "boolean" && typeof m.vegetarian === "boolean"
      && typeof m.kind === "string" && kinds.has(m.kind)
      && Array.isArray(m.occasions) && m.occasions.length > 0 && m.occasions.length <= 4 && new Set(m.occasions).size === m.occasions.length && m.occasions.every((o) => typeof o === "string" && occasions.has(o));
  });
}

export function matchMeals(meals: Meal[], preferences: MealPreferences): Meal[] {
  return meals.filter((m) => (preferences.occasion === "any" || m.occasions.includes(preferences.occasion))
    && (preferences.flavor === "any" || m.spicy === (preferences.flavor === "spicy"))
    && (preferences.budget === 0 || m.price <= preferences.budget)
    && (preferences.minutes === 0 || m.minutes <= preferences.minutes)
    && (!preferences.vegetarian || m.vegetarian));
}

export function chooseMealId(matches: Meal[], seen: string[], random = Math.random()): string | null {
  if (!matches.length) return null;
  const unvisited = matches.filter((m) => !seen.includes(m.id));
  const candidates = unvisited.length ? unvisited : matches.filter((m) => m.id !== seen.at(-1));
  const pool = candidates.length ? candidates : matches;
  return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random * pool.length)))].id;
}

import type { Meal } from "./meal-data";

export type MealAnswer = -1 | 0 | 1;
export type MealPair = readonly [Meal, Meal];
export const mealQuestions: { title: string; symbol: string; test: (meal: Meal) => boolean }[] = [
  { title: "这一顿，想吃点辣的吗？", symbol: "♨", test: m => m.spicy },
  { title: "想把预算控制在 20 元以内吗？", symbol: "¥", test: m => m.price <= 20 },
  { title: "希望 15 分钟内就能开饭吗？", symbol: "◷", test: m => m.minutes <= 15 },
  { title: "今天想吃面或粉吗？", symbol: "≋", test: m => m.kind === "noodles" },
  { title: "这一餐想吃无肉的菜吗？", symbol: "❋", test: m => m.vegetarian },
  { title: "想吃米饭或小炒吗？", symbol: "▧", test: m => m.kind === "rice" },
  { title: "想来一锅热汤、火锅或粥吗？", symbol: "♨", test: m => m.kind === "hotpot" },
  { title: "正在找适合早餐或加餐的食物吗？", symbol: "☀", test: m => m.occasions.includes("breakfast") || m.occasions.includes("snack") },
];

export function pairMeals(meals: Meal[]): MealPair[] {
  if (meals.length < 2) return [];
  return Array.from({ length: Math.ceil(meals.length / 2) }, (_, i) => [meals[i * 2], meals[(i * 2 + 1) % meals.length]] as const);
}

export function rankMeals(meals: Meal[], answers: MealAnswer[], mode: "swipe" | "quiz", pairs: MealPair[]) {
  return meals.map((meal, index) => ({ meal, index, score: answers.reduce<number>((score, answer, i) => {
    if (answer === 0) return score;
    if (mode === "quiz") return score + (mealQuestions[i]?.test(meal) ? 1 : -1) * answer;
    const pair = pairs[i];
    if (!pair) return score;
    const selected = pair[answer === -1 ? 0 : 1];
    const other = pair[answer === -1 ? 1 : 0];
    // An explicit choice always outweighs a shared food type.
    if (meal.id === selected.id) return score + 5;
    if (meal.id === other.id) return score - 3;
    return score + (meal.kind === selected.kind ? .5 : 0) - (meal.kind === other.kind ? .5 : 0);
  }, 0) })).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3);
}

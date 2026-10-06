import type { Metadata } from "next";
import FoodExperience from "./food-experience";

export const metadata: Metadata = {
  title: "吃什么",
  description: "比较 Tau 的餐单，或回答几个问题，找到今天想吃的一餐。",
};

export default function EatPage() {
  return <FoodExperience />;
}

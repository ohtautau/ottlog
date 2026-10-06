import type { Metadata } from "next";
import { getCategories } from "@/lib/posts";
import styles from "./city.module.css";
import CityExperience from "./city-experience";

export const metadata: Metadata = { title: "分类城市", description: "在方块城市中探索不同主题的文章。" };
export default async function City() {
  const categories = (await getCategories()).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  return <section className={styles.city} data-city="immersive">
    {categories.length ? <CityExperience categories={categories} /> : <p className="empty-state">发布文章后，对应分类会成为城市中的建筑。</p>}
  </section>;
}

import type { Metadata } from "next";
import DailyExperience from "./daily-experience";

export const metadata: Metadata = { title: "习惯养成", description: "翻一翻，想起一件现在可以做的小事。" };
export default function DailyPage() { return <DailyExperience />; }

import type { Metadata } from "next";
import { Suspense } from "react";
import PomodoroExperience from "./pomodoro-experience";

export const metadata: Metadata = { title: "番茄钟", description: "给眼前的一件事留一点时间。专注计时、关联待办与日历统计。" };
export default function PomodoroPage() { return <Suspense fallback={<p role="status">正在准备专注空间…</p>}><PomodoroExperience /></Suspense>; }

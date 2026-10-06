import type { Metadata } from "next";
import Admin from "./admin";
export const metadata: Metadata = { title: "文章管理", robots: { index: false, follow: false } };
export default function AdminPage() { return <Admin />; }

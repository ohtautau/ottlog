"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appTools, toolGroupName } from "@/lib/app-tools";

export default function ToolsMenu() {
  const pathname = usePathname();
  return <details className="tools-menu" key={pathname}>
    <summary>{toolGroupName} <span aria-hidden="true">＋</span></summary>
    <div>{appTools.map(tool => <Link key={tool.href} href={tool.href} aria-current={pathname === tool.href ? "page" : undefined}>{tool.title}</Link>)}</div>
  </details>;
}

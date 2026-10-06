"use client";

import { usePathname } from "next/navigation";
import { appTools, toolGroupName } from "@/lib/app-tools";
import styles from "./tool-navigation.module.css";

export default function ToolNavigation() {
  const pathname = usePathname();
  const current = appTools.find(tool => tool.href === pathname);
  return <p className={styles.breadcrumb}>{toolGroupName}<span aria-hidden="true">/</span><strong>{current?.title}</strong></p>;
}

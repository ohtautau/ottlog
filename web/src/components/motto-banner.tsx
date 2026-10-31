"use client";
import { createElement, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

// The journal mounts the same account-bound banner as Today. Business data,
// guest visibility and rotation remain owned by the mini-program component.
export default function MottoBanner() {
  const router = useRouter();
  useEffect(() => {
    const navigate = (event: Event) => {
      const detail = (event as CustomEvent<{ url: string }>).detail;
      if (typeof detail?.url === "string" && /^\/(?!\/)/.test(detail.url)) router.push(detail.url);
    };
    window.addEventListener("ottlog:navigate", navigate);
    return () => window.removeEventListener("ottlog:navigate", navigate);
  }, [router]);
  return <div className="account-motto-widget">
    <link rel="stylesheet" href="/tool-app/app.css" precedence="tool-app" />
    {createElement("ottlog-tools", { "data-page": "motto-widget" })}
    <Script id="ottlog-tools-runtime" src="/tool-app/app.js" type="module" strategy="afterInteractive" />
  </div>;
}

"use client";

import { useEffect, useRef, useState } from "react";

export default function AadsAd() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    // Inject the iframe via DOM to avoid React hydration issues
    const existing = containerRef.current.querySelector("iframe");
    if (existing) return;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("data-aa", "2435147");
    iframe.src = "https://acceptable.a-ads.com/2435147?size=Adaptive";
    iframe.style.width = "100%";
    iframe.style.minHeight = "90px";
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    iframe.allow = "autoplay";
    containerRef.current.appendChild(iframe);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div ref={containerRef} style={{ width: "100%", margin: "auto", position: "relative", zIndex: 99998 }} />
  );
}

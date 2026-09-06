"use client";

import { useEffect, useRef, useState } from "react";

// The fixed bottom tab bar's real height varies (safe-area insets, a header
// that wraps onto two lines on narrow screens), so the returned height is
// measured against its live position rather than a guessed constant, letting
// a chat-style pane fill the screen exactly instead of scrolling with the page.
export function useFillViewport<T extends HTMLElement>() {
  const sectionRef = useRef<T>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const main = document.getElementById("workspace-main");
    const previousPadding = main?.style.paddingBottom ?? "";
    if (main) main.style.paddingBottom = "0px";
    function measure() {
      const section = sectionRef.current;
      if (!section) return;
      const top = section.getBoundingClientRect().top;
      const tabs = document.querySelector<HTMLElement>(".group-tabs");
      const bottom = tabs ? tabs.getBoundingClientRect().top : window.innerHeight;
      setHeight(Math.max(320, bottom - top));
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      if (main) main.style.paddingBottom = previousPadding;
    };
  }, []);

  return { sectionRef, height };
}

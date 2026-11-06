"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 280);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 size-11 rounded-full border border-border bg-surface shadow-[var(--shadow-soft)] md:right-8 md:bottom-8"
      aria-label="페이지 맨 위로"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp />
    </Button>
  );
}

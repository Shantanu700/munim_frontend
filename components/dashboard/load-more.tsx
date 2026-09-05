"use client";

import * as React from "react";

export function LoadMore({ busy, onLoadMore }: { busy: boolean; onLoadMore: () => void }) {
  const ref = React.useCallback(
    (el: HTMLDivElement | null) => {
      if (!el || busy) return;
      const io = new IntersectionObserver(([e]) => e.isIntersecting && onLoadMore(), {
        rootMargin: "300px",
      });
      io.observe(el);
      return () => io.disconnect();
    },
    [busy, onLoadMore]
  );

  return (
    <div ref={ref} className="flex h-11 items-center justify-center text-meta text-muted-ink">
      {busy ? "Loading…" : null}
    </div>
  );
}

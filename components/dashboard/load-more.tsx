"use client";

import * as React from "react";

/**
 * The foot of a paginated list: reaching it fetches the next page, so there is no button to
 * press. Shared by the catalogue and the orders table — both page on scroll, and the trick
 * below is too easy to get subtly wrong twice.
 *
 * The observer is built in a ref callback (React 19 runs its returned cleanup on detach) and
 * that callback is rebuilt whenever `busy` flips — which is the whole trick. An observer only
 * fires on a *change* of intersection, so if a fetched page were shorter than the scroller the
 * sentinel would still be on screen and never notify again. Disconnecting while busy and
 * re-observing after means a fresh initial notification each time, and the list keeps filling
 * until it overflows.
 *
 * That also means the caller's `busy` has to actually reach the DOM as two renders. A data
 * source resolving in the same tick as the click batches the flip away, the callback keeps
 * its identity, and the chain stops after one page.
 */
export function LoadMore({ busy, onLoadMore }: { busy: boolean; onLoadMore: () => void }) {
  const ref = React.useCallback(
    (el: HTMLDivElement | null) => {
      if (!el || busy) return;
      // Fetch a screenful early, so the rows are there before the merchant reaches the gap.
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

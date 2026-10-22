"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** A spring-like settle (slight overshoot) for the slide between links. */
const SPRING = "cubic-bezier(0.34, 1.4, 0.64, 1)";
const MOVE_MS = 480;

/**
 * A "tubelight" for a row of links: the current page's link sits on a soft
 * pill of the primary colour, with a short lamp along the nav's top edge that
 * glows down onto it. When the page changes, the pill and its lamp spring
 * across to the next link. Hidden when no visible link is current.
 *
 * Adapted from the tubelight navbar for text links, without framer-motion's
 * layout animations (they need its larger bundle): the caller renders the
 * links (with `data-tubelight` and aria-current) inside `children`.
 */
export function Tubelight({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inert?: boolean }) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const lightRef = React.useRef<HTMLDivElement>(null);
  const lit = React.useRef<HTMLElement | null>(null);

  const place = React.useCallback((animate: boolean) => {
    const row = rowRef.current!;
    const light = lightRef.current!;
    const active = row.querySelector<HTMLElement>('[data-tubelight][aria-current="page"]');
    // A link hidden at this screen width has no width.
    const target = active && active.offsetWidth ? active : null;
    const from = lit.current;
    lit.current = target;
    const motion = animate && !matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!target) {
      light.style.opacity = "0";
      return;
    }
    // Layout offsets ignore the nav's slide-in transforms.
    let left = 0;
    for (let node: HTMLElement | null = target; node && node !== row; node = node.offsetParent as HTMLElement | null) left += node.offsetLeft;
    const glide = motion && from && from !== target;
    light.style.transition = glide ? `left ${MOVE_MS}ms ${SPRING}, width ${MOVE_MS}ms ${SPRING}` : "none";
    light.style.left = `${left}px`;
    light.style.width = `${target.offsetWidth}px`;
    light.style.opacity = "1";
    if (motion && !from) light.animate([{ opacity: 0, transform: "scale(0.85)" }, { opacity: 1, transform: "scale(1)" }], { duration: 360, easing: SPRING });
  }, []);

  React.useLayoutEffect(() => {
    place(true);
  }, [children, place]);

  React.useEffect(() => {
    const observer = new ResizeObserver(() => place(false));
    observer.observe(rowRef.current!);
    return () => observer.disconnect();
  }, [place]);

  return (
    <div ref={rowRef} className={cn("relative", className)} {...props}>
      {children}
      <div
        ref={lightRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1.5 z-0"
        style={{ left: 0, width: 0, opacity: 0 }}
      >
        {/* The pill under the current link. */}
        <div className="absolute inset-0 rounded-full bg-primary/10" />
        {/* The lamp on the nav's top edge, and its glow falling onto the link. */}
        <div className="absolute -top-1.5 left-1/2 h-1 w-8 -translate-x-1/2 rounded-b-full bg-primary">
          <div className="absolute -top-2 -left-2 h-6 w-12 rounded-full bg-primary/20 blur-md" />
          <div className="absolute -top-1 h-6 w-8 rounded-full bg-primary/20 blur-md" />
          <div className="absolute top-0 left-2 h-4 w-4 rounded-full bg-primary/20 blur-sm" />
        </div>
      </div>
    </div>
  );
}

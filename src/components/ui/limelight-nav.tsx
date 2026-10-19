"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const CLOSE_MS = 180;
const MOVE_MS = 300;
const OPEN_MS = 380;

/**
 * A "limelight" for a row of links: a bar along the top edge, as wide as the
 * current page's link, that shines a soft cone of light down onto it. When the
 * page changes the light closes, slides to the next link and opens again.
 * Hidden when no visible link is current.
 *
 * Adapted from the LimelightNav component for text links: the caller renders
 * the links (with `data-limelight` and aria-current) inside `children`.
 */
export function Limelight({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inert?: boolean }) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const lightRef = React.useRef<HTMLDivElement>(null);
  const coneRef = React.useRef<HTMLDivElement>(null);
  const lit = React.useRef<HTMLElement | null>(null);
  const timer = React.useRef(0);

  const place = React.useCallback((animate: boolean) => {
    const row = rowRef.current!;
    const light = lightRef.current!;
    const cone = coneRef.current!;
    const active = row.querySelector<HTMLElement>('[data-limelight][aria-current="page"]');
    // A link hidden at this screen width has no width.
    const target = active && active.offsetWidth ? active : null;
    const moveTo = () => {
      if (!target) return;
      // Layout offsets ignore the nav's slide-in transforms.
      let left = 0;
      for (let el: HTMLElement | null = target; el && el !== row; el = el.offsetParent as HTMLElement | null) left += el.offsetLeft;
      light.style.left = `${left}px`;
      light.style.width = `${target.offsetWidth}px`;
    };
    const motion = animate && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = lit.current;
    lit.current = target;
    clearTimeout(timer.current);

    const open = () => {
      light.style.opacity = "1";
      if (!motion) return;
      light.animate([{ transform: "scaleX(0.2)" }, { transform: "scaleX(1)" }], { duration: OPEN_MS, easing: EASE });
      cone.animate([{ transform: "scaleY(0)", opacity: 0 }, { transform: "scaleY(1)", opacity: 1 }], { duration: OPEN_MS, easing: EASE });
    };
    const close = (then: () => void) => {
      if (!motion) return then();
      light.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0.2)" }], { duration: CLOSE_MS, easing: "ease-in", fill: "forwards" });
      cone.animate([{ transform: "scaleY(1)", opacity: 1 }, { transform: "scaleY(0)", opacity: 0 }], { duration: CLOSE_MS, easing: "ease-in", fill: "forwards" });
      timer.current = window.setTimeout(then, CLOSE_MS);
    };
    const clearAnimations = () => [light, cone].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));

    if (!target) {
      // Nothing current: the light switches off where it is.
      close(() => {
        light.style.opacity = "0";
        clearAnimations();
      });
    } else if (!from) {
      // First light, or back on after being off: it opens in place.
      light.style.transition = "none";
      moveTo();
      open();
    } else if (from !== target) {
      // Close, slide over while closed, then open on the new link.
      close(() => {
        light.style.transition = motion ? `left ${MOVE_MS}ms ${EASE}, width ${MOVE_MS}ms ${EASE}` : "none";
        moveTo();
        timer.current = window.setTimeout(
          () => {
            clearAnimations();
            open();
          },
          motion ? MOVE_MS : 0,
        );
      });
    } else {
      // Same link, the layout changed (font loaded, window resized).
      light.style.transition = "none";
      moveTo();
    }
  }, []);

  React.useLayoutEffect(() => {
    place(true);
  }, [children, place]);

  React.useEffect(() => {
    const observer = new ResizeObserver(() => place(false));
    observer.observe(rowRef.current!);
    return () => {
      observer.disconnect();
      clearTimeout(timer.current);
    };
  }, [place]);

  return (
    <div ref={rowRef} className={cn("relative", className)} {...props}>
      {children}
      <div
        ref={lightRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 z-0 h-[4px] rounded-full bg-primary shadow-[0_40px_15px_var(--color-primary)]"
        style={{ left: 0, width: 0, opacity: 0 }}
      >
        <div
          ref={coneRef}
          className="absolute top-[4px] left-[-12%] h-11 w-[124%] origin-top bg-linear-to-b from-primary/30 to-transparent [clip-path:polygon(0_100%,12%_0,88%_0,100%_100%)]"
        />
      </div>
    </div>
  );
}

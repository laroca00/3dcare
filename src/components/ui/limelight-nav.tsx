"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Smooth start and stop, used for the slide between links. */
const GLIDE = "cubic-bezier(0.65, 0, 0.35, 1)";
const OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const MOVE_MS = 420;
/** The cone dims as the light leaves, stays dim while it slides, and pours down again on arrival. */
const SWITCH_MS = 640;
/** Keeps the light clear of the nav's rounded ends. */
const INSET = 4;

/**
 * A "limelight" for a row of links: a short bar along the top edge that
 * shines a soft cone of light down over the current page's link. When the
 * page changes the bar glides to the next link while the cone dims and pours
 * down again on arrival. Hidden when no visible link is current.
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
  const barRef = React.useRef<HTMLDivElement>(null);
  const coneRef = React.useRef<HTMLDivElement>(null);
  const lit = React.useRef<HTMLElement | null>(null);

  const place = React.useCallback((animate: boolean) => {
    const row = rowRef.current!;
    const light = lightRef.current!;
    const bar = barRef.current!;
    const cone = coneRef.current!;
    const active = row.querySelector<HTMLElement>('[data-limelight][aria-current="page"]');
    // A link hidden at this screen width has no width.
    const target = active && active.offsetWidth ? active : null;
    const from = lit.current;
    lit.current = target;
    const motion = animate && !matchMedia("(prefers-reduced-motion: reduce)").matches;

    const moveTo = (el: HTMLElement, glide: boolean) => {
      // Layout offsets ignore the nav's slide-in transforms.
      let left = 0;
      for (let node: HTMLElement | null = el; node && node !== row; node = node.offsetParent as HTMLElement | null) left += node.offsetLeft;
      light.style.transition = glide ? `left ${MOVE_MS}ms ${GLIDE}, width ${MOVE_MS}ms ${GLIDE}` : "none";
      light.style.left = `${left + INSET}px`;
      light.style.width = `${el.offsetWidth - INSET * 2}px`;
    };

    if (!target) {
      if (!from) return;
      // Nothing current: the light fades where it is.
      light.style.opacity = "0";
      if (motion) light.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: "ease-out" });
      return;
    }

    if (!from) {
      // First light: the bar draws out from its centre, then the cone pours down.
      moveTo(target, false);
      light.style.opacity = "1";
      if (!motion) return;
      bar.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 420, easing: OUT });
      cone.animate([{ transform: "scaleY(0)", opacity: 0 }, { transform: "scaleY(1)", opacity: 1 }], {
        duration: 480,
        delay: 160,
        easing: OUT,
        fill: "backwards",
      });
      return;
    }

    // The same link only moves when the layout changes (font loaded, window resized).
    moveTo(target, motion && from !== target);
    if (from === target || !motion) return;

    cone.getAnimations().forEach((a) => a.cancel());
    cone.animate(
      [
        { transform: "scaleY(1)", opacity: 1, offset: 0 },
        { transform: "scaleY(0.35)", opacity: 0, offset: 0.22 },
        { transform: "scaleY(0.35)", opacity: 0, offset: 0.62 },
        { transform: "scaleY(1)", opacity: 1, offset: 1 },
      ],
      { duration: SWITCH_MS, easing: "ease-in-out" },
    );
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
        className="pointer-events-none absolute inset-y-0 z-0"
        style={{ left: 0, width: 0, opacity: 0 }}
      >
        <div
          ref={coneRef}
          className="absolute inset-x-0 top-0 bottom-1 origin-top bg-linear-to-b from-primary/30 via-primary/10 to-transparent [clip-path:polygon(18%_0,82%_0,100%_100%,0_100%)]"
        />
        <div
          ref={barRef}
          className="absolute top-0 left-[18%] h-[3px] w-[64%] rounded-b-full bg-primary shadow-[0_0_8px_var(--color-primary)]"
        />
      </div>
    </div>
  );
}

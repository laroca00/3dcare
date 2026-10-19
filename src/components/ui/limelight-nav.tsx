"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A "limelight" for a row of links: a bar along the top edge that shines a
 * soft cone of light down onto the current page's link and slides to the
 * next one when the page changes. Hidden when no visible link is current.
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
  const [ready, setReady] = React.useState(false);

  React.useLayoutEffect(() => {
    const row = rowRef.current!;
    const light = lightRef.current!;
    function place() {
      const active = row.querySelector<HTMLElement>('[data-limelight][aria-current="page"]');
      // A link hidden at this screen width has no box.
      const box = active?.getBoundingClientRect();
      const shown = Boolean(box && box.width);
      light.style.opacity = shown ? "1" : "0";
      if (!box || !shown) return;
      const rowBox = row.getBoundingClientRect();
      light.style.left = `${box.left - rowBox.left + box.width / 2 - light.offsetWidth / 2}px`;
    }
    place();
    // Link widths change when the web font arrives or the screen is resized.
    const observer = new ResizeObserver(place);
    observer.observe(row);
    const id = setTimeout(() => setReady(true), 50);
    return () => {
      observer.disconnect();
      clearTimeout(id);
    };
  }, [children]);

  return (
    <div ref={rowRef} className={cn("relative", className)} {...props}>
      {children}
      <div
        ref={lightRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0 z-0 h-[4px] w-11 rounded-full bg-primary opacity-0 shadow-[0_40px_15px_var(--color-primary)]",
          ready && "transition-[left,opacity] duration-400 ease-in-out motion-reduce:transition-none",
        )}
        style={{ left: "-999px" }}
      >
        <div className="absolute top-[4px] left-[-30%] h-11 w-[160%] bg-linear-to-b from-primary/30 to-transparent [clip-path:polygon(5%_100%,25%_0,75%_0,95%_100%)]" />
      </div>
    </div>
  );
}

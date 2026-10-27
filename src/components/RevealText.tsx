"use client";

import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";

/**
 * Text that is split into its rendered lines, so each line can rise from
 * behind its own mask as its scene starts (see .story__line in globals.css).
 * The lines are measured after layout and again when the width changes or a
 * font finishes loading; until then, and without script, it is plain text.
 */
export function RevealText({ as: Tag, text, first = 0 }: { as: "h2" | "p"; text: string; first?: number }) {
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);
  const [lines, setLines] = useState<string[] | null>(null);

  useLayoutEffect(() => {
    const el = ref.current!;
    let width = -1;
    function measure() {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      // Lay the words out in an invisible copy of the element and group them by row.
      const copy = el.cloneNode(false) as HTMLElement;
      copy.removeAttribute("id");
      copy.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:${width}px;`;
      const words = text.split(/\s+/).filter(Boolean);
      for (const word of words) {
        const span = document.createElement("span");
        span.textContent = word + " ";
        copy.appendChild(span);
      }
      el.parentElement!.appendChild(copy);
      const rows: string[][] = [];
      let top: number | null = null;
      for (const span of copy.children as HTMLCollectionOf<HTMLElement>) {
        if (span.offsetTop !== top) {
          rows.push([]);
          top = span.offsetTop;
        }
        rows[rows.length - 1].push(span.textContent!.trim());
      }
      copy.remove();
      setLines(rows.map((row) => row.join(" ")));
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    const refit = () => {
      width = -1;
      measure();
    };
    document.fonts.addEventListener("loadingdone", refit);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", refit);
    };
  }, [text]);

  return (
    <Tag ref={ref}>
      {lines
        ? lines.map((line, i) => (
            <span key={i} className="story__line" style={{ "--i": first + i } as CSSProperties}>
              <span>{line}</span>
            </span>
          ))
        : text}
    </Tag>
  );
}

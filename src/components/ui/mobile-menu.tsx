"use client";

import type * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "./sheet";

type Item = { href: string; label: string; active: boolean };

/**
 * The navigation's links in a side sheet for narrow screens. Loaded only when
 * the visitor first opens it.
 */
export default function MobileMenu({
  open,
  onOpenChange,
  onCloseAutoFocus,
  items,
  language,
  linkClass,
  menuLabel,
  closeLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
  items: Item[];
  language: React.ReactNode;
  linkClass: string;
  menuLabel: string;
  closeLabel: string;
}) {
  const close = () => onOpenChange(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeLabel={closeLabel}
        aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        className="flex flex-col gap-6"
      >
        <SheetTitle className="m-0 text-left">3D Care</SheetTitle>
        <nav aria-label={menuLabel}>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  onClick={close}
                  className={cn(linkClass, "px-4 py-3 text-base")}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li onClick={close}>{language}</li>
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

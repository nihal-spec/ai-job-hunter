"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

export type NavLink = { href: string; label: string };

export function AppHeader({ links, actions }: { links: NavLink[]; actions?: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-line bg-surface">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:px-12">
        <Link href="/dashboard" className="font-extrabold text-ink" onClick={() => setOpen(false)}>
          AI Job Hunter
        </Link>

        <nav className="hidden items-center gap-5 sm:flex" aria-label="Product navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm",
                pathname?.startsWith(link.href) ? "font-bold text-accent" : "text-muted hover:text-ink",
              )}
            >
              {link.label}
            </Link>
          ))}
          {actions}
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line sm:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden="true" className="text-xl leading-none">
            {open ? "✕" : "☰"}
          </span>
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Product navigation"
          className="flex flex-col gap-1 border-t border-line px-4 py-3 sm:hidden"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-2 py-2.5 text-sm",
                pathname?.startsWith(link.href)
                  ? "font-bold text-accent"
                  : "text-muted hover:bg-paper hover:text-ink",
              )}
            >
              {link.label}
            </Link>
          ))}
          {actions}
        </nav>
      ) : null}
    </header>
  );
}

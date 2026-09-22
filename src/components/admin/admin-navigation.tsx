"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

export type AdminNavigationItem = { href: string; label: string };

function NavigationLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span>{label}</span>
      <span className="w-3 shrink-0 text-xs font-normal" role="status">
        {pending ? (
          <>
            <span aria-hidden="true">…</span>
            <span className="sr-only">Memuat {label}</span>
          </>
        ) : null}
      </span>
    </>
  );
}

export function AdminNavigation({ items }: { items: AdminNavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi ruang kerja BEM"
      className="flex gap-1 overflow-x-auto py-4 lg:grid lg:py-5"
    >
      {items.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`rounded-control flex min-h-11 shrink-0 items-center justify-between gap-3 px-3 py-2.5 text-sm font-bold transition-colors duration-150 motion-reduce:transition-none ${
              active
                ? "bg-brand-soft text-brand"
                : "text-ink hover:bg-brand-soft hover:text-brand"
            }`}
            href={href}
            key={href}
            prefetch={false}
          >
            <NavigationLabel label={label} />
          </Link>
        );
      })}
    </nav>
  );
}

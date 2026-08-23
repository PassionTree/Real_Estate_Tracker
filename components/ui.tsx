import Link from "next/link";
import type { ReactNode } from "react";
import { formatAsOf } from "@/lib/policy";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 md:px-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  관심: "bg-accent-soft text-accent",
  임장예정: "bg-warning-soft text-warning",
  임장완료: "bg-warning-soft text-warning",
  보류: "bg-background text-muted",
  제외: "bg-background text-muted line-through",
  계약: "bg-accent text-white",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-background text-muted"
      }`}
    >
      {status}
    </span>
  );
}

/**
 * 정책에서 온 수치 옆에 기준일과 출처를 항상 붙인다.
 * 규제와 세율은 자주 바뀌므로, 언제 기준인지 모르는 숫자는 위험하다.
 */
export function PolicyBadge({ asOf, source }: { asOf: string; source: string }) {
  return (
    <a
      href={source}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs text-muted hover:text-foreground"
    >
      {formatAsOf(asOf)} · 출처 ↗
    </a>
  );
}

export function ExternalLinkList({
  links,
}: {
  links: { label: string; url: string; description: string }[];
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {links.map((link) => (
        <li key={link.label + link.url}>
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-line bg-surface px-3 py-2.5 hover:border-accent"
          >
            <span className="text-sm font-medium">{link.label} ↗</span>
            <span className="mt-0.5 block text-xs text-muted">{link.description}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-4 ${className}`}>{children}</div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="tabular mt-0.5 text-lg font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:border-accent"
    >
      {children}
    </Link>
  );
}

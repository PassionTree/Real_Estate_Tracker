import Link from "next/link";
import { currentUser } from "@/lib/actions";

const NAV = [
  { href: "/", label: "대시보드", icon: "◎" },
  { href: "/listings", label: "매물", icon: "▤" },
  { href: "/discover", label: "단지 찾기", icon: "◈" },
  { href: "/compare", label: "비교", icon: "⇄" },
  { href: "/finance", label: "대출·자금", icon: "₩" },
  { href: "/policy", label: "정책", icon: "§" },
  { href: "/market", label: "시세", icon: "↗" },
  { href: "/settings", label: "설정", icon: "⚙" },
];

// 현장에서 폰으로 쓰는 화면이라 하단 탭에는 자주 쓰는 것만 남긴다
const MOBILE_NAV = NAV.filter((item) =>
  ["/", "/listings", "/compare", "/settings"].includes(item.href),
);

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();

  return (
    <div className="flex-1 flex flex-col md:flex-row">
      <aside className="hidden md:flex w-52 shrink-0 flex-col border-r border-line bg-surface p-4">
        <Link href="/" className="px-2 text-lg font-semibold tracking-tight">
          부동산 트래커
        </Link>

        <nav className="mt-6 flex-1 space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-accent-soft"
            >
              <span className="w-4 text-center text-muted">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <form action="/api/auth/logout" method="post" className="mt-4 border-t border-line pt-3">
          <p className="px-2.5 text-xs text-muted">{user ?? "게스트"}</p>
          <button type="submit" className="mt-1 px-2.5 text-xs text-muted hover:text-foreground">
            로그아웃
          </button>
        </form>
      </aside>

      <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-20 flex border-t border-line bg-surface md:hidden">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs"
          >
            <span className="text-base text-muted">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

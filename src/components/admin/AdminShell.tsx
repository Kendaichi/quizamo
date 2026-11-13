"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ListChecks, LogOut, Radio, Users, type LucideIcon } from "lucide-react";
import { AppLogo } from "@/components/common/AppLogo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { GlassButton } from "@/components/glass/GlassButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: LucideIcon; soon?: boolean };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/questionnaires", label: "Questionnaires", icon: ListChecks },
  // Later slices — shown but not built yet.
  { href: "/hosts", label: "Hosts", icon: Radio, soon: true },
  { href: "/participants", label: "Participants", icon: Users, soon: true },
];

function NavItems({ pathname, layout }: { pathname: string; layout: "side" | "top" }) {
  return (
    <>
      {NAV.map(({ href, label, icon: Icon, soon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        const base = cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition",
          layout === "top" && "shrink-0 whitespace-nowrap",
          active ? "bg-primary/12 text-primary" : "text-muted hover:bg-foreground/5 hover:text-foreground",
          soon && "pointer-events-none opacity-50",
        );
        const inner = (
          <>
            <Icon className="size-5 shrink-0" />
            {label}
            {soon && <span className="ml-auto text-[0.65rem] font-bold uppercase tracking-wide">soon</span>}
          </>
        );
        return soon ? (
          <span key={href} className={base} aria-disabled>
            {inner}
          </span>
        ) : (
          <Link key={href} href={href} className={base} aria-current={active ? "page" : undefined}>
            {inner}
          </Link>
        );
      })}
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, ready, signOut } = useAuth();

  useEffect(() => {
    if (ready && !user) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/dashboard" aria-label="Dashboard" className="rounded-xl">
            <AppLogo size={26} />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <GlassButton
              variant="glass"
              size="sm"
              onClick={() => {
                signOut();
                router.push("/");
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </GlassButton>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 pb-10 sm:px-6">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="glass sticky top-20 flex flex-col gap-1 p-2">
            <NavItems pathname={pathname} layout="side" />
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <nav className="glass mb-5 flex gap-1 overflow-x-auto p-1.5 md:hidden">
            <NavItems pathname={pathname} layout="top" />
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}

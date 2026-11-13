import Link from "next/link";
import { AppLogo } from "@/components/common/AppLogo";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" aria-label="Home" className="rounded-xl">
            <AppLogo size={26} />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <span>© 2026 Quizamo</span>
          <span>Live quizzes. Spill the answers.</span>
        </div>
      </footer>
    </div>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutGrid, Users, PlusCircle, BellRing } from "lucide-react";

const tabs = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/new-sale", label: "New Sale", icon: PlusCircle },
  { to: "/reminders", label: "Reminders", icon: BellRing },
] as const;

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-10 size-64 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute right-[-40px] top-40 size-72 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute bottom-24 left-10 size-64 rounded-full bg-sky-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[480px] flex-col">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0">
            {subtitle ? (
              <p className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-ink/45">
                {subtitle}
              </p>
            ) : null}
            <h1 className="font-display text-2xl font-semibold leading-tight text-balance">{title}</h1>
          </div>
          {action}
        </header>

        <main className="flex-1 pb-6">{children}</main>

        <nav className="sticky bottom-0 z-10 border-t border-black/5 bg-white/70 backdrop-blur-xl">
          <div className="grid grid-cols-4">
            {tabs.map((tab) => {
              const active = pathname.startsWith(tab.to);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`flex flex-col items-center gap-1 py-3 ${active ? "text-brand" : "text-ink/40"}`}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                  <span className={`text-[11px] ${active ? "font-semibold" : "font-medium"}`}>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/60 p-4 ring-1 ring-black/5 backdrop-blur-md ${className}`}>
      {children}
    </div>
  );
}

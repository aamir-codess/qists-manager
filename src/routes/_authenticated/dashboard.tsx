import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell, GlassCard } from "@/components/AppShell";
import { useInstallments, usePayments } from "@/lib/queries";
import { formatRs, formatShortDate, statusOf, todayISO } from "@/lib/installments";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — InstallmentTracker" },
      { name: "description", content: "Outstanding amount, dues this week, overdue customers and monthly collection." },
      { property: "og:title", content: "Dashboard — InstallmentTracker" },
      { property: "og:description", content: "Outstanding, dues this week, overdue customers and monthly collection." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: installments = [], isLoading } = useInstallments();
  const { data: payments = [] } = usePayments();

  const today = todayISO();
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndISO = weekEnd.toISOString().slice(0, 10);

  const unpaid = installments.filter((i) => statusOf(i) !== "paid");
  const outstanding = unpaid.reduce((sum, i) => sum + (Number(i.amount) - Number(i.paid_amount)), 0);
  const dueThisWeek = unpaid.filter((i) => i.due_date >= today && i.due_date <= weekEndISO);
  const overdue = unpaid.filter((i) => i.due_date < today);

  const monthPrefix = today.slice(0, 7);
  const collected = payments
    .filter((p) => p.paid_on.startsWith(monthPrefix))
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const collectedCount = payments.filter((p) => p.paid_on.startsWith(monthPrefix)).length;
  const activeSales = new Set(unpaid.map((i) => i.sale_id)).size;
  const overdueCustomers = new Set(overdue.map((i) => i.sales?.customers?.id)).size;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell
      title="Installment Register"
      subtitle="Your shop"
      action={
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white/70 text-ink/60 ring-1 ring-black/5"
        >
          <LogOut className="size-5" />
        </button>
      }
    >
      <section className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <GlassCard>
            <p className="text-xs font-medium text-ink/55">Total Outstanding</p>
            <p className="mt-1 font-display text-2xl font-semibold leading-none">{formatRs(outstanding)}</p>
            <p className="mt-2 text-[11px] font-medium text-ink/45">{activeSales} active plans</p>
          </GlassCard>
          <GlassCard>
            <p className="text-xs font-medium text-ink/55">Collected This Month</p>
            <p className="mt-1 font-display text-2xl font-semibold leading-none">{formatRs(collected)}</p>
            <p className="mt-2 text-[11px] font-medium text-brand">{collectedCount} payments recorded</p>
          </GlassCard>
          <GlassCard>
            <p className="text-xs font-medium text-ink/55">Due This Week</p>
            <p className="mt-1 font-display text-2xl font-semibold leading-none">
              {formatRs(dueThisWeek.reduce((s, i) => s + Number(i.amount) - Number(i.paid_amount), 0))}
            </p>
            <p className="mt-2 text-[11px] font-medium text-ink/45">{dueThisWeek.length} installments</p>
          </GlassCard>
          <GlassCard>
            <p className="text-xs font-medium text-ink/55">Overdue</p>
            <p className="mt-1 font-display text-2xl font-semibold leading-none text-danger">
              {formatRs(overdue.reduce((s, i) => s + Number(i.amount) - Number(i.paid_amount), 0))}
            </p>
            <p className="mt-2 text-[11px] font-medium text-danger">{overdueCustomers} customers behind</p>
          </GlassCard>
        </div>
      </section>

      <section className="px-4 pt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Overdue Customers</h2>
          <span className="rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-danger">
            {overdue.length}
          </span>
        </div>
        {isLoading ? (
          <p className="text-sm text-ink/50">Loading…</p>
        ) : overdue.length === 0 ? (
          <GlassCard>
            <p className="text-sm text-ink/55">No overdue installments. Everything is on track.</p>
          </GlassCard>
        ) : (
          <div className="space-y-2.5">
            {overdue.map((inst) => (
              <Link
                key={inst.id}
                to="/customers/$customerId"
                params={{ customerId: inst.sales?.customers?.id ?? "" }}
                className="block rounded-2xl bg-white/60 p-3.5 ring-1 ring-danger/20 backdrop-blur-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{inst.sales?.customers?.name}</p>
                  <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                    Overdue
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-ink/50">
                  {inst.sales?.product_name} · {inst.sales?.months} months
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="font-display text-lg font-semibold text-danger">
                    {formatRs(Number(inst.amount) - Number(inst.paid_amount))}
                  </p>
                  <p className="text-xs font-medium text-ink/45">Due {formatShortDate(inst.due_date)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="px-4 pt-5">
        <h2 className="mb-2 font-display text-base font-semibold">Due This Week</h2>
        {dueThisWeek.length === 0 ? (
          <GlassCard>
            <p className="text-sm text-ink/55">Nothing due in the next 7 days.</p>
          </GlassCard>
        ) : (
          <div className="space-y-2.5">
            {dueThisWeek.map((inst) => (
              <Link
                key={inst.id}
                to="/customers/$customerId"
                params={{ customerId: inst.sales?.customers?.id ?? "" }}
                className="block rounded-2xl bg-white/60 p-3.5 ring-1 ring-black/5 backdrop-blur-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{inst.sales?.customers?.name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink/50">
                      Due {formatShortDate(inst.due_date)} · month {inst.installment_no}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-lg font-semibold">{formatRs(Number(inst.amount))}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

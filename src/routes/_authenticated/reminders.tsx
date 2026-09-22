import { createFileRoute } from "@tanstack/react-router";
import { AppShell, GlassCard } from "@/components/AppShell";
import { useInstallments } from "@/lib/queries";
import { formatRs, formatDate, statusOf, todayISO, whatsappLink } from "@/lib/installments";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders — InstallmentTracker" },
      { name: "description", content: "Send WhatsApp reminders to customers with due or overdue installments." },
      { property: "og:title", content: "Reminders — InstallmentTracker" },
      { property: "og:description", content: "Send WhatsApp reminders for due and overdue installments." },
    ],
  }),
  component: Reminders,
});

function Reminders() {
  const { data: installments = [], isLoading } = useInstallments();
  const today = todayISO();
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndISO = weekEnd.toISOString().slice(0, 10);

  const rows = installments
    .filter((i) => statusOf(i) !== "paid" && i.due_date <= weekEndISO)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  return (
    <AppShell title="Reminders" subtitle="Due & overdue">
      <section className="space-y-2.5 px-4 pt-4">
        {isLoading ? (
          <p className="text-sm text-ink/50">Loading…</p>
        ) : rows.length === 0 ? (
          <GlassCard>
            <p className="text-sm text-ink/55">No reminders to send right now.</p>
          </GlassCard>
        ) : (
          rows.map((inst) => {
            const overdue = inst.due_date < today;
            const customer = inst.sales?.customers;
            const amount = Number(inst.amount) - Number(inst.paid_amount);
            return (
              <div
                key={inst.id}
                className={`rounded-2xl bg-white/60 p-3.5 backdrop-blur-md ring-1 ${overdue ? "ring-danger/20" : "ring-black/5"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{customer?.name}</p>
                    <p className={`mt-0.5 truncate text-xs ${overdue ? "text-danger" : "text-ink/50"}`}>
                      {overdue ? "Overdue since" : "Due"} {formatDate(inst.due_date)} · month {inst.installment_no}
                    </p>
                  </div>
                  <p className={`shrink-0 font-display text-lg font-semibold ${overdue ? "text-danger" : ""}`}>
                    {formatRs(amount)}
                  </p>
                </div>
                <a
                  href={whatsappLink(customer?.phone ?? "", customer?.name ?? "", amount, inst.due_date)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-brand-foreground ring-1 ring-brand/40"
                >
                  <MessageCircle className="size-4" /> Send WhatsApp Reminder
                </a>
              </div>
            );
          })
        )}
      </section>
    </AppShell>
  );
}

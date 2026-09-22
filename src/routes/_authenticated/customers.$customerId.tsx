import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, GlassCard } from "@/components/AppShell";
import { useCustomerDetail } from "@/lib/queries";
import { formatDate, formatRs, statusOf, todayISO, whatsappLink } from "@/lib/installments";
import type { Installment } from "@/lib/installments";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer — InstallmentTracker" },
      { name: "description", content: "Sale details, installment schedule and payment recording for a customer." },
      { property: "og:title", content: "Customer — InstallmentTracker" },
      { property: "og:description", content: "Sale details, installment schedule and payment recording." },
    ],
  }),
  component: CustomerDetail,
});

const statusStyles = {
  paid: "bg-brand/10 text-brand",
  overdue: "bg-danger/10 text-danger",
  upcoming: "bg-ink/5 text-ink/55",
} as const;

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const { data, isLoading } = useCustomerDetail(customerId);
  const queryClient = useQueryClient();
  const [payFor, setPayFor] = useState<Installment | null>(null);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  const customer = data?.customer;
  const sales = data?.sales ?? [];
  const installments = data?.installments ?? [];

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payFor) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const ownerId = userData.user!.id;

      // Targets: this installment, then later unpaid ones from the same sale.
      const targets = installments
        .filter(
          (i) =>
            i.sale_id === payFor.sale_id &&
            (i.id === payFor.id || i.installment_no > payFor.installment_no) &&
            Number(i.paid_amount) < Number(i.amount) - 0.5,
        )
        .sort((a, b) => a.installment_no - b.installment_no);

      let remaining = value;
      const applied: { inst: Installment; amount: number; newPaid: number }[] = [];
      for (const inst of targets) {
        if (remaining <= 0.5) break;
        const due = Math.max(0, Number(inst.amount) - Number(inst.paid_amount));
        const part = Math.min(due, remaining);
        remaining -= part;
        applied.push({ inst, amount: part, newPaid: Number(inst.paid_amount) + part });
      }

      if (applied.length === 0) {
        toast.error("All installments for this sale are already paid");
        setBusy(false);
        return;
      }

      const { error } = await supabase.from("payments").insert(
        applied.map((a) => ({
          owner_id: ownerId,
          installment_id: a.inst.id,
          sale_id: a.inst.sale_id,
          amount: a.amount,
          paid_on: paidOn,
        })),
      );
      if (error) throw error;

      for (const a of applied) {
        const { error: updateError } = await supabase
          .from("installments")
          .update({
            paid_amount: a.newPaid,
            paid_at: a.newPaid >= Number(a.inst.amount) - 0.5 ? paidOn : null,
          })
          .eq("id", a.inst.id);
        if (updateError) throw updateError;
      }

      await queryClient.invalidateQueries();
      const spread = applied.length > 1 ? ` across ${applied.length} installments` : "";
      toast.success(`Payment recorded${spread}`);
      if (remaining > 0.5) {
        toast.info(`${formatRs(remaining)} was not applied — no unpaid installments left`);
      }
      setPayFor(null);
      setAmount("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record the payment");
    } finally {
      setBusy(false);
    }
  }



  if (isLoading) {
    return (
      <AppShell title="Customer">
        <p className="px-4 pt-4 text-sm text-ink/50">Loading…</p>
      </AppShell>
    );
  }

  if (!customer) {
    return (
      <AppShell title="Customer">
        <div className="px-4 pt-4">
          <GlassCard>
            <p className="text-sm text-ink/55">This customer was not found.</p>
          </GlassCard>
        </div>
      </AppShell>
    );
  }

  const outstanding = installments.reduce(
    (sum, i) => sum + Math.max(0, Number(i.amount) - Number(i.paid_amount)),
    0,
  );

  return (
    <AppShell
      title={customer.name}
      subtitle={customer.phone}
      action={
        <Link
          to="/customers"
          aria-label="Back to customers"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white/70 text-ink/60 ring-1 ring-black/5"
        >
          <ChevronLeft className="size-5" />
        </Link>
      }
    >
      <section className="px-4 pt-4">
        <GlassCard>
          <p className="text-xs font-medium text-ink/55">Outstanding balance</p>
          <p className="mt-1 font-display text-3xl font-semibold leading-none">{formatRs(outstanding)}</p>
          <div className="mt-3 space-y-1 text-xs text-ink/55">
            {customer.address ? <p>{customer.address}</p> : null}
            {customer.cnic ? <p>ID: {customer.cnic}</p> : null}
          </div>
        </GlassCard>
      </section>

      {sales.length === 0 ? (
        <section className="px-4 pt-4">
          <GlassCard>
            <p className="text-sm text-ink/55">No sale yet for this customer.</p>
            <Link
              to="/new-sale"
              className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-brand text-sm font-semibold text-brand-foreground ring-1 ring-brand/40"
            >
              Create a sale
            </Link>
          </GlassCard>
        </section>
      ) : null}

      {sales.map((sale) => {
        const rows = installments
          .filter((i) => i.sale_id === sale.id)
          .sort((a, b) => a.installment_no - b.installment_no);
        return (
          <section key={sale.id} className="px-4 pt-5">
            <GlassCard>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-base font-semibold">{sale.product_name}</h2>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {sale.months} months · started {formatDate(sale.start_date)}
                  </p>
                </div>
                <p className="shrink-0 font-display text-lg font-semibold">{formatRs(Number(sale.monthly_amount))}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink/55">
                <p>Total price: {formatRs(Number(sale.total_price))}</p>
                <p>Down payment: {formatRs(Number(sale.down_payment))}</p>
              </div>
            </GlassCard>

            <div className="mt-2.5 space-y-2">
              {rows.map((inst) => {
                const status = statusOf(inst);
                const remaining = Math.max(0, Number(inst.amount) - Number(inst.paid_amount));
                return (
                  <div
                    key={inst.id}
                    className={`rounded-2xl bg-white/60 p-3.5 backdrop-blur-md ring-1 ${status === "overdue" ? "ring-danger/20" : "ring-black/5"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Month {inst.installment_no}</p>
                        <p className="mt-0.5 truncate text-xs text-ink/50">Due {formatDate(inst.due_date)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`font-display text-lg font-semibold ${status === "overdue" ? "text-danger" : ""}`}
                        >
                          {formatRs(Number(inst.amount))}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusStyles[status]}`}
                        >
                          {status === "upcoming" ? "Unpaid" : status}
                        </span>
                      </div>
                    </div>

                    {status !== "paid" ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPayFor(inst);
                            setAmount(String(remaining));
                            setPaidOn(todayISO());
                          }}
                          className="h-12 rounded-xl bg-brand text-sm font-semibold text-brand-foreground ring-1 ring-brand/40"
                        >
                          Record Payment
                        </button>
                        <a
                          href={whatsappLink(customer.phone, customer.name, remaining, inst.due_date)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-ink/70 ring-1 ring-black/10"
                        >
                          <MessageCircle className="size-4" /> Remind
                        </a>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs font-medium text-brand">
                        Paid{inst.paid_at ? ` on ${formatDate(inst.paid_at)}` : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {payFor ? (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 px-4 pb-6">
          <form
            onSubmit={recordPayment}
            className="w-full max-w-[480px] rounded-2xl bg-white p-4 ring-1 ring-black/10"
          >
            <h2 className="font-display text-base font-semibold">Record payment · month {payFor.installment_no}</h2>
            <label className="mt-3 block">
              <span className="text-xs font-medium text-ink/55">Amount (Rs.)</span>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-border bg-white px-3 text-base outline-none focus:border-brand"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-xs font-medium text-ink/55">Payment date</span>
              <input
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-border bg-white px-3 text-base outline-none focus:border-brand"
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPayFor(null)}
                className="h-12 rounded-xl bg-white text-sm font-semibold text-ink/60 ring-1 ring-black/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-12 rounded-xl bg-brand text-sm font-semibold text-brand-foreground ring-1 ring-brand/40 disabled:opacity-60"
              >
                Save payment
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}

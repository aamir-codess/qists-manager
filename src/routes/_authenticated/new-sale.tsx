import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, GlassCard } from "@/components/AppShell";
import { useCustomers } from "@/lib/queries";
import { buildSchedule, formatRs, monthlyAmount, todayISO } from "@/lib/installments";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/new-sale")({
  head: () => ({
    meta: [
      { title: "New Sale — InstallmentTracker" },
      { name: "description", content: "Create an installment plan with an auto-calculated monthly payment schedule." },
      { property: "og:title", content: "New Sale — InstallmentTracker" },
      { property: "og:description", content: "Create an installment plan with an auto-calculated schedule." },
    ],
  }),
  component: NewSale,
});

function NewSale() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: customers = [] } = useCustomers();
  const [customerId, setCustomerId] = useState("");
  const [product, setProduct] = useState("");
  const [total, setTotal] = useState("");
  const [down, setDown] = useState("");
  const [months, setMonths] = useState("6");
  const [startDate, setStartDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  const totalNum = Number(total) || 0;
  const downNum = Number(down) || 0;
  const monthsNum = Number(months) || 0;
  const monthly = monthlyAmount(totalNum, downNum, monthsNum);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return toast.error("Pick a customer first");
    if (monthsNum < 1 || monthsNum > 120) return toast.error("Months must be between 1 and 120");
    if (totalNum <= 0) return toast.error("Enter the total price");
    if (downNum > totalNum) return toast.error("Down payment cannot exceed total price");
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const ownerId = userData.user!.id;
      const { data: sale, error } = await supabase
        .from("sales")
        .insert({
          owner_id: ownerId,
          customer_id: customerId,
          product_name: product.trim().slice(0, 120),
          total_price: totalNum,
          down_payment: downNum,
          months: monthsNum,
          start_date: startDate,
          monthly_amount: monthly,
        })
        .select()
        .single();
      if (error) throw error;

      const rows = buildSchedule({
        totalPrice: totalNum,
        downPayment: downNum,
        months: monthsNum,
        startDate,
      }).map((r) => ({ ...r, owner_id: ownerId, sale_id: sale.id }));
      const { error: instError } = await supabase.from("installments").insert(rows);
      if (instError) throw instError;

      await queryClient.invalidateQueries();
      toast.success("Sale created with payment schedule");
      navigate({ to: "/customers/$customerId", params: { customerId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the sale");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="New Sale" subtitle="Installment plan">
      <form onSubmit={submit} className="space-y-3 px-4 pt-4">
        <GlassCard>
          <label className="block">
            <span className="text-xs font-medium text-ink/55">Customer</span>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-border bg-white px-3 text-base outline-none focus:border-brand"
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.phone}
                </option>
              ))}
            </select>
          </label>
          <Field label="Product name" value={product} onChange={setProduct} required />
          <Field label="Total price (Rs.)" value={total} onChange={setTotal} type="number" required />
          <Field label="Down payment (Rs.)" value={down} onChange={setDown} type="number" />
          <Field label="Number of months" value={months} onChange={setMonths} type="number" required />
          <Field label="Start date" value={startDate} onChange={setStartDate} type="date" required />
        </GlassCard>

        <GlassCard>
          <p className="text-xs font-medium text-ink/55">Monthly installment</p>
          <p className="mt-1 font-display text-3xl font-semibold leading-none text-brand">{formatRs(monthly)}</p>
          <p className="mt-2 text-[11px] font-medium text-ink/45">
            {monthsNum || 0} payments · financed {formatRs(Math.max(0, totalNum - downNum))}
          </p>
        </GlassCard>

        <button
          type="submit"
          disabled={busy}
          className="h-13 w-full rounded-xl bg-brand py-3.5 text-sm font-semibold text-brand-foreground ring-1 ring-brand/40 disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create sale & schedule"}
        </button>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="mt-3 block">
      <span className="text-xs font-medium text-ink/55">{label}</span>
      <input
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-12 w-full rounded-xl border border-border bg-white px-3 text-base outline-none focus:border-brand"
      />
    </label>
  );
}

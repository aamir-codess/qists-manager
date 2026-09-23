import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, GlassCard } from "@/components/AppShell";
import { useCustomers } from "@/lib/queries";
import type { Customer } from "@/lib/installments";
import { supabase } from "@/integrations/supabase/client";
import { updateCustomer } from "@/lib/secure.functions";
import { Plus, Search, Pencil, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — InstallmentTracker" },
      { name: "description", content: "Add, edit and search your shop's installment customers." },
      { property: "og:title", content: "Customers — InstallmentTracker" },
      { property: "og:description", content: "Add, edit and search your shop's installment customers." },
    ],
  }),
  component: CustomersPage,
});

type FormState = { id?: string; name: string; phone: string; address: string; cnic: string };
const empty: FormState = { name: "", phone: "", address: "", cnic: "" };

function CustomersPage() {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: customers = [], isLoading } = useCustomers(search);
  const queryClient = useQueryClient();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim().slice(0, 100),
        phone: form.phone.trim().slice(0, 30),
        address: form.address.trim().slice(0, 200) || null,
        cnic: form.cnic.trim().slice(0, 30) || null,
      };
      if (!payload.name || !payload.phone) throw new Error("Name and phone are required");
      if (form.id) {
        await updateCustomer({ data: { id: form.id, ...payload } });
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from("customers").insert({ ...payload, owner_id: userData.user!.id });
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(form.id ? "Customer updated" : "Customer added");
      setForm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save customer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Customers"
      subtitle={`${customers.length} saved`}
      action={
        <button
          type="button"
          onClick={() => setForm(empty)}
          aria-label="Add customer"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground ring-1 ring-brand/40"
        >
          <Plus className="size-5" />
        </button>
      }
    >
      <div className="px-4 pt-3">
        <div className="flex h-12 items-center gap-2 rounded-xl bg-white/70 px-3 ring-1 ring-black/5 backdrop-blur-md">
          <Search className="size-4 text-ink/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone or ID"
            className="h-full w-full bg-transparent text-base outline-none placeholder:text-ink/40"
          />
        </div>
      </div>

      {form ? (
        <form onSubmit={save} className="mx-4 mt-3 rounded-2xl bg-white/70 p-4 ring-1 ring-black/5 backdrop-blur-md">
          <h2 className="font-display text-base font-semibold">{form.id ? "Edit customer" : "New customer"}</h2>
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
          <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <Field label="CNIC / ID number" value={form.cnic} onChange={(v) => setForm({ ...form, cnic: v })} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm(null)}
              className="h-12 rounded-xl bg-white text-sm font-semibold text-ink/60 ring-1 ring-black/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-12 rounded-xl bg-brand text-sm font-semibold text-brand-foreground ring-1 ring-brand/40 disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </form>
      ) : null}

      <section className="space-y-2.5 px-4 pt-4">
        {isLoading ? (
          <p className="text-sm text-ink/50">Loading…</p>
        ) : customers.length === 0 ? (
          <GlassCard>
            <p className="text-sm text-ink/55">No customers yet. Tap + to add your first one.</p>
          </GlassCard>
        ) : (
          customers.map((c: Customer) => (
            <div key={c.id} className="flex items-center gap-2 rounded-2xl bg-white/60 p-3.5 ring-1 ring-black/5 backdrop-blur-md">
              <Link to="/customers/$customerId" params={{ customerId: c.id }} className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="mt-0.5 truncate text-xs text-ink/50">
                  {c.phone}
                  {c.cnic ? ` · ${c.cnic}` : ""}
                </p>
              </Link>
              <button
                type="button"
                aria-label={`Edit ${c.name}`}
                onClick={() =>
                  setForm({ id: c.id, name: c.name, phone: c.phone, address: c.address ?? "", cnic: c.cnic ?? "" })
                }
                className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink/50 ring-1 ring-black/5"
              >
                <Pencil className="size-4" />
              </button>
              <Link
                to="/customers/$customerId"
                params={{ customerId: c.id }}
                aria-label={`Open ${c.name}`}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink/50 ring-1 ring-black/5"
              >
                <ChevronRight className="size-4" />
              </Link>
            </div>
          ))
        )}
      </section>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="mt-3 block">
      <span className="text-xs font-medium text-ink/55">{label}</span>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-12 w-full rounded-xl border border-border bg-white px-3 text-base outline-none focus:border-brand"
      />
    </label>
  );
}

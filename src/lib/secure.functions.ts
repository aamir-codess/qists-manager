import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NOT_FOUND = "Customer not found or access denied";

export const getCustomerDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ customerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: customer, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", data.customerId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!customer) return { customer: null, sales: [], installments: [] };

    const { data: sales, error: sErr } = await supabase
      .from("sales")
      .select("*")
      .eq("customer_id", customer.id)
      .eq("owner_id", userId)
      .order("created_at");
    if (sErr) throw new Error(sErr.message);
    const saleIds = (sales ?? []).map((s) => s.id);
    let installments: any[] = [];
    if (saleIds.length) {
      const { data: inst, error: iErr } = await supabase
        .from("installments")
        .select("*")
        .in("sale_id", saleIds)
        .eq("owner_id", userId)
        .order("installment_no");
      if (iErr) throw new Error(iErr.message);
      installments = inst ?? [];
    }
    return { customer, sales: sales ?? [], installments };
  });

export const updateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(100),
        phone: z.string().trim().min(1).max(30),
        address: z.string().max(200).nullable(),
        cnic: z.string().max(30).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...payload } = data;
    const { data: rows, error } = await context.supabase
      .from("customers")
      .update(payload)
      .eq("id", id)
      .eq("owner_id", context.userId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!rows?.length) throw new Error(NOT_FOUND);
    return { ok: true };
  });

export const createSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        customer_id: z.string().uuid(),
        product_name: z.string().trim().min(1).max(120),
        total_price: z.number().positive(),
        down_payment: z.number().min(0),
        months: z.number().int().min(1).max(120),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        monthly_amount: z.number().min(0),
        schedule: z.array(
          z.object({ installment_no: z.number().int(), due_date: z.string(), amount: z.number() }),
        ),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cust } = await supabase
      .from("customers")
      .select("id")
      .eq("id", data.customer_id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!cust) throw new Error(NOT_FOUND);
    const { schedule, ...sale } = data;
    const { data: created, error } = await supabase
      .from("sales")
      .insert({ ...sale, owner_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: iErr } = await supabase
      .from("installments")
      .insert(schedule.map((r) => ({ ...r, owner_id: userId, sale_id: created.id })));
    if (iErr) throw new Error(iErr.message);
    return { saleId: created.id };
  });

export const recordPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        items: z
          .array(z.object({ installment_id: z.string().uuid(), amount: z.number().positive() }))
          .min(1)
          .max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ids = data.items.map((i) => i.installment_id);
    const { data: owned, error } = await supabase
      .from("installments")
      .select("id, sale_id, amount, paid_amount")
      .in("id", ids)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    const map = new Map((owned ?? []).map((r) => [r.id, r]));
    if (ids.some((id) => !map.has(id))) throw new Error("Installment not found or access denied");

    const { error: pErr } = await supabase.from("payments").insert(
      data.items.map((i) => ({
        owner_id: userId,
        installment_id: i.installment_id,
        sale_id: map.get(i.installment_id)!.sale_id,
        amount: i.amount,
        paid_on: data.paid_on,
      })),
    );
    if (pErr) throw new Error(pErr.message);

    for (const i of data.items) {
      const inst = map.get(i.installment_id)!;
      const newPaid = Number(inst.paid_amount) + i.amount;
      const { error: uErr } = await supabase
        .from("installments")
        .update({
          paid_amount: newPaid,
          paid_at: newPaid >= Number(inst.amount) - 0.5 ? data.paid_on : null,
        })
        .eq("id", inst.id)
        .eq("owner_id", userId);
      if (uErr) throw new Error(uErr.message);
    }
    return { ok: true };
  });

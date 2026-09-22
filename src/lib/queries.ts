import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Customer, Installment, Sale } from "./installments";

export type InstallmentWithContext = Installment & {
  sales: {
    id: string;
    product_name: string;
    months: number;
    customers: { id: string; name: string; phone: string } | null;
  } | null;
};

export function useCustomers(search = "") {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
    select: (rows) => {
      const q = search.trim().toLowerCase();
      if (!q) return rows;
      return rows.filter((c) =>
        [c.name, c.phone, c.cnic ?? "", c.address ?? ""].some((v) => v.toLowerCase().includes(q)),
      );
    },
  });
}

export function useInstallments() {
  return useQuery({
    queryKey: ["installments"],
    queryFn: async (): Promise<InstallmentWithContext[]> => {
      const { data, error } = await supabase
        .from("installments")
        .select("*, sales(id, product_name, months, customers(id, name, phone))")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as InstallmentWithContext[];
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("amount, paid_on");
      if (error) throw error;
      return (data ?? []) as { amount: number; paid_on: string }[];
    },
  });
}

export function useCustomerDetail(customerId: string) {
  return useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const [customerRes, salesRes, instRes] = await Promise.all([
        supabase.from("customers").select("*").eq("id", customerId).maybeSingle(),
        supabase.from("sales").select("*").eq("customer_id", customerId).order("created_at"),
        supabase
          .from("installments")
          .select("*, sales!inner(customer_id)")
          .eq("sales.customer_id", customerId)
          .order("installment_no"),
      ]);
      if (customerRes.error) throw customerRes.error;
      if (salesRes.error) throw salesRes.error;
      if (instRes.error) throw instRes.error;
      return {
        customer: customerRes.data as Customer | null,
        sales: (salesRes.data ?? []) as Sale[],
        installments: (instRes.data ?? []) as unknown as Installment[],
      };
    },
  });
}

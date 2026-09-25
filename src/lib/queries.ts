import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCustomerDetail } from "./secure.functions";
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
  const fetchDetail = useServerFn(getCustomerDetail);
  return useQuery({
    queryKey: ["customer", customerId],
    retry: false,
    queryFn: async () => {
      // Invalid or manually altered IDs should resolve to the in-app not-found
      // state instead of reaching server validation and the global error page.
      if (!zUuidPattern.test(customerId)) {
        return { customer: null, sales: [], installments: [] };
      }
      const res = await fetchDetail({ data: { customerId } });
      return {
        customer: res.customer as Customer | null,
        sales: res.sales as Sale[],
        installments: res.installments as Installment[],
      };
    },
  });
}

const zUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

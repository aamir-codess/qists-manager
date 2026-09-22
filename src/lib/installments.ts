export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  cnic: string | null;
  created_at: string;
};

export type Sale = {
  id: string;
  customer_id: string;
  product_name: string;
  total_price: number;
  down_payment: number;
  months: number;
  start_date: string;
  monthly_amount: number;
  created_at: string;
};

export type Installment = {
  id: string;
  sale_id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  paid_at: string | null;
};

export type InstallmentStatus = "paid" | "overdue" | "upcoming";

export function formatRs(value: number): string {
  const rounded = Math.round(Number(value) || 0);
  return `Rs. ${rounded.toLocaleString("en-PK")}`;
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function todayISO(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function statusOf(inst: Pick<Installment, "amount" | "paid_amount" | "due_date">): InstallmentStatus {
  if (Number(inst.paid_amount) >= Number(inst.amount) - 0.5) return "paid";
  return inst.due_date < todayISO() ? "overdue" : "upcoming";
}

export function addMonths(iso: string, count: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(Date.UTC(y!, (m! - 1) + count, 1));
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(d!, lastDay);
  return `${base.getUTCFullYear()}-${`${base.getUTCMonth() + 1}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

/** Splits the financed amount across the months, putting any rounding remainder on the last month. */
export function buildSchedule(params: {
  totalPrice: number;
  downPayment: number;
  months: number;
  startDate: string;
}): { installment_no: number; due_date: string; amount: number }[] {
  const financed = Math.max(0, params.totalPrice - params.downPayment);
  const monthly = Math.round(financed / params.months);
  const rows: { installment_no: number; due_date: string; amount: number }[] = [];
  let allocated = 0;
  for (let i = 0; i < params.months; i++) {
    const isLast = i === params.months - 1;
    const amount = isLast ? Math.max(0, financed - allocated) : monthly;
    allocated += amount;
    rows.push({ installment_no: i + 1, due_date: addMonths(params.startDate, i), amount });
  }
  return rows;
}

export function monthlyAmount(totalPrice: number, downPayment: number, months: number): number {
  if (!months || months < 1) return 0;
  return Math.round(Math.max(0, totalPrice - downPayment) / months);
}

export function whatsappLink(phone: string, name: string, amount: number, dueDate: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
  const message = `Assalam o Alaikum ${name}, your installment of Rs. ${Math.round(amount).toLocaleString("en-PK")} was due on ${formatDate(dueDate)}. Please pay at your earliest.`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

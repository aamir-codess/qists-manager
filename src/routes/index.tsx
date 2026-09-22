import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InstallmentTracker — Monthly installment records for small shops" },
      {
        name: "description",
        content:
          "Track customers, installment plans, payments and overdue reminders for your shop, in Rs., from your phone.",
      },
      { property: "og:title", content: "InstallmentTracker — Installment records for small shops" },
      {
        property: "og:description",
        content: "Track customers, installment plans, payments and overdue reminders for your shop.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen bg-paper font-sans text-ink">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-10 size-64 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute bottom-10 right-[-40px] size-72 rounded-full bg-brand/20 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-[480px] flex-col justify-center px-5 py-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink/45">InstallmentTracker</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-balance">
          Your shop's installment register, on your phone
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/60">
          Keep customers, monthly plans and payments in one place. See what is due this week, who is behind, and send
          a WhatsApp reminder in one tap.
        </p>
        <Link
          to="/auth"
          className="mt-7 flex h-13 items-center justify-center rounded-xl bg-brand py-3.5 text-sm font-semibold text-brand-foreground ring-1 ring-brand/40"
        >
          Sign in to your shop
        </Link>
      </div>
    </div>
  );
}

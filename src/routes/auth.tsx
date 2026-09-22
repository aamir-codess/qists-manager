import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — InstallmentTracker" },
      { name: "description", content: "Shop owner sign in for InstallmentTracker installment records." },
      { property: "og:title", content: "Sign in — InstallmentTracker" },
      { property: "og:description", content: "Shop owner sign in for InstallmentTracker installment records." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
          return;
        }
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-paper font-sans text-ink">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-10 size-64 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute bottom-10 right-[-40px] size-72 rounded-full bg-brand/20 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-[480px] flex-col justify-center px-5 py-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink/45">InstallmentTracker</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">Installment Register</h1>
        <p className="mt-2 text-sm text-ink/55">
          {mode === "signin" ? "Sign in to your shop account." : "Create your shop account."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 rounded-2xl bg-white/60 p-4 ring-1 ring-black/5 backdrop-blur-md">
          <label className="block text-xs font-medium text-ink/55" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-border bg-white px-3 text-base outline-none focus:border-brand"
          />
          <label className="mt-4 block text-xs font-medium text-ink/55" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-border bg-white px-3 text-base outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-5 h-12 w-full rounded-xl bg-brand text-sm font-semibold text-brand-foreground ring-1 ring-brand/40 disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-sm font-medium text-brand"
        >
          {mode === "signin" ? "New shop? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

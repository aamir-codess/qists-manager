import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/AppShell";

type Attempt = { id: string; success: boolean; locked: boolean; ip: string | null; created_at: string };

export function LoginActivity() {
  const { data = [] } = useQuery({
    queryKey: ["login_attempts"],
    queryFn: async (): Promise<Attempt[]> => {
      const { data, error } = await supabase
        .from("login_attempts")
        .select("id, success, locked, ip, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
  const failed = data.filter((a) => !a.success).length;

  return (
    <section className="px-4 pt-5 pb-4">
      <GlassCard>
        <h2 className="font-display text-base font-semibold">Sign-in activity</h2>
        <p className="mt-0.5 text-xs text-ink/50">
          {failed > 0 ? `${failed} failed attempt${failed === 1 ? "" : "s"} in your last 10 sign-ins` : "No failed attempts recently"}
        </p>
        <ul className="mt-3 space-y-1.5">
          {data.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-ink/60">
                {new Date(a.created_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                {a.ip ? ` · ${a.ip}` : ""}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${a.success ? "bg-brand/10 text-brand" : "bg-danger/10 text-danger"}`}
              >
                {a.success ? "Success" : a.locked ? "Blocked (locked)" : "Failed"}
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </section>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const MAX_FAILS = 5;
const WINDOW_MIN = 15;

export type SignInResult =
  | { ok: true; access_token: string; refresh_token: string }
  | { ok: false; locked: boolean; message: string; minutesLeft?: number };

export const signInWithLimit = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ email: z.string().trim().email().max(255), password: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }): Promise<SignInResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const req = getRequest();
    const ip =
      req?.headers.get("cf-connecting-ip") ?? req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ua = req?.headers.get("user-agent")?.slice(0, 300) ?? null;
    const log = (success: boolean, locked = false) =>
      supabaseAdmin.from("login_attempts").insert({ email, success, locked, ip, user_agent: ua });

    // Failures since the last success, within the window.
    const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
    const { data: recent, error } = await supabaseAdmin
      .from("login_attempts")
      .select("success, created_at")
      .eq("email", email)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Sign-in is temporarily unavailable");
    const fails: string[] = [];
    for (const r of recent ?? []) {
      if (r.success) break;
      fails.push(r.created_at);
    }
    if (fails.length >= MAX_FAILS) {
      const unlockAt = new Date(fails[MAX_FAILS - 1]!).getTime() + WINDOW_MIN * 60_000;
      const minutesLeft = Math.max(1, Math.ceil((unlockAt - Date.now()) / 60_000));
      await log(false, true);
      return {
        ok: false,
        locked: true,
        minutesLeft,
        message: `Too many failed sign-in attempts. For your security this account is locked. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
      };
    }

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: auth, error: authErr } = await client.auth.signInWithPassword({ email, password: data.password });
    if (authErr || !auth.session) {
      await log(false);
      const left = MAX_FAILS - fails.length - 1;
      return {
        ok: false,
        locked: left <= 0,
        message:
          authErr?.code === "email_not_confirmed"
            ? "Please confirm your email first, then sign in."
            : left <= 0
              ? `Too many failed sign-in attempts. This account is locked for ${WINDOW_MIN} minutes.`
              : `Wrong email or password. ${left} attempt${left === 1 ? "" : "s"} left before a ${WINDOW_MIN}-minute lock.`,
      };
    }
    await log(true);
    return { ok: true, access_token: auth.session.access_token, refresh_token: auth.session.refresh_token };
  });

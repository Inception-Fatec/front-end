import { createClient } from "@supabase/supabase-js";

// Server-side (service role) — NUNCA expor no client
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      fetch: (url, options = {}) =>
        fetch(url, { ...options, keepalive: false }),
    },
  }
);

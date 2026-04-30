import { createClient } from "@supabase/supabase-js";

// Client-side (anon key) — seguro para usar no browser
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
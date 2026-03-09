import { neon } from "https://esm.sh/@neondatabase/serverless@0.10.4";

export function getDb() {
  const databaseUrl = Deno.env.get("NEON_DATABASE_URL");
  if (!databaseUrl) throw new Error("NEON_DATABASE_URL is not set");
  return neon(databaseUrl);
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { processFruit } from "../_shared/processFruit.ts";

/**
 * Get Incoming Apple Edge Function
 *
 * Complete Task Flow:
 * 1. Generate a new apple instance ✅
 * 2. Capture the fruit's communication (attributes & preferences) ✅
 * 3. Store the new apple in SurrealDB ✅
 * 4. Match the new apple to existing oranges ✅
 * 5. Generate match communication via LLM ✅
 * 6. Store match records ✅
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return await processFruit("apple", corsHeaders);
});

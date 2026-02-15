// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { generateOrange } from "../_shared/generateFruit.ts";
import { storeOrange, getAllApples, storeMatch } from "../_shared/db.ts";
import { findBestMatches, calculateMutualScore } from "../_shared/matching.ts";
import { generateMatchCommunication } from "../_shared/llm.ts";

/**
 * Get Incoming Orange Edge Function
 *
 * Complete Task Flow:
 * 1. Generate a new orange instance ✅
 * 2. Store the new orange in SurrealDB ✅
 * 3. Match the new orange to existing apples ✅
 * 4. Generate match communication via LLM ✅
 * 5. Store match records ✅
 */

// CORS headers for local development
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Maximum number of matches to return
const MAX_MATCHES = 5;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🍊 Processing incoming orange...");

    // Step 1: Generate a new orange instance
    const orange = generateOrange();
    console.log("✅ Generated orange with attributes:", orange.attributes);

    // Step 2: Store the new orange in SurrealDB
    const storedOrange = await storeOrange(orange);
    console.log("✅ Orange stored in database with ID:", storedOrange.id);

    // Step 3: Match the new orange to existing apples
    const apples = await getAllApples();
    console.log(`🔍 Found ${apples.length} apples to match against`);

    const matches = findBestMatches(storedOrange, apples, MAX_MATCHES);
    console.log(`✅ Found ${matches.length} potential matches`);

    // Step 4: Generate match communication via LLM
    const llmResponse = await generateMatchCommunication("orange", storedOrange, matches);
    console.log("✅ Generated LLM response");

    // Store match records in the database
    const matchRecords = [];
    for (const match of matches) {
      const mutualScore = calculateMutualScore(storedOrange, match.fruit);
      
      const matchRecord = await storeMatch({
        apple_id: String(match.fruit.id),
        orange_id: String(storedOrange.id),
        apple_to_orange_score: mutualScore.fruit2ToFruit1,
        orange_to_apple_score: mutualScore.fruit1ToFruit2,
        mutual_score: mutualScore.mutualScore,
        llm_response: llmResponse,
        created_at: new Date(),
      });

      matchRecords.push({
        match_id: matchRecord.id,
        apple_id: match.fruit.id,
        score: match.score,
        mutual_score: mutualScore.mutualScore,
      });
    }

    console.log(`✅ Stored ${matchRecords.length} match records`);
    console.log("🎉 Orange processing complete!");

    // Return comprehensive result
    return new Response(
      JSON.stringify({
        success: true,
        fruit: {
          id: storedOrange.id,
          type: "orange",
          attributes: storedOrange.attributes,
          preferences: storedOrange.preferences,
        },
        matches: {
          count: matches.length,
          top_matches: matches.map((m) => ({
            apple_id: m.fruit.id,
            score: Math.round(m.score * 100),
            matched_preferences: m.details.matchedPreferences,
            total_preferences: m.details.totalPreferences,
            details: m.details,
            matched_fruit_attributes: m.fruit.attributes,
          })),
        },
        llm_response: llmResponse,
        match_records: matchRecords,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error processing incoming orange:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to process incoming orange",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

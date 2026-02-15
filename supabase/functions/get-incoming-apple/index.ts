// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { generateApple, communicateAttributes, communicatePreferences } from "../_shared/generateFruit.ts";
import { storeApple, getAllOranges, storeMatch } from "../_shared/db.ts";
import { findBestMatches } from "../_shared/matching.ts";
import { generateMatchCommunication } from "../_shared/llm.ts";

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
    console.log("🍎 Processing incoming apple...");

    // Step 1: Generate a new apple instance
    const apple = generateApple();
    console.log("✅ Generated apple with attributes:", apple.attributes);

    // Step 2: Capture the fruit's communication
    const attributesCommunication = communicateAttributes(apple);
    const preferencesCommunication = communicatePreferences(apple);
    console.log("✅ Generated fruit communication");

    // Step 3: Store the new apple in SurrealDB
    const storedApple = await storeApple(apple);
    console.log("✅ Apple stored in database with ID:", storedApple.id);

    // Step 4: Match the new apple to existing oranges
    const oranges = await getAllOranges();
    console.log(`🔍 Found ${oranges.length} oranges to match against`);

    const matches = findBestMatches(storedApple, oranges, MAX_MATCHES);
    console.log(`✅ Found ${matches.length} potential matches`);

    // Step 5: Generate match communication via LLM
    const llmResponse = await generateMatchCommunication("apple", storedApple, matches);
    console.log("✅ Generated LLM response");

    // Store match records in the database
    const matchRecords: Array<{
      match_id: string | undefined;
      orange_id: string;
      score: number;
      mutual_score: number;
    }> = [];
    
    for (const match of matches) {
      const matchRecord = await storeMatch({
        apple_id: String(storedApple.id),
        orange_id: String(match.fruit.id),
        apple_to_orange_score: match.score,
        orange_to_apple_score: match.reverseScore,
        mutual_score: match.mutualScore,
        llm_response: llmResponse,
        created_at: new Date(),
      });

      matchRecords.push({
        match_id: matchRecord.id,
        orange_id: match.fruit.id,
        score: match.score,
        mutual_score: match.mutualScore,
      });
    }

    console.log(`✅ Stored ${matchRecords.length} match records`);
    console.log("🎉 Apple processing complete!");

    // Return comprehensive result
    return new Response(
      JSON.stringify({
        success: true,
        fruit: {
          id: storedApple.id,
          type: "apple",
          attributes: storedApple.attributes,
          preferences: storedApple.preferences,
        },
        communication: {
          attributes: attributesCommunication,
          preferences: preferencesCommunication,
        },
        matches: {
          count: matches.length,
          top_matches: matches.map((m) => {
            return {
              orange_id: m.fruit.id,
              score: Math.round(m.score * 100),
              matched_preferences: m.details.matchedPreferences,
              total_preferences: m.details.totalPreferences,
              details: m.details,
              matched_fruit_attributes: m.fruit.attributes,
              matched_fruit_preferences: m.fruit.preferences,
              reverse_score: Math.round(m.reverseScore * 100),
              reverse_details: m.reverseDetails,
            };
          }),
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
    console.error("❌ Error processing incoming apple:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to process incoming apple",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

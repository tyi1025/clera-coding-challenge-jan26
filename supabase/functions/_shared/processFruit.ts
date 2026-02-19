// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import {
  generateApple,
  generateOrange,
  communicateAttributes,
  communicatePreferences,
  type Fruit,
  type FruitType,
  FruitAttributes,
  FruitPreferences,
} from "./generateFruit.ts";
import {
  storeApple,
  storeOrange,
  getAllApples,
  getAllOranges,
  storeMatch,
  type StoredApple,
  type StoredOrange,
} from "./db.ts";
import { findBestMatches, PreferenceMatchDetails } from "./matching.ts";
import { generateMatchCommunication } from "./llm.ts";

const MAX_MATCHES = 5;

type FruitOperations = {
  generate: () => Fruit;
  store: (fruit: Fruit) => Promise<StoredApple | StoredOrange>;
  getOthers: () => Promise<(StoredApple | StoredOrange)[]>;
  emoji: string;
  otherType: string;
};

interface BaseMatchObject {
  score: number;
  matched_preferences: number;
  total_preferences: number;
  details: PreferenceMatchDetails;
  matched_fruit_attributes: FruitAttributes;
  matched_fruit_preferences: FruitPreferences;
  reverse_score: number;
  reverse_details: PreferenceMatchDetails;
}

interface AppleMatchObject extends BaseMatchObject {
  apple_id: string;
}

interface OrangeMatchObject extends BaseMatchObject {
  orange_id: string;
}



function getFruitOperations(type: FruitType): FruitOperations {
  if (type === "apple") {
    return {
      generate: generateApple,
      store: storeApple,
      getOthers: getAllOranges,
      emoji: "🍎",
      otherType: "oranges",
    };
  } else {
    return {
      generate: generateOrange,
      store: storeOrange,
      getOthers: getAllApples,
      emoji: "🍊",
      otherType: "apples",
    };
  }
}

export async function processFruit(
  type: FruitType,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const ops = getFruitOperations(type);
    console.log(`${ops.emoji} Processing incoming ${type}...`);

    const fruit = ops.generate();
    console.log(`✅ Generated ${type} with attributes:`, fruit.attributes);

    const attributesCommunication = communicateAttributes(fruit);
    const preferencesCommunication = communicatePreferences(fruit);
    console.log("✅ Generated fruit communication");

    const storedFruit = await ops.store(fruit);
    console.log(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} stored in database with ID:`, storedFruit.id);

    const others = await ops.getOthers();
    console.log(`🔍 Found ${others.length} ${ops.otherType} to match against`);

    const matches = findBestMatches(storedFruit, others, MAX_MATCHES);
    console.log(`✅ Found ${matches.length} potential matches`);

    const llmResponse = await generateMatchCommunication(type, storedFruit, matches);
    console.log("✅ Generated LLM response");

    const matchRecords: Array<{
      match_id: string | undefined;
      apple_id?: string;
      orange_id?: string;
      score: number;
      mutual_score: number;
    }> = [];

    for (const match of matches) {
      let matchRecord;
      
      if (type === "apple") {
        matchRecord = await storeMatch({
          apple_id: String(storedFruit.id),
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
      } else {
        matchRecord = await storeMatch({
          apple_id: String(match.fruit.id),
          orange_id: String(storedFruit.id),
          apple_to_orange_score: match.reverseScore,
          orange_to_apple_score: match.score,
          mutual_score: match.mutualScore,
          llm_response: llmResponse,
          created_at: new Date(),
        });

        matchRecords.push({
          match_id: matchRecord.id,
          apple_id: match.fruit.id,
          score: match.score,
          mutual_score: match.mutualScore,
        });
      }
    }

    console.log(`✅ Stored ${matchRecords.length} match records`);
    console.log(`🎉 ${type.charAt(0).toUpperCase() + type.slice(1)} processing complete!`);

    return new Response(
      JSON.stringify({
        success: true,
        fruit: {
          id: storedFruit.id,
          type: type,
          attributes: storedFruit.attributes,
          preferences: storedFruit.preferences,
        },
        communication: {
          attributes: attributesCommunication,
          preferences: preferencesCommunication,
        },
        matches: {
          count: matches.length,
          top_matches: matches.map((m) => {

              const matchObj: BaseMatchObject  = {
              score: Math.round(m.score * 100),
              matched_preferences: m.details.matchedPreferences,
              total_preferences: m.details.totalPreferences,
              details: m.details,
              matched_fruit_attributes: m.fruit.attributes,
              matched_fruit_preferences: m.fruit.preferences,
              reverse_score: Math.round(m.reverseScore * 100),
              reverse_details: m.reverseDetails,
            } 

            if (type === "apple") {
              return {
                ...matchObj,
                orange_id : m.fruit.id,
              } 
            } 
              return {
                ...matchObj,
                apple_id : m.fruit.id,
              }
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
    console.error(`❌ Error processing incoming ${type}:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Failed to process incoming ${type}`,
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}

/**
 * LLM Integration for Match Communication
 *
 * Uses Google Gemini to generate natural language explanations
 * of matchmaking results.
 */

import type { Fruit } from "./generateFruit.ts";
import type { StoredApple, StoredOrange } from "./db.ts";
import type { MatchScore } from "./matching.ts";

type StoredFruit = StoredApple | StoredOrange;

// ============================================================================
// Configuration
// ============================================================================

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Generation parameters for creative matchmaking messages
// Higher temperature = more creative/varied responses (range: 0-2)
const LLM_TEMPERATURE = 0.9;

// Consider top K tokens for balanced diversity (higher = more variety)
const LLM_TOP_K = 40;

// Nucleus sampling threshold for quality control (range: 0-1)
const LLM_TOP_P = 0.95;

// Maximum response length in tokens (~375-400 words)
const MAX_OUTPUT_TOKENS = 500;

// ============================================================================
// Types
// ============================================================================

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

// ============================================================================
// Prompt Generation
// ============================================================================

/**
 * Formats a fruit's attributes for the prompt.
 */
function formatAttributes(fruit: Fruit | StoredFruit): string {
  const attrs = fruit.attributes;
  const parts: string[] = [];

  if (attrs.size !== null) parts.push(`size ${attrs.size}`);
  if (attrs.weight !== null) parts.push(`weight ${attrs.weight}g`);
  if (attrs.hasStem !== null) parts.push(attrs.hasStem ? "has stem" : "no stem");
  if (attrs.hasLeaf !== null) parts.push(attrs.hasLeaf ? "has leaf" : "no leaf");
  if (attrs.hasWorm !== null) parts.push(attrs.hasWorm ? "has worm" : "no worm");
  if (attrs.shineFactor !== null) parts.push(`${attrs.shineFactor} shine`);
  if (attrs.hasChemicals !== null) parts.push(attrs.hasChemicals ? "treated with chemicals" : "chemical-free");

  return parts.join(", ");
}

/**
 * Formats a fruit's preferences for the prompt.
 */
function formatPreferences(fruit: Fruit | StoredFruit): string {
  const prefs = fruit.preferences;
  const parts: string[] = [];

  if (prefs.size) {
    if (prefs.size.min !== undefined && prefs.size.max !== undefined) {
      parts.push(`size between ${prefs.size.min}-${prefs.size.max}`);
    } else if (prefs.size.min !== undefined) {
      parts.push(`size at least ${prefs.size.min}`);
    } else if (prefs.size.max !== undefined) {
      parts.push(`size no more than ${prefs.size.max}`);
    }
  }

  if (prefs.weight) {
    if (prefs.weight.min !== undefined && prefs.weight.max !== undefined) {
      parts.push(`weight ${prefs.weight.min}-${prefs.weight.max}g`);
    } else if (prefs.weight.min !== undefined) {
      parts.push(`weight at least ${prefs.weight.min}g`);
    } else if (prefs.weight.max !== undefined) {
      parts.push(`weight no more than ${prefs.weight.max}g`);
    }
  }

  if (prefs.hasStem !== undefined) parts.push(prefs.hasStem ? "must have stem" : "no stem");
  if (prefs.hasLeaf !== undefined) parts.push(prefs.hasLeaf ? "must have leaf" : "no leaf");
  if (prefs.hasWorm !== undefined) parts.push(prefs.hasWorm ? "worm okay" : "absolutely no worms");
  if (prefs.shineFactor !== undefined) {
    const shines = Array.isArray(prefs.shineFactor) ? prefs.shineFactor.join(" or ") : prefs.shineFactor;
    parts.push(`${shines} shine`);
  }
  if (prefs.hasChemicals !== undefined) parts.push(prefs.hasChemicals ? "chemicals okay" : "must be chemical-free");

  return parts.length > 0 ? parts.join(", ") : "no specific preferences (open-minded!)";
}

/**
 * Creates a prompt for generating match communication.
 */
function createMatchPrompt(
  seekerType: "apple" | "orange",
  seeker: Fruit | StoredFruit,
  matches: MatchScore[]
): string {
  const seekerAttrs = formatAttributes(seeker);
  const seekerPrefs = formatPreferences(seeker);
  const matchType = seekerType === "apple" ? "orange" : "apple";

  let prompt = `You are a cheerful matchmaking assistant helping fruits find their perfect pairs!

A new ${seekerType} has just entered our matchmaking system:
- Attributes: ${seekerAttrs}
- Looking for: ${seekerPrefs}

`;

  if (matches.length === 0) {
    prompt += `Unfortunately, there are no ${matchType}s available right now.

Write a friendly, encouraging message (2-3 sentences) letting the ${seekerType} know that:
1. There are currently no potential matches available
2. They're in our system and we'll find matches as more fruits join
3. Keep it upbeat and positive!`;
  } else {
    prompt += `We found ${matches.length} potential match(es)! Here they are:\n\n`;

    matches.forEach((match, idx) => {
      const matchAttrs = formatAttributes(match.fruit);
      const scorePercent = Math.round(match.score * 100);
      const matchedPrefs = match.details.matchedPreferences;
      const totalPrefs = match.details.totalPreferences;

      prompt += `Match ${idx + 1}: ${matchType.toUpperCase()} (${scorePercent}% compatible)
- Attributes: ${matchAttrs}
- Matched ${matchedPrefs} out of ${totalPrefs} preferences

`;
    });

    prompt += `Write a friendly, enthusiastic message (3-5 sentences) that:
1. Celebrates finding match(es) for the ${seekerType}
2. Highlights the best match (Match 1) and what makes it special
3. Mentions the compatibility percentage
4. If there are multiple matches, briefly acknowledge them too
5. Keep it warm, playful, and matchmaking-themed!

Do NOT use asterisks, bullet points, or lists in your response. Write in natural, flowing sentences.`;
  }

  return prompt;
}

// ============================================================================
// API Communication
// ============================================================================

/**
 * Calls the Gemini API to generate text.
 */
async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
        generationConfig: {
          temperature: LLM_TEMPERATURE,
          topK: LLM_TOP_K,
          topP: LLM_TOP_P,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json() as GeminiResponse;

    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message}`);
    }

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("Gemini API returned no candidates");
    }

    const text = data.candidates[0].content.parts[0].text;
    return text.trim();

  } catch (error) {
    console.error("Failed to call Gemini API:", error);
    throw error;
  }
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Generates a natural language explanation of match results using Gemini.
 *
 * @param seekerType - The type of fruit ("apple" or "orange")
 * @param seeker - The fruit looking for a match
 * @param matches - Array of scored matches
 * @returns Natural language explanation from Gemini
 */
export async function generateMatchCommunication(
  seekerType: "apple" | "orange",
  seeker: Fruit | StoredFruit,
  matches: MatchScore[]
): Promise<string> {
  try {
    const prompt = createMatchPrompt(seekerType, seeker, matches);
    return await callGemini(prompt);
  } catch (error) {
    console.error("Failed to generate match communication:", error);
    
    // Fallback response if LLM fails
    return generateFallbackMessage(seekerType, seeker, matches);
  }
}

/**
 * Generates a simple fallback message if LLM fails.
 * Used only in error scenarios, so messaging is straightforward and professional.
 */
function generateFallbackMessage(
  seekerType: "apple" | "orange",
  seeker: Fruit | StoredFruit,
  matches: MatchScore[]
): string {
  const matchType = seekerType === "apple" ? "orange" : "apple";
  
  if (matches.length === 0) {
    return `Your ${seekerType} has been added to our matchmaking system. We're currently looking for compatible ${matchType}s. You'll be notified when potential matches become available.`;
  }

  const bestMatch = matches[0];
  const scorePercent = Math.round(bestMatch.score * 100);

  if (matches.length === 1) {
    return `We found ${matches.length} potential ${matchType} match with ${scorePercent}% compatibility. This match satisfies ${bestMatch.details.matchedPreferences} out of your ${bestMatch.details.totalPreferences} key preferences.`;
  }

  return `We found ${matches.length} potential ${matchType} matches for your ${seekerType}. Your top match shows ${scorePercent}% compatibility, meeting ${bestMatch.details.matchedPreferences} of ${bestMatch.details.totalPreferences} preferences. You can review all matches in your dashboard.`;
}


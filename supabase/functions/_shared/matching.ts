/**
 * Fruit Matching Algorithm
 *
 * Calculates compatibility scores between fruits based on their preferences.
 * Each fruit has preferences for what they want in a match, and we score
 * how well potential matches satisfy those preferences.
 */

import type { Fruit, FruitAttributes, FruitPreferences, ShineFactor } from "./generateFruit.ts";
import type { StoredApple, StoredOrange } from "./db.ts";

type StoredFruit = StoredApple | StoredOrange;

// ============================================================================
// Constants
// ============================================================================

// Weights for different preference types (can be tuned)
const PREFERENCE_WEIGHTS = {
  size: 1.0,
  weight: 1.0,
  hasStem: 0.8,
  hasLeaf: 0.6,
  hasWorm: 1.5, // Worm preference is important!
  shineFactor: 0.7,
  hasChemicals: 0.9,
};

// Minimum score threshold for a match to be considered valid
const MIN_MATCH_SCORE = 0.0; // Accept all matches for now, can raise later

// ============================================================================
// Types
// ============================================================================

export interface MatchScore {
  fruit: StoredFruit;
  score: number;
  details: PreferenceMatchDetails;
}

export interface PreferenceMatchDetails {
  size?: { expected: string; actual: number | null; score: number };
  weight?: { expected: string; actual: number | null; score: number };
  hasStem?: { expected: boolean; actual: boolean | null; score: number };
  hasLeaf?: { expected: boolean; actual: boolean | null; score: number };
  hasWorm?: { expected: boolean; actual: boolean | null; score: number };
  shineFactor?: { expected: string; actual: ShineFactor | null; score: number };
  hasChemicals?: { expected: boolean; actual: boolean | null; score: number };
  totalScore: number;
  matchedPreferences: number;
  totalPreferences: number;
}

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Scores how well a numeric value fits within a preferred range.
 * Returns 1.0 for perfect match, 0.0 for completely outside range.
 */
function scoreNumericRange(
  value: number | null,
  preference: { min?: number; max?: number } | undefined
): number {
  // If no preference, it's a perfect match (don't care)
  if (!preference || (preference.min === undefined && preference.max === undefined)) {
    return 1.0;
  }

  // If value is null/unknown, assume neutral score
  if (value === null) {
    return 0.5;
  }

  const { min, max } = preference;

  // Both min and max specified - check if in range
  if (min !== undefined && max !== undefined) {
    if (value >= min && value <= max) {
      return 1.0; // Perfect fit
    }
    // Calculate how far outside the range
    const distance = value < min ? min - value : value - max;
    const rangeSize = max - min;
    const penalty = Math.min(1.0, distance / (rangeSize * 2)); // Gradual falloff
    return Math.max(0.0, 1.0 - penalty);
  }

  // Only min specified
  if (min !== undefined) {
    if (value >= min) {
      return 1.0;
    }
    const distance = min - value;
    const penalty = Math.min(1.0, distance / min);
    return Math.max(0.0, 1.0 - penalty);
  }

  // Only max specified
  if (max !== undefined) {
    if (value <= max) {
      return 1.0;
    }
    const distance = value - max;
    const penalty = Math.min(1.0, distance / max);
    return Math.max(0.0, 1.0 - penalty);
  }

  return 1.0;
}

/**
 * Scores how well a boolean value matches a preference.
 */
function scoreBooleanMatch(
  value: boolean | null,
  preference: boolean | undefined
): number {
  // No preference = perfect match
  if (preference === undefined) {
    return 1.0;
  }

  // Unknown value = neutral
  if (value === null) {
    return 0.5;
  }

  // Exact match or mismatch
  return value === preference ? 1.0 : 0.0;
}

/**
 * Scores how well a shine factor matches a preference.
 */
function scoreShineFactorMatch(
  value: ShineFactor | null,
  preference: ShineFactor | ShineFactor[] | undefined
): number {
  // No preference = perfect match
  if (!preference) {
    return 1.0;
  }

  // Unknown value = neutral
  if (value === null) {
    return 0.5;
  }

  // Single value preference
  if (typeof preference === "string") {
    return value === preference ? 1.0 : 0.0;
  }

  // Array of acceptable values
  return preference.includes(value) ? 1.0 : 0.0;
}

// ============================================================================
// Main Matching Logic
// ============================================================================

/**
 * Calculates how well a candidate fruit matches the seeker's preferences.
 * Returns a score from 0.0 (no match) to 1.0 (perfect match).
 *
 * @param seeker - The fruit looking for a match (has preferences)
 * @param candidate - The potential match (has attributes)
 * @returns Score and detailed breakdown
 */
export function calculateMatchScore(
  seeker: Fruit | StoredFruit,
  candidate: StoredFruit
): MatchScore {
  const preferences = seeker.preferences;
  const attributes = candidate.attributes;
  const details: PreferenceMatchDetails = {
    totalScore: 0,
    matchedPreferences: 0,
    totalPreferences: 0,
  };

  let totalWeightedScore = 0;
  let totalWeight = 0;

  // Score size preference
  if (preferences.size !== undefined) {
    const score = scoreNumericRange(attributes.size, preferences.size);
    const weight = PREFERENCE_WEIGHTS.size;
    totalWeightedScore += score * weight;
    totalWeight += weight;
    details.totalPreferences++;
    details.size = {
      expected: preferences.size.min !== undefined && preferences.size.max !== undefined
        ? `${preferences.size.min}-${preferences.size.max}`
        : preferences.size.min !== undefined
        ? `≥${preferences.size.min}`
        : `≤${preferences.size.max}`,
      actual: attributes.size,
      score,
    };
    if (score >= 0.8) details.matchedPreferences++;
  }

  // Score weight preference
  if (preferences.weight !== undefined) {
    const score = scoreNumericRange(attributes.weight, preferences.weight);
    const weight = PREFERENCE_WEIGHTS.weight;
    totalWeightedScore += score * weight;
    totalWeight += weight;
    details.totalPreferences++;
    details.weight = {
      expected: preferences.weight.min !== undefined && preferences.weight.max !== undefined
        ? `${preferences.weight.min}-${preferences.weight.max}`
        : preferences.weight.min !== undefined
        ? `≥${preferences.weight.min}`
        : `≤${preferences.weight.max}`,
      actual: attributes.weight,
      score,
    };
    if (score >= 0.8) details.matchedPreferences++;
  }

  // Score hasStem preference
  if (preferences.hasStem !== undefined) {
    const score = scoreBooleanMatch(attributes.hasStem, preferences.hasStem);
    const weight = PREFERENCE_WEIGHTS.hasStem;
    totalWeightedScore += score * weight;
    totalWeight += weight;
    details.totalPreferences++;
    details.hasStem = {
      expected: preferences.hasStem,
      actual: attributes.hasStem,
      score,
    };
    if (score >= 0.8) details.matchedPreferences++;
  }

  // Score hasLeaf preference
  if (preferences.hasLeaf !== undefined) {
    const score = scoreBooleanMatch(attributes.hasLeaf, preferences.hasLeaf);
    const weight = PREFERENCE_WEIGHTS.hasLeaf;
    totalWeightedScore += score * weight;
    totalWeight += weight;
    details.totalPreferences++;
    details.hasLeaf = {
      expected: preferences.hasLeaf,
      actual: attributes.hasLeaf,
      score,
    };
    if (score >= 0.8) details.matchedPreferences++;
  }

  // Score hasWorm preference (important!)
  if (preferences.hasWorm !== undefined) {
    const score = scoreBooleanMatch(attributes.hasWorm, preferences.hasWorm);
    const weight = PREFERENCE_WEIGHTS.hasWorm;
    totalWeightedScore += score * weight;
    totalWeight += weight;
    details.totalPreferences++;
    details.hasWorm = {
      expected: preferences.hasWorm,
      actual: attributes.hasWorm,
      score,
    };
    if (score >= 0.8) details.matchedPreferences++;
  }

  // Score shineFactor preference
  if (preferences.shineFactor !== undefined) {
    const score = scoreShineFactorMatch(attributes.shineFactor, preferences.shineFactor);
    const weight = PREFERENCE_WEIGHTS.shineFactor;
    totalWeightedScore += score * weight;
    totalWeight += weight;
    details.totalPreferences++;
    const expectedStr = Array.isArray(preferences.shineFactor)
      ? preferences.shineFactor.join(" or ")
      : preferences.shineFactor;
    details.shineFactor = {
      expected: expectedStr,
      actual: attributes.shineFactor,
      score,
    };
    if (score >= 0.8) details.matchedPreferences++;
  }

  // Score hasChemicals preference
  if (preferences.hasChemicals !== undefined) {
    const score = scoreBooleanMatch(attributes.hasChemicals, preferences.hasChemicals);
    const weight = PREFERENCE_WEIGHTS.hasChemicals;
    totalWeightedScore += score * weight;
    totalWeight += weight;
    details.totalPreferences++;
    details.hasChemicals = {
      expected: preferences.hasChemicals,
      actual: attributes.hasChemicals,
      score,
    };
    if (score >= 0.8) details.matchedPreferences++;
  }

  // Calculate final score (0-1 range)
  const finalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 1.0;
  details.totalScore = Math.round(finalScore * 1000) / 1000; // Round to 3 decimals

  return {
    fruit: candidate,
    score: finalScore,
    details,
  };
}

/**
 * Finds the best matches for a fruit from a list of candidates.
 * Returns matches sorted by score (best first).
 *
 * @param seeker - The fruit looking for a match
 * @param candidates - Array of potential matches
 * @param limit - Maximum number of matches to return (default: 5)
 * @returns Array of match scores, sorted by score descending
 */
export function findBestMatches(
  seeker: Fruit | StoredFruit,
  candidates: StoredFruit[],
  limit = 5
): MatchScore[] {
  // Score all candidates
  const scores = candidates.map((candidate) =>
    calculateMatchScore(seeker, candidate)
  );

  // Filter by minimum score threshold
  const validMatches = scores.filter((match) => match.score >= MIN_MATCH_SCORE);

  // Sort by score (descending) and limit
  return validMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Calculates bidirectional compatibility between two fruits.
 * Returns both direction scores and a mutual score.
 *
 * @param fruit1 - First fruit
 * @param fruit2 - Second fruit
 * @returns Object with both scores and mutual score
 */
export function calculateMutualScore(
  fruit1: Fruit | StoredFruit,
  fruit2: StoredFruit
): {
  fruit1ToFruit2: number;
  fruit2ToFruit1: number;
  mutualScore: number;
} {
  const score1to2 = calculateMatchScore(fruit1, fruit2).score;
  const score2to1 = calculateMatchScore(fruit2, fruit1 as StoredFruit).score;

  // Mutual score is the average (could also use minimum for stricter matching)
  const mutualScore = (score1to2 + score2to1) / 2;

  return {
    fruit1ToFruit2: score1to2,
    fruit2ToFruit1: score2to1,
    mutualScore,
  };
}


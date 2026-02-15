// =============================================================================
// SHARED TYPE DEFINITIONS
// =============================================================================
// These types are used across API client, Zustand store, and components
// They must match the backend schema defined in generateFruit.ts

/**
 * Shine factor enum matching backend ShineFactor type
 */
export type ShineFactor = "dull" | "neutral" | "shiny" | "extraShiny";

/**
 * Number range for preferences (min/max)
 */
export interface NumberRange {
  min?: number;
  max?: number;
}

/**
 * Fruit attributes - physical characteristics
 * Matches backend FruitAttributes interface
 */
export interface FruitAttributes {
  size: number | null;
  weight: number | null;
  hasStem: boolean | null;
  hasLeaf: boolean | null;
  hasWorm: boolean | null;
  shineFactor: ShineFactor | null;
  hasChemicals: boolean | null;
}

/**
 * Fruit preferences - what they're looking for in a match
 * Matches backend FruitPreferences interface
 */
export interface FruitPreferences {
  size?: NumberRange;
  weight?: NumberRange;
  hasStem?: boolean;
  hasLeaf?: boolean;
  hasWorm?: boolean;
  shineFactor?: ShineFactor | ShineFactor[];
  hasChemicals?: boolean;
}

/**
 * A single match result from the matching algorithm
 */
export interface TopMatch {
  apple_id?: string;
  orange_id?: string;
  score: number;
  matched_preferences: number;
  total_preferences: number;
}

/**
 * A match record stored in the database
 */
export interface MatchRecord {
  match_id: string;
  apple_id?: string;
  orange_id?: string;
  score: number;
  mutual_score: number;
}

/**
 * Complete response from edge functions (get-incoming-apple, get-incoming-orange)
 */
export interface MatchmakingResponse {
  success: boolean;
  fruit: {
    id: string;
    type: "apple" | "orange";
    attributes: FruitAttributes;
    preferences: FruitPreferences;
  };
  matches: {
    count: number;
    top_matches: TopMatch[];
  };
  llm_response: string;
  match_records: MatchRecord[];
}

/**
 * Conversation message for visualization
 */
export interface ConversationMessage {
  id: string;
  role: "fruit" | "system" | "result";
  content: string;
  timestamp: Date;
  metadata?: {
    fruitType?: "apple" | "orange";
    matches?: TopMatch[];
    preferences?: FruitPreferences;
  };
}

/**
 * A complete conversation (stored in Zustand)
 */
export interface Conversation {
  id: string;
  type: "apple" | "orange";
  fruitId: string;
  messages: ConversationMessage[];
  response: MatchmakingResponse;
  status: "active" | "completed" | "error";
  createdAt: Date;
}


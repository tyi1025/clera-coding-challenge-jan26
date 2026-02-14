// =============================================================================
// SHARED TYPE DEFINITIONS
// =============================================================================
// These types are used across API client, Zustand store, and components

/**
 * Fruit attributes - physical characteristics
 */
export interface FruitAttributes {
  color?: string;
  size?: number;
  sweetness?: number;
  tartness?: number;
  isOrganic?: boolean;
  ripeness?: number;
  hasSeeds?: boolean;
}

/**
 * Fruit preferences - what they're looking for in a match
 */
export interface FruitPreferences {
  minSize?: number;
  maxSize?: number;
  preferredColor?: string;
  minSweetness?: number;
  maxSweetness?: number;
  wantsOrganic?: boolean;
  hasSeeds?: boolean;
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
  communication: {
    attributes: string;
    preferences: string;
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


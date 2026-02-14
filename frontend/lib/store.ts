import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Effect, pipe, Either } from "effect";
import { fetchIncomingFruit } from "./api";
import { FetchError, ApiError } from "./utils";
import { generateId } from "./utils";
import type {
  Conversation,
  MatchmakingResponse,
  ConversationMessage,
  FruitAttributes,
  FruitPreferences,
} from "./types";

// Re-export types for convenience
export type { Conversation, ConversationMessage } from "./types";

// =============================================================================
// ADDITIONAL TYPES (matching backend schema)
// =============================================================================

export interface Apple {
  id: string;
  attributes: FruitAttributes;
  preferences: FruitPreferences;
  createdAt: Date;
}

export interface Orange {
  id: string;
  attributes: FruitAttributes;
  preferences: FruitPreferences;
  createdAt: Date;
}

export interface Match {
  id: string;
  appleId: string;
  orangeId: string;
  appleToOrangeScore: number;
  orangeToAppleScore: number;
  mutualScore: number;
  llmResponse: string;
  createdAt: Date;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Transforms an API response into a Conversation object for the store.
 * Creates message objects for the conversation visualization.
 */
function transformResponseToConversation(
  response: MatchmakingResponse
): Conversation {
  const conversationId = generateId();
  const now = new Date();

  const messages: ConversationMessage[] = [
    {
      id: generateId(),
      role: "fruit",
      content: response.communication.attributes,
      timestamp: now,
      metadata: {
        fruitType: response.fruit.type,
      },
    },
    {
      id: generateId(),
      role: "fruit",
      content: response.communication.preferences,
      timestamp: now,
      metadata: {
        fruitType: response.fruit.type,
      },
    },
    {
      id: generateId(),
      role: "system",
      content: `🔍 Analyzing compatibility with ${
        response.fruit.type === "apple" ? "oranges" : "apples"
      }...`,
      timestamp: now,
    },
    {
      id: generateId(),
      role: "result",
      content: response.llm_response,
      timestamp: now,
      metadata: {
        fruitType: response.fruit.type,
        matches: response.matches.top_matches,
        preferences: response.fruit.preferences,
      },
    },
  ];

  return {
    id: conversationId,
    type: response.fruit.type,
    fruitId: response.fruit.id,
    messages,
    response,
    status: "completed",
    createdAt: now,
  };
}

/**
 * Formats an error for display to the user
 */
function formatError(error: FetchError | ApiError): string {
  if (error._tag === "FetchError") {
    return `Network error: ${error.message}`;
  }
  return `API error (${error.status}): ${error.message}`;
}

// =============================================================================
// STORE STATE
// =============================================================================

interface MatchmakingState {
  // Data (matching backend schema)
  apples: Apple[];
  oranges: Orange[];
  matches: Match[];
  conversations: Conversation[];

  // UI State
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveConversation: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  addApple: (apple: Apple) => void;
  addOrange: (orange: Orange) => void;
  addMatches: (matches: Match[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Main action: Start a new matchmaking conversation
  startMatchmaking: (type: "apple" | "orange") => Promise<void>;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  apples: [],
  oranges: [],
  matches: [],
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  error: null,
};

// =============================================================================
// STORE
// =============================================================================

export const useMatchmakingStore = create<MatchmakingState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setActiveConversation: (id) => set({ activeConversationId: id }),

        addConversation: (conversation) =>
          set((state) => ({
            conversations: [...state.conversations, conversation],
          })),

        addApple: (apple) =>
          set((state) => ({
            apples: [...state.apples, apple],
          })),

        addOrange: (orange) =>
          set((state) => ({
            oranges: [...state.oranges, orange],
          })),

        addMatches: (matches) =>
          set((state) => ({
            matches: [...state.matches, ...matches],
          })),

        setLoading: (isLoading) => set({ isLoading }),

        setError: (error) => set({ error }),

        reset: () => set(initialState),

        // Main action: Start a new matchmaking conversation
        startMatchmaking: async (type) => {
          // Set loading state
          set({ isLoading: true, error: null });

          // Create Effect for API call
          const effect = fetchIncomingFruit(type);

          // Run the Effect and capture success or error
          const result = await Effect.runPromise(
            pipe(
              effect,
              Effect.either // Converts to Either.Right (success) or Either.Left (error)
            )
          );

          // Handle the result
          if (Either.isRight(result)) {
            // Success: Transform response into Conversation and add to store
            const response = result.right;
            const conversation = transformResponseToConversation(response);

            // Create Apple or Orange object
            if (type === "apple") {
              const apple: Apple = {
                id: response.fruit.id,
                attributes: response.fruit.attributes,
                preferences: response.fruit.preferences,
                createdAt: new Date(),
              };
              
              // Create Match objects (all matches for this apple)
              const matches: Match[] = response.match_records.map((record) => ({
                id: record.match_id,
                appleId: response.fruit.id,
                orangeId: record.orange_id!,
                appleToOrangeScore: record.score,
                orangeToAppleScore: record.mutual_score,
                mutualScore: record.mutual_score,
                llmResponse: response.llm_response,
                createdAt: new Date(),
              }));

              set((state) => ({
                conversations: [...state.conversations, conversation],
                apples: [...state.apples, apple],
                matches: [...state.matches, ...matches],
                activeConversationId: conversation.id,
                isLoading: false,
                error: null,
              }));
            } else {
              const orange: Orange = {
                id: response.fruit.id,
                attributes: response.fruit.attributes,
                preferences: response.fruit.preferences,
                createdAt: new Date(),
              };

              // Create Match objects (all matches for this orange)
              const matches: Match[] = response.match_records.map((record) => ({
                id: record.match_id,
                appleId: record.apple_id!,
                orangeId: response.fruit.id,
                appleToOrangeScore: record.mutual_score,
                orangeToAppleScore: record.score,
                mutualScore: record.mutual_score,
                llmResponse: response.llm_response,
                createdAt: new Date(),
              }));

              set((state) => ({
                conversations: [...state.conversations, conversation],
                oranges: [...state.oranges, orange],
                matches: [...state.matches, ...matches],
                activeConversationId: conversation.id,
                isLoading: false,
                error: null,
              }));
            }
          } else {
            // Error: Set error state
            const error = result.left;
            set({
              error: formatError(error),
              isLoading: false,
            });
          }
        },
      }),
      {
        name: "matchmaking-storage",
        // Persist apples, oranges, matches, and conversations
        partialize: (state) => ({
          apples: state.apples,
          oranges: state.oranges,
          matches: state.matches,
          conversations: state.conversations,
        }),
      }
    ),
    { name: "MatchmakingStore" }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

/**
 * Selector for the currently active conversation
 */
export const selectActiveConversation = (state: MatchmakingState) =>
  state.conversations.find((c) => c.id === state.activeConversationId);

/**
 * Selector for total conversation count
 */
export const selectConversationCount = (state: MatchmakingState) =>
  state.conversations.length;

/**
 * Selector for total apples
 */
export const selectAppleCount = (state: MatchmakingState) => state.apples.length;

/**
 * Selector for total oranges
 */
export const selectOrangeCount = (state: MatchmakingState) => state.oranges.length;

/**
 * Selector for total match count
 */
export const selectMatchCount = (state: MatchmakingState) => state.matches.length;

/**
 * Selector for average mutual match score
 */
export const selectAverageMatchScore = (state: MatchmakingState) => {
  if (state.matches.length === 0) return 0;
  const total = state.matches.reduce((sum, m) => sum + m.mutualScore, 0);
  return Math.round(total / state.matches.length);
};


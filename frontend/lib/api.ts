import { Effect } from "effect";
import { fetchJsonWithTimeout, FetchError, ApiError } from "./utils";
import type { MatchmakingResponse } from "./types";

// =============================================================================
// API CONFIGURATION
// =============================================================================

const SUPABASE_FUNCTIONS_URL = "http://127.0.0.1:54321/functions/v1";
const API_TIMEOUT_MS = 10000; // 10 seconds (accounts for LLM processing)

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * Fetches a new incoming apple and finds matches with oranges.
 * 
 * Returns an Effect that:
 * - Succeeds with MatchmakingResponse
 * - Fails with FetchError (network issues) or ApiError (HTTP errors)
 * 
 * @example
 * ```ts
 * const result = await Effect.runPromise(fetchIncomingApple());
 * ```
 */
export const fetchIncomingApple = (): Effect.Effect<
  MatchmakingResponse,
  FetchError | ApiError
> => {
  return fetchJsonWithTimeout<MatchmakingResponse>(
    `${SUPABASE_FUNCTIONS_URL}/get-incoming-apple`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
    API_TIMEOUT_MS
  );
};

/**
 * Fetches a new incoming orange and finds matches with apples.
 * 
 * Returns an Effect that:
 * - Succeeds with MatchmakingResponse
 * - Fails with FetchError (network issues) or ApiError (HTTP errors)
 * 
 * @example
 * ```ts
 * const result = await Effect.runPromise(fetchIncomingOrange());
 * ```
 */
export const fetchIncomingOrange = (): Effect.Effect<
  MatchmakingResponse,
  FetchError | ApiError
> => {
  return fetchJsonWithTimeout<MatchmakingResponse>(
    `${SUPABASE_FUNCTIONS_URL}/get-incoming-orange`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
    API_TIMEOUT_MS
  );
};

/**
 * Fetches a new fruit based on the type parameter.
 * Convenience function that dispatches to the correct endpoint.
 * 
 * @param type - Either "apple" or "orange"
 * @returns Effect that resolves to MatchmakingResponse
 */
export const fetchIncomingFruit = (
  type: "apple" | "orange"
): Effect.Effect<MatchmakingResponse, FetchError | ApiError> => {
  return type === "apple" ? fetchIncomingApple() : fetchIncomingOrange();
};


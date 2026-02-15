/**
 * SurrealDB Schema Definitions
 *
 * While SurrealDB is schemaless, this file documents the structure
 * and provides utilities for schema initialization.
 */

import type { Surreal } from "npm:surrealdb@latest";

// ============================================================================
// Schema Documentation
// ============================================================================

/**
 * APPLE TABLE
 * -----------
 * Stores all apples in the matchmaking system.
 *
 * Fields:
 * - id: string (auto-generated)
 * - attributes: FruitAttributes object
 * - preferences: FruitPreferences object (what they want in an orange)
 * - created_at: ISO 8601 timestamp string
 *
 * Indexes:
 * - created_at (for sorting)
 */

/**
 * ORANGE TABLE
 * ------------
 * Stores all oranges in the matchmaking system.
 *
 * Fields:
 * - id: string (auto-generated)
 * - attributes: FruitAttributes object
 * - preferences: FruitPreferences object (what they want in an apple)
 * - created_at: ISO 8601 timestamp string
 *
 * Indexes:
 * - created_at (for sorting)
 */

/**
 * MATCH TABLE
 * -----------
 * Stores matchmaking results between apples and oranges.
 * Explicit cross-type relationship - ensures type safety.
 *
 * Fields:
 * - id: string (auto-generated)
 * - apple_id: string (reference to apple table)
 * - orange_id: string (reference to orange table)
 * - apple_to_orange_score: number (0-1, how well apple's preferences match orange)
 * - orange_to_apple_score: number (0-1, how well orange's preferences match apple)
 * - mutual_score: number (0-1, overall compatibility)
 * - llm_response: string (natural language explanation from LLM)
 * - created_at: ISO 8601 timestamp string
 *
 * Indexes:
 * - apple_id (for finding matches for specific apples)
 * - orange_id (for finding matches for specific oranges)
 * - mutual_score (for finding best matches)
 * - created_at (for sorting)
 */

// ============================================================================
// Schema Initialization
// ============================================================================

/**
 * Initializes the database schema with tables and indexes.
 * This is optional as SurrealDB is schemaless, but helps with performance.
 */
export async function initializeSchema(db: Surreal): Promise<void> {
  console.log("🔧 Initializing database schema...");

  try {
    // Define the apple table with indexes
    await db.query(`
      DEFINE TABLE IF NOT EXISTS apple SCHEMAFULL;
      DEFINE FIELD IF NOT EXISTS attributes ON TABLE apple TYPE object;
      DEFINE FIELD IF NOT EXISTS preferences ON TABLE apple TYPE object;
      DEFINE FIELD IF NOT EXISTS created_at ON TABLE apple TYPE datetime;
      DEFINE INDEX IF NOT EXISTS idx_apple_created ON TABLE apple COLUMNS created_at;
    `);

    // Define the orange table with indexes
    await db.query(`
      DEFINE TABLE IF NOT EXISTS orange SCHEMAFULL;
      DEFINE FIELD IF NOT EXISTS attributes ON TABLE orange TYPE object;
      DEFINE FIELD IF NOT EXISTS preferences ON TABLE orange TYPE object;
      DEFINE FIELD IF NOT EXISTS created_at ON TABLE orange TYPE datetime;
      DEFINE INDEX IF NOT EXISTS idx_orange_created ON TABLE orange COLUMNS created_at;
    `);

    // Define the match table with indexes
    await db.query(`
      DEFINE TABLE IF NOT EXISTS match SCHEMAFULL;
      DEFINE FIELD IF NOT EXISTS apple_id ON TABLE match TYPE string;
      DEFINE FIELD IF NOT EXISTS orange_id ON TABLE match TYPE string;
      DEFINE FIELD IF NOT EXISTS apple_to_orange_score ON TABLE match TYPE number;
      DEFINE FIELD IF NOT EXISTS orange_to_apple_score ON TABLE match TYPE number;
      DEFINE FIELD IF NOT EXISTS mutual_score ON TABLE match TYPE number;
      DEFINE FIELD IF NOT EXISTS llm_response ON TABLE match TYPE string;
      DEFINE FIELD IF NOT EXISTS created_at ON TABLE match TYPE datetime;
      DEFINE INDEX IF NOT EXISTS idx_match_apple ON TABLE match COLUMNS apple_id;
      DEFINE INDEX IF NOT EXISTS idx_match_orange ON TABLE match COLUMNS orange_id;
      DEFINE INDEX IF NOT EXISTS idx_match_score ON TABLE match COLUMNS mutual_score;
      DEFINE INDEX IF NOT EXISTS idx_match_created ON TABLE match COLUMNS created_at;
    `);

    console.log("✅ Schema initialized successfully");
  } catch (error) {
    console.error("❌ Schema initialization failed:", error);
    throw error;
  }
}


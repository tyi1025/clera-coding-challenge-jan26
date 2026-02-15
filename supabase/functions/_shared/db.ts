/**
 * SurrealDB Connection Layer
 *
 * Provides a shared connection to the local SurrealDB instance
 * for all edge functions.
 */

import Surreal from "npm:surrealdb@latest";
import type { Fruit } from "./generateFruit.ts";

// ============================================================================
// Configuration
// ============================================================================

// Use host.docker.internal for Docker Desktop (Mac/Windows)
// or the SURREALDB_URL environment variable if set
const DB_URL = Deno.env.get("SURREALDB_URL") || "ws://host.docker.internal:8000";
const DB_NAMESPACE = "test";
const DB_DATABASE = "test";
const DB_USERNAME = "root";
const DB_PASSWORD = "root";

// ============================================================================
// Types
// ============================================================================

export interface StoredApple {
  id: string;
  attributes: Fruit["attributes"];
  preferences: Fruit["preferences"];
  created_at: string;
}

export interface StoredOrange {
  id: string;
  attributes: Fruit["attributes"];
  preferences: Fruit["preferences"];
  created_at: string;
}

export interface Match {
  id?: string;
  apple_id: string;
  orange_id: string;
  apple_to_orange_score: number;
  orange_to_apple_score: number;
  mutual_score: number;
  llm_response: string;
  created_at: string;
}

// ============================================================================
// Connection Management
// ============================================================================

let db: Surreal | null = null;

/**
 * Gets or creates a SurrealDB connection.
 * Reuses existing connection if available.
 */
export async function getDB(): Promise<Surreal> {
  if (db) {
    return db;
  }

  db = new Surreal();

  try {
    await db.connect(DB_URL);
    await db.signin({
      username: DB_USERNAME,
      password: DB_PASSWORD,
    });
    await db.use({ namespace: DB_NAMESPACE, database: DB_DATABASE });

    console.log("✅ Connected to SurrealDB");
    return db;
  } catch (error) {
    console.error("❌ Failed to connect to SurrealDB:", error);
    db = null;
    throw new Error(
      `SurrealDB connection failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Closes the SurrealDB connection.
 */
export async function closeDB(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log("✅ Closed SurrealDB connection");
  }
}

// ============================================================================
// Apple Operations
// ============================================================================

/**
 * Stores a new apple in the database.
 */
export async function storeApple(fruit: Fruit): Promise<StoredApple> {
  const database = await getDB();

  const result = await database.create<StoredApple>("apple", {
    attributes: fruit.attributes,
    preferences: fruit.preferences,
    created_at: new Date().toISOString(),
  });

  if (!result || (Array.isArray(result) && result.length === 0)) {
    throw new Error("Failed to store apple in database: No result returned from database operation");
  }

  return Array.isArray(result) ? result[0] : result;
}

/**
 * Retrieves all apples from the database.
 */
export async function getAllApples(): Promise<StoredApple[]> {
  const database = await getDB();

  const results = await database.query<[StoredApple[]]>(
    "SELECT * FROM apple ORDER BY created_at DESC"
  );

  if (!results || results.length === 0) {
    return [];
  }

  return results[0] || [];
}

/**
 * Gets total count of apples.
 */
export async function getAppleCount(): Promise<number> {
  const database = await getDB();

  const results = await database.query<[{ count: number }[]]>(
    "SELECT count() AS count FROM apple GROUP ALL"
  );

  return results[0]?.[0]?.count || 0;
}

// ============================================================================
// Orange Operations
// ============================================================================

/**
 * Stores a new orange in the database.
 */
export async function storeOrange(fruit: Fruit): Promise<StoredOrange> {
  const database = await getDB();

  const result = await database.create<StoredOrange>("orange", {
    attributes: fruit.attributes,
    preferences: fruit.preferences,
    created_at: new Date().toISOString(),
  });

  if (!result || (Array.isArray(result) && result.length === 0)) {
    throw new Error("Failed to store orange in database: No result returned from database operation");
  }

  return Array.isArray(result) ? result[0] : result;
}

/**
 * Retrieves all oranges from the database.
 */
export async function getAllOranges(): Promise<StoredOrange[]> {
  const database = await getDB();

  const results = await database.query<[StoredOrange[]]>(
    "SELECT * FROM orange ORDER BY created_at DESC"
  );

  if (!results || results.length === 0) {
    return [];
  }

  return results[0] || [];
}

/**
 * Gets total count of oranges.
 */
export async function getOrangeCount(): Promise<number> {
  const database = await getDB();

  const results = await database.query<[{ count: number }[]]>(
    "SELECT count() AS count FROM orange GROUP ALL"
  );

  return results[0]?.[0]?.count || 0;
}

// ============================================================================
// Combined Queries
// ============================================================================

/**
 * Gets total count of all fruits by type.
 */
export async function getFruitCounts(): Promise<{
  totalApples: number;
  totalOranges: number;
  total: number;
}> {
  const appleCount = await getAppleCount();
  const orangeCount = await getOrangeCount();

  return {
    totalApples: appleCount,
    totalOranges: orangeCount,
    total: appleCount + orangeCount,
  };
}

// ============================================================================
// Match Operations
// ============================================================================

/**
 * Stores a new match in the database.
 */
export async function storeMatch(match: Omit<Match, "id">): Promise<Match> {
  const database = await getDB();

  const result = await database.create<Match>("match", match);

  if (!result || (Array.isArray(result) && result.length === 0)) {
    throw new Error("Failed to store match in database: No result returned from database operation");
  }

  return Array.isArray(result) ? result[0] : result;
}

/**
 * Retrieves all matches.
 */
export async function getAllMatches(): Promise<Match[]> {
  const database = await getDB();

  const results = await database.query<[Match[]]>(
    "SELECT * FROM match ORDER BY created_at DESC"
  );

  if (!results || results.length === 0) {
    return [];
  }

  return results[0] || [];
}

/**
 * Gets total count of matches.
 */
export async function getMatchCount(): Promise<number> {
  const database = await getDB();

  const results = await database.query<[{ count: number }[]]>(
    "SELECT count() AS count FROM match GROUP ALL"
  );

  return results[0]?.[0]?.count || 0;
}

/**
 * Gets recent matches with fruit details.
 */
export async function getRecentMatches(limit = 10): Promise<
  Array<
    Match & {
      apple?: StoredApple;
      orange?: StoredOrange;
    }
  >
> {
  const database = await getDB();

  const results = await database.query<
    [
      Array<
        Match & {
          apple?: StoredApple;
          orange?: StoredOrange;
        }
      >
    ]
  >(
    `
    SELECT 
      *,
      (SELECT * FROM $parent.apple_id)[0] AS apple,
      (SELECT * FROM $parent.orange_id)[0] AS orange
    FROM match 
    ORDER BY created_at DESC 
    LIMIT $limit
  `,
    { limit }
  );

  if (!results || results.length === 0) {
    return [];
  }

  return results[0] || [];
}


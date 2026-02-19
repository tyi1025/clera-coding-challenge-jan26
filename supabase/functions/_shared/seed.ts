/**
 * Database Seed Script
 *
 * Loads the initial 40 fruits from raw_apples_and_oranges.json
 * into the SurrealDB database.
 */

import { getDB, getFruitCounts, storeApple, storeOrange } from "./db.ts";
import { initializeSchema } from "./schema.ts";
import type { Fruit } from "./generateFruit.ts";

// ============================================================================
// Seed Data Loading
// ============================================================================

/**
 * Loads seed data from the JSON file.
 */
async function loadSeedData(): Promise<Fruit[]> {
  // Read the seed data file
  const dataPath = new URL("../../../data/raw_apples_and_oranges.json", import.meta.url);
  
  try {
    const fileContent = await Deno.readTextFile(dataPath);
    const fruits = JSON.parse(fileContent) as Fruit[];
    
    console.log(`📦 Loaded ${fruits.length} fruits from seed file`);
    return fruits;
  } catch (error) {
    console.error("❌ Failed to load seed data:", error);
    throw new Error(`Could not read seed data: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Seeds the database with initial fruit data.
 * Skips if fruits already exist in the database.
 */
export async function seedDatabase(force = false): Promise<void> {
  console.log("🌱 Starting database seed...");

  try {
    const db = await getDB();

    // Initialize schema first
    await initializeSchema(db);

    // Check if database already has fruits
    const counts = await getFruitCounts();
    
    if (counts.total > 0 && !force) {
      console.log(`ℹ️  Database already has ${counts.total} fruits. Skipping seed.`);
      console.log(`   Use force=true to reseed.`);
      return;
    }

    if (force && counts.total > 0) {
      console.log(`⚠️  Force flag set. Clearing existing ${counts.total} fruits...`);
      await db.query("DELETE FROM apple; DELETE FROM orange;");
    }

    // Load seed data
    const fruits = await loadSeedData();

    // Insert all fruits into their respective tables
    console.log(`📥 Inserting ${fruits.length} fruits...`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const fruit of fruits) {
      try {
        if (fruit.type === "apple") {
          await storeApple(fruit);
        } else {
          await storeOrange(fruit);
        }
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to insert ${fruit.type}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Seed complete: ${successCount} inserted, ${errorCount} errors`);

    // Show final counts
    const finalCounts = await getFruitCounts();
    console.log(`📊 Database now has:`);
    console.log(`   - ${finalCounts.totalApples} apples`);
    console.log(`   - ${finalCounts.totalOranges} oranges`);
    console.log(`   - ${finalCounts.total} total fruits`);

  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

// ============================================================================
// CLI Execution
// ============================================================================

/**
 * Run seed script from command line.
 * Usage: deno run --allow-net --allow-read seed.ts [--force]
 */
if (import.meta.main) {
  const force = Deno.args.includes("--force");
  
  console.log("🚀 Running seed script...");
  if (force) {
    console.log("⚠️  Force mode enabled - will clear existing data");
  }

  try {
    await seedDatabase(force);
    console.log("✅ Seed script completed successfully");
    Deno.exit(0);
  } catch (error) {
    console.error("❌ Seed script failed:", error);
    Deno.exit(1);
  }
}


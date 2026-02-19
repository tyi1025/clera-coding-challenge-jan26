# Shared Edge Function Utilities

This directory contains shared code used across multiple Supabase Edge Functions.

## Files

### `generateFruit.ts`
Fruit generation and communication utilities.
- `generateApple()` / `generateOrange()` - Generate random fruits
- `communicateAttributes(fruit)` - Natural language descriptions of fruit attributes
- `communicatePreferences(fruit)` - Natural language descriptions of preferences

### `db.ts`
SurrealDB connection and database operations.
- Connection management with singleton pattern
- Type-safe CRUD operations for fruits and matches
- Query helpers for statistics and analytics

### `schema.ts`
Database schema definitions and initialization.
- Schema documentation for `fruit` and `match` tables
- `initializeSchema()` - Set up tables and indexes
- `clearDatabase()` - Reset database for testing

### `seed.ts`
Database seeding script.
- Loads initial 40 fruits from `data/raw_apples_and_oranges.json`
- Can be run as a CLI script or imported as a module
- Safe to run multiple times (checks for existing data)

## Usage

### Seeding the Database

From the command line:
```bash
cd supabase/functions/_shared
deno run --allow-net --allow-read seed.ts
```

To force reseed (clear and reload):
```bash
deno run --allow-net --allow-read seed.ts --force
```

From code:
```typescript
import { seedDatabase } from "./_shared/seed.ts";

// Seed if empty
await seedDatabase();

// Force reseed
await seedDatabase(true);
```

## Database Connection

The database connection is configured in `db.ts`:
- URL: `ws://127.0.0.1:8000`
- Username: `root`
- Password: `root`
- Namespace: `test`
- Database: `test`

Make sure your local SurrealDB instance is running before using these utilities.


import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const databaseFile = path.join(process.cwd(), "data", "rosemary.db");

type DatabaseCache = {
  rosemaryDb?: Database.Database;
};

const globalForDb = globalThis as typeof globalThis & DatabaseCache;

function prepareDatabase() {
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

  const db = new Database(databaseFile);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const columns = db.prepare("PRAGMA table_info(locations)").all() as { name: string }[];
  const hasPhotoColumn = columns.some((column) => column.name === "photo_path");
  if (!hasPhotoColumn) {
    db.exec("ALTER TABLE locations ADD COLUMN photo_path TEXT");
  }

  return db;
}

export function getDb() {
  if (!globalForDb.rosemaryDb) {
    globalForDb.rosemaryDb = prepareDatabase();
  }
  return globalForDb.rosemaryDb;
}

export type LocationRecord = {
  id: number;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  added_at: string;
  photo_path: string | null;
};

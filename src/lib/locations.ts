import { getDb, type LocationRecord } from "@/lib/db";

export type NewLocation = {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  photoPath?: string | null;
};

const selectableFields = `
  id,
  name,
  description,
  latitude,
  longitude,
  added_at,
  photo_path
`;

export function listLocations(): LocationRecord[] {
  const db = getDb();
  const stmt = db.prepare(`SELECT ${selectableFields} FROM locations ORDER BY added_at DESC`);
  return stmt.all() as LocationRecord[];
}

export function createLocation(newLocation: NewLocation): LocationRecord {
  const db = getDb();
  const insert = db.prepare(
    `
      INSERT INTO locations (name, description, latitude, longitude, photo_path)
      VALUES (@name, @description, @latitude, @longitude, @photo_path)
    `,
  );

  const result = insert.run({
    name: newLocation.name,
    description: newLocation.description ?? null,
    latitude: newLocation.latitude,
    longitude: newLocation.longitude,
    photo_path: newLocation.photoPath ?? null,
  });

  const lookup = db.prepare(`SELECT ${selectableFields} FROM locations WHERE id = ?`);
  return lookup.get(result.lastInsertRowid) as LocationRecord;
}

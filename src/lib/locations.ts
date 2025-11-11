import { supabase } from "@/lib/supabase";

export type NewLocation = {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  photoUrl?: string | null;
};

export type LocationRecord = {
  id: number;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  inserted_at: string;
};

const tableName = "rosemary_locations";

export async function listLocations(): Promise<LocationRecord[]> {
  const { data, error } = await supabase.from(tableName).select("*").order("inserted_at", { ascending: false });
  if (error) {
    console.error("Failed to list locations", error);
    throw error;
  }
  return data ?? [];
}

export async function createLocation(newLocation: NewLocation): Promise<LocationRecord> {
  const { data, error } = await supabase
    .from(tableName)
    .insert({
      name: newLocation.name,
      description: newLocation.description ?? null,
      latitude: newLocation.latitude,
      longitude: newLocation.longitude,
      photo_url: newLocation.photoUrl ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create location", error);
    throw error;
  }

  return data;
}

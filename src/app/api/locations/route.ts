import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { createLocation, listLocations } from "@/lib/locations";
import { supabase } from "@/lib/supabase";
import { locationInputSchema } from "@/lib/validation";

const PHOTO_BUCKET = "rosemary-photos";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radiusParam = searchParams.get("radius");

  const records = await listLocations();
  const locations = records.map((record) => ({
    id: record.id,
    name: record.name,
    description: record.description,
    latitude: record.latitude,
    longitude: record.longitude,
    added_at: record.inserted_at,
    photoUrl: record.photo_url,
  }));

  if (lat && lng && radiusParam) {
    const latitude = Number.parseFloat(lat);
    const longitude = Number.parseFloat(lng);
    const radiusKm = Number.parseFloat(radiusParam);

    if (Number.isFinite(latitude) && Number.isFinite(longitude) && Number.isFinite(radiusKm)) {
      const filtered = locations.filter((location) => {
        const distance = haversineDistance(latitude, longitude, location.latitude, location.longitude);
        return distance <= radiusKm;
      });
      return NextResponse.json({ locations: filtered });
    }
  }

  return NextResponse.json({ locations });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    const payload = {
      name: formData.get("name"),
      description: formData.get("description") ?? undefined,
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
    };

    const parsed = locationInputSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    let photoUrl: string | null = null;
    const photo = formData.get("photo");
    if (photo && typeof photo === "object" && "arrayBuffer" in photo && photo.size > 0) {
      const arrayBuffer = await photo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const extension = photo.name.split(".").pop() ?? "jpg";
      const objectPath = `photos/${uuidv4()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(objectPath, buffer, {
          contentType: photo.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError?.message.includes("bucket not found")) {
        await supabase.storage.createBucket(PHOTO_BUCKET, { public: true });
        const retry = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(objectPath, buffer, {
            contentType: photo.type || "image/jpeg",
            upsert: false,
          });
        if (retry.error) {
          console.error("Failed to upload photo to Supabase", retry.error);
          return NextResponse.json({ error: "Unable to upload photo" }, { status: 500 });
        }
      } else if (uploadError) {
        console.error("Failed to upload photo to Supabase", uploadError);
        return NextResponse.json({ error: "Unable to upload photo" }, { status: 500 });
      }

      const { data: publicUrlData } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(objectPath);
      photoUrl = publicUrlData.publicUrl;
    }

    const record = await createLocation({ ...parsed.data, photoUrl });

    return NextResponse.json(
      {
        location: {
          id: record.id,
          name: record.name,
          description: record.description,
          latitude: record.latitude,
          longitude: record.longitude,
          added_at: record.inserted_at,
          photoUrl: record.photo_url,
        },
      },
      { status: 201 },
    );
  }

  const payload = await request.json();

  const parsed = locationInputSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const record = await createLocation(parsed.data);

  return NextResponse.json(
    {
      location: {
        id: record.id,
        name: record.name,
        description: record.description,
        latitude: record.latitude,
        longitude: record.longitude,
        added_at: record.inserted_at,
        photoUrl: record.photo_url,
      },
    },
    { status: 201 },
  );
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  earthRadiusKm = 6371,
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

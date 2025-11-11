import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";

import { createLocation, listLocations } from "@/lib/locations";
import { locationInputSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radiusParam = searchParams.get("radius");

  const locations = listLocations().map(({ photo_path, ...rest }) => ({
    ...rest,
    photoUrl: photo_path ? `/${photo_path}` : null,
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

    let photoPath: string | null = null;
    const photo = formData.get("photo");
    if (photo && typeof photo === "object" && "arrayBuffer" in photo && photo.size > 0) {
      const arrayBuffer = await photo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      fs.mkdirSync(uploadsDir, { recursive: true });
      const extension = path.extname(photo.name) || ".jpg";
      const filename = `${crypto.randomUUID()}${extension}`;
      const targetPath = path.join(uploadsDir, filename);
      fs.writeFileSync(targetPath, buffer);
      photoPath = path.posix.join("uploads", filename);
    }

    const record = createLocation({ ...parsed.data, photoPath });

    const { photo_path, ...rest } = record;

    return NextResponse.json(
      {
        location: {
          ...rest,
          photoUrl: photo_path ? `/${photo_path}` : null,
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

  const record = createLocation(parsed.data);

  const { photo_path, ...rest } = record;

  return NextResponse.json(
    {
      location: {
        ...rest,
        photoUrl: photo_path ? `/${photo_path}` : null,
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

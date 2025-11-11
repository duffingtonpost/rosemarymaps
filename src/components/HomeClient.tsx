"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import AddLocationForm from "@/components/add-location-form/AddLocationForm";
import styles from "@/components/home-client/HomeClient.module.css";
import TopNav from "@/components/navigation/TopNav";
import type { RosemaryLocation } from "@/types";

const RosemaryMap = dynamic(() => import("@/components/rosemary-map/RosemaryMap"), {
  ssr: false,
});

type FetchResponse = {
  locations: RosemaryLocation[];
};

const fetcher = async (url: string): Promise<FetchResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load locations");
  }
  return response.json();
};

type Coordinates = [number, number];

function toDistanceInKm(coordsA: Coordinates | null, coordsB: Coordinates): number | null {
  if (!coordsA) {
    return null;
  }

  const [lat1, lon1] = coordsA;
  const [lat2, lon2] = coordsB;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export default function HomeClient() {
  const { data, error, isLoading, mutate } = useSWR("/api/locations", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60_000,
  });

  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geolocationAvailable, setGeolocationAvailable] = useState(false);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeolocationAvailable(false);
      return;
    }

    setGeolocationAvailable(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = [position.coords.latitude, position.coords.longitude];
        setUserCoords(coords);
        setGeolocationError(null);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeolocationError("Location access was denied. Enable it to drop a pin where you are.");
        }
      },
    );
  }, []);

  const sortedLocations = useMemo(() => {
    if (!data?.locations) {
      return [];
    }

    return [...data.locations].sort((a, b) => {
      const distanceA = toDistanceInKm(userCoords, [a.latitude, a.longitude]);
      const distanceB = toDistanceInKm(userCoords, [b.latitude, b.longitude]);

      if (distanceA === null && distanceB === null) {
        return a.name.localeCompare(b.name);
      }
      if (distanceA === null) {
        return 1;
      }
      if (distanceB === null) {
        return -1;
      }
      return distanceA - distanceB;
    });
  }, [data?.locations, userCoords]);

  const handleMapClick = useCallback((coords: Coordinates) => {
    setSelectedCoords(coords);
    setIsFormOpen(true);
  }, []);

  const handleUseCurrentLocation = useCallback(() => {
    if (userCoords) {
      setSelectedCoords(userCoords);
      setIsFormOpen(true);
      setGeolocationError(null);
      return;
    }

    if (!("geolocation" in navigator)) {
      setGeolocationError("Your browser does not support locating you automatically.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = [position.coords.latitude, position.coords.longitude];
        setUserCoords(coords);
        setSelectedCoords(coords);
        setIsFormOpen(true);
        setGeolocationError(null);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeolocationError("We need permission to use your location.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGeolocationError("We couldn't determine your position. Try again in a moment.");
        } else if (error.code === error.TIMEOUT) {
          setGeolocationError("Locating timed out. Try again.");
        } else {
          setGeolocationError("Something went wrong when trying to use your location.");
        }
      },
    );
  }, [userCoords]);

  const handleAddLocation = useCallback(
    async (input: { name: string; description?: string; latitude: number; longitude: number; photo?: File | null }) => {
      setIsSubmitting(true);
      try {
        const formData = new FormData();
        formData.append("name", input.name);
        if (input.description) {
          formData.append("description", input.description);
        }
        formData.append("latitude", input.latitude.toString());
        formData.append("longitude", input.longitude.toString());
        if (input.photo) {
          formData.append("photo", input.photo);
        }

        const response = await fetch("/api/locations", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const message = await response.json().catch(() => ({}));
          throw new Error(message.error ?? "Unable to add location");
        }

        await mutate();
        setSelectedCoords(null);
        setIsSubmitting(false);
      } catch (err) {
        console.error(err);
        setIsSubmitting(false);
        throw err;
      }
    },
    [mutate],
  );

  const formCoordinates = selectedCoords ?? userCoords ?? undefined;

  return (
    <>
      <TopNav />
      <div className={styles.container}>
        <section className={styles.mapSection}>
          <RosemaryMap
            locations={data?.locations ?? []}
            userLocation={userCoords}
            onMapClick={handleMapClick}
            highlightCoords={selectedCoords}
          />
        </section>
        <section className={styles.panel}>
          <h2>Nearby rosemary</h2>
          {error && <p className={styles.error}>Could not load locations. Please refresh.</p>}
          {isLoading && <p>Loading rosemary near you...</p>}
          {!isLoading && sortedLocations.length === 0 && (
            <p>No rosemary spots yet. Be the first to add one!</p>
          )}
          <ul className={styles.locationList}>
            {sortedLocations.map((location) => {
              const distanceKm = toDistanceInKm(userCoords, [location.latitude, location.longitude]);
              const distanceLabel =
                distanceKm === null ? "Distance unknown" : `${distanceKm.toFixed(2)} km away`;
              const directionsUrl = new URL("https://www.google.com/maps/dir/");
              directionsUrl.searchParams.set("api", "1");
              directionsUrl.searchParams.set("destination", `${location.latitude},${location.longitude}`);
              if (userCoords) {
                directionsUrl.searchParams.set("origin", `${userCoords[0]},${userCoords[1]}`);
              }
              return (
                <li key={location.id} className={styles.locationItem}>
                  {location.photoUrl && (
                    <div className={styles.locationImageWrapper}>
                      <Image
                        src={location.photoUrl}
                        alt={`Photo of ${location.name}`}
                        fill
                        className={styles.locationImage}
                      />
                    </div>
                  )}
                  <div className={styles.locationHeading}>
                    <strong>{location.name}</strong>
                    <span className={styles.locationDistance}>{distanceLabel}</span>
                  </div>
                  {location.description && (
                    <p className={styles.locationDescription}>{location.description}</p>
                  )}
                  <div className={styles.locationActions}>
                    <button
                      type="button"
                      className={styles.focusButton}
                      onClick={() => setSelectedCoords([location.latitude, location.longitude])}
                    >
                      Show on map
                    </button>
                    <a
                      href={directionsUrl.toString()}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.directionLink}
                    >
                      Get directions
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <section className={styles.panel}>
          <h2>Add a rosemary spot</h2>
          <p className={styles.panelHint}>
            Tap the map or use your current location to drop a pin, then share tips so others can enjoy the plant.
          </p>
          {isFormOpen ? (
            <AddLocationForm
              onSubmit={handleAddLocation}
              submitting={isSubmitting}
              coordinates={formCoordinates}
              onCancel={() => setIsFormOpen(false)}
              canUseCurrentLocation={geolocationAvailable}
              onUseCurrentLocation={handleUseCurrentLocation}
              geoError={geolocationError}
            />
          ) : (
            <button type="button" className={styles.inlineAddButton} onClick={() => setIsFormOpen(true)}>
              Open add form
            </button>
          )}
        </section>
      </div>
    </>
  );
}

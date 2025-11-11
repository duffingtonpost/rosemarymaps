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
    // setIsFormOpen(true); // Removed as per edit hint
  }, []);

  const handleUseCurrentLocation = useCallback(() => {
    if (userCoords) {
      setSelectedCoords(userCoords);
      // setIsFormOpen(true); // Removed as per edit hint
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
        // setIsFormOpen(true); // Removed as per edit hint
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
      <div className={styles.pageLayout}>
        <div className={styles.inventoryColumn}>
          <header className={styles.sectionIntro}>
            <h1>{sortedLocations.length > 0 ? `${sortedLocations.length} rosemary spots nearby` : "Find rosemary near you"}</h1>
            <p>
              Browse community-shared rosemary plants. Click a card to focus the map or grab directions for a quick
              harvest.
            </p>
          </header>
          <div className={styles.cardGrid}>
            {sortedLocations.length === 0 && !isLoading && !error && (
              <div className={styles.emptyState}>
                <h3>No rosemary yet</h3>
                <p>Be the first to add a public rosemary plant in your neighborhood.</p>
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("add-rosemary")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Add a rosemary spot
                </button>
              </div>
            )}
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
                 <article
                   key={location.id}
                   className={styles.locationCard}
                   onClick={() => setSelectedCoords([location.latitude, location.longitude])}
                   onKeyDown={(event) => {
                     if (event.key === "Enter" || event.key === " ") {
                       event.preventDefault();
                       setSelectedCoords([location.latitude, location.longitude]);
                     }
                   }}
                   role="button"
                   tabIndex={0}
                 >
                   <div className={styles.cardImageWrapper}>
                     {location.photoUrl ? (
                       <Image
                         src={location.photoUrl}
                         alt={`Photo of ${location.name}`}
                         fill
                         className={styles.cardImage}
                       />
                     ) : (
                       <div className={styles.photoPlaceholder}>🌿</div>
                     )}
                     <span className={styles.cardIndicator}>• • •</span>
                   </div>
                   <div className={styles.cardBody}>
                     <div className={styles.cardHeading}>
                       <h3>{location.name}</h3>
                     </div>
                     {location.description && <p>{location.description}</p>}
                     <span className={styles.cardSubtle}>{distanceLabel}</span>
                   </div>
                   <div className={styles.cardFooter}>
                    <button
                      type="button"
                      className={styles.iconPill}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedCoords([location.latitude, location.longitude]);
                      }}
                      aria-label="Show on map"
                    >
                      👁️
                    </button>
                    <a
                      href={directionsUrl.toString()}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className={styles.iconPill}
                      aria-label="Get directions"
                    >
                      ➜
                    </a>
                   </div>
                 </article>
               );
             })}
          </div>
          <section className={styles.addCard} id="add-rosemary">
            <div className={styles.addCardHeader}>
              <h2>Share a rosemary spot</h2>
              <p>Drop a pin, add a photo, and tell others how to find it.</p>
            </div>
            <AddLocationForm
              onSubmit={handleAddLocation}
              submitting={isSubmitting}
              coordinates={formCoordinates}
              canUseCurrentLocation={geolocationAvailable}
              onUseCurrentLocation={handleUseCurrentLocation}
              geoError={geolocationError}
            />
          </section>
        </div>
        <div className={styles.mapColumn}>
          <div className={styles.mapShell}>
            <RosemaryMap
              locations={data?.locations ?? []}
              userLocation={userCoords}
              onMapClick={handleMapClick}
              highlightCoords={selectedCoords}
            />
          </div>
        </div>
      </div>
    </>
  );
}

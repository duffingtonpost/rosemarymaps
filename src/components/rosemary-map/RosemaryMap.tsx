"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

import styles from "@/components/rosemary-map/RosemaryMap.module.css";
import type { RosemaryLocation } from "@/types";

const rosemaryIcon = L.divIcon({
  className: "",
  html: `<div class="${styles.leafMarker}">🌿</div>`,
  iconAnchor: [16, 32],
  popupAnchor: [0, -24],
  iconSize: [32, 40],
});

type Coordinates = [number, number];

type RosemaryMapProps = {
  locations: RosemaryLocation[];
  userLocation: Coordinates | null;
  onMapClick?: (coords: Coordinates) => void;
  highlightCoords?: Coordinates | null;
};

const defaultCenter: Coordinates = [37.7749, -122.4194];

function MapClickHandler({ onMapClick }: { onMapClick?: (coords: Coordinates) => void }) {
  useMapEvents({
    click(event) {
      onMapClick?.([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

function MapHighlight({ coords }: { coords: Coordinates | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!coords) {
      return;
    }
    map.flyTo(coords, Math.max(map.getZoom(), 16), { duration: 0.75 });
  }, [coords, map]);
  return null;
}

function UserLocationWatcher({
  userLocation,
  highlightCoords,
}: {
  userLocation: Coordinates | null;
  highlightCoords: Coordinates | null | undefined;
}) {
  const map = useMap();
  const previousLocation = useRef<Coordinates | null>(null);

  useEffect(() => {
    if (!userLocation) {
      previousLocation.current = null;
      return;
    }

    if (highlightCoords) {
      return;
    }

    const hasChanged =
      !previousLocation.current ||
      previousLocation.current[0] !== userLocation[0] ||
      previousLocation.current[1] !== userLocation[1];

    if (hasChanged) {
      previousLocation.current = userLocation;
      map.flyTo(userLocation, Math.max(map.getZoom(), 14), { duration: 0.75 });
    }
  }, [highlightCoords, map, userLocation]);

  return null;
}

export default function RosemaryMap({
  locations,
  userLocation,
  onMapClick,
  highlightCoords,
}: RosemaryMapProps) {
  const startCenter = userLocation ?? highlightCoords ?? defaultCenter;

  return (
    <div className={styles.wrapper}>
      <MapContainer
        center={startCenter}
        zoom={userLocation || highlightCoords ? 14 : 12}
        className={styles.map}
        scrollWheelZoom
      >
        <TileLayer
          attribution='
            &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>
            contributors &copy; <a href="https://carto.com/attributions">CARTO</a>
          '
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapClickHandler onMapClick={onMapClick} />
        <MapHighlight coords={highlightCoords} />
        <UserLocationWatcher userLocation={userLocation} highlightCoords={highlightCoords} />
        {userLocation && (
          <CircleMarker center={userLocation} radius={10} pathOptions={{ color: "#0f766e", fillOpacity: 0.45 }}>
            <Popup>You&apos;re here</Popup>
          </CircleMarker>
        )}
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            title={location.name}
            icon={rosemaryIcon}
          >
            <Popup>
              {location.photoUrl && (
                <div className={styles.popupImageWrapper}>
                  <Image
                    src={location.photoUrl}
                    alt={`Photo of ${location.name}`}
                    fill
                    className={styles.popupImage}
                  />
                </div>
              )}
              <strong>{location.name}</strong>
              {location.description && <p className={styles.popupDescription}>{location.description}</p>}
              <p className={styles.popupMeta}>
                Added on {new Date(location.added_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </Popup>
          </Marker>
        ))}
        {highlightCoords && (
          <CircleMarker center={highlightCoords} radius={14} pathOptions={{ color: "#be123c", fillOpacity: 0 }}>
            <Popup>Selected location</Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}

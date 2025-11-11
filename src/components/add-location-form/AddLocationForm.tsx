"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import styles from "@/components/add-location-form/AddLocationForm.module.css";
import { locationInputSchema, type LocationInput } from "@/lib/validation";

type Coordinates = [number, number];

type AddLocationFormProps = {
  onSubmit: (data: LocationInput & { photo?: File | null }) => Promise<void>;
  submitting: boolean;
  coordinates?: Coordinates;
  onCancel?: () => void;
  canUseCurrentLocation?: boolean;
  onUseCurrentLocation?: () => void;
  geoError?: string | null;
};

type FormErrors = Partial<Record<keyof LocationInput, string>> & { form?: string };

type FormState = {
  name: string;
  description: string;
};

function deriveInitialState(): FormState {
  return {
    name: "",
    description: "",
  };
}

export default function AddLocationForm({
  onSubmit,
  submitting,
  coordinates,
  onCancel,
  canUseCurrentLocation,
  onUseCurrentLocation,
  geoError,
}: AddLocationFormProps) {
  const [values, setValues] = useState<FormState>(() => deriveInitialState());
  const [errors, setErrors] = useState<FormErrors>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target;
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }
    setPhoto(file);
    setPhotoPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
  };

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    if (!coordinates) {
      setErrors({ form: "Select a location on the map or use your current location before saving." });
      return;
    }

    const payload = {
      name: values.name,
      description: values.description,
      latitude: coordinates[0],
      longitude: coordinates[1],
    };

    const parsed = locationInputSchema.safeParse(payload);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const newErrors: FormErrors = {};
      (Object.keys(fieldErrors) as (keyof LocationInput)[]).forEach((field) => {
        const message = fieldErrors[field]?.[0];
        if (message) {
          newErrors[field] = message;
        }
      });
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit({ ...parsed.data, photo });
      setValues(deriveInitialState());
      setPhoto(null);
      setPhotoPreview((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Unable to add rosemary spot" });
    }
  };

  const showUseLocationButton = !coordinates && canUseCurrentLocation && typeof onUseCurrentLocation === "function";

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {errors.form && <p className={styles.formError}>{errors.form}</p>}
      <label className={styles.label}>
        <span>Name</span>
        <input
          type="text"
          name="name"
          value={values.name}
          placeholder="Community garden rosemary"
          onChange={handleChange("name")}
          disabled={submitting}
          required
        />
        {errors.name && <span className={styles.error}>{errors.name}</span>}
      </label>
      <label className={styles.label}>
        <span>Description</span>
        <textarea
          name="description"
          placeholder="Helpful details, e.g. access hours or nearby landmarks."
          value={values.description}
          onChange={handleChange("description")}
          disabled={submitting}
          rows={3}
        />
        {errors.description && <span className={styles.error}>{errors.description}</span>}
      </label>
      <label className={styles.label}>
        <span>Photo (optional)</span>
        <input
          type="file"
          accept="image/*"
          name="photo"
          onChange={handlePhotoChange}
          disabled={submitting}
        />
        <span className={styles.helperText}>Images must be 4&nbsp;MB or smaller.</span>
        {photoPreview && (
          <div className={styles.photoPreview}>
            <Image
              src={photoPreview}
              alt="Selected rosemary spot"
              fill
              className={styles.photoPreviewImage}
              unoptimized
            />
            <button
              type="button"
              className={styles.photoRemoveButton}
              onClick={() => {
                setPhoto(null);
                setPhotoPreview((prev) => {
                  if (prev) {
                    URL.revokeObjectURL(prev);
                  }
                  return null;
                });
              }}
              disabled={submitting}
            >
              Remove photo
            </button>
          </div>
        )}
      </label>
      <div className={styles.coordinateDisplay}>
        {coordinates ? (
          <>
            <span className={styles.coordinateValue}>Latitude: {coordinates[0].toFixed(6)}</span>
            <span className={styles.coordinateValue}>Longitude: {coordinates[1].toFixed(6)}</span>
            <span className={styles.coordinateHint}>Pin set on map</span>
          </>
        ) : (
          <p className={styles.coordinatePlaceholder}>
            Tap the map to drop a pin, or use your current location to place one automatically.
          </p>
        )}
        {showUseLocationButton && (
          <div className={styles.coordinateActions}>
            <button
              type="button"
              className={styles.useLocationButton}
              onClick={onUseCurrentLocation}
              disabled={submitting}
            >
              Use my location
            </button>
          </div>
        )}
      </div>
      {geoError && <p className={styles.geoError}>{geoError}</p>}
      <div className={styles.actions}>
        <button type="submit" disabled={submitting || !coordinates}>
          {submitting ? "Saving…" : "Save rosemary spot"}
        </button>
        {onCancel && (
          <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={submitting}>
            Close
          </button>
        )}
      </div>
    </form>
  );
}

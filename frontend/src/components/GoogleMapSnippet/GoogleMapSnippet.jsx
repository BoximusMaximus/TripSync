import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import clsx from "clsx";

import EmptyState from "../EmptyState";
import ErrorState from "../ErrorState";
import {
  mapViewClass,
  mapViewSurfaceClass,
  mapViewCanvasClass,
  mapViewMapClass,
  mapViewPlaceholderLabelClass,
  mapViewPinClass,
  mapViewOverlayClass,
  mapViewLoadingClass,
  mapViewStateWrapClass,
} from "./styles/tailwindStyles";

// No API key is ever hardcoded here — it comes from the environment at
// build time. Without VITE_GOOGLE_MAPS_API_KEY set, MapView renders the
// static placeholder below instead of attempting a real integration.
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const hasGoogleMapsKey = Boolean(apiKey);

// setOptions()/importLibrary() is the current @googlemaps/js-api-loader API
// (the old `Loader` class was removed in v2). Cache the combined promise so
// every MapView instance shares one load instead of racing to set options.
let librariesPromise = null;

const getGoogleMapsLibraries = () => {
  if (!librariesPromise) {
    setOptions({ key: apiKey, v: "weekly" });
    librariesPromise = Promise.all([
      importLibrary("core"), // LatLngBounds, LatLng, etc.
      importLibrary("maps"),
      importLibrary("marker"),
      importLibrary("places"),
    ]).then(([coreLib, mapsLib, markerLib, placesLib]) => ({
      ...coreLib,
      ...mapsLib,
      ...markerLib,
      ...placesLib,
    }));
  }
  return librariesPromise;
};

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 }; // continental US

// A misconfigured/invalid key doesn't reject the load promise — Google's
// script just never finishes initializing — so bail out of "loading" after
// this long instead of spinning forever.
const LOAD_TIMEOUT_MS = 8000;

/** Resolves a location to {lat, lng}, via Places when only a placeId is given. */
const resolveLatLng = (libraries, location) =>
  new Promise((resolve) => {
    if (Number.isFinite(location.lat) && Number.isFinite(location.lng)) {
      resolve({ lat: location.lat, lng: location.lng });
      return;
    }

    if (!location.placeId) {
      resolve(null);
      return;
    }

    const placesService = new libraries.PlacesService(
      document.createElement("div"),
    );

    placesService.getDetails(
      { placeId: location.placeId, fields: ["geometry"] },
      (place, placeStatus) => {
        if (
          placeStatus === libraries.PlacesServiceStatus.OK &&
          place?.geometry?.location
        ) {
          resolve({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        } else {
          resolve(null);
        }
      },
    );
  });

/**
 * Reusable map surface for plotting activity locations, keyed by Google
 * Place ID when available (falls back to raw lat/lng). Renders a live
 * Google Map when VITE_GOOGLE_MAPS_API_KEY is configured, otherwise a
 * visual placeholder — the props contract is identical either way.
 *
 * The `<div ref={mapNodeRef}>` map surface is always mounted (whenever a
 * key is configured) so the Google Maps constructor always has a real DOM
 * node to attach to — loading/error/empty states render as overlays on
 * top of it instead of replacing it, avoiding a mount-order deadlock where
 * the map is only created once "ready", but can only become "ready" once
 * it's created.
 */
const MapView = ({
  locations = [],
  isLoading = false,
  error = null,
  className,
}) => {
  const mapNodeRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [loadStatus, setLoadStatus] = useState(
    hasGoogleMapsKey ? "loading" : "disabled",
  );
  const [loadError, setLoadError] = useState(null);

  // Load the SDK and create the map instance once.
  useEffect(() => {
    if (!hasGoogleMapsKey) return;

    let isMounted = true;

    const timeoutId = setTimeout(() => {
      if (!isMounted) return;
      setLoadError(
        "Google Maps didn't respond. Check that VITE_GOOGLE_MAPS_API_KEY is valid and the Maps JavaScript API is enabled for it.",
      );
      setLoadStatus("error");
    }, LOAD_TIMEOUT_MS);

    getGoogleMapsLibraries()
      .then(({ Map }) => {
        if (!isMounted || !mapNodeRef.current) return;
        clearTimeout(timeoutId);

        mapInstanceRef.current = new Map(mapNodeRef.current, {
          center: DEFAULT_CENTER,
          zoom: 4,
        });

        setLoadStatus("ready");
      })
      .catch((err) => {
        if (!isMounted) return;
        clearTimeout(timeoutId);
        setLoadError(err?.message || "Google Maps failed to load.");
        setLoadStatus("error");
      });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Plot markers whenever the map is ready or the location list changes.
  useEffect(() => {
    if (loadStatus !== "ready") return;

    let isCancelled = false;

    getGoogleMapsLibraries().then((libraries) => {
      if (isCancelled) return;

      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      markersRef.current = [];

      if (!locations.length) return;

      Promise.all(
        locations.map((location) => resolveLatLng(libraries, location)),
      ).then((positions) => {
        if (isCancelled) return;

        const bounds = new libraries.LatLngBounds();
        let placed = 0;

        positions.forEach((position, index) => {
          if (!position) return;

          const location = locations[index];
          const marker = new libraries.Marker({
            map: mapInstanceRef.current,
            position,
            title: location.name || undefined,
          });

          markersRef.current.push(marker);
          bounds.extend(position);
          placed += 1;
        });

        if (placed === 1) {
          mapInstanceRef.current.setCenter(bounds.getCenter());
          mapInstanceRef.current.setZoom(13);
        } else if (placed > 1) {
          mapInstanceRef.current.fitBounds(bounds);
        }
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [loadStatus, locations]);

  const ariaLabel = `Map showing ${locations.length} activity location${locations.length === 1 ? "" : "s"}`;

  if (!hasGoogleMapsKey) {
    return (
      <div className={clsx(mapViewClass, className)} role="img" aria-label={ariaLabel}>
        <div className={mapViewCanvasClass}>
          <span className={mapViewPlaceholderLabelClass}>
            Google Map — placeholder (set VITE_GOOGLE_MAPS_API_KEY to enable)
          </span>

          {locations.map((location, index) => (
            <span
              key={location.id ?? location.placeId ?? index}
              className={mapViewPinClass}
              style={{
                left: `${15 + ((index * 23) % 70)}%`,
                top: `${20 + ((index * 31) % 60)}%`,
              }}
              title={location.name}
            />
          ))}
        </div>
      </div>
    );
  }

  const showLoading = isLoading || loadStatus === "loading";
  const showError = Boolean(error) || loadStatus === "error";
  const showEmpty = !showLoading && !showError && !locations.length;

  return (
    <div
      className={clsx(mapViewClass, className)}
      role="group"
      aria-label={ariaLabel}
    >
      <div className={mapViewSurfaceClass}>
        <div ref={mapNodeRef} className={mapViewMapClass} />

        {showLoading && (
          <div className={mapViewOverlayClass}>
            <p className={mapViewLoadingClass} role="status">
              Loading map…
            </p>
          </div>
        )}

        {!showLoading && showError && (
          <div className={mapViewOverlayClass}>
            <div className={mapViewStateWrapClass}>
              <ErrorState
                title="Map unavailable"
                message={
                  typeof error === "string"
                    ? error
                    : loadError || "Couldn't load activity locations."
                }
                homeHref={null}
              />
            </div>
          </div>
        )}

        {showEmpty && (
          <div className={mapViewOverlayClass}>
            <div className={mapViewStateWrapClass}>
              <EmptyState
                title="No activity locations yet"
                message="Add an activity with a location to see it plotted here."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;

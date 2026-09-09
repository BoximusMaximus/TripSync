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
  mapViewEmptyOverlayClass,
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

// A rejected key (wrong referrer, API not enabled, billing off) does NOT reject
// the load promise: Google's bootstrap answers 200, the libraries resolve, and
// Google then calls the global `gm_authFailure` and paints its own grey error
// box. That hook is wired below so the app can say why. The timeout only covers
// a script that never arrives at all (blocked network, extension).
const LOAD_TIMEOUT_MS = 8000;

const AUTH_FAILURE_MESSAGE =
  "Google rejected the Maps key. In Cloud Console, check the key's HTTP-referrer list includes this site and the Maps JavaScript API is enabled for it.";

// Search hits get a blue dot so they read as "not saved yet" against the default
// red pin of a saved activity. A plain Symbol literal — no constructor and no
// image URL — so there is nothing that can fail to load.
const RESULT_MARKER_ICON = {
  path: "M -7,0 a 7,7 0 1,0 14,0 a 7,7 0 1,0 -14,0",
  fillColor: "#2563eb",
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 2,
  scale: 1,
};

// The point the search is measured from — the middle of the shaded circle.
const CENTER_MARKER_ICON = {
  path: "M -5,0 a 5,5 0 1,0 10,0 a 5,5 0 1,0 -10,0",
  fillColor: "#0f7173",
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 2,
  scale: 1,
};

// Faint enough to read the map through, defined enough to see the edge.
const SEARCH_CIRCLE_STYLE = {
  fillColor: "#2563eb",
  fillOpacity: 0.07,
  strokeColor: "#2563eb",
  strokeOpacity: 0.45,
  strokeWeight: 1,
  clickable: false,
};

// Place names and addresses come back from Google and go into an InfoWindow as
// HTML, so they are escaped on the way in.
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

// Native hover tooltip: the browser renders `title` with no extra API surface.
const markerTitle = (pin) =>
  pin.rating ? `${pin.name} — ★ ${pin.rating}` : pin.name || undefined;

// Click card: the same information with room for the address and rating count.
const infoWindowContent = (pin) => {
  const rating = pin.rating
    ? `<div style="margin-top:3px">★ ${escapeHtml(pin.rating)}${
        pin.ratingCount
          ? ` <span style="color:#6b7280">(${escapeHtml(pin.ratingCount)} reviews)</span>`
          : ""
      }</div>`
    : pin.isResult
      ? `<div style="margin-top:3px;color:#6b7280">No rating yet</div>`
      : "";
  const address = pin.address
    ? `<div style="margin-top:3px;color:#6b7280">${escapeHtml(pin.address)}</div>`
    : "";

  return `<div style="font-size:13px;line-height:1.45;max-width:220px"><strong>${escapeHtml(
    pin.name,
  )}</strong>${rating}${address}</div>`;
};

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
  results = [],
  searchArea = null,
  isLoading = false,
  error = null,
  className,
}) => {
  const mapNodeRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const circleRef = useRef(null);
  // One InfoWindow for the whole map: opening it on a pin closes it on the
  // previous one, which is what people expect from a map.
  const infoWindowRef = useRef(null);
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
        "Google Maps didn't respond. The script may be blocked (browser extension or network) — check the browser console.",
      );
      setLoadStatus("error");
    }, LOAD_TIMEOUT_MS);

    // Google's only signal for a rejected key is this global callback.
    window.gm_authFailure = () => {
      if (!isMounted) return;
      clearTimeout(timeoutId);
      setLoadError(AUTH_FAILURE_MESSAGE);
      setLoadStatus("error");
    };

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
      window.gm_authFailure = undefined;
    };
  }, []);

  // Plot the pins and the search circle whenever the map is ready or any of them
  // change. One effect rather than two so the viewport can be fitted to both at
  // once instead of each fighting the other for the zoom level.
  useEffect(() => {
    if (loadStatus !== "ready") return;

    let isCancelled = false;

    getGoogleMapsLibraries().then((libraries) => {
      if (isCancelled) return;

      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      markersRef.current = [];
      infoWindowRef.current?.close();
      circleRef.current?.setMap(null);
      circleRef.current = null;

      const bounds = new libraries.LatLngBounds();
      let hasBounds = false;

      // The search area, drawn at the radius the server reported — i.e. the one
      // Google was actually given, after its 50 km cap.
      if (searchArea) {
        const center = { lat: searchArea.lat, lng: searchArea.lng };

        circleRef.current = new libraries.Circle({
          ...SEARCH_CIRCLE_STYLE,
          map: mapInstanceRef.current,
          center,
          radius: searchArea.radiusM,
        });

        const centerMarker = new libraries.Marker({
          map: mapInstanceRef.current,
          position: center,
          title: "Search center",
          icon: CENTER_MARKER_ICON,
          zIndex: 3,
        });
        markersRef.current.push(centerMarker);

        const circleBounds = circleRef.current.getBounds();
        if (circleBounds) {
          bounds.union(circleBounds);
          hasBounds = true;
        }
      }

      // Saved activities first, search hits on top of them.
      const pins = [
        ...locations.map((location) => ({ ...location, isResult: false })),
        ...results.map((result) => ({ ...result, isResult: true })),
      ];

      if (!pins.length) {
        if (hasBounds) mapInstanceRef.current.fitBounds(bounds);
        return;
      }

      Promise.all(pins.map((pin) => resolveLatLng(libraries, pin))).then(
        (positions) => {
          if (isCancelled) return;

          if (!infoWindowRef.current) {
            infoWindowRef.current = new libraries.InfoWindow();
          }

          let placed = 0;

          positions.forEach((position, index) => {
            if (!position) return;

            const pin = pins[index];
            const marker = new libraries.Marker({
              map: mapInstanceRef.current,
              position,
              title: markerTitle(pin),
              icon: pin.isResult ? RESULT_MARKER_ICON : undefined,
              zIndex: pin.isResult ? 2 : 1,
            });

            marker.addListener("click", () => {
              infoWindowRef.current.setContent(infoWindowContent(pin));
              infoWindowRef.current.open({
                map: mapInstanceRef.current,
                anchor: marker,
              });
            });

            markersRef.current.push(marker);
            bounds.extend(position);
            placed += 1;
            hasBounds = true;
          });

          // A lone pin has no extent to fit to, so pick a readable zoom — unless
          // a circle is on the map, whose bounds are the thing worth showing.
          if (placed === 1 && !searchArea) {
            mapInstanceRef.current.setCenter(bounds.getCenter());
            mapInstanceRef.current.setZoom(15);
          } else if (hasBounds) {
            mapInstanceRef.current.fitBounds(bounds);
          }
        },
      );
    });

    return () => {
      isCancelled = true;
    };
  }, [loadStatus, locations, results, searchArea]);

  const pinCount = locations.length + results.length;
  const ariaLabel = `Map showing ${pinCount} location${pinCount === 1 ? "" : "s"}`;

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
  // A circle with no pins is still something worth looking at.
  const showEmpty = !showLoading && !showError && !pinCount && !searchArea;

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

        {/* Non-blocking: the base map stays visible and draggable behind the note,
            so a trip with no located activities still shows a map, not a grey card. */}
        {showEmpty && (
          <div className={mapViewEmptyOverlayClass}>
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

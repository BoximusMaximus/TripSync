import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../utilities";
import ActivityCard from "../components/ActivityCard/ActivityCard";
import MapView from "../components/GoogleMapSnippet";
import {
  tripDetailPageClass,
  tripDetailHeaderClass,
  tripDetailTitleClass,
  tripDetailLocationClass,
  tripDetailActionsClass,
  tripDetailEditButtonClass,
  tripDetailAddButtonClass,
  tripDetailColumnsClass,
  tripDetailLeftClass,
  tripDetailRightClass,
  tripDetailMapSlotClass,
  tripDetailMapNoteClass,
  tripDetailStatusClass,
  tripDetailErrorClass,
  tripFormClass,
  tripFormRowClass,
  tripFormFieldClass,
  tripFormInputClass,
  tripFormSelectClass,
  tripFormSubmitClass,
  tripFormCancelClass,
  placesResultsClass,
  placesResultButtonClass,
  placesResultAddressClass,
  placesResultRatingClass,
  placesRadiusNoteClass,
  placesOriginRowClass,
  placesOriginButtonClass,
  placesOriginLabelClass,
  placesOriginClearClass,
  placesSelectedClass,
} from "./styles/tailwindStyles";

// The API takes metres (Google's unit); the UI offers miles, so the conversion
// lives here at the boundary.
const MILES_TO_METRES = 1609.344;
const RADIUS_OPTIONS_MILES = [1, 5, 10, 20, 50];
const DEFAULT_RADIUS_MILES = 10;
// Google clamps a locationBias circle to 50 km, so anything above ~31 miles
// biases at 31. The bias is soft either way — strong matches outside the circle
// still come back — but the UI says so rather than quietly rounding down.
const GOOGLE_MAX_RADIUS_M = 50000;

// What the map circle should be drawn at: what Google will actually be given.
const biasRadiusMetres = (miles) =>
  Math.min(Math.round(miles * MILES_TO_METRES), GOOGLE_MAX_RADIUS_M);

// The server reports which center it used, so the label never guesses.
const CENTER_LABELS = {
  current_location: "your current location",
  lodging: "where the group is staying",
  trip: "the trip destination",
};

// navigator.geolocation reports failures by numeric code; say something the user
// can act on instead of surfacing "User denied Geolocation".
const geolocationMessage = (error) => {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Allow it in the browser's site settings, or search from the trip destination instead.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your device could not determine a location right now.";
  }
  if (error.code === error.TIMEOUT) {
    return "Timed out waiting for your location.";
  }
  return "Could not get your location.";
};

// Places search moved to the backend (activities/search/), which returns
// place_id, name, formatted_address, latitude, longitude. The browser-side
// address parsing below is kept for reference only.
// const componentText = (components, type, field) => {
  // const match = components.find((component) => component.types.includes(type));
  // return match ? match[field] : "";
// };

// // Google Places (New) returns addressComponents as [{ longText, shortText, types }].
// // street_number + route -> street, locality -> city,
// // administrative_area_level_1 -> state, postal_code -> zip, country -> country.
// const flattenPlace = (place) => {
  // const components = place.addressComponents || [];
  // const streetNumber = componentText(components, "street_number", "shortText");
  // const route = componentText(components, "route", "shortText");

  // return {
    // place_id: place.id,
    // name: place.displayName.text,
    // formatted_address: place.formattedAddress,
    // street: `${streetNumber} ${route}`.trim(),
    // city: componentText(components, "locality", "longText"),
    // state: componentText(components, "administrative_area_level_1", "shortText"),
    // zip: componentText(components, "postal_code", "longText"),
    // country: componentText(components, "country", "longText"),
  // };
// };

const emptyActivity = {
  name: "",
  description: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  cost: "",
};

export default function TripPage() {
  const { tripId } = useParams();

  const [trip, setTrip] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS_MILES);
  // The user's own coordinates, once they ask for them. null = let the server pick
  // the center (their lodging, or the trip's destination).
  const [searchOrigin, setSearchOrigin] = useState(null);
  const [locating, setLocating] = useState(false);
  // The circle the map draws: after a search this is the server's answer, so it
  // shows the area actually searched whichever center was used.
  const [searchArea, setSearchArea] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [newActivity, setNewActivity] = useState(emptyActivity);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [manualAddress, setManualAddress] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    name: "",
    description: "",
    cost: "",
  });
  const [busyActivityId, setBusyActivityId] = useState(null);

  const loadTrip = async () => {
    setLoading(true);
    setError("");

    try {
      const tripResponse = await api.get(`trips/${tripId}/`);
      setTrip(tripResponse.data);
      // const activityResponse = await api.get(`trips/${tripId}/activities/`);
      const activityResponse = await api.get("activities/", {
        params: { trip: tripId },
      });
      setActivities(activityResponse.data);
    } catch (err) {
      setError("Could not load trip.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const resetAddForm = () => {
    setShowAddForm(false);
    setPlaceQuery("");
    setPlaceResults([]);
    setSelectedPlace(null);
    setNewActivity(emptyActivity);
    setManualAddress(false);
    setFormError("");
    setSearchOrigin(null);
    setSearchArea(null);
  };

  // Geolocation needs a secure context: it works on https:// and on localhost,
  // and is simply absent elsewhere.
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setFormError("This browser cannot share a location.");
      return;
    }

    setLocating(true);
    setFormError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSearchOrigin(origin);
        // Draw the circle straight away so the radius can be judged before
        // spending a search on it.
        setSearchArea({
          ...origin,
          radiusM: biasRadiusMetres(radiusMiles),
          source: "current_location",
        });
        setLocating(false);
      },
      (error) => {
        setFormError(geolocationMessage(error));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleClearOrigin = () => {
    setSearchOrigin(null);
    setSearchArea(null);
  };

  // Keep the preview circle in step with the dropdown while the origin is pinned.
  const handleRadiusChange = (miles) => {
    setRadiusMiles(miles);
    if (searchOrigin) {
      setSearchArea({
        ...searchOrigin,
        radiusM: biasRadiusMetres(miles),
        source: "current_location",
      });
    }
  };

  const searchPlaces = async (event) => {
    event.preventDefault();

    if (placeQuery.trim() === "") {
      return;
    }

    setPlacesLoading(true);
    setFormError("");

    try {
      // const response = await fetch(
        // "https://places.googleapis.com/v1/places:searchText",
        // {
          // method: "POST",
          // headers: {
            // "Content-Type": "application/json",
            // "X-Goog-Api-Key": import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
            // "X-Goog-FieldMask":
              // "places.id,places.displayName,places.formattedAddress,places.addressComponents",
          // },
          // body: JSON.stringify({ textQuery: placeQuery, maxResultCount: 5 }),
        // },
      // );
      // const data = await response.json();
      // setPlaceResults((data.places || []).map(flattenPlace));

      // The server searches Google around the trip's lodging when one is set
      // (PUT activities/lodging/<trip_id>/ - no form for it yet), otherwise
      // around the trip's own city/state/country. A 400 means Google could not
      // place the destination; a 502 means Google itself failed.
      const response = await api.get("activities/search/", {
        params: {
          trip: tripId,
          query: placeQuery,
          radius_m: Math.round(radiusMiles * MILES_TO_METRES),
          // Sent only when the user asked for their own location; otherwise the
          // server chooses the center.
          ...(searchOrigin
            ? { lat: searchOrigin.lat, lng: searchOrigin.lng }
            : {}),
        },
      });
      setPlaceResults(response.data.places);
      // The server's answer replaces any preview: it names the center it really
      // used and the radius after Google's cap.
      setSearchArea({
        lat: response.data.center.latitude,
        lng: response.data.center.longitude,
        radiusM: response.data.radius_m,
        source: response.data.center.source,
      });
      setSelectedPlace(null);
    } catch (err) {
      setFormError(err.response?.data?.error || "Could not search places.");
      // Nothing to pick from - open the manual address fields so the activity
      // can still be added instead of leaving a dead end.
      if (err.response?.status === 400) {
        setManualAddress(true);
      }
    } finally {
      setPlacesLoading(false);
    }
  };

  const handleSelectPlace = (place) => {
    setSelectedPlace(place);
    setPlaceResults([]);
    setNewActivity({
      ...newActivity,
      name: newActivity.name.trim() === "" ? place.name : newActivity.name,
    });
  };

  // Saved activities: the permanent pins. Memoised because MapView re-plots
  // whenever this array identity changes, and an inline .map() is a new array
  // on every render.
  const activityPins = useMemo(
    () =>
      activities.map((activity) => ({
        id: `activity-${activity.id}`,
        name: activity.name,
        lat: activity.latitude,
        lng: activity.longitude,
        placeId: activity.place_id,
        address: activity.formatted_address,
      })),
    [activities],
  );

  // Search hits: transient pins in a different colour. Once one is picked, only
  // that one stays on the map so the user can see what they are about to add.
  const resultPins = useMemo(() => {
    const source = selectedPlace ? [selectedPlace] : placeResults;
    return source.map((place) => ({
      id: `result-${place.place_id}`,
      name: place.name,
      lat: place.latitude,
      lng: place.longitude,
      placeId: place.place_id,
      address: place.formatted_address,
      rating: place.rating,
      ratingCount: place.user_rating_count,
    }));
  }, [placeResults, selectedPlace]);

  const handleToggleManual = () => {
    setManualAddress(!manualAddress);
    setPlaceQuery("");
    setPlaceResults([]);
    setSelectedPlace(null);
    setFormError("");
    setSearchArea(null);
  };

  const handleAddActivity = async (event) => {
    event.preventDefault();

    if (newActivity.name.trim() === "") {
      return;
    }

    if (!manualAddress && !selectedPlace) {
      return;
    }

    setSubmitting(true);
    setFormError("");

    // A Places pick sends only place_id; the server geocodes it and stores
    // the address. A manual entry sends the typed fields and no place_id.
    const payload = {
      trip: Number(tripId),
      name: newActivity.name,
      description: newActivity.description,
      // street: manualAddress ? newActivity.street : selectedPlace.street,
      // city: manualAddress ? newActivity.city : selectedPlace.city,
      // state: manualAddress ? newActivity.state : selectedPlace.state,
      // zip: manualAddress ? newActivity.zip : selectedPlace.zip,
      // country: manualAddress ? newActivity.country : selectedPlace.country,
      street: manualAddress ? newActivity.street : "",
      city: manualAddress ? newActivity.city : "",
      state: manualAddress ? newActivity.state : "",
      zip: manualAddress ? newActivity.zip : "",
      country: manualAddress ? newActivity.country : "",
      place_id: manualAddress ? "" : selectedPlace.place_id,
      cost_estimate_cents: Math.round(Number(newActivity.cost || 0) * 100),
    };

    try {
      // const response = await api.post(`trips/${tripId}/activities/`, payload);
      const response = await api.post("activities/", payload);
      setActivities([...activities, response.data]);
      resetAddForm();
    } catch (err) {
      setFormError(err.response?.data?.error || "Could not add activity.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (activity) => {
    setEditingActivityId(activity.id);
    setEditDraft({
      name: activity.name,
      description: activity.description,
      cost: (activity.cost_estimate_cents / 100).toFixed(2),
    });
  };

  const handleEditChange = (field, value) => {
    setEditDraft({ ...editDraft, [field]: value });
  };

  const handleCancelEdit = () => {
    setEditingActivityId(null);
  };

  const handleSaveActivity = async (activityId) => {
    if (editDraft.name.trim() === "") {
      return;
    }

    setBusyActivityId(activityId);
    setFormError("");

    const payload = {
      name: editDraft.name,
      description: editDraft.description,
      cost_estimate_cents: Math.round(Number(editDraft.cost || 0) * 100),
    };

    try {
      const response = await api.patch(`activities/${activityId}/`, payload);
      const savedActivity = response.data;
      setActivities(
        activities.map((activity) =>
          activity.id === activityId ? savedActivity : activity,
        ),
      );
      setEditingActivityId(null);
    } catch (err) {
      setFormError("Could not save activity.");
    } finally {
      setBusyActivityId(null);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm("Delete this activity?")) {
      return;
    }

    setBusyActivityId(activityId);
    setFormError("");

    try {
      await api.delete(`activities/${activityId}/`);
      setActivities(
        activities.filter((activity) => activity.id !== activityId),
      );
      if (editingActivityId === activityId) {
        setEditingActivityId(null);
      }
    } catch (err) {
      setFormError("Could not delete activity.");
    } finally {
      setBusyActivityId(null);
    }
  };

  const handleVoteActivity = async (activity) => {
    setBusyActivityId(activity.id);
    setFormError("");

    try {
      // if (activity.has_voted) {
      //   await api.delete(`activities/${activity.id}/vote/`);
      // } else {
      //   await api.post(`activities/${activity.id}/vote/`);
      // }
      // const updatedActivity = {
      //   ...activity,
      //   has_voted: !activity.has_voted,
      //   vote_count: activity.has_voted
      //     ? activity.vote_count - 1
      //     : activity.vote_count + 1,
      // };
      let updatedActivity;
      if (activity.has_voted) {
        await api.delete(`activities/${activity.id}/vote/`);
        updatedActivity = {
          ...activity,
          has_voted: false,
          vote_count: activity.vote_count - 1,
        };
      } else {
        const response = await api.post(`activities/${activity.id}/vote/`);
        updatedActivity = response.data;
      }
      setActivities(
        activities.map((item) =>
          item.id === activity.id ? updatedActivity : item,
        ),
      );
    } catch (err) {
      setFormError("Could not update vote.");
    } finally {
      setBusyActivityId(null);
    }
  };

  if (loading) {
    return (
      <div className={tripDetailPageClass}>
        <p className={tripDetailStatusClass}>Loading trip...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={tripDetailPageClass}>
        <p className={tripDetailErrorClass}>{error}</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className={tripDetailPageClass}>
        <p className={tripDetailStatusClass}>Trip not found.</p>
        <Link to="/trips">Back to trips</Link>
      </div>
    );
  }

  return (
    <div className={tripDetailPageClass}>
      <div className={tripDetailHeaderClass}>
        <div>
          <h1 className={tripDetailTitleClass}>{trip.name}</h1>
          <p className={tripDetailLocationClass}>
            {trip.city}, {trip.state}{trip.zip ? ` ${trip.zip}` : ""}, {trip.country}
          </p>
        </div>

        <div className={tripDetailActionsClass}>
          <button className={tripDetailEditButtonClass}>Edit Trip</button>
          <button
            className={tripDetailAddButtonClass}
            onClick={() => (showAddForm ? resetAddForm() : setShowAddForm(true))}
          >
            + Add Activity
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className={tripFormClass}>
          {!manualAddress && (
          <>
          <div className={placesOriginRowClass}>
            <button
              className={placesOriginButtonClass}
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
            >
              {locating ? "Locating…" : "📍 Use my current location"}
            </button>

            <span className={placesOriginLabelClass}>
              {searchArea
                ? `Searching around ${CENTER_LABELS[searchArea.source] ?? "the trip destination"}`
                : "Searching around the trip destination"}
            </span>

            {searchOrigin && (
              <button
                className={placesOriginClearClass}
                type="button"
                onClick={handleClearOrigin}
              >
                Use the trip destination instead
              </button>
            )}
          </div>

          <form className={tripFormRowClass} onSubmit={searchPlaces}>
            <label className={tripFormFieldClass}>
              Find a place
              <input
                className={tripFormInputClass}
                type="text"
                value={placeQuery}
                onChange={(event) => setPlaceQuery(event.target.value)}
                placeholder="Search Google Places"
              />
            </label>

            <label className={tripFormFieldClass}>
              Within
              <select
                className={tripFormSelectClass}
                value={radiusMiles}
                onChange={(event) =>
                  handleRadiusChange(Number(event.target.value))
                }
              >
                {RADIUS_OPTIONS_MILES.map((miles) => (
                  <option key={miles} value={miles}>
                    {miles} {miles === 1 ? "mile" : "miles"}
                  </option>
                ))}
              </select>
            </label>

            <button
              className={tripFormSubmitClass}
              type="submit"
              disabled={placesLoading}
            >
              {placesLoading ? "Searching..." : "Search"}
            </button>
          </form>

          {radiusMiles * MILES_TO_METRES > GOOGLE_MAX_RADIUS_M && (
            <p className={placesRadiusNoteClass}>
              Google caps the search area at 50 km (~31 miles), so this searches
              about 31 miles out. Strong matches further away can still appear.
            </p>
          )}
          </>
          )}

          {placeResults.length > 0 && (
            <div className={placesResultsClass}>
              {placeResults.map((place) => (
                <button
                  key={place.place_id}
                  className={placesResultButtonClass}
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                >
                  {place.name}
                  {place.rating ? (
                    <span className={placesResultRatingClass}>
                      ★ {place.rating}
                      {place.user_rating_count
                        ? ` (${place.user_rating_count})`
                        : ""}
                    </span>
                  ) : null}
                  <span className={placesResultAddressClass}>
                    {place.formatted_address}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedPlace && (
            <p className={placesSelectedClass}>
              {selectedPlace.name}
              {selectedPlace.rating ? ` · ★ ${selectedPlace.rating}` : ""} ·{" "}
              {selectedPlace.formatted_address}
            </p>
          )}

          <button
            className={tripFormCancelClass}
            type="button"
            onClick={handleToggleManual}
          >
            {manualAddress
              ? "Search Google Places instead"
              : "Enter address manually"}
          </button>

          <form className={tripFormRowClass} onSubmit={handleAddActivity}>
            <label className={tripFormFieldClass}>
              Name
              <input
                className={tripFormInputClass}
                type="text"
                value={newActivity.name}
                onChange={(event) =>
                  setNewActivity({ ...newActivity, name: event.target.value })
                }
              />
            </label>
            <label className={tripFormFieldClass}>
              Description
              <input
                className={tripFormInputClass}
                type="text"
                value={newActivity.description}
                onChange={(event) =>
                  setNewActivity({
                    ...newActivity,
                    description: event.target.value,
                  })
                }
              />
            </label>
            {manualAddress && (
              <>
                <label className={tripFormFieldClass}>
                  Street
                  <input
                    className={tripFormInputClass}
                    type="text"
                    value={newActivity.street}
                    onChange={(event) =>
                      setNewActivity({ ...newActivity, street: event.target.value })
                    }
                  />
                </label>
                <label className={tripFormFieldClass}>
                  City
                  <input
                    className={tripFormInputClass}
                    type="text"
                    value={newActivity.city}
                    onChange={(event) =>
                      setNewActivity({ ...newActivity, city: event.target.value })
                    }
                  />
                </label>
                <label className={tripFormFieldClass}>
                  State
                  <input
                    className={tripFormInputClass}
                    type="text"
                    value={newActivity.state}
                    onChange={(event) =>
                      setNewActivity({ ...newActivity, state: event.target.value })
                    }
                  />
                </label>
                <label className={tripFormFieldClass}>
                  Zip
                  <input
                    className={tripFormInputClass}
                    type="text"
                    value={newActivity.zip}
                    onChange={(event) =>
                      setNewActivity({ ...newActivity, zip: event.target.value })
                    }
                  />
                </label>
                <label className={tripFormFieldClass}>
                  Country
                  <input
                    className={tripFormInputClass}
                    type="text"
                    value={newActivity.country}
                    onChange={(event) =>
                      setNewActivity({ ...newActivity, country: event.target.value })
                    }
                  />
                </label>
              </>
            )}
            <label className={tripFormFieldClass}>
              Cost ($)
              <input
                className={tripFormInputClass}
                type="number"
                min="0"
                step="0.01"
                value={newActivity.cost}
                onChange={(event) =>
                  setNewActivity({ ...newActivity, cost: event.target.value })
                }
              />
            </label>
            <button
              className={tripFormSubmitClass}
              type="submit"
              disabled={submitting || (!manualAddress && !selectedPlace)}
            >
              {submitting ? "Saving..." : "Save Activity"}
            </button>
            <button
              className={tripFormCancelClass}
              type="button"
              onClick={resetAddForm}
            >
              Cancel
            </button>
          </form>

          {formError && <p className={tripDetailErrorClass}>{formError}</p>}
        </div>
      )}

      <div className={tripDetailColumnsClass}>
        <div className={tripDetailLeftClass}>
          {activities.length === 0 && (
            <p className={tripDetailStatusClass}>No activities yet.</p>
          )}

          {formError && !showAddForm && (
            <p className={tripDetailErrorClass}>{formError}</p>
          )}

          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              editing={activity.id === editingActivityId}
              editDraft={editDraft}
              onEditChange={handleEditChange}
              onEditClick={() => handleEditClick(activity)}
              onSaveClick={() => handleSaveActivity(activity.id)}
              onCancelClick={handleCancelEdit}
              onDeleteClick={() => handleDeleteActivity(activity.id)}
              onVoteClick={() => handleVoteActivity(activity)}
              busy={activity.id === busyActivityId}
            />
          ))}
        </div>

        <div className={tripDetailRightClass}>
          {/* <div className={tripDetailMapSlotClass}>
            Google Map — activity pins (Places ID)
          </div> */}
          <MapView
            className={tripDetailMapSlotClass}
            locations={activityPins}
            results={resultPins}
            searchArea={searchArea}
          />
          <p className={tripDetailMapNoteClass}>
            Saved activities are red pins; search results are blue. Click a pin
            for its name, rating and address. The shaded circle is the area being
            searched.
          </p>
        </div>
      </div>
    </div>
  );
}

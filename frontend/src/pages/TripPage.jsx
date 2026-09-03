import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../utilities";
import ActivityCard from "../components/ActivityCard/ActivityCard";
// import { mockTrips, mockActivities, mockPlaces } from "../fixture/mockData";
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
  tripFormSubmitClass,
  tripFormCancelClass,
  placesResultsClass,
  placesResultButtonClass,
  placesResultAddressClass,
  placesSelectedClass,
} from "./styles/tailwindStyles";


const componentText = (components, type, field) => {
  const match = components.find((component) => component.types.includes(type));
  return match ? match[field] : "";
};

// Google Places (New) returns addressComponents as [{ longText, shortText, types }].
// street_number + route -> street, locality -> city,
// administrative_area_level_1 -> state, postal_code -> zip, country -> country.
const flattenPlace = (place) => {
  const components = place.addressComponents || [];
  const streetNumber = componentText(components, "street_number", "shortText");
  const route = componentText(components, "route", "shortText");

  return {
    place_id: place.id,
    name: place.displayName.text,
    formatted_address: place.formattedAddress,
    street: `${streetNumber} ${route}`.trim(),
    city: componentText(components, "locality", "longText"),
    state: componentText(components, "administrative_area_level_1", "shortText"),
    zip: componentText(components, "postal_code", "longText"),
    country: componentText(components, "country", "longText"),
  };
};

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
      const activityResponse = await api.get(`trips/${tripId}/activities/`);
      setActivities(activityResponse.data);
      // const foundTrip = mockTrips.find((item) => item.id === Number(tripId));
      // setTrip(foundTrip || null);
      // setActivities(
      //   mockActivities.filter((item) => item.trip_id === Number(tripId)),
      // );
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
  };

  const searchPlaces = async (event) => {
    event.preventDefault();

    if (placeQuery.trim() === "") {
      return;
    }

    setPlacesLoading(true);
    setFormError("");

    try {
      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.addressComponents",
          },
          body: JSON.stringify({ textQuery: placeQuery, maxResultCount: 5 }),
        },
      );
      const data = await response.json();
      setPlaceResults((data.places || []).map(flattenPlace));
      setPlaceResults(mockPlaces.map(flattenPlace));
      setSelectedPlace(null);
    } catch (err) {
      setFormError("Could not search places.");
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

  const handleToggleManual = () => {
    setManualAddress(!manualAddress);
    setPlaceQuery("");
    setPlaceResults([]);
    setSelectedPlace(null);
    setFormError("");
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

    const payload = {
      name: newActivity.name,
      description: newActivity.description,
      street: manualAddress ? newActivity.street : selectedPlace.street,
      city: manualAddress ? newActivity.city : selectedPlace.city,
      state: manualAddress ? newActivity.state : selectedPlace.state,
      zip: manualAddress ? newActivity.zip : selectedPlace.zip,
      country: manualAddress ? newActivity.country : selectedPlace.country,
      place_id: manualAddress ? "" : selectedPlace.place_id,
      cost_estimate_cents: Math.round(Number(newActivity.cost || 0) * 100),
    };

    try {
      const response = await api.post(`trips/${tripId}/activities/`, payload);
      setActivities([...activities, response.data]);
      const fakeActivity = {
        id: Date.now(),
        trip_id: Number(tripId),
        ...payload,
        vote_count: 0,
        has_voted: false,
      };
      setActivities([...activities, fakeActivity]);
      resetAddForm();
    } catch (err) {
      setFormError("Could not add activity.");
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
      // const savedActivity = {
      //   ...activities.find((activity) => activity.id === activityId),
      //   ...payload,
      // };
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
      if (activity.has_voted) {
        await api.delete(`activities/${activity.id}/vote/`);
      } else {
        await api.post(`activities/${activity.id}/vote/`);
      }
      const updatedActivity = {
        ...activity,
        has_voted: !activity.has_voted,
        vote_count: activity.has_voted
          ? activity.vote_count - 1
          : activity.vote_count + 1,
      };
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
            {trip.city}, {trip.state}, {trip.country}
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
            <button
              className={tripFormSubmitClass}
              type="submit"
              disabled={placesLoading}
            >
              {placesLoading ? "Searching..." : "Search"}
            </button>
          </form>
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
                  <span className={placesResultAddressClass}>
                    {place.formatted_address}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedPlace && (
            <p className={placesSelectedClass}>
              {selectedPlace.name} · {selectedPlace.formatted_address}
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
          <div className={tripDetailMapSlotClass}>
            Google Map — activity pins (Places ID)
          </div>
          <p className={tripDetailMapNoteClass}>
            Cost is a user-entered estimate · votes decide the itinerary
          </p>
        </div>
      </div>
    </div>
  );
}

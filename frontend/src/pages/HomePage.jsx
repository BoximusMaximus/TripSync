import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../utilities";
import GroupCard from "../components/GroupCard";
import TripCard from "../components/TripCard";
import MapView from "../components/GoogleMapSnippet";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";

import {
  homePageClass,
  homeLoadingClass,
  homeCardsRowClass,
  homeMapSectionClass,
  homeMapIntroClass,
  homeDetailsLinkClass,
} from "./styles/tailwindStyles";

// The dashboard shows the user's most recent trip: the last group they belong
// to (a group is one trip's member list), that trip, and its activities for
// the map. Same requests TripsPage and TripPage make — there is no dedicated
// dashboard endpoint yet. GroupCard / TripCard / MapView only take props.
const fetchHomeData = async () => {
  const groupResponse = await api.get("users/groups/");
  const groups = groupResponse.data;

  if (groups.length === 0) {
    return { group: null, trip: null, activities: [] };
  }

  const group = groups[groups.length - 1];
  const tripResponse = await api.get(`trips/${group.trip}/`);
  const trip = tripResponse.data;
  const activityResponse = await api.get("activities/", {
    params: { trip: trip.id },
  });

  return {
    group: {
      id: group.id,
      name: trip.name,
      member_count: group.auth_user.length,
      is_member: true,
      is_leader: false,
    },
    trip,
    activities: activityResponse.data.map((activity) => ({
      id: activity.id,
      name: activity.name,
      lat: activity.latitude,
      lng: activity.longitude,
      placeId: activity.place_id,
    })),
  };
};

const HomePage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    fetchHomeData()
      .then((result) => {
        if (!isMounted) return;
        setData(result);
        setStatus("success");
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(
          err.response?.data?.error ||
            err?.message ||
            "Unable to load your dashboard.",
        );
        setStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  if (status === "loading") {
    return (
      <div className={homePageClass}>
        <p className={homeLoadingClass} role="status">
          Loading your dashboard…
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={homePageClass}>
        <ErrorState
          title="Couldn't load your dashboard"
          message={error}
          onRetry={() => {
            setStatus("loading");
            setRetryCount((count) => count + 1);
          }}
        />
      </div>
    );
  }

  const { group, trip, activities } = data;

  return (
    <div className={homePageClass}>
      <div className={homeCardsRowClass}>
        {group ? (
          <GroupCard
            group={group}
            onViewClick={() => navigate("/groups")}
            busy={false}
            expanded={false}
            members={[]}
            membersLoading={false}
            onToggleAccess={() => {}}
            onRemoveMember={() => {}}
            busyMemberId={null}
          />
        ) : (
          <EmptyState
            title="No group yet"
            message="Create a trip to start planning — you become its group's first member."
            action={{ label: "Go to Trips", to: "/trips" }}
          />
        )}

        {trip ? (
          <TripCard trip={trip} />
        ) : (
          <EmptyState
            title="No trips yet"
            message="Create your first trip to see it here."
            action={{ label: "Go to Trips", to: "/trips" }}
          />
        )}
      </div>

      <div className={homeMapSectionClass}>
        <MapView locations={activities} />

        <div className={homeMapIntroClass}>
          <p>Map shows every saved activity for your most recent trip.</p>

          {trip && (
            <button
              type="button"
              className={homeDetailsLinkClass}
              onClick={() => navigate(`/trips/${trip.id}`)}
            >
              View Trip Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;

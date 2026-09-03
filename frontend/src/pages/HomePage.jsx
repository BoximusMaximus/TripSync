<<<<<<< HEAD
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import GroupCard from "../components/GroupCard";
import TripCard from "../components/TripCard";
import MapView from "../components/GoogleMapSnippet";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { mockHomeData } from "./HomePage.mockData";

import {
  homePageClass,
  homeLoadingClass,
  homeCardsRowClass,
  homeMapSectionClass,
  homeMapIntroClass,
  homeDetailsLinkClass,
} from "./styles/tailwindStyles";

// TODO: replace with a real API call (e.g. GET /api/groups/mine + trips)
// once those endpoints exist. Isolated here so swapping it out never
// touches GroupCard / TripCard / MapView, which only take props.
const fetchHomeData = () =>
  new Promise((resolve) => {
    setTimeout(() => resolve(mockHomeData), 300);
  });

const HomePage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    fetchHomeData()
      .then((result) => {
        if (!isMounted) return;
        setData(result);
        setHasVoted(Boolean(result.trip?.hasVoted));
        setStatus("success");
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || "Unable to load your dashboard.");
        setStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const handleVoteToggle = () => {
    setVoteLoading(true);
    // TODO: call the real trip-vote endpoint; this only toggles local UI state.
    setTimeout(() => {
      setHasVoted((prev) => !prev);
      setVoteLoading(false);
    }, 300);
  };

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
            name={group.name}
            createdOn={group.createdOn}
            memberCount={group.memberCount}
            isMember={group.isMember}
            onNavigate={() => navigate("/groups")}
            onJoin={group.isMember ? undefined : () => navigate("/groups")}
          />
        ) : (
          <EmptyState
            title="No group yet"
            message="Join or create a group to start planning."
            action={{ label: "Go to Groups", to: "/groups" }}
          />
        )}

        {trip ? (
          <TripCard
            name={trip.name}
            destination={trip.destination}
            voteCount={trip.voteCount}
            hasVoted={hasVoted}
            voteLoading={voteLoading}
            onVoteToggle={handleVoteToggle}
            onNavigate={() => navigate(`/trips/${trip.id}`)}
          />
        ) : (
          <EmptyState
            title="No active trip"
            message="Vote on a trip to see it here."
            action={{ label: "Go to Trips", to: "/trips" }}
          />
        )}
      </div>

      <div className={homeMapSectionClass}>
        <MapView locations={activities} />

        <div className={homeMapIntroClass}>
          <p>
            Map shows every saved activity for the active trip, plotted by
            Google Places ID.
          </p>

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
=======
const HomePage = () => {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-[var(--text-strong)]">
        Welcome to TripSync
      </h1>

      <p className="mt-3 text-[var(--text-muted)]">
        Login successful. Start planning your next trip.
      </p>
    </main>
>>>>>>> bea356fbdbb7f8aa06c85abf085ffdc200bb1cad
  );
};

export default HomePage;

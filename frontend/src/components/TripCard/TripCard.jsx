<<<<<<< HEAD
import clsx from "clsx";

import VoteButton from "../VoteButton";
import {
  tripCardClass,
  tripCardHeaderClass,
  tripCardTitleClass,
  tripCardMetaClass,
  tripCardCostClass,
  tripCardFooterClass,
  tripCardDetailsClass,
} from "./styles/tailwindStyles";

const formatDestination = (destination) => {
  if (!destination) return null;
  if (typeof destination === "string") return destination.trim() || null;

  const parts = [
    destination.city,
    destination.state,
    destination.country,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : null;
};

const formatCost = (cents) => {
  if (!Number.isFinite(cents)) return null;
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
};

/**
 * `totalCostCents`, when provided, is a computed API value (SUM of the
 * trip's activity estimates) — never derived or stored locally here.
 * Voting is delegated entirely to VoteButton.
 */
const TripCard = ({
  name,
  destination,
  voteCount = 0,
  hasVoted = false,
  voteLoading = false,
  canVote = true,
  onVoteToggle,
  onNavigate,
  totalCostCents,
  className,
}) => {
  const displayName = name?.trim() ? name : "Untitled trip";
  const displayDestination = formatDestination(destination);
  const displayCost = formatCost(totalCostCents);

  return (
    <div className={clsx(tripCardClass, className)}>
      <button
        type="button"
        className={tripCardHeaderClass}
        onClick={onNavigate}
        aria-label={`View ${displayName}`}
      >
        <h3 className={tripCardTitleClass}>{displayName}</h3>

        {displayDestination && (
          <p className={tripCardMetaClass}>{displayDestination}</p>
        )}

        {displayCost && (
          <p className={tripCardCostClass}>Est. total: {displayCost}</p>
        )}
      </button>

      <div className={tripCardFooterClass}>
        <VoteButton
          voteCount={voteCount}
          hasVoted={hasVoted}
          isLoading={voteLoading}
          disabled={!canVote}
          onClick={onVoteToggle}
          label="trip"
        />

        <button
          type="button"
          className={tripCardDetailsClass}
          onClick={onNavigate}
        >
          Details <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};

export default TripCard;
=======
// import { Link } from "react-router-dom";

// import {
//     tripCardClass,
//     tripNameClass,
//     tripLocationClass,
//     tripGroupTagClass,
//     tripActionsClass,
//     tripVoteButtonClass,
//     tripVoteButtonOnClass,
//     tripDetailsLinkClass,
// } from "../../pages/styles/tailwindStyles";

// export default function TripCard({
//     trip,
//     onVoteClick,
//     busy,
// })
// {
//     return (
//         <div className={tripCardClass}>
//             <h3 className={tripNameClass}>{trip.name}</h3>

//             <p className={tripLocationClass}>
//                 {trip.city}, {trip.state}, {trip.country}
//                 <span className={tripGroupTagClass}>{trip.group_name}</span>
//             </p>

//             <div className={tripActionsClass}>
//                 <button
//                     className={
//                         trip.has_voted ? tripVoteButtonOnClass : tripVoteButtonClass
//                     }
//                     onClick={onVoteClick}
//                     disabled={busy}
//                 >
//                     ▲ Vote · {trip.vote_count}
//                 </button>

//                 <Link to={`/trips/${trip.id}`} className={tripDetailsLinkClass}>
//                     Details →
//                 </Link>
//             </div>
//         </div>
//     );
// }
>>>>>>> bea356fbdbb7f8aa06c85abf085ffdc200bb1cad

import clsx from "clsx";

import VoteButton from "../VoteButton";
import {
  activityCardClass,
  activityCardTitleClass,
  activityCardDescriptionClass,
  activityCardLocationClass,
  activityCardCostClass,
  activityCardFooterClass,
  activityCardActionsClass,
  activityCardActionClass,
} from "./styles/tailwindStyles";

const formatCost = (cents) => {
  if (!Number.isFinite(cents)) return null;
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
};

const formatLocation = (address, placeId) => {
  if (!address) return null;

  const { street, city, state, zip, country } = address;
  const parts = [street, city, state, zip, country].filter(Boolean);
  if (!parts.length) return null;

  const source = placeId ? "via Google Places" : "manual address";
  return `${parts.join(", ")} — ${source}`;
};

/**
 * `costEstimateCents` (from `activities.cost_estimate_cents`) is only
 * converted to dollars here, for display — the API keeps the integer-cents
 * source of truth. `address` fields are all optional manual-entry fallbacks
 * for activities without a Google Places match.
 */
const ActivityCard = ({
  name,
  description,
  address,
  placeId,
  costEstimateCents,
  voteCount = 0,
  hasVoted = false,
  voteLoading = false,
  canVote = true,
  onVoteToggle,
  canEdit = false,
  onEdit,
  onDelete,
  className,
}) => {
  const displayName = name?.trim() ? name : "Untitled activity";
  const displayLocation = formatLocation(address, placeId);
  const displayCost = formatCost(costEstimateCents);

  return (
    <div className={clsx(activityCardClass, className)}>
      <h3 className={activityCardTitleClass}>{displayName}</h3>

      {description && (
        <p className={activityCardDescriptionClass}>{description}</p>
      )}

      {displayLocation && (
        <p className={activityCardLocationClass}>{displayLocation}</p>
      )}

      {displayCost && (
        <p className={activityCardCostClass}>Est. cost: {displayCost}</p>
      )}

      <div className={activityCardFooterClass}>
        <VoteButton
          voteCount={voteCount}
          hasVoted={hasVoted}
          isLoading={voteLoading}
          disabled={!canVote}
          onClick={onVoteToggle}
          label="activity"
        />

        {canEdit && (onEdit || onDelete) && (
          <div className={activityCardActionsClass}>
            {onEdit && (
              <button
                type="button"
                className={activityCardActionClass}
                onClick={onEdit}
              >
                Edit
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                className={activityCardActionClass}
                onClick={onDelete}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityCard;

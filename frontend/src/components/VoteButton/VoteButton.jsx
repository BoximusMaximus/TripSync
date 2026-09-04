import clsx from "clsx";

import {
  voteButtonBaseClass,
  voteButtonVotedClass,
  voteButtonUnvotedClass,
  voteButtonCountClass,
} from "./styles/tailwindStyles";

/**
 * Visual vote toggle, reused for both trip and activity voting.
 * Vote rules (one-per-user, switching votes, etc.) live in the API —
 * this component only reflects state and reports clicks.
 */
const VoteButton = ({
  voteCount = 0,
  hasVoted = false,
  isLoading = false,
  disabled = false,
  onClick,
  label = "item",
  className,
}) => {
  const count = Number.isFinite(voteCount) ? voteCount : 0;
  const isDisabled = disabled || isLoading;

  const handleClick = (event) => {
    if (isDisabled) return;
    onClick?.(event);
  };

  const accessibleLabel = `${hasVoted ? "Remove your vote for" : "Vote for"} this ${label} — ${count} vote${count === 1 ? "" : "s"}`;

  return (
    <button
      type="button"
      className={clsx(
        voteButtonBaseClass,
        hasVoted ? voteButtonVotedClass : voteButtonUnvotedClass,
        className,
      )}
      onClick={handleClick}
      disabled={isDisabled}
      aria-pressed={hasVoted}
      aria-busy={isLoading}
      aria-label={accessibleLabel}
    >
      <span aria-hidden="true">▲</span>
      <span>{isLoading ? "Voting…" : "Vote"}</span>
      <span className={voteButtonCountClass}>· {count}</span>
    </button>
  );
};

export default VoteButton;

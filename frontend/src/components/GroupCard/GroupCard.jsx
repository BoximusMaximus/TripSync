import clsx from "clsx";

import {
  groupCardClass,
  groupCardHeaderClass,
  groupCardTitleClass,
  groupCardMetaClass,
  groupCardFooterClass,
  groupCardJoinClass,
  groupCardViewClass,
} from "./styles/tailwindStyles";

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

/**
 * `memberCount` is a computed API value (COUNT of memberships) — this
 * component only ever displays it, it never derives or stores it itself.
 */
const GroupCard = ({
  name,
  createdOn,
  memberCount,
  isMember = false,
  onJoin,
  onNavigate,
  className,
}) => {
  const displayName = name?.trim() ? name : "Untitled group";
  const displayDate = formatDate(createdOn);
  const displayCount = Number.isFinite(memberCount) ? memberCount : null;

  const metaParts = [];
  if (displayCount !== null) {
    metaParts.push(`${displayCount} member${displayCount === 1 ? "" : "s"}`);
  }
  if (displayDate) {
    metaParts.push(`created ${displayDate}`);
  }

  return (
    <div className={clsx(groupCardClass, className)}>
      <button
        type="button"
        className={groupCardHeaderClass}
        onClick={onNavigate}
        aria-label={`View ${displayName}`}
      >
        <h3 className={groupCardTitleClass}>{displayName}</h3>

        {metaParts.length > 0 && (
          <p className={groupCardMetaClass}>{metaParts.join(" · ")}</p>
        )}
      </button>

      <div className={groupCardFooterClass}>
        {!isMember && onJoin && (
          <button
            type="button"
            className={groupCardJoinClass}
            onClick={onJoin}
          >
            Join
          </button>
        )}

        <button
          type="button"
          className={groupCardViewClass}
          onClick={onNavigate}
        >
          View <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};

export default GroupCard;

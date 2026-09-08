import clsx from "clsx";
import { Link } from "react-router-dom";

import {
  emptyStateClass,
  emptyStateTitleClass,
  emptyStateMessageClass,
  emptyStateActionClass,
} from "./styles/tailwindStyles";

/**
 * Reusable "nothing here yet" state for groups, trips, activities, or
 * map locations. `action` may point to a route (`to`) or run a handler
 * (`onClick`) — pass whichever fits the caller.
 */
const EmptyState = ({ title, message, action, className }) => (
  <div className={clsx(emptyStateClass, className)} role="status">
    <h3 className={emptyStateTitleClass}>{title}</h3>

    {message && <p className={emptyStateMessageClass}>{message}</p>}

    {action?.to && (
      <Link to={action.to} className={emptyStateActionClass}>
        {action.label}
      </Link>
    )}

    {action?.onClick && !action?.to && (
      <button
        type="button"
        className={emptyStateActionClass}
        onClick={action.onClick}
      >
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;

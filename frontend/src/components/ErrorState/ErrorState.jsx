import clsx from "clsx";
import { Link } from "react-router-dom";

import {
  errorStateClass,
  errorStateCodeClass,
  errorStateTitleClass,
  errorStateMessageClass,
  errorStateActionsClass,
  errorStatePrimaryClass,
  errorStateSecondaryClass,
} from "./styles/tailwindStyles";

/**
 * Reusable error display for the Error and 404 pages (and anywhere else
 * an API/loader failure needs a friendly face). Pass `homeHref={null}`
 * to omit the home link, e.g. when embedding inside another component.
 */
const ErrorState = ({
  title = "Something went wrong",
  message,
  statusCode,
  onRetry,
  retryLabel = "Try Again",
  homeHref = "/",
  homeLabel = "Back to Home",
  className,
}) => (
  <div className={clsx(errorStateClass, className)} role="alert">
    {statusCode && <p className={errorStateCodeClass}>{statusCode}</p>}

    <h1 className={errorStateTitleClass}>{title}</h1>

    {message && <p className={errorStateMessageClass}>{message}</p>}

    <div className={errorStateActionsClass}>
      {onRetry && (
        <button
          type="button"
          className={errorStatePrimaryClass}
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      )}

      {homeHref && (
        <Link to={homeHref} className={errorStateSecondaryClass}>
          {homeLabel}
        </Link>
      )}
    </div>
  </div>
);

export default ErrorState;

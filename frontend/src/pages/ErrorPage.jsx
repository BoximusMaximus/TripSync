import ErrorState from "../components/ErrorState";
import { errorPageClass } from "./styles/tailwindStyles";

/**
 * Generic error page, built on the reusable ErrorState component.
 * `onRetry`, `message`, and `statusCode` are optional so callers (a route
 * errorElement, a failed data loader, etc.) can supply real context.
 */
const ErrorPage = ({ message, statusCode, onRetry }) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }
    window.location.reload();
  };

  return (
    <div className={errorPageClass}>
      <ErrorState
        title="Something went wrong"
        message={message || "An unexpected error occurred. Please try again."}
        statusCode={statusCode}
        onRetry={handleRetry}
        homeHref="/"
        homeLabel="Back to Home"
      />
    </div>
  );
};

export default ErrorPage;

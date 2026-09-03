import { Link } from "react-router-dom";
import gotLost from "../assets/images/gotLost.png";

import {
  notFoundDiv,
  notFoundHeader,
  notFoundDescription,
  notFoundParagraph,
  notFoundLink,
} from "./styles/tailwindStyles";

export default function NotFoundPage() {
  return (
    <div className={notFoundDiv}>
      <h1 className={notFoundHeader}>404</h1>

      <img
        src={gotLost}
        alt="Lost traveler"
        className="w-64 max-w-full my-6"
      />

      <h2 className={notFoundDescription}>
        Looks Like You Took a Wrong Turn
      </h2>

      <p className={notFoundParagraph}>
        Looks like this trip wasn't on the itinerary. Even
        Google Maps can't save you now.
      </p>

      <Link
        data-cy="notFound-btn"
        className={notFoundLink}
        to="/"
      >
        Back to TripSync
      </Link>
    </div>
  );
}

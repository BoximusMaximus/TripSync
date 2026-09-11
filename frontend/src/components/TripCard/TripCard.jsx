import { Link } from "react-router-dom";

import {
    tripCardClass,
    tripNameClass,
    tripLocationClass,
    tripGroupTagClass,
    tripActionsClass,
    tripVoteButtonClass,
    tripVoteButtonOnClass,
    tripDetailsLinkClass,
    tripDeleteButtonClass,
} from "./styles/tailwindStyles";

export default function TripCard({
    trip,
    onVoteClick,
    onDeleteClick,
    busy,
})
{
    return (
        <div className={tripCardClass}>
            <h3 className={tripNameClass}>{trip.name}</h3>

            <p className={tripLocationClass}>
                {trip.city}, {trip.state}{trip.zip ? ` ${trip.zip}` : ""}, {trip.country}
                {/* <span className={tripGroupTagClass}>{trip.group_name}</span> */}
            </p>

            <div className={tripActionsClass}>
                {/* No trip-vote endpoint yet - parked until the backend adds one.
                <button
                    className={
                        trip.has_voted ? tripVoteButtonOnClass : tripVoteButtonClass
                    }
                    onClick={onVoteClick}
                    disabled={busy}
                >
                    ▲ Vote · {trip.vote_count}
                </button> */}

                <Link to={`/trips/${trip.id}`} className={tripDetailsLinkClass}>
                    Details →
                </Link>

                <button
                    type="button"
                    className={tripDeleteButtonClass}
                    onClick={onDeleteClick}
                    disabled={busy}
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

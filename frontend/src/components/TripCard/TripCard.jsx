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
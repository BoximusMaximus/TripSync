// import {
//     activityCardClass,
//     activityNameClass,
//     activityDescriptionClass,
//     activityAddressClass,
//     activityCostClass,
//     activityActionsClass,
//     activityVoteButtonClass,
//     activityVoteButtonOnClass,
//     activityLinkActionsClass,
//     activityEditClass,
//     activityDeleteClass,
// } from "../../pages/styles/tailwindStyles";

// export default function ActivityCard({
//     activity,
//     onVoteClick,
//     onEditClick,
//     onDeleteClick,
//     busy,
// })
// {
//     // cost_estimate_cents is an integer (ERD.sql). Divide by 100 to display,
//     // multiply by 100 on submit. Never store or send money as a float.
//     const costInDollars = (activity.cost_estimate_cents / 100).toFixed(2);

//     return (
//         <div className={activityCardClass}>
//             <h3 className={activityNameClass}>{activity.name}</h3>

//             <p className={activityDescriptionClass}>{activity.description}</p>

//             <p className={activityAddressClass}>
//                 {activity.street} —{" "}
//                 {activity.place_id ? "via Google Places" : "manual address (Geocoding)"}
//             </p>

//             <p className={activityCostClass}>Est. cost: ${costInDollars}</p>

//             <div className={activityActionsClass}>
//                 <button
//                     className={
//                         activity.has_voted
//                             ? activityVoteButtonOnClass
//                             : activityVoteButtonClass
//                     }
//                     onClick={onVoteClick}
//                     disabled={busy}
//                 >
//                     ▲ Vote · {activity.vote_count}
//                 </button>

//                 <span className={activityLinkActionsClass}>
//                     <button
//                         className={activityEditClass}
//                         onClick={onEditClick}
//                         disabled={busy}
//                     >
//                         Edit
//                     </button>

//                     <button
//                         className={activityDeleteClass}
//                         onClick={onDeleteClick}
//                         disabled={busy}
//                     >
//                         Delete
//                     </button>
//                 </span>
//             </div>
//         </div>
//     );
// }

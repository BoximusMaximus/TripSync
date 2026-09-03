// import { useEffect, useState } from "react";
// import { useParams, Link } from "react-router-dom";
// import api from "../utilities";
// import ActivityCard from "../components/ActivityCard/ActivityCard";
// import { mockTrips, mockActivities } from "../fixture/mockData";
// import {
//   tripDetailPageClass,
//   tripDetailHeaderClass,
//   tripDetailTitleClass,
//   tripDetailLocationClass,
//   tripDetailActionsClass,
//   tripDetailEditButtonClass,
//   tripDetailAddButtonClass,
//   tripDetailColumnsClass,
//   tripDetailLeftClass,
//   tripDetailRightClass,
//   tripDetailMapSlotClass,
//   tripDetailMapNoteClass,
//   tripDetailStatusClass,
//   tripDetailErrorClass,
// } from "./styles/tailwindStyles";

// export default function TripPage() {
//   const { tripId } = useParams();

//   const [trip, setTrip] = useState(null);
//   const [activities, setActivities] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const loadTrip = async () => {
//     setLoading(true);
//     setError("");

//     try {
//       // const tripResponse = await api.get(`trips/${tripId}/`);
//       // setTrip(tripResponse.data);
//       // const activityResponse = await api.get(`trips/${tripId}/activities/`);
//       // setActivities(activityResponse.data);
//       const foundTrip = mockTrips.find((item) => item.id === Number(tripId));
//       setTrip(foundTrip || null);
//       setActivities(
//         mockActivities.filter((item) => item.trip_id === Number(tripId)),
//       );
//     } catch (err) {
//       setError("Could not load trip.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadTrip();
//   }, [tripId]);

//   if (loading) {
//     return (
//       <div className={tripDetailPageClass}>
//         <p className={tripDetailStatusClass}>Loading trip...</p>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className={tripDetailPageClass}>
//         <p className={tripDetailErrorClass}>{error}</p>
//       </div>
//     );
//   }

//   if (!trip) {
//     return (
//       <div className={tripDetailPageClass}>
//         <p className={tripDetailStatusClass}>Trip not found.</p>
//         <Link to="/trips">Back to trips</Link>
//       </div>
//     );
//   }

//   return (
//     <div className={tripDetailPageClass}>
//       <div className={tripDetailHeaderClass}>
//         <div>
//           <h1 className={tripDetailTitleClass}>{trip.name}</h1>
//           <p className={tripDetailLocationClass}>
//             {trip.city}, {trip.state}, {trip.country}
//           </p>
//         </div>

//         <div className={tripDetailActionsClass}>
//           <button className={tripDetailEditButtonClass}>Edit Trip</button>
//           <button className={tripDetailAddButtonClass}>+ Add Activity</button>
//         </div>
//       </div>

//       <div className={tripDetailColumnsClass}>
//         <div className={tripDetailLeftClass}>
//           {activities.length === 0 && (
//             <p className={tripDetailStatusClass}>No activities yet.</p>
//           )}

//           {activities.map((activity) => (
//             <ActivityCard key={activity.id} activity={activity} />
//           ))}
//         </div>

//         <div className={tripDetailRightClass}>
//           <div className={tripDetailMapSlotClass}>
//             Google Map — activity pins (Places ID)
//           </div>
//           <p className={tripDetailMapNoteClass}>
//             Cost is a user-entered estimate · votes decide the itinerary
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

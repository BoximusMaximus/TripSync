import { useEffect, useState } from "react";
import api from "../utilities";
// import { mockTrips, mockGroups } from "../fixture/mockData";
import TripCard from "../components/TripCard/TripCard";

import {
  tripsPageClass,
  tripsHeaderClass,
  tripsTitleClass,
  tripsSubtitleClass,
  tripsNewButtonClass,
  tripsGridClass,
  tripsSectionClass,
  tripsSectionTitleClass,
  tripsStatusClass,
  tripsErrorClass,
  tripsFooterNoteClass,
  tripFormClass,
  tripFormRowClass,
  tripFormFieldClass,
  tripFormInputClass,
  tripFormSelectClass,
  tripFormSubmitClass,
  tripFormCancelClass,
} from "./styles/tailwindStyles";

// export default function TripsPage() {
//   const [trips, setTrips] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [busyTripId, setBusyTripId] = useState(null);

//   const [showForm, setShowForm] = useState(false);
//   const [newTrip, setNewTrip] = useState({
//     name: "",
//     city: "",
//     state: "",
//     country: "",
//     group_id: "",
//   });
//   const [submitting, setSubmitting] = useState(false);

//   const loadTrips = async () => {
//     setLoading(true);
//     setError("");

    try {
      const response = await api.get("trips/");
      setTrips(response.data);
      setTrips(mockTrips);
    } catch (err) {
      setError("Could not load trips.");
    } finally {
      setLoading(false);
    }
  };

//   useEffect(() => {
//     loadTrips();
//   }, []);

//   const handleCreateTrip = async (event) => {
//     event.preventDefault();

//     if (
//       newTrip.name.trim() === "" ||
//       newTrip.group_id === ""
//     ) {
//       return;
//     }

//     setSubmitting(true);
//     setError("");

    try {
      const response = await api.post("trips/", newTrip);
      setTrips([...trips, response.data]);
      // const chosenGroup = mockGroups.find(
      //   (group) => group.id === Number(newTrip.group_id),
      // );
      // const fakeTrip = {
      //   id: Date.now(),
      //   group_id: Number(newTrip.group_id),
      //   group_name: chosenGroup ? chosenGroup.name : "",
      //   name: newTrip.name,
      //   city: newTrip.city,
      //   state: newTrip.state,
      //   country: newTrip.country,
      //   vote_count: 0,
      //   has_voted: false,
      // };
      // setTrips([...trips, fakeTrip]);

//       setNewTrip({
//         name: "",
//         city: "",
//         state: "",
//         country: "",
//         group_id: "",
//       });
//       setShowForm(false);
//     } catch (err) {
//       setError("Could not create trip.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

  const groupedTrips = trips.reduce((sections, trip) => {
    const section = sections.find((item) => item.group_id === trip.group_id);
    if (section) {
      section.trips.push(trip);
    } else {
      sections.push({
        group_id: trip.group_id,
        group_name: trip.group_name,
        trips: [trip],
      });
    }
    return sections;
  }, []);

  const handleVoteTrip = async (trip) => {
    setBusyTripId(trip.id);
    setError("");

    try {
      if (trip.has_voted) {
        await api.delete(`trips/${trip.id}/vote/`);
        setTrips(
          trips.map((item) =>
            item.id === trip.id
              ? { ...item, has_voted: false, vote_count: item.vote_count - 1 }
              : item,
          ),
        );
      } else {
        await api.post(`trips/${trip.id}/vote/`);
        setTrips(
          trips.map((item) => {
            if (item.id === trip.id) {
              return {
                ...item,
                has_voted: true,
                vote_count: item.vote_count + 1,
              };
            }

//             if (
//               item.group_id === trip.group_id &&
//               item.has_voted
//             ) {
//               return {
//                 ...item,
//                 has_voted: false,
//                 vote_count: item.vote_count - 1,
//               };
//             }

//             return item;
//           }),
//         );
//       }
//     } catch (err) {
//       setError("Could not update vote.");
//     } finally {
//       setBusyTripId(null);
//     }
//   };

//   return (
//     <div className={tripsPageClass}>
//       <div className={tripsHeaderClass}>
//         <h1 className={tripsTitleClass}>Trips</h1>
//         <button
//           className={tripsNewButtonClass}
//           onClick={() => setShowForm(!showForm)}
//         >
//           {showForm ? "Cancel" : "+ New Trip"}
//         </button>
//       </div>

      {/* <p className={tripsSubtitleClass}>
        Vote for ONE trip per group — voting again switches your vote · full
        CRUD on trips
      </p> */}

//       {showForm && (
//         <form
//           className={tripFormClass}
//           onSubmit={handleCreateTrip}
//         >
//           <div className={tripFormRowClass}>
//             <label className={tripFormFieldClass}>
//               Group
//               <select
//                 className={tripFormSelectClass}
//                 value={newTrip.group_id}
//                 onChange={(event) =>
//                   setNewTrip({
//                     ...newTrip,
//                     group_id: event.target.value,
//                   })
//                 }
//               >
//                 <option value="">Select a group</option>
//                 {mockGroups.map((group) => (
//                   <option key={group.id} value={group.id}>
//                     {group.name}
//                   </option>
//                 ))}
//               </select>
//             </label>

//             <label className={tripFormFieldClass}>
//               Trip name
//               <input
//                 className={tripFormInputClass}
//                 type="text"
//                 value={newTrip.name}
//                 onChange={(event) =>
//                   setNewTrip({
//                     ...newTrip,
//                     name: event.target.value,
//                   })
//                 }
//                 placeholder="Oahu Reunion"
//               />
//             </label>

//             <label className={tripFormFieldClass}>
//               City
//               <input
//                 className={tripFormInputClass}
//                 type="text"
//                 value={newTrip.city}
//                 onChange={(event) =>
//                   setNewTrip({
//                     ...newTrip,
//                     city: event.target.value,
//                   })
//                 }
//                 placeholder="Honolulu"
//               />
//             </label>

//             <label className={tripFormFieldClass}>
//               State
//               <input
//                 className={tripFormInputClass}
//                 type="text"
//                 value={newTrip.state}
//                 onChange={(event) =>
//                   setNewTrip({
//                     ...newTrip,
//                     state: event.target.value,
//                   })
//                 }
//                 placeholder="HI"
//               />
//             </label>

//             <label className={tripFormFieldClass}>
//               Country
//               <input
//                 className={tripFormInputClass}
//                 type="text"
//                 value={newTrip.country}
//                 onChange={(event) =>
//                   setNewTrip({
//                     ...newTrip,
//                     country: event.target.value,
//                   })
//                 }
//                 placeholder="USA"
//               />
//             </label>

//             <button
//               className={tripFormSubmitClass}
//               type="submit"
//               disabled={submitting}
//             >
//               {submitting ? "Creating..." : "Create trip"}
//             </button>

//             <button
//               className={tripFormCancelClass}
//               type="button"
//               onClick={() => setShowForm(false)}
//             >
//               Cancel
//             </button>
//           </div>
//         </form>
//       )}

//       {loading && (
//         <p className={tripsStatusClass}>Loading trips...</p>
//       )}

//       {error && <p className={tripsErrorClass}>{error}</p>}

//       {!loading && !error && trips.length === 0 && (
//         <p className={tripsStatusClass}>No trips yet.</p>
//       )}

      {!loading &&
        !error &&
        groupedTrips.map((section) => (
          <section key={section.group_id} className={tripsSectionClass}>
            <h2 className={tripsSectionTitleClass}>{section.group_name}</h2>
            <div className={tripsGridClass}>
              {section.trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onVoteClick={() => handleVoteTrip(trip)}
                  busy={busyTripId === trip.id}
                />
              ))}
            </div>
          </section>
        ))}

      {/* <p className={tripsFooterNoteClass}>
        activities per trip are view-only here · Details → Trip Detail /
        Activities page
      </p> */}
    </div>
  );
}

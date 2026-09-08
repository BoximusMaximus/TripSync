// Temporary development fallback only, used solely by HomePage until the
// groups/trips/activities endpoints exist. Reusable components (GroupCard,
// TripCard, MapView, ...) never import this — they only take props.
export const mockHomeData = {
  group: {
    id: 1,
    name: "Bachelor Party Crew",
    createdOn: "2026-06-01",
    memberCount: 8,
    isMember: true,
  },
  trip: {
    id: 1,
    name: "Vegas Bachelor Party",
    destination: { city: "Las Vegas", state: "NV", country: "USA" },
    voteCount: 4,
    hasVoted: false,
  },
  activities: [
    { id: 1, name: "Pool Party at MGM", placeId: "ChIJJQ6Ck8zFyIARfxB2vQVF2Z0" },
    { id: 2, name: "Steakhouse Dinner", placeId: "ChIJT4mIszHEyIARbIoYQzpc9iA" },
    { id: 3, name: "Helicopter Tour", placeId: "ChIJE2zMv-7FyIARMkApqxfBrKI" },
  ],
};

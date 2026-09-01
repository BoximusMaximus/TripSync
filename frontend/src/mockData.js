// Mock API responses. Shapes follow resources/ERD.sql.
// Each page loads from here until the backend endpoints exist,
// then the mock line in the loader is swapped for the real request.

// QUESTION (open questions 3.2): does the real groups list endpoint
// return member_count, is_member, and is_leader? The wireframe needs
// all three, and the README says member_count is computed, never stored.
// If the list response omits them, each card needs its own request.
export const mockGroups = [
  {
    id: 1,
    name: "Oahu Crew",
    created_on: "2026-05-12",
    member_count: 5,
    is_member: true,
    is_leader: true,
  },
  {
    id: 2,
    name: "Bachelor Party Crew",
    created_on: "2026-06-01",
    member_count: 8,
    is_member: true,
    is_leader: false,
  },
  {
    id: 3,
    name: "Ski Squad",
    created_on: "2026-04-22",
    member_count: 6,
    is_member: false,
    is_leader: false,
  },
  {
    id: 4,
    name: "Family Reunion",
    created_on: "2026-03-02",
    member_count: 12,
    is_member: false,
    is_leader: false,
  },
  {
    id: 5,
    name: "College Friends",
    created_on: "2026-02-14",
    member_count: 7,
    is_member: false,
    is_leader: false,
  },
  {
    id: 6,
    name: "Work Retreat",
    created_on: "2026-01-30",
    member_count: 9,
    is_member: false,
    is_leader: false,
  },
];

// QUESTION (open questions 4.1): trips belong to a group, but the
// wireframe shows no group name and no group selector. group_id and
// group_name are included here because the one-vote-per-user-per-group
// rule can't be shown on screen without them. Confirm the API returns
// group_name and not just group_id.

// QUESTION (open questions 4.3): does the real trips endpoint return
// vote_count and has_voted? has_voted is per-user, so it can only come
// from an authenticated request.
export const mockTrips = [
  {
    id: 1,
    group_id: 2,
    group_name: "Bachelor Party Crew",
    name: "Vegas Bachelor Party",
    city: "Las Vegas",
    state: "NV",
    country: "USA",
    vote_count: 4,
    has_voted: true,
  },
  {
    id: 2,
    group_id: 1,
    group_name: "Oahu Crew",
    name: "Oahu Reunion",
    city: "Honolulu",
    state: "HI",
    country: "USA",
    vote_count: 2,
    has_voted: false,
  },
  {
    id: 3,
    group_id: 1,
    group_name: "Oahu Crew",
    name: "Denver Ski Weekend",
    city: "Denver",
    state: "CO",
    country: "USA",
    vote_count: 1,
    has_voted: false,
  },
];

// QUESTION (open questions 5.2): these are all the address fields from
// ERD.sql. If the backend hydrates street/city/state/zip/country from
// place_id via server-side Geocoding, the create form sends less.

// Cost is stored as integer cents (ERD.sql). Divide by 100 to display,
// multiply by 100 on submit. Never store money as a float.
export const mockActivities = [
  {
    id: 1,
    trip_id: 1,
    name: "Pool Party at MGM",
    description: "Cabana + day passes for the group",
    street: "3799 S Las Vegas Blvd",
    city: "Las Vegas",
    state: "NV",
    zip: "89109",
    country: "USA",
    place_id: "ChIJ_mock_mgm_pool",
    cost_estimate_cents: 15000,
    vote_count: 5,
    has_voted: true,
  },
  {
    id: 2,
    trip_id: 1,
    name: "Steakhouse Dinner",
    description: "Group dinner, night one",
    street: "3325 S Las Vegas Blvd",
    city: "Las Vegas",
    state: "NV",
    zip: "89109",
    country: "USA",
    place_id: "ChIJ_mock_steakhouse",
    cost_estimate_cents: 12000,
    vote_count: 3,
    has_voted: false,
  },
  {
    id: 3,
    trip_id: 1,
    name: "Helicopter Tour",
    description: "Grand Canyon sunset flight",
    street: "5596 Haven St",
    city: "Las Vegas",
    state: "NV",
    zip: "89119",
    country: "USA",
    place_id: "",
    cost_estimate_cents: 45000,
    vote_count: 2,
    has_voted: false,
  },
];

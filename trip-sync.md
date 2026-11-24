# TripSync

A collaborative travel planning application that helps groups plan trips together through shared itineraries, destination discovery, voting, budgeting, saved activities, maps, weather information, and currency conversion.

TripSync combines trip planning, group decision-making, and travel utilities into one application so travelers do not have to coordinate across group chats, spreadsheets, map apps, and budgeting tools.

---

## Table of Contents

- [Overview](#overview)
- [Problem](#problem)
- [Solution](#solution)
- [Core Features](#core-features)
- [User Flow](#user-flow)
- [Example Trip](#example-trip)
- [Collaborative Itinerary](#collaborative-itinerary)
- [Activity Discovery](#activity-discovery)
- [Map Integration](#map-integration)
- [Group Voting](#group-voting)
- [Budget Tracking](#budget-tracking)
- [Currency Conversion](#currency-conversion)
- [Weather Integration](#weather-integration)
- [Saved Activities](#saved-activities)
- [User Roles and Permissions](#user-roles-and-permissions)
- [Tech Stack](#tech-stack)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Design](#database-design)
- [API Design](#api-design)
- [Third-Party APIs](#third-party-apis)
- [Deployment Architecture](#deployment-architecture)
- [MVP](#mvp)
- [Stretch Features](#stretch-features)
- [Optimize My Day](#optimize-my-day)
- [Future Improvements](#future-improvements)

---

# Overview

**TripSync** is a full-stack collaborative travel planner designed for groups.

Users can create trips, invite friends, build itineraries, save activities, vote on plans, manage budgets, view destinations on a map, check weather, and convert currencies.

For example, a group planning a trip to Japan could use TripSync to:

- Create a shared Japan trip
- Invite five travelers
- Add Tokyo and Kyoto as destinations
- Search for activities
- Save interesting places
- Vote on hotels and attractions
- Build a daily itinerary
- View activities on a map
- Track estimated expenses
- Split shared costs
- Check upcoming weather
- Convert Japanese Yen into US Dollars
- Optimize the itinerary based on travel distance

Instead of coordinating across several different applications, the group can manage the entire trip in one place.

---

# Problem

Planning a group trip can quickly become complicated.

Travelers often rely on several separate tools:

- Group chats for communication
- Google Maps for locations
- Notes apps for activity ideas
- Spreadsheets for budgets
- Weather applications
- Currency conversion applications
- Polls for group decisions

Important information becomes scattered across multiple platforms.

Groups may also struggle with questions such as:

- Where should we stay?
- What activities should we do?
- Who wants to attend each activity?
- How much will the trip cost?
- Who paid for the hotel?
- How much does everyone owe?
- What will the weather be?
- How far apart are our activities?
- Are we scheduling too many activities in one day?

TripSync brings these tools together into one collaborative platform.

---

# Solution

TripSync provides a shared workspace for every trip.

Each trip contains:

- Travelers
- Destinations
- Daily itineraries
- Activities
- Saved places
- Polls
- Votes
- Expenses
- Budgets
- Maps
- Weather
- Currency information
- Notes

Members of the trip can collaborate instead of relying on one person to organize everything.

---

# Core Features

## Authentication

Users can:

- Create an account
- Log in
- Log out
- View their trips
- Create new trips
- Join trips through invitations

Authentication can be implemented using Django REST Framework token authentication or JWT authentication.

---

## Trip Creation

Users can create a trip containing:

- Trip name
- Start date
- End date
- Destination
- Home currency
- Target budget
- Travelers

Example:

```text
Japan 2027 🇯🇵

March 12 - March 21

5 Travelers

Target Budget:
$2,500 per person
```

---

## Trip Invitations

Trip owners can invite other travelers.

Possible invitation methods:

- Invite link
- Email invitation
- Invite code

Example:

```text
tripsync.com/join/JAPAN-2027-X82K
```

After joining, the new traveler becomes a member of the trip.

---

# User Flow

A typical TripSync workflow could look like this:

```text
Register / Login
      ↓
Create Trip
      ↓
Invite Friends
      ↓
Add Destinations
      ↓
Search Activities
      ↓
Save Activities
      ↓
Vote on Activities
      ↓
Add Winners to Itinerary
      ↓
View Activities on Map
      ↓
Track Budget
      ↓
Check Weather
      ↓
Optimize Schedule
```

---

# Example Trip

```text
🇯🇵 JAPAN 2027

March 12 - March 21

5 Travelers

Budget
$7,420 / $12,500


Upcoming

March 13

09:00 AM
Breakfast

11:00 AM
Senso-ji

01:30 PM
Sushi Lunch

05:00 PM
Shibuya Sky


Group Decision

Where should we stay?

Shinjuku     4 votes
Shibuya      3 votes
Ginza        1 vote


[ Add Activity ]
```

---

# Collaborative Itinerary

Each trip contains itinerary days.

For example:

```text
March 14
Tokyo
```

Activities can then be added to that day.

Example:

```text
9:00 AM

Tsukiji Outer Market

Category:
Food

Estimated Cost:
$25


11:30 AM

teamLab Borderless

Category:
Attraction

Estimated Cost:
$30


2:00 PM

Meiji Shrine

Category:
Sightseeing

Cost:
Free


5:30 PM

Shibuya Sky

Category:
Attraction

Estimated Cost:
$18
```

Users can:

- Add activities
- Edit activities
- Delete activities
- Comment on activities
- Vote on activities
- Save activities
- Mark themselves as attending
- Move activities between days
- Reorder activities

A future version could support drag-and-drop itinerary organization.

---

# Activity Discovery

TripSync can integrate with external APIs to help travelers discover things to do.

Users could search:

```text
Things to do in Tokyo
```

Example results:

```text
Tokyo Skytree

Rating: 4.6

[ Save ]
[ Add to Itinerary ]
```

```text
Senso-ji

Rating: 4.7

[ Save ]
[ Add to Itinerary ]
```

Possible activity categories include:

- Food
- Attractions
- Nightlife
- Museums
- Outdoors
- Shopping
- Events
- Historical Sites
- Entertainment

Activities retrieved from external APIs can include:

- Name
- Location
- Latitude
- Longitude
- Rating
- Photos
- Category
- Description

---

# Map Integration

Trip activities can appear on an interactive map.

Possible providers:

- Google Maps
- Mapbox

Example:

```text
              Senso-ji
                 ●


        Ueno Park
            ●


             Tokyo Station
                  ●


                          Shibuya
                             ●
```

Selecting a map marker can display:

- Activity name
- Time
- Description
- Estimated cost
- Rating
- Photo
- Link to itinerary

Users could also filter markers by itinerary day.

Example:

```text
Day 1 - Tokyo
Day 2 - Tokyo
Day 3 - Kyoto
Day 4 - Kyoto
```

Future versions could calculate transportation time between activities.

Example:

```text
Shibuya Sky → Tokyo Skytree

Estimated Travel Time:
45 minutes
```

---

# Group Voting

TripSync allows groups to make decisions together.

Users can create polls.

Example:

## Friday Night Activity

```text
Mario Kart Experience

4 votes


Shibuya Bar Crawl

2 votes


Tokyo Tower

1 vote
```

Another example:

## Which neighborhood should we stay in?

```text
Shinjuku

4 votes


Shibuya

3 votes


Ginza

1 vote
```

Possible poll types:

- Single choice
- Multiple choice
- Yes / No
- Ranked choice

Users may also be able to comment on poll options.

---

# Budget Tracking

Each trip can have a target budget.

Example:

```text
Japan Trip Budget


Flights
$3,800

Hotels
$2,400

Food
$1,250

Transportation
$620

Activities
$850

Shopping
$400


Estimated Total
$9,320


Target Budget
$10,000


Remaining
$680
```

Expenses can belong to categories such as:

- Flights
- Hotels
- Food
- Transportation
- Activities
- Shopping
- Miscellaneous

---

## Expense Splitting

Shared expenses can also track who paid.

Example:

```text
Hotel

Total:
$1,200

Paid By:
Abdel

Split Between:
4 Travelers

Each Traveler Owes:
$300
```

Future versions could calculate:

```text
Abdel is owed $640

Sarah owes $220

John owes $190

Mike owes $230
```

This introduces more advanced backend and database logic.

---

# Currency Conversion

Travelers can view activity and expense prices in both the destination currency and their home currency.

Example:

```text
teamLab Ticket

¥4,800 JPY

≈

$32.40 USD
```

Each trip can have a home currency.

Example:

```text
Trip Currency:
USD

Destination Currency:
JPY
```

The Django backend can retrieve exchange rates from an external API and cache them instead of requesting new rates every time React renders.

---

# Weather Integration

TripSync can display weather information for upcoming itinerary days.

Example:

```text
Tokyo

March 14

64°F

Partly Cloudy

Rain Chance:
15%
```

The application could also use weather information to help travelers plan activities.

Example:

```text
Perfect for:

✓ Walking
✓ Outdoor attractions
✓ Parks
```

If rain is expected:

```text
Rain Expected

You have 3 outdoor activities scheduled.

Consider replacing:

- Ueno Park
- Meiji Shrine
- Tokyo Walking Tour
```

Future versions could recommend indoor alternatives automatically.

---

# Saved Activities

Before putting activities directly into the itinerary, travelers can save ideas to a shared wishlist.

Example:

```text
Saved for Tokyo


❤️ teamLab Borderless

❤️ Shibuya Sky

❤️ Senso-ji

❤️ Tokyo Skytree

❤️ Ichiran Ramen

❤️ Pokémon Center
```

Saved activities can later be:

- Voted on
- Commented on
- Removed
- Added to the itinerary

This allows the group to brainstorm before committing to a schedule.

---

# User Roles and Permissions

TripSync can implement role-based permissions.

## Owner

Owners can:

- Delete the trip
- Edit trip settings
- Invite members
- Remove members
- Change permissions
- Manage destinations
- Manage budgets

---

## Editor

Editors can:

- Add activities
- Edit activities
- Create polls
- Add expenses
- Manage itinerary items
- Save locations

---

## Member / Viewer

Members can:

- View the itinerary
- Vote
- Comment
- Save activities
- Mark activity attendance

This provides useful authorization logic for the Django backend.

---

# Tech Stack

## Frontend

- React
- JavaScript
- Vite
- React Router
- Axios
- HTML
- CSS

Potential future additions:

- React Query
- Tailwind CSS
- Material UI
- React Beautiful DnD / DnD Kit

---

## Backend

- Python
- Django
- Django REST Framework
- Gunicorn

Potential additions:

- Django Channels
- Redis
- Celery

---

## Database

- PostgreSQL

---

## Server / Deployment

- Nginx
- Gunicorn
- Django
- PostgreSQL

Potential hosting platforms:

- AWS
- Render
- Railway
- DigitalOcean
- Fly.io

---

# Frontend Architecture

Possible React structure:

```text
src/
│
├── components/
│   ├── Navbar.jsx
│   ├── TripCard.jsx
│   ├── ActivityCard.jsx
│   ├── ActivitySearch.jsx
│   ├── ItineraryDay.jsx
│   ├── Poll.jsx
│   ├── BudgetSummary.jsx
│   ├── ExpenseCard.jsx
│   ├── Map.jsx
│   ├── WeatherCard.jsx
│   └── CurrencyConverter.jsx
│
├── pages/
│   ├── Dashboard.jsx
│   ├── TripDetails.jsx
│   ├── Itinerary.jsx
│   ├── Budget.jsx
│   ├── Explore.jsx
│   ├── SavedActivities.jsx
│   ├── Login.jsx
│   └── Register.jsx
│
├── services/
│   ├── api.js
│   ├── tripService.js
│   ├── activityService.js
│   └── authService.js
│
├── App.jsx
└── main.jsx
```

The frontend can demonstrate concepts including:

- React state
- Props
- Components
- Forms
- Conditional rendering
- API requests
- Authentication
- React Router
- Protected routes
- Reusable UI components
- Asynchronous API calls

---

# Backend Architecture

The Django backend acts as the central API.

```text
React
   |
   v
Django REST API
   |
   +---- PostgreSQL
   |
   +---- Maps API
   |
   +---- Weather API
   |
   +---- Currency API
```

Third-party API keys should remain on the backend whenever possible.

React communicates with Django rather than directly exposing sensitive API keys.

---

# Database Design

A simplified relationship model:

```text
User
 |
 |
TripMember
 |
 |
Trip
 |
 +--------- Destination
 |
 +--------- ItineraryDay
 |              |
 |              +--------- Activity
 |
 +--------- Expense
 |
 +--------- Poll
 |              |
 |              +--------- PollOption
 |                            |
 |                            +--------- Vote
 |
 +--------- SavedActivity
```

---

## Trip

Example fields:

```text
id
name
description
start_date
end_date
budget
owner_id
home_currency
created_at
updated_at
```

---

## TripMember

```text
id
trip_id
user_id
role
joined_at
```

Possible roles:

```text
OWNER
EDITOR
MEMBER
```

---

## Destination

```text
id
trip_id
name
country
latitude
longitude
arrival_date
departure_date
```

---

## ItineraryDay

```text
id
trip_id
destination_id
date
notes
```

---

## Activity

```text
id
trip_id
itinerary_day_id
title
description
location
latitude
longitude
start_time
end_time
estimated_cost
currency
category
created_by
created_at
```

---

## SavedActivity

```text
id
trip_id
saved_by
name
description
latitude
longitude
external_place_id
category
created_at
```

---

## Poll

```text
id
trip_id
question
created_by
poll_type
created_at
expires_at
```

---

## PollOption

```text
id
poll_id
text
activity_id
```

---

## Vote

```text
id
user_id
poll_option_id
created_at
```

A uniqueness constraint can prevent a user from voting more times than the poll allows.

---

## Expense

```text
id
trip_id
description
amount
currency
category
paid_by
date
created_at
```

---

## ExpenseParticipant

```text
id
expense_id
user_id
share_amount
paid
```

---

# API Design

Possible REST endpoints:

## Authentication

```http
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/me/
```

---

## Trips

```http
GET    /api/trips/
POST   /api/trips/
GET    /api/trips/:id/
PATCH  /api/trips/:id/
DELETE /api/trips/:id/
```

---

## Trip Members

```http
GET    /api/trips/:id/members/
POST   /api/trips/:id/members/
DELETE /api/trips/:id/members/:userId/
```

---

## Destinations

```http
GET  /api/trips/:id/destinations/
POST /api/trips/:id/destinations/
```

---

## Activities

```http
GET    /api/trips/:id/activities/
POST   /api/trips/:id/activities/
GET    /api/activities/:id/
PATCH  /api/activities/:id/
DELETE /api/activities/:id/
```

---

## Saved Activities

```http
GET    /api/trips/:id/saved/
POST   /api/trips/:id/saved/
DELETE /api/saved/:id/
```

---

## Polls

```http
GET  /api/trips/:id/polls/
POST /api/trips/:id/polls/
```

---

## Voting

```http
POST /api/polls/:id/vote/
```

---

## Budget

```http
GET /api/trips/:id/budget/
```

---

## Expenses

```http
GET    /api/trips/:id/expenses/
POST   /api/trips/:id/expenses/
PATCH  /api/expenses/:id/
DELETE /api/expenses/:id/
```

---

## Weather

```http
GET /api/weather/
```

Example:

```http
GET /api/weather/?city=Tokyo
```

---

## Currency

```http
GET /api/currency/
```

Example:

```http
GET /api/currency/?from=JPY&to=USD&amount=4800
```

---

# Third-Party APIs

TripSync can integrate with several external APIs.

| Feature         | Possible Service           |
| --------------- | -------------------------- |
| Maps            | Google Maps / Mapbox       |
| Places          | Google Places              |
| Directions      | Google Directions / Mapbox |
| Weather         | OpenWeather / WeatherAPI   |
| Currency        | Exchange Rate API          |
| Location Photos | Google Places / Unsplash   |

The APIs should generally be accessed through Django.

Example:

```text
React
   ↓

GET /api/weather/?city=Tokyo

   ↓

Django

   ↓

Weather API

   ↓

Django transforms response

   ↓

React
```

This architecture keeps external API logic centralized.

---

# Deployment Architecture

Production architecture:

```text
                        INTERNET
                            |
                            v
                         NGINX
                            |
                +-----------+-----------+
                |                       |
                v                       v
        React Static Files           /api/*
                                        |
                                        v
                                    Gunicorn
                                        |
                                        v
                                     Django
                                        |
                                        v
                                   PostgreSQL
                                        |
                       +----------------+----------------+
                       |                |                |
                       v                v                v
                    Maps API       Weather API      Currency API
```

---

# MVP

The first version should focus on the features that establish TripSync's identity.

## MVP Features

### 1. Authentication

Users can:

- Register
- Log in
- Log out

### 2. Trips

Users can:

- Create trips
- Edit trips
- Delete trips
- View their trips

### 3. Members

Users can:

- Invite members
- Join trips

### 4. Itinerary

Users can:

- Create itinerary days
- Add activities
- Edit activities
- Delete activities

### 5. Saved Activities

Users can:

- Save activity ideas
- Add saved activities to itineraries

### 6. Voting

Users can:

- Create polls
- Add poll options
- Vote

### 7. Budget

Users can:

- Add expenses
- View total costs
- Compare expenses against the trip budget

### 8. Maps

Users can:

- View itinerary locations on a map

### 9. Weather

Users can:

- View destination weather

---

# Recommended Group Project Scope

For an initial group project, focus heavily on:

```text
Collaboration
+
Itinerary
+
Voting
+
Map
```

These four features define what makes TripSync different from a basic travel CRUD application.

Once these features work well, add:

```text
Budget
Weather
Currency
Expense Splitting
```

---

# Stretch Features

After completing the MVP, TripSync could expand with:

- Real-time collaboration
- WebSockets
- Django Channels
- Notifications
- Comments
- Expense splitting
- Activity photos
- Calendar export
- PDF itinerary export
- Route optimization
- AI recommendations
- AI itinerary generation
- PWA support
- Mobile-friendly layouts
- Offline itinerary access
- Flight tracking
- Hotel information
- Transportation planning
- Packing lists
- Shared notes
- Trip chat

---

# Real-Time Collaboration

Django Channels and WebSockets could allow changes to appear instantly.

For example:

```text
Sarah added "Tokyo Skytree"
```

Other members would immediately see:

```text
New Activity Added

Tokyo Skytree
```

without refreshing the page.

Real-time functionality could apply to:

- New activities
- Poll votes
- Comments
- Expense updates
- Member activity
- Notifications

---

# Optimize My Day

One of TripSync's most powerful future features could be itinerary optimization.

Suppose the user creates:

```text
10:00 AM
Tokyo Skytree

12:00 PM
Shibuya

2:00 PM
Senso-ji

4:00 PM
Meiji Shrine
```

The application could determine that the traveler is repeatedly crossing the city.

TripSync could suggest:

```text
Suggested Schedule


10:00 AM
Senso-ji


11:30 AM
Tokyo Skytree


2:30 PM
Meiji Shrine


4:00 PM
Shibuya
```

Result:

```text
Estimated Travel Time Saved:

58 minutes
```

Optimization could consider:

- Distance
- Driving time
- Walking time
- Public transportation
- Opening hours
- Reservation times
- Weather
- User preferences

---

# Intelligent Weather Suggestions

Weather information could eventually influence itinerary recommendations.

Example:

```text
Saturday Forecast

Heavy Rain
```

TripSync detects:

```text
3 outdoor activities scheduled
```

It could recommend:

```text
Consider moving:

Ueno Park
Meiji Shrine
Walking Tour
```

and suggest indoor activities such as:

```text
teamLab Borderless
Tokyo National Museum
Shopping
Aquarium
```

---

# Future AI Features

AI could eventually become an additional planning assistant.

Example request:

```text
Plan a 4-day Tokyo itinerary for five friends.

Budget:
$800 per person

Interests:
Food
Anime
Nightlife
History
```

TripSync could generate a suggested itinerary.

The group could then:

- Save activities
- Remove activities
- Vote on activities
- Rearrange days
- Adjust the budget

AI should enhance the collaborative workflow rather than replace it.

---

# Why This Project Is Valuable

TripSync demonstrates much more than basic CRUD functionality.

The application can showcase experience with:

- React
- Django
- Django REST Framework
- PostgreSQL
- REST APIs
- Authentication
- Authorization
- Relational database design
- Third-party APIs
- Maps
- Geolocation
- Currency APIs
- Weather APIs
- API caching
- Group collaboration
- Voting systems
- Budget calculations
- Expense splitting
- Nginx
- Gunicorn
- Deployment
- WebSockets
- Real-time communication

It also provides several interesting technical problems that developers can discuss during interviews.

---

# Potential Development Responsibilities

For a four-person group, responsibilities could initially be divided like this:

## Developer 1 — Authentication / Trips

- Registration
- Login
- Trip CRUD
- Trip membership
- Permissions

## Developer 2 — Itinerary

- Itinerary days
- Activities
- Saved activities
- Activity forms
- Activity editing

## Developer 3 — Maps / External APIs

- Google Maps or Mapbox
- Places search
- Weather
- Currency conversion

## Developer 4 — Voting / Budget

- Polls
- Voting
- Expenses
- Budget calculations
- Expense splitting

Everyone can then collaborate on integration, testing, styling, and deployment.

---

# Testing

Potential backend testing:

- Django unit tests
- Django REST Framework API tests
- Permission tests
- Model tests
- Budget calculation tests
- Voting constraint tests

Potential frontend testing:

- Jest
- React Testing Library
- Cypress

Cypress can be used for end-to-end workflows such as:

```text
Register
→ Create Trip
→ Add Activity
→ Vote
→ Add Expense
→ View Itinerary
```

---

# CI/CD

GitHub Actions can automatically run tests when pull requests are created.

Example workflow:

```text
Push / Pull Request
        ↓
GitHub Actions
        ↓
Backend Tests
        ↓
Frontend Tests
        ↓
Cypress E2E Tests
        ↓
Build Application
```

Future deployment pipelines could automatically deploy the application after changes are merged into the main branch.

---

# Development Workflow

A recommended Git workflow:

```text
main
 |
 +--- develop
       |
       +--- feature/authentication
       |
       +--- feature/itinerary
       |
       +--- feature/maps
       |
       +--- feature/voting
       |
       +--- feature/budget
```

Developers create feature branches and submit pull requests into `develop`.

After testing, `develop` can be merged into `main`.

---

# Project Goal

The goal of TripSync is to make group travel planning simple, collaborative, and organized.

Instead of travelers asking:

> Where was that restaurant someone sent in the group chat?

TripSync provides one shared location containing the entire trip.

From deciding where to go to determining what everyone owes, TripSync aims to support the complete group travel planning experience.

---

# Vision

TripSync starts as a collaborative itinerary planner.

It can eventually evolve into a complete travel coordination platform combining:

```text
Google Maps
+
Trip Planning
+
Group Voting
+
Splitwise-style Expenses
+
Weather
+
Currency Conversion
+
AI Recommendations
```

all centered around one shared trip.

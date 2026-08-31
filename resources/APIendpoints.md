# APIendpoints

## Backend API
### Google Maps Geocoding 
#### User Story: 
> User is staying at an Airbnb. There is no 'google places' id for that airbnb yet, therefore well use the
> Geocoding api where the user inputs an address (request) wherein the request is an address and the
> response is lat/lon and google places id

### Google places search (Activities)
#### User Story:
> user wants to find restaurants close to their airbnb to make dinner reservations for their trip. The request must include a text query (Ex:"Pizza in Chicago") a max result count (Ex:5)
> minimum rating (Ex: "4 Stars and above") and a location bias, which declares a circle in which the center is decided by lat/lon which is retrieved from the Geocoding API, and the radius of
> circle is chosen by the user (or preset)(Ex: 5 miles). Our response will be a google places ID (or list of place objects)
### Response:
Get(`https://places.googleapis.com/v1/places/PLACES_ID_HERE`)
```
- (list[Obj])List of places
  - (Obj)google places id
    - formatted address
    - dict: location{lat:val,lon:val}
    - dict {text: displayname, languagecode:language}
```


## Endpoints
### User
|Endpoint|Purpose|Notes|
|--------|-------|-----|
|/users/|get or "put" user info||
|/users/login/|login user||
|/users/register/|register user||
|/users/delete/|delete user||

### Group
|Endpoint|Purpose|Notes|
|--------|-------|-----|
|/groups/<int:id>|get, delete, or "put" group info| id is group id or name|
|/groups/<int:id>/add_user/|add user to group||
|/groups/create/|create group||



### Trips
|Endpoint|Purpose|Notes|
|--------|-------|-----|
|/trips/<int:id>|get, delete, or "put" trip info| id is trip id or name|
|/trips/<int:id>/add_group/|add group to trip||
|/trips/create/|create trip||

### Trip Votes
|Endpoint|Purpose|Notes|
|--------|-------|-----|
|/trip_votes/<int:trip_id>|get vote info from trip id| id is trip id or name|
|/trip_votes/<int:trip_id>/add_vote/|add vote to trip votes|set vote user as request user|

### Activities
|Endpoint|Purpose|Notes|
|--------|-------|-----|
|/activities/<int:id>|get, delete, or "put" activity info| id is activity id or name|
|/activities/create/|create activity||
|/activities/find_coords/|get lat/lon|params will be physical address (city/zip/state)|
|/activities/find_activities/|get place IDs|params will be lat/lon and radius (lat/lon from `activities/find_coords/`)|

### Activities Votes
|Endpoint|Purpose|Notes|
|--------|-------|-----|
|/activities_votes/<int:activity_id>|get vote info from activity id| id is activity id or name|
|/activities_votes/<int:activity_id>/add_vote/|add vote to activity votes|set vote user as request user|

import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import SignUpPage from "./pages/SignUpPage";
import GroupsPage from "./pages/GroupsPage";
import TripsPage from "./pages/TripsPage";
import TripPage from "./pages/TripPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/signup",
    element: <SignUpPage />,
  },
  {
    path: "/groups",
    element: <GroupsPage />,
  },
  {
    path: "/trips",
    element: <TripsPage />,
  },
  {
    path: "/trips/:tripId",
    element: <TripPage />,
  },
]);

export default router;

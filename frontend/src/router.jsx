import { createBrowserRouter } from "react-router-dom";

import App from "./App";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import GroupsPage from "./pages/GroupsPage";
import ProfilePage from "./pages/profilePage";
import TripsPage from "./pages/TripsPage";
import TripPage from "./pages/TripPage";

import NotFoundPage from "./pages/NotFoundPage";

import {
  redirectIfLoggedIn,
  requireLogin,
  userConfirmation,
} from "./services/account";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    loader: userConfirmation,

    children: [
      {
        index: true,
        element: <LoginPage />,
        loader: redirectIfLoggedIn,
      },
      {
        path: "signup",
        element: <SignUpPage />,
      },
      {
        // "/" is still Login until auth routing/redirects are wired up;
        // this is the authenticated landing page in the meantime.
        path: "home",
        element: <HomePage />,
        loader: requireLogin,
      },
      {
        path: "about",
        element: <AboutPage />,
      },
      {
        path: "groups",
        element: <GroupsPage />,
        loader: requireLogin,
      },
      {
        path: "trips",
        element: <TripsPage />,
        loader: requireLogin,
      },
      {
        path: "trips/:tripId",
        element: <TripPage />,
        loader: requireLogin,
      },
      {
        path: "/profile",
        element: <ProfilePage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default router;

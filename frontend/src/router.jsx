import { createBrowserRouter } from "react-router-dom";

import App from "./App";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import HomePage from "./pages/HomePage";

// import GroupsPage from "./pages/GroupsPage";
// import TripsPage from "./pages/TripsPage";
// import TripPage from "./pages/TripPage";

import NotFoundPage from "./pages/NotFoundPage";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";

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
<<<<<<< HEAD
        // "/" is still Login until auth routing/redirects are wired up;
        // this is the authenticated landing page in the meantime.
        path: "home",
        element: <HomePage />,
      },
      {
        path: "about",
        element: <AboutPage />,
=======
        path: "home",
        element: <HomePage />,
        loader: requireLogin,
>>>>>>> bea356fbdbb7f8aa06c85abf085ffdc200bb1cad
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },

      // {
      //   path: "/groups",
      //   element: <GroupsPage />,
      // },

      // {
      //   path: "/trips",
      //   element: <TripsPage />,
      // },

      // {
      //   path: "/trips/:tripId",
      //   element: <TripPage />,
      // },
    ],
  },
]);

export default router;

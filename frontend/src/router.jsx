import { createBrowserRouter } from "react-router-dom";

import App from "./App";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import HomePage from "./pages/HomePage";

// import GroupsPage from "./pages/GroupsPage";
// import TripsPage from "./pages/TripsPage";
// import TripPage from "./pages/TripPage";

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
        path: "/groups",
        element: <GroupsPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default router;

import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import SignUpPage from "./pages/SignUpPage";
import GroupsPage from "./pages/GroupsPage";
import TripsPage from "./pages/TripsPage";

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
]);

export default router;

import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import SignUpPage from "./pages/SignUpPage";
import GroupsPage from "./pages/GroupsPage";

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
]);

export default router;

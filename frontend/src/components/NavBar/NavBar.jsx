import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import clsx from "clsx";

import { userLogOut } from "../../services/account";

import {
  navOuterClass,
  navBarClass,
  navBrandClass,
  navLinksClass,
  navLinkClass,
  navLinkActiveClass,
  navRightClass,
  navLogoutClass,
} from "./styles/tailwindStyles";

const NavBar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/" ||
    location.pathname === "/signup";

  const showFullNav = user && !isAuthPage;

  const getNavLinkClass = ({ isActive }) =>
    clsx(navLinkClass, isActive && navLinkActiveClass);

  const handleLogout = async () => {
    await userLogOut();

    setUser(null);

    navigate("/");
  };

  return (
    <header className={navOuterClass}>
      <nav className={navBarClass} data-cy="navbar">
        <NavLink
          to={user ? "/home" : "/"}
          className={navBrandClass}
          data-cy="nav-brand"
        >
          TripSync
        </NavLink>

        {showFullNav && (
          <>
            <div
              className={navLinksClass}
              data-cy="nav-links"
            >
              <NavLink
                to="/home"
                className={getNavLinkClass}
                data-cy="nav-home"
              >
                Home
              </NavLink>

              <NavLink
                to="/groups"
                className={getNavLinkClass}
                data-cy="nav-groups"
              >
                Groups
              </NavLink>

              <NavLink
                to="/trips"
                className={getNavLinkClass}
                data-cy="nav-trips"
              >
                Trips
              </NavLink>

              <NavLink
                to="/about"
                className={getNavLinkClass}
                data-cy="nav-about"
              >
                About
              </NavLink>
            </div>

            <div className={navRightClass}>
              <NavLink
                to="/profile"
                className={getNavLinkClass}
                data-cy="nav-profile"
              >
                Profile
              </NavLink>

              <button
                type="button"
                className={navLogoutClass}
                onClick={handleLogout}
                data-cy="nav-logout"
              >
                Logout
              </button>
            </div>
          </>
        )}
      </nav>
    </header>
  );
};

export default NavBar;

import { NavLink } from "react-router-dom";
import clsx from "clsx";

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

const NavBar = () => {
  const getNavLinkClass = ({ isActive }) =>
    clsx(
      navLinkClass,
      isActive && navLinkActiveClass,
    );

  const handleLogout = () => {
    // TODO: connect logout API later
    console.log("logout");
  };

  return (
    <header className={navOuterClass}>
      <nav className={navBarClass} data-cy="navbar">
        <NavLink
          to="/"
          className={navBrandClass}
          data-cy="nav-brand"
        >
          TripSync
        </NavLink>

        <div className={navLinksClass} data-cy="nav-links">
          <NavLink
            to="/"
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
      </nav>
    </header>
  );
};

export default NavBar;
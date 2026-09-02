import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import clsx from "clsx";

import { logIn } from "../services/account";

import {
  authPageClass,
  authCardClass,
  authNavClass,
  authTabClass,
  authTabActiveClass,
  authTabInactiveClass,
  authCardBodyClass,
  authTitleClass,
  authSubtitleClass,
  authFormClass,
  authFieldClass,
  authInputClass,
  authErrorClass,
  authSubmitClass,
} from "./styles/tailwindStyles";

const LoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useOutletContext();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const result = await logIn(username, password);

      if (result.error) {
        setError(result.error);
        return;
      }

      setUser(result.user);
      navigate("/home");
    } catch (error) {
      console.error(error);
      setError("Unable to log in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={authPageClass}>
      <div className={authCardClass}>
        <nav className={authNavClass}>
          <Link
            to="/"
            className={clsx(
              authTabClass,
              location.pathname === "/"
                ? authTabActiveClass
                : authTabInactiveClass,
            )}
          >
            Login
          </Link>

          <Link
            to="/signup"
            className={clsx(
              authTabClass,
              location.pathname === "/signup"
                ? authTabActiveClass
                : authTabInactiveClass,
            )}
          >
            Signup
          </Link>
        </nav>

        <div className={authCardBodyClass}>
          <h1 className={authTitleClass}>Welcome back</h1>

          <p className={authSubtitleClass}>
            Log in to continue planning your trip.
          </p>

          <form
            className={authFormClass}
            onSubmit={handleSubmit}
            noValidate
          >
            <label className={authFieldClass}>
              <span>Username</span>

              <input
                className={authInputClass}
                type="text"
                name="username"
                placeholder="Username"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                autoComplete="username"
                required
              />
            </label>

            <label className={authFieldClass}>
              <span>Password</span>

              <input
                className={authInputClass}
                type="password"
                name="password"
                placeholder="Password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <p className={authErrorClass} role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className={authSubmitClass}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

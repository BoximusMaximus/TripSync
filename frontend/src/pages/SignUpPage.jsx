import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import clsx from "clsx";

import { signUp } from "../services/account";

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
  authSuccessClass,
  authSubmitClass,
} from "./styles/tailwindStyles";

const SignUpPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useOutletContext();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const result = await signUp(
        username,
        email,
        password,
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      setUser(result.user);
      setSuccess("Account created successfully.");

      navigate("/home");
    } catch (error) {
      console.error(error);
      setError("Unable to create account.");
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
          <h1 className={authTitleClass}>
            Create an account
          </h1>

          <p className={authSubtitleClass}>
            Sign up to start planning your trip.
          </p>

          {success && (
            <p className={authSuccessClass} role="status">
              {success}
            </p>
          )}

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
              <span>Email</span>

              <input
                className={authInputClass}
                type="email"
                name="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
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
                autoComplete="new-password"
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
              {isSubmitting
                ? "Creating account..."
                : "Signup"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;

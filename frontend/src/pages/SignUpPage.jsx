import { Link } from "react-router-dom";
import { useState } from "react";

import {
  authPageClass,
  authCardClass,
  authTitleClass,
  authSubtitleClass,
  authFormClass,
  authFieldClass,
  authInputClass,
  authErrorClass,
  authSuccessClass,
  authSubmitClass,
  authFooterClass,
  authFooterLinkClass,
} from "./styles/tailwindStyles";


const SignUpPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      // Add your signup API call here.

      console.log({
        email,
        password,
      });

      setSuccess("Account created successfully.");
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
        <h1 className={authTitleClass}>Sign up</h1>

        <p className={authSubtitleClass}>
          Create an account to start planning your trip.
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
            <span>Email</span>

            <input
              className={authInputClass}
              type="email"
              name="email"
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
            {isSubmitting ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className={authFooterClass}>
          Already have an account?{" "}
          <Link className={authFooterLinkClass} to="/login">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;

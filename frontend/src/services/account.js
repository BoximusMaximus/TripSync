import { redirect } from "react-router-dom";
import { client } from "./client";

const errorMessage = (error) => {
  const data = error.response?.data;

  if (!data) {
    return "Could not reach the server";
  }

  if (typeof data === "string") {
    return data;
  }

  const firstError = Object.values(data)[0];

  if (Array.isArray(firstError)) {
    return firstError[0];
  }

  return "Something went wrong. Please try again.";
};

export const signUp = async (username, email, password) => {
  try {
    const response = await client.post("signup/", {
      username,
      email,
      password,
    });

    return {
      user: response.data.client,
      error: null,
    };
  } catch (error) {
    console.error(errorMessage(error));

    return {
      user: null,
      error: errorMessage(error),
    };
  }
};

export const logIn = async (username, password) => {
  try {
    const response = await client.post("login/", {
      username,
      password,
    });

    return {
      user: response.data.client,
      error: null,
    };
  } catch (error) {
    console.error(errorMessage(error));

    return {
      user: null,
      error: errorMessage(error),
    };
  }
};

export const userConfirmation = async () => {
  try {
    const response = await client.get("info/");
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      return null;
    }

    console.error(errorMessage(error));
    return null;
  }
};

export const userLogOut = async () => {
  try {
    await client.post("logout/");
    return true;
  } catch (error) {
    console.error(
      "Logout request failed:",
      errorMessage(error),
    );

    return false;
  }
};

export const requireLogin = async () => {
  const user = await userConfirmation();

  if (!user) {
    throw redirect("/");
  }

  return user;
};

export const redirectIfLoggedIn = async () => {
  const user = await userConfirmation();

  return user ? redirect("/home") : null;
};

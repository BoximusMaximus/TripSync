import { redirect } from "react-router-dom";
import { client } from "./client";



const errorMessage = (error) => {
  const data = error.response?.data;

  if (!data) {
    return "Could not reach the server";
  }

  return typeof data === "string"
    ? data
    : JSON.stringify(data);
};


export const signUp = async (
  username,
  email,
  password,
) => {
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
    console.error(errorMessage(error));

    return null;
  }
};



export const userLogOut = async () => {
  try {
    await client.post("logout/");
  } catch (error) {
    console.error(
      "Logout request failed:",
      errorMessage(error),
    );
  }

  return null;
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
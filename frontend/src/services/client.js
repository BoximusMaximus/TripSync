import axios from "axios";

export const client = axios.create({
  baseURL: "/api/v1/users/",
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

const refreshAccessToken = () => {
  return axios.post(
    "/api/v1/users/token/refresh/",
    {},
    {
      withCredentials: true,
      withXSRFToken: true,
      xsrfCookieName: "csrftoken",
      xsrfHeaderName: "X-CSRFToken",
    },
  );
};

client.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    const url = originalRequest?.url || "";

    const isAuthRequest =
      url.includes("login/") ||
      url.includes("signup/") ||
      url.includes("logout/") ||
      url.includes("token/refresh/");

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;

      try {
        await refreshAccessToken();

        return client(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

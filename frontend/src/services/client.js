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
    },
  );
};

client.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    const isRefreshCall =
      originalRequest?.url?.includes("token/refresh");

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isRefreshCall
    ) {
      originalRequest._retry = true;

      try {
        await refreshAccessToken();

        return client(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

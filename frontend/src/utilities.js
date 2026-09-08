import axios from "axios";

// const api = axios.create({
//     baseURL: "http://localhost:8000/api/",
// });

// Same cookie + CSRF setup as services/client.js, but based at /api/v1/
// so the trips, groups and activities routes are reachable.
const api = axios.create({
  baseURL: "/api/v1/",
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

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    const isRefreshCall = originalRequest?.url?.includes("token/refresh");

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isRefreshCall
    ) {
      originalRequest._retry = true;

      try {
        await refreshAccessToken();

        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;

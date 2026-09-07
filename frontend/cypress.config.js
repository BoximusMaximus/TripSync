import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173/",
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 20000,
    supportFile: false,
  },
  viewportWidth: 1024,
  viewportHeight: 768,
  video: false,
});

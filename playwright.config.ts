import { defineConfig } from "@playwright/test";

const external = process.env.TEST_BASE_URL;
const baseURL = external || "http://localhost:4173";

export default defineConfig({
  testDir: "tests",
  workers: 2,
  use: { baseURL, trace: "retain-on-failure" },
  webServer: external ? undefined : {
    command: "pnpm build && pnpm start --port 4173",
    url: baseURL,
    timeout: 180_000,
    env: {
      MOCK_SCENARIO: "normal",
      NEXT_PUBLIC_GTM_ID: "GTM-FORMATEST",
    },
  },
});

import { defineConfig } from "@playwright/test";
import { localTestAccessKey } from "./tests/access-fixture";

const external = process.env.TEST_BASE_URL;
const baseURL = external || "http://localhost:4173";

export default defineConfig({
  testDir: "tests",
  workers: 2,
  use: { baseURL, trace: external ? "off" : "retain-on-failure" },
  webServer: external ? undefined : {
    command: "pnpm build && pnpm start --port 4173",
    url: baseURL,
    timeout: 180_000,
    env: {
      MOCK_SCENARIO: "normal",
      NEXT_PUBLIC_GTM_ID: "GTM-FORMATEST",
      SITE_ACCESS_KEY: localTestAccessKey,
    },
  },
});

import { test as base } from "@playwright/test";
import { SignInPage } from "./pages/sign-in.page.js";
import { SignUpPage } from "./pages/sign-up.page.js";
import { DashboardPage } from "./pages/dashboard.page.js";
import { DevicesPage } from "./pages/devices.page.js";
import { TEST_USER } from "../constants.js";

export const test = base.extend({
  signInPage: async ({ page }, use) => {
    await use(new SignInPage(page));
  },

  signUpPage: async ({ page }, use) => {
    await use(new SignUpPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  devicesPage: async ({ page }, use) => {
    const signInPage = new SignInPage(page);
    const devicesPage = new DevicesPage(page);

    await signInPage.goto();
    await signInPage.signIn(TEST_USER.email, TEST_USER.password);

    await devicesPage.heading.waitFor();
    await devicesPage.rows.first().waitFor();

    await use(devicesPage);
  },
});

export { expect } from "@playwright/test";

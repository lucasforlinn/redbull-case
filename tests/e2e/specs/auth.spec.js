import { test, expect } from "../fixtures.js";
import { resetEnvironment } from "../../api/requests/devices.api.js";

test.afterEach(async ({ request }) => {
  await resetEnvironment(request);
});

test.describe("E2E: Authentication", () => {
  test("a registered user can sign in regardless of the case of their e-mail", async ({
    signUpPage,
    signInPage,
    dashboardPage,
  }) => {
    test.fail();

    const email = `qa-case-${Date.now()}@example.com`;
    const password = "Password123";

    await test.step("register with a lowercase e-mail", async () => {
      await signUpPage.goto();
      await signUpPage.signUp(email, password);
      await expect(dashboardPage.devicesHeading).toBeVisible();
    });

    await test.step("sign out", async () => {
      await dashboardPage.signOut();
      await expect(signInPage.form).toBeVisible();
    });

    await test.step("sign in with the same address in a different case", async () => {
      await signInPage.goto();
      await signInPage.signIn(email.toUpperCase(), password);
      await expect(dashboardPage.devicesHeading).toBeVisible({ timeout: 5000 });
    });
  });
});

import { ROUTES } from "../../constants.js";

export class SignInPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.getByTestId("signin-email-input");
    this.passwordInput = page.getByTestId("signin-password-input");
    this.signInButton = page.getByRole("button", { name: "Sign in" });
    this.form = page.getByRole("heading", { name: "Sign in" });
  }

  async goto() {
    await this.page.goto(ROUTES.SIGN_IN);
  }

  async signIn(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}

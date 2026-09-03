import { ROUTES } from "../../constants.js";

export class SignUpPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Create an account" });
    this.emailInput = page.getByPlaceholder("you@example.com");
    this.passwordInput = page.getByTestId("signup-password-input");
    this.confirmPasswordInput = page.getByTestId("signup-confirm-password-input");
    this.signUpButton = page.getByRole("button", { name: "Sign up" });
  }

  async goto() {
    await this.page.goto(ROUTES.SIGN_IN);
    await this.signUpButton.click();
    await this.heading.waitFor();
  }

  async signUp(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.signUpButton.click();
  }
}

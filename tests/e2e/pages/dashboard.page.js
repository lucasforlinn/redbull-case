export class DashboardPage {
  constructor(page) {
    this.page = page;
    this.devicesHeading = page.getByRole("heading", { name: "Devices" });
    this.signOutButton = page.getByRole("button", { name: "Sign out" });
  }

  async signOut() {
    await this.signOutButton.click();
  }
}

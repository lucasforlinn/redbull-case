export class DevicesPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Devices" });

    this.filters = {
      status: page.getByTestId("filter-presence-status"),
      coreServices: page.getByTestId("filter-core-services-status"),
      orientation: page.getByTestId("filter-orientation"),
      metadataField: page.getByTestId("filter-metadata-key"),
      metadataValue: page.getByTestId("filter-metadata-value"),
    };

    this.table = page.getByRole("table");
    this.rows = this.table.locator("tbody").getByRole("row");
    this.pagination = page.getByText(/Page \d+ of \d+/);
  }

  async selectFilter(filter, value) {
    const paramName = {
      status: "presenceStatus",
      coreServices: "coreServicesStatus",
      orientation: "orientation",
      metadataField: "metadataKey",
      metadataValue: "metadataValue",
    }[filter];

    const responsePromise =
      paramName && value !== ""
        ? this.page
            .waitForResponse(
              (r) => r.url().includes(`${paramName}=${encodeURIComponent(value)}`) && r.status() === 200,
              { timeout: 5000 },
            )
            .catch(() => null)
        : null;

    await this.filters[filter].selectOption(value);
    if (responsePromise) await responsePromise;
  }

  async filterOptions(filter) {
    const values = await this.filters[filter]
      .locator("option")
      .evaluateAll((options) => options.map((option) => option.value));
    return values.filter((value) => value !== "__ALL__");
  }

  async paginationState() {
    const text = await this.pagination.innerText();
    const [, page, pages, devices] = text.match(/Page (\d+) of (\d+)\D+(\d+) devices/) ?? [];
    return { page: Number(page), pages: Number(pages), devices: Number(devices) };
  }

  async displayedDevices() {
    const rows = await this.rows.all();
    const devices = [];
    for (const row of rows) {
      const cells = await row.getByRole("cell").allInnerTexts();
      devices.push({
        status: cells[0]?.trim(),
        name: cells[1]?.trim(),
        coreServices: cells[2]?.trim(),
        serialNumber: cells[3]?.trim(),
        model: cells[4]?.trim(),
        orientation: cells[5]?.trim(),
        workspace: cells[6]?.trim(),
        accountName: cells[7]?.trim(),
        lastOnline: cells[8]?.trim(),
      });
    }
    return devices;
  }
}

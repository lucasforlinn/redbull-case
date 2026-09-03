import { test, expect } from "../fixtures.js";

test.describe("E2E: Ticket #1 — Devices filters", () => {
  test("filter by Online, Up to date, and Landscape, and validate displayed devices", async ({ devicesPage }) => {
    await test.step("apply filters: Online, Up to date, Landscape", async () => {
      await devicesPage.selectFilter("status", "online");
      await devicesPage.selectFilter("coreServices", "up-to-date");
      await devicesPage.selectFilter("orientation", "landscape");
    });

    await test.step("validate pagination shows matching devices", async () => {
      await expect(devicesPage.pagination).toContainText("8 devices");
      const { devices, pages } = await devicesPage.paginationState();
      expect(devices).toBe(8);
      expect(pages).toBe(1);
    });

    await test.step("validate each device in the list matches the applied filters", async () => {
      const list = await devicesPage.displayedDevices();
      expect(list).toHaveLength(8);

      for (const device of list) {
        expect(device.status.toLowerCase()).toBe("online");
        expect(device.coreServices.toLowerCase()).toBe("up-to-date");
        expect(device.orientation.toLowerCase()).toBe("landscape");
      }
    });
  });
});

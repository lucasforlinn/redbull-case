import { test, expect } from "@playwright/test";
import { getAccessToken } from "../requests/auth.api.js";
import { getDevice, listAllDevices, resetEnvironment, sendCommand } from "../requests/devices.api.js";
import { API_ENDPOINTS, COMMAND, TEST_USER } from "../../constants.js";

test.describe.configure({ mode: "serial" });

let token;

async function onlineOutdatedDevice(request) {
  const { items } = await listAllDevices(request, { token });
  const device = items.find((d) => d.presence_status === "online" && d.core_services_status === "outdated");
  expect(device, "the environment must hold an online, outdated device").toBeTruthy();
  return device;
}

async function offlineDevice(request) {
  const { items } = await listAllDevices(request, { token });
  return items.find((d) => d.presence_status === "offline");
}

function validCommand(deviceIds) {
  return {
    devices: deviceIds,
    command_name: COMMAND.UPDATE_CORE_SERVICES,
    params: { command_version: COMMAND.TARGET_VERSION },
  };
}

test.beforeAll(async ({ request }) => {
  token = await getAccessToken(request, TEST_USER);
});

test.beforeEach(async ({ request }) => {
  await resetEnvironment(request);
});

test.describe("API: Ticket #2 — POST /api/devices/command", () => {
  test("AC 1 — a valid request with only online devices succeeds and updates the device", async ({ request }) => {
    const device = await onlineOutdatedDevice(request);

    const response = await sendCommand(request, validCommand([device.device_id]), { token });

    expect(response.status()).toBe(200);
    expect((await response.json()).updated).toContain(device.device_id);

    const refetched = await (await getDevice(request, device.id, token)).json();
    expect(refetched.core_services_status).not.toBe(device.core_services_status);
  });

  test("AC 2 — a request targeting a device that is not online is handled with a clear error", async ({ request }) => {
    test.fail();

    const device = await offlineDevice(request);

    const response = await sendCommand(request, validCommand([device.device_id]), { token });
    const body = await response.json();

    expect(response.status(), "an offline device is an expected outcome, not a server fault").toBeLessThan(500);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(body, "an error response must not expose a stack trace").not.toHaveProperty("stack");
    expect(JSON.stringify(body)).toContain(device.device_id);
  });

  test("AC 3 — an unsupported command_name is rejected with a clear validation error", async ({ request }) => {
    const device = await onlineOutdatedDevice(request);

    const response = await sendCommand(
      request,
      { ...validCommand([device.device_id]), command_name: "reboot" },
      { token },
    );

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain("command_name");

    const unchanged = await (await getDevice(request, device.id, token)).json();
    expect(unchanged.core_services_status).toBe(device.core_services_status);
  });

  test("AC 4 — the request is rejected when Authorization is missing or invalid", async ({ request }) => {
    const payload = validCommand(["any-device-id"]);

    const withoutHeader = await sendCommand(request, payload);
    expect(withoutHeader.status()).toBe(401);

    const forged = await sendCommand(request, payload, {
      headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.forged.signature" },
    });
    expect(forged.status()).toBe(401);

    const other = await request.get(API_ENDPOINTS.DEVICES);
    expect(other.status(), "rejection must match the other protected endpoints").toBe(withoutHeader.status());
    expect(await other.json()).toEqual(await withoutHeader.json());
  });
});

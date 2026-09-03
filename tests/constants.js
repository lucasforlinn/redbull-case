export const ROUTES = {
  SIGN_IN: "/",
};

export const API_ENDPOINTS = {
  SIGN_IN: "/api/auth/signin",
  DEVICES: "/api/devices",
  DEVICE_COMMAND: "/api/devices/command",
  RESET: "/api/dev/reset",
};

export const TEST_USER = {
  email: process.env.QA_EMAIL ?? "qa.tester@example.com",
  password: process.env.QA_PASSWORD ?? "Password123",
};

export const COMMAND = {
  UPDATE_CORE_SERVICES: "update_core_services",
  TARGET_VERSION: "6.4.10",
};

export const PAGE_SIZE = 15;

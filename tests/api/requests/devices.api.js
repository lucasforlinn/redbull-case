import { API_ENDPOINTS, PAGE_SIZE } from "../../constants.js";

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export function listDevices(request, options = {}) {
  return request.get(API_ENDPOINTS.DEVICES, {
    headers: authHeaders(options.token),
    params: options.params,
  });
}

export async function listAllDevices(request, options) {
  const first = await listDevices(request, {
    token: options.token,
    params: { ...options.params, page: 1, pageSize: PAGE_SIZE },
  });
  const { items, total } = await first.json();
  const collected = [...items];

  const pages = Math.ceil(total / PAGE_SIZE);
  for (let page = 2; page <= pages; page += 1) {
    const response = await listDevices(request, {
      token: options.token,
      params: { ...options.params, page, pageSize: PAGE_SIZE },
    });
    const body = await response.json();
    collected.push(...body.items);
  }

  return { items: collected, total };
}

export function getDevice(request, id, token) {
  return request.get(`${API_ENDPOINTS.DEVICES}/${id}`, { headers: authHeaders(token) });
}

export function sendCommand(request, payload, options = {}) {
  return request.post(API_ENDPOINTS.DEVICE_COMMAND, {
    data: payload,
    headers: { ...authHeaders(options.token), ...options.headers },
  });
}

export function resetEnvironment(request) {
  return request.post(API_ENDPOINTS.RESET);
}

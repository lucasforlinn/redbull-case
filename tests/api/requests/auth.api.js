import { API_ENDPOINTS } from "../../constants.js";

export async function getAccessToken(request, credentials) {
  const response = await request.post(API_ENDPOINTS.SIGN_IN, { data: credentials });
  const { token } = await response.json();
  return token;
}

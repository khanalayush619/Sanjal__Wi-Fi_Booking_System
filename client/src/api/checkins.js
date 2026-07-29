import api from "./axios";

export async function createCheckin({ access_code, device_label }) {
  const response = await api.post("/checkins", { access_code, device_label });
  return response.data;
}

import api from "./axios";

export async function createUserAsAdmin(data) {
  const response = await api.post("/admin/users", data);
  return response.data.user;
}

export async function getAllBookingsAdmin() {
  const response = await api.get("/admin/bookings");
  return response.data.bookings;
}

export async function createLocationAdmin(data) {
  const response = await api.post("/admin/locations", data);
  return response.data.location;
}

export async function deleteLocationAdmin(id) {
  await api.delete(`/admin/locations/${id}`);
}

export async function createSlotAdmin(data) {
  const response = await api.post("/admin/slots", data);
  return response.data.slot;
}

export async function deleteSlotAdmin(id) {
  await api.delete(`/admin/slots/${id}`);
}

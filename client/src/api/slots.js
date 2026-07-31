import api from "./axios";

export async function getSlotsByLocation(locationId) {
  const response = await api.get(`/slots/location/${locationId}`);
  return response.data.slots;
}

export async function getSlotAvailability(slotId, date) {
  const response = await api.get(`/slots/${slotId}/availability`, {
    params: { date },
  });
  return response.data;
}

export async function getAllSlots(date) {
  const response = await api.get("/slots", {
    params: { date },
  });

  return response.data.slots;
}

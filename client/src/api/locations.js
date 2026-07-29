import api from "./axios";

export async function getLocations() {
  const response = await api.get("/locations");
  return response.data.locations;
}

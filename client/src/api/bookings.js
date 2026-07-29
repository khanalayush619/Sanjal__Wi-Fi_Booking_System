import api from "./axios";

export async function createBooking({ slot_id, booking_date, device_count }) {
  const response = await api.post("/bookings", {
    slot_id,
    booking_date,
    device_count,
  });
  return response.data.booking;
}

export async function getMyBookings() {
  const response = await api.get("/bookings/mine");
  return response.data.bookings;
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLocations } from "../api/locations";
import { getSlotsByLocation, getSlotAvailability } from "../api/slots";
import { createBooking, getMyBookings } from "../api/bookings";

function BookingTest() {
  const [locationId, setLocationId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [date, setDate] = useState("");
  const [deviceCount, setDeviceCount] = useState(1);
  const queryClient = useQueryClient();

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
  });

  const slotsQuery = useQuery({
    queryKey: ["slots", locationId],
    queryFn: () => getSlotsByLocation(locationId),
    enabled: !!locationId,
  });

  const availabilityQuery = useQuery({
    queryKey: ["availability", slotId, date],
    queryFn: () => getSlotAvailability(slotId, date),
    enabled: !!slotId && !!date,
  });

  const myBookingsQuery = useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: getMyBookings,
  });

  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
      queryClient.invalidateQueries({
        queryKey: ["availability", slotId, date],
      });
    },
  });

  function handleBook() {
    bookingMutation.mutate({
      slot_id: slotId,
      booking_date: date,
      device_count: Number(deviceCount),
    });
  }

  if (locationsQuery.isLoading) return <p>Loading locations...</p>;
  if (locationsQuery.isError) return <p>Error loading locations.</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 border rounded flex flex-col gap-4">
      <h1 className="text-xl font-bold">Integration Test</h1>

      <select
        value={locationId}
        onChange={(e) => setLocationId(e.target.value)}
        className="border p-2 rounded"
      >
        <option value="">Select a location</option>
        {locationsQuery.data.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>

      {slotsQuery.isLoading && <p>Loading slots...</p>}
      {slotsQuery.data && (
        <select
          value={slotId}
          onChange={(e) => setSlotId(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select a slot</option>
          {slotsQuery.data.map((slot) => (
            <option key={slot.id} value={slot.id}>
              {slot.start_time} - {slot.end_time}
            </option>
          ))}
        </select>
      )}

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border p-2 rounded"
      />

      {availabilityQuery.data && (
        <p className="text-sm text-gray-600">
          Slot remaining: {availabilityQuery.data.slot_remaining} | Location
          remaining: {availabilityQuery.data.location_remaining}
        </p>
      )}

      <input
        type="number"
        min="1"
        value={deviceCount}
        onChange={(e) => setDeviceCount(e.target.value)}
        className="border p-2 rounded"
      />

      <button
        onClick={handleBook}
        className="bg-blue-600 text-white p-2 rounded"
      >
        Book
      </button>

      {bookingMutation.isSuccess && (
        <p className="text-green-600">Booking created!</p>
      )}
      {bookingMutation.isError && (
        <p className="text-red-600">
          {bookingMutation.error.response?.data?.error || "Booking failed."}
        </p>
      )}

      <h2 className="text-lg font-bold mt-6">My Bookings</h2>
      {myBookingsQuery.isLoading && <p>Loading...</p>}
      {myBookingsQuery.data && (
        <ul className="flex flex-col gap-2">
          {myBookingsQuery.data.map((b) => (
            <li key={b.id} className="border p-2 rounded text-sm">
              {b.location_name} — {b.start_time}-{b.end_time} — {b.booking_date}{" "}
              — {b.device_count} device(s) — {b.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BookingTest;

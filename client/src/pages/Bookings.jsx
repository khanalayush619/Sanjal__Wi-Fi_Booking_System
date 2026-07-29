import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLocations } from '../api/locations';
import { getSlotsByLocation, getSlotAvailability } from '../api/slots';
import { createBooking } from '../api/bookings';
import { formatTime } from '../utils/formatTime';

function Bookings() {
  const [locationId, setLocationId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [date, setDate] = useState('');
  const [deviceCount, setDeviceCount] = useState(1);
  const queryClient = useQueryClient();

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
  });

  const slotsQuery = useQuery({
    queryKey: ['slots', locationId],
    queryFn: () => getSlotsByLocation(locationId),
    enabled: !!locationId,
  });

  const availabilityQuery = useQuery({
    queryKey: ['availability', slotId, date],
    queryFn: () => getSlotAvailability(slotId, date),
    enabled: !!slotId && !!date,
  });

  const selectedSlot = slotsQuery.data?.find((s) => s.id === slotId);
  const selectedLocation = locationsQuery.data?.find((l) => l.id === locationId);
  const maxDevices = availabilityQuery.data?.slot_remaining ?? 1;

  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['availability', slotId, date] });
      queryClient.invalidateQueries({ queryKey: ['slots', 'all'] });
    },
  });

  function handleLocationChange(e) {
    setLocationId(e.target.value);
    setSlotId('');
  }

  function handleConfirm() {
    bookingMutation.mutate({
      slot_id: slotId,
      booking_date: date,
      device_count: Number(deviceCount),
    });
  }

  if (locationsQuery.isLoading) return <p className="p-8 text-gray-500">Loading...</p>;

  return (
    <div className="p-8 flex gap-6">
      <div className="flex-1 bg-white border rounded-xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Book Your Wi-Fi Slot</h1>
        <p className="text-gray-500 mb-6">Reserve a high-speed connection for your session.</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Location Hub</label>
            <select
              value={locationId}
              onChange={handleLocationChange}
              className="w-full border rounded-md p-2 mt-1"
            >
              <option value="">Select a location</option>
              {locationsQuery.data.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Booking Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded-md p-2 mt-1"
            />
          </div>
        </div>

        {slotsQuery.data && (
          <div className="mb-6">
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
              Available Time Slots
            </label>
            <div className="grid grid-cols-2 gap-3">
              {slotsQuery.data.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSlotId(slot.id)}
                  className={`border rounded-lg p-3 text-left ${
                    slotId === slot.id ? 'border-blue-600 ring-1 ring-blue-600' : 'border-gray-200'
                  }`}
                >
                  <p className="font-semibold text-gray-900">
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Max {slot.max_devices} devices</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {slotId && date && (
          <div className="mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
              Number of Devices
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeviceCount((c) => Math.max(1, c - 1))}
                className="w-9 h-9 border rounded-md text-lg"
              >
                −
              </button>
              <span className="font-semibold">{deviceCount}</span>
              <button
                onClick={() => setDeviceCount((c) => Math.min(maxDevices, c + 1))}
                disabled={deviceCount >= maxDevices}
                className="w-9 h-9 border rounded-md text-lg disabled:opacity-40"
              >
                +
              </button>
              <span className="text-xs text-gray-500">
                {maxDevices} device(s) available in this slot
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="w-80">
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="bg-blue-600 text-white px-5 py-3 font-semibold">Booking Summary</div>
          <div className="p-5 flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Location</span>
              <span className="font-semibold">{selectedLocation?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Time Slot</span>
              <span className="font-semibold">
                {selectedSlot ? `${formatTime(selectedSlot.start_time)} - ${formatTime(selectedSlot.end_time)}` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-semibold">{date || '—'}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-500">Devices</span>
              <span className="font-semibold">{deviceCount}</span>
            </div>

            <button
              onClick={handleConfirm}
              disabled={!slotId || !date || bookingMutation.isPending}
              className="bg-blue-600 text-white rounded-md py-2.5 font-semibold mt-2 disabled:opacity-40"
            >
              {bookingMutation.isPending ? 'Booking...' : 'Confirm Booking'}
            </button>

            {bookingMutation.isSuccess && (
              <p className="text-green-600 text-sm">Booking confirmed!</p>
            )}
            {bookingMutation.isError && (
              <p className="text-red-600 text-sm">
                {bookingMutation.error.response?.data?.error || 'Booking failed.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Bookings;
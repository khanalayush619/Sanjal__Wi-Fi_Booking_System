import { useQuery } from "@tanstack/react-query";
import { getAllSlots } from "../api/slots";
import { formatTime } from "../utils/formatTime";

function statusBadge(remaining) {
  if (remaining <= 0) {
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
        BOOKED
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
      AVAILABLE
    </span>
  );
}

function Dashboard() {
  const {
    data: slots,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["slots", "all"],
    queryFn: getAllSlots,
  });

  if (isLoading)
    return <p className="p-8 text-gray-500">Loading available slots...</p>;
  if (isError)
    return (
      <p className="p-8 text-red-600">Something went wrong loading slots.</p>
    );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Available Slots</h1>
      <p className="text-gray-500 mb-6">
        Book high-speed Wi-Fi by the hour across campus locations.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                📶
              </div>
              {statusBadge(slot.remaining)}
            </div>
            <h3 className="font-bold text-gray-900">{slot.location_name}</h3>
            <p className="text-sm text-gray-500 mb-3">
              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
            </p>
            <div className="border-t pt-3">
              <p className="text-sm text-blue-700 font-medium">
                {slot.remaining} of {slot.max_devices} devices free
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;

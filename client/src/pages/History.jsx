import { useQuery } from "@tanstack/react-query";
import { getMyBookings } from "../api/bookings";
import { formatTime } from "../utils/formatTime";

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusBadge(status) {
  const styles = {
    confirmed: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-700",
    expired: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${styles[status] || styles.expired}`}
    >
      {status}
    </span>
  );
}

function History() {
  const {
    data: bookings,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: getMyBookings,
  });

  if (isLoading) return <p className="p-8 text-gray-500">Loading history...</p>;
  if (isError)
    return (
      <p className="p-8 text-red-600">
        Something went wrong loading your history.
      </p>
    );

  const totalBookings = bookings.length;
  const confirmedCount = bookings.filter(
    (b) => b.status === "confirmed",
  ).length;
  const avgDevices = totalBookings
    ? (
        bookings.reduce((sum, b) => sum + b.device_count, 0) / totalBookings
      ).toFixed(1)
    : 0;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Connection History
      </h1>
      <p className="text-gray-500 mb-6">Review your past Wi-Fi bookings.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Total Bookings
          </p>
          <p className="text-2xl font-bold">{totalBookings}</p>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Confirmed
          </p>
          <p className="text-2xl font-bold">{confirmedCount}</p>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Avg Devices
          </p>
          <p className="text-2xl font-bold">{avgDevices}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
            <tr>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Time Slot</th>
              <th className="px-5 py-3">Devices</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-5 py-3">{formatDate(b.booking_date)}</td>
                <td className="px-5 py-3">{b.location_name}</td>
                <td className="px-5 py-3">
                  {formatTime(b.start_time)} - {formatTime(b.end_time)}
                </td>
                <td className="px-5 py-3">{b.device_count}</td>
                <td className="px-5 py-3">{statusBadge(b.status)}</td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan="5" className="px-5 py-6 text-center text-gray-400">
                  No bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default History;

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLocations } from "../api/locations";
import { getAllSlots } from "../api/slots";
import {
  createUserAsAdmin,
  getAllBookingsAdmin,
  createLocationAdmin,
  deleteLocationAdmin,
  createSlotAdmin,
  deleteSlotAdmin,
} from "../api/admin";
import { formatTime } from "../utils/formatTime";

function Admin() {
  const queryClient = useQueryClient();

  // --- Create staff/professor account ---
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "professor",
  });
  const createUserMutation = useMutation({
    mutationFn: createUserAsAdmin,
    onSuccess: () =>
      setNewUser({ name: "", email: "", password: "", role: "professor" }),
  });

  // --- Locations ---
  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
  });
  const [newLocation, setNewLocation] = useState({
    name: "",
    floor: "",
    device_capacity: "",
  });
  const createLocationMutation = useMutation({
    mutationFn: createLocationAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setNewLocation({ name: "", floor: "", device_capacity: "" });
    },
  });
  const deleteLocationMutation = useMutation({
    mutationFn: deleteLocationAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["slots", "all"] });
    },
  });

  // --- Slots ---
  const slotsQuery = useQuery({
    queryKey: ["slots", "all"],
    queryFn: getAllSlots,
  });
  const [newSlot, setNewSlot] = useState({
    start_time: "",
    end_time: "",
    max_devices: "",
    location_id: "",
  });
  const createSlotMutation = useMutation({
    mutationFn: createSlotAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots", "all"] });
      setNewSlot({
        start_time: "",
        end_time: "",
        max_devices: "",
        location_id: "",
      });
    },
  });
  const deleteSlotMutation = useMutation({
    mutationFn: deleteSlotAdmin,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["slots", "all"] }),
  });

  // --- All bookings ---
  const allBookingsQuery = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: getAllBookingsAdmin,
  });

  return (
    <div className="p-8 flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Create staff/professor */}
      <section className="bg-white border rounded-xl p-6">
        <h2 className="font-bold mb-4">Create Professor / Staff Account</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            placeholder="Name"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            className="border rounded p-2"
          />
          <input
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            className="border rounded p-2"
          />
          <input
            placeholder="Password"
            type="password"
            value={newUser.password}
            onChange={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
            className="border rounded p-2"
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            className="border rounded p-2"
          >
            <option value="professor">Professor</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <button
          onClick={() => createUserMutation.mutate(newUser)}
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold"
        >
          Create Account
        </button>
        {createUserMutation.isSuccess && (
          <p className="text-green-600 text-sm mt-2">Account created.</p>
        )}
        {createUserMutation.isError && (
          <p className="text-red-600 text-sm mt-2">
            {createUserMutation.error.response?.data?.errors?.join(", ") ||
              "Failed."}
          </p>
        )}
      </section>

      {/* Locations */}
      <section className="bg-white border rounded-xl p-6">
        <h2 className="font-bold mb-4">Locations</h2>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <input
            placeholder="Name"
            value={newLocation.name}
            onChange={(e) =>
              setNewLocation({ ...newLocation, name: e.target.value })
            }
            className="border rounded p-2"
          />
          <input
            placeholder="Floor"
            value={newLocation.floor}
            onChange={(e) =>
              setNewLocation({ ...newLocation, floor: e.target.value })
            }
            className="border rounded p-2"
          />
          <input
            placeholder="Device capacity"
            type="number"
            value={newLocation.device_capacity}
            onChange={(e) =>
              setNewLocation({
                ...newLocation,
                device_capacity: Number(e.target.value),
              })
            }
            className="border rounded p-2"
          />
        </div>
        <button
          onClick={() => createLocationMutation.mutate(newLocation)}
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold mb-4"
        >
          Add Location
        </button>

        <ul className="flex flex-col gap-2">
          {locationsQuery.data?.map((loc) => (
            <li
              key={loc.id}
              className="flex justify-between items-center border rounded p-2 text-sm"
            >
              <span>
                {loc.name} — {loc.floor} — capacity {loc.device_capacity}
              </span>
              <button
                onClick={() => deleteLocationMutation.mutate(loc.id)}
                className="text-red-600 text-xs"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Slots */}
      <section className="bg-white border rounded-xl p-6">
        <h2 className="font-bold mb-4">Wi-Fi Slots</h2>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <select
            value={newSlot.location_id}
            onChange={(e) =>
              setNewSlot({ ...newSlot, location_id: e.target.value })
            }
            className="border rounded p-2"
          >
            <option value="">Location</option>
            {locationsQuery.data?.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <input
            type="time"
            value={newSlot.start_time}
            onChange={(e) =>
              setNewSlot({ ...newSlot, start_time: e.target.value })
            }
            className="border rounded p-2"
          />
          <input
            type="time"
            value={newSlot.end_time}
            onChange={(e) =>
              setNewSlot({ ...newSlot, end_time: e.target.value })
            }
            className="border rounded p-2"
          />
          <input
            placeholder="Max devices"
            type="number"
            value={newSlot.max_devices}
            onChange={(e) =>
              setNewSlot({ ...newSlot, max_devices: Number(e.target.value) })
            }
            className="border rounded p-2"
          />
        </div>
        <button
          onClick={() => createSlotMutation.mutate(newSlot)}
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold mb-2"
        >
          Add Slot
        </button>
        {createSlotMutation.isError && (
          <p className="text-red-600 text-sm mb-4">
            {createSlotMutation.error.response?.data?.error || "Failed."}
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {slotsQuery.data?.map((slot) => (
            <li
              key={slot.id}
              className="flex justify-between items-center border rounded p-2 text-sm"
            >
              <span>
                {slot.location_name} — {formatTime(slot.start_time)}-
                {formatTime(slot.end_time)} — max {slot.max_devices}
              </span>
              <button
                onClick={() => deleteSlotMutation.mutate(slot.id)}
                className="text-red-600 text-xs"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* All bookings */}
      <section className="bg-white border rounded-xl p-6">
        <h2 className="font-bold mb-4">All Bookings (System-Wide)</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500 uppercase">
            <tr>
              <th className="py-2">User</th>
              <th className="py-2">Location</th>
              <th className="py-2">Date</th>
              <th className="py-2">Time</th>
              <th className="py-2">Devices</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {allBookingsQuery.data?.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="py-2">{b.user_name}</td>
                <td className="py-2">{b.location_name}</td>
                <td className="py-2">
                  {new Date(b.booking_date).toLocaleDateString()}
                </td>
                <td className="py-2">
                  {formatTime(b.start_time)}-{formatTime(b.end_time)}
                </td>
                <td className="py-2">{b.device_count}</td>
                <td className="py-2 capitalize">{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default Admin;

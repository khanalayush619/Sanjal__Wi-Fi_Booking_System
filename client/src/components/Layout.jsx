import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/bookings", label: "Bookings" },
    { path: "/history", label: "History" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r p-4 flex flex-col">
        <h1 className="text-xl font-bold text-blue-700 mb-1">Sanjal</h1>
        <p className="text-xs text-gray-500 mb-6">Campus Connectivity</p>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded text-sm ${
                location.pathname === item.path
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.role}</p>
          <button onClick={logout} className="text-xs text-red-600 mt-2">
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <input
            type="text"
            placeholder="Search..."
            className="border rounded-md px-3 py-1.5 text-sm w-64 bg-gray-50"
          />
          <div className="flex items-center gap-4">
            <span className="text-gray-500">🔔</span>
            <span className="text-gray-500">⚙️</span>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;

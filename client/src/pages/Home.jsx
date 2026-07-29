import { useAuth } from "../context/AuthContext";

function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-sm mx-auto mt-16 p-6 border rounded">
      <h1 className="text-xl font-bold mb-2">Welcome, {user.name}</h1>
      <p className="text-sm mb-4">Role: {user.role}</p>
      <button onClick={logout} className="bg-red-600 text-white p-2 rounded">
        Logout
      </button>
    </div>
  );
}

export default Home;

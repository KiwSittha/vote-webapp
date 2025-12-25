import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Layout({ children }) {
  const [open, setOpen] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen w-full">

      {/* Sidebar */}
      <aside
        className={`
          bg-green-600 text-white flex flex-col
          transition-all duration-300
          ${open ? "w-64" : "w-16"}
        `}
      >
        {/* Logo + Toggle */}
        <div className="h-14 flex items-center justify-between px-4">
          {open && <span className="text-xl font-bold">KUVote</span>}
          <button
            onClick={() => setOpen(!open)}
            className="p-1 rounded hover:bg-green-700"
          >
            ☰
          </button>
        </div>

        {/* Menu */}
        <nav className="mt-4 space-y-1 flex-1">
          <MenuItem open={open} to="/" icon="🏠" text="Home" />
          <MenuItem open={open} to="/vote" icon="🗳️" text="Vote" />
          <MenuItem open={open} to="/candidates" icon="👥" text="Candidates" />
          <MenuItem open={open} to="/dashboard" icon="📊" text="Result" />
        </nav>

        {/* Logout */}
        <div className="p-4 mb-10">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center px-3 py-2 rounded
              bg-red-500 hover:bg-red-600 transition
              ${open ? "gap-3 justify-start" : "justify-center"}
            `}
          >
            <span className="text-lg">🚪</span>
            {open && <span>Logout</span>}
          </button>
        </div>

      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <header className="h-14 bg-white shadow flex items-center justify-end px-6">
          {user && (
            <div className="text-right text-sm">
              <div className="font-semibold text-gray-800">
                {user.email}
              </div>
              <div className="text-gray-500">
                {user.faculty}
              </div>
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}

function MenuItem({ open, to, icon, text }) {
  return (
    <Link
      to={to}
      className={`
        flex items-center px-4 py-2 hover:bg-green-700 transition
        ${open ? "gap-3 justify-start" : "justify-center"}
      `}
    >
      <span className="text-lg">{icon}</span>
      {open && <span>{text}</span>}
    </Link>
  );
}

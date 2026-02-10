import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-56 bg-slate-800 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="font-semibold text-lg">Form Admin</h1>
          <p className="text-slate-400 text-sm truncate">{user?.email}</p>
          <p className="text-slate-500 text-xs">{user?.role}</p>
        </div>
        <nav className="flex-1 p-2">
          <NavLink
            to="/admin/forms"
            className={({ isActive }) =>
              `block px-3 py-2 rounded mb-1 ${isActive ? 'bg-slate-600' : 'hover:bg-slate-700'}`
            }
          >
            Forms
          </NavLink>
          <NavLink
            to="/admin/charts"
            className={({ isActive }) =>
              `block px-3 py-2 rounded mb-1 ${isActive ? 'bg-slate-600' : 'hover:bg-slate-700'}`
            }
          >
            Charts
          </NavLink>
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `block px-3 py-2 rounded mb-1 ${isActive ? 'bg-slate-600' : 'hover:bg-slate-700'}`
            }
          >
            Dashboard
          </NavLink>
        </nav>
        <div className="p-2 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 text-slate-300"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

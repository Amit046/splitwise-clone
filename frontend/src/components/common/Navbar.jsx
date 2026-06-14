import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
      <Link to="/dashboard" className="text-xl font-bold text-primary-600">
        SplitEasy
      </Link>
      {user && (
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-sm text-gray-600 hover:text-primary-600">
            Dashboard
          </Link>
          <span className="text-sm text-gray-500 hidden sm:inline">{user.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

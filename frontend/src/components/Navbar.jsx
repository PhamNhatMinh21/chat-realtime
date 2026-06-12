import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import { Moon, Sun, MessageSquare, LogOut, User } from "lucide-react";


const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  return (
    <header className="navbar glass">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="brand-logo bg-primary">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="brand-text">ChatSync</span>
        </Link>
        <div className="navbar-actions">
          <button 
            className="btn btn-icon" 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {authUser && (
            <>
              <Link to="/profile" className="btn btn-icon btn-profile">
                <User size={20} />
                <span className="hidden-xs">Profile</span>
              </Link>
              <button className="btn btn-icon btn-logout" onClick={logout}>
                <LogOut size={20} />
                <span className="hidden-xs">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
